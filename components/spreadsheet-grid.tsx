type SpreadsheetGridProps = {
  columns: readonly string[];
  rows: readonly object[];
};

function getColumnName(index: number) {
  let columnName = "";
  let nextIndex = index + 1;

  while (nextIndex > 0) {
    const remainder = (nextIndex - 1) % 26;
    columnName = String.fromCharCode(65 + remainder) + columnName;
    nextIndex = Math.floor((nextIndex - 1) / 26);
  }

  return columnName;
}

function formatCellValue(column: string, value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    if (column === "RATE") {
      return value.toFixed(2);
    }

    return Number.isInteger(value) ? String(value) : String(value);
  }

  return String(value);
}

export function SpreadsheetGrid({
  columns,
  rows,
}: SpreadsheetGridProps) {
  return (
    <div className="h-[60vh] overflow-auto bg-white">
      <table className="min-w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 h-8 w-14 border-b border-r border-neutral-300 bg-neutral-100 text-xs font-semibold text-neutral-500" />
            {columns.map((column, index) => (
              <th
                key={column}
                className="sticky top-0 z-20 h-8 min-w-36 border-b border-r border-neutral-300 bg-neutral-100 px-3 text-center text-xs font-semibold text-neutral-500"
              >
                {getColumnName(index)}
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 top-8 z-30 h-9 w-14 border-b border-r border-neutral-300 bg-neutral-100 text-xs font-semibold text-neutral-500">
              1
            </th>
            {columns.map((column) => (
              <th
                key={column}
                className="sticky top-8 z-20 h-9 min-w-36 border-b border-r border-neutral-300 bg-white px-3 text-left text-xs font-semibold text-neutral-950"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th className="sticky left-0 z-10 h-9 w-14 border-b border-r border-neutral-300 bg-neutral-100 text-xs font-semibold text-neutral-500">
                {rowIndex + 2}
              </th>
              {columns.map((column) => (
                <td
                  key={column}
                  className="h-9 min-w-36 max-w-64 border-b border-r border-neutral-200 px-3 text-neutral-800"
                >
                  <div className="truncate">
                    {formatCellValue(
                      column,
                      (row as Record<string, unknown>)[column],
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
