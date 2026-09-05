import * as XLSX from "xlsx";
import type {
  SalesDetailRow,
  SalesHeaderRow,
} from "@/types/sales";

export const HEADER_COLUMNS = [
  "SALE_ORDER",
  "ORDER_TYPE",
  "ORDER_DATE",
  "CUST_CODE",
  "ITEM_SER",
  "PRICE_LIST",
  "PRICE_LIST__CLG",
  "SITE_CODE",
  "MARKET_SEGMENT",
  "CUST_PORD",
  "PORD_DATE",
] as const;

export const DETAILS_COLUMNS = [
  "SALE_ORDER",
  "LINE_NO",
  "ITEM_CODE_ORD",
  "QUANTITY",
  "RATE",
  "TAX_CLASS",
  "TAX_CHAP",
  "TAX_ENV",
  "REMARKS",
] as const;

function applyDetailsFormats(sheet: XLSX.WorkSheet, rowCount: number) {
  const rateColumnIndex = DETAILS_COLUMNS.indexOf("RATE");

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const cellAddress = XLSX.utils.encode_cell({
      c: rateColumnIndex,
      r: rowIndex + 1,
    });
    const cell = sheet[cellAddress];

    if (cell && typeof cell.v === "number") {
      cell.z = "0.00";
    }
  }
}

function rowsToSheetData<T extends Record<string, unknown>>(
  columns: readonly string[],
  rows: T[],
) {
  return [
    [...columns],
    ...rows.map((row) => columns.map((column) => row[column] ?? "")),
  ];
}

export function createSalesWorkbook(
  headerRows: SalesHeaderRow[] = [],
  detailRows: SalesDetailRow[] = [],
) {
  const workbook = XLSX.utils.book_new();
  const headerSheet = XLSX.utils.aoa_to_sheet(
    rowsToSheetData(HEADER_COLUMNS, headerRows),
  );
  const detailsSheet = XLSX.utils.aoa_to_sheet(
    rowsToSheetData(DETAILS_COLUMNS, detailRows),
  );

  applyDetailsFormats(detailsSheet, detailRows.length);

  XLSX.utils.book_append_sheet(workbook, headerSheet, "Header");
  XLSX.utils.book_append_sheet(workbook, detailsSheet, "Details");

  return workbook;
}

export function createSalesOrderFileName(state: string, siteCode: string) {
  return `sales_order_Template_${state}_${siteCode}.xlsx`;
}
