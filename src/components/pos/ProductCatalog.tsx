'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  EyeOff,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { Product } from '@/types/database';
import { stripVietnamese } from '@/lib/vietnamese';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { hasOpenModalDialog } from '@/components/ui/ModalDialog';
import { ProductCard } from './ProductCard';

interface ProductCatalogProps {
  products: Product[];
  cartQtyByProductId: Record<string, number>;
  onAddToCart: (product: Product) => void;
  onSetProductQty: (product: Product, nextQty: number) => void;
  onOpenNewProduct: () => void;
  onEditProduct: (product: Product) => void;
}

export function ProductCatalog({
  products,
  cartQtyByProductId,
  onAddToCart,
  onSetProductQty,
  onOpenNewProduct,
  onEditProduct,
}: ProductCatalogProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showHidden, setShowHidden] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [mobileManageOpen, setMobileManageOpen] = useState(false);
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
  const managePanelExpanded = mobileManageOpen || editMode || showHidden;
  const hasManageActive = editMode || showHidden;

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
    <div className="space-y-2.5 sm:space-y-3.5">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Neutral Frosted Glass Search Tray with 1-Tap Thêm món CTA (strictly 1-row at 375px) */}
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
            className="glass-input min-h-[46px] w-full rounded-full pr-11 pl-10 text-[16px] text-[var(--text-primary)] outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              aria-label="Xóa từ khóa tìm món"
              className="press-tactile absolute top-1/2 right-0.5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
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
          onClick={onOpenNewProduct}
          aria-label="Thêm món mới vào danh mục"
          title="Thêm món mới vào danh mục bán lâu dài"
          className="glass-solid-control press-tactile flex min-h-[46px] shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold text-[var(--text-primary)] sm:px-4"
        >
          <Plus className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
          <span>Thêm món</span>
        </button>
      </div>

      {/* Category Pills (uncrushed full-width scroll strip on mobile) + Catalog Management */}
      {products.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {categories.length > 1 ? (
              <div
                className="scrollbar-none scroll-fade-x -my-1.5 flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto touch-pan-x py-2 pr-7 sm:my-0 sm:flex-wrap sm:overflow-visible sm:py-0.5 sm:pr-0"
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
                        ? 'glass-chip-active font-semibold'
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

            {/* Mobile single-pill Catalog Management trigger (keeps category strip wide on 375px) */}
            <button
              type="button"
              aria-expanded={managePanelExpanded}
              aria-controls="mobile-catalog-manage-tray"
              onClick={() => setMobileManageOpen((v) => !v)}
              className={`press-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold sm:hidden ${
                hasManageActive || managePanelExpanded ? 'glass-chip-active' : 'glass-solid-control text-[var(--text-primary)]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
              <span>Quản lý</span>
            </button>

            {/* Tablet/Desktop direct Catalog Management pills (sm+) */}
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              {(hiddenCount > 0 || showHidden) && (
                <button
                  type="button"
                  aria-pressed={showHidden}
                  aria-label={`Hiện ${hiddenCount} món đã ẩn`}
                  onClick={() => setShowHidden((v) => !v)}
                  className={`press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] ${
                    showHidden ? 'glass-chip-active font-semibold' : 'glass-chip font-medium'
                  }`}
                >
                  <EyeOff className="h-3.5 w-3.5 shrink-0" />
                  <span>Đã ẩn ({hiddenCount})</span>
                </button>
              )}

              <button
                type="button"
                aria-pressed={editMode}
                onClick={() => setEditMode((v) => !v)}
                className={`press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ${
                  editMode ? 'glass-chip-active' : 'glass-chip'
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

          {/* Mobile Collapsible Catalog Management Tray (< sm) */}
          {managePanelExpanded && (
            <div
              id="mobile-catalog-manage-tray"
              className="animate-fade-in glass-well flex flex-wrap items-center gap-2 rounded-[18px] p-2 sm:hidden"
            >
              <button
                type="button"
                aria-pressed={editMode}
                onClick={() => setEditMode((v) => !v)}
                className={`press-tactile inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ${
                  editMode ? 'glass-chip-active' : 'glass-solid-control text-[var(--text-primary)]'
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
                    <span>Sửa món</span>
                  </>
                )}
              </button>

              {(hiddenCount > 0 || showHidden) && (
                <button
                  type="button"
                  aria-pressed={showHidden}
                  aria-label={`Hiện ${hiddenCount} món đã ẩn`}
                  onClick={() => setShowHidden((v) => !v)}
                  className={`press-tactile inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] ${
                    showHidden ? 'glass-chip-active font-semibold' : 'glass-solid-control font-medium text-[var(--text-secondary)]'
                  }`}
                >
                  <EyeOff className="h-3.5 w-3.5 shrink-0" />
                  <span>Đã ẩn ({hiddenCount})</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Calm Edit-Mode Banner */}
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
            className="glass-solid-control press-tactile inline-flex min-h-[44px] shrink-0 items-center rounded-full px-3.5 text-[13px] font-bold text-[var(--text-primary)]"
          >
            Xong
          </button>
        </div>
      )}

      {/* Compact Neutral Glass Product Grid or Empty State */}
      {products.length === 0 ? (
        <EmptyStateCard
          icon={PackageOpen}
          title="Chưa có món hàng"
          description="Thêm món thường bán vào danh mục để lên đơn nhanh chỉ với 1 chạm."
          action={
            <button
              type="button"
              onClick={onOpenNewProduct}
              className="glass-btn-primary press-tactile flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm món</span>
            </button>
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
              ? 'Thử từ khóa khác hoặc thêm món mới vào danh mục.'
              : 'Xóa bộ lọc để xem toàn bộ danh sách hoặc thêm món mới.'
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
                onClick={onOpenNewProduct}
                className="glass-btn-primary press-tactile flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm món</span>
              </button>
            </>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:items-stretch xl:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              qty={cartQtyByProductId[product.id] ?? 0}
              editMode={editMode}
              onAdd={handleAdd}
              onSetQty={onSetProductQty}
              onEdit={onEditProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
}
