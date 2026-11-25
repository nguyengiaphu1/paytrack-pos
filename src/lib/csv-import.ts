import { PAYMENT_ACCOUNTS, toVnDateInput } from '@/lib/ledger';
import { getTodayVN, stripVietnamese } from '@/lib/vietnamese';
import type { Customer, Order, PaymentAccount, PaymentMethod, PaymentStatus, Product } from '@/types/database';

export type CsvUnitMode = 'k' | 'vnd';

export interface CsvImportOptions {
  year: number;
  unitMode: CsvUnitMode;
  groupSameDayOrders: boolean;
  skipDuplicates: boolean;
}

export interface ParsedCsvRow {
  lineNumber: number;
  vnDate: string;
  itemName: string;
  normalizedItemName: string;
  costVnd: number;
  paidVnd: number;
  debtVnd: number;
  sellingPriceVnd: number;
  customerName: string | null;
  normalizedCustomerName: string | null;
  paymentAccount: PaymentAccount | null;
  paymentAccountNote: string | null;
  statusText: string | null;
}

export interface SkippedCsvRow {
  lineNumber: number;
  rawSummary: string;
  reason: string;
  kind: 'incomplete' | 'invalid' | 'summary';
}

export interface PlannedImportItem {
  productName: string;
  normalizedProductName: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
}

export interface PlannedImportOrder {
  fingerprint: string;
  vnDate: string;
  purchasedAtIso: string;
  customerName: string | null;
  normalizedCustomerName: string | null;
  paymentStatus: Exclude<PaymentStatus, 'cancelled'>;
  paymentMethod: PaymentMethod;
  paymentAccount: PaymentAccount | null;
  paymentAccountNote: string | null;
  totalAmount: number;
  totalCost: number;
  paidAmount: number;
  remainingAmount: number;
  paidAtIso: string | null;
  note: string;
  items: PlannedImportItem[];
  sourceLines: number[];
  isDuplicate: boolean;
}

export interface PlannedImportCustomer {
  name: string;
  normalizedName: string;
  isNew: boolean;
  orderCount: number;
  debtToAdd: number;
}

export interface PlannedImportProduct {
  name: string;
  normalizedName: string;
  unit: string;
  price: number;
  costPrice: number | null;
  isNew: boolean;
}

export interface CsvImportTotals {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalPaid: number;
  totalDebt: number;
}

export interface CsvImportPreview {
  ok: boolean;
  error: string | null;
  validRowCount: number;
  plannedOrders: PlannedImportOrder[];
  newOrders: PlannedImportOrder[];
  duplicateOrderCount: number;
  plannedCustomers: PlannedImportCustomer[];
  newCustomerCount: number;
  matchedCustomerCount: number;
  plannedProducts: PlannedImportProduct[];
  newProductCount: number;
  matchedProductCount: number;
  skippedRows: SkippedCsvRow[];
  notices: string[];
  ignoredSummaryRowCount: number;
  totals: CsvImportTotals;
  newOrdersTotals: CsvImportTotals;
  inferredYear: number;
  detectedUnitMode: CsvUnitMode;
}

interface DetectedColumns {
  date: number;
  item: number;
  out: number;
  in: number;
  debt: number;
  customer: number;
  receiver: number;
  status: number;
}

const CANONICAL_ACCOUNT_BY_NORM = new Map<string, PaymentAccount>(
  PAYMENT_ACCOUNTS.map((acc) => [stripVietnamese(acc), acc])
);

const SUMMARY_ITEM_LABELS = new Set(['tong', 'tong cong', 'total', 'sum', 'cong']);

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

function detectColumns(headerRow: string[]): DetectedColumns | null {
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

  // Reject negative signs
  if (cleaned.startsWith('-')) return Number.NaN;

  // Multi-dot Vietnamese full-VND thousands (e.g. "1.250.000") or dot-grouped >= 100.000
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

export function parseCsvDateCell(raw: string | undefined, fallbackYear: number): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;

  // ISO YYYY-MM-DD
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return formatValidatedDate(year, month, day);
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

export function buildOrderFingerprint(params: {
  vnDate: string;
  normalizedCustomerName: string | null;
  totalAmount: number;
  paidAmount: number;
  items: Array<{ productName: string; unitPrice: number; costPrice?: number | null }>;
}): string {
  const custKey = params.normalizedCustomerName || 'khach-le';
  const itemSigs = params.items
    .map((item) => `${stripVietnamese(item.productName)}:${Math.round(item.unitPrice)}:${Math.round(item.costPrice ?? 0)}`)
    .sort()
    .join(',');
  return `${params.vnDate}|${custKey}|${Math.round(params.totalAmount)}|${Math.round(params.paidAmount)}|${itemSigs}`;
}

export function buildExistingOrderFingerprint(order: Pick<
  Order,
  'purchased_at' | 'created_at' | 'customer_name_snapshot' | 'total_amount' | 'paid_amount' | 'order_items'
>): string {
  const vnDate = toVnDateInput(order.purchased_at || order.created_at);
  const custNorm = stripVietnamese(order.customer_name_snapshot || '');
  const normalizedCustomerName =
    !custNorm || custNorm === 'khach le' ? null : custNorm;

  const items = (order.order_items ?? []).map((item) => ({
    productName: item.product_name,
    unitPrice: Number(item.unit_price),
    costPrice: item.cost_price !== null && item.cost_price !== undefined ? Number(item.cost_price) : 0,
  }));

  return buildOrderFingerprint({
    vnDate,
    normalizedCustomerName,
    totalAmount: Number(order.total_amount),
    paidAmount: Number(order.paid_amount),
    items,
  });
}

function sumOrderTotals(orders: PlannedImportOrder[]): CsvImportTotals {
  let totalRevenue = 0;
  let totalCost = 0;
  let totalPaid = 0;
  let totalDebt = 0;

  for (const order of orders) {
    totalRevenue += order.totalAmount;
    totalCost += order.totalCost;
    totalPaid += order.paidAmount;
    totalDebt += order.remainingAmount;
  }

  return {
    totalRevenue,
    totalCost,
    totalProfit: totalRevenue - totalCost,
    totalPaid,
    totalDebt,
  };
}

export function buildCsvImportPreview(params: {
  csvText: string;
  options: CsvImportOptions;
  existingCustomers?: Array<Pick<Customer, 'name'>>;
  existingProducts?: Array<Pick<Product, 'name'>>;
  existingOrders?: Array<
    Pick<
      Order,
      | 'payment_status'
      | 'purchased_at'
      | 'created_at'
      | 'customer_name_snapshot'
      | 'total_amount'
      | 'paid_amount'
      | 'order_items'
    >
  >;
  todayVN?: string;
}): CsvImportPreview {
  const todayVN = params.todayVN ?? getTodayVN();
  const inferredYear = inferDefaultCsvYear(params.csvText, todayVN);
  const detectedUnitMode = detectLikelyCsvUnitMode(params.csvText);
  const emptyTotals: CsvImportTotals = {
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalPaid: 0,
    totalDebt: 0,
  };

  const makeError = (error: string): CsvImportPreview => ({
    ok: false,
    error,
    validRowCount: 0,
    plannedOrders: [],
    newOrders: [],
    duplicateOrderCount: 0,
    plannedCustomers: [],
    newCustomerCount: 0,
    matchedCustomerCount: 0,
    plannedProducts: [],
    newProductCount: 0,
    matchedProductCount: 0,
    skippedRows: [],
    notices: [],
    ignoredSummaryRowCount: 0,
    totals: emptyTotals,
    newOrdersTotals: emptyTotals,
    inferredYear,
    detectedUnitMode,
  });

  if (!params.csvText.trim()) {
    return makeError('File CSV trống, vui lòng chọn file có dữ liệu.');
  }

  const matrix = parseCsvMatrix(params.csvText);
  if (matrix.length < 2) {
    return makeError('File CSV không có dòng dữ liệu nào.');
  }

  const cols = detectColumns(matrix[0]);
  if (!cols) {
    return makeError(
      'Không nhận diện được cột của file CSV. File cần có cột Item (món hàng) và cột In hoặc Tồn (giá bán).'
    );
  }

  const parsedRows: ParsedCsvRow[] = [];
  const skippedRows: SkippedCsvRow[] = [];
  const fallbackDateLines: number[] = [];
  let ignoredSummaryRowCount = 0;
  let carriedDate: string | null = null;

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    const lineNumber = i + 1;

    if (row.every((c) => !c.trim())) {
      continue;
    }

    const rawDate = cols.date >= 0 ? (row[cols.date] ?? '').trim() : '';
    const rawItem = cols.item >= 0 ? (row[cols.item] ?? '').trim() : '';
    const rawOut = cols.out >= 0 ? (row[cols.out] ?? '').trim() : '';
    const rawIn = cols.in >= 0 ? (row[cols.in] ?? '').trim() : '';
    const rawDebt = cols.debt >= 0 ? (row[cols.debt] ?? '').trim() : '';
    const rawCustomer = cols.customer >= 0 ? (row[cols.customer] ?? '').trim() : '';
    const rawReceiver = cols.receiver >= 0 ? (row[cols.receiver] ?? '').trim() : '';
    const rawStatus = cols.status >= 0 ? (row[cols.status] ?? '').trim() : '';

    // Detect bottom summary / totals row (no Date, no Item, numeric totals)
    const itemNorm = stripVietnamese(rawItem);
    const hasNumericTotals = Boolean(rawOut || rawIn || rawDebt);
    if ((!rawDate && !rawItem && hasNumericTotals) || SUMMARY_ITEM_LABELS.has(itemNorm)) {
      ignoredSummaryRowCount++;
      continue;
    }

    // Carry forward date from previous non-empty date row
    let rowDate: string | null = null;
    let usedFallbackToday = false;
    if (rawDate) {
      rowDate = parseCsvDateCell(rawDate, params.options.year);
      if (!rowDate) {
        skippedRows.push({
          lineNumber,
          rawSummary: rawItem || rawDate,
          reason: `Ngày "${rawDate}" không hợp lệ`,
          kind: 'invalid',
        });
        continue;
      }
      carriedDate = rowDate;
    } else if (carriedDate) {
      rowDate = carriedDate;
    } else {
      rowDate = todayVN;
      usedFallbackToday = true;
    }

    if (!rawItem) {
      skippedRows.push({
        lineNumber,
        rawSummary: rawCustomer || `Dòng ${lineNumber}`,
        reason: 'Thiếu tên món hàng',
        kind: 'incomplete',
      });
      continue;
    }

    const outVal = parseCsvMoneyCell(rawOut, params.options.unitMode);
    const inVal = parseCsvMoneyCell(rawIn, params.options.unitMode);
    const debtVal = parseCsvMoneyCell(rawDebt, params.options.unitMode);

    if (Number.isNaN(outVal) || Number.isNaN(inVal) || Number.isNaN(debtVal)) {
      skippedRows.push({
        lineNumber,
        rawSummary: rawItem,
        reason: 'Giá trị tiền không hợp lệ (chỉ nhập số không âm)',
        kind: 'invalid',
      });
      continue;
    }

    const costVnd = outVal ?? 0;
    const paidVnd = inVal ?? 0;
    const debtVnd = debtVal ?? 0;
    const sellingPriceVnd = paidVnd + debtVnd;

    if (sellingPriceVnd <= 0) {
      skippedRows.push({
        lineNumber,
        rawSummary: rawItem,
        reason: rawCustomer ? 'Thiếu giá bán (In / Tồn)' : 'Thiếu giá bán và tên khách hàng',
        kind: 'incomplete',
      });
      continue;
    }

    const customerName = rawCustomer || null;
    if (debtVnd > 0 && !customerName) {
      skippedRows.push({
        lineNumber,
        rawSummary: rawItem,
        reason: 'Đơn còn nợ (Tồn) bắt buộc phải có tên khách hàng',
        kind: 'invalid',
      });
      continue;
    }

    if (usedFallbackToday) {
      fallbackDateLines.push(lineNumber);
    }

    const { paymentAccount, paymentAccountNote } = resolveCsvPaymentAccount(rawReceiver);

    parsedRows.push({
      lineNumber,
      vnDate: rowDate,
      itemName: rawItem,
      normalizedItemName: itemNorm,
      costVnd,
      paidVnd,
      debtVnd,
      sellingPriceVnd,
      customerName,
      normalizedCustomerName: customerName ? stripVietnamese(customerName) : null,
      paymentAccount,
      paymentAccountNote,
      statusText: rawStatus || null,
    });
  }

  if (parsedRows.length === 0) {
    return {
      ...makeError('Không tìm thấy dòng đơn hàng hợp lệ nào để nhập.'),
      skippedRows,
      ignoredSummaryRowCount,
    };
  }

  // Build existing lookup sets
  const existingCustomerNorms = new Set(
    (params.existingCustomers ?? []).map((c) => stripVietnamese(c.name))
  );
  const existingProductNorms = new Set(
    (params.existingProducts ?? []).map((p) => stripVietnamese(p.name))
  );
  const existingOrderFingerprints = new Set(
    (params.existingOrders ?? [])
      .filter((o) => o.payment_status !== 'cancelled')
      .map((o) => buildExistingOrderFingerprint(o))
  );

  // Build planned products (auto-create missing with lowest positive selling price; never overwrite existing)
  const productMap = new Map<string, PlannedImportProduct>();
  for (const row of parsedRows) {
    const existing = productMap.get(row.normalizedItemName);
    if (!existing) {
      productMap.set(row.normalizedItemName, {
        name: row.itemName,
        normalizedName: row.normalizedItemName,
        unit: 'cái',
        price: row.sellingPriceVnd,
        costPrice: row.costVnd > 0 ? row.costVnd : null,
        isNew: !existingProductNorms.has(row.normalizedItemName),
      });
    } else if (row.sellingPriceVnd < existing.price) {
      existing.price = row.sellingPriceVnd;
      existing.costPrice = row.costVnd > 0 ? row.costVnd : existing.costPrice;
    }
  }

  // Group rows into planned orders
  const groupedEntries: Array<{ rows: ParsedCsvRow[] }> = [];
  if (params.options.groupSameDayOrders) {
    const groupMap = new Map<string, { rows: ParsedCsvRow[] }>();
    for (const row of parsedRows) {
      const rowStatus: Exclude<PaymentStatus, 'cancelled'> =
        row.debtVnd === 0 ? 'paid' : row.paidVnd > 0 ? 'partial' : 'unpaid';
      const key = [
        row.vnDate,
        row.normalizedCustomerName ?? '__walkin__',
        rowStatus,
        row.paymentAccount ?? '',
        row.paymentAccountNote ?? '',
      ].join('|');

      let bucket = groupMap.get(key);
      if (!bucket) {
        bucket = { rows: [] };
        groupMap.set(key, bucket);
        groupedEntries.push(bucket);
      }
      bucket.rows.push(row);
    }
  } else {
    for (const row of parsedRows) {
      groupedEntries.push({ rows: [row] });
    }
  }

  // Materialize planned orders + detect duplicates against existing orders
  const plannedOrders: PlannedImportOrder[] = groupedEntries.map(({ rows }) => {
    const first = rows[0];
    const totalAmount = rows.reduce((sum, r) => sum + r.sellingPriceVnd, 0);
    const totalCost = rows.reduce((sum, r) => sum + r.costVnd, 0);
    const paidAmount = rows.reduce((sum, r) => sum + r.paidVnd, 0);
    const remainingAmount = totalAmount - paidAmount;

    const paymentStatus: Exclude<PaymentStatus, 'cancelled'> =
      remainingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    const paymentMethod: PaymentMethod =
      paymentStatus === 'paid'
        ? first.paymentAccount
          ? 'transfer'
          : 'cash'
        : paymentStatus === 'partial'
          ? 'mixed'
          : 'debt';

    const purchasedAtIso = `${first.vnDate}T12:00:00+07:00`;
    const paidAtIso = paymentStatus === 'paid' ? purchasedAtIso : null;

    const items: PlannedImportItem[] = rows.map((r) => ({
      productName: r.itemName,
      normalizedProductName: r.normalizedItemName,
      unit: 'cái',
      unitPrice: r.sellingPriceVnd,
      costPrice: r.costVnd,
      quantity: 1,
    }));

    const statuses = Array.from(new Set(rows.map((r) => r.statusText).filter(Boolean)));
    const note = statuses.length > 0 ? `Nhập CSV (${statuses.join(', ')})` : 'Nhập từ CSV';

    const fingerprint = buildOrderFingerprint({
      vnDate: first.vnDate,
      normalizedCustomerName: first.normalizedCustomerName,
      totalAmount,
      paidAmount,
      items,
    });

    return {
      fingerprint,
      vnDate: first.vnDate,
      purchasedAtIso,
      customerName: first.customerName,
      normalizedCustomerName: first.normalizedCustomerName,
      paymentStatus,
      paymentMethod,
      paymentAccount: first.paymentAccount,
      paymentAccountNote: first.paymentAccountNote,
      totalAmount,
      totalCost,
      paidAmount,
      remainingAmount,
      paidAtIso,
      note,
      items,
      sourceLines: rows.map((r) => r.lineNumber),
      isDuplicate: existingOrderFingerprints.has(fingerprint),
    };
  });

  const newOrders = params.options.skipDuplicates
    ? plannedOrders.filter((o) => !o.isDuplicate)
    : plannedOrders;
  const duplicateOrderCount = plannedOrders.filter((o) => o.isDuplicate).length;

  // Build planned customers summary
  const customerMap = new Map<string, PlannedImportCustomer>();
  for (const order of plannedOrders) {
    if (!order.customerName || !order.normalizedCustomerName) continue;
    let entry = customerMap.get(order.normalizedCustomerName);
    if (!entry) {
      entry = {
        name: order.customerName,
        normalizedName: order.normalizedCustomerName,
        isNew: !existingCustomerNorms.has(order.normalizedCustomerName),
        orderCount: 0,
        debtToAdd: 0,
      };
      customerMap.set(order.normalizedCustomerName, entry);
    }
    entry.orderCount++;
    if (!params.options.skipDuplicates || !order.isDuplicate) {
      entry.debtToAdd += order.remainingAmount;
    }
  }

  const plannedCustomers = Array.from(customerMap.values());
  const plannedProducts = Array.from(productMap.values());

  const notices: string[] = [];
  if (fallbackDateLines.length > 0) {
    const previewLines = fallbackDateLines.slice(0, 3).join(', ');
    const suffix = fallbackDateLines.length > 3 ? '...' : '';
    notices.push(
      `Có ${fallbackDateLines.length} dòng đầu chưa ghi ngày (dòng ${previewLines}${suffix}), hệ thống tạm lấy ngày hôm nay (${todayVN}).`
    );
  }

  return {
    ok: true,
    error: null,
    validRowCount: parsedRows.length,
    plannedOrders,
    newOrders,
    duplicateOrderCount,
    plannedCustomers,
    newCustomerCount: plannedCustomers.filter((c) => c.isNew).length,
    matchedCustomerCount: plannedCustomers.filter((c) => !c.isNew).length,
    plannedProducts,
    newProductCount: plannedProducts.filter((p) => p.isNew).length,
    matchedProductCount: plannedProducts.filter((p) => !p.isNew).length,
    skippedRows,
    notices,
    ignoredSummaryRowCount,
    totals: sumOrderTotals(plannedOrders),
    newOrdersTotals: sumOrderTotals(newOrders),
    inferredYear,
    detectedUnitMode,
  };
}
