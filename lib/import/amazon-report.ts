import type * as XLSX from "xlsx";
import { formatAmazonDate } from "@/lib/sales/format-date";
import { normalizeState } from "@/lib/sales/normalize-state";
import type { Problem } from "./problem";
import {
  cellText,
  columnLabel,
  findColumn,
  findHeaderRow,
  normalizeHeader,
  parseNumber,
  rowHasValue,
} from "./sheet";
import { stateKey } from "./states";

export type AmazonOrder = {
  rowNumber: number;
  invoiceNumber: string;
  invoiceDate: string;
  sku: string;
  shipFromState: string;
  shipToState: string;
  quantity: number;
  invoiceAmount: number;
};

/** All orders shipped from one warehouse state. */
export type WarehouseGroup = {
  key: string;
  state: string;
  orders: AmazonOrder[];
};

export type AmazonReport = {
  fileName: string;
  sheetName: string;
  orders: AmazonOrder[];
  warehouses: WarehouseGroup[];
  /** Refund, FreeReplacement etc. — not sales orders. */
  skippedCount: number;
};

const COLUMNS = {
  invoiceAmount: "INVOICE AMOUNT",
  invoiceDate: "INVOICE DATE",
  invoiceNumber: "INVOICE NUMBER",
  quantity: "QUANTITY",
  shipFromState: "SHIP FROM STATE",
  shipToState: "SHIP TO STATE",
  sku: "SKU",
} as const;

type ColumnKey = keyof typeof COLUMNS;

const TRANSACTION_TYPE = "TRANSACTION TYPE";
const SHIPMENT = "SHIPMENT";

type RowIssue = { column: ColumnKey; kind: "empty" | "invalid" | "zero" };

const ISSUE_TEXT: Record<
  RowIssue["kind"],
  { en: string; hi: string; fixEn: string; fixHi: string }
> = {
  empty: {
    en: "is empty",
    fixEn: "Fill in the empty cells, save, and upload the file again.",
    fixHi: "खाली सेल भरें, फ़ाइल सेव करें और दोबारा अपलोड करें।",
    hi: "खाली है",
  },
  invalid: {
    en: "is not a valid value",
    fixEn:
      "Correct these cells (dates like 15/09/2026, amounts as plain numbers), save, and upload again.",
    fixHi:
      "इन सेल को ठीक करें (तारीख 15/09/2026 जैसी, रकम सिर्फ़ नंबर में), फ़ाइल सेव करें और दोबारा अपलोड करें।",
    hi: "सही नहीं है",
  },
  zero: {
    en: "is 0",
    fixEn: "Quantity must be at least 1. Correct it, save, and upload again.",
    fixHi:
      "Quantity कम से कम 1 होनी चाहिए। ठीक करें, फ़ाइल सेव करें और दोबारा अपलोड करें।",
    hi: "0 है",
  },
};

export type AmazonReportResult =
  | { ok: true; report: AmazonReport }
  | { ok: false; problems: Problem[] };

export function readAmazonReport(
  workbook: XLSX.WorkBook,
  fileName: string,
): AmazonReportResult {
  // Any two of the expected headings are enough to find the table; the
  // rest are reported as missing below.
  const table =
    findHeaderRow(workbook, [COLUMNS.sku, COLUMNS.shipFromState]) ??
    findHeaderRow(workbook, [COLUMNS.invoiceNumber, COLUMNS.quantity]);

  if (!table) {
    return {
      ok: false,
      problems: [
        {
          fix: {
            en: "Upload the Amazon FBA sales report (the file downloaded from Amazon with columns like Invoice Number, Sku, Ship From State).",
            hi: "Amazon FBA सेल्स रिपोर्ट अपलोड करें (Amazon से डाउनलोड की गई फ़ाइल, जिसमें Invoice Number, Sku, Ship From State जैसे कॉलम हों)।",
          },
          title: {
            en: "This is not the Amazon sales report.",
            hi: "यह Amazon सेल्स रिपोर्ट नहीं है।",
          },
          where: { file: fileName },
        },
      ],
    };
  }

  const { headerRowIndex, headers, rows, sheetName } = table;
  const columnIndex = Object.fromEntries(
    Object.entries(COLUMNS).map(([key, name]) => [
      key,
      findColumn(headers, [name]),
    ]),
  ) as Record<ColumnKey, number>;
  const missing = (Object.keys(COLUMNS) as ColumnKey[]).filter(
    (key) => columnIndex[key] === -1,
  );

  if (missing.length > 0) {
    const names = missing.map((key) => `"${COLUMNS[key]}"`).join(", ");

    return {
      ok: false,
      problems: [
        {
          fix: {
            en: "Download the report from Amazon again without removing any columns, and upload it here.",
            hi: "Amazon से रिपोर्ट दोबारा डाउनलोड करें, कोई कॉलम न हटाएँ, और यहाँ अपलोड करें।",
          },
          title: {
            en: `The Amazon report is missing these columns: ${names}.`,
            hi: `Amazon रिपोर्ट में ये कॉलम नहीं हैं: ${names}।`,
          },
          where: { file: fileName, sheet: sheetName },
        },
      ],
    };
  }

  const transactionColumn = findColumn(headers, [TRANSACTION_TYPE]);
  const orders: AmazonOrder[] = [];
  const issues = new Map<string, { issue: RowIssue; rows: number[] }>();
  let skippedCount = 0;

  const addIssue = (issue: RowIssue, rowNumber: number) => {
    const key = `${issue.column}|${issue.kind}`;
    const entry = issues.get(key);

    if (entry) {
      entry.rows.push(rowNumber);
    } else {
      issues.set(key, { issue, rows: [rowNumber] });
    }
  };

  rows.slice(headerRowIndex + 1).forEach((row, offset) => {
    const rowNumber = headerRowIndex + offset + 2;

    if (!rowHasValue(row)) {
      return;
    }

    if (
      transactionColumn !== -1 &&
      normalizeHeader(row[transactionColumn]) !== SHIPMENT
    ) {
      skippedCount += 1;
      return;
    }

    const read = (key: ColumnKey) => row[columnIndex[key]];
    let hasIssue = false;
    const check = (column: ColumnKey, kind: RowIssue["kind"]) => {
      addIssue({ column, kind }, rowNumber);
      hasIssue = true;
    };

    for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
      if (cellText(read(key)) === "") {
        check(key, "empty");
      }
    }

    const invoiceDate = formatAmazonDate(read("invoiceDate"));
    const quantity = parseNumber(read("quantity"));
    const invoiceAmount = parseNumber(read("invoiceAmount"));

    if (!invoiceDate && cellText(read("invoiceDate"))) {
      check("invoiceDate", "invalid");
    }

    if (quantity === null && cellText(read("quantity"))) {
      check("quantity", "invalid");
    } else if (quantity === 0) {
      check("quantity", "zero");
    }

    if (invoiceAmount === null && cellText(read("invoiceAmount"))) {
      check("invoiceAmount", "invalid");
    }

    if (hasIssue || !invoiceDate || !quantity || invoiceAmount === null) {
      return;
    }

    orders.push({
      invoiceAmount,
      invoiceDate,
      invoiceNumber: cellText(read("invoiceNumber")),
      quantity,
      rowNumber,
      shipFromState: normalizeState(read("shipFromState")),
      shipToState: normalizeState(read("shipToState")),
      sku: cellText(read("sku")),
    });
  });

  if (issues.size > 0) {
    return {
      ok: false,
      problems: Array.from(issues.values()).map(({ issue, rows: issueRows }) => {
        const text = ISSUE_TEXT[issue.kind];
        const index = columnIndex[issue.column];

        return {
          fix: { en: text.fixEn, hi: text.fixHi },
          title: {
            en: `"${COLUMNS[issue.column]}" ${text.en} in ${issueRows.length} ${issueRows.length === 1 ? "row" : "rows"}.`,
            hi: `${issueRows.length} ${issueRows.length === 1 ? "पंक्ति" : "पंक्तियों"} में "${COLUMNS[issue.column]}" ${text.hi}।`,
          },
          where: {
            column: columnLabel(index, rows[headerRowIndex][index]),
            file: fileName,
            rows: issueRows,
            sheet: sheetName,
          },
        };
      }),
    };
  }

  if (orders.length === 0) {
    return {
      ok: false,
      problems: [
        {
          fix: {
            en: "Check that you picked the right report and that it covers the dates you want.",
            hi: "देखें कि सही रिपोर्ट चुनी है और उसमें आपकी चाही गई तारीखें हैं।",
          },
          title: {
            en: "No shipment orders were found in this report.",
            hi: "इस रिपोर्ट में कोई शिपमेंट ऑर्डर नहीं मिला।",
          },
          where: { file: fileName, sheet: sheetName },
        },
      ],
    };
  }

  const groups = new Map<string, WarehouseGroup>();

  for (const order of orders) {
    const key = stateKey(order.shipFromState);
    const group = groups.get(key);

    if (group) {
      group.orders.push(order);
    } else {
      groups.set(key, { key, orders: [order], state: order.shipFromState });
    }
  }

  return {
    ok: true,
    report: {
      fileName,
      orders,
      sheetName,
      skippedCount,
      warehouses: Array.from(groups.values()).sort(
        (a, b) => b.orders.length - a.orders.length,
      ),
    },
  };
}
