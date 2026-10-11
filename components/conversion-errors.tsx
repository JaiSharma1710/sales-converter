import type { MissingMapping } from "@/types/mappings";

type DisplayError = {
  rowNumber: number;
  message: string;
  value?: unknown;
  missingMapping?: MissingMapping;
};

type ConversionErrorsProps = {
  title: string;
  errors: DisplayError[];
  onAddMapping?: (missingMapping: MissingMapping) => void;
};

type MissingMappingSummary = {
  key: string;
  missingMapping: MissingMapping;
  rowCount: number;
};

const ADD_LABELS: Record<MissingMapping["kind"], string> = {
  customer: "Add customer",
  product: "Add product",
  site: "Add warehouse",
};

function describeMissingMapping(missingMapping: MissingMapping) {
  switch (missingMapping.kind) {
    case "customer":
      return `Customer for ${missingMapping.values.siteCode} + ${missingMapping.values.state}`;
    case "product":
      return `SKU ${missingMapping.values.sku}`;
    case "site":
      return `Warehouse for GST prefix ${missingMapping.values.gstPrefix}`;
  }
}

function summarizeMissingMappings(errors: DisplayError[]) {
  const summaries = new Map<string, MissingMappingSummary>();

  for (const error of errors) {
    if (!error.missingMapping) {
      continue;
    }

    const key = JSON.stringify(error.missingMapping);
    const summary = summaries.get(key);

    if (summary) {
      summary.rowCount += 1;
    } else {
      summaries.set(key, {
        key,
        missingMapping: error.missingMapping,
        rowCount: 1,
      });
    }
  }

  return Array.from(summaries.values());
}

export function ConversionErrors({
  errors,
  onAddMapping,
  title,
}: ConversionErrorsProps) {
  if (errors.length === 0) {
    return null;
  }

  const missingMappings = onAddMapping ? summarizeMissingMappings(errors) : [];

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      {missingMappings.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-amber-950">
            Missing mappings
          </h3>
          <p className="mt-1 text-sm text-amber-900">
            Add these and the rows convert automatically.
          </p>
          <ul className="mt-3 grid gap-2">
            {missingMappings.map((summary) => (
              <li
                key={summary.key}
                className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-all font-mono text-sm font-semibold text-neutral-900">
                    {describeMissingMapping(summary.missingMapping)}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {summary.rowCount} {summary.rowCount === 1 ? "row" : "rows"} affected
                  </p>
                </div>
                <button
                  type="button"
                  className="flex-none rounded-lg bg-neutral-950 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  onClick={() => onAddMapping?.(summary.missingMapping)}
                >
                  {ADD_LABELS[summary.missingMapping.kind]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <details open={missingMappings.length === 0}>
        <summary className="cursor-pointer text-sm font-semibold text-amber-900">
          {title}
        </summary>

        <div className="mt-4 max-h-64 overflow-auto">
          <div className="grid gap-2">
            {errors.map((error, index) => (
              <div
                key={`${error.rowNumber}-${index}`}
                className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 text-sm"
              >
                <p className="font-semibold text-amber-950">
                  Row {error.rowNumber}
                </p>
                <p className="mt-1 text-amber-900">{error.message}</p>
                {error.value !== undefined ? (
                  <p className="mt-1 break-all text-xs text-amber-800">
                    Value: {String(error.value)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
