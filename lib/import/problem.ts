/** Text shown in both languages, English first. */
export type Bilingual = { en: string; hi: string };

export type ProblemLocation = {
  file: string;
  sheet?: string;
  /** Excel row numbers, as shown on the left edge of Excel. */
  rows?: number[];
  /** Column letter and its heading, e.g. "B (PRODUCT CODE)". */
  column?: string;
};

/**
 * One thing the user has to fix, written for someone who doesn't use
 * spreadsheets often: what is wrong, where it is, and what to do.
 */
export type Problem = {
  title: Bilingual;
  where?: ProblemLocation;
  fix: Bilingual;
};
