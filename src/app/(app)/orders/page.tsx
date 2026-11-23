'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Download,
  Loader2,
  Pencil,
  QrCode,
  ReceiptText,
  Search,
  ShoppingBag,
  X,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  formatDateTimeVN,
  formatDateVN,
  formatVND,
  getTodayVN,
  stripVietnamese,
} from '@/lib/vietnamese';
import {
  PAYMENT_ACCOUNTS,
  buildLedgerCsv,
  computeLedgerTotals,
  computeOrderProfit,
  formatPaymentAccount,
  hasMissingCostPrice,
  summarizeOrderItems,
} from '@/lib/ledger';
import { usePosData } from '@/components/providers/PosDataProvider';
import type {
  Customer,
  Order,
  OrderItem,
  PaymentAccount,
  PaymentStatus,
} from '@/types/database';
import { VietQRModal } from '@/components/qr/VietQRModal';
import { InvoicePreviewModal } from '@/components/invoice/InvoicePreviewModal';
import { CollectDebtModal } from '@/components/debts/CollectDebtModal';
import { OrderLedgerEditModal } from '@/components/orders/OrderLedgerEditModal';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { FetchErrorCard, OrdersPageSkeleton } from '@/components/ui/PageSkeletons';

const STATUS_LABELS: Record<PaymentStatus, { label: string; className: string }> = {
  paid: {
    label: 'Đã trả',
    className: 'bg-[var(--status-paid-bg)] text-[var(--status-paid)]',
  },
  partial: {
    label: 'Trả 1 phần',
    className: 'bg-[var(--status-debt-bg)] text-[var(--status-debt)]',
  },
  unpaid: {
    label: 'Chưa trả',
    className: 'bg-[var(--status-debt-bg)] text-[var(--status-debt)]',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] line-through',
  },
};

type AccountFilter = 'ALL' | 'NONE' | PaymentAccount;

export default function OrdersPage() {
  const {
    orders,
    ordersLoaded,
    ordersError,
    hasMoreOrders,
    loadingMoreOrders,
    customers,
    profile,
    ensureOrders,
    ensureCustomers,
    refreshOrders,
    loadMoreOrders,
    upsertOrderLocal,
    invalidateAfterMutation,
  } = usePosData();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('ALL');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [collectTargetOrder, setCollectTargetOrder] = useState<Order | null>(null);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  useEffect(() => {
    void ensureOrders();
    void ensureCustomers();
  }, [ensureOrders, ensureCustomers]);

  async function openOrderDetail(order: Order) {
    setSelectedOrder(order);
    setCancelConfirmOpen(false);
    setCancelError(null);
    if (order.order_items && order.order_items.length > 0) {
      setSelectedItems(order.order_items);
      setLoadingItems(false);
      return;
    }
    setLoadingItems(true);
    const supabase = createClient();
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    setSelectedItems((data as OrderItem[]) ?? []);
    setLoadingItems(false);
  }

  async function handleConfirmCancel() {
    if (!selectedOrder || cancelling) return;
    setCancelError(null);
    setCancelling(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('cancel_order', {
        p_order_id: selectedOrder.id,
      });
      if (error) throw error;

      setCancelConfirmOpen(false);
      setSelectedOrder((prev) => (prev ? { ...prev, payment_status: 'cancelled' } : null));
      invalidateAfterMutation();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Không thể hủy đơn hàng');
    } finally {
      setCancelling(false);
    }
  }

  const loading = !ordersLoaded && !ordersError;

  const filtered = useMemo(() => {
    const q = stripVietnamese(query);
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.payment_status !== statusFilter) return false;
      if (accountFilter === 'NONE' && o.payment_account !== null) return false;
      if (accountFilter !== 'ALL' && accountFilter !== 'NONE' && o.payment_account !== accountFilter) {
        return false;
      }
      if (q) {
        const itemsSummary = summarizeOrderItems(o.order_items);
        const hay = stripVietnamese(
          `${o.order_code} ${o.customer_name_snapshot} ${o.customer_phone_snapshot ?? ''} ${o.customer_address_snapshot ?? ''} ${itemsSummary} ${o.payment_account ?? ''} ${o.payment_account_note ?? ''}`
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, query, statusFilter, accountFilter]);

  const totals = useMemo(() => computeLedgerTotals(filtered), [filtered]);
  const hasActiveFilter =
    Boolean(query.trim()) || statusFilter !== 'ALL' || accountFilter !== 'ALL';

  function handleExportCsv() {
    const csv = buildLedgerCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `so-ban-hang-${getTodayVN()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const collectCustomer: Customer | null = useMemo(() => {
    if (!collectTargetOrder || !collectTargetOrder.customer_id) return null;
    const found = customers.find((c) => c.id === collectTargetOrder.customer_id);
    if (found) return found;
    return {
      id: collectTargetOrder.customer_id,
      user_id: collectTargetOrder.user_id,
      name: collectTargetOrder.customer_name_snapshot,
      search_text: stripVietnamese(collectTargetOrder.customer_name_snapshot),
      phone: collectTargetOrder.customer_phone_snapshot,
      address: collectTargetOrder.customer_address_snapshot,
      note: null,
      total_debt: collectTargetOrder.remaining_amount,
      next_due_date: collectTargetOrder.debt_due_date,
      created_at: collectTargetOrder.created_at,
      updated_at: collectTargetOrder.updated_at,
    };
  }, [collectTargetOrder, customers]);

  const collectCustomerUnpaidOrders = useMemo(() => {
    if (!collectTargetOrder || !collectTargetOrder.customer_id) return [];
    const list = orders.filter(
      (o) =>
        o.customer_id === collectTargetOrder.customer_id &&
        (o.payment_status === 'unpaid' || o.payment_status === 'partial')
    );
    return list.some((o) => o.id === collectTargetOrder.id) ? list : [collectTargetOrder, ...list];
  }, [collectTargetOrder, orders]);

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-6 lg:py-5">
      {/* Header + CSV Export */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)] lg:text-[24px]">
          Sổ bán hàng
        </h1>
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <Download className="h-4 w-4 text-[var(--brand-jade-text)]" />
            <span>Xuất CSV</span>
          </button>
        )}
      </div>

      {/* Totals Summary Bar */}
      {!loading && !ordersError && (
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
            <p className="text-[12px] text-[var(--text-secondary)]">
              Tổng giá bán ({totals.activeCount} đơn)
            </p>
            <p className="font-mono-tabular mt-0.5 truncate text-[17px] font-bold text-[var(--text-primary)] sm:text-[19px]">
              {formatVND(totals.totalRevenue)}
            </p>
          </div>
          <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
            <p className="text-[12px] text-[var(--text-secondary)]">Tổng giá vốn</p>
            <p className="font-mono-tabular mt-0.5 truncate text-[17px] font-bold text-[var(--text-secondary)] sm:text-[19px]">
              {formatVND(totals.totalCost)}
            </p>
          </div>
          <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
            <p className="text-[12px] text-[var(--text-secondary)]">Tổng lãi</p>
            <p
              className={`font-mono-tabular mt-0.5 truncate text-[17px] font-bold sm:text-[19px] ${
                totals.totalProfit >= 0
                  ? 'text-[var(--brand-jade-text)]'
                  : 'text-[var(--status-overdue)]'
              }`}
            >
              {formatVND(totals.totalProfit)}
            </p>
          </div>
          <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
            <p className="text-[12px] text-[var(--text-secondary)]">Còn nợ</p>
            <p className="font-mono-tabular mt-0.5 truncate text-[17px] font-bold text-[var(--status-debt)] sm:text-[19px]">
              {formatVND(totals.totalRemainingDebt)}
            </p>
          </div>
        </div>
      )}

      {/* Search + Status + 9 Payment Account Filters */}
      <div className="mb-4 space-y-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-[380px]">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên khách, SĐT, địa chỉ, món hàng..."
              className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pr-3.5 pl-10 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['ALL', 'Tất cả'],
                ['paid', 'Đã trả'],
                ['partial', 'Trả 1 phần'],
                ['unpaid', 'Chưa trả'],
                ['cancelled', 'Đã hủy'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`press-tactile min-h-[44px] rounded-lg border px-3 text-[13px] font-semibold transition-colors ${
                  statusFilter === key
                    ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 9 Payment Account Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAccountFilter('ALL')}
            className={`press-tactile min-h-[44px] rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
              accountFilter === 'ALL'
                ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
                : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            Tất cả TK
          </button>
          {PAYMENT_ACCOUNTS.map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => setAccountFilter(acc)}
              className={`press-tactile min-h-[44px] rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
                accountFilter === acc
                  ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {acc}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAccountFilter('NONE')}
            className={`press-tactile min-h-[44px] rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
              accountFilter === 'NONE'
                ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
                : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            Chưa có TK
          </button>
        </div>
      </div>

      {/* Ledger Table / Cards */}
      {ordersError && !ordersLoaded ? (
        <FetchErrorCard
          title="Chưa tải được sổ bán hàng"
          message={ordersError}
          onRetry={() => void refreshOrders()}
        />
      ) : loading ? (
        <OrdersPageSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyStateCard
          icon={hasActiveFilter ? Search : ShoppingBag}
          title={hasActiveFilter ? 'Không có đơn khớp bộ lọc' : 'Chưa có đơn hàng'}
          action={
            hasActiveFilter ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('ALL');
                  setAccountFilter('ALL');
                }}
                className="press-tactile inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                Xóa bộ lọc
              </button>
            ) : (
              <Link
                href="/"
                className="press-tactile inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
              >
                Bán hàng
              </Link>
            )
          }
        />
      ) : (
        <>
          {/* Desktop 12-Column Table (>= 1024px) */}
          <div className="animate-fade-in hidden overflow-x-auto rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] lg:block">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] text-[12px] font-semibold text-[var(--text-secondary)]">
                <tr>
                  <th className="w-12 px-2.5 py-3 text-center">STT</th>
                  <th className="min-w-[128px] px-2.5 py-3">Họ tên</th>
                  <th className="min-w-[120px] px-2.5 py-3">Địa chỉ</th>
                  <th className="min-w-[100px] px-2.5 py-3">SĐT</th>
                  <th className="min-w-[92px] px-2.5 py-3">Ngày mua</th>
                  <th className="min-w-[180px] px-2.5 py-3">Món hàng</th>
                  <th className="min-w-[96px] px-2.5 py-3 text-right">Giá vốn</th>
                  <th className="min-w-[96px] px-2.5 py-3 text-right">Giá bán</th>
                  <th className="min-w-[96px] px-2.5 py-3 text-right">Lãi</th>
                  <th className="min-w-[96px] px-2.5 py-3">Trạng thái</th>
                  <th className="min-w-[110px] px-2.5 py-3">Tên TK</th>
                  <th className="min-w-[92px] px-2.5 py-3">Ngày TT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {filtered.map((order, idx) => {
                  const badge = STATUS_LABELS[order.payment_status];
                  const profit = computeOrderProfit(order);
                  const missingCost =
                    order.payment_status !== 'cancelled' && hasMissingCostPrice(order);
                  const canQuickCollect =
                    (order.payment_status === 'unpaid' || order.payment_status === 'partial') &&
                    Boolean(order.customer_id);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => void openOrderDetail(order)}
                      className="cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
                    >
                      <td className="font-mono-tabular px-2.5 py-3 text-center text-[var(--text-secondary)]">
                        {idx + 1}
                      </td>
                      <td className="px-2.5 py-3">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {order.customer_name_snapshot}
                        </p>
                        <p className="font-mono-tabular text-[11px] text-[var(--text-secondary)]">
                          {order.order_code}
                        </p>
                      </td>
                      <td className="max-w-[160px] truncate px-2.5 py-3 text-[var(--text-secondary)]" title={order.customer_address_snapshot ?? ''}>
                        {order.customer_address_snapshot || '—'}
                      </td>
                      <td className="font-mono-tabular whitespace-nowrap px-2.5 py-3 text-[var(--text-secondary)]">
                        {order.customer_phone_snapshot || '—'}
                      </td>
                      <td className="font-mono-tabular whitespace-nowrap px-2.5 py-3 text-[var(--text-primary)]">
                        {formatDateVN(order.purchased_at || order.created_at)}
                      </td>
                      <td className="max-w-[240px] px-2.5 py-3 text-[var(--text-primary)]">
                        <span className="line-clamp-2 break-words">
                          {summarizeOrderItems(order.order_items, 3)}
                        </span>
                      </td>
                      <td className="font-mono-tabular whitespace-nowrap px-2.5 py-3 text-right text-[var(--text-secondary)]">
                        <div>{formatVND(order.total_cost ?? 0)}</div>
                        {missingCost && (
                          <span className="text-[11px] font-medium text-[var(--status-debt)]">
                            Chưa đủ vốn
                          </span>
                        )}
                      </td>
                      <td className="font-mono-tabular whitespace-nowrap px-2.5 py-3 text-right font-bold text-[var(--text-primary)]">
                        {formatVND(order.total_amount)}
                      </td>
                      <td
                        className={`font-mono-tabular whitespace-nowrap px-2.5 py-3 text-right font-bold ${
                          order.payment_status === 'cancelled'
                            ? 'text-[var(--text-secondary)]'
                            : profit >= 0
                              ? 'text-[var(--brand-jade-text)]'
                              : 'text-[var(--status-overdue)]'
                        }`}
                      >
                        {order.payment_status === 'cancelled' ? '—' : formatVND(profit)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          {canQuickCollect && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCollectTargetOrder(order);
                              }}
                              className="press-tactile inline-flex min-h-[44px] items-center gap-1 rounded-md border border-[var(--brand-jade)] px-2 text-[11px] font-semibold text-[var(--brand-jade-text)] hover:bg-[var(--status-paid-bg)]"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              Thu
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[140px] truncate px-2.5 py-3 text-[var(--text-primary)]" title={formatPaymentAccount(order.payment_account, order.payment_account_note)}>
                        {formatPaymentAccount(order.payment_account, order.payment_account_note)}
                      </td>
                      <td className="font-mono-tabular whitespace-nowrap px-2.5 py-3 text-[var(--text-secondary)]">
                        {order.paid_at ? formatDateVN(order.paid_at) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Ledger (< 1024px, zero horizontal overflow at 375px) */}
          <div className="animate-fade-in space-y-2.5 lg:hidden">
            {filtered.map((order, idx) => {
              const badge = STATUS_LABELS[order.payment_status];
              const profit = computeOrderProfit(order);
              const missingCost =
                order.payment_status !== 'cancelled' && hasMissingCostPrice(order);
              const canQuickCollect =
                (order.payment_status === 'unpaid' || order.payment_status === 'partial') &&
                Boolean(order.customer_id);

              return (
                <div
                  key={order.id}
                  onClick={() => void openOrderDetail(order)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') void openOrderDetail(order);
                  }}
                  className="press-tactile rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5 transition-colors hover:border-[var(--brand-jade)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono-tabular text-[12px] font-semibold text-[var(--text-secondary)]">
                          #{idx + 1}
                        </span>
                        <span className="truncate text-[15px] font-bold text-[var(--text-primary)]">
                          {order.customer_name_snapshot}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      {(order.customer_phone_snapshot || order.customer_address_snapshot) && (
                        <p className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">
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

                  {/* Items Summary */}
                  <p className="mt-2 line-clamp-2 break-words text-[13px] text-[var(--text-primary)]">
                    {summarizeOrderItems(order.order_items, 3)}
                  </p>

                  {/* Cost / Sale / Profit Strip */}
                  <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-[var(--bg-subtle)] px-2.5 py-2 text-[12px]">
                    <div className="min-w-0">
                      <span className="block text-[11px] text-[var(--text-secondary)]">Giá vốn</span>
                      <span className="font-mono-tabular block truncate font-semibold text-[var(--text-primary)]">
                        {formatVND(order.total_cost ?? 0)}
                      </span>
                      {missingCost && (
                        <span className="text-[10px] font-semibold text-[var(--status-debt)]">
                          Thiếu vốn
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 text-center">
                      <span className="block text-[11px] text-[var(--text-secondary)]">Giá bán</span>
                      <span className="font-mono-tabular block truncate font-bold text-[var(--text-primary)]">
                        {formatVND(order.total_amount)}
                      </span>
                    </div>
                    <div className="min-w-0 text-right">
                      <span className="block text-[11px] text-[var(--text-secondary)]">Lãi</span>
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

                  {/* Footer Metadata + Quick Collect */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <span className="font-mono-tabular">
                        Mua {formatDateVN(order.purchased_at || order.created_at)}
                      </span>
                      <span className="truncate font-medium text-[var(--text-primary)]">
                        TK: {formatPaymentAccount(order.payment_account, order.payment_account_note)}
                      </span>
                      {order.paid_at && (
                        <span className="font-mono-tabular">
                          TT {formatDateVN(order.paid_at)}
                        </span>
                      )}
                    </div>

                    {canQuickCollect && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollectTargetOrder(order);
                        }}
                        className="press-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg border border-[var(--brand-jade)] bg-[var(--bg-surface)] px-3 text-[12px] font-semibold text-[var(--brand-jade-text)] hover:bg-[var(--status-paid-bg)]"
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        <span>Thu tiền</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {hasMoreOrders && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={loadingMoreOrders}
                onClick={() => void loadMoreOrders()}
                className="press-tactile inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
              >
                {loadingMoreOrders && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{loadingMoreOrders ? 'Đang tải...' : 'Tải thêm đơn cũ'}</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="animate-backdrop-in fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết đơn ${selectedOrder.order_code}`}
        >
          <div className="animate-sheet-up sm:animate-modal-in max-h-[92dvh] w-full max-w-[540px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-mono-tabular text-[17px] font-bold">
                  {selectedOrder.order_code}
                </h2>
                <p className="truncate text-[12px] text-[var(--text-secondary)]">
                  {selectedOrder.customer_name_snapshot} · Mua{' '}
                  {formatDateVN(selectedOrder.purchased_at || selectedOrder.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Đóng"
                className="press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              {/* 12-field Metadata Summary */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3 text-[13px]">
                <div>
                  <span className="block text-[11px] text-[var(--text-secondary)]">SĐT</span>
                  <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
                    {selectedOrder.customer_phone_snapshot || '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--text-secondary)]">Địa chỉ</span>
                  <span className="break-words font-medium text-[var(--text-primary)]">
                    {selectedOrder.customer_address_snapshot || '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--text-secondary)]">Tên TK</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatPaymentAccount(
                      selectedOrder.payment_account,
                      selectedOrder.payment_account_note
                    )}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--text-secondary)]">Ngày TT</span>
                  <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
                    {selectedOrder.paid_at ? formatDateVN(selectedOrder.paid_at) : '—'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[11px] text-[var(--text-secondary)]">Ngày tạo hệ thống</span>
                  <span className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                    {formatDateTimeVN(selectedOrder.created_at)}
                  </span>
                </div>
              </div>

              {loadingItems ? (
                <div className="space-y-2 rounded-lg border border-[var(--border-default)] p-3.5">
                  <div className="skeleton-shimmer h-5 w-3/4 rounded" />
                  <div className="skeleton-shimmer h-4 w-1/2 rounded" />
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-default)] rounded-lg border border-[var(--border-default)]">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[14px]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold">{item.product_name}</p>
                        <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                          {Number(item.quantity)} {item.unit} × {formatVND(item.unit_price)}
                          {item.cost_price !== null
                            ? ` · Vốn ${formatVND(item.cost_price)}`
                            : ' · Chưa nhập vốn'}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono-tabular font-bold">
                        {formatVND(item.line_total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Breakdown */}
              <div className="space-y-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5 text-[14px]">
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Giá bán</span>
                  <span className="shrink-0 font-mono-tabular font-bold">
                    {formatVND(selectedOrder.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Giá vốn</span>
                  <span className="shrink-0 font-mono-tabular font-semibold text-[var(--text-secondary)]">
                    {formatVND(selectedOrder.total_cost ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Lãi</span>
                  <span className="shrink-0 font-mono-tabular font-bold text-[var(--brand-jade-text)]">
                    {selectedOrder.payment_status === 'cancelled'
                      ? '—'
                      : formatVND(computeOrderProfit(selectedOrder))}
                  </span>
                </div>
                <div className="flex justify-between gap-2 border-t border-[var(--border-default)] pt-1.5">
                  <span className="text-[var(--text-secondary)]">Đã thu</span>
                  <span className="shrink-0 font-mono-tabular font-semibold text-[var(--brand-jade-text)]">
                    {formatVND(selectedOrder.paid_amount)}
                  </span>
                </div>
                {selectedOrder.remaining_amount > 0 && (
                  <div className="flex justify-between gap-2 font-bold text-[var(--status-debt)]">
                    <span>Còn nợ</span>
                    <span className="shrink-0 font-mono-tabular">
                      {formatVND(selectedOrder.remaining_amount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 text-[13px] font-semibold hover:bg-[var(--bg-subtle)] sm:text-[14px]"
                >
                  <Pencil className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                  <span className="truncate">Sửa sổ</span>
                </button>
                {(selectedOrder.payment_status === 'unpaid' ||
                  selectedOrder.payment_status === 'partial') &&
                selectedOrder.customer_id ? (
                  <button
                    type="button"
                    onClick={() => setCollectTargetOrder(selectedOrder)}
                    className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-jade)] px-2.5 text-[13px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] sm:text-[14px]"
                  >
                    <Banknote className="h-4 w-4 shrink-0" />
                    <span className="truncate">Thu tiền</span>
                  </button>
                ) : (
                  selectedOrder.payment_status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => setQrOpen(true)}
                      className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-jade)] px-2.5 text-[13px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] sm:text-[14px]"
                    >
                      <QrCode className="h-4 w-4 shrink-0" />
                      <span className="truncate">Tạo QR</span>
                    </button>
                  )
                )}
              </div>

              {selectedOrder.payment_status !== 'cancelled' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setInvoiceOpen(true)}
                    className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 text-[13px] font-semibold hover:bg-[var(--bg-subtle)] sm:text-[14px]"
                  >
                    <ReceiptText className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                    <span className="truncate">Hóa đơn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrOpen(true)}
                    className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-[var(--brand-jade)] bg-[var(--bg-surface)] px-2.5 text-[13px] font-semibold text-[var(--brand-jade-text)] hover:bg-[var(--status-paid-bg)] sm:text-[14px]"
                  >
                    <QrCode className="h-4 w-4 shrink-0" />
                    <span className="truncate">Mã VietQR</span>
                  </button>
                </div>
              )}

              {/* Cancel Order Section */}
              {selectedOrder.payment_status !== 'cancelled' && (
                <div className="border-t border-[var(--border-default)] pt-3">
                  {!cancelConfirmOpen ? (
                    <button
                      type="button"
                      onClick={() => setCancelConfirmOpen(true)}
                      className="press-tactile flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--status-overdue-border)] text-[14px] font-semibold text-[var(--status-overdue)] hover:bg-[var(--status-overdue-bg)]"
                    >
                      <XCircle className="h-4 w-4 shrink-0" />
                      <span>Hủy đơn</span>
                    </button>
                  ) : (
                    <div className="animate-fade-in space-y-3 rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] p-3.5">
                      <div className="flex items-start gap-2 text-[13px] text-[var(--status-overdue)]">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1 break-words">
                          <p className="font-bold">Hủy đơn {selectedOrder.order_code}?</p>
                          <p className="mt-1">
                            Chỉ trừ phần nợ chưa thu (
                            <strong className="font-mono-tabular">
                              {formatVND(selectedOrder.remaining_amount)}
                            </strong>
                            ) khỏi công nợ khách.
                          </p>
                        </div>
                      </div>

                      {cancelError && (
                        <p className="text-[13px] font-semibold text-[var(--status-overdue)]">
                          {cancelError}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setCancelConfirmOpen(false)}
                          className="press-tactile min-h-[48px] flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
                        >
                          Giữ lại
                        </button>
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={handleConfirmCancel}
                          className="press-tactile flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--status-overdue)] px-3 text-[13px] font-semibold text-white disabled:opacity-60 sm:text-[14px]"
                        >
                          {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                          <span>{cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <OrderLedgerEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        order={selectedOrder}
        items={selectedItems}
        onSaved={(updatedOrder, updatedItems) => {
          setSelectedOrder(updatedOrder);
          setSelectedItems(updatedItems);
          upsertOrderLocal(updatedOrder);
          invalidateAfterMutation();
        }}
      />

      <CollectDebtModal
        open={Boolean(collectTargetOrder && collectCustomer)}
        onClose={() => setCollectTargetOrder(null)}
        customer={collectCustomer}
        unpaidOrders={collectCustomerUnpaidOrders}
        initialOrderId={collectTargetOrder?.id ?? null}
        onCollected={() => {
          setCollectTargetOrder(null);
          setSelectedOrder(null);
          invalidateAfterMutation();
        }}
      />

      <VietQRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        profile={profile}
        customerName={selectedOrder?.customer_name_snapshot ?? 'Khách hàng'}
        fixedOrder={selectedOrder}
      />

      <InvoicePreviewModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        order={selectedOrder}
        items={selectedItems}
        profile={profile}
      />
    </div>
  );
}
