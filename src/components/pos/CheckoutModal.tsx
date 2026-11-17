'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, QrCode, ReceiptText, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { computeOrderTotals, formatVND, getTodayVN } from '@/lib/vietnamese';
import type {
  CartItem,
  Customer,
  Order,
  OrderItem,
  PaymentMethod,
  ShopProfile,
} from '@/types/database';
import { VietQRModal } from '@/components/qr/VietQRModal';
import { InvoicePreviewModal } from '@/components/invoice/InvoicePreviewModal';

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  discount: number;
  selectedCustomer: Customer | null;
  profile: ShopProfile | null;
  onOrderCreated: () => void;
}

type PayChoice = 'full_cash' | 'full_transfer' | 'partial' | 'unpaid';

export function CheckoutModal(props: CheckoutModalProps) {
  if (!props.open) return null;
  return (
    <CheckoutModalBody
      key={`${props.selectedCustomer?.id ?? 'walkin'}-${props.items.length}-${props.discount}`}
      {...props}
    />
  );
}

function CheckoutModalBody({
  onClose,
  items,
  discount,
  selectedCustomer,
  profile,
  onOrderCreated,
}: CheckoutModalProps) {
  const { total } = computeOrderTotals(items, discount);

  const [choice, setChoice] = useState<PayChoice>('full_cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [paidInput, setPaidInput] = useState<string>(String(total));
  const [partialMethod, setPartialMethod] = useState<'cash' | 'transfer'>('cash');
  const [dueDate, setDueDate] = useState<string>(getTodayVN());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [savedItems, setSavedItems] = useState<OrderItem[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const computedPaid =
    choice === 'full_cash' || choice === 'full_transfer'
      ? total
      : choice === 'unpaid'
        ? 0
        : Math.max(0, Math.min(total, Math.round(Number(paidInput) || 0)));

  const remaining = Math.max(0, total - computedPaid);
  const tenderedAmount =
    choice === 'full_cash' && cashTendered.trim()
      ? Math.max(0, Math.round(Number(cashTendered) || 0))
      : computedPaid;
  const changeDue = choice === 'full_cash' ? Math.max(0, tenderedAmount - total) : 0;

  const paymentMethod: PaymentMethod =
    choice === 'full_cash'
      ? 'cash'
      : choice === 'full_transfer'
        ? 'transfer'
        : choice === 'unpaid'
          ? 'debt'
          : computedPaid === 0
            ? 'debt'
            : partialMethod === 'transfer'
              ? 'mixed'
              : 'mixed';

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Mất kết nối mạng — chưa thể lưu đơn. Vui lòng bật lại Wi-Fi hoặc 4G.');
      return;
    }

    if (remaining > 0 && !selectedCustomer) {
      setError('Đơn ghi nợ hoặc trả một phần bắt buộc phải chọn tên khách hàng.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: rpcResult, error: rpcErr } = await supabase.rpc(
        'create_order_with_items',
        {
          p_customer_id: selectedCustomer?.id ?? null,
          p_discount_amount: discount,
          p_paid_amount: computedPaid,
          p_payment_method: paymentMethod,
          p_debt_due_date: remaining > 0 ? dueDate || null : null,
          p_note: note.trim() || null,
          p_items: items.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            unit: i.unit,
            unit_price: i.unit_price,
            cost_price: i.cost_price,
            quantity: i.quantity,
          })),
        }
      );

      if (rpcErr) throw rpcErr;
      const orderId = (rpcResult as { order_id: string }).order_id;

      const [{ data: orderRow }, { data: itemRows }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).single(),
        supabase.from('order_items').select('*').eq('order_id', orderId),
      ]);

      setSavedOrder((orderRow as Order) ?? null);
      setSavedItems((itemRows as OrderItem[]) ?? []);
      onOrderCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu đơn hàng');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="animate-backdrop-in fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận thanh toán"
      >
        <div className="animate-sheet-up sm:animate-modal-in max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-4 py-3.5">
            <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold text-[var(--text-primary)]">
              {savedOrder ? 'Đã lưu đơn thành công' : 'Thu tiền & lưu đơn'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {savedOrder ? (
            <div className="space-y-4 p-5">
              <div className="rounded-lg border border-[var(--status-paid-border)] bg-[var(--status-paid-bg)] p-4 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-[var(--brand-jade-text)]" />
                <p className="mt-2 font-mono-tabular text-[15px] font-bold text-[var(--text-primary)]">
                  {savedOrder.order_code}
                </p>
                <p className="mt-1 break-words text-[14px] text-[var(--text-secondary)]">
                  Khách: <strong>{savedOrder.customer_name_snapshot}</strong> · Tổng:{' '}
                  <strong className="font-mono-tabular text-[var(--text-primary)]">
                    {formatVND(savedOrder.total_amount)}
                  </strong>
                </p>
                {savedOrder.remaining_amount > 0 && (
                  <p className="mt-1 font-mono-tabular text-[14px] font-bold text-[var(--status-debt)]">
                    Còn ghi nợ: {formatVND(savedOrder.remaining_amount)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setInvoiceOpen(true)}
                  className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] sm:text-[14px]"
                >
                  <ReceiptText className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                  <span className="truncate">Xem &amp; In hóa đơn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-jade)] px-2.5 text-[13px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] sm:text-[14px]"
                >
                  <QrCode className="h-4 w-4 shrink-0" />
                  <span className="truncate">Tạo mã QR</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="press-tactile flex min-h-[48px] w-full items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[15px] font-semibold text-[var(--text-primary)]"
              >
                Bán đơn tiếp theo
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4 p-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-3 py-2.5 text-[14px] font-medium text-[var(--status-overdue)]"
                >
                  {error}
                </div>
              )}

              {/* Transparent Order Preview */}
              <div className="space-y-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5">
                <div className="flex flex-wrap justify-between gap-2 text-[14px]">
                  <span className="text-[var(--text-secondary)]">Khách hàng</span>
                  <span className="min-w-0 break-words font-semibold text-[var(--text-primary)]">
                    {selectedCustomer ? selectedCustomer.name : 'Khách lẻ (trả ngay)'}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[14px] font-medium text-[var(--text-secondary)]">
                    Tổng tiền đơn
                  </span>
                  <span className="font-mono-tabular shrink-0 text-[20px] font-bold text-[var(--text-primary)] sm:text-[22px]">
                    {formatVND(total)}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--border-default)] pt-1.5 text-[13px]">
                  <span className="text-[var(--text-secondary)]">
                    {remaining > 0 ? 'Khách trả ngay' : 'Khách đưa'}
                  </span>
                  <span className="font-mono-tabular font-semibold text-[var(--brand-jade-text)]">
                    {formatVND(choice === 'full_cash' ? Math.max(total, tenderedAmount) : computedPaid)}
                  </span>
                </div>
                {changeDue > 0 && (
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px] font-bold text-[var(--brand-jade-text)]">
                    <span>Tiền thối lại cho khách</span>
                    <span className="font-mono-tabular text-[17px]">{formatVND(changeDue)}</span>
                  </div>
                )}
                {remaining > 0 && (
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-[14px] font-bold text-[var(--status-debt)]">
                    <span>Còn ghi nợ</span>
                    <span className="font-mono-tabular text-[17px]">{formatVND(remaining)}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-[14px] font-semibold text-[var(--text-primary)]">
                  Chọn cách khách trả tiền
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('full_cash');
                      setPaidInput(String(total));
                    }}
                    className={`press-tactile min-h-[48px] rounded-lg border px-2 text-[13px] font-semibold leading-tight sm:px-3 sm:text-[14px] ${
                      choice === 'full_cash'
                        ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                    }`}
                  >
                    Khách trả đủ (Tiền mặt)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('full_transfer');
                      setPaidInput(String(total));
                      setCashTendered('');
                    }}
                    className={`press-tactile min-h-[48px] rounded-lg border px-2 text-[13px] font-semibold leading-tight sm:px-3 sm:text-[14px] ${
                      choice === 'full_transfer'
                        ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                    }`}
                  >
                    Khách trả đủ (Chuyển khoản)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('partial');
                      setPaidInput('');
                      setCashTendered('');
                    }}
                    className={`press-tactile min-h-[48px] rounded-lg border px-2 text-[13px] font-semibold leading-tight sm:px-3 sm:text-[14px] ${
                      choice === 'partial'
                        ? 'border-[var(--status-debt)] bg-[var(--status-debt-bg)] text-[var(--status-debt)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                    }`}
                  >
                    Trả một phần
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('unpaid');
                      setPaidInput('0');
                      setCashTendered('');
                    }}
                    className={`press-tactile min-h-[48px] rounded-lg border px-2 text-[13px] font-semibold leading-tight sm:px-3 sm:text-[14px] ${
                      choice === 'unpaid'
                        ? 'border-[var(--status-debt)] bg-[var(--status-debt-bg)] text-[var(--status-debt)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                    }`}
                  >
                    Ghi nợ hết
                  </button>
                </div>
              </div>

              {choice === 'full_cash' && (
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                    Tiền khách đưa để tính tiền thối <span className="text-[var(--text-secondary)]">(không bắt buộc)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={`Mặc định đúng ${formatVND(total)}`}
                    className="font-mono-tabular min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                  />
                </div>
              )}

              {choice === 'partial' && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                      Khách đưa trước (đ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={total}
                      required
                      value={paidInput}
                      onChange={(e) => setPaidInput(e.target.value)}
                      placeholder="VD: 100000"
                      className="font-mono-tabular min-h-[46px] w-full min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                      Nhận bằng
                    </label>
                    <select
                      value={partialMethod}
                      onChange={(e) => setPartialMethod(e.target.value as 'cash' | 'transfer')}
                      className="min-h-[46px] w-full min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)]"
                    >
                      <option value="cash">Tiền mặt</option>
                      <option value="transfer">Chuyển khoản</option>
                    </select>
                  </div>
                </div>
              )}

              {remaining > 0 && (
                <div className="space-y-3 rounded-lg border border-[var(--status-debt-border)] bg-[var(--status-debt-bg)] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-[var(--status-debt)]">
                      Số tiền ghi nợ đơn này
                    </span>
                    <span className="font-mono-tabular shrink-0 text-[18px] font-bold text-[var(--status-debt)]">
                      {formatVND(remaining)}
                    </span>
                  </div>

                  {!selectedCustomer && (
                    <p className="text-[13px] font-semibold text-[var(--status-overdue)]">
                      Vui lòng đóng cửa sổ này và chọn tên khách hàng trước khi ghi nợ.
                    </p>
                  )}

                  <div className="min-w-0">
                    <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                      Ngày hẹn thu nợ
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="font-mono-tabular min-h-[44px] w-full min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                  Ghi chú đơn (tùy chọn)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Giao chiều, túi riêng..."
                  className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || (remaining > 0 && !selectedCustomer)}
                className="press-tactile flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[16px] font-bold text-white hover:bg-[var(--brand-jade-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                <span>{submitting ? 'Đang lưu đơn...' : 'Hoàn tất & Lưu đơn'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      <VietQRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        profile={profile}
        customerName={savedOrder?.customer_name_snapshot ?? 'Khách hàng'}
        fixedOrder={savedOrder}
      />

      <InvoicePreviewModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        order={savedOrder}
        items={savedItems}
        profile={profile}
      />
    </>
  );
}
