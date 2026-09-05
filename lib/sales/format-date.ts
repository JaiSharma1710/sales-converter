import * as XLSX from "xlsx";

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateParts(day: number, month: number, year: number) {
  return `${padDatePart(day)}/${padDatePart(month)}/${year}`;
}

function normalizeYear(year: number) {
  return year < 100 ? 2000 + year : year;
}

function parseSeparatedDate(value: string) {
  const match = value.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);

  if (!match) {
    return null;
  }

  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = Number(match[3]);

  if (match[1].length === 4) {
    return {
      day: third,
      month: second,
      year: first,
    };
  }

  if (first > 12) {
    return {
      day: first,
      month: second,
      year: normalizeYear(third),
    };
  }

  if (second > 12) {
    return {
      day: second,
      month: first,
      year: normalizeYear(third),
    };
  }

  return {
    day: first,
    month: second,
    year: normalizeYear(third),
  };
}

function isValidDateParts(day: number, month: number, year: number) {
  if (!Number.isInteger(day) || !Number.isInteger(month)) {
    return false;
  }

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatLocalDate(date = new Date()) {
  return formatDateParts(
    date.getDate(),
    date.getMonth() + 1,
    date.getFullYear(),
  );
}

export function formatAmazonDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatLocalDate(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsedDate = XLSX.SSF.parse_date_code(value);

    if (parsedDate) {
      return formatDateParts(parsedDate.d, parsedDate.m, parsedDate.y);
    }
  }

  const stringValue = String(value ?? "").trim();

  if (!stringValue) {
    return null;
  }

  const separatedDate = parseSeparatedDate(stringValue);

  if (separatedDate) {
    const { day, month, year } = separatedDate;

    return isValidDateParts(day, month, year)
      ? formatDateParts(day, month, year)
      : null;
  }

  const timestamp = Date.parse(stringValue);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return formatLocalDate(new Date(timestamp));
}
