'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  dateInputToVnIso,
  toVnDateInput,
} from '@/lib/ledger';
import { formatVND } from '@/lib/vietnamese';
import type { Order, OrderItem, PaymentAccount } from '@/types/database';
import { PaymentAccountSelector } from '@/components/ui/PaymentAccountSelector';
import { VndKInput } from '@/components/ui/VndKInput';

interface OrderLedgerEditModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  items: OrderItem[];
  onSaved: (updatedOrder: Order, updatedItems: OrderItem[]) => void;
}

export function OrderLedgerEditModal(props: OrderLedgerEditModalProps) {
  if (!props.open || !props.order) return null;
  return (
    <OrderLedgerEditModalBody
      key={`${props.order.id}-${props.order.updated_at}`}
      {...props}
      order={props.order}
    />
  );
}

function OrderLedgerEditModalBody({
  onClose,
  order,
  items,
  onSaved,
}: Omit<OrderLedgerEditModalProps, 'open' | 'order'> & { order: Order }) {
  const [customerName, setCustomerName] = useState(order.customer_name_snapshot);
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone_snapshot ?? '');
  const [customerAddress, setCustomerAddress] = useState(order.customer_address_snapshot ?? '');
  const [purchasedDate, setPurchasedDate] = useState(
    toVnDateInput(order.purchased_at || order.created_at)
  );
  const [paidDate, setPaidDate] = useState(toVnDateInput(order.paid_at));
  const [paymentAccount, setPaymentAccount] = useState<PaymentAccount | null>(
    order.payment_account ?? null
  );
  const [paymentAccountNote, setPaymentAccountNote] = useState(order.payment_account_note ?? '');
  const [note, setNote] = useState(order.note ?? '');

  // Per-item unit cost_price map (exact VND or null)
  const [itemCostMap, setItemCostMap] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {};
    for (const item of items) {
      initial[item.id] = item.cost_price;
    }
    return initial;
  });
  const [fallbackTotalCost, setFallbackTotalCost] = useState<number | null>(order.total_cost);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewTotalCost =
    items.length > 0
      ? items.reduce((sum, item) => {
          const unitCost = itemCostMap[item.id];
          if (unitCost === null || unitCost === undefined) return sum;
          return sum + Math.max(0, Math.round(Number(item.quantity) * unitCost));
        }, 0)
      : Math.max(0, Math.round(fallbackTotalCost ?? 0));

  const previewProfit =
    order.payment_status === 'cancelled' ? 0 : order.total_amount - previewTotalCost;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    if (!customerName.trim()) {
      setError('Vui lòng nhập họ tên người mua');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const purchasedIso = dateInputToVnIso(purchasedDate);
      const paidIso = paidDate.trim() ? dateInputToVnIso(paidDate) : null;

      const itemCostsPayload =
        items.length > 0
          ? items.map((item) => ({
              id: item.id,
              cost_price: itemCostMap[item.id] ?? null,
            }))
          : null;

      const { data, error: rpcErr } = await supabase.rpc('update_order_ledger_fields', {
        p_order_id: order.id,
        p_customer_name_snapshot: customerName.trim(),
        p_customer_address_snapshot: customerAddress.trim(),
        p_customer_phone_snapshot: customerPhone.trim(),
        p_purchased_at: purchasedIso,
        p_paid_at: paidIso,
        p_clear_paid_at: !paidDate.trim(),
        p_payment_account: paymentAccount,
        p_clear_payment_account: paymentAccount === null,
        p_payment_account_note:
          paymentAccount === 'Khác' ? paymentAccountNote.trim() || '' : '',
        p_total_cost: items.length > 0 ? null : previewTotalCost,
        p_item_costs: itemCostsPayload,
        p_note: note.trim(),
      });

      if (rpcErr) throw rpcErr;

      const updatedItems: OrderItem[] = items.map((item) => ({
        ...item,
        cost_price: itemCostMap[item.id] ?? null,
      }));
      const updatedOrder: Order = {
        ...order,
        ...(data as Partial<Order>),
        order_items: updatedItems,
      };
      onSaved(updatedOrder, updatedItems);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật sổ đơn hàng');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Sửa sổ đơn ${order.order_code}`}
    >
      <div className="animate-sheet-up sm:animate-modal-in max-h-[92dvh] w-full max-w-[540px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-bold text-[var(--text-primary)]">
              Sửa sổ — {order.order_code}
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
            <div className="rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-3 py-2 text-[14px] text-[var(--status-overdue)]">
              {error}
            </div>
          )}

          {/* Buyer Snapshot */}
          <div className="space-y-2.5">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                Họ tên người mua *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                  SĐT
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="090..."
                  className="font-mono-tabular min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Địa chỉ giao hàng..."
                  className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
                Ngày mua hàng
              </label>
              <input
                type="date"
                value={purchasedDate}
                onChange={(e) => setPurchasedDate(e.target.value)}
                className="font-mono-tabular min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">
                  Ngày thanh toán
                </label>
                {paidDate && (
                  <button
                    type="button"
                    onClick={() => setPaidDate('')}
                    className="min-h-[44px] text-[12px] font-semibold text-[var(--text-secondary)] hover:underline"
                  >
                    Xóa ngày
                  </button>
                )}
              </div>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="font-mono-tabular min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)]"
              />
            </div>
          </div>

          {/* 9 Payment Account Selector */}
          <PaymentAccountSelector
            value={paymentAccount}
            note={paymentAccountNote}
            onChangeAccount={setPaymentAccount}
            onChangeNote={setPaymentAccountNote}
          />

          {/* Item Cost Price Editor */}
          <div className="space-y-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="font-semibold text-[var(--text-primary)]">
                Giá vốn (nghìn / đơn vị)
              </span>
              <span className="font-mono-tabular text-[var(--text-secondary)]">
                Vốn: <strong className="text-[var(--text-primary)]">{formatVND(previewTotalCost)}</strong>{' '}
                · Lãi:{' '}
                <strong
                  className={
                    previewProfit >= 0 ? 'text-[var(--brand-jade-text)]' : 'text-[var(--status-overdue)]'
                  }
                >
                  {formatVND(previewProfit)}
                </strong>
              </span>
            </div>

            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                        {item.product_name}
                      </p>
                      <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                        SL {Number(item.quantity)} {item.unit} · Bán {formatVND(item.unit_price)}
                      </p>
                    </div>
                    <VndKInput
                      compact
                      align="right"
                      valueVnd={itemCostMap[item.id] ?? null}
                      onChangeVnd={(val) =>
                        setItemCostMap((prev) => ({ ...prev, [item.id]: val }))
                      }
                      ariaLabel={`Giá vốn ${item.product_name}`}
                      placeholder="0"
                      className="w-36 shrink-0"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <VndKInput
                valueVnd={fallbackTotalCost}
                onChangeVnd={setFallbackTotalCost}
                ariaLabel="Tổng giá vốn đơn"
                placeholder="0"
                showPreview
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]">
              Ghi chú
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tùy chọn"
              className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="press-tactile flex min-h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[16px] font-bold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
