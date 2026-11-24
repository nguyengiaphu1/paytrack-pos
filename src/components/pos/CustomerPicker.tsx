'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Check, Loader2, MapPin, Phone, Plus, Search, UserCheck, UserPlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatErrorMessageVN } from '@/lib/errors';
import { formatVND, stripVietnamese } from '@/lib/vietnamese';
import type { Customer } from '@/types/database';
import { ModalDialog } from '@/components/ui/ModalDialog';

interface CustomerPickerProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelect: (customer: Customer | null) => void;
  onCustomerCreated: (customer: Customer) => void;
  className?: string;
}

export function CustomerPicker({
  customers,
  selectedCustomerId,
  onSelect,
  onCustomerCreated,
  className = '',
}: CustomerPickerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const filtered = useMemo(() => {
    const q = stripVietnamese(query);
    if (!q) return customers;
    return customers.filter((c) => {
      const hay = stripVietnamese(`${c.name} ${c.phone ?? ''} ${c.address ?? ''} ${c.note ?? ''}`);
      return hay.includes(q) || c.search_text.includes(q);
    });
  }, [customers, query]);

  async function handleCreateCustomer(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Vui lòng nhập tên khách hàng');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

      const { data, error: insertErr } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: trimmed,
          search_text: stripVietnamese(`${trimmed} ${newPhone.trim()} ${newAddress.trim()}`),
          phone: newPhone.trim() || null,
          address: newAddress.trim() || null,
          note: newNote.trim() || null,
        })
        .select('*')
        .single();

      if (insertErr) throw insertErr;
      const created = data as Customer;
      onCustomerCreated(created);
      onSelect(created);
      setNewName('');
      setNewPhone('');
      setNewAddress('');
      setNewNote('');
      setCreating(false);
      setModalOpen(false);
    } catch (err) {
      setError(formatErrorMessageVN(err, 'Không thể thêm khách hàng, vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className={`flex min-w-0 items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1 transition-colors hover:border-[var(--brand-jade)] ${className}`}
      >
        <button
          type="button"
          onClick={() => {
            setModalOpen(true);
            setCreating(false);
            setQuery('');
          }}
          className="press-tactile flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 py-0.5 text-left"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]">
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate text-[15px] font-semibold text-[var(--text-primary)]">
                  {selectedCustomer ? selectedCustomer.name : 'Khách lẻ'}
                </span>
                {selectedCustomer && selectedCustomer.total_debt > 0 && (
                  <span className="font-mono-tabular shrink-0 rounded-full bg-[var(--status-debt-bg)] px-2 py-0.5 text-[12px] font-bold text-[var(--status-debt)]">
                    Nợ {formatVND(selectedCustomer.total_debt)}
                  </span>
                )}
              </div>
              {selectedCustomer && (selectedCustomer.phone || selectedCustomer.address) && (
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[var(--text-secondary)]">
                  {selectedCustomer.phone && (
                    <span className="font-mono-tabular inline-flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" />
                      {selectedCustomer.phone}
                    </span>
                  )}
                  {selectedCustomer.address && (
                    <span className="inline-flex min-w-0 items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{selectedCustomer.address}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <span className="shrink-0 text-[13px] font-semibold text-[var(--brand-jade-text)]">
            {selectedCustomer ? 'Đổi' : 'Chọn khách'}
          </span>
        </button>

        {selectedCustomer && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-label="Chuyển về khách lẻ"
            className="press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ModalDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ariaLabelledBy="customer-picker-modal-title"
        panelClassName="animate-sheet-up sm:animate-modal-in max-h-[90dvh] w-full max-w-[460px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5">
          <h2
            id="customer-picker-modal-title"
            className="min-w-0 flex-1 truncate text-[16px] font-bold"
          >
            {creating ? 'Thêm khách mới' : 'Khách hàng'}
          </h2>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            aria-label="Đóng"
            className="press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {creating ? (
          <form
            onSubmit={handleCreateCustomer}
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
              <label htmlFor="cust-new-name" className="mb-1 block text-[14px] font-medium">
                Họ tên *
              </label>
              <input
                id="cust-new-name"
                data-autofocus
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Cô Lan, Chị Hoa..."
                className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
            <div>
              <label htmlFor="cust-new-phone" className="mb-1 block text-[14px] font-medium">
                Số điện thoại
              </label>
              <input
                id="cust-new-phone"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="0901234567"
                className="font-mono-tabular min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
            <div>
              <label htmlFor="cust-new-address" className="mb-1 block text-[14px] font-medium">
                Địa chỉ giao hàng
              </label>
              <input
                id="cust-new-address"
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Số nhà, đường, khu vực..."
                className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
            <div>
              <label htmlFor="cust-new-note" className="mb-1 block text-[14px] font-medium">
                Ghi chú
              </label>
              <input
                id="cust-new-note"
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Tùy chọn"
                className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="press-tactile min-h-[48px] shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 text-[14px] font-semibold"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={saving}
                className="press-tactile flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span className="truncate">{saving ? 'Đang lưu...' : 'Lưu & Chọn'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:pb-4">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  data-autofocus
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && query.trim() && filtered.length === 1) {
                      e.preventDefault();
                      onSelect(filtered[0]);
                      setModalOpen(false);
                    }
                  }}
                  placeholder="Tìm tên, SĐT, địa chỉ..."
                  aria-label="Tìm khách hàng theo tên, số điện thoại hoặc địa chỉ"
                  className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pr-3 pl-9 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewName(query.trim());
                  setCreating(true);
                }}
                className="press-tactile flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-lg bg-[var(--brand-jade)] px-3.5 text-[14px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
              >
                <UserPlus className="h-4 w-4" />
                <span>Thêm</span>
              </button>
            </div>

            <div className="max-h-[340px] divide-y divide-[var(--border-default)] overflow-y-auto rounded-lg border border-[var(--border-default)]">
              <button
                type="button"
                aria-current={selectedCustomerId === null ? 'true' : undefined}
                onClick={() => {
                  onSelect(null);
                  setModalOpen(false);
                }}
                className={`flex min-h-[52px] w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-[var(--bg-subtle)] ${
                  selectedCustomerId === null ? 'bg-[var(--status-paid-bg)]' : ''
                }`}
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-[var(--text-primary)]">
                  Khách lẻ
                </span>
                {selectedCustomerId === null && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--brand-jade-text)]">
                    <Check className="h-3.5 w-3.5" />
                    <span>Đang chọn</span>
                  </span>
                )}
              </button>

              {filtered.map((c) => {
                const isSelected = selectedCustomerId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => {
                      onSelect(c);
                      setModalOpen(false);
                    }}
                    className={`flex min-h-[54px] w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-[var(--bg-subtle)] ${
                      isSelected ? 'bg-[var(--status-paid-bg)]' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-semibold text-[var(--text-primary)]">
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-[var(--brand-jade-text)]" />
                        )}
                        <span className="truncate">{c.name}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2.5 text-[12px] text-[var(--text-secondary)]">
                        {c.phone && <span className="font-mono-tabular">{c.phone}</span>}
                        {c.address && <span className="truncate">{c.address}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {c.total_debt > 0 ? (
                        <span className="font-mono-tabular rounded-full bg-[var(--status-debt-bg)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--status-debt)]">
                          Nợ {formatVND(c.total_debt)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--text-secondary)]">0đ</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="p-4 text-center text-[14px] text-[var(--text-secondary)]">
                  Không thấy khách hàng.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setNewName(query.trim());
                      setCreating(true);
                    }}
                    className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-[var(--brand-jade-text)] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm &ldquo;{query || 'khách mới'}&rdquo;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalDialog>
    </>
  );
}
