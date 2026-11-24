'use client';

import { useState } from 'react';
import { MapPin, Minus, Phone, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { computeLineTotal, computeOrderTotals, formatVND } from '@/lib/vietnamese';
import type { CartItem, Customer } from '@/types/database';
import { VndKInput } from '@/components/ui/VndKInput';
import { QtyNumberInput } from '@/components/ui/QtyNumberInput';

interface CartPanelProps {
  items: CartItem[];
  discount: number;
  discountInputId?: string;
  variant?: 'desktop' | 'sheet';
  onCloseSheet?: () => void;
  onChangeDiscount: (val: number) => void;
  onUpdateQty: (key: string, nextQty: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  selectedCustomer: Customer | null;
  onOpenCheckout: () => void;
}

export function CartPanel({
  items,
  discount,
  discountInputId = 'cart-discount',
  variant = 'desktop',
  onCloseSheet,
  onChangeDiscount,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  selectedCustomer,
  onOpenCheckout,
}: CartPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const showConfirmClear = confirmClear && items.length > 0;
  const { subtotal, discount: safeDiscount, total } = computeOrderTotals(items, discount);
  const isSheet = variant === 'sheet';

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] ${
        isSheet ? 'min-h-0 flex-1' : 'lg:max-h-[calc(100dvh-168px)]'
      }`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-default)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ShoppingCart className="h-5 w-5 shrink-0 text-[var(--brand-jade-text)]" />
          <h2
            id={isSheet ? 'mobile-cart-sheet-title' : undefined}
            className="truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            Giỏ hàng
          </h2>
          <span
            key={items.length}
            className="animate-badge-pop font-mono-tabular inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-[var(--status-paid-bg)] px-2 text-[12px] font-bold text-[var(--brand-jade-text)]"
          >
            {items.length}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {items.length > 0 && !showConfirmClear && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-[44px] shrink-0 px-1.5 text-[13px] font-semibold text-[var(--status-overdue)] hover:underline"
            >
              Xóa giỏ
            </button>
          )}

          {isSheet && onCloseSheet && (
            <button
              type="button"
              onClick={onCloseSheet}
              aria-label="Đóng giỏ hàng"
              className="press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Full-width Clear Cart Confirmation Strip (never squeezes 375px header) */}
      {showConfirmClear && (
        <div
          role="alert"
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-4 py-2 text-[13px]"
        >
          <span className="font-semibold text-[var(--status-overdue)]">
            Xóa toàn bộ {items.length} món?
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[13px] font-semibold text-[var(--text-primary)]"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmClear(false);
                onClearCart();
              }}
              className="press-tactile min-h-[44px] rounded-lg bg-[var(--status-overdue-solid)] px-3 text-[13px] font-bold text-white"
            >
              Xác nhận xóa
            </button>
          </div>
        </div>
      )}

      {/* Selected Buyer Snapshot Line (name, debt, phone, address) */}
      <div className="shrink-0 space-y-1 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-2 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 text-[var(--text-secondary)]">Khách:</span>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-semibold text-[var(--text-primary)]">
              {selectedCustomer ? selectedCustomer.name : 'Khách lẻ'}
            </span>
            {selectedCustomer && selectedCustomer.total_debt > 0 && (
              <span className="font-mono-tabular shrink-0 rounded-full bg-[var(--status-debt-bg)] px-2 py-0.5 text-[12px] font-bold text-[var(--status-debt)]">
                Nợ {formatVND(selectedCustomer.total_debt)}
              </span>
            )}
          </div>
        </div>
        {(selectedCustomer?.phone || selectedCustomer?.address) && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-[var(--text-secondary)]">
            {selectedCustomer.phone && (
              <span className="font-mono-tabular inline-flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" />
                {selectedCustomer.phone}
              </span>
            )}
            {selectedCustomer.address && (
              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {selectedCustomer.address}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cart Items (bounded scroll in both desktop sticky card and mobile sheet) */}
      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[var(--border-default)] px-3">
        {items.length === 0 ? (
          <div className="py-10 text-center text-[14px] text-[var(--text-secondary)]">
            Chưa chọn món nào.
          </div>
        ) : (
          items.map((item) => {
            const lineTotal = computeLineTotal(item.quantity, item.unit_price);
            return (
              <div key={item.key} className="animate-fade-in py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[14px] font-semibold text-[var(--text-primary)]">
                      {item.product_name}
                    </p>
                    <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                      {formatVND(item.unit_price)} / {item.unit}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.key)}
                    aria-label={`Xóa ${item.product_name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--status-overdue-bg)] hover:text-[var(--status-overdue)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex shrink-0 items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Number((item.quantity - 1).toFixed(2));
                        if (next <= 0) onRemoveItem(item.key);
                        else onUpdateQty(item.key, next);
                      }}
                      aria-label={`Giảm số lượng ${item.product_name}`}
                      className="press-tactile flex h-11 w-11 items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <QtyNumberInput
                      value={item.quantity}
                      onCommit={(val) => onUpdateQty(item.key, val)}
                      ariaLabel={`Số lượng ${item.product_name}`}
                      className="font-mono-tabular h-11 w-14 border-x border-[var(--border-default)] bg-[var(--bg-surface)] text-center text-[16px] font-semibold text-[var(--text-primary)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.key, Number((item.quantity + 1).toFixed(2)))}
                      aria-label={`Tăng số lượng ${item.product_name}`}
                      className="press-tactile flex h-11 w-11 items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <span className="font-mono-tabular shrink-0 text-[15px] font-bold text-[var(--text-primary)]">
                    {formatVND(lineTotal)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Totals + Checkout CTA */}
      <div className="shrink-0 space-y-2.5 border-t border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5">
        <div className="flex items-center justify-between gap-2 text-[14px]">
          <span className="text-[var(--text-secondary)]">Tạm tính</span>
          <span className="font-mono-tabular shrink-0 font-semibold text-[var(--text-primary)]">
            {formatVND(subtotal)}
          </span>
        </div>

        <div className="space-y-1.5 text-[14px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={discountInputId} className="shrink-0 text-[var(--text-secondary)]">
              Giảm giá (nghìn)
            </label>
            <VndKInput
              id={discountInputId}
              compact
              showPreview
              align="right"
              valueVnd={discount > 0 ? discount : null}
              onChangeVnd={(val) => onChangeDiscount(val ?? 0)}
              placeholder="0"
              className="w-full sm:max-w-[220px]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--border-default)] pt-2">
          <span className="text-[15px] font-bold text-[var(--text-primary)]">Tổng cộng</span>
          <span className="font-mono-tabular shrink-0 text-[20px] font-bold text-[var(--brand-jade-text)]">
            {formatVND(total)}
          </span>
        </div>

        {safeDiscount !== discount && (
          <p className="text-[12px] text-[var(--status-debt)]">
            Giảm giá tối đa bằng tổng tiền đơn.
          </p>
        )}

        <button
          type="button"
          disabled={items.length === 0}
          onClick={onOpenCheckout}
          className="press-tactile flex min-h-[50px] w-full items-center justify-center rounded-lg bg-[var(--brand-jade)] px-3 text-center text-[15px] font-bold text-white transition-colors hover:bg-[var(--brand-jade-hover)] disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 sm:text-[16px]"
        >
          Thanh toán ({formatVND(total)})
        </button>
      </div>
    </div>
  );
}
