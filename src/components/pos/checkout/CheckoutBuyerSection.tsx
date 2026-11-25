'use client';

import { useMemo, useState, type RefObject } from 'react';
import { Check, Loader2, MapPin, Phone, Plus, Search, UserCheck, UserPlus, X } from 'lucide-react';
import {
  loadRecentCustomerIds,
  recordRecentCustomerId,
  resolveRecentCustomers,
} from '@/lib/checkout-prefs';
import { createCustomerRecord, filterCustomersByQuery } from '@/lib/customers';
import { formatErrorMessageVN } from '@/lib/errors';
import { formatVND } from '@/lib/vietnamese';
import type { Customer } from '@/types/database';

export type BuyerPickerMode = 'closed' | 'search' | 'create';

interface CheckoutBuyerSectionProps {
  buyerCardRef: RefObject<HTMLDivElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  createNameRef: RefObject<HTMLInputElement | null>;
  customers: Customer[];
  activeCustomer: Customer | null;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  pickerMode: BuyerPickerMode;
  onRequestMode: (mode: BuyerPickerMode, seedQuery?: string) => void;
  onSelectCustomer: (customer: Customer | null) => void;
  onCustomerCreated: (customer: Customer) => void;
}

export function CheckoutBuyerSection({
  buyerCardRef,
  searchInputRef,
  createNameRef,
  customers,
  activeCustomer,
  buyerName,
  buyerPhone,
  buyerAddress,
  pickerMode,
  onRequestMode,
  onSelectCustomer,
  onCustomerCreated,
}: CheckoutBuyerSectionProps) {
  const [customerQuery, setCustomerQuery] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerPickerError, setCustomerPickerError] = useState<string | null>(null);
  const [recentCustomerIds, setRecentCustomerIds] = useState<string[]>(() =>
    loadRecentCustomerIds()
  );

  const recentCustomers = useMemo(
    () => resolveRecentCustomers(customers, recentCustomerIds, 4),
    [customers, recentCustomerIds]
  );

  const filteredCustomers = useMemo(
    () => filterCustomersByQuery(customers, customerQuery, 20),
    [customers, customerQuery]
  );

  function selectAndRecord(customer: Customer | null) {
    if (customer) {
      setRecentCustomerIds(recordRecentCustomerId(customer.id));
    }
    setCustomerQuery('');
    setCustomerPickerError(null);
    onSelectCustomer(customer);
  }

  function openCreateMode() {
    setNewCustName((prev) => prev || buyerName.trim() || customerQuery.trim());
    setNewCustPhone((prev) => prev || buyerPhone.trim());
    setNewCustAddress((prev) => prev || buyerAddress.trim());
    setCustomerPickerError(null);
    onRequestMode('create', customerQuery);
  }

  async function handleQuickCreateCustomer() {
    if (creatingCustomer) return;
    setCustomerPickerError(null);
    const trimmedName = newCustName.trim();
    if (!trimmedName) {
      setCustomerPickerError('Vui lòng nhập tên khách hàng.');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setCustomerPickerError('Mất kết nối mạng — bật lại Wi-Fi hoặc 4G rồi thử lại.');
      return;
    }

    setCreatingCustomer(true);
    try {
      const created = await createCustomerRecord({
        name: trimmedName,
        phone: newCustPhone,
        address: newCustAddress,
      });
      onCustomerCreated(created);
      selectAndRecord(created);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
    } catch (err) {
      setCustomerPickerError(formatErrorMessageVN(err, 'Không thể thêm khách hàng mới.'));
    } finally {
      setCreatingCustomer(false);
    }
  }

  return (
    <div ref={buyerCardRef} className="glass-card rounded-[22px] p-3.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div className="glass-icon-orb mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-[var(--brand-jade-text)]">
            <UserCheck className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="break-words text-[15px] font-bold text-[var(--text-primary)]">
                {activeCustomer ? activeCustomer.name : buyerName.trim() || 'Khách lẻ'}
              </span>
              {!activeCustomer && buyerName.trim() && (
                <span className="glass-badge-neutral shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                  Khách lẻ · chưa lưu danh bạ
                </span>
              )}
              {activeCustomer && activeCustomer.total_debt > 0 && (
                <span className="glass-badge-debt font-mono-tabular shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold">
                  Nợ cũ: {formatVND(activeCustomer.total_debt)}
                </span>
              )}
            </div>
            {(activeCustomer?.phone || activeCustomer?.address) && (
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-[var(--text-secondary)]">
                {activeCustomer.phone && (
                  <span className="font-mono-tabular inline-flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {activeCustomer.phone}
                  </span>
                )}
                {activeCustomer.address && (
                  <span className="inline-flex min-w-0 items-center gap-1 break-words">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {activeCustomer.address}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            pickerMode === 'closed' ? onRequestMode('search') : onRequestMode('closed')
          }
          className="glass-solid-control press-tactile min-h-[44px] shrink-0 rounded-full px-3.5 text-[13px] font-semibold text-[var(--brand-jade-text)]"
        >
          {pickerMode !== 'closed' ? 'Đóng' : activeCustomer ? 'Đổi khách' : 'Chọn khách'}
        </button>
      </div>

      {pickerMode === 'search' && (
        <div className="glass-divider mt-3 space-y-2.5 border-t pt-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                ref={searchInputRef}
                type="search"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (customerQuery.trim() && filteredCustomers.length === 1) {
                      selectAndRecord(filteredCustomers[0]);
                    }
                  }
                }}
                placeholder="Tìm tên, SĐT, địa chỉ..."
                aria-label="Tìm khách hàng trong thanh toán"
                className="glass-input min-h-[44px] w-full rounded-[14px] pr-11 pl-10 text-[16px] text-[var(--text-primary)] outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {customerQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerQuery('');
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
              onClick={openCreateMode}
              className="glass-btn-primary press-tactile flex min-h-[44px] shrink-0 items-center gap-1 rounded-[14px] px-3.5 text-[13px] font-semibold"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>Tạo mới</span>
            </button>
          </div>

          {!customerQuery.trim() && recentCustomers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold text-[var(--text-secondary)]">Gần đây</p>
              <div
                role="group"
                aria-label="Khách hàng chọn gần đây"
                className="flex flex-wrap gap-1.5"
              >
                {recentCustomers.map((c) => {
                  const isSelected = activeCustomer?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => selectAndRecord(c)}
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

          <div className="glass-well max-h-48 space-y-1.5 overflow-y-auto rounded-[16px] p-1.5">
            {activeCustomer && (
              <button
                type="button"
                onClick={() => selectAndRecord(null)}
                className="glass-btn-secondary press-tactile flex min-h-[44px] w-full items-center justify-between rounded-[12px] px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <span>Chuyển về Khách lẻ (không lưu công nợ)</span>
              </button>
            )}
            {filteredCustomers.length === 0 ? (
              <p className="py-3 text-center text-[13px] text-[var(--text-secondary)]">
                Không tìm thấy khách phù hợp — bấm &ldquo;Tạo mới&rdquo; để lưu nhanh.
              </p>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = activeCustomer?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => selectAndRecord(c)}
                    className={`flex min-h-[46px] w-full items-center justify-between gap-2 rounded-[12px] px-3 py-2 text-left ${
                      isSelected ? 'glass-chip-active' : 'glass-card glass-card-interactive'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-[var(--text-primary)]">
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-[var(--brand-jade-text)]" />
                        )}
                        <span className="truncate">{c.name}</span>
                      </p>
                      {(c.phone || c.address) && (
                        <p className="truncate text-[12px] text-[var(--text-secondary)]">
                          {[c.phone, c.address].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    {c.total_debt > 0 && (
                      <span className="glass-badge-debt font-mono-tabular shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold">
                        Nợ {formatVND(c.total_debt)}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          {!customerQuery.trim() && customers.length > 20 && (
            <p className="text-[12px] text-[var(--text-secondary)]">
              Hiển thị 20 / {customers.length} khách — gõ tên hoặc SĐT để lọc thêm.
            </p>
          )}
        </div>
      )}

      {pickerMode === 'create' && (
        <div className="glass-well mt-3 space-y-2.5 rounded-[16px] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              Thêm nhanh khách hàng
            </p>
            <button
              type="button"
              onClick={() => {
                setCustomerPickerError(null);
                onRequestMode('search');
              }}
              className="min-h-[44px] rounded-full px-2.5 text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              Quay lại tìm
            </button>
          </div>
          {customerPickerError && (
            <div
              role="alert"
              className="glass-badge-overdue rounded-[12px] px-3 py-2 text-[13px] font-medium"
            >
              {customerPickerError}
            </div>
          )}
          <div>
            <label
              htmlFor="checkout-new-cust-name"
              className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
            >
              Tên khách hàng *
            </label>
            <input
              id="checkout-new-cust-name"
              ref={createNameRef}
              type="text"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleQuickCreateCustomer();
                }
              }}
              placeholder="Cô Lan, Chị Hoa..."
              className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label
                htmlFor="checkout-new-cust-phone"
                className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
              >
                Số điện thoại
              </label>
              <input
                id="checkout-new-cust-phone"
                type="tel"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleQuickCreateCustomer();
                  }
                }}
                placeholder="0901234567"
                className="glass-input font-mono-tabular min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="checkout-new-cust-address"
                className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
              >
                Địa chỉ giao hàng
              </label>
              <input
                id="checkout-new-cust-address"
                type="text"
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleQuickCreateCustomer();
                  }
                }}
                placeholder="Số nhà, đường..."
                className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={creatingCustomer}
            onClick={() => void handleQuickCreateCustomer()}
            className="glass-btn-primary press-tactile flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-full px-4 text-[14px] font-semibold disabled:opacity-60"
          >
            {creatingCustomer ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>{creatingCustomer ? 'Đang lưu...' : 'Lưu & chọn khách này'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
