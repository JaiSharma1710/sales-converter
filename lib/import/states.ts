import { normalizeState } from "@/lib/sales/normalize-state";

// Spellings seen in the files that mean the same state, keyed by the
// compact form produced by stateKey.
const STATE_ALIASES: Record<string, string> = {
  LAKSHADWEEPISLAND: "LAKSHADWEEP",
  LAKSHADWEEPISLANDS: "LAKSHADWEEP",
  NCTOFDELHI: "DELHI",
  ORISSA: "ODISHA",
  PONDICHERRY: "PUDUCHERRY",
};

/**
 * A comparison key for state names, so "Jammu & Kashmir",
 * "JAMMU AND KASHMIR" and "jammu  & kashmir" all match.
 */
export function stateKey(state: unknown) {
  const compact = normalizeState(state)
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "");

  return STATE_ALIASES[compact] ?? compact;
}
