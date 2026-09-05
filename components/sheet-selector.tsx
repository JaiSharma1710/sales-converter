type SheetSelectorProps = {
  activeSheet: string | null;
  confirmedSheet: string | null;
  sheetNames: string[];
  onSelectSheet: (sheetName: string) => void;
};

export function SheetSelector({
  activeSheet,
  confirmedSheet,
  sheetNames,
  onSelectSheet,
}: SheetSelectorProps) {
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-neutral-950">
        Select the sheet containing the main sales data
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {sheetNames.map((sheetName) => {
          const isActive = activeSheet === sheetName;
          const isConfirmed = confirmedSheet === sheetName;

          return (
            <button
              key={sheetName}
              type="button"
              className={[
                "flex min-h-14 items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
                isActive
                  ? "border-teal-500 bg-teal-50 text-teal-950"
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50",
              ].join(" ")}
              onClick={() => onSelectSheet(sheetName)}
            >
              <span className="min-w-0 break-words">{sheetName}</span>
              {isConfirmed ? (
                <svg
                  aria-label="Confirmed"
                  className="ml-3 h-5 w-5 flex-none text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
