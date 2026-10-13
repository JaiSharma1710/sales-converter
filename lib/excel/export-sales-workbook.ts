import * as XLSX from "xlsx";
import type { SalesOrder } from "@/lib/import/build-sales-order";
import { createSalesWorkbook } from "./create-sales-workbook";

export function downloadSalesWorkbook(order: SalesOrder) {
  XLSX.writeFile(
    createSalesWorkbook(order.headerRows, order.detailRows),
    order.fileName,
  );
}
