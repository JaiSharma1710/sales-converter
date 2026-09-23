import type { SalesAnalysis, StateSalesGroup } from "@/types/sales";
import { ConversionErrors } from "./conversion-errors";

type StateSalesListProps = {
  analysis: SalesAnalysis;
  fileName: string;
  selectedSheet: string;
  onOpenPreview: (group: StateSalesGroup) => void;
  onStartOver: () => void;
};

export function StateSalesList({
  analysis,
  fileName,
  selectedSheet,
  onOpenPreview,
  onStartOver,
}: StateSalesListProps) {
  return (
    <section className="w-full">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">
            Sheet confirmed
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-neutral-950">
            State Sales Files
          </h2>
          <div className="mt-4 space-y-1 text-sm text-neutral-600">
            <p className="break-all">File: {fileName}</p>
            <p>Selected sheet: {selectedSheet}</p>
            <p>Rows checked: {analysis.totalRows}</p>
            <p>Non-shipment rows skipped: {analysis.skippedRowsCount}</p>
          </div>
        </div>

        <button
          type="button"
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          onClick={onStartOver}
        >
          Upload Another File
        </button>
      </div>

      {analysis.groups.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {analysis.groups.map((group) => (
            <button
              key={group.siteCode}
              type="button"
              className="rounded-lg border border-neutral-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              onClick={() => onOpenPreview(group)}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                GST {group.gstPrefix}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-neutral-950">
                {group.state}
              </h3>
              <div className="mt-3 space-y-1 text-sm text-neutral-600">
                <p>{group.siteCode}</p>
                <p>{group.sourceRows.length} source rows</p>
              </div>
              <span className="mt-5 inline-flex rounded-lg bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">
                Open Preview
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          No mapped sales rows were found in this sheet.
        </p>
      )}

      {analysis.unmappedRows.length > 0 ? (
        <div className="mt-6">
          <ConversionErrors
            title={`${analysis.unmappedRows.length} rows could not be mapped from Seller Gstin.`}
            errors={analysis.unmappedRows.map((row) => ({
              message: row.reason,
              rowNumber: row.rowNumber,
              value: row.sellerGstin || "Empty",
            }))}
          />
        </div>
      ) : null}
    </section>
  );
}
