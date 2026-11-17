'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  QrCode,
  ReceiptText,
  Search,
  ShoppingBag,
  X,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDateTimeVN, formatVND, stripVietnamese } from '@/lib/vietnamese';
import { usePosData } from '@/components/providers/PosDataProvider';
import type { Order, OrderItem, PaymentStatus } from '@/types/database';
import { VietQRModal } from '@/components/qr/VietQRModal';
import { InvoicePreviewModal } from '@/components/invoice/InvoicePreviewModal';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { FetchErrorCard, OrdersPageSkeleton } from '@/components/ui/PageSkeletons';

const STATUS_LABELS: Record<PaymentStatus, { label: string; className: string }> = {
  paid: {
    label: 'Đã trả đủ',
    className: 'bg-[var(--status-paid-bg)] text-[var(--status-paid)]',
  },
  partial: {
    label: 'Trả một phần',
    className: 'bg-[var(--status-debt-bg)] text-[var(--status-debt)]',
  },
  unpaid: {
    label: 'Ghi nợ',
    className: 'bg-[var(--status-debt-bg)] text-[var(--status-debt)]',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] line-through',
  },
};

export default function OrdersPage() {
  const {
    orders,
    ordersLoaded,
    ordersError,
    profile,
    ensureOrders,
    refreshOrders,
    invalidateAfterMutation,
  } = usePosData();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  useEffect(() => {
    void ensureOrders();
  }, [ensureOrders]);

  async function openOrderDetail(order: Order) {
    setSelectedOrder(order);
    setCancelConfirmOpen(false);
    setCancelError(null);
    setLoadingItems(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);
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
      if (q) {
        const hay = stripVietnamese(`${o.order_code} ${o.customer_name_snapshot}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, query, statusFilter]);

  const hasActiveFilter = Boolean(query.trim()) || statusFilter !== 'ALL';

  return (
    <div className="mx-auto max-w-[1160px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4">
        <h1 className="text-[20px] font-bold tracking-[-0.015em] lg:text-[24px]">
          Lịch sử đơn hàng
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Bấm vào từng đơn để xem chi tiết món, in hóa đơn, tạo mã VietQR hoặc hủy đơn nếu bấm nhầm
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-[360px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mã đơn hoặc tên khách..."
            className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pr-3.5 pl-10 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['ALL', 'Tất cả'],
              ['paid', 'Đã trả'],
              ['partial', 'Trả 1 phần'],
              ['unpaid', 'Ghi nợ'],
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

      {/* Orders List */}
      {ordersError && !ordersLoaded ? (
        <FetchErrorCard
          title="Chưa tải được danh sách đơn hàng"
          message={ordersError}
          onRetry={() => void refreshOrders()}
        />
      ) : loading ? (
        <OrdersPageSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyStateCard
          icon={hasActiveFilter ? Search : ShoppingBag}
          title={hasActiveFilter ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
          description={
            hasActiveFilter
              ? 'Thử xóa ô tìm kiếm hoặc chuyển sang mục "Tất cả" để xem đầy đủ lịch sử đơn hàng.'
              : 'Khi hoàn tất thanh toán ở màn hình Bán hàng, mọi hóa đơn sẽ tự động lưu tại đây.'
          }
          action={
            hasActiveFilter ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('ALL');
                }}
                className="press-tactile inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                Xem tất cả đơn
              </button>
            ) : (
              <Link
                href="/"
                className="press-tactile inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
              >
                Về màn hình Bán hàng
              </Link>
            )
          }
        />
      ) : (
        <div className="animate-fade-in divide-y divide-[var(--border-default)] rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
          {filtered.map((order) => {
            const badge = STATUS_LABELS[order.payment_status];
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrderDetail(order)}
                className="press-tactile flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-tabular text-[14px] font-bold text-[var(--text-primary)]">
                      {order.order_code}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[14px] text-[var(--text-primary)]">
                    {order.customer_name_snapshot}
                  </p>
                  <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                    {formatDateTimeVN(order.created_at)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-mono-tabular text-[16px] font-bold text-[var(--text-primary)]">
                    {formatVND(order.total_amount)}
                  </p>
                  {order.remaining_amount > 0 && order.payment_status !== 'cancelled' && (
                    <p className="font-mono-tabular text-[12px] font-semibold text-[var(--status-debt)]">
                      Còn nợ {formatVND(order.remaining_amount)}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Order Detail Drawer / Modal */}
      {selectedOrder && (
        <div
          className="animate-backdrop-in fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết đơn ${selectedOrder.order_code}`}
        >
          <div className="animate-sheet-up sm:animate-modal-in max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-mono-tabular text-[17px] font-bold">
                  {selectedOrder.order_code}
                </h2>
                <p className="truncate text-[12px] text-[var(--text-secondary)]">
                  {formatDateTimeVN(selectedOrder.created_at)} ·{' '}
                  {selectedOrder.customer_name_snapshot}
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
                        </p>
                      </div>
                      <span className="shrink-0 font-mono-tabular font-bold">
                        {formatVND(item.line_total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5 text-[14px]">
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Tổng tiền đơn</span>
                  <span className="shrink-0 font-mono-tabular font-bold">
                    {formatVND(selectedOrder.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Đã thu từ khách</span>
                  <span className="shrink-0 font-mono-tabular font-semibold text-[var(--brand-jade-text)]">
                    {formatVND(selectedOrder.paid_amount)}
                  </span>
                </div>
                {selectedOrder.remaining_amount > 0 && (
                  <div className="flex justify-between gap-2 font-bold text-[var(--status-debt)]">
                    <span>Còn ghi nợ</span>
                    <span className="shrink-0 font-mono-tabular">
                      {formatVND(selectedOrder.remaining_amount)}
                    </span>
                  </div>
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
                    <span className="truncate">Xem &amp; In hóa đơn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrOpen(true)}
                    className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-jade)] px-2.5 text-[13px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] sm:text-[14px]"
                  >
                    <QrCode className="h-4 w-4 shrink-0" />
                    <span className="truncate">Tạo QR thu tiền</span>
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
                      <span>Hủy đơn này</span>
                    </button>
                  ) : (
                    <div className="animate-fade-in space-y-3 rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] p-3.5">
                      <div className="flex items-start gap-2 text-[13px] text-[var(--status-overdue)]">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1 break-words">
                          <p className="font-bold">Xác nhận hủy đơn {selectedOrder.order_code}?</p>
                          {selectedOrder.paid_amount > 0 ? (
                            <p className="mt-1">
                              Đơn này đã thu{' '}
                              <strong className="font-mono-tabular">
                                {formatVND(selectedOrder.paid_amount)}
                              </strong>
                              . Khi hủy, hệ thống chỉ trừ phần nợ chưa thu (
                              <strong className="font-mono-tabular">
                                {formatVND(selectedOrder.remaining_amount)}
                              </strong>
                              ) khỏi công nợ khách và giữ nguyên lịch sử tiền đã thu.
                            </p>
                          ) : (
                            <p className="mt-1">
                              Phần công nợ {formatVND(selectedOrder.remaining_amount)} của đơn này sẽ
                              được trừ lại khỏi sổ nợ khách hàng.
                            </p>
                          )}
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
                          Giữ lại đơn
                        </button>
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={handleConfirmCancel}
                          className="press-tactile flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--status-overdue)] px-3 text-[13px] font-semibold text-white disabled:opacity-60 sm:text-[14px]"
                        >
                          {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                          <span>{cancelling ? 'Đang hủy đơn...' : 'Xác nhận hủy'}</span>
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
