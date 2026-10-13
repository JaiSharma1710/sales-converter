import { createSalesOrderFileName } from "@/lib/excel/create-sales-workbook";
import { formatLocalDate } from "@/lib/sales/format-date";
import type { SalesDetailRow, SalesHeaderRow } from "@/types/sales";
import type { WarehouseGroup } from "./amazon-report";
import type { SkuLookup } from "./sku-master";
import { stateKey } from "./states";
import type { CustomerLookup } from "./warehouse-file";

export type SalesOrder = {
  state: string;
  siteCode: string;
  fileName: string;
  headerRows: SalesHeaderRow[];
  detailRows: SalesDetailRow[];
};

// Prices on Amazon include 5% GST; the ERP wants the rate before tax.
const GST_DIVISOR = 1.05;

function roundToTwoDecimals(value: number) {
  return Number(value.toFixed(2));
}

/**
 * Builds the sales order sheets for one warehouse. Every lookup has been
 * checked beforehand, so a missing value here is a bug, not bad data.
 */
export function buildSalesOrder(
  group: WarehouseGroup,
  siteCode: string,
  products: SkuLookup,
  divisions: SkuLookup,
  customers: CustomerLookup,
  orderDate = formatLocalDate(),
): SalesOrder {
  const headerRows: SalesHeaderRow[] = [];
  const detailRows: SalesDetailRow[] = [];

  for (const order of group.orders) {
    const productCode = products.get(order.sku);
    const division = divisions.get(order.sku);
    const customer = customers.get(stateKey(order.shipToState));

    if (!productCode || !division || !customer) {
      throw new Error(`Amazon row ${order.rowNumber} was not validated.`);
    }

    const saleOrder = headerRows.length + 1;

    headerRows.push({
      CUST_CODE: customer.custCode,
      CUST_PORD: order.invoiceNumber,
      ITEM_SER: "WFG04",
      MARKET_SEGMENT: division,
      ORDER_DATE: orderDate,
      ORDER_TYPE: "RC",
      PORD_DATE: order.invoiceDate,
      PRICE_LIST: "",
      PRICE_LIST__CLG: "GTMRP",
      SALE_ORDER: saleOrder,
      SITE_CODE: siteCode,
    });

    detailRows.push({
      ITEM_CODE_ORD: productCode,
      LINE_NO: 1,
      QUANTITY: order.quantity,
      RATE: roundToTwoDecimals(
        order.invoiceAmount / order.quantity / GST_DIVISOR,
      ),
      REMARKS: order.sku,
      SALE_ORDER: saleOrder,
      TAX_CHAP: "GST-5",
      TAX_CLASS: "REG",
      TAX_ENV: customer.taxEnv,
    });
  }

  return {
    detailRows,
    fileName: createSalesOrderFileName(group.state, siteCode),
    headerRows,
    siteCode,
    state: group.state,
  };
}
