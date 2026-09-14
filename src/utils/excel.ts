import * as XLSX from 'xlsx';

export interface ColumnDef {
  /** Header written into the sheet — also what an imported file is matched on. */
  label: string;
  /** Value used in the template's example row. */
  example: string;
}

export type SheetRow = Record<string, string>;

export interface WorkbookSheet {
  name: string;
  columns: ColumnDef[];
  rows: SheetRow[];
}

function autoWidths(columns: ColumnDef[], rows: SheetRow[]) {
  return columns.map((c) => {
    const longest = rows.reduce((max, r) => Math.max(max, (r[c.label] ?? '').length), c.label.length);
    return { wch: Math.min(Math.max(longest + 2, 12), 60) };
  });
}

function sheetFromRows(columns: ColumnDef[], rows: SheetRow[]) {
  const headers = columns.map((c) => c.label);
  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  sheet['!cols'] = autoWidths(columns, rows);
  return sheet;
}

function write(fileName: string, sheetName: string, columns: ColumnDef[], rows: SheetRow[]) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheetFromRows(columns, rows), sheetName.slice(0, 31));
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

/** Multi-sheet workbook — one feuille per entry. */
export function exportWorkbook(fileStem: string, sheets: WorkbookSheet[]) {
  const book = XLSX.utils.book_new();
  sheets.forEach((s) => {
    XLSX.utils.book_append_sheet(book, sheetFromRows(s.columns, s.rows), s.name.slice(0, 31));
  });
  XLSX.writeFile(book, `${fileStem}-${stamp()}.xlsx`);
}

/** Multi-sheet template with one example row on each feuille. */
export function exportWorkbookTemplate(fileStem: string, sheets: Omit<WorkbookSheet, 'rows'>[]) {
  const book = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const example: SheetRow = {};
    s.columns.forEach((c) => {
      example[c.label] = c.example;
    });
    XLSX.utils.book_append_sheet(book, sheetFromRows(s.columns, [example]), s.name.slice(0, 31));
  });
  XLSX.writeFile(book, `${fileStem}-import-template.xlsx`);
}

export interface ParsedSheet {
  headers: string[];
  rows: SheetRow[];
}

function parseWorksheet(sheet: XLSX.WorkSheet): ParsedSheet {
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

export async function readSheet(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: 'array' });
  const first = book.SheetNames[0];
  if (!first) return { headers: [], rows: [] };
  return parseWorksheet(book.Sheets[first]);
}

/** Read every feuille in the workbook, keyed by sheet name. */
export async function readWorkbook(file: File): Promise<Record<string, ParsedSheet>> {
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: 'array' });
  const out: Record<string, ParsedSheet> = {};
  book.SheetNames.forEach((name) => {
    out[name] = parseWorksheet(book.Sheets[name]);
  });
  return out;
}
