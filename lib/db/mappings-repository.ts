import "server-only";
import { LibsqlError, type Transaction } from "@libsql/client";
import type {
  CustomerMappingInput,
  ProductMappingInput,
  SiteMappingInput,
} from "@/lib/mappings/schemas";
import type {
  CustomerMapping,
  MappingActionResult,
  Mappings,
  ProductMapping,
  SiteMapping,
} from "@/types/mappings";
import { getDb } from "./client";

const NOT_FOUND_RESULT: MappingActionResult = {
  formError: "This mapping no longer exists. It may have been deleted.",
  ok: false,
};

const UNKNOWN_SITE_RESULT: MappingActionResult = {
  fieldErrors: { siteCode: "This site code does not exist." },
  ok: false,
};

// UNIQUE constraint messages end with e.g. "UNIQUE constraint failed: sites.gst_prefix".
const UNIQUE_CONSTRAINT_ERRORS: Record<
  string,
  { field: string; message: string }
> = {
  "customers.cust_code": {
    field: "custCode",
    message: "This customer code is already used by another mapping.",
  },
  "customers.site_code, customers.state": {
    field: "state",
    message: "A customer is already mapped for this site and state.",
  },
  "products.sku": {
    field: "sku",
    message: "This SKU is already mapped.",
  },
  "sites.gst_prefix": {
    field: "gstPrefix",
    message: "This GST prefix is already mapped to a site.",
  },
  "sites.site_code": {
    field: "siteCode",
    message: "This site code is already mapped to another GST prefix.",
  },
};

function toActionError(error: unknown): MappingActionResult {
  if (!(error instanceof LibsqlError)) {
    throw error;
  }

  const columns = error.message.match(/UNIQUE constraint failed: (.+)$/m)?.[1];
  const uniqueError = columns ? UNIQUE_CONSTRAINT_ERRORS[columns.trim()] : null;

  if (uniqueError) {
    return {
      fieldErrors: { [uniqueError.field]: uniqueError.message },
      ok: false,
    };
  }

  if (/CHECK constraint failed/.test(error.message)) {
    return {
      formError: "Some values are not in a valid format.",
      ok: false,
    };
  }

  if (/FOREIGN KEY constraint failed/.test(error.message)) {
    return UNKNOWN_SITE_RESULT;
  }

  throw error;
}

// libsql runs every statement on its own connection, so PRAGMA foreign_keys
// cannot be relied on. Site rules are checked here, inside one transaction.
async function runMutation(
  mutate: (transaction: Transaction) => Promise<MappingActionResult>,
): Promise<MappingActionResult> {
  const db = await getDb();
  const transaction = await db.transaction("write");

  try {
    const result = await mutate(transaction);

    if (result.ok) {
      await transaction.commit();
    }

    return result;
  } catch (error) {
    return toActionError(error);
  } finally {
    transaction.close();
  }
}

function changedRows(rowsAffected: number): MappingActionResult {
  return rowsAffected === 0 ? NOT_FOUND_RESULT : { ok: true };
}

async function siteExists(transaction: Transaction, siteCode: string) {
  const result = await transaction.execute({
    args: [siteCode],
    sql: "SELECT 1 FROM sites WHERE site_code = ?",
  });

  return result.rows.length > 0;
}

export async function getMappings(): Promise<Mappings> {
  const db = await getDb();
  const [sites, products, customers] = await db.batch(
    [
      `SELECT id, gst_prefix, site_code, state
       FROM sites
       ORDER BY gst_prefix`,
      `SELECT id, sku, product_code, product_division
       FROM products
       ORDER BY sku COLLATE NOCASE`,
      `SELECT id, site_code, state, cust_code, cust_name, state_code, tax_env
       FROM customers
       ORDER BY site_code, state`,
    ],
    "read",
  );

  // libsql rows are array-like objects; convert them to plain objects so they
  // serialize cleanly to the client.
  return {
    customers: customers.rows.map(
      (row): CustomerMapping => ({
        custCode: String(row.cust_code),
        custName: String(row.cust_name),
        id: Number(row.id),
        siteCode: String(row.site_code),
        state: String(row.state),
        stateCode: String(row.state_code),
        taxEnv: String(row.tax_env),
      }),
    ),
    products: products.rows.map(
      (row): ProductMapping => ({
        id: Number(row.id),
        productCode: String(row.product_code),
        productDivision: String(row.product_division),
        sku: String(row.sku),
      }),
    ),
    sites: sites.rows.map(
      (row): SiteMapping => ({
        gstPrefix: String(row.gst_prefix),
        id: Number(row.id),
        siteCode: String(row.site_code),
        state: String(row.state),
      }),
    ),
  };
}

export function saveSite({ id, ...site }: SiteMappingInput) {
  return runMutation(async (transaction) => {
    if (id === undefined) {
      await transaction.execute({
        args: site,
        sql: "INSERT INTO sites (gst_prefix, site_code, state) VALUES (:gstPrefix, :siteCode, :state)",
      });

      return { ok: true };
    }

    const existing = await transaction.execute({
      args: [id],
      sql: "SELECT site_code FROM sites WHERE id = ?",
    });

    if (existing.rows.length === 0) {
      return NOT_FOUND_RESULT;
    }

    const previousSiteCode = String(existing.rows[0].site_code);

    await transaction.batch([
      {
        args: { ...site, id },
        sql: `UPDATE sites
              SET gst_prefix = :gstPrefix, site_code = :siteCode, state = :state,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = :id`,
      },
      // Keep the site's customers attached when its code is renamed.
      {
        args: [site.siteCode, previousSiteCode],
        sql: "UPDATE customers SET site_code = ?, updated_at = CURRENT_TIMESTAMP WHERE site_code = ?",
      },
    ]);

    return { ok: true };
  });
}

export function deleteSite(id: number) {
  return runMutation(async (transaction) => {
    const result = await transaction.execute({
      args: [id],
      sql: `SELECT count(customers.id) AS customer_count
            FROM sites JOIN customers ON customers.site_code = sites.site_code
            WHERE sites.id = ?`,
    });
    const customerCount = Number(result.rows[0]?.customer_count ?? 0);

    if (customerCount > 0) {
      return {
        formError: `This site still has ${customerCount} customer mappings. Delete them before deleting the site.`,
        ok: false,
      };
    }

    const deleted = await transaction.execute({
      args: [id],
      sql: "DELETE FROM sites WHERE id = ?",
    });

    return changedRows(deleted.rowsAffected);
  });
}

export function saveProduct({ id, ...product }: ProductMappingInput) {
  return runMutation(async (transaction) => {
    const result =
      id === undefined
        ? await transaction.execute({
            args: product,
            sql: "INSERT INTO products (sku, product_code, product_division) VALUES (:sku, :productCode, :productDivision)",
          })
        : await transaction.execute({
            args: { ...product, id },
            sql: `UPDATE products
                  SET sku = :sku, product_code = :productCode,
                      product_division = :productDivision,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = :id`,
          });

    return changedRows(result.rowsAffected);
  });
}

export function deleteProduct(id: number) {
  return runMutation(async (transaction) => {
    const result = await transaction.execute({
      args: [id],
      sql: "DELETE FROM products WHERE id = ?",
    });

    return changedRows(result.rowsAffected);
  });
}

export function saveCustomer({ id, ...customer }: CustomerMappingInput) {
  return runMutation(async (transaction) => {
    if (!(await siteExists(transaction, customer.siteCode))) {
      return UNKNOWN_SITE_RESULT;
    }

    const result =
      id === undefined
        ? await transaction.execute({
            args: customer,
            sql: `INSERT INTO customers (site_code, state, cust_code, cust_name, state_code, tax_env)
                  VALUES (:siteCode, :state, :custCode, :custName, :stateCode, :taxEnv)`,
          })
        : await transaction.execute({
            args: { ...customer, id },
            sql: `UPDATE customers
                  SET site_code = :siteCode, state = :state, cust_code = :custCode,
                      cust_name = :custName, state_code = :stateCode, tax_env = :taxEnv,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = :id`,
          });

    return changedRows(result.rowsAffected);
  });
}

export function deleteCustomer(id: number) {
  return runMutation(async (transaction) => {
    const result = await transaction.execute({
      args: [id],
      sql: "DELETE FROM customers WHERE id = ?",
    });

    return changedRows(result.rowsAffected);
  });
}
