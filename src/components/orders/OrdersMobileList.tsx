'use client';

import { Banknote } from 'lucide-react';
import { formatDateVN, formatVND } from '@/lib/vietnamese';
import {
  computeOrderProfit,
  formatPaymentAccount,
  hasMissingCostPrice,
  summarizeOrderItems,
} from '@/lib/ledger';
import type { Order } from '@/types/database';
import { OrderStatusBadge } from '@/components/ui/OrderStatusBadge';

interface OrdersMobileListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onQuickCollect: (order: Order) => void;
}

export function OrdersMobileList({
  orders,
  onSelectOrder,
  onQuickCollect,
}: OrdersMobileListProps) {
  return (
    <div className="animate-fade-in space-y-3 lg:hidden">
      {orders.map((order, idx) => {
        const profit = computeOrderProfit(order);
        const missingCost = order.payment_status !== 'cancelled' && hasMissingCostPrice(order);
        const canQuickCollect =
          (order.payment_status === 'unpaid' || order.payment_status === 'partial') &&
          Boolean(order.customer_id);

        return (
          <article key={order.id} className="glass-card glass-card-interactive rounded-[22px] p-4">
            <button
              type="button"
              onClick={() => onSelectOrder(order)}
              aria-label={`Xem chi tiết đơn ${order.order_code} của ${order.customer_name_snapshot}`}
              className="block w-full rounded-[16px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-jade)]"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono-tabular text-[12px] font-semibold text-[var(--text-secondary)]">
                      #{idx + 1}
                    </span>
                    <span className="truncate text-[15px] font-bold text-[var(--text-primary)]">
                      {order.customer_name_snapshot}
                    </span>
                    <OrderStatusBadge status={order.payment_status} />
                  </div>
                  {(order.customer_phone_snapshot || order.customer_address_snapshot) && (
                    <p className="mt-1 truncate text-[12px] text-[var(--text-secondary)]">
                      {order.customer_phone_snapshot ? (
                        <span className="font-mono-tabular">{order.customer_phone_snapshot}</span>
                      ) : null}
                      {order.customer_phone_snapshot && order.customer_address_snapshot
                        ? ' · '
                        : ''}
                      {order.customer_address_snapshot ?? ''}
                    </p>
                  )}
                </div>
                <span className="font-mono-tabular shrink-0 text-[16px] font-bold text-[var(--text-primary)]">
                  {formatVND(order.total_amount)}
                </span>
              </div>

              <p className="mt-2.5 line-clamp-2 break-words text-[13px] text-[var(--text-primary)]">
                {summarizeOrderItems(order.order_items, 3)}
              </p>

              {/* Recessed Cost / Sale / Profit Tray */}
              <div className="glass-well mt-3 grid grid-cols-3 gap-2 rounded-[16px] px-3 py-2.5 text-[12px]">
                <div className="min-w-0">
                  <span className="block text-[12px] text-[var(--text-secondary)]">Giá vốn</span>
                  <span className="font-mono-tabular block truncate font-semibold text-[var(--text-primary)]">
                    {formatVND(order.total_cost ?? 0)}
                  </span>
                  {missingCost && (
                    <span className="text-[12px] font-semibold text-[var(--status-debt)]">
                      Chưa nhập vốn
                    </span>
                  )}
                </div>
                <div className="min-w-0 text-center">
                  <span className="block text-[12px] text-[var(--text-secondary)]">Giá bán</span>
                  <span className="font-mono-tabular block truncate font-bold text-[var(--text-primary)]">
                    {formatVND(order.total_amount)}
                  </span>
                </div>
                <div className="min-w-0 text-right">
                  <span className="block text-[12px] text-[var(--text-secondary)]">Lãi</span>
                  <span
                    className={`font-mono-tabular block truncate font-bold ${
                      order.payment_status === 'cancelled'
                        ? 'text-[var(--text-secondary)]'
                        : profit >= 0
                          ? 'text-[var(--brand-jade-text)]'
                          : 'text-[var(--status-overdue)]'
                    }`}
                  >
                    {order.payment_status === 'cancelled' ? '—' : formatVND(profit)}
                  </span>
                </div>
              </div>
            </button>

            {/* Footer Metadata + Quick Collect (sibling of detail trigger, zero nested interactives) */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <span className="font-mono-tabular">
                  Mua {formatDateVN(order.purchased_at || order.created_at)}
                </span>
                <span className="truncate font-medium text-[var(--text-primary)]">
                  TK: {formatPaymentAccount(order.payment_account, order.payment_account_note)}
                </span>
                {order.paid_at && (
                  <span className="font-mono-tabular">TT {formatDateVN(order.paid_at)}</span>
                )}
              </div>

              {canQuickCollect && (
                <button
                  type="button"
                  onClick={() => onQuickCollect(order)}
                  className="glass-pill-jade press-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
                >
                  <Banknote className="h-4 w-4" />
                  <span>Thu tiền</span>
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
