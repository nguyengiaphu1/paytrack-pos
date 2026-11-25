'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  ChevronDown,
  Download,
  Loader2,
  Pencil,
  QrCode,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingBag,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ModalDialog } from '@/components/ui/ModalDialog';
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
  computeVnDatePresetRange,
  formatPaymentAccount,
  hasMissingCostPrice,
  isOrderInVnDateRange,
  summarizeOrderItems,
  type LedgerDatePreset,
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
import { CsvImportModal } from '@/components/orders/CsvImportModal';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { FetchErrorCard, OrdersPageSkeleton } from '@/components/ui/PageSkeletons';

const STATUS_LABELS: Record<PaymentStatus, { label: string; className: string }> = {
  paid: {
    label: 'Đã trả',
    className: 'glass-badge-paid',
  },
  partial: {
    label: 'Trả 1 phần',
    className: 'glass-badge-debt',
  },
  unpaid: {
    label: 'Chưa trả',
    className: 'glass-badge-debt',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'glass-badge-neutral line-through',
  },
};

const DATE_PRESET_LABELS: Record<LedgerDatePreset, string> = {
  all: 'Tất cả thời gian',
  today: 'Hôm nay',
  '7d': '7 ngày qua',
  month: 'Tháng này',
  custom: 'Tùy chọn ngày',
};

type AccountFilter = 'ALL' | 'NONE' | PaymentAccount;

export default function OrdersPage() {
  const todayVN = getTodayVN();
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
  const [datePreset, setDatePreset] = useState<LedgerDatePreset>('all');
  const [customStart, setCustomStart] = useState<string>(todayVN);
  const [customEnd, setCustomEnd] = useState<string>(todayVN);

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
  const [csvImportOpen, setCsvImportOpen] = useState(false);

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

  const activeDateRange = useMemo(
    () => computeVnDatePresetRange(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd]
  );

  const filtered = useMemo(() => {
    const q = stripVietnamese(query);
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.payment_status !== statusFilter) return false;
      if (accountFilter === 'NONE' && o.payment_account !== null) return false;
      if (accountFilter !== 'ALL' && accountFilter !== 'NONE' && o.payment_account !== accountFilter) {
        return false;
      }
      if (!isOrderInVnDateRange(o.purchased_at || o.created_at, activeDateRange)) {
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
  }, [orders, query, statusFilter, accountFilter, activeDateRange]);

  const totals = useMemo(() => computeLedgerTotals(filtered), [filtered]);
  const hasActiveFilter =
    Boolean(query.trim()) ||
    statusFilter !== 'ALL' ||
    accountFilter !== 'ALL' ||
    datePreset !== 'all';

  function clearAllFilters() {
    setQuery('');
    setStatusFilter('ALL');
    setAccountFilter('ALL');
    setDatePreset('all');
  }

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

  const activeFilterTags = useMemo(() => {
    const tags: string[] = [];
    if (query.trim()) tags.push(`Từ khóa: "${query.trim()}"`);
    if (statusFilter !== 'ALL') tags.push(`TT: ${STATUS_LABELS[statusFilter].label}`);
    if (accountFilter === 'NONE') tags.push('TK: Chưa có TK');
    else if (accountFilter !== 'ALL') tags.push(`TK: ${accountFilter}`);
    if (datePreset === 'custom') {
      tags.push(`Ngày: ${customStart || '...'} → ${customEnd || '...'}`);
    } else if (datePreset !== 'all') {
      tags.push(DATE_PRESET_LABELS[datePreset]);
    }
    return tags;
  }, [query, statusFilter, accountFilter, datePreset, customStart, customEnd]);

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-6 lg:py-5">
      {/* Header + CSV Import / Export */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="glass-icon-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px]">
            <ReceiptText className="h-5 w-5 text-[var(--brand-jade-text)]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-bold tracking-[-0.015em] text-[var(--text-primary)] lg:text-[24px]">
              Sổ bán hàng
            </h1>
            {!loading && !ordersError && (
              <p className="text-[12px] text-[var(--text-secondary)]">
                {filtered.length} đơn hiển thị
                {hasActiveFilter ? ` / ${orders.length} đơn đã tải` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCsvImportOpen(true)}
            className="glass-btn-primary press-tactile inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[13px] font-semibold"
          >
            <Upload className="h-4 w-4" />
            <span>Nhập CSV</span>
          </button>
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="glass-solid-control press-tactile inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-[var(--text-primary)]"
            >
              <Download className="h-4 w-4 text-[var(--brand-jade-text)]" />
              <span>Xuất CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Totals KPI Strip */}
      {!loading && !ordersError && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-[var(--text-primary)]/45"
              />
              <span className="truncate">Giá bán ({totals.activeCount} đơn)</span>
            </p>
            <p className="font-mono-tabular mt-1 truncate text-[16px] font-bold text-[var(--text-primary)] sm:text-[20px]">
              {formatVND(totals.totalRevenue)}
            </p>
          </div>
          <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-[var(--text-secondary)]/55"
              />
              <span className="truncate">Giá vốn</span>
            </p>
            <p className="font-mono-tabular mt-1 truncate text-[16px] font-bold text-[var(--text-secondary)] sm:text-[20px]">
              {formatVND(totals.totalCost)}
            </p>
          </div>
          <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  totals.totalProfit >= 0
                    ? 'bg-[var(--brand-jade)]'
                    : 'bg-[var(--status-overdue)]'
                }`}
              />
              <span className="truncate">Lãi tạm tính</span>
            </p>
            <p
              className={`font-mono-tabular mt-1 truncate text-[16px] font-bold sm:text-[20px] ${
                totals.totalProfit >= 0
                  ? 'text-[var(--brand-jade-text)]'
                  : 'text-[var(--status-overdue)]'
              }`}
            >
              {formatVND(totals.totalProfit)}
            </p>
          </div>
          <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-debt)]"
              />
              <span className="truncate">Còn nợ</span>
            </p>
            <p className="font-mono-tabular mt-1 truncate text-[16px] font-bold text-[var(--status-debt)] sm:text-[20px]">
              {formatVND(totals.totalRemainingDebt)}
            </p>
          </div>
        </div>
      )}

      {/* Sculpted Crystal Command Bar — Opaque-inside-Translucent Pill Search + 3 Selects */}
      <div className="glass-surface mb-4 space-y-3 rounded-[24px] p-3.5 sm:p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
          {/* Search Input */}
          <div className="min-w-0 lg:col-span-5">
            <label
              htmlFor="orders-search"
              className="mb-1 hidden text-[12px] font-semibold text-[var(--text-secondary)] lg:block"
            >
              Tìm đơn hàng
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
              />
              <input
                id="orders-search"
                type="search"
                aria-label="Tìm tên khách, SĐT, địa chỉ, món hàng"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tên khách, SĐT, địa chỉ, món hàng..."
                className="glass-input min-h-[46px] w-full rounded-full pr-11 pl-10 text-[16px] text-[var(--text-primary)] outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="press-tactile absolute top-1/2 right-0.5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* 3 Clean Frosted Dropdowns (Status, Date Range, Payment Account) */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:col-span-7">
            {/* Status Select */}
            <div className="min-w-0">
              <label
                htmlFor="orders-status-filter"
                className={`mb-1 flex items-center gap-1.5 text-[12px] font-semibold ${
                  statusFilter !== 'ALL'
                    ? 'text-[var(--brand-jade-text)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <span>Trạng thái</span>
                {statusFilter !== 'ALL' && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-jade)]"
                  />
                )}
              </label>
              <div className="relative">
                <select
                  id="orders-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'ALL' | PaymentStatus)}
                  className="glass-input min-h-[46px] w-full cursor-pointer appearance-none truncate rounded-[14px] pr-9 pl-3.5 text-[16px] font-medium text-[var(--text-primary)] outline-none"
                >
                  <option value="ALL" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    Tất cả
                  </option>
                  <option value="paid" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    Đã trả
                  </option>
                  <option
                    value="partial"
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    Trả 1 phần
                  </option>
                  <option
                    value="unpaid"
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    Chưa trả
                  </option>
                  <option
                    value="cancelled"
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    Đã hủy
                  </option>
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                />
              </div>
            </div>

            {/* Date Preset Select */}
            <div className="min-w-0">
              <label
                htmlFor="orders-date-preset"
                className={`mb-1 flex items-center gap-1.5 text-[12px] font-semibold ${
                  datePreset !== 'all'
                    ? 'text-[var(--brand-jade-text)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <span>Thời gian</span>
                {datePreset !== 'all' && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-jade)]"
                  />
                )}
              </label>
              <div className="relative">
                <select
                  id="orders-date-preset"
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as LedgerDatePreset)}
                  className="glass-input min-h-[46px] w-full cursor-pointer appearance-none truncate rounded-[14px] pr-9 pl-3.5 text-[16px] font-medium text-[var(--text-primary)] outline-none"
                >
                  <option value="all" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    Tất cả
                  </option>
                  <option
                    value="today"
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    Hôm nay
                  </option>
                  <option value="7d" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    7 ngày
                  </option>
                  <option
                    value="month"
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    Tháng này
                  </option>
                  <option
                    value="custom"
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    Tùy chọn
                  </option>
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                />
              </div>
            </div>

            {/* Payment Account Select */}
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <label
                htmlFor="orders-account-filter"
                className={`mb-1 flex items-center gap-1.5 text-[12px] font-semibold ${
                  accountFilter !== 'ALL'
                    ? 'text-[var(--brand-jade-text)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <span>Tài khoản TK</span>
                {accountFilter !== 'ALL' && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-jade)]"
                  />
                )}
              </label>
              <div className="relative">
                <select
                  id="orders-account-filter"
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value as AccountFilter)}
                  className="glass-input min-h-[46px] w-full cursor-pointer appearance-none truncate rounded-[14px] pr-9 pl-3.5 text-[16px] font-medium text-[var(--text-primary)] outline-none"
                >
                  <option value="ALL" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    Tất cả TK
                  </option>
                  {PAYMENT_ACCOUNTS.map((acc) => (
                    <option
                      key={acc}
                      value={acc}
                      className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    >
                      {acc}
                    </option>
                  ))}
                  <option
                    value="NONE"
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    Chưa có TK
                  </option>
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Custom Date Range Tray (only shown when datePreset === 'custom') */}
        {datePreset === 'custom' && (
          <div className="glass-well animate-fade-in grid grid-cols-1 gap-2.5 rounded-[16px] p-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-4">
            <div className="flex min-w-0 items-center justify-between gap-2.5 lg:justify-start">
              <label
                htmlFor="orders-date-start"
                className="shrink-0 text-[13px] font-semibold text-[var(--text-secondary)]"
              >
                Từ ngày
              </label>
              <input
                id="orders-date-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="glass-input font-mono-tabular min-h-[44px] min-w-0 flex-1 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none lg:flex-initial"
              />
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2.5 lg:justify-start">
              <label
                htmlFor="orders-date-end"
                className="shrink-0 text-[13px] font-semibold text-[var(--text-secondary)]"
              >
                Đến ngày
              </label>
              <input
                id="orders-date-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="glass-input font-mono-tabular min-h-[44px] min-w-0 flex-1 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none lg:flex-initial"
              />
            </div>
          </div>
        )}

        {/* Active Filter Summary Strip with 1-tap Reset */}
        {hasActiveFilter && (
          <div className="glass-divider animate-fade-in flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                Đang lọc:
              </span>
              {activeFilterTags.map((tag) => (
                <span
                  key={tag}
                  className="glass-badge-paid max-w-full truncate rounded-full px-2.5 py-1 text-[12px] font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="glass-solid-control press-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-[var(--text-primary)]"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[var(--brand-jade-text)]" />
              <span>Xóa lọc</span>
            </button>
          </div>
        )}
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
                onClick={clearAllFilters}
                className="glass-solid-control press-tactile inline-flex min-h-[48px] items-center justify-center rounded-full px-5 text-[15px] font-semibold text-[var(--text-primary)]"
              >
                Xóa bộ lọc
              </button>
            ) : (
              <Link
                href="/"
                className="glass-btn-primary press-tactile inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[15px] font-semibold"
              >
                Bán hàng
              </Link>
            )
          }
        />
      ) : (
        <>
          {/* Desktop 12-Column Table (>= 1024px) */}
          <div className="glass-panel animate-fade-in hidden overflow-x-auto overflow-y-auto max-h-[calc(100dvh-260px)] rounded-[26px] lg:block">
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
                      <td className="font-mono-tabular px-3 py-3.5 text-center text-[var(--text-secondary)]">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openOrderDetail(order);
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
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${badge.className}`}
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

          {/* Mobile Card Ledger (< 1024px, zero horizontal overflow at 375px) */}
          <div className="animate-fade-in space-y-3 lg:hidden">
            {filtered.map((order, idx) => {
              const badge = STATUS_LABELS[order.payment_status];
              const profit = computeOrderProfit(order);
              const missingCost =
                order.payment_status !== 'cancelled' && hasMissingCostPrice(order);
              const canQuickCollect =
                (order.payment_status === 'unpaid' || order.payment_status === 'partial') &&
                Boolean(order.customer_id);

              return (
                <article
                  key={order.id}
                  className="glass-card glass-card-interactive rounded-[22px] p-4"
                >
                  <button
                    type="button"
                    onClick={() => void openOrderDetail(order)}
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
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        {(order.customer_phone_snapshot || order.customer_address_snapshot) && (
                          <p className="mt-1 truncate text-[12px] text-[var(--text-secondary)]">
                            {order.customer_phone_snapshot ? (
                              <span className="font-mono-tabular">
                                {order.customer_phone_snapshot}
                              </span>
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
                    <p className="mt-2.5 line-clamp-2 break-words text-[13px] text-[var(--text-primary)]">
                      {summarizeOrderItems(order.order_items, 3)}
                    </p>

                    {/* Recessed Cost / Sale / Profit Tray */}
                    <div className="glass-well mt-3 grid grid-cols-3 gap-2 rounded-[16px] px-3 py-2.5 text-[12px]">
                      <div className="min-w-0">
                        <span className="block text-[12px] text-[var(--text-secondary)]">
                          Giá vốn
                        </span>
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
                        <span className="block text-[12px] text-[var(--text-secondary)]">
                          Giá bán
                        </span>
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
                        <span className="font-mono-tabular">
                          TT {formatDateVN(order.paid_at)}
                        </span>
                      )}
                    </div>

                    {canQuickCollect && (
                      <button
                        type="button"
                        onClick={() => setCollectTargetOrder(order)}
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

          {hasMoreOrders && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                disabled={loadingMoreOrders}
                onClick={() => void loadMoreOrders()}
                className="glass-solid-control press-tactile inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 text-[14px] font-semibold text-[var(--text-primary)] disabled:opacity-60"
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
        <ModalDialog
          open={true}
          onClose={() => setSelectedOrder(null)}
          ariaLabelledBy="order-detail-modal-title"
          backdropClassName="glass-backdrop animate-backdrop-in fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4"
          panelClassName="glass-modal animate-sheet-up sm:animate-modal-in flex max-h-[92dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
        >
          <div className="glass-modal-header flex shrink-0 items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="order-detail-modal-title"
                  className="font-mono-tabular truncate text-[16px] font-bold text-[var(--text-primary)]"
                >
                  {selectedOrder.order_code}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_LABELS[selectedOrder.payment_status].className}`}
                >
                  {STATUS_LABELS[selectedOrder.payment_status].label}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">
                {selectedOrder.customer_name_snapshot} · Mua{' '}
                {formatDateVN(selectedOrder.purchased_at || selectedOrder.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              aria-label="Đóng"
              className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {/* 12-field Metadata Summary */}
            <div className="glass-well grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-[18px] p-3.5 text-[13px]">
              <div className="min-w-0">
                <span className="block text-[12px] text-[var(--text-secondary)]">SĐT</span>
                <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
                  {selectedOrder.customer_phone_snapshot || '—'}
                </span>
              </div>
              <div className="min-w-0">
                <span className="block text-[12px] text-[var(--text-secondary)]">Địa chỉ</span>
                <span className="break-words font-medium text-[var(--text-primary)]">
                  {selectedOrder.customer_address_snapshot || '—'}
                </span>
              </div>
              <div className="min-w-0">
                <span className="block text-[12px] text-[var(--text-secondary)]">Tên TK</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatPaymentAccount(
                    selectedOrder.payment_account,
                    selectedOrder.payment_account_note
                  )}
                </span>
              </div>
              <div className="min-w-0">
                <span className="block text-[12px] text-[var(--text-secondary)]">Ngày TT</span>
                <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
                  {selectedOrder.paid_at ? formatDateVN(selectedOrder.paid_at) : '—'}
                </span>
              </div>
              {selectedOrder.note && (
                <div className="col-span-2 min-w-0">
                  <span className="block text-[12px] text-[var(--text-secondary)]">Ghi chú</span>
                  <span className="break-words font-medium text-[var(--text-primary)]">
                    {selectedOrder.note}
                  </span>
                </div>
              )}
              <div className="col-span-2 min-w-0">
                <span className="block text-[12px] text-[var(--text-secondary)]">
                  Ngày tạo hệ thống
                </span>
                <span className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                  {formatDateTimeVN(selectedOrder.created_at)}
                </span>
              </div>
            </div>

            {loadingItems ? (
              <div className="glass-well space-y-2.5 rounded-[18px] p-3.5">
                <div className="skeleton-shimmer h-5 w-3/4 rounded-lg" />
                <div className="skeleton-shimmer h-4 w-1/2 rounded-lg" />
              </div>
            ) : (
              <div className="glass-well divide-y divide-[var(--glass-border-subtle)] rounded-[18px]">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-3 text-[14px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-[var(--text-primary)]">
                        {item.product_name}
                      </p>
                      <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                        {Number(item.quantity)} {item.unit} × {formatVND(item.unit_price)}
                        {item.cost_price !== null
                          ? ` · Vốn ${formatVND(item.cost_price)}`
                          : ' · Chưa nhập vốn'}
                      </p>
                    </div>
                    <span className="font-mono-tabular shrink-0 font-bold text-[var(--text-primary)]">
                      {formatVND(item.line_total)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Financial Breakdown */}
            <div className="glass-well space-y-2 rounded-[18px] p-3.5 text-[14px]">
              <div className="flex justify-between gap-2">
                <span className="text-[var(--text-secondary)]">Giá bán</span>
                <span className="font-mono-tabular shrink-0 font-bold text-[var(--text-primary)]">
                  {formatVND(selectedOrder.total_amount)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--text-secondary)]">Giá vốn</span>
                <span className="font-mono-tabular shrink-0 font-semibold text-[var(--text-secondary)]">
                  {formatVND(selectedOrder.total_cost ?? 0)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--text-secondary)]">Lãi</span>
                <span className="font-mono-tabular shrink-0 font-bold text-[var(--brand-jade-text)]">
                  {selectedOrder.payment_status === 'cancelled'
                    ? '—'
                    : formatVND(computeOrderProfit(selectedOrder))}
                </span>
              </div>
              <div className="glass-divider flex justify-between gap-2 border-t pt-2">
                <span className="text-[var(--text-secondary)]">Đã thu</span>
                <span className="font-mono-tabular shrink-0 font-semibold text-[var(--brand-jade-text)]">
                  {formatVND(selectedOrder.paid_amount)}
                </span>
              </div>
              {selectedOrder.remaining_amount > 0 && (
                <div className="flex justify-between gap-2 font-bold text-[var(--status-debt)]">
                  <span>Còn nợ</span>
                  <span className="font-mono-tabular shrink-0">
                    {formatVND(selectedOrder.remaining_amount)}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedOrder.payment_status === 'cancelled' ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="glass-solid-control press-tactile flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-[var(--text-primary)]"
              >
                <Pencil className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                <span>Sửa sổ</span>
              </button>
            ) : (selectedOrder.payment_status === 'unpaid' ||
                selectedOrder.payment_status === 'partial') &&
              selectedOrder.customer_id ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
                >
                  <Pencil className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                  <span className="truncate">Sửa sổ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCollectTargetOrder(selectedOrder)}
                  className="glass-btn-primary press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold sm:text-[14px]"
                >
                  <Banknote className="h-4 w-4 shrink-0" />
                  <span className="truncate">Thu tiền</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceOpen(true)}
                  className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
                >
                  <ReceiptText className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                  <span className="truncate">Hóa đơn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[var(--brand-jade-text)] sm:text-[14px]"
                >
                  <QrCode className="h-4 w-4 shrink-0" />
                  <span className="truncate">Mã VietQR</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
                >
                  <Pencil className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                  <span className="truncate">Sửa sổ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceOpen(true)}
                  className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
                >
                  <ReceiptText className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                  <span className="truncate">Hóa đơn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="glass-btn-primary press-tactile col-span-2 flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold sm:col-span-1 sm:text-[14px]"
                >
                  <QrCode className="h-4 w-4 shrink-0" />
                  <span className="truncate">Mã VietQR</span>
                </button>
              </div>
            )}

            {/* Cancel Order Section */}
            {selectedOrder.payment_status !== 'cancelled' && (
              <div className="glass-divider border-t pt-3.5">
                {!cancelConfirmOpen ? (
                  <button
                    type="button"
                    onClick={() => setCancelConfirmOpen(true)}
                    className="glass-badge-overdue press-tactile flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition-opacity hover:opacity-90"
                  >
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>Hủy đơn</span>
                  </button>
                ) : (
                  <div className="glass-badge-overdue animate-fade-in space-y-3 rounded-[20px] p-4">
                    <div className="flex items-start gap-2 text-[13px]">
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
                      <p role="alert" className="text-[13px] font-semibold">
                        {cancelError}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => setCancelConfirmOpen(false)}
                        className="glass-solid-control press-tactile min-h-[48px] flex-1 rounded-full px-3 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
                      >
                        Giữ lại
                      </button>
                      <button
                        type="button"
                        disabled={cancelling}
                        onClick={handleConfirmCancel}
                        className="glass-btn-danger press-tactile flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold disabled:opacity-60 sm:text-[14px]"
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
        </ModalDialog>
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

      <CsvImportModal
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
      />
    </div>
  );
}
