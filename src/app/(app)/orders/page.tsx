'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, ReceiptText, Search, ShoppingBag, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getTodayVN, stripVietnamese } from '@/lib/vietnamese';
import {
  buildLedgerCsv,
  computeLedgerTotals,
  computeVnDatePresetRange,
  isOrderInVnDateRange,
  summarizeOrderItems,
  type LedgerDatePreset,
} from '@/lib/ledger';
import { triggerBlobDownload } from '@/lib/browser-export';
import { resolveOrStubOrderCustomer } from '@/lib/customers';
import { usePosData } from '@/components/providers/PosDataProvider';
import type { Order, OrderItem, PaymentStatus } from '@/types/database';
import { VietQRModal } from '@/components/qr/VietQRModal';
import { InvoicePreviewModal } from '@/components/invoice/InvoicePreviewModal';
import { CollectDebtModal } from '@/components/debts/CollectDebtModal';
import { OrderLedgerEditModal } from '@/components/orders/OrderLedgerEditModal';
import { CsvImportModal } from '@/components/orders/CsvImportModal';
import { OrdersTotalsStrip } from '@/components/orders/OrdersTotalsStrip';
import { OrdersFilterBar, type OrderAccountFilter } from '@/components/orders/OrdersFilterBar';
import { OrdersDesktopTable } from '@/components/orders/OrdersDesktopTable';
import { OrdersMobileList } from '@/components/orders/OrdersMobileList';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { ORDER_STATUS_META } from '@/components/ui/OrderStatusBadge';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { FetchErrorCard, OrdersPageSkeleton } from '@/components/ui/PageSkeletons';

const DATE_PRESET_LABELS: Record<LedgerDatePreset, string> = {
  all: 'Tất cả thời gian',
  today: 'Hôm nay',
  '7d': '7 ngày qua',
  '30d': '30 ngày qua',
  month: 'Tháng này',
  custom: 'Tùy chọn ngày',
};

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
  const [accountFilter, setAccountFilter] = useState<OrderAccountFilter>('ALL');
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
    triggerBlobDownload(blob, `so-ban-hang-${getTodayVN()}.csv`);
  }

  const collectCustomer = useMemo(
    () => resolveOrStubOrderCustomer(collectTargetOrder, customers),
    [collectTargetOrder, customers]
  );

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
    if (statusFilter !== 'ALL') tags.push(`TT: ${ORDER_STATUS_META[statusFilter].label}`);
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

      {!loading && !ordersError && <OrdersTotalsStrip totals={totals} />}

      <OrdersFilterBar
        query={query}
        statusFilter={statusFilter}
        accountFilter={accountFilter}
        datePreset={datePreset}
        customStart={customStart}
        customEnd={customEnd}
        hasActiveFilter={hasActiveFilter}
        activeFilterTags={activeFilterTags}
        onChangeQuery={setQuery}
        onChangeStatus={setStatusFilter}
        onChangeAccount={setAccountFilter}
        onChangeDatePreset={setDatePreset}
        onChangeCustomStart={setCustomStart}
        onChangeCustomEnd={setCustomEnd}
        onClearAll={clearAllFilters}
      />

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
          <OrdersDesktopTable
            orders={filtered}
            onSelectOrder={(order) => void openOrderDetail(order)}
            onQuickCollect={setCollectTargetOrder}
          />
          <OrdersMobileList
            orders={filtered}
            onSelectOrder={(order) => void openOrderDetail(order)}
            onQuickCollect={setCollectTargetOrder}
          />

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

      <OrderDetailModal
        order={selectedOrder}
        items={selectedItems}
        loadingItems={loadingItems}
        cancelConfirmOpen={cancelConfirmOpen}
        cancelling={cancelling}
        cancelError={cancelError}
        onClose={() => setSelectedOrder(null)}
        onOpenEdit={() => setEditOpen(true)}
        onOpenCollect={setCollectTargetOrder}
        onOpenInvoice={() => setInvoiceOpen(true)}
        onOpenQr={() => setQrOpen(true)}
        onSetCancelConfirmOpen={setCancelConfirmOpen}
        onConfirmCancel={() => void handleConfirmCancel()}
      />

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

      <CsvImportModal open={csvImportOpen} onClose={() => setCsvImportOpen(false)} />
    </div>
  );
}
