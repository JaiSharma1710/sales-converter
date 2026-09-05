import * as XLSX from "xlsx";
import { createSalesWorkbook } from "./create-sales-workbook";
import type { ConvertedStateWorkbook } from "@/types/sales";

export function downloadSalesWorkbook(workbook: ConvertedStateWorkbook) {
  const xlsxWorkbook = createSalesWorkbook(
    workbook.headerRows,
    workbook.detailRows,
  );

  XLSX.writeFile(xlsxWorkbook, workbook.fileName);
}
