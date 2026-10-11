import type Database from "better-sqlite3";
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
  up: (db: Database.Database) => void;
};

const CREATE_MAPPING_TABLES = `
  CREATE TABLE sites (
    id INTEGER PRIMARY KEY,
    gst_prefix TEXT NOT NULL UNIQUE
      CHECK (length(gst_prefix) = 2 AND gst_prefix GLOB '[0-9][0-9]'),
    site_code TEXT NOT NULL UNIQUE
      CHECK (length(site_code) BETWEEN 1 AND 10 AND site_code NOT GLOB '*[^A-Z0-9]*'),
    state TEXT NOT NULL
      CHECK (length(state) BETWEEN 1 AND 60 AND state = upper(trim(state))),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT;

  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE
      CHECK (length(sku) BETWEEN 1 AND 100 AND sku = trim(sku)),
    product_code TEXT NOT NULL
      CHECK (length(product_code) BETWEEN 1 AND 20 AND product_code NOT GLOB '*[^A-Z0-9]*'),
    product_division TEXT NOT NULL
      CHECK (length(product_division) BETWEEN 1 AND 10 AND product_division NOT GLOB '*[^A-Z0-9]*'),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT;

  CREATE TABLE customers (
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
  ) STRICT;

  CREATE INDEX customers_site_code_idx ON customers (site_code);
`;

// Copies the mappings that used to be hard-coded in the app into the database.
// Every row goes through the same validation as the settings form.
function seedInitialMappings(db: Database.Database) {
  const insertSite = db.prepare(
    "INSERT INTO sites (gst_prefix, site_code, state) VALUES (@gstPrefix, @siteCode, @state)",
  );
  const insertProduct = db.prepare(
    "INSERT INTO products (sku, product_code, product_division) VALUES (@sku, @productCode, @productDivision)",
  );
  const insertCustomer = db.prepare(
    `INSERT INTO customers (site_code, state, cust_code, cust_name, state_code, tax_env)
     VALUES (@siteCode, @state, @custCode, @custName, @stateCode, @taxEnv)`,
  );

  for (const [gstPrefix, site] of Object.entries(GST_STATE_MAPPING)) {
    insertSite.run(siteMappingSchema.parse({ gstPrefix, ...site }));
  }

  for (const [sku, product] of Object.entries(PRODUCT_MAPPING)) {
    insertProduct.run(productMappingSchema.parse({ sku, ...product }));
  }

  for (const [siteCode, customers] of Object.entries(SITE_CUSTOMER_MAPPING)) {
    for (const customer of customers) {
      insertCustomer.run(customerMappingSchema.parse({ siteCode, ...customer }));
    }
  }
}

const MIGRATIONS: Migration[] = [
  {
    name: "create_mapping_tables",
    up: (db) => db.exec(CREATE_MAPPING_TABLES),
    version: 1,
  },
  {
    name: "seed_initial_mappings",
    up: seedInitialMappings,
    version: 2,
  },
];

export function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
  `);

  const getCurrentVersion = db.prepare<[], { version: number | null }>(
    "SELECT max(version) AS version FROM schema_migrations",
  );
  const recordMigration = db.prepare(
    "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
  );

  // IMMEDIATE takes the write lock up front, so parallel processes (e.g. build
  // workers) re-check the version instead of applying a migration twice.
  const migrate = db.transaction(() => {
    const currentVersion = getCurrentVersion.get()?.version ?? 0;

    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion) {
        migration.up(db);
        recordMigration.run(migration.version, migration.name);
      }
    }
  });

  migrate.immediate();
}
