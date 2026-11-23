'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronUp, Landmark, ShoppingBag, Users, X } from 'lucide-react';
import { computeOrderTotals, formatVND, getTodayVN } from '@/lib/vietnamese';
import { usePosData } from '@/components/providers/PosDataProvider';
import type { CartItem, Product } from '@/types/database';
import { CustomerPicker } from '@/components/pos/CustomerPicker';
import { ProductCatalog } from '@/components/pos/ProductCatalog';
import { ProductFormModal } from '@/components/pos/ProductFormModal';
import { QuickItemModal } from '@/components/pos/QuickItemModal';
import { CartPanel } from '@/components/pos/CartPanel';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { FetchErrorCard, PosWorkspaceSkeleton } from '@/components/ui/PageSkeletons';

export default function PosWorkspacePage() {
  const {
    products,
    productsLoaded,
    catalogError,
    customers,
    profile,
    ensurePosCatalog,
    refreshPosCatalog,
    upsertProductLocal,
    upsertCustomerLocal,
    invalidateAfterMutation,
  } = usePosData();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quickItemOpen, setQuickItemOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    void ensurePosCatalog();
  }, [ensurePosCatalog]);

  function handleAddProductToCart(product: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.key === product.id);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx ? { ...item, quantity: Number((item.quantity + 1).toFixed(2)) } : item
        );
      }
      return [
        ...prev,
        {
          key: product.id,
          product_id: product.id,
          product_name: product.name,
          unit: product.unit,
          unit_price: product.price,
          cost_price: product.cost_price,
          quantity: 1,
        },
      ];
    });
  }

  function handleSetProductQty(product: Product, nextQty: number) {
    setCart((prev) => {
      if (nextQty <= 0) {
        return prev.filter((i) => i.key !== product.id);
      }
      const idx = prev.findIndex((i) => i.key === product.id);
      if (idx >= 0) {
        return prev.map((item, i) => (i === idx ? { ...item, quantity: nextQty } : item));
      }
      return [
        ...prev,
        {
          key: product.id,
          product_id: product.id,
          product_name: product.name,
          unit: product.unit,
          unit_price: product.price,
          cost_price: product.cost_price,
          quantity: nextQty,
        },
      ];
    });
  }

  function handleAddQuickItem(item: CartItem) {
    setCart((prev) => [...prev, item]);
  }

  function handleUpdateQty(key: string, nextQty: number) {
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: nextQty } : i)));
  }

  function handleRemoveItem(key: string) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  function handleOrderCreated() {
    setCart([]);
    setDiscount(0);
    setMobileCartOpen(false);
    invalidateAfterMutation();
  }

  const loading = !productsLoaded && !catalogError;
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null;
  const { total } = computeOrderTotals(cart, discount);
  const missingBankConfig = profile && (!profile.bank_bin || !profile.bank_account_no);

  const cartQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      if (item.product_id && item.key === item.product_id) {
        map[item.product_id] = item.quantity;
      }
    }
    return map;
  }, [cart]);

  const todayVN = getTodayVN();
  const dueDebtorsCount = useMemo(
    () =>
      customers.filter(
        (c) => c.total_debt > 0 && Boolean(c.next_due_date) && (c.next_due_date ?? '') <= todayVN
      ).length,
    [customers, todayVN]
  );

  const totalItemUnits = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  return (
    <div
      className={`mx-auto max-w-[1440px] px-3 py-4 sm:px-6 lg:py-5 ${
        cart.length > 0 ? 'pb-20 lg:pb-5' : ''
      }`}
    >
      {/* Compact Page Header + Contextual Alerts */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)] lg:text-[24px]">
          Bán hàng
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          {!loading && !catalogError && dueDebtorsCount > 0 && (
            <Link
              href="/debts?filter=due"
              className="press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] border border-[var(--status-debt-border)] bg-[var(--status-debt-bg)] px-3 text-[13px] font-semibold text-[var(--status-debt)]"
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>{dueDebtorsCount} khách đến hạn</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          )}

          {!loading && !catalogError && missingBankConfig && (
            <Link
              href="/settings#bank"
              className="press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[13px] font-semibold text-[var(--brand-jade-text)] hover:bg-[var(--status-paid-bg)]"
            >
              <Landmark className="h-4 w-4 shrink-0" />
              <span>Thêm STK QR</span>
            </Link>
          )}
        </div>
      </div>

      {/* Error / Skeleton / Split-Pane Workspace */}
      {catalogError && !productsLoaded ? (
        <FetchErrorCard
          title="Chưa tải được danh sách hàng"
          message={catalogError}
          onRetry={() => void refreshPosCatalog()}
        />
      ) : loading ? (
        <PosWorkspaceSkeleton />
      ) : (
        <div className="space-y-3.5">
          {/* Exposed Customer Bar (always visible directly on 375px mobile & 1280px desktop) */}
          <CustomerPicker
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelect={(c) => setSelectedCustomerId(c?.id ?? null)}
            onCustomerCreated={upsertCustomerLocal}
            className="glass-surface rounded-[12px]"
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-7 xl:col-span-8">
              <ProductCatalog
                products={products}
                cartQtyByProductId={cartQtyByProductId}
                onAddToCart={handleAddProductToCart}
                onSetProductQty={handleSetProductQty}
                onOpenNewProduct={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                }}
                onEditProduct={(prod) => {
                  setEditingProduct(prod);
                  setProductModalOpen(true);
                }}
                onOpenQuickItem={() => setQuickItemOpen(true)}
              />
            </div>

            {/* Desktop Sticky Cart Column */}
            <div className="hidden lg:col-span-5 lg:block xl:col-span-4">
              <div className="sticky top-[70px]">
                <CartPanel
                  items={cart}
                  discount={discount}
                  onChangeDiscount={setDiscount}
                  onUpdateQty={handleUpdateQty}
                  onRemoveItem={handleRemoveItem}
                  onClearCart={() => {
                    setCart([]);
                    setDiscount(0);
                  }}
                  selectedCustomer={selectedCustomer}
                  onOpenCheckout={() => setCheckoutOpen(true)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Cart Pill (stacked harmoniously above Floating Glass Dock) */}
      {cart.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(86px+env(safe-area-inset-bottom))] z-20 flex justify-center px-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="press-tactile animate-sheet-up pointer-events-auto flex min-h-[54px] w-full max-w-[440px] items-center justify-between gap-2 rounded-[18px] bg-[var(--brand-jade)] px-4 text-white shadow-md active:bg-[var(--brand-jade-hover)]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <ShoppingBag className="h-5 w-5 shrink-0" />
              <span
                key={`${cart.length}-${totalItemUnits}`}
                className="animate-badge-pop truncate text-[15px] font-semibold"
              >
                {cart.length} món{selectedCustomer ? ` · ${selectedCustomer.name}` : ''}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="font-mono-tabular text-[16px] font-bold">
                {formatVND(total)}
              </span>
              <ChevronUp className="h-5 w-5 shrink-0" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Sheet Drawer */}
      {mobileCartOpen && (
        <div
          className="animate-backdrop-in fixed inset-0 z-40 flex items-end bg-black/45 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Giỏ hàng"
        >
          <div className="animate-sheet-up max-h-[90dvh] w-full overflow-y-auto rounded-t-[16px] bg-[var(--bg-canvas)] p-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-[var(--text-primary)]">
                Đơn hàng
              </span>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                aria-label="Đóng"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <CartPanel
              items={cart}
              discount={discount}
              onChangeDiscount={setDiscount}
              onUpdateQty={handleUpdateQty}
              onRemoveItem={handleRemoveItem}
              onClearCart={() => {
                setCart([]);
                setDiscount(0);
                setMobileCartOpen(false);
              }}
              selectedCustomer={selectedCustomer}
              onOpenCheckout={() => {
                setMobileCartOpen(false);
                setCheckoutOpen(true);
              }}
            />
          </div>
        </div>
      )}

      <ProductFormModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        product={editingProduct}
        onSaved={() => void refreshPosCatalog()}
      />

      <QuickItemModal
        open={quickItemOpen}
        onClose={() => setQuickItemOpen(false)}
        onAddItem={handleAddQuickItem}
        onSavedToCatalog={upsertProductLocal}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={cart}
        discount={discount}
        selectedCustomer={selectedCustomer}
        profile={profile}
        onOrderCreated={handleOrderCreated}
        onCustomerUpdated={upsertCustomerLocal}
      />
    </div>
  );
}
