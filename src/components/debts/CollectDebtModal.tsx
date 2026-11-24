'use client';

import { useState, type FormEvent } from 'react';
import { Banknote, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatVND, getTodayVN } from '@/lib/vietnamese';
import { formatErrorMessageVN } from '@/lib/errors';
import { dateInputToVnIso } from '@/lib/ledger';
import type { Customer, DebtPaymentMethod, Order, PaymentAccount } from '@/types/database';
import { VndKInput } from '@/components/ui/VndKInput';
import { PaymentAccountSelector } from '@/components/ui/PaymentAccountSelector';
import { ModalDialog } from '@/components/ui/ModalDialog';

interface CollectDebtModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  unpaidOrders: Order[];
  initialOrderId?: string | null;
  onCollected: () => void;
}

export function CollectDebtModal(props: CollectDebtModalProps) {
  if (!props.open || !props.customer) return null;
  return (
    <CollectDebtModalBody
      key={`${props.customer.id}-${props.initialOrderId ?? 'fifo'}`}
      {...props}
      customer={props.customer}
    />
  );
}

function CollectDebtModalBody({
  onClose,
  customer,
  unpaidOrders,
  initialOrderId = null,
  onCollected,
}: Omit<CollectDebtModalProps, 'open' | 'customer'> & { customer: Customer }) {
  const initialAmt = initialOrderId
    ? unpaidOrders.find((o) => o.id === initialOrderId)?.remaining_amount ?? customer.total_debt
    : customer.total_debt;

  const [targetOrderId, setTargetOrderId] = useState<string>(initialOrderId ?? '');
  const [amountVnd, setAmountVnd] = useState<number | null>(initialAmt);
  const [method, setMethod] = useState<DebtPaymentMethod>('transfer');
  const [paymentAccount, setPaymentAccount] = useState<PaymentAccount | null>(null);
  const [paymentAccountNote, setPaymentAccountNote] = useState('');
  const [paidDate, setPaidDate] = useState<string>(getTodayVN());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOrder = unpaidOrders.find((o) => o.id === targetOrderId) ?? null;
  const maxAllowed = selectedOrder ? selectedOrder.remaining_amount : customer.total_debt;
  const parsedPreview = Math.max(0, Math.min(maxAllowed, Math.round(amountVnd ?? 0)));
  const remainingAfter = Math.max(0, maxAllowed - parsedPreview);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Mất kết nối mạng — bật lại Wi-Fi hoặc 4G trước khi lưu.');
      return;
    }

    const parsedAmount = Math.round(amountVnd ?? 0);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Số tiền thu phải lớn hơn 0đ');
      return;
    }
    if (parsedAmount > maxAllowed) {
      setError(
        `Số tiền thu (${formatVND(parsedAmount)}) vượt quá số nợ (${formatVND(maxAllowed)})`
      );
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const paidIso = dateInputToVnIso(paidDate) ?? new Date().toISOString();
      const { error: rpcErr } = await supabase.rpc('record_debt_payment', {
        p_customer_id: customer.id,
        p_amount: parsedAmount,
        p_payment_method: method,
        p_order_id: targetOrderId || null,
        p_note: note.trim() || null,
        p_payment_account: paymentAccount,
        p_payment_account_note:
          paymentAccount === 'Khác' ? paymentAccountNote.trim() || null : null,
        p_paid_at: paidIso,
      });

      if (rpcErr) throw rpcErr;
      onCollected();
      onClose();
    } catch (err) {
      setError(formatErrorMessageVN(err, 'Không thể ghi nhận thu nợ'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog
      open={true}
      onClose={onClose}
      ariaLabelledBy="collect-debt-modal-title"
      backdropClassName="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      panelClassName="animate-sheet-up sm:animate-modal-in max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Banknote className="h-5 w-5 shrink-0 text-[var(--brand-jade-text)]" />
          <h2
            id="collect-debt-modal-title"
            className="min-w-0 truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            Thu nợ — {customer.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-3 py-2.5 text-[14px] font-medium text-[var(--status-overdue)]"
          >
            {error}
          </div>
        )}

          {/* Before / After Debt Preview */}
          <div className="space-y-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5 text-[14px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 text-[var(--text-secondary)]">
                {selectedOrder ? `Nợ đơn ${selectedOrder.order_code}` : 'Tổng nợ hiện tại'}
              </span>
              <span className="font-mono-tabular shrink-0 text-[16px] font-bold text-[var(--status-debt)]">
                {formatVND(maxAllowed)}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">Thu đợt này</span>
              <span className="font-mono-tabular shrink-0 font-bold text-[var(--brand-jade-text)]">
                − {formatVND(parsedPreview)}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-default)] pt-1.5">
              <span className="font-semibold text-[var(--text-primary)]">Còn lại</span>
              <span
                className={`font-mono-tabular shrink-0 text-[16px] font-bold ${
                  remainingAfter === 0
                    ? 'text-[var(--brand-jade-text)]'
                    : 'text-[var(--status-debt)]'
                }`}
              >
                {formatVND(remainingAfter)}
              </span>
            </div>
          </div>

          {unpaidOrders.length > 1 && (
            <div>
              <label
                htmlFor="collect-target-order"
                className="mb-1 block text-[13px] font-medium text-[var(--text-secondary)]"
              >
                Trừ vào đơn
              </label>
              <select
                id="collect-target-order"
                value={targetOrderId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setTargetOrderId(nextId);
                  const found = unpaidOrders.find((o) => o.id === nextId);
                  setAmountVnd(found ? found.remaining_amount : customer.total_debt);
                }}
                className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)]"
              >
                <option value="">Đơn cũ nhất trước (FIFO)</option>
                {unpaidOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_code} (còn {formatVND(o.remaining_amount)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <label
                htmlFor="collect-amount-k"
                className="text-[14px] font-medium text-[var(--text-primary)]"
              >
                Số tiền thu (nghìn) *
              </label>
              <button
                type="button"
                onClick={() => setAmountVnd(maxAllowed)}
                className="min-h-[44px] shrink-0 px-1 text-[13px] font-semibold text-[var(--brand-jade-text)] hover:underline"
              >
                Trả hết ({formatVND(maxAllowed)})
              </button>
            </div>
            <VndKInput
              id="collect-amount-k"
              required
              valueVnd={amountVnd}
              onChangeVnd={setAmountVnd}
              placeholder="100"
              showPreview
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[13px] font-medium text-[var(--text-primary)]">Hình thức</p>
              <div role="group" aria-label="Hình thức thu nợ" className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  aria-pressed={method === 'cash'}
                  onClick={() => setMethod('cash')}
                  className={`press-tactile min-h-[46px] rounded-lg border text-[13px] font-semibold ${
                    method === 'cash'
                      ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  }`}
                >
                  Tiền mặt
                </button>
                <button
                  type="button"
                  aria-pressed={method === 'transfer'}
                  onClick={() => setMethod('transfer')}
                  className={`press-tactile min-h-[46px] rounded-lg border text-[13px] font-semibold ${
                    method === 'transfer'
                      ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  }`}
                >
                  Chuyển khoản
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="collect-paid-date"
                className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]"
              >
                Ngày thanh toán
              </label>
              <input
                id="collect-paid-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="font-mono-tabular min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)]"
              />
            </div>
          </div>

          <PaymentAccountSelector
            value={paymentAccount}
            note={paymentAccountNote}
            onChangeAccount={setPaymentAccount}
            onChangeNote={setPaymentAccountNote}
          />

          <div>
            <label
              htmlFor="collect-note"
              className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]"
            >
              Ghi chú
            </label>
            <input
              id="collect-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tùy chọn"
              className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="press-tactile flex min-h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[16px] font-bold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            <span>{submitting ? 'Đang lưu...' : 'Xác nhận thu tiền'}</span>
          </button>
      </form>
    </ModalDialog>
  );
}
