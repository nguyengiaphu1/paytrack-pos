import { PAYMENT_ACCOUNTS } from '@/lib/ledger';
import { getTodayVN, stripVietnamese } from '@/lib/vietnamese';
import type { PaymentAccount } from '@/types/database';
import type { CsvUnitMode, DetectedColumns } from './types';

const CANONICAL_ACCOUNT_BY_NORM = new Map<string, PaymentAccount>(
  PAYMENT_ACCOUNTS.map((acc) => [stripVietnamese(acc), acc])
);

export const SUMMARY_ITEM_LABELS = new Set(['tong', 'tong cong', 'total', 'sum', 'cong']);

/**
 * RFC-4180 compliant CSV matrix parser supporting UTF-8 BOM, CRLF/LF, and quoted fields.
 */
export function parseCsvMatrix(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      if (text[i + 1] === '\n') i++;
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function detectColumns(headerRow: string[]): DetectedColumns | null {
  const cols: DetectedColumns = {
    date: -1,
    item: -1,
    out: -1,
    in: -1,
    debt: -1,
    customer: -1,
    receiver: -1,
    status: -1,
  };

  headerRow.forEach((rawCell, idx) => {
    const h = stripVietnamese(rawCell);
    if (!h) return;

    if (cols.date === -1 && (h === 'date' || h === 'ngay' || h === 'ngay mua' || h === 'ngay ban')) {
      cols.date = idx;
    } else if (
      cols.item === -1 &&
      (h === 'item' ||
        h === 'mon' ||
        h === 'san pham' ||
        h === 'mat hang' ||
        h === 'ten hang' ||
        h === 'ten mon' ||
        h === 'hang')
    ) {
      cols.item = idx;
    } else if (
      cols.out === -1 &&
      (h === 'out' || h === 'gia von' || h === 'von' || h === 'chi' || h === 'gia nhap')
    ) {
      cols.out = idx;
    } else if (
      cols.in === -1 &&
      (h === 'in' || h === 'da thu' || h === 'da tra' || h === 'thu' || h === 'tien vao')
    ) {
      cols.in = idx;
    } else if (
      cols.debt === -1 &&
      (h === 'ton' || h === 'con no' || h === 'no' || h === 'chua thu' || h === 'chua tra')
    ) {
      cols.debt = idx;
    } else if (
      cols.customer === -1 &&
      (h === 'customer' ||
        h === 'khach' ||
        h === 'khach hang' ||
        h === 'ten khach' ||
        h === 'nguoi mua')
    ) {
      cols.customer = idx;
    } else if (
      cols.receiver === -1 &&
      (h === 'nguoi nhan ck' ||
        h === 'nguoi nhan' ||
        h === 'tai khoan' ||
        h === 'tk' ||
        h === 'tk nhan' ||
        h === 'payment account')
    ) {
      cols.receiver = idx;
    } else if (
      cols.status === -1 &&
      (h === 'status' || h === 'trang thai' || h === 'ghi chu' || h === 'note')
    ) {
      cols.status = idx;
    }
  });

  // ThuChi.csv places optional status ("Done") in the unnamed column immediately after Người nhận CK
  if (cols.status === -1 && cols.receiver !== -1 && cols.receiver + 1 < headerRow.length) {
    if (!headerRow[cols.receiver + 1]?.trim()) {
      cols.status = cols.receiver + 1;
    }
  }

  if (cols.item === -1 || (cols.in === -1 && cols.debt === -1)) {
    return null;
  }

  return cols;
}

export function resolveCsvPaymentAccount(raw: string | null | undefined): {
  paymentAccount: PaymentAccount | null;
  paymentAccountNote: string | null;
} {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { paymentAccount: null, paymentAccountNote: null };
  }

  const norm = stripVietnamese(trimmed);
  const canonical = CANONICAL_ACCOUNT_BY_NORM.get(norm);
  if (canonical) {
    return {
      paymentAccount: canonical,
      paymentAccountNote: null,
    };
  }

  return {
    paymentAccount: 'Khác',
    paymentAccountNote: trimmed,
  };
}

/**
 * Parses a money cell into exact non-negative integer VND.
 * Returns null for empty cells and NaN for invalid non-numeric values.
 */
export function parseCsvMoneyCell(raw: string | undefined, unitMode: CsvUnitMode): number | null {
  const cleaned = (raw ?? '')
    .trim()
    .replace(/[đĐ]/g, '')
    .replace(/\b(vnd|vnđ)\b/gi, '')
    .replace(/\s+/g, '');

  if (!cleaned) return null;
  if (cleaned.startsWith('-')) return Number.NaN;

  // Multi-dot Vietnamese full-VND thousands (e.g. "1.250.000")
  if (/^\d{1,3}(\.\d{3}){2,}$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ''));
  }

  // Multi-comma full-VND thousands (e.g. "1,250,000")
  if (/^\d{1,3}(,\d{3}){2,}$/.test(cleaned)) {
    return Number(cleaned.replace(/,/g, ''));
  }

  // Single dot-grouped 3-digit thousand like "460.000" (always full VND when >= 100.000)
  if (/^\d{2,3}\.\d{3}$/.test(cleaned)) {
    const asFull = Number(cleaned.replace(/\./g, ''));
    if (unitMode === 'vnd' || asFull >= 100_000) {
      return asFull;
    }
  }

  if (unitMode === 'vnd') {
    const normalized = cleaned.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : Number.NaN;
  }

  // Default 'k' mode (thousands of VND, e.g., 355 -> 355000, 355.5 -> 355500, 1,250 -> 1250000)
  let normalized = cleaned;
  if (/^\d{1,3},\d{3}$/.test(normalized)) {
    normalized = normalized.replace(',', '');
  } else {
    normalized = normalized.replace(',', '.');
  }

  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return Number.NaN;
  return Math.round(num * 1000);
}

function formatValidatedDate(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseCsvDateCell(raw: string | undefined, fallbackYear: number): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;

  // ISO YYYY-MM-DD
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    return formatValidatedDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  // Vietnamese DD/MM or DD/MM/YYYY (or DD-MM / DD-MM-YYYY)
  const dmMatch = /^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?$/.exec(trimmed);
  if (dmMatch) {
    const day = Number(dmMatch[1]);
    const month = Number(dmMatch[2]);
    let year = fallbackYear;
    if (dmMatch[3]) {
      const parsedYear = Number(dmMatch[3]);
      year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
    }
    return formatValidatedDate(year, month, day);
  }

  return null;
}

export function inferDefaultCsvYear(csvText: string, todayVN: string = getTodayVN()): number {
  const currentYear = Number(todayVN.slice(0, 4)) || 2026;
  const currentMonth = Number(todayVN.slice(5, 7)) || 1;

  const matrix = parseCsvMatrix(csvText);
  if (matrix.length < 2) return currentYear;
  const cols = detectColumns(matrix[0]);
  if (!cols || cols.date === -1) return currentYear;

  let firstExplicitYear: number | null = null;
  let minMonth = 13;

  for (let i = 1; i < matrix.length; i++) {
    const raw = (matrix[i][cols.date] ?? '').trim();
    if (!raw) continue;

    const fullYearMatch = /^(\d{4})[-/]/.exec(raw) ?? /[-/](\d{4})$/.exec(raw);
    if (fullYearMatch) {
      firstExplicitYear = Number(fullYearMatch[1]);
      break;
    }

    const dmMatch = /^(\d{1,2})[-/](\d{1,2})$/.exec(raw);
    if (dmMatch) {
      const m = Number(dmMatch[2]);
      if (m >= 1 && m <= 12 && m < minMonth) {
        minMonth = m;
      }
    }
  }

  if (firstExplicitYear && firstExplicitYear >= 2000 && firstExplicitYear <= 2100) {
    return firstExplicitYear;
  }

  // If uploading last year's late-year ledger in Jan/Feb (e.g. Nov data uploaded in Jan)
  if (minMonth <= 12 && minMonth > currentMonth + 1) {
    return currentYear - 1;
  }

  return currentYear;
}

export function detectLikelyCsvUnitMode(csvText: string): CsvUnitMode {
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length < 2) return 'k';
  const cols = detectColumns(matrix[0]);
  if (!cols) return 'k';

  let sampleCount = 0;
  let fullVndLikeCount = 0;

  for (let i = 1; i < matrix.length && sampleCount < 25; i++) {
    const row = matrix[i];
    const item = (row[cols.item] ?? '').trim();
    if (!item) continue;

    for (const idx of [cols.in, cols.debt, cols.out]) {
      if (idx === -1) continue;
      const cell = (row[idx] ?? '').trim().replace(/[đĐ\s]/g, '');
      if (!cell) continue;
      const digitsOnly = cell.replace(/[.,]/g, '');
      const n = Number(digitsOnly);
      if (Number.isFinite(n) && n > 0) {
        sampleCount++;
        if (n >= 50_000) fullVndLikeCount++;
      }
    }
  }

  if (sampleCount > 0 && fullVndLikeCount / sampleCount >= 0.7) {
    return 'vnd';
  }
  return 'k';
}
