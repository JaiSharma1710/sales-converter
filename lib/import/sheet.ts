import * as XLSX from "xlsx";

export type SheetRows = unknown[][];

export function readWorkbook(buffer: ArrayBuffer) {
  return XLSX.read(buffer, { cellDates: true, type: "array" });
}

export function sheetRows(workbook: XLSX.WorkBook, sheetName: string) {
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    blankrows: true,
    defval: "",
    header: 1,
    raw: true,
  });
}

export function cellText(value: unknown) {
  return String(value ?? "").trim();
}

/** "site_code", "Site Code" and "SITE-CODE" all become "SITE CODE". */
export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function columnLetter(index: number) {
  return XLSX.utils.encode_col(index);
}

/** "B (PRODUCT CODE)" — how a column is named in messages. */
export function columnLabel(index: number, heading: unknown) {
  const text = cellText(heading);

  return text
    ? `${columnLetter(index)} (${text})`
    : `${columnLetter(index)} (no heading / बिना हेडिंग)`;
}

export function rowHasValue(row: unknown[]) {
  return row.some((cell) => cellText(cell) !== "");
}

const HEADER_SEARCH_ROWS = 20;

/**
 * Finds the first sheet and row whose headings include every one of
 * `required` (normalized). Headings may sit below a title row.
 */
export function findHeaderRow(
  workbook: XLSX.WorkBook,
  required: string[],
) {
  for (const sheetName of workbook.SheetNames) {
    const rows = sheetRows(workbook, sheetName);
    const limit = Math.min(rows.length, HEADER_SEARCH_ROWS);

    for (let index = 0; index < limit; index += 1) {
      const headers = rows[index].map(normalizeHeader);

      if (required.every((name) => headers.includes(name))) {
        return { headerRowIndex: index, headers, rows, sheetName };
      }
    }
  }

  return null;
}

/** First column whose heading is one of `names`, or -1. */
export function findColumn(headers: string[], names: string[]) {
  return headers.findIndex((header) => names.includes(header));
}

export function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = cellText(value).replace(/,/g, "");

  if (!text) {
    return null;
  }

  const parsed = Number(text);

  return Number.isFinite(parsed) ? parsed : null;
}

/** "12, 15, 18 … and 40 more" for long row lists. */
export function formatRowList(rows: number[], max = 8) {
  const shown = rows.slice(0, max).join(", ");
  const rest = rows.length - max;

  return rest > 0 ? `${shown} … (+${rest})` : shown;
}
