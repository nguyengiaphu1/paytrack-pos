'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, QrCode, ReceiptText, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { computeOrderTotals, formatVND, getTodayVN, stripVietnamese } from '@/lib/vietnamese';
import { computeItemsCostTotal, dateInputToVnIso } from '@/lib/ledger';
import type {
  CartItem,
  Customer,
  Order,
  OrderItem,
  PaymentAccount,
  PaymentMethod,
  ShopProfile,
} from '@/types/database';
import { VietQRModal } from '@/components/qr/VietQRModal';
import { InvoicePreviewModal } from '@/components/invoice/InvoicePreviewModal';
import { VndKInput } from '@/components/ui/VndKInput';
import { PaymentAccountSelector } from '@/components/ui/PaymentAccountSelector';

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  discount: number;
  selectedCustomer: Customer | null;
  profile: ShopProfile | null;
  onOrderCreated: () => void;
  onCustomerUpdated?: (customer: Customer) => void;
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
  onCustomerUpdated,
}: CheckoutModalProps) {
  const { total } = computeOrderTotals(items, discount);
  const totalCost = computeItemsCostTotal(items);
  const todayVN = getTodayVN();

  const [choice, setChoice] = useState<PayChoice>('full_cash');
  const [cashTenderedVnd, setCashTenderedVnd] = useState<number | null>(null);
  const [paidVnd, setPaidVnd] = useState<number | null>(total);
  const [partialMethod, setPartialMethod] = useState<'cash' | 'transfer'>('cash');
  const [paymentAccount, setPaymentAccount] = useState<PaymentAccount | null>(null);
  const [paymentAccountNote, setPaymentAccountNote] = useState('');
  const [purchasedDate, setPurchasedDate] = useState<string>(todayVN);
  const [paidDate, setPaidDate] = useState<string>(todayVN);
  const [dueDate, setDueDate] = useState<string>(todayVN);
  const [buyerName, setBuyerName] = useState<string>(selectedCustomer?.name ?? '');
  const [buyerPhone, setBuyerPhone] = useState<string>(selectedCustomer?.phone ?? '');
  const [buyerAddress, setBuyerAddress] = useState<string>(selectedCustomer?.address ?? '');
  const [syncToCustomer, setSyncToCustomer] = useState(false);
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
        : Math.max(0, Math.min(total, Math.round(paidVnd ?? 0)));

  const remaining = Math.max(0, total - computedPaid);
  const tenderedAmount =
    choice === 'full_cash' && cashTenderedVnd !== null
      ? Math.max(0, Math.round(cashTenderedVnd))
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

  const buyerContactChanged =
    Boolean(selectedCustomer) &&
    ((buyerPhone.trim() || null) !== (selectedCustomer?.phone ?? null) ||
      (buyerAddress.trim() || null) !== (selectedCustomer?.address ?? null));

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Mất kết nối mạng — bật lại Wi-Fi hoặc 4G trước khi lưu đơn.');
      return;
    }

    if (remaining > 0 && !selectedCustomer) {
      setError('Đơn ghi nợ bắt buộc chọn khách hàng.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const purchasedIso = dateInputToVnIso(purchasedDate) ?? new Date().toISOString();
      const paidIso =
        remaining === 0
          ? dateInputToVnIso(paidDate) ?? purchasedIso
          : computedPaid > 0
            ? purchasedIso
            : null;

      const effectiveAccount = choice === 'unpaid' ? null : paymentAccount;
      const effectiveAccountNote =
        effectiveAccount === 'Khác' ? paymentAccountNote.trim() || null : null;

      const { data: rpcResult, error: rpcErr } = await supabase.rpc('create_order_with_items', {
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
        p_customer_name_snapshot: buyerName.trim() || selectedCustomer?.name || null,
        p_customer_address_snapshot: buyerAddress.trim(),
        p_customer_phone_snapshot: buyerPhone.trim(),
        p_purchased_at: purchasedIso,
        p_total_cost: totalCost,
        p_payment_account: effectiveAccount,
        p_payment_account_note: effectiveAccountNote,
        p_paid_at: paidIso,
      });

      if (rpcErr) throw rpcErr;
      const orderId = (rpcResult as { order_id: string }).order_id;

      // Optionally sync edited phone/address back to customer profile
      if (selectedCustomer && syncToCustomer && buyerContactChanged) {
        const nextPhone = buyerPhone.trim() || null;
        const nextAddr = buyerAddress.trim() || null;
        const { data: updatedCustomer } = await supabase
          .from('customers')
          .update({
            phone: nextPhone,
            address: nextAddr,
            search_text: stripVietnamese(
              `${selectedCustomer.name} ${nextPhone ?? ''} ${nextAddr ?? ''}`
            ),
          })
          .eq('id', selectedCustomer.id)
          .select('*')
          .single();
        if (updatedCustomer) {
          onCustomerUpdated?.(updatedCustomer as Customer);
        }
      }

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
        <div className="animate-sheet-up sm:animate-modal-in max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5">
            <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold text-[var(--text-primary)]">
              {savedOrder ? 'Đã lưu đơn' : 'Thanh toán'}
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
                  <strong>{savedOrder.customer_name_snapshot}</strong> ·{' '}
                  <strong className="font-mono-tabular text-[var(--text-primary)]">
                    {formatVND(savedOrder.total_amount)}
                  </strong>
                </p>
                {savedOrder.remaining_amount > 0 && (
                  <p className="mt-1 font-mono-tabular text-[14px] font-bold text-[var(--status-debt)]">
                    Còn nợ: {formatVND(savedOrder.remaining_amount)}
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
                  <span className="truncate">Hóa đơn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-jade)] px-2.5 text-[13px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] sm:text-[14px]"
                >
                  <QrCode className="h-4 w-4 shrink-0" />
                  <span className="truncate">Tạo QR</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="press-tactile flex min-h-[48px] w-full items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[15px] font-semibold text-[var(--text-primary)]"
              >
                Bán đơn mới
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

              {/* Order Totals Summary */}
              <div className="space-y-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[14px] font-medium text-[var(--text-secondary)]">
                    Tổng đơn
                  </span>
                  <span className="font-mono-tabular shrink-0 text-[21px] font-bold text-[var(--text-primary)]">
                    {formatVND(total)}
                  </span>
                </div>
                {totalCost > 0 && (
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                    <span className="text-[var(--text-secondary)]">Giá vốn / Lãi</span>
                    <span className="font-mono-tabular text-[var(--text-secondary)]">
                      {formatVND(totalCost)} /{' '}
                      <strong className="text-[var(--brand-jade-text)]">
                        {formatVND(total - totalCost)}
                      </strong>
                    </span>
                  </div>
                )}
                {changeDue > 0 && (
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--border-default)] pt-1.5 text-[14px] font-bold text-[var(--brand-jade-text)]">
                    <span>Tiền thối</span>
                    <span className="font-mono-tabular text-[17px]">{formatVND(changeDue)}</span>
                  </div>
                )}
                {remaining > 0 && (
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--border-default)] pt-1.5 text-[14px] font-bold text-[var(--status-debt)]">
                    <span>Còn nợ</span>
                    <span className="font-mono-tabular text-[17px]">{formatVND(remaining)}</span>
                  </div>
                )}
              </div>

              {/* Payment Choice */}
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">
                  Trạng thái thanh toán
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('full_cash');
                      setPaidVnd(total);
                    }}
                    className={`press-tactile min-h-[48px] rounded-lg border px-2 text-[13px] font-semibold sm:px-3 sm:text-[14px] ${
                      choice === 'full_cash'
                        ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                    }`}
                  >
                    Trả đủ (Tiền mặt)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('full_transfer');
                      setPaidVnd(total);
                      setCashTenderedVnd(null);
                    }}
                    className={`press-tactile min-h-[48px] rounded-lg border px-2 text-[13px] font-semibold sm:px-3 sm:text-[14px] ${
                      choice === 'full_transfer'
                        ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                    }`}
                  >
                    Trả đủ (Chuyển khoản)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChoice('partial');
                      setPaidVnd(null);
                      setCashTenderedVnd(null);
                    }}
                    className={`press-tactile min-h-[48px] rounded-lg border px-2 text-[13px] font-semibold sm:px-3 sm:text-[14px] ${
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
                      setPaidVnd(0);
                      setCashTenderedVnd(null);
                    }}
                    className={`press-tactile min-h-[48px] rounded-lg border px-2 text-[13px] font-semibold sm:px-3 sm:text-[14px] ${
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
                  <label
                    htmlFor="checkout-tendered"
                    className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]"
                  >
                    Khách đưa (nghìn) — tính tiền thối
                  </label>
                  <VndKInput
                    id="checkout-tendered"
                    valueVnd={cashTenderedVnd}
                    onChangeVnd={setCashTenderedVnd}
                    placeholder="Bỏ trống nếu đưa đủ"
                    showPreview
                  />
                </div>
              )}

              {choice === 'partial' && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label
                      htmlFor="checkout-partial"
                      className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]"
                    >
                      Trả trước (nghìn) *
                    </label>
                    <VndKInput
                      id="checkout-partial"
                      required
                      valueVnd={paidVnd}
                      onChangeVnd={setPaidVnd}
                      placeholder="100"
                      showPreview
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                      Hình thức
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

              {/* 9 Payment Account Selector */}
              {choice !== 'unpaid' && (
                <PaymentAccountSelector
                  value={paymentAccount}
                  note={paymentAccountNote}
                  onChangeAccount={setPaymentAccount}
                  onChangeNote={setPaymentAccountNote}
                />
              )}

              {/* Purchase Date & Paid/Due Date */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                    Ngày mua hàng
                  </label>
                  <input
                    type="date"
                    value={purchasedDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPurchasedDate(next);
                      if (paidDate === purchasedDate) setPaidDate(next);
                    }}
                    className="font-mono-tabular min-h-[44px] w-full min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)]"
                  />
                </div>
                {remaining === 0 ? (
                  <div className="min-w-0">
                    <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                      Ngày thanh toán
                    </label>
                    <input
                      type="date"
                      value={paidDate}
                      onChange={(e) => setPaidDate(e.target.value)}
                      className="font-mono-tabular min-h-[44px] w-full min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)]"
                    />
                  </div>
                ) : (
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
                )}
              </div>

              {remaining > 0 && !selectedCustomer && (
                <p className="rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--status-overdue)]">
                  Đóng hộp thoại này và chọn khách hàng ở đầu màn hình để ghi nợ.
                </p>
              )}

              {/* Buyer Snapshot Info (Name / Phone / Address) */}
              <div className="space-y-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Thông tin người mua trên sổ
                </p>
                {!selectedCustomer && (
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Tên người mua (mặc định: Khách lẻ)"
                    className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                  />
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="SĐT người mua"
                    className="font-mono-tabular min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                  />
                  <input
                    type="text"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="Địa chỉ giao / khách"
                    className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                  />
                </div>
                {buyerContactChanged && (
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[13px] text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={syncToCustomer}
                      onChange={(e) => setSyncToCustomer(e.target.checked)}
                      className="h-4 w-4 accent-[var(--brand-jade)]"
                    />
                    <span>Lưu SĐT / Địa chỉ mới vào danh bạ khách</span>
                  </label>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                  Ghi chú đơn
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tùy chọn"
                  className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || (remaining > 0 && !selectedCustomer)}
                className="press-tactile flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[16px] font-bold text-white hover:bg-[var(--brand-jade-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                <span>{submitting ? 'Đang lưu...' : 'Lưu đơn'}</span>
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
