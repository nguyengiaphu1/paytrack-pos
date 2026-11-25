'use client';

import { CheckCircle2, QrCode, ReceiptText } from 'lucide-react';
import { formatVND } from '@/lib/vietnamese';
import type { Order } from '@/types/database';

interface CheckoutSuccessViewProps {
  order: Order;
  onOpenInvoice: () => void;
  onOpenQr: () => void;
  onClose: () => void;
}

export function CheckoutSuccessView({
  order,
  onOpenInvoice,
  onOpenQr,
  onClose,
}: CheckoutSuccessViewProps) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:pb-5">
      <div className="glass-card glass-card-selected rounded-[22px] p-5 text-center">
        <div className="glass-icon-orb mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] text-[var(--brand-jade-text)]">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <p className="mt-3 font-mono-tabular text-[16px] font-bold text-[var(--text-primary)]">
          {order.order_code}
        </p>
        <p className="mt-1 break-words text-[14px] text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">{order.customer_name_snapshot}</strong> ·{' '}
          <strong className="font-mono-tabular text-[var(--brand-jade-text)]">
            {formatVND(order.total_amount)}
          </strong>
        </p>
        <p
          className={`mt-2.5 inline-flex flex-wrap items-center justify-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold ${
            order.remaining_amount === 0 ? 'glass-badge-paid' : 'glass-badge-debt'
          }`}
        >
          <span>
            {order.remaining_amount === 0
              ? order.payment_method === 'cash'
                ? 'Đã thu đủ · Tiền mặt'
                : 'Đã thu đủ · Chuyển khoản'
              : order.paid_amount > 0
                ? `Trả trước ${formatVND(order.paid_amount)}`
                : 'Ghi nợ toàn bộ'}
          </span>
          {order.payment_account && (
            <span>
              ·{' '}
              {order.payment_account === 'Khác' && order.payment_account_note
                ? order.payment_account_note
                : order.payment_account}
            </span>
          )}
        </p>
        {order.remaining_amount > 0 && (
          <p className="mt-2 font-mono-tabular text-[14px] font-bold text-[var(--status-debt)]">
            Còn nợ: {formatVND(order.remaining_amount)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onOpenInvoice}
          className={`press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold sm:text-[14px] ${
            order.remaining_amount === 0
              ? 'glass-btn-primary'
              : 'glass-solid-control text-[var(--text-primary)]'
          }`}
        >
          <ReceiptText
            className={`h-4 w-4 shrink-0 ${
              order.remaining_amount === 0 ? 'text-white' : 'text-[var(--brand-jade-text)]'
            }`}
          />
          <span className="truncate">Hóa đơn</span>
        </button>
        <button
          type="button"
          onClick={onOpenQr}
          className={`press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold sm:text-[14px] ${
            order.remaining_amount > 0
              ? 'glass-btn-primary'
              : 'glass-solid-control text-[var(--text-primary)]'
          }`}
        >
          <QrCode
            className={`h-4 w-4 shrink-0 ${
              order.remaining_amount > 0 ? 'text-white' : 'text-[var(--brand-jade-text)]'
            }`}
          />
          <span className="truncate">Tạo QR</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="glass-solid-control press-tactile flex min-h-[48px] w-full items-center justify-center rounded-full text-[15px] font-semibold text-[var(--text-primary)]"
      >
        Bán đơn mới
      </button>
    </div>
  );
}
