import type { Client, InStatement } from "@libsql/client";
import {
  customerMappingSchema,
  productMappingSchema,
  siteMappingSchema,
} from "@/lib/mappings/schemas";
import { GST_STATE_MAPPING } from "./seed-data/gst-state-mapping";
import { PRODUCT_MAPPING } from "./seed-data/product-mapping";
import { SITE_CUSTOMER_MAPPING } from "./seed-data/site-customer-mapping";

type Migration = {
  version: number;
  name: string;
  statements: () => InStatement[];
};

const CREATE_MAPPING_TABLES = [
  `CREATE TABLE sites (
    id INTEGER PRIMARY KEY,
    gst_prefix TEXT NOT NULL UNIQUE
      CHECK (length(gst_prefix) = 2 AND gst_prefix GLOB '[0-9][0-9]'),
    site_code TEXT NOT NULL UNIQUE
      CHECK (length(site_code) BETWEEN 1 AND 10 AND site_code NOT GLOB '*[^A-Z0-9]*'),
    state TEXT NOT NULL
      CHECK (length(state) BETWEEN 1 AND 60 AND state = upper(trim(state))),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT`,
  `CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE
      CHECK (length(sku) BETWEEN 1 AND 100 AND sku = trim(sku)),
    product_code TEXT NOT NULL
      CHECK (length(product_code) BETWEEN 1 AND 20 AND product_code NOT GLOB '*[^A-Z0-9]*'),
    product_division TEXT NOT NULL
      CHECK (length(product_division) BETWEEN 1 AND 10 AND product_division NOT GLOB '*[^A-Z0-9]*'),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT`,
  `CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    site_code TEXT NOT NULL
      REFERENCES sites (site_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    state TEXT NOT NULL
      CHECK (length(state) BETWEEN 1 AND 60 AND state = upper(trim(state))),
    cust_code TEXT NOT NULL UNIQUE
      CHECK (length(cust_code) BETWEEN 1 AND 20 AND cust_code NOT GLOB '*[^A-Z0-9]*'),
    cust_name TEXT NOT NULL DEFAULT ''
      CHECK (length(cust_name) <= 120),
    state_code TEXT NOT NULL
      CHECK (length(state_code) = 2 AND state_code NOT GLOB '*[^A-Z]*'),
    tax_env TEXT NOT NULL
      CHECK (length(tax_env) BETWEEN 1 AND 20 AND tax_env NOT GLOB '*[^A-Z0-9]*'),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (site_code, state)
  ) STRICT`,
  "CREATE INDEX customers_site_code_idx ON customers (site_code)",
];

// Copies the mappings that used to be hard-coded in the app into the database.
// Every row goes through the same validation as the settings form.
function seedInitialMappings(): InStatement[] {
  // The seed rows have no id, so the parsed objects contain only the
  // named parameters below.
  const sites = Object.entries(GST_STATE_MAPPING).map(([gstPrefix, site]) => ({
    args: siteMappingSchema.parse({ gstPrefix, ...site }),
    sql: "INSERT INTO sites (gst_prefix, site_code, state) VALUES (:gstPrefix, :siteCode, :state)",
  }));
  const products = Object.entries(PRODUCT_MAPPING).map(([sku, product]) => ({
    args: productMappingSchema.parse({ sku, ...product }),
    sql: "INSERT INTO products (sku, product_code, product_division) VALUES (:sku, :productCode, :productDivision)",
  }));
  const customers = Object.entries(SITE_CUSTOMER_MAPPING).flatMap(
    ([siteCode, siteCustomers]) =>
      siteCustomers.map((customer) => ({
        args: customerMappingSchema.parse({ siteCode, ...customer }),
        sql: `INSERT INTO customers (site_code, state, cust_code, cust_name, state_code, tax_env)
              VALUES (:siteCode, :state, :custCode, :custName, :stateCode, :taxEnv)`,
      })),
  );

  return [...sites, ...products, ...customers];
}

const MIGRATIONS: Migration[] = [
  {
    name: "create_mapping_tables",
    statements: () => CREATE_MAPPING_TABLES,
    version: 1,
  },
  {
    name: "seed_initial_mappings",
    statements: seedInitialMappings,
    version: 2,
  },
];

export async function runMigrations(client: Client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT
  `);

  // A write transaction takes the lock up front, so parallel server instances
  // re-check the version instead of applying a migration twice. Each
  // migration is sent as one batch to keep remote round trips low.
  const transaction = await client.transaction("write");

  try {
    const result = await transaction.execute(
      "SELECT coalesce(max(version), 0) AS version FROM schema_migrations",
    );
    const currentVersion = Number(result.rows[0]?.version ?? 0);

    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion) {
        await transaction.batch([
          ...migration.statements(),
          {
            args: [migration.version, migration.name],
            sql: "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
          },
        ]);
      }
    }

    await transaction.commit();
  } finally {
    transaction.close();
  }
}
