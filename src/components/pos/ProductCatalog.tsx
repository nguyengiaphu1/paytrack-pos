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
    <div className="space-y-3 sm:space-y-3.5">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Crystal Glass Search Tray with Opaque-inside-Translucent Pill Input (strictly 1-row at 375px) */}
      <div className="glass-surface flex items-center gap-2 rounded-[24px] p-2 sm:p-2.5">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
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
            className="glass-input min-h-[46px] w-full rounded-full pr-4 pl-10 text-[16px] text-[var(--text-primary)] outline-none lg:pr-11"
          />
          {!query && (
            <kbd
              aria-hidden="true"
              className="glass-badge-neutral pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 items-center rounded-full px-2 py-0.5 font-mono text-[12px] font-semibold lg:inline-flex"
            >
              /
            </kbd>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenQuickItem}
          title="Thêm nhanh món ngoài danh mục vào đơn này"
          className="glass-solid-control press-tactile flex min-h-[46px] shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold text-[var(--text-primary)] sm:px-4"
        >
          <Zap className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
          <span>Món lẻ</span>
        </button>
      </div>

      {/* Category Pills (horizontal scroll on mobile) + Catalog Management (Đã ẩn / Thêm SP / Sửa) */}
      {products.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          {categories.length > 1 ? (
            <div
              className="scrollbar-none -my-1.5 flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto touch-pan-x py-2 sm:my-0 sm:flex-wrap sm:overflow-visible sm:py-0.5"
              role="group"
              aria-label="Lọc theo danh mục"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={activeCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`press-tactile min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] ${
                    activeCategory === cat
                      ? 'glass-pill-jade font-semibold'
                      : 'glass-chip font-medium'
                  }`}
                >
                  {cat === 'ALL' ? 'Tất cả' : cat}
                </button>
              ))}
            </div>
          ) : (
            <span className="glass-badge-neutral font-mono-tabular inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium">
              {filtered.length} món
            </span>
          )}

          <div className="flex shrink-0 items-center gap-1.5">
            {(hiddenCount > 0 || showHidden) && (
              <button
                type="button"
                aria-pressed={showHidden}
                onClick={() => setShowHidden((v) => !v)}
                className={`press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] ${
                  showHidden ? 'glass-pill-jade font-semibold' : 'glass-chip font-medium'
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
              aria-label="Thêm sản phẩm mới vào danh mục"
              title="Thêm sản phẩm mới vào danh mục bán lâu dài"
              className="glass-solid-control press-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold text-[var(--brand-jade-text)]"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Thêm SP</span>
            </button>

            <button
              type="button"
              aria-pressed={editMode}
              onClick={() => setEditMode((v) => !v)}
              className={`press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ${
                editMode ? 'glass-pill-jade' : 'glass-chip'
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

      {/* Calm Crystal Edit-Mode Banner */}
      {editMode && products.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="animate-fade-in glass-badge-paid flex items-center justify-between gap-2 rounded-[20px] px-4 py-2 text-[13px] font-medium"
        >
          <span>Chạm vào món để sửa giá, vốn hoặc ẩn món.</span>
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="glass-solid-control press-tactile inline-flex min-h-[44px] shrink-0 items-center rounded-full px-3.5 text-[13px] font-bold text-[var(--brand-jade-text)]"
          >
            Xong
          </button>
        </div>
      )}

      {/* Compact 3D Crystal Glass Product Grid or Empty State */}
      {products.length === 0 ? (
        <EmptyStateCard
          icon={PackageOpen}
          title="Chưa có món hàng"
          description="Thêm sản phẩm thường bán hoặc bấm Món lẻ để lên đơn ngay."
          action={
            <>
              <button
                type="button"
                onClick={onOpenNewProduct}
                className="glass-btn-primary press-tactile flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm SP</span>
              </button>
              <button
                type="button"
                onClick={onOpenQuickItem}
                className="glass-solid-control press-tactile flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-[var(--text-primary)]"
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
                  className="glass-solid-control press-tactile flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-[var(--text-primary)]"
                >
                  <span>Xem tất cả</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenQuickItem}
                className="glass-btn-primary press-tactile flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold"
              >
                <Zap className="h-4 w-4" />
                <span>Thêm món lẻ</span>
              </button>
            </>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:items-stretch xl:grid-cols-3">
          {filtered.map((product) => {
            const qty = cartQtyByProductId[product.id] ?? 0;
            const inCart = qty > 0;
            const openEditor = editMode || !product.is_active;

            if (openEditor) {
              return (
                <div
                  key={product.id}
                  className={`glass-card glass-card-interactive glass-card-editing group flex min-w-0 flex-col overflow-hidden rounded-[22px] ${
                    !product.is_active ? 'opacity-80' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onEditProduct(product)}
                    aria-label={
                      !product.is_active
                        ? `Hiện lại hoặc sửa ${product.name}`
                        : `Sửa ${product.name}`
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

            return (
              <div
                key={product.id}
                className={`glass-card glass-card-interactive group flex min-w-0 flex-col justify-between overflow-hidden rounded-[22px] ${
                  inCart ? 'glass-card-selected' : ''
                }`}
              >
                {/* Compact Header Tap Zone (name + unit) */}
                <button
                  type="button"
                  onClick={() => handleAdd(product)}
                  className="press-tactile flex min-h-[44px] w-full flex-1 min-w-0 items-start justify-between gap-2 px-3.5 pt-3 pb-1 text-left"
                >
                  <span className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
                    {product.name}
                  </span>
                  <span className="shrink-0 pt-0.5 text-[12px] font-medium text-[var(--text-secondary)]">
                    / {product.unit}
                  </span>
                </button>

                {/* Single Compact Action Row: Price Left + Inline -/+ Stepper (or + Orb) Right */}
                <div className="flex items-center justify-between gap-2 px-3.5 pb-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAdd(product)}
                    className="press-tactile flex min-h-[44px] min-w-0 flex-1 items-center text-left"
                  >
                    <span className="font-mono-tabular truncate text-[16px] font-bold text-[var(--brand-jade-text)]">
                      {formatVND(product.price)}
                    </span>
                  </button>

                  {inCart ? (
                    <div className="glass-solid-control inline-flex shrink-0 items-center overflow-hidden rounded-full">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Number((qty - 1).toFixed(2));
                          onSetProductQty(product, next <= 0 ? 0 : next);
                        }}
                        aria-label={`Giảm ${product.name}`}
                        className="press-tactile flex h-11 w-10 items-center justify-center text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] sm:w-11"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <QtyNumberInput
                        value={qty}
                        onCommit={(val) => onSetProductQty(product, val)}
                        ariaLabel={`Số lượng ${product.name}`}
                        className="glass-divider font-mono-tabular h-11 w-11 border-0 border-x bg-transparent text-center text-[16px] font-bold text-[var(--brand-jade-text)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => onSetProductQty(product, Number((qty + 1).toFixed(2)))}
                        aria-label={`Tăng ${product.name}`}
                        className="press-tactile flex h-11 w-10 items-center justify-center text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] sm:w-11"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAdd(product)}
                      aria-label={`Thêm ${product.name}`}
                      className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--brand-jade-text)]"
                    >
                      <Plus className="h-[18px] w-[18px]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
