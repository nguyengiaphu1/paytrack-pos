'use client';

import { Minus, Pencil, Plus } from 'lucide-react';
import type { Product } from '@/types/database';
import { formatVND } from '@/lib/vietnamese';
import { QtyNumberInput } from '@/components/ui/QtyNumberInput';

interface ProductCardProps {
  product: Product;
  qty: number;
  editMode: boolean;
  onAdd: (product: Product) => void;
  onSetQty: (product: Product, nextQty: number) => void;
  onEdit: (product: Product) => void;
}

export function ProductCard({
  product,
  qty,
  editMode,
  onAdd,
  onSetQty,
  onEdit,
}: ProductCardProps) {
  const inCart = qty > 0;
  const openEditor = editMode || !product.is_active;

  if (openEditor) {
    return (
      <div
        className={`glass-card glass-card-interactive glass-card-editing group flex min-w-0 flex-col overflow-hidden rounded-[22px] ${
          !product.is_active ? 'opacity-80' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => onEdit(product)}
          aria-label={
            !product.is_active ? `Hiện lại hoặc sửa ${product.name}` : `Sửa ${product.name}`
          }
          className="press-tactile flex min-h-[88px] w-full flex-1 min-w-0 flex-col justify-between gap-2 p-3.5 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
              {product.name}
            </span>
            {!product.is_active && (
              <span className="glass-badge-neutral shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium">
                Đã ẩn
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-1">
              <span className="font-mono-tabular truncate text-[16px] font-bold text-[var(--brand-jade-text)]">
                {formatVND(product.price)}
              </span>
              <span className="shrink-0 text-[12px] text-[var(--text-secondary)]">
                / {product.unit}
              </span>
            </div>
            <span className="glass-badge-paid inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold">
              <Pencil className="h-3.5 w-3.5" />
              <span>{!product.is_active ? 'Hiện lại' : 'Sửa'}</span>
            </span>
          </div>
        </button>
      </div>
    );
  }

  if (!inCart) {
    return (
      <div className="glass-card glass-card-interactive group flex min-w-0 flex-col overflow-hidden rounded-[22px]">
        <button
          type="button"
          onClick={() => onAdd(product)}
          aria-label={`Thêm ${product.name}, ${formatVND(product.price)} / ${product.unit}`}
          className="press-tactile flex h-full min-h-[104px] w-full min-w-0 flex-col justify-between gap-2 px-3.5 py-3 text-left"
        >
          <div className="flex w-full min-w-0 items-start justify-between gap-2">
            <span className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
              {product.name}
            </span>
            <span className="shrink-0 pt-0.5 text-[12px] font-medium text-[var(--text-secondary)]">
              / {product.unit}
            </span>
          </div>

          <div className="flex w-full items-center justify-between gap-2 pt-1">
            <span className="font-mono-tabular truncate text-[16px] font-bold text-[var(--brand-jade-text)]">
              {formatVND(product.price)}
            </span>
            <span
              aria-hidden="true"
              className="glass-solid-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--brand-jade-text)]"
            >
              <Plus className="h-[18px] w-[18px]" />
            </span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card glass-card-interactive glass-card-selected group flex min-w-0 flex-col justify-between overflow-hidden rounded-[22px]">
      {/* Compact Header Tap Zone (name + unit) */}
      <button
        type="button"
        onClick={() => onAdd(product)}
        aria-label={`Thêm 1 ${product.name}`}
        className="press-tactile flex min-h-[44px] w-full flex-1 min-w-0 items-start justify-between gap-2 px-3.5 pt-3 pb-1 text-left"
      >
        <span className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
          {product.name}
        </span>
        <span className="shrink-0 pt-0.5 text-[12px] font-medium text-[var(--text-secondary)]">
          / {product.unit}
        </span>
      </button>

      {/* Single Compact Action Row: Price Left + Inline 44x44px -/+ Stepper Right */}
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1 sm:px-3.5">
        <span className="font-mono-tabular min-w-0 flex-1 truncate text-[16px] font-bold text-[var(--brand-jade-text)]">
          {formatVND(product.price)}
        </span>

        <div className="glass-solid-control inline-flex shrink-0 items-center overflow-hidden rounded-full">
          <button
            type="button"
            onClick={() => {
              const next = Number((qty - 1).toFixed(2));
              onSetQty(product, next <= 0 ? 0 : next);
            }}
            aria-label={`Giảm ${product.name}`}
            className="press-tactile flex h-11 w-11 items-center justify-center text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-jade)]"
          >
            <Minus className="h-4 w-4" />
          </button>
          <QtyNumberInput
            value={qty}
            onCommit={(val) => onSetQty(product, val)}
            ariaLabel={`Số lượng ${product.name}`}
            className="glass-divider font-mono-tabular h-11 w-11 border-0 border-x bg-transparent text-center text-[16px] font-bold text-[var(--brand-jade-text)] focus-visible:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-jade)]"
          />
          <button
            type="button"
            onClick={() => onSetQty(product, Number((qty + 1).toFixed(2)))}
            aria-label={`Tăng ${product.name}`}
            className="press-tactile flex h-11 w-11 items-center justify-center text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-jade)]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
