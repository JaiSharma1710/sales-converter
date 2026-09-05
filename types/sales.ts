import type { AmazonSourceRow, UnmappedRow } from "./amazon";

export type StateSalesGroup = {
  gstPrefix: string;
  state: string;
  siteCode: string;
  sourceRows: AmazonSourceRow[];
};

export type SalesAnalysis = {
  groups: StateSalesGroup[];
  refundRowsSkipped: number;
  totalRows: number;
  unmappedRows: UnmappedRow[];
};

export type SalesHeaderRow = {
  SALE_ORDER: number;
  ORDER_TYPE: "RC";
  ORDER_DATE: string;
  CUST_CODE: string;
  ITEM_SER: "WFG04";
  PRICE_LIST: "";
  PRICE_LIST__CLG: "GTMRP";
  SITE_CODE: string;
  MARKET_SEGMENT: string;
  CUST_PORD: string;
  PORD_DATE: string;
};

export type SalesDetailRow = {
  SALE_ORDER: number;
  LINE_NO: 1;
  ITEM_CODE_ORD: string;
  QUANTITY: number;
  RATE: number;
  TAX_CLASS: "REG";
  TAX_CHAP: "GST-5";
  TAX_ENV: string;
  REMARKS: string;
};

export type ConversionError = {
  sourceRowNumber: number;
  saleOrder?: number;
  field: string;
  value: unknown;
  message: string;
};

export type ConvertedStateWorkbook = {
  state: string;
  siteCode: string;
  fileName: string;
  headerRows: SalesHeaderRow[];
  detailRows: SalesDetailRow[];
  errors: ConversionError[];
  sourceRows: AmazonSourceRow[];
};
