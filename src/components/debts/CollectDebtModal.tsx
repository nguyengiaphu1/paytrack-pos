'use client';

import { useState, type FormEvent } from 'react';
import { Banknote, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatVND } from '@/lib/vietnamese';
import type { Customer, DebtPaymentMethod, Order } from '@/types/database';

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
  const [amountInput, setAmountInput] = useState<string>(String(initialAmt));
  const [method, setMethod] = useState<DebtPaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOrder = unpaidOrders.find((o) => o.id === targetOrderId) ?? null;
  const maxAllowed = selectedOrder ? selectedOrder.remaining_amount : customer.total_debt;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Đang mất kết nối mạng — không thể ghi nhận thu nợ lên cloud.');
      return;
    }

    const parsedAmount = Math.round(Number(amountInput));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Số tiền thu phải lớn hơn 0đ');
      return;
    }
    if (parsedAmount > maxAllowed) {
      setError(
        `Số tiền thu (${formatVND(parsedAmount)}) vượt quá số nợ hiện tại (${formatVND(maxAllowed)})`
      );
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: rpcErr } = await supabase.rpc('record_debt_payment', {
        p_customer_id: customer.id,
        p_amount: parsedAmount,
        p_payment_method: method,
        p_order_id: targetOrderId || null,
        p_note: note.trim() || null,
      });

      if (rpcErr) throw rpcErr;
      onCollected();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể ghi nhận thu nợ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Thu nợ khách hàng"
    >
      <div className="w-full max-w-[460px] rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-[var(--brand-jade)]" />
            <h2 className="text-[17px] font-bold">Thu nợ — {customer.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {error && (
            <div className="rounded-lg border border-[#FCA5A5] bg-[var(--status-overdue-bg)] px-3 py-2.5 text-[14px] font-medium text-[var(--status-overdue)]">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--text-secondary)]">
                {selectedOrder ? `Còn nợ đơn ${selectedOrder.order_code}` : 'Tổng nợ khách hàng'}
              </span>
              <span className="font-mono-tabular text-[19px] font-bold text-[var(--status-debt)]">
                {formatVND(maxAllowed)}
              </span>
            </div>
          </div>

          {unpaidOrders.length > 1 && (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--text-secondary)]">
                Phân bổ tiền thu vào
              </label>
              <select
                value={targetOrderId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setTargetOrderId(nextId);
                  const found = unpaidOrders.find((o) => o.id === nextId);
                  setAmountInput(String(found ? found.remaining_amount : customer.total_debt));
                }}
                className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3"
              >
                <option value="">Tự động trừ đơn cũ nhất trước (FIFO)</option>
                {unpaidOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    Riêng đơn {o.order_code} (còn {formatVND(o.remaining_amount)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[14px] font-medium">Số tiền khách trả (VND) *</label>
              <button
                type="button"
                onClick={() => setAmountInput(String(maxAllowed))}
                className="text-[13px] font-semibold text-[var(--brand-jade)] hover:underline"
              >
                Trả hết ({formatVND(maxAllowed)})
              </button>
            </div>
            <input
              type="number"
              required
              min={1}
              max={maxAllowed}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="font-mono-tabular min-h-[48px] w-full rounded-lg border border-[var(--border-default)] px-3.5 text-[17px] font-bold outline-none focus:border-[var(--brand-jade)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[14px] font-medium">Phương thức nhận tiền</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`min-h-[46px] rounded-lg border text-[14px] font-semibold ${
                  method === 'cash'
                    ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                }`}
              >
                Tiền mặt
              </button>
              <button
                type="button"
                onClick={() => setMethod('transfer')}
                className={`min-h-[46px] rounded-lg border text-[14px] font-semibold ${
                  method === 'transfer'
                    ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                }`}
              >
                Chuyển khoản
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium">Ghi chú (tùy chọn)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Chuyển VCB / Trả tiền mặt tại quầy"
              className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] px-3.5 outline-none focus:border-[var(--brand-jade)]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[16px] font-bold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            <span>Xác nhận đã thu nợ</span>
          </button>
        </form>
      </div>
    </div>
  );
}
