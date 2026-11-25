'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { computeLineTotal, formatVND } from '@/lib/vietnamese';
import type { CartItem } from '@/types/database';

interface CheckoutOrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  totalCost: number;
  missingAnyCost: boolean;
  changeDue: number;
  remaining: number;
}

export function CheckoutOrderSummary({
  items,
  subtotal,
  discount,
  total,
  totalCost,
  missingAnyCost,
  changeDue,
  remaining,
}: CheckoutOrderSummaryProps) {
  const [showItemsBreakdown, setShowItemsBreakdown] = useState(false);

  const itemsPreviewText = useMemo(
    () => items.map((i) => `${i.quantity}× ${i.product_name}`).join(', '),
    [items]
  );

  return (
    <div className="glass-well space-y-2 rounded-[18px] p-4">
      {discount > 0 && (
        <div className="glass-divider space-y-1 border-b pb-2 text-[13px]">
          <div className="flex items-baseline justify-between gap-2 text-[var(--text-secondary)]">
            <span>Tạm tính</span>
            <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
              {formatVND(subtotal)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 text-[var(--status-debt)]">
            <span>Giảm giá</span>
            <span className="font-mono-tabular font-semibold">-{formatVND(discount)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[14px] font-medium text-[var(--text-secondary)]">
          Tổng đơn ({items.length} món)
        </span>
        <span className="font-mono-tabular shrink-0 text-[20px] font-bold text-[var(--text-primary)]">
          {formatVND(total)}
        </span>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowItemsBreakdown((v) => !v)}
            aria-expanded={showItemsBreakdown}
            aria-controls="checkout-items-breakdown"
            className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[12px] px-2 text-left text-[12px] font-semibold text-[var(--brand-jade-text)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <span className="min-w-0 truncate">
              {showItemsBreakdown
                ? `Thu gọn chi tiết ${items.length} món`
                : `Xem chi tiết ${items.length} món`}
            </span>
            {showItemsBreakdown ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </button>

          {!showItemsBreakdown && itemsPreviewText && (
            <p className="line-clamp-2 px-2 text-[12px] text-[var(--text-secondary)]">
              {itemsPreviewText}
            </p>
          )}

          {showItemsBreakdown && (
            <ul
              id="checkout-items-breakdown"
              className="glass-divider space-y-1.5 border-t pt-2 text-[13px]"
            >
              {items.map((item) => (
                <li key={item.key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--text-primary)]">
                      {item.product_name}
                    </p>
                    <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                      {item.quantity} {item.unit} × {formatVND(item.unit_price)}
                    </p>
                  </div>
                  <span className="font-mono-tabular shrink-0 font-semibold text-[var(--text-primary)]">
                    {formatVND(computeLineTotal(item.unit_price, item.quantity))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {totalCost > 0 ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
          <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span>Giá vốn / Lãi</span>
            {missingAnyCost && (
              <span className="glass-badge-debt rounded-full px-2 py-0.5 text-[12px] font-semibold">
                Thiếu vốn vài món
              </span>
            )}
          </span>
          <span className="font-mono-tabular text-[var(--text-secondary)]">
            {formatVND(totalCost)} /{' '}
            <strong
              className={
                total - totalCost >= 0
                  ? 'text-[var(--brand-jade-text)]'
                  : 'text-[var(--status-overdue)]'
              }
            >
              {formatVND(total - totalCost)}
            </strong>
          </span>
        </div>
      ) : (
        missingAnyCost && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--status-debt)]">
            <span className="inline-flex items-center gap-1 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Chưa nhập vốn</span>
            </span>
            <span className="text-[var(--text-secondary)]">Có thể bổ sung sau ở Sổ bán</span>
          </div>
        )
      )}

      {changeDue > 0 && (
        <div className="glass-divider flex flex-wrap items-baseline justify-between gap-2 border-t pt-2 text-[14px] font-bold text-[var(--brand-jade-text)]">
          <span>Tiền thối</span>
          <span className="font-mono-tabular text-[16px]">{formatVND(changeDue)}</span>
        </div>
      )}
      {remaining > 0 && (
        <div className="glass-divider flex flex-wrap items-baseline justify-between gap-2 border-t pt-2 text-[14px] font-bold text-[var(--status-debt)]">
          <span>Còn nợ</span>
          <span className="font-mono-tabular text-[16px]">{formatVND(remaining)}</span>
        </div>
      )}
    </div>
  );
}
