export type SiteMapping = {
  id: number;
  gstPrefix: string;
  siteCode: string;
  state: string;
};

export type ProductMapping = {
  id: number;
  sku: string;
  productCode: string;
  productDivision: string;
};

export type CustomerMapping = {
  id: number;
  siteCode: string;
  state: string;
  custCode: string;
  custName: string;
  stateCode: string;
  taxEnv: string;
};

export type Mappings = {
  sites: SiteMapping[];
  products: ProductMapping[];
  customers: CustomerMapping[];
};

export type MappingKind = "site" | "product" | "customer";

/**
 * A suggested mapping to add, raised when a sales row cannot be converted.
 * The values pre-fill the settings form.
 */
export type MissingMapping =
  | { kind: "site"; values: { gstPrefix: string } }
  | { kind: "product"; values: { sku: string } }
  | { kind: "customer"; values: { siteCode: string; state: string } };

export type MappingFieldErrors = Partial<Record<string, string>>;

export type MappingActionResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: MappingFieldErrors };
