import type * as XLSX from "xlsx";
import { normalizeState } from "@/lib/sales/normalize-state";
import type { WarehouseGroup } from "./amazon-report";
import type { Problem } from "./problem";
import {
  cellText,
  columnLabel,
  columnLetter,
  findColumn,
  findHeaderRow,
  rowHasValue,
} from "./sheet";
import { stateKey } from "./states";

/** Tax env for sales to other states; the home state has its own code. */
const INTER_STATE_TAX_ENV = "SGST01";

export type WarehouseCustomer = {
  rowNumber: number;
  state: string;
  key: string;
  custCode: string;
  custName: string;
  taxEnv: string;
};

type Column = { index: number; letter: string; label: string };

export type WarehouseFile = {
  fileName: string;
  sheetName: string;
  siteCode: string;
  /** Detected from the one state with its own tax env, when there is one. */
  homeState: string | null;
  customers: WarehouseCustomer[];
  columns: { site: Column; state: Column; custCode: Column; taxEnv: Column };
};

export type WarehouseFileResult =
  | { ok: true; file: WarehouseFile }
  | { ok: false; problems: Problem[] };

const NOT_A_WAREHOUSE_FILE = (fileName: string): Problem => ({
  fix: {
    en: 'Upload the warehouse master sheet. It has a customer list with the columns "site_code", "State", "cust_code" and "TAX_ENV".',
    hi: 'वेयरहाउस मास्टर शीट अपलोड करें। उसमें "site_code", "State", "cust_code" और "TAX_ENV" कॉलम वाली कस्टमर लिस्ट होती है।',
  },
  title: {
    en: "This is not a warehouse master file.",
    hi: "यह वेयरहाउस मास्टर फ़ाइल नहीं है।",
  },
  where: { file: fileName },
});

/**
 * Some sheets repeat the State column with a tax env beside it (columns G
 * and H), and that copy is the maintained one; the labelled TAX_ENV column
 * is often stale or empty. Use the pair when it exists.
 */
function findTaxEnvColumn(
  rows: unknown[][],
  headerRowIndex: number,
  headers: string[],
  stateIndex: number,
) {
  const dataRows = rows
    .slice(headerRowIndex + 1)
    .filter((row) => cellText(row[stateIndex]) !== "");
  const width = Math.max(...rows.map((row) => row.length));

  for (let index = stateIndex + 1; index < width - 1; index += 1) {
    const matches = dataRows.filter(
      (row) => stateKey(row[index]) === stateKey(row[stateIndex]),
    ).length;
    const hasTaxValues = dataRows.some((row) => cellText(row[index + 1]));

    if (dataRows.length > 0 && matches / dataRows.length >= 0.8 && hasTaxValues) {
      return index + 1;
    }
  }

  return findColumn(headers, ["TAX ENV", "TAX ENVIRONMENT"]);
}

export function readWarehouseFile(
  workbook: XLSX.WorkBook,
  fileName: string,
): WarehouseFileResult {
  const table = findHeaderRow(workbook, ["SITE CODE", "STATE", "CUST CODE"]);

  if (!table) {
    return { ok: false, problems: [NOT_A_WAREHOUSE_FILE(fileName)] };
  }

  const { headerRowIndex, headers, rows, sheetName } = table;
  const header = rows[headerRowIndex];
  const column = (index: number): Column => ({
    index,
    label: columnLabel(index, header[index]),
    letter: columnLetter(index),
  });
  const site = column(findColumn(headers, ["SITE CODE"]));
  const state = column(findColumn(headers, ["STATE"]));
  const custCode = column(findColumn(headers, ["CUST CODE"]));
  const custNameIndex = findColumn(headers, ["CUST NAME", "CUSTOMER NAME"]);
  const taxEnvIndex = findTaxEnvColumn(rows, headerRowIndex, headers, state.index);

  if (taxEnvIndex === -1) {
    return {
      ok: false,
      problems: [
        {
          fix: {
            en: 'Add a "TAX_ENV" column with the tax code for each state (SGST01 for other states).',
            hi: 'हर स्टेट के टैक्स कोड के साथ "TAX_ENV" कॉलम जोड़ें (दूसरे स्टेट के लिए SGST01)।',
          },
          title: {
            en: "The tax column (TAX_ENV) was not found in this file.",
            hi: "इस फ़ाइल में टैक्स कॉलम (TAX_ENV) नहीं मिला।",
          },
          where: { file: fileName, sheet: sheetName },
        },
      ],
    };
  }

  const taxEnv = column(taxEnvIndex);
  const customers: WarehouseCustomer[] = [];
  const siteCodes = new Set<string>();

  rows.slice(headerRowIndex + 1).forEach((row, offset) => {
    if (!rowHasValue(row) || !cellText(row[state.index])) {
      return;
    }

    const custName = custNameIndex === -1 ? "" : cellText(row[custNameIndex]);
    let rowState = normalizeState(row[state.index]);

    // Ladakh customers are filed under "JAMMU & KASHMIR"; their name
    // tells them apart.
    if (
      stateKey(rowState) === stateKey("JAMMU & KASHMIR") &&
      custName.toUpperCase().includes("LADAKH")
    ) {
      rowState = "LADAKH";
    }

    const siteCode = cellText(row[site.index]).toUpperCase();

    if (siteCode) {
      siteCodes.add(siteCode);
    }

    customers.push({
      custCode: cellText(row[custCode.index]).toUpperCase(),
      custName,
      key: stateKey(rowState),
      rowNumber: headerRowIndex + offset + 2,
      state: rowState,
      taxEnv: cellText(row[taxEnv.index]).toUpperCase(),
    });
  });

  if (customers.length === 0) {
    return { ok: false, problems: [NOT_A_WAREHOUSE_FILE(fileName)] };
  }

  if (siteCodes.size !== 1) {
    const codes = Array.from(siteCodes);

    return {
      ok: false,
      problems: [
        {
          fix: {
            en: `Every row in column ${site.letter} must have the same site code (like WM0B2) — the code of this warehouse.`,
            hi: `कॉलम ${site.letter} की हर लाइन में एक ही साइट कोड (जैसे WM0B2) होना चाहिए — इसी वेयरहाउस का कोड।`,
          },
          title:
            codes.length === 0
              ? {
                  en: "The site code column is empty.",
                  hi: "साइट कोड वाला कॉलम खाली है।",
                }
              : {
                  en: `This file has more than one site code: ${codes.join(", ")}.`,
                  hi: `इस फ़ाइल में एक से ज़्यादा साइट कोड हैं: ${codes.join(", ")}।`,
                },
          where: { column: site.label, file: fileName, sheet: sheetName },
        },
      ],
    };
  }

  const homeStates = Array.from(
    new Map(
      customers
        .filter(
          (customer) =>
            customer.taxEnv && customer.taxEnv !== INTER_STATE_TAX_ENV,
        )
        .map((customer) => [customer.key, customer.state]),
    ).values(),
  );

  return {
    file: {
      columns: { custCode, site, state, taxEnv },
      customers,
      fileName,
      homeState: homeStates.length === 1 ? homeStates[0] : null,
      sheetName,
      siteCode: Array.from(siteCodes)[0],
    },
    ok: true,
  };
}

export type CustomerLookup = Map<string, WarehouseCustomer>;

/**
 * Checks the warehouse file covers every ship-to state in the orders, and
 * returns the customer to use for each.
 */
export function checkWarehouseFile(
  file: WarehouseFile,
  group: WarehouseGroup,
): { problems: Problem[]; lookup: CustomerLookup } {
  const lookup: CustomerLookup = new Map();
  const { columns } = file;
  const where = (rows: number[], column?: string) => ({
    column,
    file: file.fileName,
    rows,
    sheet: file.sheetName,
  });

  if (file.homeState && stateKey(file.homeState) !== group.key) {
    return {
      lookup,
      problems: [
        {
          fix: {
            en: `Upload the warehouse file for ${group.state} in this box. Upload this file in the ${file.homeState} box instead.`,
            hi: `इस बॉक्स में ${group.state} की वेयरहाउस फ़ाइल अपलोड करें। यह फ़ाइल ${file.homeState} वाले बॉक्स में अपलोड करें।`,
          },
          title: {
            en: `This is the ${file.homeState} warehouse file (${file.siteCode}), not ${group.state}.`,
            hi: `यह ${file.homeState} की वेयरहाउस फ़ाइल (${file.siteCode}) है, ${group.state} की नहीं।`,
          },
          where: { file: file.fileName },
        },
      ],
    };
  }

  const ordersByState = new Map<string, { state: string; count: number }>();

  for (const order of group.orders) {
    const key = stateKey(order.shipToState);
    const entry = ordersByState.get(key);

    if (entry) {
      entry.count += 1;
    } else {
      ordersByState.set(key, { count: 1, state: order.shipToState });
    }
  }

  const problems: Problem[] = [];

  for (const [key, { state, count }] of ordersByState) {
    const usedIn = {
      en: `${count} Amazon ${count === 1 ? "order goes" : "orders go"} to ${state}`,
      hi: `Amazon के ${count} ऑर्डर ${state} जा रहे हैं`,
    };
    const candidates = file.customers.filter((customer) => customer.key === key);
    const distinct = Array.from(
      new Map(
        candidates.map((customer) => [
          `${customer.custCode}|${customer.taxEnv}`,
          customer,
        ]),
      ).values(),
    );

    if (distinct.length === 0) {
      const similar = file.customers.find(
        (customer) =>
          customer.key.length >= 4 &&
          (customer.key.includes(key) || key.includes(customer.key)),
      );

      problems.push({
        fix: similar
          ? {
              en: `Row ${similar.rowNumber} has "${similar.state}". If that is the same state, change column ${columns.state.letter} in row ${similar.rowNumber} to ${state}. Save and upload again.`,
              hi: `पंक्ति ${similar.rowNumber} में "${similar.state}" लिखा है। अगर यही स्टेट है, तो पंक्ति ${similar.rowNumber} के कॉलम ${columns.state.letter} में ${state} लिखें। फ़ाइल सेव करें और दोबारा अपलोड करें।`,
            }
          : {
              en: `Add a new row: column ${columns.site.letter} = ${file.siteCode}, column ${columns.state.letter} = ${state}, column ${columns.custCode.letter} = the customer code for ${state}, column ${columns.taxEnv.letter} = ${INTER_STATE_TAX_ENV}. Save and upload again.`,
              hi: `एक नई लाइन जोड़ें: कॉलम ${columns.site.letter} = ${file.siteCode}, कॉलम ${columns.state.letter} = ${state}, कॉलम ${columns.custCode.letter} = ${state} का कस्टमर कोड, कॉलम ${columns.taxEnv.letter} = ${INTER_STATE_TAX_ENV}। फ़ाइल सेव करें और दोबारा अपलोड करें।`,
            },
        title: {
          en: `No customer for ${state} in this file (${usedIn.en}).`,
          hi: `इस फ़ाइल में ${state} का कोई कस्टमर नहीं है (${usedIn.hi})।`,
        },
        where: where(similar ? [similar.rowNumber] : [], similar ? columns.state.label : undefined),
      });
      continue;
    }

    if (distinct.length > 1) {
      problems.push({
        fix: {
          en: `Keep only the correct row for ${state} and delete the others (or correct their State in column ${columns.state.letter}). Save and upload again.`,
          hi: `${state} के लिए सिर्फ़ सही लाइन रखें, बाकी हटा दें (या कॉलम ${columns.state.letter} में उनका स्टेट ठीक करें)। फ़ाइल सेव करें और दोबारा अपलोड करें।`,
        },
        title: {
          en: `${state} has ${distinct.length} different customers: ${distinct.map((customer) => customer.custCode || "(empty)").join(", ")} (${usedIn.en}).`,
          hi: `${state} के ${distinct.length} अलग-अलग कस्टमर हैं: ${distinct.map((customer) => customer.custCode || "(खाली)").join(", ")} (${usedIn.hi})।`,
        },
        where: where(distinct.map((customer) => customer.rowNumber)),
      });
      continue;
    }

    const customer = distinct[0];
    const emptyColumn = !customer.custCode
      ? { column: columns.custCode, en: "customer code", hi: "कस्टमर कोड" }
      : !customer.taxEnv
        ? { column: columns.taxEnv, en: "tax code (TAX_ENV)", hi: "टैक्स कोड (TAX_ENV)" }
        : null;

    if (emptyColumn) {
      problems.push({
        fix: {
          en: `Fill in column ${emptyColumn.column.letter} in row ${customer.rowNumber}. Save and upload again.`,
          hi: `पंक्ति ${customer.rowNumber} का कॉलम ${emptyColumn.column.letter} भरें। फ़ाइल सेव करें और दोबारा अपलोड करें।`,
        },
        title: {
          en: `The ${emptyColumn.en} for ${state} is empty (${usedIn.en}).`,
          hi: `${state} का ${emptyColumn.hi} खाली है (${usedIn.hi})।`,
        },
        where: where([customer.rowNumber], emptyColumn.column.label),
      });
      continue;
    }

    lookup.set(key, customer);
  }

  return { lookup, problems };
}
