'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, Loader2, MapPin, Phone, Plus, Search, UserCheck, UserPlus, X } from 'lucide-react';
import { ensureGsapInitialized, gsap, GSAP_MOTION, useGSAP } from '@/lib/gsap';
import {
  loadRecentCustomerIds,
  recordRecentCustomerId,
  resolveRecentCustomers,
} from '@/lib/checkout-prefs';
import { createCustomerRecord, filterCustomersByQuery } from '@/lib/customers';
import { formatErrorMessageVN } from '@/lib/errors';
import { formatVND } from '@/lib/vietnamese';
import type { Customer } from '@/types/database';
import { ModalDialog } from '@/components/ui/ModalDialog';

interface CustomerPickerProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelect: (customer: Customer | null) => void;
  onCustomerCreated: (customer: Customer) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function CustomerPicker({
  customers,
  selectedCustomerId,
  onSelect,
  onCustomerCreated,
  open,
  onOpenChange,
  className = '',
}: CustomerPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const modalOpen = open ?? internalOpen;
  const setModalOpen = (next: boolean) => {
    if (next) {
      setRecentCustomerIds(loadRecentCustomerIds());
    }
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };
  const [recentCustomerIds, setRecentCustomerIds] = useState<string[]>(() =>
    loadRecentCustomerIds()
  );
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const viewStageRef = useRef<HTMLDivElement>(null);
  const hasToggledCreateRef = useRef(false);
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

  const recentCustomers = useMemo(
    () => resolveRecentCustomers(customers, recentCustomerIds, 4),
    [customers, recentCustomerIds]
  );

  const filtered = useMemo(() => filterCustomersByQuery(customers, query), [customers, query]);

  useGSAP(
    () => {
      if (!modalOpen) {
        hasToggledCreateRef.current = false;
        return;
      }
      if (!hasToggledCreateRef.current) {
        hasToggledCreateRef.current = true;
        return;
      }
      const stage = viewStageRef.current;
      if (!stage) return;
      ensureGsapInitialized();
      const mm = gsap.matchMedia();
      mm.add(
        {
          all: 'all',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          if (context.conditions?.reduceMotion) return;
          gsap.fromTo(
            stage,
            { x: creating ? 24 : -24, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.22,
              ease: GSAP_MOTION.ease.iosSheet,
              clearProps: 'transform,opacity',
            }
          );
        }
      );
      return () => mm.revert();
    },
    { scope: viewStageRef, dependencies: [creating, modalOpen] }
  );

  function handleSelectCustomer(customer: Customer | null) {
    if (customer) {
      setRecentCustomerIds(recordRecentCustomerId(customer.id));
    }
    onSelect(customer);
    setModalOpen(false);
  }

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
      const created = await createCustomerRecord({
        name: trimmed,
        phone: newPhone,
        address: newAddress,
        note: newNote,
      });
      onCustomerCreated(created);
      setRecentCustomerIds(recordRecentCustomerId(created.id));
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
        className={`glass-card glass-card-interactive flex min-w-0 items-center gap-2 rounded-[22px] px-3 py-1.5 ${className}`}
      >
        <button
          type="button"
          onClick={() => {
            setModalOpen(true);
            setCreating(false);
            setQuery('');
          }}
          className="press-tactile flex min-h-[46px] min-w-0 flex-1 items-center justify-between gap-2.5 py-0.5 text-left"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="glass-icon-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-[var(--brand-jade-text)]">
              <UserCheck className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate text-[15px] font-bold text-[var(--text-primary)]">
                  {selectedCustomer ? selectedCustomer.name : 'Khách lẻ'}
                </span>
                {selectedCustomer && selectedCustomer.total_debt > 0 && (
                  <span className="glass-badge-debt font-mono-tabular shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold">
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

          <span className="glass-solid-control shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[var(--brand-jade-text)]">
            {selectedCustomer ? 'Đổi' : 'Chọn khách'}
          </span>
        </button>

        {selectedCustomer && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-label="Chuyển về khách lẻ"
            className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ModalDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ariaLabelledBy="customer-picker-modal-title"
        backdropClassName="animate-backdrop-in glass-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
        panelClassName="animate-sheet-up sm:animate-modal-in glass-modal flex max-h-[90dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
      >
        <div className="glass-modal-header flex shrink-0 items-center justify-between gap-2 px-5 py-3.5">
          <h2
            id="customer-picker-modal-title"
            className="min-w-0 flex-1 truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            {creating ? 'Thêm khách mới' : 'Khách hàng'}
          </h2>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            aria-label="Đóng"
            className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={viewStageRef} className="flex min-h-0 flex-1 flex-col">
        {creating ? (
          <form
            onSubmit={handleCreateCustomer}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5">
              {error && (
                <div
                  role="alert"
                  className="glass-badge-overdue rounded-[14px] px-3.5 py-2.5 text-[14px] font-medium"
                >
                  {error}
                </div>
              )}
              <div className="glass-well space-y-3 rounded-[18px] p-3.5">
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
                    className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
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
                    className="glass-input font-mono-tabular min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
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
                    className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
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
                    className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="glass-modal-footer flex shrink-0 gap-2.5 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-5 sm:pb-3.5">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="glass-btn-secondary press-tactile min-h-[48px] shrink-0 rounded-full px-5 text-[14px] font-semibold"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={saving}
                className="glass-btn-primary press-tactile flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span className="truncate">{saving ? 'Đang lưu...' : 'Lưu & Chọn'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:p-5 sm:pb-5">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && query.trim() && filtered.length === 1) {
                      e.preventDefault();
                      handleSelectCustomer(filtered[0]);
                    }
                  }}
                  placeholder="Tìm tên, SĐT, địa chỉ..."
                  aria-label="Tìm khách hàng theo tên, số điện thoại hoặc địa chỉ"
                  className="glass-input min-h-[46px] w-full rounded-[14px] pr-11 pl-10 text-[16px] text-[var(--text-primary)] outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Xóa từ khóa tìm khách hàng"
                    className="press-tactile absolute top-1/2 right-0.5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewName(query.trim());
                  setCreating(true);
                }}
                className="glass-btn-primary press-tactile flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-[14px] px-4 text-[14px] font-semibold"
              >
                <UserPlus className="h-4 w-4" />
                <span>Thêm</span>
              </button>
            </div>

            {!query.trim() && recentCustomers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[12px] font-semibold text-[var(--text-secondary)]">Gần đây</p>
                <div
                  role="group"
                  aria-label="Khách hàng chọn gần đây"
                  className="flex flex-wrap gap-1.5"
                >
                  {recentCustomers.map((c) => {
                    const isSelected = selectedCustomerId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleSelectCustomer(c)}
                        className={`press-tactile inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-full px-3 text-[13px] ${
                          isSelected
                            ? 'glass-chip-active font-semibold'
                            : 'glass-chip font-medium text-[var(--text-primary)]'
                        }`}
                      >
                        {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="glass-well max-h-[360px] space-y-1.5 overflow-y-auto rounded-[18px] p-2">
              <button
                type="button"
                aria-current={selectedCustomerId === null ? 'true' : undefined}
                onClick={() => handleSelectCustomer(null)}
                className={`flex min-h-[52px] w-full items-center justify-between gap-2 rounded-[14px] px-3.5 py-2.5 text-left ${
                  selectedCustomerId === null
                    ? 'glass-chip-active'
                    : 'glass-card glass-card-interactive'
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
                    onClick={() => handleSelectCustomer(c)}
                    className={`flex min-h-[56px] w-full items-center justify-between gap-2 rounded-[14px] px-3.5 py-2.5 text-left ${
                      isSelected ? 'glass-chip-active' : 'glass-card glass-card-interactive'
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
                        <span className="glass-badge-debt font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                          Nợ {formatVND(c.total_debt)}
                        </span>
                      ) : (
                        <span className="glass-badge-neutral font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                          0đ
                        </span>
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
        </div>
      </ModalDialog>
    </>
  );
}
