'use client';

import { useState, type FormEvent } from 'react';
import { Archive, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { stripVietnamese } from '@/lib/vietnamese';
import type { Product } from '@/types/database';
import { VndKInput } from '@/components/ui/VndKInput';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved: () => void;
}

export function ProductFormModal(props: ProductFormModalProps) {
  if (!props.open) return null;
  return (
    <ProductFormModalBody
      key={props.product?.id ?? 'new-product'}
      {...props}
    />
  );
}

function ProductFormModalBody({
  onClose,
  product,
  onSaved,
}: ProductFormModalProps) {
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập tên sản phẩm');
      return;
    }
    if (priceVnd === null || !Number.isFinite(priceVnd) || priceVnd < 0) {
      setError('Giá bán phải hợp lệ (>= 0)');
      return;
    }
    if (costPriceVnd !== null && (!Number.isFinite(costPriceVnd) || costPriceVnd < 0)) {
      setError('Giá vốn phải hợp lệ (>= 0)');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Phiên đăng nhập đã hết hạn');

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

      if (product) {
        const { error: updateErr } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from('products').insert(payload);
        if (insertErr) throw insertErr;
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu sản phẩm');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!product || saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      if (err) throw err;
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={product ? 'Sửa món hàng' : 'Thêm món mới'}
    >
      <div className="animate-sheet-up sm:animate-modal-in max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-4 py-3.5">
          <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold text-[var(--text-primary)]">
            {product ? 'Sửa món hàng' : 'Thêm món mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 p-4">
          {error && (
            <div className="rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-3 py-2 text-[14px] text-[var(--status-overdue)]">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
              Tên món *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Gạo ST25 5kg..."
              className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                valueVnd={priceVnd}
                onChangeVnd={setPriceVnd}
                placeholder="150"
                showPreview
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
                Đơn vị
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="cái / kg / hộp"
                className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label
                htmlFor="prod-cost-k"
                className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
              >
                Giá vốn (nghìn)
              </label>
              <VndKInput
                id="prod-cost-k"
                valueVnd={costPriceVnd}
                onChangeVnd={setCostPriceVnd}
                placeholder="110"
                showPreview
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
                Nhóm hàng
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Tạp hóa / Nước"
                className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
              Mã hàng
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Tùy chọn"
              className="font-mono-tabular min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {product && (
              <button
                type="button"
                disabled={saving}
                onClick={handleArchive}
                className="press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] px-4 text-[14px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
              >
                <Archive className="h-4 w-4" />
                <span>{product.is_active ? 'Ẩn món' : 'Hiện lại'}</span>
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="press-tactile flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{saving ? 'Đang lưu...' : 'Lưu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
