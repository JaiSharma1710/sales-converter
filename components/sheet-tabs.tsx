type SheetName = "Header" | "Details";

type SheetTabsProps = {
  activeSheet: SheetName;
  onChange: (sheetName: SheetName) => void;
};

const SHEETS: SheetName[] = ["Header", "Details"];

export function SheetTabs({ activeSheet, onChange }: SheetTabsProps) {
  return (
    <div className="flex items-end gap-1 border-t border-neutral-200 bg-neutral-100 px-4 pt-2">
      {SHEETS.map((sheetName) => {
        const isActive = activeSheet === sheetName;

        return (
          <button
            key={sheetName}
            type="button"
            className={[
              "rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "border-neutral-300 bg-white text-neutral-950"
                : "border-transparent bg-neutral-200 text-neutral-600 hover:bg-neutral-300",
            ].join(" ")}
            onClick={() => onChange(sheetName)}
          >
            {sheetName}
          </button>
        );
      })}
    </div>
  );
}
