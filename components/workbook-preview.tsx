"use client";

import { useState } from "react";
import {
  DETAILS_COLUMNS,
  HEADER_COLUMNS,
} from "@/lib/excel/create-sales-workbook";
import { downloadSalesWorkbook } from "@/lib/excel/export-sales-workbook";
import type { SalesOrder } from "@/lib/import/build-sales-order";
import { SheetTabs } from "./sheet-tabs";
import { SpreadsheetGrid } from "./spreadsheet-grid";
import { Say } from "./ui/say";
import { primaryButton, secondaryButton } from "./ui/styles";

type PreviewSheet = "Header" | "Details";

type WorkbookPreviewProps = {
  order: SalesOrder;
  onBack: () => void;
};

export function WorkbookPreview({ onBack, order }: WorkbookPreviewProps) {
  const [activeSheet, setActiveSheet] = useState<PreviewSheet>("Header");
  const activeColumns =
    activeSheet === "Header" ? HEADER_COLUMNS : DETAILS_COLUMNS;
  const activeRows =
    activeSheet === "Header" ? order.headerRows : order.detailRows;

  return (
    <section className="w-full">
      <button type="button" className={secondaryButton} onClick={onBack}>
        <Say en="← Back to all steps" hi="← सभी चरणों पर वापस" className="text-left leading-tight" />
      </button>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border-2 border-emerald-300 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-950">
            {order.state}{" "}
            <span className="text-xl font-semibold text-neutral-500">{order.siteCode}</span>
          </h1>
          <p className="mt-2 text-lg text-neutral-700">
            <Say
              en={`${order.headerRows.length} orders, ready to download.`}
              hi={`${order.headerRows.length} ऑर्डर, डाउनलोड के लिए तैयार।`}
            />
          </p>
          <p className="mt-1 break-all text-base text-neutral-500">{order.fileName}</p>
        </div>
        <button
          type="button"
          className={`${primaryButton} px-8 py-4 text-xl`}
          onClick={() => downloadSalesWorkbook(order)}
        >
          <Say en="Download Excel" hi="Excel डाउनलोड करें" className="text-left leading-tight" />
        </button>
      </div>

      <p className="mb-2 mt-6 text-base text-neutral-600">
        <Say
          en="Below is what the file contains. Switch between the two sheets with the tabs at the bottom."
          hi="नीचे फ़ाइल का डेटा है। नीचे दिए टैब से दोनों शीट देख सकते हैं।"
        />
      </p>
      <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm">
        <SpreadsheetGrid columns={activeColumns} rows={activeRows} />
        <SheetTabs activeSheet={activeSheet} onChange={setActiveSheet} />
      </div>
    </section>
  );
}
