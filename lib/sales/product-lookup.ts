import { PRODUCT_MAPPING } from "@/constants/product-mapping";

type ProductSku = keyof typeof PRODUCT_MAPPING;

export function lookupProductMapping(sku: unknown) {
  const normalizedSku = String(sku ?? "").trim();

  return {
    product: PRODUCT_MAPPING[normalizedSku as ProductSku] ?? null,
    sku: normalizedSku,
  };
}
