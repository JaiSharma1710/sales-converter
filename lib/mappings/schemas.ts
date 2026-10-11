import { z } from "zod";
import { normalizeState } from "@/lib/sales/normalize-state";
import type { MappingFieldErrors } from "@/types/mappings";

// Shared by the settings form (instant feedback) and the server actions
// (authoritative). The database repeats the core rules as CHECK constraints.

// Valid GST state codes: 01–38, 97 (other territory), 99 (centre jurisdiction).
const GST_PREFIX_PATTERN = /^(0[1-9]|[12]\d|3[0-8]|97|99)$/;
const CODE_PATTERN = /^[A-Z0-9]+$/;
const STATE_PATTERN = /^[A-Z][A-Z &.()-]*$/;
const PRINTABLE_PATTERN = /^[\x20-\x7E]+$/;

function code(label: string, maxLength: number) {
  return z
    .string()
    .trim()
    .toUpperCase()
    .min(1, `${label} is required.`)
    .max(maxLength, `${label} must be at most ${maxLength} characters.`)
    .regex(CODE_PATTERN, `${label} can only contain letters and numbers.`);
}

const stateName = z
  .string()
  .transform(normalizeState)
  .pipe(
    z
      .string()
      .min(1, "State is required.")
      .max(60, "State must be at most 60 characters.")
      .regex(
        STATE_PATTERN,
        "State can only contain letters, spaces and & . ( ) -",
      ),
  );

const id = z.number().int().positive().optional();

export const siteMappingSchema = z.object({
  id,
  gstPrefix: z
    .string()
    .trim()
    .regex(
      GST_PREFIX_PATTERN,
      "GST prefix must be a valid 2-digit GST state code (01–38, 97 or 99).",
    ),
  siteCode: code("Site code", 10),
  state: stateName,
});

export const productMappingSchema = z.object({
  id,
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required.")
    .max(100, "SKU must be at most 100 characters.")
    .regex(PRINTABLE_PATTERN, "SKU contains unsupported characters."),
  productCode: code("Product code", 20),
  productDivision: code("Division", 10),
});

export const customerMappingSchema = z.object({
  id,
  siteCode: code("Site code", 10),
  state: stateName,
  custCode: code("Customer code", 20),
  custName: z
    .string()
    .trim()
    .max(120, "Customer name must be at most 120 characters."),
  stateCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "State code must be exactly 2 letters."),
  taxEnv: code("Tax env", 20),
});

export type SiteMappingInput = z.output<typeof siteMappingSchema>;
export type ProductMappingInput = z.output<typeof productMappingSchema>;
export type CustomerMappingInput = z.output<typeof customerMappingSchema>;

export function toFieldErrors(error: z.ZodError): MappingFieldErrors {
  const fieldErrors: MappingFieldErrors = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");

    fieldErrors[field] ??= issue.message;
  }

  return fieldErrors;
}
