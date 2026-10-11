"use client";

import { useId, useState, useTransition } from "react";
import type { z } from "zod";
import { toFieldErrors } from "@/lib/mappings/schemas";
import type { MappingFieldErrors, Mappings } from "@/types/mappings";
import {
  dangerButton,
  primaryButton,
  secondaryButton,
  textInput,
} from "@/components/ui/styles";
import {
  getSuggestions,
  type FormValues,
  type MappingConfig,
} from "./mapping-config";

type MappingFormProps = {
  config: MappingConfig;
  mappings: Mappings;
  /** Present when editing an existing mapping. */
  editingId?: number;
  initialValues: FormValues;
  onCancel: () => void;
  onDone: (message: string) => void;
};

// Fills the state code from another customer in the same state, so the user
// does not have to look it up.
function withDerivedValues(
  config: MappingConfig,
  mappings: Mappings,
  values: FormValues,
  changedField: string,
) {
  if (config.kind !== "customer" || changedField !== "state" || values.stateCode) {
    return values;
  }

  const state = values.state.trim().replace(/\s+/g, " ").toUpperCase();
  const match = mappings.customers.find((customer) => customer.state === state);

  return match ? { ...values, stateCode: match.stateCode } : values;
}

export function MappingForm({
  config,
  editingId,
  initialValues,
  mappings,
  onCancel,
  onDone,
}: MappingFormProps) {
  const formId = useId();
  const [values, setValues] = useState(() =>
    withDerivedValues(config, mappings, initialValues, "state"),
  );
  const [fieldErrors, setFieldErrors] = useState<MappingFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const suggestions = getSuggestions(mappings);
  const isEditing = editingId !== undefined;
  const label = config.label.toLowerCase();

  const updateValue = (name: string, value: string) => {
    setValues((current) =>
      withDerivedValues(config, mappings, { ...current, [name]: value }, name),
    );
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const input = { ...values, id: editingId };
    const parsed = (config.schema as z.ZodType).safeParse(input);

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    startTransition(async () => {
      const result = await config.save(input);

      if (result.ok) {
        onDone(`${config.label} mapping ${isEditing ? "updated" : "added"}.`);
        return;
      }

      setFieldErrors(result.fieldErrors ?? {});
      setFormError(result.formError ?? null);
    });
  };

  const handleDelete = () => {
    if (editingId === undefined) {
      return;
    }

    setFormError(null);
    startTransition(async () => {
      const result = await config.remove(editingId);

      if (result.ok) {
        onDone(`${config.label} mapping deleted.`);
        return;
      }

      setIsConfirmingDelete(false);
      setFormError(result.formError ?? "Unable to delete this mapping.");
    });
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <button
          type="button"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-900"
          onClick={onCancel}
        >
          <span aria-hidden="true">←</span> All {config.pluralLabel.toLowerCase()}
        </button>

        <h3 className="text-xl font-semibold text-neutral-950">
          {isEditing ? `Edit ${label}` : `Add ${label}`}
        </h3>
        <p className="mt-1 text-sm text-neutral-600">{config.description}</p>

        {formError ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {formError}
          </p>
        ) : null}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {config.fields.map((field, index) => {
            const inputId = `${formId}-${field.name}`;
            const error = fieldErrors[field.name];
            const describedBy = error
              ? `${inputId}-error`
              : field.hint
                ? `${inputId}-hint`
                : undefined;

            return (
              <div key={field.name}>
                <label
                  htmlFor={inputId}
                  className="block text-sm font-semibold text-neutral-800"
                >
                  {field.label}
                  {field.optional ? (
                    <span className="ml-1 font-normal text-neutral-500">
                      (optional)
                    </span>
                  ) : null}
                </label>

                {field.siteSelect ? (
                  <select
                    id={inputId}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(error)}
                    autoFocus={index === 0}
                    className={`${textInput} mt-1.5`}
                    disabled={isPending}
                    value={values[field.name]}
                    onChange={(event) =>
                      updateValue(field.name, event.target.value)
                    }
                  >
                    <option value="">Select a site</option>
                    {mappings.sites.map((site) => (
                      <option key={site.id} value={site.siteCode}>
                        {site.siteCode} · {site.state}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={inputId}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(error)}
                    autoComplete="off"
                    autoFocus={index === 0}
                    className={`${textInput} mt-1.5 font-mono ${error ? "border-red-400" : ""}`}
                    disabled={isPending}
                    list={
                      field.suggestions
                        ? `${formId}-${field.suggestions}`
                        : undefined
                    }
                    placeholder={field.placeholder}
                    spellCheck={false}
                    value={values[field.name]}
                    onChange={(event) =>
                      updateValue(field.name, event.target.value)
                    }
                  />
                )}

                {error ? (
                  <p
                    id={`${inputId}-error`}
                    className="mt-1.5 text-xs font-medium text-red-700"
                  >
                    {error}
                  </p>
                ) : field.hint ? (
                  <p
                    id={`${inputId}-hint`}
                    className="mt-1.5 text-xs text-neutral-500"
                  >
                    {field.hint}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {Object.entries(suggestions).map(([list, options]) => (
          <datalist key={list} id={`${formId}-${list}`}>
            {options.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isEditing && !isConfirmingDelete ? (
            <button
              type="button"
              className="text-sm font-semibold text-red-700 hover:text-red-900 disabled:opacity-60"
              disabled={isPending}
              onClick={() => setIsConfirmingDelete(true)}
            >
              Delete mapping
            </button>
          ) : null}
          {isConfirmingDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-neutral-800">
                Delete this {label}?
              </span>
              <button
                type="button"
                className={dangerButton}
                disabled={isPending}
                onClick={handleDelete}
              >
                Yes, delete
              </button>
              <button
                type="button"
                className={secondaryButton}
                disabled={isPending}
                onClick={() => setIsConfirmingDelete(false)}
              >
                Keep
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 sm:justify-end">
          <button
            type="button"
            className={secondaryButton}
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className={primaryButton} disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Save changes" : `Add ${label}`}
          </button>
        </div>
      </div>
    </form>
  );
}
