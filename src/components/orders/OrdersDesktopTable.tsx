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

interface OrdersDesktopTableProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onQuickCollect: (order: Order) => void;
}

export function OrdersDesktopTable({
  orders,
  onSelectOrder,
  onQuickCollect,
}: OrdersDesktopTableProps) {
  return (
    <div className="glass-panel animate-fade-in hidden max-h-[calc(100dvh-260px)] overflow-x-auto overflow-y-auto rounded-[26px] lg:block">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead className="glass-table-head sticky top-0 z-10 text-[12px] font-semibold text-[var(--text-secondary)]">
          <tr>
            <th className="w-12 px-3 py-3.5 text-center">STT</th>
            <th className="min-w-[132px] px-3 py-3.5">Họ tên</th>
            <th className="min-w-[120px] px-3 py-3.5">Địa chỉ</th>
            <th className="min-w-[100px] px-3 py-3.5">SĐT</th>
            <th className="min-w-[92px] px-3 py-3.5">Ngày mua</th>
            <th className="min-w-[180px] px-3 py-3.5">Món hàng</th>
            <th className="min-w-[96px] px-3 py-3.5 text-right">Giá vốn</th>
            <th className="min-w-[96px] px-3 py-3.5 text-right">Giá bán</th>
            <th className="min-w-[96px] px-3 py-3.5 text-right">Lãi</th>
            <th className="min-w-[104px] px-3 py-3.5">Trạng thái</th>
            <th className="min-w-[112px] px-3 py-3.5">Tên TK</th>
            <th className="min-w-[92px] px-3 py-3.5">Ngày TT</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glass-border-subtle)]">
          {orders.map((order, idx) => {
            const profit = computeOrderProfit(order);
            const missingCost = order.payment_status !== 'cancelled' && hasMissingCostPrice(order);
            const canQuickCollect =
              (order.payment_status === 'unpaid' || order.payment_status === 'partial') &&
              Boolean(order.customer_id);

            return (
              <tr
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <td className="font-mono-tabular px-3 py-3.5 text-center text-[var(--text-secondary)]">
                  {idx + 1}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOrder(order);
                    }}
                    aria-label={`Xem chi tiết đơn ${order.order_code} của ${order.customer_name_snapshot}`}
                    className="block min-h-[44px] w-full rounded-[10px] px-1 py-1 text-left transition-colors hover:text-[var(--brand-jade-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-jade)]"
                  >
                    <span className="block font-semibold text-[var(--text-primary)]">
                      {order.customer_name_snapshot}
                    </span>
                    <span className="font-mono-tabular block text-[12px] text-[var(--text-secondary)]">
                      {order.order_code}
                    </span>
                  </button>
                </td>
                <td
                  className="max-w-[160px] truncate px-3 py-3.5 text-[var(--text-secondary)]"
                  title={order.customer_address_snapshot ?? ''}
                >
                  {order.customer_address_snapshot || '—'}
                </td>
                <td className="font-mono-tabular whitespace-nowrap px-3 py-3.5 text-[var(--text-secondary)]">
                  {order.customer_phone_snapshot || '—'}
                </td>
                <td className="font-mono-tabular whitespace-nowrap px-3 py-3.5 text-[var(--text-primary)]">
                  {formatDateVN(order.purchased_at || order.created_at)}
                </td>
                <td className="max-w-[240px] px-3 py-3.5 text-[var(--text-primary)]">
                  <span className="line-clamp-2 break-words">
                    {summarizeOrderItems(order.order_items, 3)}
                  </span>
                </td>
                <td className="font-mono-tabular whitespace-nowrap px-3 py-3.5 text-right text-[var(--text-secondary)]">
                  <div>{formatVND(order.total_cost ?? 0)}</div>
                  {missingCost && (
                    <span className="text-[12px] font-medium text-[var(--status-debt)]">
                      Chưa nhập vốn
                    </span>
                  )}
                </td>
                <td className="font-mono-tabular whitespace-nowrap px-3 py-3.5 text-right font-bold text-[var(--text-primary)]">
                  {formatVND(order.total_amount)}
                </td>
                <td
                  className={`font-mono-tabular whitespace-nowrap px-3 py-3.5 text-right font-bold ${
                    order.payment_status === 'cancelled'
                      ? 'text-[var(--text-secondary)]'
                      : profit >= 0
                        ? 'text-[var(--brand-jade-text)]'
                        : 'text-[var(--status-overdue)]'
                  }`}
                >
                  {order.payment_status === 'cancelled' ? '—' : formatVND(profit)}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5">
                  <div className="flex flex-col items-start gap-1.5">
                    <OrderStatusBadge status={order.payment_status} />
                    {canQuickCollect && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickCollect(order);
                        }}
                        className="glass-pill-jade press-tactile inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-[12px] font-semibold"
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        <span>Thu</span>
                      </button>
                    )}
                  </div>
                </td>
                <td
                  className="max-w-[140px] truncate px-3 py-3.5 text-[var(--text-primary)]"
                  title={formatPaymentAccount(order.payment_account, order.payment_account_note)}
                >
                  {formatPaymentAccount(order.payment_account, order.payment_account_note)}
                </td>
                <td className="font-mono-tabular whitespace-nowrap px-3 py-3.5 text-[var(--text-secondary)]">
                  {order.paid_at ? formatDateVN(order.paid_at) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
