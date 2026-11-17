'use client';

import { useMemo, useState } from 'react';
import { PackageOpen, Pencil, Plus, Search, Zap } from 'lucide-react';
import type { Product } from '@/types/database';
import { formatVND, stripVietnamese } from '@/lib/vietnamese';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onOpenNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onOpenQuickItem: () => void;
}

export function ProductCatalog({
  products,
  onAddToCart,
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
            placeholder="Tìm tên món (gõ không dấu cũng ra, VD: gao, nuoc)..."
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
            <span>Bán món lẻ</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewProduct}
            className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-jade)] px-3.5 text-[14px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm món mới</span>
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

        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            className="h-4 w-4 accent-[var(--brand-jade)]"
          />
          <span>Hiện món đã ẩn</span>
        </label>
      </div>

      {/* Product Grid or Guided Empty State */}
      {products.length === 0 ? (
        <EmptyStateCard
          icon={PackageOpen}
          title="Sổ hàng hóa chưa có món nào"
          description="Bạn có thể lưu sẵn các mặt hàng hay bán để bấm 1 chạm lên đơn, hoặc bấm Bán món lẻ để tính tiền ngay."
          action={
            <>
              <button
                type="button"
                onClick={onOpenNewProduct}
                className="press-tactile flex min-h-[48px] items-center gap-2 rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm món đầu tiên</span>
              </button>
              <button
                type="button"
                onClick={onOpenQuickItem}
                className="press-tactile flex min-h-[48px] items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <Zap className="h-4 w-4 text-[var(--brand-jade-text)]" />
                <span>Bán món lẻ ngay</span>
              </button>
            </>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyStateCard
          icon={Search}
          title={`Không thấy món khớp với "${query}"`}
          description="Thử gõ tên khác ngắn hơn hoặc thêm nhanh món này vào đơn hàng hiện tại."
          action={
            <button
              type="button"
              onClick={onOpenQuickItem}
              className="press-tactile flex min-h-[48px] items-center gap-2 rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
            >
              <Zap className="h-4 w-4" />
              <span>Bán món lẻ ngay</span>
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <div
              key={product.id}
              className={`group flex min-w-0 items-stretch justify-between rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] transition-colors hover:border-[var(--brand-jade)] ${
                !product.is_active ? 'opacity-60' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                className="press-tactile flex min-h-[68px] min-w-0 flex-1 flex-col justify-between p-3 text-left active:bg-[var(--bg-subtle)]"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="line-clamp-2 break-words text-[15px] font-semibold text-[var(--text-primary)]">
                    {product.name}
                  </span>
                </div>
                <div className="mt-2 flex w-full items-baseline justify-between gap-2">
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
          ))}
        </div>
      )}
    </div>
  );
}
