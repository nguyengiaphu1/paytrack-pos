'use client';

import type { PaymentStatus } from '@/types/database';
import { PAYMENT_STATUS_LABEL_VN } from '@/lib/ledger';

export const ORDER_STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  paid: {
    label: PAYMENT_STATUS_LABEL_VN.paid,
    className: 'glass-badge-paid',
  },
  partial: {
    label: PAYMENT_STATUS_LABEL_VN.partial,
    className: 'glass-badge-debt',
  },
  unpaid: {
    label: PAYMENT_STATUS_LABEL_VN.unpaid,
    className: 'glass-badge-debt',
  },
  cancelled: {
    label: PAYMENT_STATUS_LABEL_VN.cancelled,
    className: 'glass-badge-neutral line-through',
  },
};

interface OrderStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  const meta = ORDER_STATUS_META[status];
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${meta.className} ${className}`.trim()}
    >
      {meta.label}
    </span>
  );
}
