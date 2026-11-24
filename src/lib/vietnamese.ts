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

export function getTodayVN(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeHHMM_VN(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const rawHour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const hour = rawHour === '24' ? '00' : rawHour;
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

export function normalizeHHMM(value: string | null | undefined, fallback = '08:30'): string {
  const raw = (value ?? '').trim();
  const ampmMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = Number(ampmMatch[1]);
    const m = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const h = match[1].padStart(2, '0');
  const m = match[2];
  return `${h}:${m}`;
}

export function shouldResetDigestSentDate(params: {
  prevEnabled: boolean;
  nextEnabled: boolean;
  prevHour: string | null | undefined;
  nextHour: string | null | undefined;
  lastDigestSentDate: string | null | undefined;
  now?: Date;
}): boolean {
  if (!params.nextEnabled) return false;
  const now = params.now ?? new Date();
  const todayVN = getTodayVN(now);
  if (params.lastDigestSentDate !== todayVN) return false;

  const prevHHMM = normalizeHHMM(params.prevHour, '08:30');
  const nextHHMM = normalizeHHMM(params.nextHour, '08:30');
  const scheduleChanged = nextHHMM !== prevHHMM || !params.prevEnabled;
  if (!scheduleChanged) return false;

  const nowHHMM = getCurrentTimeHHMM_VN(now);
  return nextHHMM >= nowHHMM;
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
  const rawName = params.customerName.trim();
  const normalized = stripVietnamese(rawName);
  const greetingName =
    !rawName || normalized === 'khach le' || normalized === 'khach hang' ? 'anh/chị' : rawName;

  const lines = [
    `Dạ ${greetingName} ơi, ${params.shopName} gửi thông tin thanh toán ạ:`,
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
  lines.push(`Cảm ơn ${greetingName} nhiều ạ!`);

  return lines.join('\n');
}
