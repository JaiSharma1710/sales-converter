import type { z } from "zod";
import {
  deleteCustomerMapping,
  deleteProductMapping,
  deleteSiteMapping,
  saveCustomerMapping,
  saveProductMapping,
  saveSiteMapping,
} from "@/app/actions/mappings";
import {
  customerMappingSchema,
  productMappingSchema,
  siteMappingSchema,
} from "@/lib/mappings/schemas";
import type {
  MappingActionResult,
  MappingKind,
  Mappings,
} from "@/types/mappings";

export type MappingRow = { id: number } & Record<string, string | number>;

export type FormValues = Record<string, string>;

export type SuggestionList = "divisions" | "stateCodes" | "states" | "taxEnvs";

export type FieldConfig = {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  /** Renders a select of the configured warehouses. */
  siteSelect?: boolean;
  suggestions?: SuggestionList;
};

export type MappingConfig = {
  kind: MappingKind;
  label: string;
  pluralLabel: string;
  description: string;
  columns: { key: string; label: string; muted?: boolean }[];
  fields: FieldConfig[];
  schema: z.ZodType;
  getRows: (mappings: Mappings) => MappingRow[];
  getTitle: (row: MappingRow) => string;
  save: (input: unknown) => Promise<MappingActionResult>;
  remove: (id: number) => Promise<MappingActionResult>;
};

export const MAPPING_CONFIGS: Record<MappingKind, MappingConfig> = {
  site: {
    columns: [
      { key: "gstPrefix", label: "GST prefix" },
      { key: "siteCode", label: "Site code" },
      { key: "state", label: "State" },
    ],
    description:
      "The first two digits of Seller Gstin decide which warehouse (site) a sale belongs to.",
    fields: [
      {
        hint: "First 2 digits of the Seller Gstin, e.g. 09 for Uttar Pradesh.",
        label: "GST prefix",
        name: "gstPrefix",
        placeholder: "09",
      },
      { label: "Site code", name: "siteCode", placeholder: "WM0B6" },
      {
        hint: "Used in the downloaded file name.",
        label: "State",
        name: "state",
        placeholder: "UTTAR PRADESH",
        suggestions: "states",
      },
    ],
    getRows: (mappings) => mappings.sites,
    getTitle: (row) => `GST ${row.gstPrefix} → ${row.siteCode}`,
    kind: "site",
    label: "Warehouse",
    pluralLabel: "Warehouses",
    remove: deleteSiteMapping,
    save: saveSiteMapping,
    schema: siteMappingSchema,
  },
  product: {
    columns: [
      { key: "sku", label: "Amazon SKU" },
      { key: "productCode", label: "Product code" },
      { key: "productDivision", label: "Division" },
    ],
    description:
      "Each Amazon SKU is converted to an ERP product code and market segment (division).",
    fields: [
      {
        hint: "Exactly as it appears in the Sku column. Case-sensitive.",
        label: "Amazon SKU",
        name: "sku",
        placeholder: "MaxvidaV400JAR",
      },
      { label: "Product code", name: "productCode", placeholder: "WMAX0014" },
      {
        hint: "Written to MARKET_SEGMENT.",
        label: "Division",
        name: "productDivision",
        placeholder: "ANT",
        suggestions: "divisions",
      },
    ],
    getRows: (mappings) => mappings.products,
    getTitle: (row) => String(row.sku),
    kind: "product",
    label: "Product",
    pluralLabel: "Products",
    remove: deleteProductMapping,
    save: saveProductMapping,
    schema: productMappingSchema,
  },
  customer: {
    columns: [
      { key: "siteCode", label: "Site" },
      { key: "state", label: "Ship to state" },
      { key: "custCode", label: "Customer code" },
      { key: "custName", label: "Customer name", muted: true },
      { key: "stateCode", label: "State code" },
      { key: "taxEnv", label: "Tax env" },
    ],
    description:
      "The warehouse and the Ship To State decide the customer code and tax environment. Each site + state pair has exactly one customer.",
    fields: [
      { label: "Site", name: "siteCode", siteSelect: true },
      {
        hint: "Exactly as Amazon writes it in Ship To State.",
        label: "Ship to state",
        name: "state",
        placeholder: "JAMMU & KASHMIR",
        suggestions: "states",
      },
      { label: "Customer code", name: "custCode", placeholder: "WCJKF00023" },
      {
        label: "Customer name",
        name: "custName",
        optional: true,
        placeholder: "FBA-KOL-A6-JAMMU AND KASHMIR-NUT",
      },
      {
        label: "State code",
        name: "stateCode",
        placeholder: "JK",
        suggestions: "stateCodes",
      },
      {
        hint: "Written to TAX_ENV.",
        label: "Tax env",
        name: "taxEnv",
        placeholder: "SGST01",
        suggestions: "taxEnvs",
      },
    ],
    getRows: (mappings) => mappings.customers,
    getTitle: (row) => `${row.siteCode} + ${row.state}`,
    kind: "customer",
    label: "Customer",
    pluralLabel: "Customers",
    remove: deleteCustomerMapping,
    save: saveCustomerMapping,
    schema: customerMappingSchema,
  },
};

export const MAPPING_KINDS: MappingKind[] = ["site", "product", "customer"];

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function getSuggestions(
  mappings: Mappings,
): Record<SuggestionList, string[]> {
  return {
    divisions: unique(mappings.products.map((product) => product.productDivision)),
    stateCodes: unique(mappings.customers.map((customer) => customer.stateCode)),
    states: unique([
      ...mappings.sites.map((site) => site.state),
      ...mappings.customers.map((customer) => customer.state),
    ]),
    taxEnvs: unique(mappings.customers.map((customer) => customer.taxEnv)),
  };
}

export function toFormValues(
  config: MappingConfig,
  row?: Partial<Record<string, string | number>>,
): FormValues {
  return Object.fromEntries(
    config.fields.map((field) => [field.name, String(row?.[field.name] ?? "")]),
  );
}
