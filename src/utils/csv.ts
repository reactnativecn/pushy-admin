export type CsvValue = string | number | null | undefined;

/** RFC 4180-style serialization: quote fields containing separators/quotes/newlines. */
export function toCsv(rows: CsvValue[][]): string {
  return rows
    .map((row) =>
      row
        .map((field) => {
          const text =
            field === null || field === undefined ? '' : String(field);
          return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    )
    .join('\r\n');
}

/** Trigger a browser download; the BOM keeps Excel from garbling CJK text. */
export function downloadCsv(fileName: string, rows: CsvValue[][]) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
