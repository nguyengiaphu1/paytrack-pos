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
  onOpenCustomerPicker?: () => void;
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
  onOpenCustomerPicker,
  onOpenCheckout,
}: CartPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const showConfirmClear = confirmClear && items.length > 0;
  const { subtotal, discount: safeDiscount, total } = computeOrderTotals(items, discount);
  const isSheet = variant === 'sheet';

  return (
    <div
      className={`flex flex-col overflow-hidden ${
        isSheet
          ? 'min-h-0 flex-1'
          : 'glass-panel rounded-[26px] lg:max-h-[calc(100dvh-168px)]'
      }`}
    >
      {/* Crystal Frosted Header */}
      <div className="glass-modal-header flex shrink-0 items-center justify-between gap-2 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-[var(--brand-jade-text)]">
            <ShoppingCart className="h-[18px] w-[18px]" />
          </span>
          <h2
            id={isSheet ? 'mobile-cart-sheet-title' : undefined}
            className="truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            Giỏ hàng
          </h2>
          <span
            key={items.length}
            className={`animate-badge-pop font-mono-tabular inline-flex h-6 min-w-[26px] shrink-0 items-center justify-center rounded-full px-2 text-[12px] font-bold ${
              items.length > 0 ? 'glass-badge-paid' : 'glass-badge-neutral'
            }`}
          >
            {items.length}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {items.length > 0 && !showConfirmClear && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-[44px] shrink-0 rounded-full px-2.5 text-[13px] font-semibold text-[var(--status-overdue)] transition-colors hover:bg-[var(--status-overdue-bg)]"
            >
              Xóa giỏ
            </button>
          )}

          {isSheet && onCloseSheet && (
            <button
              type="button"
              onClick={onCloseSheet}
              aria-label="Đóng giỏ hàng"
              className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
          className="glass-badge-overdue flex shrink-0 flex-wrap items-center justify-between gap-2 border-x-0 border-t-0 px-4 py-2.5 text-[13px]"
        >
          <span className="font-semibold">Xóa toàn bộ {items.length} món?</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="glass-solid-control press-tactile min-h-[44px] rounded-full px-3.5 text-[13px] font-semibold text-[var(--text-primary)]"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmClear(false);
                onClearCart();
              }}
              className="glass-btn-danger press-tactile min-h-[44px] rounded-full px-3.5 text-[13px] font-bold"
            >
              Xác nhận xóa
            </button>
          </div>
        </div>
      )}

      {/* Selected Buyer Snapshot Line (tappable to change customer right from CartPanel/sheet) */}
      {onOpenCustomerPicker ? (
        <button
          type="button"
          onClick={onOpenCustomerPicker}
          aria-label={`Khách hàng: ${selectedCustomer ? selectedCustomer.name : 'Khách lẻ'}. Bấm để đổi khách`}
          className="glass-divider press-tactile shrink-0 space-y-1 border-b bg-[var(--bg-subtle)] px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-[var(--glass-modal-bar-bg)]"
        >
          <div className="flex min-h-[44px] items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-[var(--text-secondary)]">Khách:</span>
              <span className="truncate font-semibold text-[var(--text-primary)]">
                {selectedCustomer ? selectedCustomer.name : 'Khách lẻ'}
              </span>
              {selectedCustomer && selectedCustomer.total_debt > 0 && (
                <span className="glass-badge-debt font-mono-tabular shrink-0 rounded-full px-2 py-0.5 text-[12px] font-bold">
                  Nợ {formatVND(selectedCustomer.total_debt)}
                </span>
              )}
            </div>
            <span className="shrink-0 text-[12px] font-semibold text-[var(--brand-jade-text)]">
              {selectedCustomer ? 'Đổi' : 'Chọn khách'}
            </span>
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
        </button>
      ) : (
        <div className="glass-divider shrink-0 space-y-1 border-b bg-[var(--bg-subtle)] px-4 py-2.5 text-[13px]">
          <div className="flex items-center justify-between gap-2">
            <span className="shrink-0 text-[var(--text-secondary)]">Khách:</span>
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-semibold text-[var(--text-primary)]">
                {selectedCustomer ? selectedCustomer.name : 'Khách lẻ'}
              </span>
              {selectedCustomer && selectedCustomer.total_debt > 0 && (
                <span className="glass-badge-debt font-mono-tabular shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold">
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
      )}

      {/* Cart Items (bounded scroll in both desktop sticky card and mobile sheet) */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {items.length === 0 ? (
          <div className="glass-well space-y-2.5 rounded-[18px] px-3 py-9 text-center text-[14px] text-[var(--text-secondary)]">
            <p>Chưa chọn món nào.</p>
            {!isSheet && (
              <p className="hidden flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] text-[var(--text-secondary)] lg:flex">
                <span className="inline-flex items-center gap-1">
                  <kbd className="glass-badge-neutral rounded-full px-2 py-0.5 font-mono text-[12px] font-semibold">
                    /
                  </kbd>
                  <span>Tìm món</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="glass-badge-neutral rounded-full px-2 py-0.5 font-mono text-[12px] font-semibold">
                    Ctrl+↵
                  </kbd>
                  <span>Thanh toán</span>
                </span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const lineTotal = computeLineTotal(item.quantity, item.unit_price);
              return (
                <div key={item.key} className="glass-well animate-fade-in rounded-[18px] p-3">
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
                      className="press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--status-overdue-bg)] hover:text-[var(--status-overdue)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="glass-solid-control inline-flex shrink-0 items-center overflow-hidden rounded-full">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Number((item.quantity - 1).toFixed(2));
                          if (next <= 0) onRemoveItem(item.key);
                          else onUpdateQty(item.key, next);
                        }}
                        aria-label={`Giảm số lượng ${item.product_name}`}
                        className="press-tactile flex h-11 w-11 items-center justify-center text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-jade)]"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <QtyNumberInput
                        value={item.quantity}
                        onCommit={(val) => onUpdateQty(item.key, val)}
                        ariaLabel={`Số lượng ${item.product_name}`}
                        className="glass-divider font-mono-tabular h-11 w-12 border-0 border-x bg-transparent text-center text-[16px] font-semibold text-[var(--brand-jade-text)] focus-visible:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-jade)]"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.key, Number((item.quantity + 1).toFixed(2)))}
                        aria-label={`Tăng số lượng ${item.product_name}`}
                        className="press-tactile flex h-11 w-11 items-center justify-center text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-jade)]"
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
            })}
          </div>
        )}
      </div>

      {/* Frosted Totals Well + 3D Jade Crystal Caustic Checkout CTA */}
      <div className="glass-modal-footer shrink-0 space-y-3 p-4">
        <div className="glass-well space-y-2.5 rounded-[18px] p-3">
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
                className="w-full sm:max-w-[210px]"
              />
            </div>
          </div>

          <div className="glass-divider flex flex-wrap items-baseline justify-between gap-2 border-t pt-2.5">
            <span className="text-[15px] font-bold text-[var(--text-primary)]">Tổng cộng</span>
            <span className="font-mono-tabular shrink-0 text-[20px] font-bold text-[var(--brand-jade-text)]">
              {formatVND(total)}
            </span>
          </div>
        </div>

        {safeDiscount !== discount && (
          <p role="status" className="text-[12px] font-medium text-[var(--status-debt)]">
            Giảm giá tối đa bằng tổng tiền đơn.
          </p>
        )}

        <button
          type="button"
          disabled={items.length === 0}
          onClick={onOpenCheckout}
          className="glass-btn-primary press-tactile flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-4 text-center text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-45 sm:text-[16px]"
        >
          <span>Thanh toán ({formatVND(total)})</span>
          {!isSheet && items.length > 0 && (
            <kbd
              aria-hidden="true"
              className="hidden rounded-full bg-white/15 px-2 py-0.5 font-mono text-[12px] font-semibold text-white/90 lg:inline-flex"
            >
              Ctrl+↵
            </kbd>
          )}
        </button>
      </div>
    </div>
  );
}
