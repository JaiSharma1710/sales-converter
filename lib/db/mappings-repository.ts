import "server-only";
import Database from "better-sqlite3";
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

// UNIQUE constraint messages look like "UNIQUE constraint failed: sites.gst_prefix".
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
  if (!(error instanceof Database.SqliteError)) {
    throw error;
  }

  if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
    const columns = error.message.replace("UNIQUE constraint failed: ", "");
    const uniqueError = UNIQUE_CONSTRAINT_ERRORS[columns];

    if (uniqueError) {
      return {
        fieldErrors: { [uniqueError.field]: uniqueError.message },
        ok: false,
      };
    }
  }

  if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    return {
      fieldErrors: { siteCode: "This site code does not exist." },
      ok: false,
    };
  }

  if (error.code === "SQLITE_CONSTRAINT_CHECK") {
    return {
      formError: "Some values are not in a valid format.",
      ok: false,
    };
  }

  throw error;
}

function runMutation(mutate: () => number): MappingActionResult {
  try {
    return mutate() === 0 ? NOT_FOUND_RESULT : { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export function getMappings(): Mappings {
  const db = getDb();

  return {
    customers: db
      .prepare<[], CustomerMapping>(
        `SELECT id, site_code AS siteCode, state, cust_code AS custCode,
                cust_name AS custName, state_code AS stateCode, tax_env AS taxEnv
         FROM customers
         ORDER BY site_code, state`,
      )
      .all(),
    products: db
      .prepare<[], ProductMapping>(
        `SELECT id, sku, product_code AS productCode,
                product_division AS productDivision
         FROM products
         ORDER BY sku COLLATE NOCASE`,
      )
      .all(),
    sites: db
      .prepare<[], SiteMapping>(
        `SELECT id, gst_prefix AS gstPrefix, site_code AS siteCode, state
         FROM sites
         ORDER BY gst_prefix`,
      )
      .all(),
  };
}

export function saveSite({ id, ...site }: SiteMappingInput) {
  const db = getDb();

  return runMutation(() =>
    id === undefined
      ? db
          .prepare(
            "INSERT INTO sites (gst_prefix, site_code, state) VALUES (@gstPrefix, @siteCode, @state)",
          )
          .run(site).changes
      : db
          .prepare(
            `UPDATE sites
             SET gst_prefix = @gstPrefix, site_code = @siteCode, state = @state,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = @id`,
          )
          .run({ ...site, id }).changes,
  );
}

export function deleteSite(id: number): MappingActionResult {
  const db = getDb();
  const { customerCount } = db
    .prepare<[number], { customerCount: number }>(
      `SELECT count(customers.id) AS customerCount
       FROM sites LEFT JOIN customers ON customers.site_code = sites.site_code
       WHERE sites.id = ?`,
    )
    .get(id) ?? { customerCount: 0 };

  if (customerCount > 0) {
    return {
      formError: `This site still has ${customerCount} customer mappings. Delete them before deleting the site.`,
      ok: false,
    };
  }

  return runMutation(
    () => db.prepare("DELETE FROM sites WHERE id = ?").run(id).changes,
  );
}

export function saveProduct({ id, ...product }: ProductMappingInput) {
  const db = getDb();

  return runMutation(() =>
    id === undefined
      ? db
          .prepare(
            "INSERT INTO products (sku, product_code, product_division) VALUES (@sku, @productCode, @productDivision)",
          )
          .run(product).changes
      : db
          .prepare(
            `UPDATE products
             SET sku = @sku, product_code = @productCode,
                 product_division = @productDivision,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = @id`,
          )
          .run({ ...product, id }).changes,
  );
}

export function deleteProduct(id: number) {
  const db = getDb();

  return runMutation(
    () => db.prepare("DELETE FROM products WHERE id = ?").run(id).changes,
  );
}

export function saveCustomer({ id, ...customer }: CustomerMappingInput) {
  const db = getDb();

  return runMutation(() =>
    id === undefined
      ? db
          .prepare(
            `INSERT INTO customers (site_code, state, cust_code, cust_name, state_code, tax_env)
             VALUES (@siteCode, @state, @custCode, @custName, @stateCode, @taxEnv)`,
          )
          .run(customer).changes
      : db
          .prepare(
            `UPDATE customers
             SET site_code = @siteCode, state = @state, cust_code = @custCode,
                 cust_name = @custName, state_code = @stateCode, tax_env = @taxEnv,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = @id`,
          )
          .run({ ...customer, id }).changes,
  );
}

export function deleteCustomer(id: number) {
  const db = getDb();

  return runMutation(
    () => db.prepare("DELETE FROM customers WHERE id = ?").run(id).changes,
  );
}
