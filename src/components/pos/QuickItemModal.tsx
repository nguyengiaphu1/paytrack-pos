'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Minus, Plus, X, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatErrorMessageVN } from '@/lib/errors';
import { stripVietnamese } from '@/lib/vietnamese';
import type { CartItem, Product } from '@/types/database';
import { VndKInput } from '@/components/ui/VndKInput';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { QtyNumberInput } from '@/components/ui/QtyNumberInput';

interface QuickItemModalProps {
  open: boolean;
  onClose: () => void;
  onAddItem: (item: CartItem) => void;
  onSavedToCatalog?: (product: Product) => void;
}

export function QuickItemModal(props: QuickItemModalProps) {
  if (!props.open) return null;
  return <QuickItemModalBody {...props} />;
}

function QuickItemModalBody({
  onClose,
  onAddItem,
  onSavedToCatalog,
}: QuickItemModalProps) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('cái');
  const [priceVnd, setPriceVnd] = useState<number | null>(null);
  const [costPriceVnd, setCostPriceVnd] = useState<number | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [saveToCatalog, setSaveToCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stepQty(delta: number) {
    const base = Number.isFinite(qty) && qty > 0 ? qty : 1;
    if (delta < 0) {
      const next =
        base > 1
          ? Math.max(1, Number((base + delta).toFixed(2)))
          : Math.max(0.1, Number((base - 0.1).toFixed(2)));
      setQty(next);
      return;
    }
    setQty(Number((base + delta).toFixed(2)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    const trimmedName = name.trim();
    const numericQty = Number(qty);

    if (!trimmedName) {
      setError('Vui lòng nhập tên món');
      return;
    }
    if (priceVnd === null || !Number.isFinite(priceVnd) || priceVnd < 0) {
      setError('Đơn giá phải hợp lệ (>= 0)');
      return;
    }
    if (!Number.isFinite(numericQty) || numericQty <= 0) {
      setError('Số lượng phải lớn hơn 0');
      return;
    }

    const numericPrice = Math.round(priceVnd);
    const numericCost = costPriceVnd !== null ? Math.round(costPriceVnd) : null;

    setSaving(true);
    try {
      let productId: string | null = null;

      if (saveToCatalog) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

        const { data, error: insertErr } = await supabase
          .from('products')
          .insert({
            user_id: user.id,
            name: trimmedName,
            search_text: stripVietnamese(trimmedName),
            unit: unit.trim() || 'cái',
            price: numericPrice,
            cost_price: numericCost,
          })
          .select('*')
          .single();

        if (insertErr) throw insertErr;
        const created = data as Product;
        productId = created.id;
        onSavedToCatalog?.(created);
      }

      onAddItem({
        key: productId ?? `quick-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        product_id: productId,
        product_name: trimmedName,
        unit: unit.trim() || 'cái',
        unit_price: numericPrice,
        cost_price: numericCost,
        quantity: numericQty,
      });

      onClose();
    } catch (err) {
      setError(formatErrorMessageVN(err, 'Không thể thêm món, vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalDialog
      open
      onClose={onClose}
      ariaLabelledBy="quick-item-modal-title"
      backdropClassName="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      panelClassName="animate-sheet-up sm:animate-modal-in max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-4 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Zap className="h-5 w-5 shrink-0 text-[var(--brand-jade-text)]" />
          <h2
            id="quick-item-modal-title"
            className="min-w-0 truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            Bán món lẻ
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-3.5 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:pb-4"
      >
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-3 py-2 text-[14px] text-[var(--status-overdue)]"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="quick-item-name"
            className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
          >
            Tên món *
          </label>
          <input
            id="quick-item-name"
            data-autofocus
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên món hàng..."
            className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label
              htmlFor="quick-item-qty"
              className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
            >
              Số lượng
            </label>
            <div className="inline-flex w-full items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
              <button
                type="button"
                onClick={() => stepQty(-1)}
                aria-label="Giảm số lượng"
                className="press-tactile flex h-[46px] w-11 shrink-0 items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <Minus className="h-4 w-4" />
              </button>
              <QtyNumberInput
                id="quick-item-qty"
                value={qty}
                onCommit={setQty}
                ariaLabel="Số lượng món lẻ"
                className="font-mono-tabular h-[46px] w-full min-w-0 border-x border-[var(--border-default)] bg-[var(--bg-surface)] px-2 text-center text-[16px] font-semibold text-[var(--text-primary)] outline-none"
              />
              <button
                type="button"
                onClick={() => stepQty(1)}
                aria-label="Tăng số lượng"
                className="press-tactile flex h-[46px] w-11 shrink-0 items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="quick-item-unit"
              className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
            >
              Đơn vị
            </label>
            <input
              id="quick-item-unit"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="min-h-[46px] w-full min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label
              htmlFor="quick-price-k"
              className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
            >
              Giá bán (nghìn) *
            </label>
            <VndKInput
              id="quick-price-k"
              required
              valueVnd={priceVnd}
              onChangeVnd={setPriceVnd}
              placeholder="50"
              showPreview
            />
          </div>
          <div className="min-w-0">
            <label
              htmlFor="quick-cost-k"
              className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]"
            >
              Giá vốn (nghìn)
            </label>
            <VndKInput
              id="quick-cost-k"
              valueVnd={costPriceVnd}
              onChangeVnd={setCostPriceVnd}
              placeholder="35"
              showPreview
            />
          </div>
        </div>

        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3.5 text-[14px] font-medium text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={saveToCatalog}
            onChange={(e) => setSaveToCatalog(e.target.checked)}
            className="h-4 w-4 accent-[var(--brand-jade)]"
          />
          <span>Lưu vào danh mục hàng</span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="press-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{saving ? 'Đang thêm...' : 'Thêm vào đơn'}</span>
        </button>
      </form>
    </ModalDialog>
  );
}
