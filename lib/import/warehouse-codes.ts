import { stateKey } from "./states";

/**
 * The usual warehouse (site) code for each Amazon ship-from state, shown
 * before the warehouse file is uploaded so the user knows which file to
 * pick. The uploaded file's own site_code is what goes into the output.
 */
const KNOWN_SITE_CODES: Record<string, string> = {
  BIHAR: "WM0B5",
  DELHI: "WM0C4",
  HARYANA: "WM0A7",
  KARNATAKA: "WM0A5",
  "MADHYA PRADESH": "WM0B8",
  MAHARASHTRA: "WM0B2",
  RAJASTHAN: "WM0B7",
  "UTTAR PRADESH": "WM0B6",
  "WEST BENGAL": "WM0A6",
};

const SITE_CODE_BY_KEY = new Map(
  Object.entries(KNOWN_SITE_CODES).map(([state, code]) => [stateKey(state), code]),
);

export function expectedSiteCode(state: string) {
  return SITE_CODE_BY_KEY.get(stateKey(state)) ?? null;
}
