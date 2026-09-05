import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import type { AmazonSourceRow } from "@/types/amazon";

const SELLER_GSTIN_HEADER = "Seller Gstin";
const TRANSACTION_TYPE_HEADER = "Transaction Type";
const REFUND_TRANSACTION_TYPE = "refund";

type ReadAmazonSheetResult = {
  refundRowsSkipped: number;
  sourceRows: AmazonSourceRow[];
};

function normalizeCell(value: unknown) {
  return String(value ?? "").trim();
}

function rowHasValue(row: unknown[]) {
  return row.some((cell) => normalizeCell(cell) !== "");
}

export function readAmazonSheet(
  workbook: WorkBook,
  sheetName: string,
): ReadAmazonSheetResult {
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("Unable to find the selected worksheet.");
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    blankrows: true,
    defval: "",
    header: 1,
    raw: true,
  });

  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => normalizeCell(cell) === SELLER_GSTIN_HEADER),
  );

  if (headerRowIndex === -1) {
    throw new Error(
      'Seller Gstin column was not found in the selected sheet.',
    );
  }

  const headers = rows[headerRowIndex].map(normalizeCell);
  const sellerGstinColumnIndex = headers.findIndex(
    (header) => header === SELLER_GSTIN_HEADER,
  );
  const transactionTypeColumnIndex = headers.findIndex(
    (header) => header === TRANSACTION_TYPE_HEADER,
  );

  const actualRows = rows
    .slice(headerRowIndex + 1)
    .map((row, rowOffset) => {
      const rowNumber = headerRowIndex + rowOffset + 2;
      const values = headers.reduce<Record<string, unknown>>(
        (record, header, columnIndex) => {
          if (header) {
            record[header] = row[columnIndex] ?? "";
          }

          return record;
        },
        {},
      );
      const sellerGstin = normalizeCell(row[sellerGstinColumnIndex]);
      const transactionType =
        transactionTypeColumnIndex === -1
          ? null
          : normalizeCell(row[transactionTypeColumnIndex]);

      return {
        gstPrefix: sellerGstin.slice(0, 2),
        rowNumber,
        sellerGstin,
        transactionType,
        values,
      };
    })
    .filter((row) => rowHasValue(Object.values(row.values)));
  const sourceRows = actualRows.filter(
    (row) =>
      row.transactionType?.toLowerCase() !== REFUND_TRANSACTION_TYPE,
  );

  return {
    refundRowsSkipped: actualRows.length - sourceRows.length,
    sourceRows,
  };
}
