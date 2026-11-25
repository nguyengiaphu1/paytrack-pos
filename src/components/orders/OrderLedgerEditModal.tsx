'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  dateInputToVnIso,
  toVnDateInput,
} from '@/lib/ledger';
import { formatVND } from '@/lib/vietnamese';
import { formatErrorMessageVN } from '@/lib/errors';
import type { Order, OrderItem, PaymentAccount } from '@/types/database';
import { PaymentAccountSelector } from '@/components/ui/PaymentAccountSelector';
import { VndKInput } from '@/components/ui/VndKInput';
import { ModalDialog } from '@/components/ui/ModalDialog';

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
      setError(formatErrorMessageVN(err, 'Không thể cập nhật sổ đơn hàng'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalDialog
      open={true}
      onClose={onClose}
      ariaLabelledBy="order-ledger-edit-title"
      backdropClassName="glass-backdrop animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      panelClassName="glass-modal animate-sheet-up sm:animate-modal-in flex max-h-[92dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
    >
      <div className="glass-modal-header flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2
            id="order-ledger-edit-title"
            className="truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            Sửa sổ — {order.order_code}
          </h2>
          <p className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">
            Cập nhật thông tin khách, ngày, tài khoản nhận & giá vốn
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {error && (
            <div
              role="alert"
              className="glass-badge-overdue rounded-[14px] px-3.5 py-2.5 text-[14px] font-medium"
            >
              {error}
            </div>
          )}

          {/* Buyer Snapshot */}
          <div className="glass-well space-y-3 rounded-[18px] p-3.5">
            <div>
              <label
                htmlFor="ledger-edit-customer-name"
                className="mb-1.5 block text-[13px] font-semibold text-[var(--text-primary)]"
              >
                Họ tên người mua *
              </label>
              <input
                id="ledger-edit-customer-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="ledger-edit-customer-phone"
                  className="mb-1.5 block text-[13px] font-semibold text-[var(--text-primary)]"
                >
                  SĐT
                </label>
                <input
                  id="ledger-edit-customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="090..."
                  className="glass-input font-mono-tabular min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="ledger-edit-customer-address"
                  className="mb-1.5 block text-[13px] font-semibold text-[var(--text-primary)]"
                >
                  Địa chỉ
                </label>
                <input
                  id="ledger-edit-customer-address"
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Địa chỉ giao hàng..."
                  className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="mb-1.5 flex min-h-[44px] items-center">
                <label
                  htmlFor="ledger-edit-purchased-date"
                  className="text-[13px] font-semibold text-[var(--text-primary)]"
                >
                  Ngày mua hàng
                </label>
              </div>
              <input
                id="ledger-edit-purchased-date"
                type="date"
                value={purchasedDate}
                onChange={(e) => setPurchasedDate(e.target.value)}
                className="glass-input font-mono-tabular min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
              />
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex min-h-[44px] items-center justify-between gap-2">
                <label
                  htmlFor="ledger-edit-paid-date"
                  className="text-[13px] font-semibold text-[var(--text-primary)]"
                >
                  Ngày thanh toán
                </label>
                {paidDate && (
                  <button
                    type="button"
                    onClick={() => setPaidDate('')}
                    className="press-tactile min-h-[44px] rounded-full px-2.5 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  >
                    Xóa ngày
                  </button>
                )}
              </div>
              <input
                id="ledger-edit-paid-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="glass-input font-mono-tabular min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
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
          <div className="glass-well space-y-3 rounded-[18px] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="font-semibold text-[var(--text-primary)]">
                Giá vốn (nghìn / đơn vị)
              </span>
              <span className="font-mono-tabular text-[var(--text-secondary)]">
                Vốn:{' '}
                <strong className="text-[var(--text-primary)]">
                  {formatVND(previewTotalCost)}
                </strong>{' '}
                · Lãi:{' '}
                <strong
                  className={
                    previewProfit >= 0
                      ? 'text-[var(--brand-jade-text)]'
                      : 'text-[var(--status-overdue)]'
                  }
                >
                  {formatVND(previewProfit)}
                </strong>
              </span>
            </div>

            {items.length > 0 ? (
              <div className="space-y-2.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card flex flex-wrap items-center justify-between gap-2.5 rounded-[16px] px-3.5 py-2.5"
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
            <label
              htmlFor="ledger-edit-note"
              className="mb-1.5 block text-[13px] font-semibold text-[var(--text-primary)]"
            >
              Ghi chú
            </label>
            <input
              id="ledger-edit-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tùy chọn"
              className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
            />
          </div>
        </div>

        <div className="glass-modal-footer shrink-0 px-5 py-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] sm:pb-3.5">
          <button
            type="submit"
            disabled={saving}
            className="glass-btn-primary press-tactile flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full px-4 text-[16px] font-bold disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
