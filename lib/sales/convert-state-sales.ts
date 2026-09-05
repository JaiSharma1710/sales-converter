import {
  createSalesOrderFileName,
} from "@/lib/excel/create-sales-workbook";
import type { AmazonSourceRow } from "@/types/amazon";
import type {
  ConversionError,
  ConvertedStateWorkbook,
  SalesDetailRow,
  SalesHeaderRow,
} from "@/types/sales";
import { lookupCustomerMapping } from "./customer-lookup";
import { formatAmazonDate, formatLocalDate } from "./format-date";
import { lookupProductMapping } from "./product-lookup";

const REQUIRED_FIELDS = [
  "Invoice Number",
  "Invoice Date",
  "Sku",
  "Ship To State",
  "Quantity",
  "Invoice Amount",
] as const;

type ConvertStateSalesRowsInput = {
  sourceRows: AmazonSourceRow[];
  siteCode: string;
  state: string;
  orderDate?: string;
};

function readField(sourceRow: AmazonSourceRow, field: string) {
  return sourceRow.values[field];
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalizedValue = String(value ?? "")
    .trim()
    .replace(/,/g, "");

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function roundToTwoDecimals(value: number) {
  return Number(value.toFixed(2));
}

function addError(
  errors: ConversionError[],
  sourceRow: AmazonSourceRow,
  field: string,
  value: unknown,
  message: string,
) {
  errors.push({
    field,
    message,
    sourceRowNumber: sourceRow.rowNumber,
    value,
  });
}

export function convertStateSalesRows({
  orderDate = formatLocalDate(),
  siteCode,
  sourceRows,
  state,
}: ConvertStateSalesRowsInput): ConvertedStateWorkbook {
  const errors: ConversionError[] = [];
  const headerRows: SalesHeaderRow[] = [];
  const detailRows: SalesDetailRow[] = [];

  for (const sourceRow of sourceRows) {
    const rowErrors: ConversionError[] = [];

    for (const field of REQUIRED_FIELDS) {
      const value = readField(sourceRow, field);

      if (normalizeText(value) === "") {
        addError(
          rowErrors,
          sourceRow,
          field,
          value,
          `${field} is required.`,
        );
      }
    }

    const invoiceNumber = normalizeText(
      readField(sourceRow, "Invoice Number"),
    );
    const invoiceDateValue = readField(sourceRow, "Invoice Date");
    const skuValue = readField(sourceRow, "Sku");
    const shipToState = normalizeText(readField(sourceRow, "Ship To State"));
    const quantityValue = readField(sourceRow, "Quantity");
    const invoiceAmountValue = readField(sourceRow, "Invoice Amount");
    const pordDate = formatAmazonDate(invoiceDateValue);
    const quantity = parseNumber(quantityValue);
    const invoiceAmount = parseNumber(invoiceAmountValue);
    const { product, sku } = lookupProductMapping(skuValue);
    const customerLookup = lookupCustomerMapping(siteCode, shipToState);

    if (!pordDate && normalizeText(invoiceDateValue) !== "") {
      addError(
        rowErrors,
        sourceRow,
        "Invoice Date",
        invoiceDateValue,
        "Invoice Date is not a valid date.",
      );
    }

    if (!product && sku) {
      addError(
        rowErrors,
        sourceRow,
        "Sku",
        sku,
        `Unknown SKU: ${sku}`,
      );
    }

    if (customerLookup.status === "missing" && shipToState) {
      addError(
        rowErrors,
        sourceRow,
        "Ship To State",
        shipToState,
        `No customer mapping found for ${siteCode} + ${shipToState}`,
      );
    }

    if (customerLookup.status === "ambiguous") {
      addError(
        rowErrors,
        sourceRow,
        "Ship To State",
        shipToState,
        `Multiple customer mappings found for ${siteCode} + ${shipToState}`,
      );
    }

    if (quantity === null && normalizeText(quantityValue) !== "") {
      addError(
        rowErrors,
        sourceRow,
        "Quantity",
        quantityValue,
        "Quantity is not numeric.",
      );
    }

    if (quantity === 0) {
      addError(
        rowErrors,
        sourceRow,
        "Quantity",
        quantityValue,
        "Quantity cannot be zero.",
      );
    }

    if (invoiceAmount === null && normalizeText(invoiceAmountValue) !== "") {
      addError(
        rowErrors,
        sourceRow,
        "Invoice Amount",
        invoiceAmountValue,
        "Invoice Amount is not numeric.",
      );
    }

    if (
      rowErrors.length > 0 ||
      !product ||
      customerLookup.status !== "found" ||
      !pordDate ||
      quantity === null ||
      quantity === 0 ||
      invoiceAmount === null
    ) {
      errors.push(...rowErrors);
      continue;
    }

    const saleOrder = headerRows.length + 1;
    const rate = roundToTwoDecimals(invoiceAmount / quantity / 1.05);

    headerRows.push({
      CUST_CODE: customerLookup.customer.custCode,
      CUST_PORD: invoiceNumber,
      ITEM_SER: "WFG04",
      MARKET_SEGMENT: product.productDivision,
      ORDER_DATE: orderDate,
      ORDER_TYPE: "RC",
      PORD_DATE: pordDate,
      PRICE_LIST: "",
      PRICE_LIST__CLG: "GTMRP",
      SALE_ORDER: saleOrder,
      SITE_CODE: siteCode,
    });

    detailRows.push({
      ITEM_CODE_ORD: product.productCode,
      LINE_NO: 1,
      QUANTITY: quantity,
      RATE: rate,
      REMARKS: sku,
      SALE_ORDER: saleOrder,
      TAX_CHAP: "GST-5",
      TAX_CLASS: "REG",
      TAX_ENV: customerLookup.customer.taxEnv,
    });
  }

  return {
    detailRows,
    errors,
    fileName: createSalesOrderFileName(state, siteCode),
    headerRows,
    siteCode,
    sourceRows,
    state,
  };
}
