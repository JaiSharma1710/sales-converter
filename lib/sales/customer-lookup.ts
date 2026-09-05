import {
  SITE_CUSTOMER_MAPPING,
  type SiteCustomerMapping,
} from "@/constants/site-customer-mapping";
import { normalizeState } from "./normalize-state";

type CustomerLookupResult =
  | {
      status: "found";
      customer: SiteCustomerMapping;
    }
  | {
      status: "missing";
    }
  | {
      status: "ambiguous";
      matches: SiteCustomerMapping[];
    };

function dedupeCustomerMappings(matches: readonly SiteCustomerMapping[]) {
  const uniqueMatches = new Map<string, SiteCustomerMapping>();

  for (const match of matches) {
    uniqueMatches.set(JSON.stringify(match), match);
  }

  return Array.from(uniqueMatches.values());
}

export function lookupCustomerMapping(
  siteCode: string,
  shipToState: unknown,
): CustomerLookupResult {
  const normalizedShipToState = normalizeState(shipToState);
  const siteMappings = SITE_CUSTOMER_MAPPING[siteCode] ?? [];
  const matches = siteMappings.filter(
    (mapping) => normalizeState(mapping.state) === normalizedShipToState,
  );
  const uniqueMatches = dedupeCustomerMappings(matches);

  if (uniqueMatches.length === 0) {
    return { status: "missing" };
  }

  if (uniqueMatches.length > 1) {
    return {
      matches: uniqueMatches,
      status: "ambiguous",
    };
  }

  return {
    customer: uniqueMatches[0],
    status: "found",
  };
}
