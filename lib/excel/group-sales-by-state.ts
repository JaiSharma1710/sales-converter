import {
  GST_STATE_MAPPING,
  type GstPrefix,
} from "@/constants/gst-state-mapping";
import type { AmazonSourceRow, UnmappedRow } from "@/types/amazon";
import type { StateSalesGroup } from "@/types/sales";

type GroupSalesByStateResult = {
  groups: StateSalesGroup[];
  unmappedRows: UnmappedRow[];
};

function getUnmappedReason(sellerGstin: string, gstPrefix: string) {
  if (!sellerGstin) {
    return "Seller Gstin is empty.";
  }

  if (!/^\d{2}$/.test(gstPrefix)) {
    return "Seller Gstin must start with two digits.";
  }

  return `GST prefix "${gstPrefix}" is not mapped.`;
}

export function groupSalesByState(
  sourceRows: AmazonSourceRow[],
): GroupSalesByStateResult {
  const groupsBySiteCode = new Map<string, StateSalesGroup>();
  const unmappedRows: UnmappedRow[] = [];

  for (const sourceRow of sourceRows) {
    const route =
      GST_STATE_MAPPING[sourceRow.gstPrefix as GstPrefix] ?? null;

    if (!route) {
      unmappedRows.push({
        reason: getUnmappedReason(
          sourceRow.sellerGstin,
          sourceRow.gstPrefix,
        ),
        rowNumber: sourceRow.rowNumber,
        sellerGstin: sourceRow.sellerGstin,
      });
      continue;
    }

    const existingGroup = groupsBySiteCode.get(route.siteCode);

    if (existingGroup) {
      existingGroup.sourceRows.push(sourceRow);
      continue;
    }

    groupsBySiteCode.set(route.siteCode, {
      gstPrefix: sourceRow.gstPrefix,
      siteCode: route.siteCode,
      sourceRows: [sourceRow],
      state: route.state,
    });
  }

  return {
    groups: Array.from(groupsBySiteCode.values()),
    unmappedRows,
  };
}
