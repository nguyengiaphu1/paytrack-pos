'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronUp, Landmark, RotateCcw, ShoppingBag, Users, X } from 'lucide-react';
import { computeOrderTotals, formatVND, getTodayVN } from '@/lib/vietnamese';
import type { PosDraftState } from '@/lib/pos-draft';
import { usePosData } from '@/components/providers/PosDataProvider';
import type { Product } from '@/types/database';
import { CustomerPicker } from '@/components/pos/CustomerPicker';
import { ProductCatalog } from '@/components/pos/ProductCatalog';
import { ProductFormModal } from '@/components/pos/ProductFormModal';
import { QuickItemModal } from '@/components/pos/QuickItemModal';
import { CartPanel } from '@/components/pos/CartPanel';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { FetchErrorCard, PosWorkspaceSkeleton } from '@/components/ui/PageSkeletons';
import { hasOpenModalDialog, ModalDialog } from '@/components/ui/ModalDialog';

export default function PosWorkspacePage() {
  const {
    products,
    productsLoaded,
    catalogError,
    customers,
    profile,
    cart,
    discount,
    selectedCustomerId,
    addProductToCart,
    setProductQtyInCart,
    syncProductInCart,
    addQuickItemToCart,
    updateCartItemQty,
    removeCartItem,
    setCartDiscount,
    setSelectedCustomerId,
    clearCartDraft,
    restoreCartDraft,
    resetOrderDraftAfterSave,
    ensurePosCatalog,
    refreshPosCatalog,
    upsertProductLocal,
    upsertCustomerLocal,
    invalidateAfterMutation,
  } = usePosData();

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quickItemOpen, setQuickItemOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState(0);
  const [clearedDraftUndo, setClearedDraftUndo] = useState<PosDraftState | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void ensurePosCatalog();
  }, [ensurePosCatalog]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && cart.length > 0 && !hasOpenModalDialog()) {
        e.preventDefault();
        setCheckoutSessionId((id) => id + 1);
        setCheckoutOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cart.length]);

  function openCheckout() {
    setCheckoutSessionId((id) => id + 1);
    setCheckoutOpen(true);
  }

  function handleClearCart() {
    const previous = clearCartDraft();
    setMobileCartOpen(false);
    if (previous.cart.length > 0) {
      setClearedDraftUndo(previous);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        setClearedDraftUndo(null);
      }, 10000);
    }
  }

  function handleUndoClearCart() {
    if (!clearedDraftUndo) return;
    restoreCartDraft(clearedDraftUndo);
    setClearedDraftUndo(null);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  function handleOrderCreated() {
    resetOrderDraftAfterSave();
    setMobileCartOpen(false);
    setClearedDraftUndo(null);
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
      className={`mx-auto max-w-[1440px] px-3 py-2.5 sm:px-6 sm:py-4 lg:py-5 ${
        cart.length > 0 ? 'pb-24 lg:pb-5' : ''
      }`}
    >
      {/* Crisp Unboxed Workspace Header + Contextual Crystal Pills */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 sm:mb-3.5">
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)] lg:text-[24px]">
          Bán hàng
        </h1>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {!loading && !catalogError && dueDebtorsCount > 0 && (
            <Link
              href="/debts?filter=due"
              className="glass-badge-debt glass-card-interactive press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold sm:px-3.5"
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>{dueDebtorsCount} khách đến hạn</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          )}

          {!loading && !catalogError && missingBankConfig && (
            <Link
              href="/settings#bank"
              className={`glass-solid-control press-tactile min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-[var(--brand-jade-text)] sm:px-3.5 ${
                dueDebtorsCount > 0 ? 'hidden sm:inline-flex' : 'inline-flex'
              }`}
            >
              <Landmark className="h-4 w-4 shrink-0" />
              <span>Thêm STK QR</span>
            </Link>
          )}
        </div>
      </div>

      {/* Crystal Undo Banner after clearing cart (10s window) */}
      {clearedDraftUndo && (
        <div
          role="status"
          aria-live="polite"
          className="animate-fade-in glass-card mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[22px] px-4 py-2.5 text-[13px] text-[var(--text-primary)] sm:mb-3.5"
        >
          <span className="font-medium">
            Đã xóa giỏ hàng ({clearedDraftUndo.cart.length} món).
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndoClearCart}
              className="glass-pill-jade press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] font-bold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Hoàn tác</span>
            </button>
            <button
              type="button"
              onClick={() => setClearedDraftUndo(null)}
              aria-label="Đóng thông báo"
              className="glass-solid-control press-tactile flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12 lg:items-start lg:gap-5">
          {/* Primary Column: Buyer Bar + Product Catalog */}
          <div className="min-w-0 space-y-2.5 sm:space-y-3.5 lg:col-span-7 xl:col-span-8">
            <CustomerPicker
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              open={customerPickerOpen}
              onOpenChange={setCustomerPickerOpen}
              onSelect={(c) => setSelectedCustomerId(c?.id ?? null)}
              onCustomerCreated={upsertCustomerLocal}
            />

            <ProductCatalog
              products={products}
              cartQtyByProductId={cartQtyByProductId}
              onAddToCart={addProductToCart}
              onSetProductQty={setProductQtyInCart}
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
            <div className="lg:sticky lg:top-[84px]">
              <CartPanel
                items={cart}
                discount={discount}
                discountInputId="cart-discount-desktop"
                onChangeDiscount={setCartDiscount}
                onUpdateQty={updateCartItemQty}
                onRemoveItem={removeCartItem}
                onClearCart={handleClearCart}
                selectedCustomer={selectedCustomer}
                onOpenCustomerPicker={() => setCustomerPickerOpen(true)}
                onOpenCheckout={openCheckout}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Split Crystal Cart Bar (Giỏ hàng + 1-tap Chốt đơn) */}
      {cart.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(90px+env(safe-area-inset-bottom))] z-20 flex justify-center px-3 lg:hidden">
          <div className="glass-dock animate-sheet-up pointer-events-auto flex w-full max-w-[440px] items-center gap-1.5 rounded-full p-1.5">
            <button
              type="button"
              onClick={() => setMobileCartOpen(true)}
              aria-label={`Mở giỏ hàng, ${cart.length} món, tổng ${formatVND(total)}`}
              className="press-tactile flex min-h-[48px] min-w-0 flex-1 items-center gap-2 rounded-full px-2 text-left transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <span className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--brand-jade-text)]">
                <ShoppingBag className="h-[18px] w-[18px] shrink-0" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[12px] font-semibold text-[var(--text-secondary)]">
                  <span
                    key={`${cart.length}-${totalItemUnits}`}
                    className="animate-badge-pop truncate"
                  >
                    {cart.length} món{selectedCustomer ? ` · ${selectedCustomer.name}` : ''}
                  </span>
                  <ChevronUp aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                </div>
                <p className="font-mono-tabular truncate text-[15px] font-bold text-[var(--brand-jade-text)]">
                  {formatVND(total)}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={openCheckout}
              className="glass-btn-primary press-tactile flex min-h-[48px] shrink-0 items-center justify-center rounded-full px-5 text-[15px] font-bold"
            >
              Chốt đơn
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cart Sheet Drawer (single unified CartPanel with pinned header & Thanh toán CTA) */}
      <ModalDialog
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        ariaLabelledBy="mobile-cart-sheet-title"
        backdropClassName="animate-backdrop-in glass-backdrop fixed inset-0 z-40 flex items-end lg:hidden"
        panelClassName="animate-sheet-up glass-modal flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[26px] pb-[calc(10px+env(safe-area-inset-bottom))]"
      >
        <CartPanel
          variant="sheet"
          onCloseSheet={() => setMobileCartOpen(false)}
          items={cart}
          discount={discount}
          discountInputId="cart-discount-mobile"
          onChangeDiscount={setCartDiscount}
          onUpdateQty={updateCartItemQty}
          onRemoveItem={removeCartItem}
          onClearCart={handleClearCart}
          selectedCustomer={selectedCustomer}
          onOpenCustomerPicker={() => {
            setMobileCartOpen(false);
            setCustomerPickerOpen(true);
          }}
          onOpenCheckout={() => {
            setMobileCartOpen(false);
            openCheckout();
          }}
        />
      </ModalDialog>

      <ProductFormModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        product={editingProduct}
        onSaved={(saved) => {
          if (saved) {
            upsertProductLocal(saved);
            syncProductInCart(saved);
          } else {
            void refreshPosCatalog();
          }
        }}
      />

      <QuickItemModal
        open={quickItemOpen}
        onClose={() => setQuickItemOpen(false)}
        onAddItem={addQuickItemToCart}
        onSavedToCatalog={upsertProductLocal}
      />

      <CheckoutModal
        open={checkoutOpen}
        sessionId={checkoutSessionId}
        onClose={() => setCheckoutOpen(false)}
        items={cart}
        discount={discount}
        customers={customers}
        selectedCustomer={selectedCustomer}
        profile={profile}
        onSelectCustomer={(c) => setSelectedCustomerId(c?.id ?? null)}
        onCustomerCreated={upsertCustomerLocal}
        onOrderCreated={handleOrderCreated}
        onCustomerUpdated={upsertCustomerLocal}
      />
    </div>
  );
}
