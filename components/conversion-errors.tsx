type DisplayError = {
  rowNumber: number;
  message: string;
  value?: unknown;
};

type ConversionErrorsProps = {
  title: string;
  errors: DisplayError[];
};

export function ConversionErrors({ errors, title }: ConversionErrorsProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <details className="rounded-lg border border-amber-200 bg-amber-50 p-4">
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
  );
}
