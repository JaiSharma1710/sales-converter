import { normalizeState } from "@/lib/sales/normalize-state";
import type {
  CustomerMapping,
  Mappings,
  ProductMapping,
  SiteMapping,
} from "@/types/mappings";

export type MappingIndex = {
  customersBySiteState: Map<string, CustomerMapping>;
  productsBySku: Map<string, ProductMapping>;
  sitesByGstPrefix: Map<string, SiteMapping>;
};

function customerKey(siteCode: string, state: unknown) {
  return `${siteCode}|${normalizeState(state)}`;
}

export function createMappingIndex(mappings: Mappings): MappingIndex {
  return {
    customersBySiteState: new Map(
      mappings.customers.map((customer) => [
        customerKey(customer.siteCode, customer.state),
        customer,
      ]),
    ),
    productsBySku: new Map(
      mappings.products.map((product) => [product.sku, product]),
    ),
    sitesByGstPrefix: new Map(
      mappings.sites.map((site) => [site.gstPrefix, site]),
    ),
  };
}

export function lookupProduct(index: MappingIndex, sku: unknown) {
  const normalizedSku = String(sku ?? "").trim();

  return {
    product: index.productsBySku.get(normalizedSku) ?? null,
    sku: normalizedSku,
  };
}

export function lookupCustomer(
  index: MappingIndex,
  siteCode: string,
  shipToState: unknown,
) {
  return index.customersBySiteState.get(customerKey(siteCode, shipToState)) ?? null;
}
