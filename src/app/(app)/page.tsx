'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronUp, Landmark, ShoppingBag, X } from 'lucide-react';
import { computeOrderTotals, formatVND } from '@/lib/vietnamese';
import { usePosData } from '@/components/providers/PosDataProvider';
import type { CartItem, Product } from '@/types/database';
import { ProductCatalog } from '@/components/pos/ProductCatalog';
import { ProductFormModal } from '@/components/pos/ProductFormModal';
import { QuickItemModal } from '@/components/pos/QuickItemModal';
import { CartPanel } from '@/components/pos/CartPanel';
import { CheckoutModal } from '@/components/pos/CheckoutModal';

export default function PosWorkspacePage() {
  const {
    products,
    productsLoaded,
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

  const loading = !productsLoaded;
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null;
  const { total } = computeOrderTotals(cart, discount);
  const missingBankConfig = profile && (!profile.bank_bin || !profile.bank_account_no);

  return (
    <div className="mx-auto max-w-[1380px] px-3 py-4 sm:px-6 lg:py-5">
      {/* Page Title */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold tracking-[-0.015em] lg:text-[24px]">
            Bán hàng POS
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Chạm món để lên đơn nhanh, tự động đồng bộ iPhone &amp; Windows
          </p>
        </div>
      </div>

      {/* Guided Onboarding Banner when bank account is not yet configured */}
      {!loading && missingBankConfig && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 text-[14px]">
            <Landmark className="h-5 w-5 shrink-0 text-[var(--brand-jade)]" />
            <span className="min-w-0 break-words">
              Chưa nhập tài khoản ngân hàng? Thêm 1 lần để tạo <strong>VietQR động</strong> và in
              QR trên hóa đơn.
            </span>
          </div>
          <Link
            href="/settings#bank"
            className="inline-flex min-h-[38px] shrink-0 items-center rounded-lg border border-[var(--brand-jade)] px-3.5 text-[13px] font-semibold text-[var(--brand-jade)] hover:bg-[var(--status-paid-bg)]"
          >
            Cài đặt ngân hàng
          </Link>
        </div>
      )}

      {/* Desktop Split-Pane / Mobile Product Catalog */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7 xl:col-span-7">
          {loading ? (
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-[14px] text-[var(--text-secondary)]">
              Đang tải danh mục sản phẩm...
            </div>
          ) : (
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
          )}
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

      {/* Mobile Sticky Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(61px+env(safe-area-inset-bottom))] z-20 px-3 pb-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="flex min-h-[54px] w-full items-center justify-between gap-2 rounded-[10px] bg-[var(--brand-jade)] px-4 text-white shadow-sm active:bg-[var(--brand-jade-hover)]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <ShoppingBag className="h-5 w-5 shrink-0" />
              <span className="truncate text-[15px] font-semibold">{cart.length} món trong giỏ</span>
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
          className="fixed inset-0 z-40 flex items-end bg-black/45 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Chi tiết giỏ hàng"
        >
          <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-[14px] bg-[var(--bg-canvas)] p-3">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="min-w-0 flex-1 truncate text-[16px] font-bold">
                Kiểm tra giỏ hàng
              </span>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                aria-label="Đóng"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)]"
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
