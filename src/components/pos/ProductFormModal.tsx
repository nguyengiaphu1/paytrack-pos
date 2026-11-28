'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Archive, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatErrorMessageVN } from '@/lib/errors';
import { stripVietnamese } from '@/lib/vietnamese';
import type { Product } from '@/types/database';
import { VndKInput } from '@/components/ui/VndKInput';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { ModalHeader } from '@/components/ui/ModalHeader';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved: (savedProduct?: Product) => void;
}

export function ProductFormModal(props: ProductFormModalProps) {
  const [mounted, setMounted] = useState(props.open);
  const [retainedProduct, setRetainedProduct] = useState<Product | null>(props.product);

  if (props.open && !mounted) {
    setMounted(true);
    setRetainedProduct(props.product);
  } else if (props.open && props.product !== retainedProduct) {
    setRetainedProduct(props.product);
  }

  const handleExited = useCallback(() => {
    setMounted(false);
  }, []);

  if (!props.open && !mounted) return null;
  const activeProduct = props.open ? props.product : retainedProduct;
  return (
    <ProductFormModalBody
      key={activeProduct?.id ?? 'new-product'}
      {...props}
      product={activeProduct}
      onExited={handleExited}
    />
  );
}

function ProductFormModalBody({
  open,
  onClose,
  onExited,
  product,
  onSaved,
}: ProductFormModalProps & { onExited: () => void }) {
  const [name, setName] = useState(product?.name ?? '');
  const [unit, setUnit] = useState(product?.unit ?? 'cái');
  const [priceVnd, setPriceVnd] = useState<number | null>(product ? product.price : null);
  const [costPriceVnd, setCostPriceVnd] = useState<number | null>(
    product && product.cost_price !== null ? product.cost_price : null
  );
  const [category, setCategory] = useState(product?.category ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<'name' | 'price' | 'cost' | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setInvalidField(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setInvalidField('name');
      setError('Vui lòng nhập tên sản phẩm');
      return;
    }
    if (priceVnd === null || !Number.isFinite(priceVnd) || priceVnd < 0) {
      setInvalidField('price');
      setError('Giá bán phải hợp lệ (>= 0)');
      return;
    }
    if (costPriceVnd !== null && (!Number.isFinite(costPriceVnd) || costPriceVnd < 0)) {
      setInvalidField('cost');
      setError('Giá vốn phải hợp lệ (>= 0)');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

      const searchText = stripVietnamese(`${trimmedName} ${sku.trim()}`);
      const payload = {
        user_id: user.id,
        name: trimmedName,
        search_text: searchText,
        unit: unit.trim() || 'cái',
        price: Math.round(priceVnd),
        cost_price: costPriceVnd !== null ? Math.round(costPriceVnd) : null,
        category: category.trim() || null,
        sku: sku.trim() || null,
      };

      let savedProduct: Product | undefined;
      if (product) {
        const { data, error: updateErr } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id)
          .select('*')
          .single();
        if (updateErr) throw updateErr;
        savedProduct = (data as Product | null) ?? undefined;
      } else {
        const { data, error: insertErr } = await supabase
          .from('products')
          .insert(payload)
          .select('*')
          .single();
        if (insertErr) throw insertErr;
        savedProduct = (data as Product | null) ?? undefined;
      }

      onSaved(savedProduct);
      onClose();
    } catch (err) {
      setError(formatErrorMessageVN(err, 'Không thể lưu sản phẩm, vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!product || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)
        .select('*')
        .single();
      if (err) throw err;
      onSaved((data as Product | null) ?? undefined);
      onClose();
    } catch (err) {
      setError(formatErrorMessageVN(err, 'Không thể cập nhật trạng thái món hàng.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      onExited={onExited}
      closeOnBackdrop={false}
      ariaLabelledBy="product-form-modal-title"
      backdropClassName="animate-backdrop-in glass-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      panelClassName="animate-sheet-up sm:animate-modal-in glass-modal flex max-h-[92dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
    >
      <ModalHeader
        title={product ? 'Sửa món hàng' : 'Thêm món mới'}
        titleId="product-form-modal-title"
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5">
          {error && (
            <div
              ref={alertRef}
              role="alert"
              className="glass-badge-overdue rounded-[14px] px-3.5 py-2.5 text-[14px] font-medium"
            >
              {error}
            </div>
          )}

          <div className="glass-well space-y-3.5 rounded-[18px] p-3.5">
            <div>
              <label
                htmlFor="prod-name"
                className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
              >
                Tên món *
              </label>
              <input
                id="prod-name"
                data-autofocus
                type="text"
                required
                aria-invalid={invalidField === 'name' || undefined}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (invalidField === 'name') setInvalidField(null);
                }}
                placeholder="VD: Mật ong rừng 500ml..."
                className={`glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none ${
                  invalidField === 'name' ? 'ring-2 ring-[var(--status-overdue)]' : ''
                }`}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="prod-price-k"
                  className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
                >
                  Giá bán (nghìn) *
                </label>
                <VndKInput
                  id="prod-price-k"
                  required
                  invalid={invalidField === 'price'}
                  valueVnd={priceVnd}
                  onChangeVnd={(val) => {
                    setPriceVnd(val);
                    if (invalidField === 'price') setInvalidField(null);
                  }}
                  placeholder="150"
                  showPreview
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="prod-unit"
                  className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
                >
                  Đơn vị
                </label>
                <input
                  id="prod-unit"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="cái / hộp / chai"
                  className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="prod-cost-k"
                  className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
                >
                  Giá vốn (nghìn)
                </label>
                <VndKInput
                  id="prod-cost-k"
                  invalid={invalidField === 'cost'}
                  valueVnd={costPriceVnd}
                  onChangeVnd={(val) => {
                    setCostPriceVnd(val);
                    if (invalidField === 'cost') setInvalidField(null);
                  }}
                  placeholder="110"
                  showPreview
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="prod-category"
                  className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
                >
                  Nhóm hàng
                </label>
                <input
                  id="prod-category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="VD: Đồ khô / Mỹ phẩm"
                  className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="prod-sku"
                className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
              >
                Mã hàng
              </label>
              <input
                id="prod-sku"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Tùy chọn"
                className="glass-input font-mono-tabular min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="glass-modal-footer flex shrink-0 flex-wrap items-center gap-2.5 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-5 sm:pb-3.5">
          {product && (
            <button
              type="button"
              disabled={saving}
              onClick={handleArchive}
              className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
            >
              <Archive className="h-4 w-4" />
              <span>{product.is_active ? 'Ẩn món' : 'Hiện lại'}</span>
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="glass-btn-primary press-tactile flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{saving ? 'Đang lưu...' : 'Lưu'}</span>
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
