'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, EyeOff, Minus, PackageOpen, Pencil, Plus, Search, Zap } from 'lucide-react';
import type { Product } from '@/types/database';
import { formatVND, stripVietnamese } from '@/lib/vietnamese';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { QtyNumberInput } from '@/components/ui/QtyNumberInput';
import { hasOpenModalDialog } from '@/components/ui/ModalDialog';

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
  const [editMode, setEditMode] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleSlashShortcut(e: KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (hasOpenModalDialog()) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }

    document.addEventListener('keydown', handleSlashShortcut);
    return () => document.removeEventListener('keydown', handleSlashShortcut);
  }, []);

  function handleAdd(product: Product) {
    const nextQty = Number(((cartQtyByProductId[product.id] ?? 0) + 1).toFixed(2));
    onAddToCart(product);
    setLiveAnnouncement(`Đã thêm ${product.name} vào đơn (${nextQty} ${product.unit})`);
  }

  const hiddenCount = useMemo(
    () => products.filter((p) => !p.is_active).length,
    [products]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category && (showHidden || p.is_active)) {
        set.add(p.category);
      }
    }
    return ['ALL', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))];
  }, [products, showHidden]);

  const activeCategory = categories.includes(selectedCategory) ? selectedCategory : 'ALL';

  const filtered = useMemo(() => {
    const q = stripVietnamese(query);
    return products.filter((p) => {
      if (!showHidden && !p.is_active) return false;
      if (activeCategory !== 'ALL' && p.category !== activeCategory) return false;
      if (q && !p.search_text.includes(q)) return false;
      return true;
    });
  }, [products, query, activeCategory, showHidden]);

  return (
    <div className="space-y-2.5 sm:space-y-3">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Search + Ad-Hoc Item Row (strictly 1-row at 375px) */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !editMode && query.trim() && filtered.length > 0) {
                e.preventDefault();
                handleAdd(filtered[0]);
                e.currentTarget.select();
              }
            }}
            aria-label="Tìm món hàng"
            placeholder="Tìm món..."
            className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pr-2.5 pl-9 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)] lg:pr-10"
          />
          {!query && (
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 items-center rounded border border-[var(--border-default)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[12px] font-medium text-[var(--text-secondary)] lg:inline-flex"
            >
              /
            </kbd>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenQuickItem}
          title="Thêm nhanh món ngoài danh mục vào đơn này"
          className="press-tactile flex min-h-[46px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] sm:px-3.5"
        >
          <Zap className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
          <span>Món lẻ</span>
        </button>
      </div>

      {/* Category Strip (horizontal scroll on mobile) + Catalog Management (Đã ẩn / Thêm món / Sửa) */}
      {products.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          {categories.length > 1 ? (
            <div
              className="scrollbar-none flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto touch-pan-x sm:flex-wrap sm:overflow-visible"
              role="group"
              aria-label="Lọc theo danh mục"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={activeCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`press-tactile min-h-[44px] shrink-0 whitespace-nowrap rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                    activeCategory === cat
                      ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  {cat === 'ALL' ? 'Tất cả' : cat}
                </button>
              ))}
            </div>
          ) : (
            <span className="font-mono-tabular text-[13px] font-medium text-[var(--text-secondary)]">
              {filtered.length} món
            </span>
          )}

          <div className="flex shrink-0 items-center gap-1.5">
            {(hiddenCount > 0 || showHidden) && (
              <button
                type="button"
                aria-pressed={showHidden}
                onClick={() => setShowHidden((v) => !v)}
                className={`press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
                  showHidden
                    ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <EyeOff className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Đã ẩn ({hiddenCount})</span>
                <span className="font-mono-tabular sm:hidden">({hiddenCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNewProduct}
              aria-label="Thêm món mới vào danh mục"
              title="Thêm món mới vào danh mục bán lâu dài"
              className="press-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 text-[13px] font-semibold text-[var(--brand-jade-text)] hover:border-[var(--brand-jade)] hover:bg-[var(--status-paid-bg)]"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Thêm món</span>
            </button>

            <button
              type="button"
              aria-pressed={editMode}
              onClick={() => setEditMode((v) => !v)}
              className={`press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold transition-colors ${
                editMode
                  ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {editMode ? (
                <>
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span>Xong</span>
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5 shrink-0" />
                  <span>Sửa</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Calm Edit-Mode Banner */}
      {editMode && products.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="animate-fade-in flex items-center justify-between gap-2 rounded-[10px] border border-[var(--status-paid-border)] bg-[var(--status-paid-bg)] px-3 py-2 text-[13px] font-medium text-[var(--brand-jade-text)]"
        >
          <span>Chạm vào món để sửa giá, vốn hoặc ẩn món.</span>
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="press-tactile inline-flex min-h-[44px] shrink-0 items-center rounded-lg bg-[var(--bg-surface)] px-3 text-[13px] font-bold text-[var(--brand-jade-text)]"
          >
            Xong
          </button>
        </div>
      )}

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
          title={
            query.trim()
              ? `Không thấy "${query.trim()}"`
              : activeCategory !== 'ALL'
                ? `Chưa có món trong "${activeCategory}"`
                : 'Không có món đang hiện'
          }
          description={
            query.trim()
              ? 'Thử từ khác hoặc thêm nhanh món lẻ vào đơn.'
              : 'Xóa bộ lọc để xem toàn bộ danh sách hoặc thêm món lẻ.'
          }
          action={
            <>
              {(query.trim() || activeCategory !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSelectedCategory('ALL');
                  }}
                  className="press-tactile flex min-h-[48px] items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  <span>Xem tất cả</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenQuickItem}
                className="press-tactile flex min-h-[48px] items-center gap-2 rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
              >
                <Zap className="h-4 w-4" />
                <span>Thêm món lẻ</span>
              </button>
            </>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-start xl:grid-cols-3">
          {filtered.map((product) => {
            const qty = cartQtyByProductId[product.id] ?? 0;
            const inCart = qty > 0;
            const openEditor = editMode || !product.is_active;

            return (
              <div
                key={product.id}
                className={`group flex min-w-0 flex-col rounded-[10px] border transition-colors ${
                  openEditor
                    ? 'border-dashed border-[var(--brand-jade)] bg-[var(--bg-surface)]'
                    : inCart
                      ? 'border-[var(--brand-jade)] bg-[var(--bg-surface)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--brand-jade)]'
                } ${!product.is_active ? 'opacity-75' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => (openEditor ? onEditProduct(product) : handleAdd(product))}
                  aria-label={
                    !product.is_active
                      ? `Hiện lại hoặc sửa ${product.name}`
                      : editMode
                        ? `Sửa ${product.name}`
                        : undefined
                  }
                  className="press-tactile flex min-h-[60px] w-full min-w-0 items-center justify-between gap-3 px-3 py-2.5 text-left active:bg-[var(--bg-subtle)] sm:min-h-[76px] sm:flex-col sm:items-stretch sm:justify-between sm:gap-1.5 sm:p-3"
                >
                  <div className="min-w-0 flex-1 sm:w-full">
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
                        {product.name}
                      </span>
                      {openEditor && (
                        <span className="hidden shrink-0 items-center gap-1 rounded-md bg-[var(--status-paid-bg)] px-2 py-0.5 text-[12px] font-semibold text-[var(--brand-jade-text)] sm:inline-flex">
                          <Pencil className="h-3 w-3" />
                          {!product.is_active ? 'Hiện lại' : 'Sửa'}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] sm:hidden">
                      <span>/ {product.unit}</span>
                      {!product.is_active && (
                        <span className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[12px] font-medium">
                          Đang ẩn
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:w-full sm:items-baseline sm:justify-between">
                    <span className="font-mono-tabular text-[15px] font-bold text-[var(--brand-jade-text)]">
                      {formatVND(product.price)}
                    </span>
                    <span className="hidden shrink-0 text-[12px] text-[var(--text-secondary)] sm:inline">
                      / {product.unit}
                      {!product.is_active ? ' · Ẩn' : ''}
                    </span>
                    {openEditor && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--status-paid-bg)] px-2 py-1 text-[12px] font-semibold text-[var(--brand-jade-text)] sm:hidden">
                        <Pencil className="h-3.5 w-3.5" />
                        {!product.is_active ? 'Hiện lại' : 'Sửa'}
                      </span>
                    )}
                  </div>
                </button>

                {!editMode && inCart && (
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--border-default)] bg-[var(--bg-subtle)] px-2.5 py-1.5">
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
                      <QtyNumberInput
                        value={qty}
                        onCommit={(val) => onSetProductQty(product, val)}
                        ariaLabel={`Số lượng ${product.name}`}
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
