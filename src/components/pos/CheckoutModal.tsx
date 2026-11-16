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
    setError(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Mất kết nối mạng — không thể lưu đơn lên cloud. Vui lòng kiểm tra Wi-Fi/4G.');
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
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận thanh toán"
      >
        <div className="max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3.5">
            <h2 className="text-[17px] font-bold">
              {savedOrder ? 'Đã lưu đơn lên Cloud' : 'Xác nhận thanh toán'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {savedOrder ? (
            <div className="space-y-4 p-5">
              <div className="rounded-lg border border-[#5EEAD4] bg-[var(--status-paid-bg)] p-4 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-[var(--brand-jade)]" />
                <p className="mt-2 font-mono-tabular text-[15px] font-bold text-[var(--text-primary)]">
                  {savedOrder.order_code}
                </p>
                <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
                  Khách: <strong>{savedOrder.customer_name_snapshot}</strong> · Tổng:{' '}
                  <strong className="font-mono-tabular">{formatVND(savedOrder.total_amount)}</strong>
                </p>
                {savedOrder.remaining_amount > 0 && (
                  <p className="mt-1 font-mono-tabular text-[14px] font-bold text-[var(--status-debt)]">
                    Ghi nợ: {formatVND(savedOrder.remaining_amount)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setInvoiceOpen(true)}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[14px] font-semibold hover:bg-[var(--bg-subtle)]"
                >
                  <ReceiptText className="h-4 w-4 text-[var(--brand-jade)]" />
                  <span>Xuất hóa đơn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-3 text-[14px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Tạo mã QR</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex min-h-[48px] w-full items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[15px] font-semibold text-[var(--text-primary)]"
              >
                Bán đơn tiếp theo
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4 p-4">
              {error && (
                <div className="rounded-lg border border-[#FCA5A5] bg-[var(--status-overdue-bg)] px-3 py-2.5 text-[14px] font-medium text-[var(--status-overdue)]">
                  {error}
                </div>
              )}

              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5">
                <div className="flex justify-between text-[14px]">
                  <span className="text-[var(--text-secondary)]">Khách hàng</span>
                  <span className="font-semibold">
                    {selectedCustomer ? selectedCustomer.name : 'Khách lẻ'}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="text-[14px] font-medium text-[var(--text-secondary)]">
                    Tổng đơn hàng
                  </span>
                  <span className="font-mono-tabular text-[22px] font-bold text-[var(--text-primary)]">
                    {formatVND(total)}
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[14px] font-semibold">Hình thức thanh toán</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('full_cash');
                      setPaidInput(String(total));
                    }}
                    className={`min-h-[48px] rounded-lg border px-3 text-[14px] font-semibold ${
                      choice === 'full_cash'
                        ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                    }`}
                  >
                    Đủ — Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('full_transfer');
                      setPaidInput(String(total));
                    }}
                    className={`min-h-[48px] rounded-lg border px-3 text-[14px] font-semibold ${
                      choice === 'full_transfer'
                        ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                    }`}
                  >
                    Đủ — Chuyển khoản
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('partial');
                      setPaidInput('');
                    }}
                    className={`min-h-[48px] rounded-lg border px-3 text-[14px] font-semibold ${
                      choice === 'partial'
                        ? 'border-[var(--status-debt)] bg-[var(--status-debt-bg)] text-[var(--status-debt)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                    }`}
                  >
                    Trả trước 1 phần
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('unpaid');
                      setPaidInput('0');
                    }}
                    className={`min-h-[48px] rounded-lg border px-3 text-[14px] font-semibold ${
                      choice === 'unpaid'
                        ? 'border-[var(--status-debt)] bg-[var(--status-debt-bg)] text-[var(--status-debt)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                    }`}
                  >
                    Ghi nợ toàn bộ
                  </button>
                </div>
              </div>

              {choice === 'partial' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium">Khách trả trước (đ)</label>
                    <input
                      type="number"
                      min={0}
                      max={total}
                      required
                      value={paidInput}
                      onChange={(e) => setPaidInput(e.target.value)}
                      placeholder="VD: 100000"
                      className="font-mono-tabular min-h-[46px] w-full rounded-lg border border-[var(--border-default)] px-3 outline-none focus:border-[var(--brand-jade)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium">Nhận bằng</label>
                    <select
                      value={partialMethod}
                      onChange={(e) => setPartialMethod(e.target.value as 'cash' | 'transfer')}
                      className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3"
                    >
                      <option value="cash">Tiền mặt</option>
                      <option value="transfer">Chuyển khoản</option>
                    </select>
                  </div>
                </div>
              )}

              {remaining > 0 && (
                <div className="space-y-3 rounded-lg border border-[#FCD34D] bg-[var(--status-debt-bg)] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[var(--status-debt)]">
                      Số tiền ghi nợ đơn này
                    </span>
                    <span className="font-mono-tabular text-[18px] font-bold text-[var(--status-debt)]">
                      {formatVND(remaining)}
                    </span>
                  </div>

                  {!selectedCustomer && (
                    <p className="text-[13px] font-semibold text-[var(--status-overdue)]">
                      Vui lòng đóng cửa sổ này và chọn khách hàng trước khi ghi nợ.
                    </p>
                  )}

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                      Ngày hẹn thu nợ
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="font-mono-tabular min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[13px] font-medium">Ghi chú đơn (tùy chọn)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Giao chiều, túi riêng..."
                  className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] px-3.5 outline-none focus:border-[var(--brand-jade)]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || (remaining > 0 && !selectedCustomer)}
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[16px] font-bold text-white hover:bg-[var(--brand-jade-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                <span>Lưu đơn hàng lên Cloud</span>
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
