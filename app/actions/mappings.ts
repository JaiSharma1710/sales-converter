"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import * as repository from "@/lib/db/mappings-repository";
import {
  customerMappingSchema,
  productMappingSchema,
  siteMappingSchema,
  toFieldErrors,
} from "@/lib/mappings/schemas";
import type { MappingActionResult } from "@/types/mappings";

// Server Actions can be called with any payload, so every input is validated
// here even though the form validates it first.

const idSchema = z.number().int().positive();

function save<T>(
  schema: z.ZodType<T>,
  input: unknown,
  persist: (value: T) => MappingActionResult,
): MappingActionResult {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error), ok: false };
  }

  const result = persist(parsed.data);

  if (result.ok) {
    refresh();
  }

  return result;
}

function remove(
  id: unknown,
  persist: (id: number) => MappingActionResult,
): MappingActionResult {
  const parsed = idSchema.safeParse(id);

  if (!parsed.success) {
    return { formError: "Invalid mapping id.", ok: false };
  }

  const result = persist(parsed.data);

  if (result.ok) {
    refresh();
  }

  return result;
}

export async function saveSiteMapping(input: unknown) {
  return save(siteMappingSchema, input, repository.saveSite);
}

export async function deleteSiteMapping(id: unknown) {
  return remove(id, repository.deleteSite);
}

export async function saveProductMapping(input: unknown) {
  return save(productMappingSchema, input, repository.saveProduct);
}

export async function deleteProductMapping(id: unknown) {
  return remove(id, repository.deleteProduct);
}

export async function saveCustomerMapping(input: unknown) {
  return save(customerMappingSchema, input, repository.saveCustomer);
}

export async function deleteCustomerMapping(id: unknown) {
  return remove(id, repository.deleteCustomer);
}
