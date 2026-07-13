import Papa from 'papaparse';
import type { PayrollEntry } from './payroll';

export type CsvErrorCode = 'invalid_header' | 'missing_cell' | 'extra_column' | 'malformed_csv';

export interface CsvError {
  code: CsvErrorCode;
  row?: number;
}

export interface CsvParseResult {
  entries: PayrollEntry[];
  errors: CsvError[];
}

const expectedHeader = ['recipient', 'amount', 'note'];

export function parsePayrollCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
  const rows = parsed.data;
  const firstError = parsed.errors[0];

  if (firstError) {
    return { entries: [], errors: [{ code: 'malformed_csv', row: (firstError.row ?? 0) + 1 }] };
  }

  if (rows.length === 0 || !expectedHeader.every((column, index) => rows[0][index] === column) || rows[0].length !== 3) {
    return { entries: [], errors: [{ code: 'invalid_header', row: 1 }] };
  }

  const entries: PayrollEntry[] = [];
  const errors: CsvError[] = [];

  rows.slice(1).forEach((row, index) => {
    const sourceRow = index + 2;
    if (row.length > 3) {
      errors.push({ code: 'extra_column', row: sourceRow });
      return;
    }
    if (!row[0]?.trim() || !row[1]?.trim()) {
      errors.push({ code: 'missing_cell', row: sourceRow });
      return;
    }
    entries.push({ recipient: row[0].trim(), amount: row[1].trim(), note: row[2]?.trim() ?? '' });
  });

  return { entries, errors };
}
