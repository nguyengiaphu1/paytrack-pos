'use client';

import { useMemo, useState } from 'react';
import { Minus, PackageOpen, Pencil, Plus, Search, Zap } from 'lucide-react';
import type { Product } from '@/types/database';
import { formatVND, stripVietnamese } from '@/lib/vietnamese';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';

interface ProductCatalogProps {
  products: Product[];
  cartQtyByProductId: Record<string, number>;
  onAddToCart: (product: Product) => void;
  onSetProductQty: (product: Product, nextQty: number) => void;
  onOpenNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onOpenQuickItem: () => void;
}

export function ProductCatalog({
  products,
  cartQtyByProductId,
  onAddToCart,
  onSetProductQty,
  onOpenNewProduct,
  onEditProduct,
  onOpenQuickItem,
}: ProductCatalogProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showHidden, setShowHidden] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category && (showHidden || p.is_active)) {
        set.add(p.category);
      }
    }
    return ['ALL', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))];
  }, [products, showHidden]);

  const filtered = useMemo(() => {
    const q = stripVietnamese(query);
    return products.filter((p) => {
      if (!showHidden && !p.is_active) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (q && !p.search_text.includes(q)) return false;
      return true;
    });
  }, [products, query, selectedCategory, showHidden]);

  return (
    <div className="space-y-3">
      {/* Search + Quick Actions */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm món hàng..."
            className="min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pr-3.5 pl-10 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={onOpenQuickItem}
            className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <Zap className="h-4 w-4 text-[var(--brand-jade-text)]" />
            <span>Món lẻ</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewProduct}
            className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-jade)] px-3.5 text-[14px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm món</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Show Hidden */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`press-tactile min-h-[44px] rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                selectedCategory === cat
                  ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {cat === 'ALL' ? 'Tất cả' : cat}
            </button>
          ))}
        </div>

        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            className="h-4 w-4 accent-[var(--brand-jade)]"
          />
          <span>Món đã ẩn</span>
        </label>
      </div>

      {/* Product Grid or Empty State */}
      {products.length === 0 ? (
        <EmptyStateCard
          icon={PackageOpen}
          title="Chưa có món hàng"
          description="Thêm món thường bán hoặc bấm Món lẻ để lên đơn ngay."
          action={
            <>
              <button
                type="button"
                onClick={onOpenNewProduct}
                className="press-tactile flex min-h-[48px] items-center gap-2 rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm món</span>
              </button>
              <button
                type="button"
                onClick={onOpenQuickItem}
                className="press-tactile flex min-h-[48px] items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <Zap className="h-4 w-4 text-[var(--brand-jade-text)]" />
                <span>Món lẻ</span>
              </button>
            </>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyStateCard
          icon={Search}
          title={`Không thấy "${query}"`}
          description="Thử từ khác hoặc thêm nhanh món lẻ vào đơn."
          action={
            <button
              type="button"
              onClick={onOpenQuickItem}
              className="press-tactile flex min-h-[48px] items-center gap-2 rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
            >
              <Zap className="h-4 w-4" />
              <span>Thêm món lẻ</span>
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const qty = cartQtyByProductId[product.id] ?? 0;
            const inCart = qty > 0;

            return (
              <div
                key={product.id}
                className={`group flex min-w-0 flex-col rounded-[10px] border transition-colors ${
                  inCart
                    ? 'border-[var(--brand-jade)] bg-[var(--bg-surface)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--brand-jade)]'
                } ${!product.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex min-w-0 items-stretch justify-between">
                  <button
                    type="button"
                    onClick={() => onAddToCart(product)}
                    className="press-tactile flex min-h-[66px] min-w-0 flex-1 flex-col justify-between p-3 text-left active:bg-[var(--bg-subtle)]"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="line-clamp-2 break-words text-[15px] font-semibold text-[var(--text-primary)]">
                        {product.name}
                      </span>
                    </div>
                    <div className="mt-1.5 flex w-full items-baseline justify-between gap-2">
                      <span className="font-mono-tabular truncate text-[15px] font-bold text-[var(--brand-jade-text)]">
                        {formatVND(product.price)}
                      </span>
                      <span className="shrink-0 text-[12px] text-[var(--text-secondary)]">
                        / {product.unit}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditProduct(product)}
                    aria-label={`Sửa ${product.name}`}
                    className="flex w-11 shrink-0 items-center justify-center border-l border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                {inCart && (
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--border-default)] bg-[var(--bg-subtle)] px-2 py-1.5">
                    <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Số lượng ({product.unit})
                    </span>
                    <div className="inline-flex shrink-0 items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Number((qty - 1).toFixed(2));
                          onSetProductQty(product, next <= 0 ? 0 : next);
                        }}
                        aria-label={`Giảm ${product.name}`}
                        className="press-tactile flex h-11 w-11 items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        min="0.01"
                        value={qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (Number.isFinite(val) && val > 0) {
                            onSetProductQty(product, Number(val.toFixed(2)));
                          }
                        }}
                        aria-label={`Số lượng ${product.name}`}
                        className="font-mono-tabular h-11 w-14 border-x border-[var(--border-default)] bg-[var(--bg-surface)] text-center text-[16px] font-bold text-[var(--brand-jade-text)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => onSetProductQty(product, Number((qty + 1).toFixed(2)))}
                        aria-label={`Tăng ${product.name}`}
                        className="press-tactile flex h-11 w-11 items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
