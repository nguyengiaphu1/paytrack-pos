'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Minus, Plus, X, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { stripVietnamese } from '@/lib/vietnamese';
import type { CartItem, Product } from '@/types/database';
import { VndKInput } from '@/components/ui/VndKInput';

interface QuickItemModalProps {
  open: boolean;
  onClose: () => void;
  onAddItem: (item: CartItem) => void;
  onSavedToCatalog?: (product: Product) => void;
}

export function QuickItemModal({
  open,
  onClose,
  onAddItem,
  onSavedToCatalog,
}: QuickItemModalProps) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('cái');
  const [priceVnd, setPriceVnd] = useState<number | null>(null);
  const [costPriceVnd, setCostPriceVnd] = useState<number | null>(null);
  const [qty, setQty] = useState('1');
  const [saveToCatalog, setSaveToCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function stepQty(delta: number) {
    const current = Number(qty);
    const base = Number.isFinite(current) && current > 0 ? current : 1;
    const next = Math.max(1, Number((base + delta).toFixed(2)));
    setQty(String(next));
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
        if (!user) throw new Error('Phiên đăng nhập đã hết hạn');

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

      setName('');
      setUnit('cái');
      setPriceVnd(null);
      setCostPriceVnd(null);
      setQty('1');
      setSaveToCatalog(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm món');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bán món lẻ"
    >
      <div className="animate-sheet-up sm:animate-modal-in max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-4 py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Zap className="h-5 w-5 shrink-0 text-[var(--brand-jade-text)]" />
            <h2 className="min-w-0 truncate text-[17px] font-bold text-[var(--text-primary)]">
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
              placeholder="Tên món hàng..."
              className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
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
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
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
              <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
                Đơn vị
              </label>
              <input
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
      </div>
    </div>
  );
}
