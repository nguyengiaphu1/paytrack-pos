'use client';

import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { computeLineTotal, computeOrderTotals, formatVND } from '@/lib/vietnamese';
import type { CartItem, Customer } from '@/types/database';
import { CustomerPicker } from './CustomerPicker';

interface CartPanelProps {
  items: CartItem[];
  discount: number;
  onChangeDiscount: (val: number) => void;
  onUpdateQty: (key: string, nextQty: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onCustomerCreated: (customer: Customer) => void;
  onOpenCheckout: () => void;
}

export function CartPanel({
  items,
  discount,
  onChangeDiscount,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onCustomerCreated,
  onOpenCheckout,
}: CartPanelProps) {
  const { subtotal, discount: safeDiscount, total } = computeOrderTotals(items, discount);

  return (
    <div className="flex flex-col rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-[var(--brand-jade)]" />
          <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
            Đơn hiện tại ({items.length})
          </h2>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-[13px] font-medium text-[var(--status-overdue)] hover:underline"
          >
            Xóa giỏ
          </button>
        )}
      </div>

      {/* Customer Picker */}
      <div className="border-b border-[var(--border-default)] p-3">
        <CustomerPicker
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelect={onSelectCustomer}
          onCustomerCreated={onCustomerCreated}
        />
      </div>

      {/* Cart Items */}
      <div className="max-h-[42vh] flex-1 divide-y divide-[var(--border-default)] overflow-y-auto px-3">
        {items.length === 0 ? (
          <div className="py-10 text-center text-[14px] text-[var(--text-secondary)]">
            Chạm vào sản phẩm bên trái để thêm vào đơn.
          </div>
        ) : (
          items.map((item) => {
            const lineTotal = computeLineTotal(item.quantity, item.unit_price);
            return (
              <div key={item.key} className="py-3">
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
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--status-overdue-bg)] hover:text-[var(--status-overdue)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex shrink-0 items-center rounded-lg border border-[var(--border-default)]">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Number((item.quantity - 1).toFixed(2));
                        if (next <= 0) onRemoveItem(item.key);
                        else onUpdateQty(item.key, next);
                      }}
                      aria-label="Giảm số lượng"
                      className="flex h-11 w-11 items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (Number.isFinite(val) && val > 0) onUpdateQty(item.key, val);
                      }}
                      aria-label="Số lượng"
                      className="font-mono-tabular h-11 w-14 border-x border-[var(--border-default)] text-center text-[15px] font-semibold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.key, Number((item.quantity + 1).toFixed(2)))}
                      aria-label="Tăng số lượng"
                      className="flex h-11 w-11 items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
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
      <div className="space-y-2.5 border-t border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5">
        <div className="flex items-center justify-between gap-2 text-[14px]">
          <span className="text-[var(--text-secondary)]">Tạm tính</span>
          <span className="font-mono-tabular shrink-0 font-semibold">{formatVND(subtotal)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 text-[14px]">
          <label htmlFor="cart-discount" className="text-[var(--text-secondary)]">
            Giảm giá (đ)
          </label>
          <input
            id="cart-discount"
            type="number"
            min={0}
            step={1000}
            value={discount || ''}
            placeholder="0"
            onChange={(e) => onChangeDiscount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
            className="font-mono-tabular min-h-[40px] w-32 shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 text-right text-[15px] font-semibold outline-none focus:border-[var(--brand-jade)]"
          />
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--border-default)] pt-2">
          <span className="text-[15px] font-bold">Tổng thanh toán</span>
          <span className="font-mono-tabular shrink-0 text-[20px] font-bold text-[var(--brand-jade)] sm:text-[22px]">
            {formatVND(total)}
          </span>
        </div>

        {safeDiscount !== discount && (
          <p className="text-[12px] text-[var(--status-debt)]">
            Giảm giá đã tự giới hạn bằng tổng tiền đơn.
          </p>
        )}

        <button
          type="button"
          disabled={items.length === 0}
          onClick={onOpenCheckout}
          className="flex min-h-[50px] w-full items-center justify-center rounded-lg bg-[var(--brand-jade)] px-3 text-center text-[15px] font-bold text-white transition-colors hover:bg-[var(--brand-jade-hover)] disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 sm:text-[16px]"
        >
          Thanh toán / Ghi nợ ({formatVND(total)})
        </button>
      </div>
    </div>
  );
}
