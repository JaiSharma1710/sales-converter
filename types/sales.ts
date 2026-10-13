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
