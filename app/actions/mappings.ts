"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getAuthStatus } from "@/lib/auth/session";
import * as repository from "@/lib/db/mappings-repository";
import {
  customerMappingSchema,
  productMappingSchema,
  siteMappingSchema,
  toFieldErrors,
} from "@/lib/mappings/schemas";
import type { MappingActionResult } from "@/types/mappings";

// Server Actions can be called directly with any payload, so every action
// checks the session and validates its input even though the form does too.

const idSchema = z.number().int().positive();

const SIGNED_OUT_RESULT: MappingActionResult = {
  formError: "Your session has expired. Reload the page and sign in again.",
  ok: false,
};

async function isSignedIn() {
  return (await getAuthStatus()) === "authenticated";
}

async function save<T>(
  schema: z.ZodType<T>,
  input: unknown,
  persist: (value: T) => Promise<MappingActionResult>,
): Promise<MappingActionResult> {
  if (!(await isSignedIn())) {
    return SIGNED_OUT_RESULT;
  }

  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error), ok: false };
  }

  const result = await persist(parsed.data);

  if (result.ok) {
    refresh();
  }

  return result;
}

async function remove(
  id: unknown,
  persist: (id: number) => Promise<MappingActionResult>,
): Promise<MappingActionResult> {
  if (!(await isSignedIn())) {
    return SIGNED_OUT_RESULT;
  }

  const parsed = idSchema.safeParse(id);

  if (!parsed.success) {
    return { formError: "Invalid mapping id.", ok: false };
  }

  const result = await persist(parsed.data);

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
