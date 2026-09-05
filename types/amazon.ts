export type AmazonSourceRow = {
  rowNumber: number;
  sellerGstin: string;
  gstPrefix: string;
  transactionType: string | null;
  values: Record<string, unknown>;
};

export type UnmappedRow = {
  rowNumber: number;
  sellerGstin: string;
  reason: string;
};
