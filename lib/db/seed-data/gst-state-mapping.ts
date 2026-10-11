export const GST_STATE_MAPPING = {
  "06": {
    siteCode: "WM0A7",
    state: "HARYANA",
  },
  "07": {
    siteCode: "WM0C4",
    state: "DELHI",
  },
  "09": {
    siteCode: "WM0B6",
    state: "UTTAR PRADESH",
  },
  "10": {
    siteCode: "WM0B5",
    state: "BIHAR",
  },
  "19": {
    siteCode: "WM0A6",
    state: "WEST BENGAL",
  },
  "27": {
    siteCode: "WM0B2",
    state: "MAHARASTRA",
  },
  "29": {
    siteCode: "WM0A5",
    state: "KARNATAKA",
  },
} as const;

export type GstPrefix = keyof typeof GST_STATE_MAPPING;
