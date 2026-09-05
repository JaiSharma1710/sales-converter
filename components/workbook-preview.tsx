"use client";

import { useState } from "react";
import {
  DETAILS_COLUMNS,
  HEADER_COLUMNS,
} from "@/lib/excel/create-sales-workbook";
import { downloadSalesWorkbook } from "@/lib/excel/export-sales-workbook";
import type { ConvertedStateWorkbook } from "@/types/sales";
import { ConversionErrors } from "./conversion-errors";
import { SheetTabs } from "./sheet-tabs";
import { SpreadsheetGrid } from "./spreadsheet-grid";

type PreviewSheet = "Header" | "Details";

type WorkbookPreviewProps = {
  workbook: ConvertedStateWorkbook;
  onBack: () => void;
};

export function WorkbookPreview({ workbook, onBack }: WorkbookPreviewProps) {
  const [activeSheet, setActiveSheet] = useState<PreviewSheet>("Header");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const hasErrors = workbook.errors.length > 0;
  const errorRowCount = new Set(
    workbook.errors.map((error) => error.sourceRowNumber),
  ).size;
  const activeColumns =
    activeSheet === "Header" ? HEADER_COLUMNS : DETAILS_COLUMNS;
  const activeRows =
    activeSheet === "Header" ? workbook.headerRows : workbook.detailRows;

  const handleDownload = () => {
    if (hasErrors) {
      setDownloadError("Resolve conversion errors before downloading.");
      return;
    }

    setDownloadError(null);
    downloadSalesWorkbook(workbook);
  };

  return (
    <section className="w-full">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            className="mb-4 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            onClick={onBack}
          >
            Back
          </button>
          <h2 className="text-3xl font-semibold tracking-normal text-neutral-950">
            {workbook.state}
          </h2>
          <p className="mt-1 text-sm font-semibold text-neutral-600">
            {workbook.siteCode}
          </p>
          <p className="mt-3 text-sm text-neutral-600">
            {workbook.headerRows.length} Orders
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          {hasErrors ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              {errorRowCount} rows need attention
            </p>
          ) : (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              Ready to export: {workbook.headerRows.length} orders validated
            </p>
          )}

          <button
            type="button"
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300"
            disabled={hasErrors}
            onClick={handleDownload}
          >
            Download XLSX
          </button>
          {downloadError ? (
            <p className="text-sm font-medium text-red-700">
              {downloadError}
            </p>
          ) : null}
          {hasErrors ? (
            <p className="text-sm font-medium text-red-700">
              Resolve conversion errors before downloading.
            </p>
          ) : null}
        </div>
      </div>

      {hasErrors ? (
        <div className="mb-5">
          <ConversionErrors
            title={`${workbook.errors.length} conversion errors`}
            errors={workbook.errors.map((error) => ({
              message: error.message,
              rowNumber: error.sourceRowNumber,
              value: error.value,
            }))}
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm">
        <SpreadsheetGrid columns={activeColumns} rows={activeRows} />
        <SheetTabs activeSheet={activeSheet} onChange={setActiveSheet} />
      </div>
    </section>
  );
}
