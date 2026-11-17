'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronUp, Landmark, ShoppingBag, X } from 'lucide-react';
import { computeOrderTotals, formatVND, getTodayVN } from '@/lib/vietnamese';
import { usePosData } from '@/components/providers/PosDataProvider';
import { useAppUser } from '@/components/shell/AppShell';
import type { CartItem, Product } from '@/types/database';
import { ProductCatalog } from '@/components/pos/ProductCatalog';
import { ProductFormModal } from '@/components/pos/ProductFormModal';
import { QuickItemModal } from '@/components/pos/QuickItemModal';
import { CartPanel } from '@/components/pos/CartPanel';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { FetchErrorCard, PosWorkspaceSkeleton } from '@/components/ui/PageSkeletons';
import { DailyWelcomeBanner } from '@/components/welcome/DailyWelcomeBanner';

export default function PosWorkspacePage() {
  const { userId } = useAppUser();
  const {
    products,
    productsLoaded,
    catalogError,
    customers,
    orders,
    ordersLoaded,
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

  // Modals & Mobile Cart Sheet
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

  const todayVN = getTodayVN();
  const dueDebtorsCount = useMemo(
    () =>
      customers.filter(
        (c) => c.total_debt > 0 && Boolean(c.next_due_date) && (c.next_due_date ?? '') <= todayVN
      ).length,
    [customers, todayVN]
  );

  const todayOrderCount = useMemo(() => {
    if (!ordersLoaded) return null;
    const vnDateFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return orders.filter(
      (o) =>
        o.payment_status !== 'cancelled' &&
        vnDateFmt.format(new Date(o.created_at)) === todayVN
    ).length;
  }, [orders, ordersLoaded, todayVN]);

  const totalItemUnits = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  return (
    <div className="mx-auto max-w-[1380px] px-3 py-4 sm:px-6 lg:py-5">
      {/* Page Title */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)] lg:text-[24px]">
            Bán hàng
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Chạm vào món để lên đơn nhanh, tự động đồng bộ giữa điện thoại &amp; máy tính
          </p>
        </div>
      </div>

      {/* Layer 3 Daily Welcome Banner */}
      {!loading && !catalogError && userId && (
        <DailyWelcomeBanner
          userId={userId}
          shopName={profile?.shop_name || 'cửa hàng'}
          dueDebtorsCount={dueDebtorsCount}
          todayOrderCount={todayOrderCount}
        />
      )}

      {/* Guided Onboarding Banner when bank account is not yet configured */}
      {!loading && !catalogError && missingBankConfig && (
        <div className="animate-fade-in mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 text-[14px] text-[var(--text-primary)]">
            <Landmark className="h-5 w-5 shrink-0 text-[var(--brand-jade-text)]" />
            <span className="min-w-0 break-words">
              Chưa nhập tài khoản ngân hàng? Thêm 1 lần để tự tạo mã <strong>VietQR</strong> và
              gắn lên hóa đơn cho khách quét.
            </span>
          </div>
          <Link
            href="/settings#bank"
            className="press-tactile inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-[var(--brand-jade)] px-3.5 text-[13px] font-semibold text-[var(--brand-jade-text)] hover:bg-[var(--status-paid-bg)]"
          >
            Cài đặt ngân hàng
          </Link>
        </div>
      )}

      {/* Error / Skeleton / Split-Pane Workspace */}
      {catalogError && !productsLoaded ? (
        <FetchErrorCard
          title="Chưa tải được danh sách hàng hóa"
          message={catalogError}
          onRetry={() => void refreshPosCatalog()}
        />
      ) : loading ? (
        <PosWorkspaceSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7 xl:col-span-7">
            <ProductCatalog
              products={products}
              onAddToCart={handleAddProductToCart}
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
          <div className="hidden lg:col-span-5 lg:block xl:col-span-5">
            <div className="sticky top-5">
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
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={(c) => setSelectedCustomerId(c?.id ?? null)}
                onCustomerCreated={upsertCustomerLocal}
                onOpenCheckout={() => setCheckoutOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(61px+env(safe-area-inset-bottom))] z-20 px-3 pb-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="press-tactile animate-sheet-up flex min-h-[54px] w-full items-center justify-between gap-2 rounded-[10px] bg-[var(--brand-jade)] px-4 text-white shadow-sm active:bg-[var(--brand-jade-hover)]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <ShoppingBag className="h-5 w-5 shrink-0" />
              <span
                key={`${cart.length}-${totalItemUnits}`}
                className="animate-badge-pop truncate text-[15px] font-semibold"
              >
                {cart.length} món trong giỏ
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="font-mono-tabular text-[16px] font-bold sm:text-[17px]">
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
          aria-label="Chi tiết giỏ hàng"
        >
          <div className="animate-sheet-up max-h-[90dvh] w-full overflow-y-auto rounded-t-[14px] bg-[var(--bg-canvas)] p-3">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-[var(--text-primary)]">
                Kiểm tra đơn hàng
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
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={(c) => setSelectedCustomerId(c?.id ?? null)}
              onCustomerCreated={upsertCustomerLocal}
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
      />
    </div>
  );
}
