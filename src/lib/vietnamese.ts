/**
 * Vietnamese retail formatting, search normalization, rounding, and Zalo debt reminder utilities.
 */

export function stripVietnamese(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function formatVND(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${safe.toLocaleString('vi-VN')}đ`;
}

export function computeLineTotal(quantity: number, unitPrice: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
  return Math.max(0, Math.round(quantity * unitPrice));
}

export function computeOrderTotals(
  items: Array<{ quantity: number; unit_price: number }>,
  discountAmount: number = 0
): { subtotal: number; discount: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + computeLineTotal(item.quantity, item.unit_price),
    0
  );
  const safeDiscount = Math.min(Math.max(0, Math.round(discountAmount || 0)), subtotal);
  return {
    subtotal,
    discount: safeDiscount,
    total: subtotal - safeDiscount,
  };
}

export function formatDateTimeVN(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateVN(dateString: string | null): string {
  if (!dateString) return 'Chưa hẹn ngày';
  const date = dateString.includes('T') ? new Date(dateString) : new Date(`${dateString}T00:00:00+07:00`);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function getTodayVN(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export interface ZaloReminderParams {
  shopName: string;
  customerName: string;
  amount: number;
  bankName?: string | null;
  accountNo?: string | null;
  accountName?: string | null;
  memo: string;
  orderCodes?: string[];
}

export function buildZaloDebtMessage(params: ZaloReminderParams): string {
  const lines = [
    `Dạ ${params.customerName} ơi, ${params.shopName} gửi thông tin thanh toán ạ:`,
    `- Số tiền cần thanh toán: ${formatVND(params.amount)}`,
  ];

  if (params.orderCodes && params.orderCodes.length > 0) {
    lines.push(`- Mã đơn: ${params.orderCodes.join(', ')}`);
  }

  if (params.bankName && params.accountNo) {
    const holder = params.accountName ? ` (${params.accountName})` : '';
    lines.push(`- STK: ${params.accountNo} - ${params.bankName}${holder}`);
  }

  lines.push(`- Nội dung CK: ${params.memo}`);
  lines.push(`Cảm ơn ${params.customerName} nhiều ạ!`);

  return lines.join('\n');
}
