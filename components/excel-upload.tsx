"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { groupSalesByState } from "@/lib/excel/group-sales-by-state";
import { readAmazonSheet } from "@/lib/excel/read-amazon-sheet";
import { convertStateSalesRows } from "@/lib/sales/convert-state-sales";
import type {
  ConvertedStateWorkbook,
  SalesAnalysis,
  StateSalesGroup,
} from "@/types/sales";
import { ConfirmSheetDialog } from "./confirm-sheet-dialog";
import { StateSalesList } from "./state-sales-list";
import { SheetSelector } from "./sheet-selector";
import { WorkbookPreview } from "./workbook-preview";

const INVALID_FILE_MESSAGE = "Please upload an XLS or XLSX file.";
const READ_FAILURE_MESSAGE =
  "Unable to read this Excel file. Please try another file.";

function isExcelFile(file: File) {
  const fileName = file.name.toLowerCase();

  return fileName.endsWith(".xls") || fileName.endsWith(".xlsx");
}

export function ExcelUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [pendingSheet, setPendingSheet] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [salesAnalysis, setSalesAnalysis] = useState<SalesAnalysis | null>(
    null,
  );
  const [previewWorkbook, setPreviewWorkbook] =
    useState<ConvertedStateWorkbook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetWorkbookState = () => {
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setPendingSheet(null);
    setSelectedSheet(null);
    setSalesAnalysis(null);
    setPreviewWorkbook(null);
    setError(null);
  };

  const readWorkbook = async (nextFile: File) => {
    resetWorkbookState();

    if (!isExcelFile(nextFile)) {
      setError(INVALID_FILE_MESSAGE);
      return;
    }

    setIsReading(true);

    try {
      const buffer = await nextFile.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        cellDates: true,
        type: "array",
      });

      setFile(nextFile);
      setWorkbook(workbook);
      setSheetNames(workbook.SheetNames);
    } catch {
      setError(READ_FAILURE_MESSAGE);
    } finally {
      setIsReading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    const nextFile = files?.[0];

    if (!nextFile) {
      return;
    }

    void readWorkbook(nextFile);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const confirmPendingSheet = () => {
    if (!pendingSheet || !workbook) {
      return;
    }

    const nextSelectedSheet = pendingSheet;

    setError(null);
    setSelectedSheet(nextSelectedSheet);
    setPendingSheet(null);
    setPreviewWorkbook(null);

    try {
      const { skippedRowsCount, sourceRows } = readAmazonSheet(
        workbook,
        nextSelectedSheet,
      );
      const { groups, unmappedRows } = groupSalesByState(sourceRows);

      setSalesAnalysis({
        groups,
        skippedRowsCount,
        totalRows: sourceRows.length,
        unmappedRows,
      });
    } catch (analysisError) {
      setSalesAnalysis(null);
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : READ_FAILURE_MESSAGE,
      );
    }
  };

  const openPreview = (group: StateSalesGroup) => {
    setPreviewWorkbook(
      convertStateSalesRows({
        siteCode: group.siteCode,
        sourceRows: group.sourceRows,
        state: group.state,
      }),
    );
  };

  const activeSheet = pendingSheet ?? selectedSheet;

  if (previewWorkbook) {
    return (
      <WorkbookPreview
        workbook={previewWorkbook}
        onBack={() => setPreviewWorkbook(null)}
      />
    );
  }

  if (file && selectedSheet && salesAnalysis) {
    return (
      <StateSalesList
        analysis={salesAnalysis}
        fileName={file.name}
        selectedSheet={selectedSheet}
        onOpenPreview={openPreview}
        onStartOver={resetWorkbookState}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div
        className={[
          "rounded-lg border-2 border-dashed bg-white p-8 text-center shadow-sm transition-colors sm:p-12",
          isDragging
            ? "border-teal-500 bg-teal-50"
            : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-100/60",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
          <svg
            aria-hidden="true"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M20 16.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5" />
          </svg>
        </div>

        <h2 className="mt-6 text-xl font-semibold text-neutral-950">
          Upload Excel File
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          Drag & drop your file here
        </p>
        <p className="mt-1 text-sm text-neutral-500">or</p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Browse File
        </button>
        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-neutral-500">
          XLS and XLSX files only
        </p>
      </div>

      {isReading ? (
        <p className="mt-4 text-center text-sm text-neutral-600">
          Reading workbook...
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {file && sheetNames.length > 0 ? (
        <div className="mt-8">
          <p className="break-all text-sm font-medium text-neutral-700">
            {file.name}
          </p>

          <SheetSelector
            activeSheet={activeSheet}
            confirmedSheet={selectedSheet}
            sheetNames={sheetNames}
            onSelectSheet={(sheetName) => setPendingSheet(sheetName)}
          />

          {selectedSheet ? (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <svg
                aria-hidden="true"
                className="h-5 w-5 flex-none"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>Selected sheet: {selectedSheet}</span>
            </div>
          ) : null}

        </div>
      ) : null}

      <ConfirmSheetDialog
        sheetName={pendingSheet}
        onCancel={() => setPendingSheet(null)}
        onConfirm={confirmPendingSheet}
      />
    </section>
  );
}
