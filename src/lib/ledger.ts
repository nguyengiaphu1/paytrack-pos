/**
 * 12-field Vietnamese retail sales ledger domain constants, profit/cost helpers,
 * date conversion helpers (Asia/Ho_Chi_Minh), and Excel-safe UTF-8 BOM CSV exporter.
 */

import type { Order, OrderItem, PaymentAccount, PaymentStatus } from '@/types/database';
import { formatDateVN, getTodayVN } from './vietnamese';

export const PAYMENT_ACCOUNTS: readonly PaymentAccount[] = [
  'Thanh',
  'Phú',
  'Trang',
  'Trang Lê',
  'Thuỳ Trang',
  'Thuỷ',
  'Kiều Thương',
  'Vận chuyển',
  'Khác',
] as const;

export function isPaymentAccount(value: string | null | undefined): value is PaymentAccount {
  if (!value) return false;
  return (PAYMENT_ACCOUNTS as readonly string[]).includes(value);
}

export function formatPaymentAccount(
  account: string | null | undefined,
  note?: string | null
): string {
  const cleanAccount = (account ?? '').trim();
  if (!cleanAccount) return '—';
  const cleanNote = (note ?? '').trim();
  if (cleanAccount === 'Khác' && cleanNote) {
    return `Khác: ${cleanNote}`;
  }
  return cleanAccount;
}

export function formatQuantityCompact(qty: number): string {
  if (!Number.isFinite(qty)) return '0';
  return Number(qty.toFixed(2)).toString();
}

/**
 * Column #6: Concise summary of order items for ledger rows (e.g., "Gạo ST25 ×2, Nước mắm ×1").
 */
export function summarizeOrderItems(
  items: ReadonlyArray<Pick<OrderItem, 'product_name' | 'quantity'>> | undefined,
  maxItems?: number
): string {
  if (!items || items.length === 0) return '—';
  const limit = maxItems && maxItems > 0 ? maxItems : items.length;
  const shown = items.slice(0, limit).map(
    (item) => `${item.product_name} ×${formatQuantityCompact(Number(item.quantity))}`
  );
  const extra = items.length - shown.length;
  return extra > 0 ? `${shown.join(', ')} (+${extra})` : shown.join(', ');
}

export function computeItemsCostTotal(
  items: ReadonlyArray<Pick<OrderItem, 'quantity' | 'cost_price'>> | undefined
): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((sum, item) => {
    if (item.cost_price === null || item.cost_price === undefined) return sum;
    return sum + Math.max(0, Math.round(Number(item.quantity) * Number(item.cost_price)));
  }, 0);
}

export function computeOrderProfit(
  order: Pick<Order, 'total_amount' | 'total_cost' | 'payment_status'>
): number {
  if (order.payment_status === 'cancelled') return 0;
  return Math.round((order.total_amount ?? 0) - (order.total_cost ?? 0));
}

export function hasMissingCostPrice(order: Pick<Order, 'order_items' | 'total_cost'>): boolean {
  if (order.order_items && order.order_items.length > 0) {
    return order.order_items.some((item) => item.cost_price === null || item.cost_price === undefined);
  }
  return (order.total_cost ?? 0) === 0;
}

export interface LedgerTotals {
  activeCount: number;
  cancelledCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalRemainingDebt: number;
}

/**
 * Computes aggregate ledger totals for the active filtered view, strictly excluding cancelled orders.
 */
export function computeLedgerTotals(
  orders: ReadonlyArray<Pick<Order, 'total_amount' | 'total_cost' | 'remaining_amount' | 'payment_status'>>
): LedgerTotals {
  let activeCount = 0;
  let cancelledCount = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let totalRemainingDebt = 0;

  for (const order of orders) {
    if (order.payment_status === 'cancelled') {
      cancelledCount += 1;
      continue;
    }
    activeCount += 1;
    totalRevenue += order.total_amount ?? 0;
    totalCost += order.total_cost ?? 0;
    totalRemainingDebt += Math.max(0, order.remaining_amount ?? 0);
  }

  return {
    activeCount,
    cancelledCount,
    totalRevenue,
    totalCost,
    totalProfit: totalRevenue - totalCost,
    totalRemainingDebt,
  };
}

/**
 * Resolves effective paid_at timestamp when creating or settling an order.
 */
export function resolveOrderPaidAt(params: {
  paymentStatus: PaymentStatus;
  explicitPaidAt?: string | null;
  purchasedAt: string;
}): string | null {
  if (params.paymentStatus !== 'paid') return null;
  const clean = (params.explicitPaidAt ?? '').trim();
  return clean || params.purchasedAt;
}

/**
 * Format an ISO timestamp into YYYY-MM-DD in Asia/Ho_Chi_Minh for `<input type="date">`.
 */
export function toVnDateInput(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return getTodayVN(date);
}

/**
 * Convert a YYYY-MM-DD date string from `<input type="date">` into an Asia/Ho_Chi_Minh ISO timestamp.
 * Preserves current VN time of day if matching today, otherwise uses 12:00:00+07:00 to prevent UTC day shift.
 */
export function dateInputToVnIso(dateStr: string, referenceNow: Date = new Date()): string | null {
  const clean = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  if (clean === getTodayVN(referenceNow)) {
    return referenceNow.toISOString();
  }
  return new Date(`${clean}T12:00:00+07:00`).toISOString();
}

export const PAYMENT_STATUS_LABEL_VN: Record<PaymentStatus, string> = {
  paid: 'Đã trả',
  partial: 'Trả 1 phần',
  unpaid: 'Chưa trả',
  cancelled: 'Đã hủy',
};

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports filtered orders into a 12-column UTF-8 BOM CSV file that opens cleanly in Excel on Windows.
 */
export function buildLedgerCsv(orders: ReadonlyArray<Order>): string {
  const headers = [
    'STT',
    'Họ tên người mua',
    'Địa chỉ',
    'SĐT',
    'Ngày mua hàng',
    'Món hàng',
    'Giá vốn (VND)',
    'Giá bán (VND)',
    'Lãi (VND)',
    'Trạng thái thanh toán',
    'Tên TK thanh toán',
    'Ngày thanh toán',
  ];

  const rows = orders.map((order, idx) => {
    const purchasedDisplay = formatDateVN(order.purchased_at || order.created_at);
    const paidDisplay = order.paid_at ? formatDateVN(order.paid_at) : '';
    const profit = computeOrderProfit(order);
    return [
      idx + 1,
      order.customer_name_snapshot,
      order.customer_address_snapshot ?? '',
      order.customer_phone_snapshot ?? '',
      purchasedDisplay,
      summarizeOrderItems(order.order_items),
      order.total_cost ?? 0,
      order.total_amount ?? 0,
      profit,
      PAYMENT_STATUS_LABEL_VN[order.payment_status] ?? order.payment_status,
      formatPaymentAccount(order.payment_account, order.payment_account_note),
      paidDisplay,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return `\uFEFF${[headers.map(escapeCsvCell).join(','), ...rows].join('\r\n')}`;
}
