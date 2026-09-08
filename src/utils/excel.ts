import * as XLSX from 'xlsx';

export interface ColumnDef {
  /** Header written into the sheet — also what an imported file is matched on. */
  label: string;
  /** Value used in the template's example row. */
  example: string;
}

export type SheetRow = Record<string, string>;

function autoWidths(columns: ColumnDef[], rows: SheetRow[]) {
  return columns.map((c) => {
    const longest = rows.reduce((max, r) => Math.max(max, (r[c.label] ?? '').length), c.label.length);
    return { wch: Math.min(Math.max(longest + 2, 12), 60) };
  });
}

function write(fileName: string, sheetName: string, columns: ColumnDef[], rows: SheetRow[]) {
  const headers = columns.map((c) => c.label);
  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  sheet['!cols'] = autoWidths(columns, rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(book, fileName);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportSheet(name: string, sheetName: string, columns: ColumnDef[], rows: SheetRow[]) {
  write(`${name}-${stamp()}.xlsx`, sheetName, columns, rows);
}

/** An empty workbook carrying the exact headers, plus one example row to copy. */
export function exportTemplate(name: string, sheetName: string, columns: ColumnDef[]) {
  const example: SheetRow = {};
  columns.forEach((c) => {
    example[c.label] = c.example;
  });
  write(`${name}-import-template.xlsx`, sheetName, columns, [example]);
}

export interface ParsedSheet {
  headers: string[];
  rows: SheetRow[];
}

export async function readSheet(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: 'array' });
  const first = book.SheetNames[0];
  if (!first) return { headers: [], rows: [] };
  const sheet = book.Sheets[first];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  const headers = (XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })[0] ?? []).map(
    (h) => String(h).trim()
  );
  const rows = raw.map((r) => {
    const clean: SheetRow = {};
    Object.entries(r).forEach(([k, v]) => {
      clean[String(k).trim()] = v == null ? '' : String(v).trim();
    });
    return clean;
  });
  return { headers: headers.filter((h) => h !== ''), rows };
}