import type * as XLSX from "xlsx";
import type { AmazonOrder } from "./amazon-report";
import type { Problem } from "./problem";
import {
  cellText,
  columnLabel,
  columnLetter,
  findColumn,
  findHeaderRow,
  rowHasValue,
} from "./sheet";

export type SkuMasterKind = "product" | "division";

type SkuMasterSpec = {
  /** Names used in messages. */
  name: { en: string; hi: string };
  valueHeaders: string[];
  /** What the value is called in fix instructions. */
  valueName: { en: string; hi: string };
};

const SKU_HEADERS = ["PRODUCT NAME", "SKU"];

export const SKU_MASTER_SPECS: Record<SkuMasterKind, SkuMasterSpec> = {
  division: {
    name: { en: "division file", hi: "डिवीज़न फ़ाइल" },
    valueHeaders: ["DIVISION", "PRODUCT DIVISION", "MARKET SEGMENT"],
    valueName: { en: "division (PNT, ANT or UTF)", hi: "डिवीज़न (PNT, ANT या UTF)" },
  },
  product: {
    name: { en: "product code file", hi: "प्रोडक्ट कोड फ़ाइल" },
    valueHeaders: ["PRODUCT CODE", "ITEM CODE"],
    valueName: { en: "product code", hi: "प्रोडक्ट कोड" },
  },
};

type SkuEntry = { sku: string; value: string; rowNumber: number };

export type SkuMaster = {
  kind: SkuMasterKind;
  fileName: string;
  sheetName: string;
  skuColumn: { letter: string; label: string };
  valueColumn: { letter: string; label: string };
  entries: SkuEntry[];
  bySku: Map<string, SkuEntry[]>;
};

export type SkuMasterResult =
  | { ok: true; master: SkuMaster }
  | { ok: false; problems: Problem[] };

function otherKind(kind: SkuMasterKind): SkuMasterKind {
  return kind === "product" ? "division" : "product";
}

function findTable(workbook: XLSX.WorkBook, kind: SkuMasterKind) {
  for (const skuHeader of SKU_HEADERS) {
    for (const valueHeader of SKU_MASTER_SPECS[kind].valueHeaders) {
      const table = findHeaderRow(workbook, [skuHeader, valueHeader]);

      if (table) {
        return {
          ...table,
          skuIndex: findColumn(table.headers, [skuHeader]),
          valueIndex: findColumn(table.headers, [valueHeader]),
        };
      }
    }
  }

  return null;
}

export function readSkuMaster(
  kind: SkuMasterKind,
  workbook: XLSX.WorkBook,
  fileName: string,
): SkuMasterResult {
  const spec = SKU_MASTER_SPECS[kind];
  const table = findTable(workbook, kind);

  if (!table) {
    const other = SKU_MASTER_SPECS[otherKind(kind)];
    const isOther = findTable(workbook, otherKind(kind)) !== null;

    return {
      ok: false,
      problems: [
        isOther
          ? {
              fix: {
                en: `Upload this file in the "${other.name.en}" box instead, and upload the ${spec.name.en} here.`,
                hi: `यह फ़ाइल "${other.name.hi}" वाले बॉक्स में अपलोड करें, और यहाँ ${spec.name.hi} अपलोड करें।`,
              },
              title: {
                en: `This is the ${other.name.en}, not the ${spec.name.en}.`,
                hi: `यह ${other.name.hi} है, ${spec.name.hi} नहीं।`,
              },
              where: { file: fileName },
            }
          : {
              fix: {
                en: `The ${spec.name.en} must have a "PRODUCT NAME" column and a "${spec.valueHeaders[0]}" column in the first row.`,
                hi: `${spec.name.hi} की पहली लाइन में "PRODUCT NAME" और "${spec.valueHeaders[0]}" कॉलम होने चाहिए।`,
              },
              title: {
                en: `This is not the ${spec.name.en}.`,
                hi: `यह ${spec.name.hi} नहीं है।`,
              },
              where: { file: fileName },
            },
      ],
    };
  }

  const { headerRowIndex, rows, sheetName, skuIndex, valueIndex } = table;
  const entries: SkuEntry[] = [];

  rows.slice(headerRowIndex + 1).forEach((row, offset) => {
    const sku = cellText(row[skuIndex]);

    if (!rowHasValue(row) || !sku) {
      return;
    }

    entries.push({
      rowNumber: headerRowIndex + offset + 2,
      sku,
      value: cellText(row[valueIndex]).toUpperCase(),
    });
  });

  const bySku = new Map<string, SkuEntry[]>();

  for (const entry of entries) {
    bySku.set(entry.sku, [...(bySku.get(entry.sku) ?? []), entry]);
  }

  const header = rows[headerRowIndex];

  return {
    master: {
      bySku,
      entries,
      fileName,
      kind,
      sheetName,
      skuColumn: {
        label: columnLabel(skuIndex, header[skuIndex]),
        letter: columnLetter(skuIndex),
      },
      valueColumn: {
        label: columnLabel(valueIndex, header[valueIndex]),
        letter: columnLetter(valueIndex),
      },
    },
    ok: true,
  };
}

/** Loose form for "did you mean" hints: case, punctuation and FBA ignored. */
function looseSku(sku: string) {
  return sku
    .toLowerCase()
    .replace(/fba/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findSimilar(master: SkuMaster, sku: string) {
  const target = looseSku(sku);

  return master.entries.find(
    (entry) => entry.value && looseSku(entry.sku) === target,
  );
}

/** Value for each SKU, once every SKU in the orders checks out. */
export type SkuLookup = Map<string, string>;

export function checkSkuMaster(
  master: SkuMaster,
  orders: AmazonOrder[],
): { problems: Problem[]; lookup: SkuLookup } {
  const spec = SKU_MASTER_SPECS[master.kind];
  const ordersBySku = new Map<string, number[]>();

  for (const order of orders) {
    ordersBySku.set(order.sku, [
      ...(ordersBySku.get(order.sku) ?? []),
      order.rowNumber,
    ]);
  }

  const problems: Problem[] = [];
  const lookup: SkuLookup = new Map();
  const where = (rows: number[], column?: string) => ({
    column,
    file: master.fileName,
    rows,
    sheet: master.sheetName,
  });

  for (const [sku, orderRows] of ordersBySku) {
    const count = orderRows.length;
    const usedIn = {
      en: `used in ${count} Amazon ${count === 1 ? "order" : "orders"}`,
      hi: `Amazon के ${count} ऑर्डर में है`,
    };
    const entries = master.bySku.get(sku) ?? [];
    const values = Array.from(new Set(entries.map((entry) => entry.value)));

    if (entries.length === 0) {
      const similar = findSimilar(master, sku);
      const hint = similar
        ? {
            en: ` Row ${similar.rowNumber} has a similar name, "${similar.sku}" (${similar.value}). If it is the same product, use ${similar.value}.`,
            hi: ` पंक्ति ${similar.rowNumber} में मिलता-जुलता नाम "${similar.sku}" (${similar.value}) है। अगर यह वही प्रोडक्ट है, तो ${similar.value} ही लिखें।`,
          }
        : { en: "", hi: "" };

      problems.push({
        fix: {
          en: `Open "${master.fileName}". Below the last row, add a new row: in column ${master.skuColumn.letter} type ${sku} exactly as shown, and in column ${master.valueColumn.letter} type its ${spec.valueName.en}.${hint.en} Save the file and upload it again.`,
          hi: `"${master.fileName}" खोलें। आख़िरी लाइन के नीचे एक नई लाइन जोड़ें: कॉलम ${master.skuColumn.letter} में ठीक ${sku} लिखें, और कॉलम ${master.valueColumn.letter} में उसका ${spec.valueName.hi} लिखें।${hint.hi} फ़ाइल सेव करें और दोबारा अपलोड करें।`,
        },
        title: {
          en: `Product "${sku}" is not in the ${spec.name.en} (${usedIn.en}).`,
          hi: `प्रोडक्ट "${sku}" ${spec.name.hi} में नहीं है (${usedIn.hi})।`,
        },
        where: { file: master.fileName, sheet: master.sheetName },
      });
      continue;
    }

    if (values.length > 1) {
      problems.push({
        fix: {
          en: `Keep only the row with the correct ${spec.valueName.en} and delete the others. Save and upload again.`,
          hi: `सिर्फ़ सही ${spec.valueName.hi} वाली लाइन रखें, बाकी लाइनें हटा दें। फ़ाइल सेव करें और दोबारा अपलोड करें।`,
        },
        title: {
          en: `Product "${sku}" is listed more than once with different values: ${values.join(", ")} (${usedIn.en}).`,
          hi: `प्रोडक्ट "${sku}" एक से ज़्यादा बार अलग-अलग वैल्यू के साथ लिखा है: ${values.join(", ")} (${usedIn.hi})।`,
        },
        where: where(entries.map((entry) => entry.rowNumber)),
      });
      continue;
    }

    if (!values[0]) {
      problems.push({
        fix: {
          en: `Type the ${spec.valueName.en} in column ${master.valueColumn.letter} of that row. Save and upload again.`,
          hi: `उस लाइन के कॉलम ${master.valueColumn.letter} में ${spec.valueName.hi} लिखें। फ़ाइल सेव करें और दोबारा अपलोड करें।`,
        },
        title: {
          en: `Product "${sku}" has no ${spec.valueName.en} (${usedIn.en}).`,
          hi: `प्रोडक्ट "${sku}" का ${spec.valueName.hi} खाली है (${usedIn.hi})।`,
        },
        where: where(
          entries.map((entry) => entry.rowNumber),
          master.valueColumn.label,
        ),
      });
      continue;
    }

    lookup.set(sku, values[0]);
  }

  return { lookup, problems };
}
