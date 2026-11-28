'use client';

import {
  AlertTriangle,
  Banknote,
  Loader2,
  Pencil,
  QrCode,
  ReceiptText,
  XCircle,
} from 'lucide-react';
import { formatDateTimeVN, formatDateVN, formatVND } from '@/lib/vietnamese';
import { computeOrderProfit, formatPaymentAccount } from '@/lib/ledger';
import type { Order, OrderItem } from '@/types/database';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { OrderStatusBadge } from '@/components/ui/OrderStatusBadge';

interface OrderDetailModalProps {
  order: Order | null;
  items: OrderItem[];
  loadingItems: boolean;
  cancelConfirmOpen: boolean;
  cancelling: boolean;
  cancelError: string | null;
  onClose: () => void;
  onOpenEdit: () => void;
  onOpenCollect: (order: Order) => void;
  onOpenInvoice: () => void;
  onOpenQr: () => void;
  onSetCancelConfirmOpen: (open: boolean) => void;
  onConfirmCancel: () => void;
}

export function OrderDetailModal({
  order,
  items,
  loadingItems,
  cancelConfirmOpen,
  cancelling,
  cancelError,
  onClose,
  onOpenEdit,
  onOpenCollect,
  onOpenInvoice,
  onOpenQr,
  onSetCancelConfirmOpen,
  onConfirmCancel,
}: OrderDetailModalProps) {
  if (!order) return null;

  return (
    <ModalDialog
      open={true}
      onClose={onClose}
      ariaLabelledBy="order-detail-modal-title"
      backdropClassName="glass-backdrop animate-backdrop-in fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4"
      panelClassName="glass-modal animate-sheet-up sm:animate-modal-in flex max-h-[92dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
    >
      <ModalHeader
        title={order.order_code}
        titleId="order-detail-modal-title"
        titleClassName="font-mono-tabular"
        badge={<OrderStatusBadge status={order.payment_status} />}
        subtitle={`${order.customer_name_snapshot} · Mua ${formatDateVN(order.purchased_at || order.created_at)}`}
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {/* 12-field Metadata Summary */}
        <div className="glass-well grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-[18px] p-3.5 text-[13px]">
          <div className="min-w-0">
            <span className="block text-[12px] text-[var(--text-secondary)]">SĐT</span>
            <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
              {order.customer_phone_snapshot || '—'}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] text-[var(--text-secondary)]">Địa chỉ</span>
            <span className="break-words font-medium text-[var(--text-primary)]">
              {order.customer_address_snapshot || '—'}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] text-[var(--text-secondary)]">Tên TK</span>
            <span className="font-medium text-[var(--text-primary)]">
              {formatPaymentAccount(order.payment_account, order.payment_account_note)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-[12px] text-[var(--text-secondary)]">Ngày TT</span>
            <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
              {order.paid_at ? formatDateVN(order.paid_at) : '—'}
            </span>
          </div>
          {order.note && (
            <div className="col-span-2 min-w-0">
              <span className="block text-[12px] text-[var(--text-secondary)]">Ghi chú</span>
              <span className="break-words font-medium text-[var(--text-primary)]">
                {order.note}
              </span>
            </div>
          )}
          <div className="col-span-2 min-w-0">
            <span className="block text-[12px] text-[var(--text-secondary)]">
              Ngày tạo hệ thống
            </span>
            <span className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
              {formatDateTimeVN(order.created_at)}
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
            {items.map((item) => (
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
              {formatVND(order.total_amount)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--text-secondary)]">Giá vốn</span>
            <span className="font-mono-tabular shrink-0 font-semibold text-[var(--text-secondary)]">
              {formatVND(order.total_cost ?? 0)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--text-secondary)]">Lãi</span>
            <span className="font-mono-tabular shrink-0 font-bold text-[var(--brand-jade-text)]">
              {order.payment_status === 'cancelled' ? '—' : formatVND(computeOrderProfit(order))}
            </span>
          </div>
          <div className="glass-divider flex justify-between gap-2 border-t pt-2">
            <span className="text-[var(--text-secondary)]">Đã thu</span>
            <span className="font-mono-tabular shrink-0 font-semibold text-[var(--brand-jade-text)]">
              {formatVND(order.paid_amount)}
            </span>
          </div>
          {order.remaining_amount > 0 && (
            <div className="flex justify-between gap-2 font-bold text-[var(--status-debt)]">
              <span>Còn nợ</span>
              <span className="font-mono-tabular shrink-0">
                {formatVND(order.remaining_amount)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {order.payment_status === 'cancelled' ? (
          <button
            type="button"
            onClick={onOpenEdit}
            className="glass-solid-control press-tactile flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-[var(--text-primary)]"
          >
            <Pencil className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
            <span>Sửa sổ</span>
          </button>
        ) : (order.payment_status === 'unpaid' || order.payment_status === 'partial') &&
          order.customer_id ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenEdit}
              className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
            >
              <Pencil className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
              <span className="truncate">Sửa sổ</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCollect(order)}
              className="glass-btn-primary press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold sm:text-[14px]"
            >
              <Banknote className="h-4 w-4 shrink-0" />
              <span className="truncate">Thu tiền</span>
            </button>
            <button
              type="button"
              onClick={onOpenInvoice}
              className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
            >
              <ReceiptText className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
              <span className="truncate">Hóa đơn</span>
            </button>
            <button
              type="button"
              onClick={onOpenQr}
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
              onClick={onOpenEdit}
              className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
            >
              <Pencil className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
              <span className="truncate">Sửa sổ</span>
            </button>
            <button
              type="button"
              onClick={onOpenInvoice}
              className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
            >
              <ReceiptText className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
              <span className="truncate">Hóa đơn</span>
            </button>
            <button
              type="button"
              onClick={onOpenQr}
              className="glass-btn-primary press-tactile col-span-2 flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold sm:col-span-1 sm:text-[14px]"
            >
              <QrCode className="h-4 w-4 shrink-0" />
              <span className="truncate">Mã VietQR</span>
            </button>
          </div>
        )}

        {/* Cancel Order Section */}
        {order.payment_status !== 'cancelled' && (
          <div className="glass-divider border-t pt-3.5">
            {!cancelConfirmOpen ? (
              <button
                type="button"
                onClick={() => onSetCancelConfirmOpen(true)}
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
                    <p className="font-bold">Hủy đơn {order.order_code}?</p>
                    <p className="mt-1">
                      Chỉ trừ phần nợ chưa thu (
                      <strong className="font-mono-tabular">
                        {formatVND(order.remaining_amount)}
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
                    onClick={() => onSetCancelConfirmOpen(false)}
                    className="glass-solid-control press-tactile min-h-[48px] flex-1 rounded-full px-3 text-[13px] font-semibold text-[var(--text-primary)] sm:text-[14px]"
                  >
                    Giữ lại
                  </button>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={onConfirmCancel}
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
  );
}
