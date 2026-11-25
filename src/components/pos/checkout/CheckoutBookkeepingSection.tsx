'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateVN } from '@/lib/vietnamese';

interface CheckoutBookkeepingSectionProps {
  todayVN: string;
  hasActiveCustomer: boolean;
  remaining: number;
  purchasedDate: string;
  paidDate: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  buyerContactChanged: boolean;
  syncToCustomer: boolean;
  note: string;
  onChangePurchasedDate: (next: string) => void;
  onChangePaidDate: (next: string) => void;
  onChangeBuyerName: (next: string) => void;
  onChangeBuyerPhone: (next: string) => void;
  onChangeBuyerAddress: (next: string) => void;
  onChangeSyncToCustomer: (next: boolean) => void;
  onChangeNote: (next: string) => void;
}

export function CheckoutBookkeepingSection({
  todayVN,
  hasActiveCustomer,
  remaining,
  purchasedDate,
  paidDate,
  buyerName,
  buyerPhone,
  buyerAddress,
  buyerContactChanged,
  syncToCustomer,
  note,
  onChangePurchasedDate,
  onChangePaidDate,
  onChangeBuyerName,
  onChangeBuyerPhone,
  onChangeBuyerAddress,
  onChangeSyncToCustomer,
  onChangeNote,
}: CheckoutBookkeepingSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const detailsSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(purchasedDate === todayVN ? 'Ngày: Hôm nay' : `Ngày: ${formatDateVN(purchasedDate)}`);
    if (remaining === 0 && paidDate !== purchasedDate) {
      parts.push(`Trả: ${formatDateVN(paidDate)}`);
    }
    if (buyerPhone.trim() || buyerAddress.trim()) {
      parts.push('Có SĐT/địa chỉ');
    } else {
      parts.push('Chưa có SĐT/địa chỉ');
    }
    if (note.trim()) {
      parts.push('Có ghi chú');
    }
    return parts.join(' · ');
  }, [purchasedDate, todayVN, remaining, paidDate, buyerPhone, buyerAddress, note]);

  return (
    <div className="glass-well overflow-hidden rounded-[18px]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex min-h-[50px] w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
            Ngày, SĐT/địa chỉ & ghi chú
          </p>
          {!expanded && (
            <p className="truncate text-[12px] text-[var(--text-secondary)]">{detailsSummary}</p>
          )}
        </div>
        <span className="glass-solid-control inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold text-[var(--brand-jade-text)]">
          <span>{expanded ? 'Thu gọn' : 'Chỉnh sửa'}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="glass-divider space-y-3 border-t p-3.5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="min-w-0">
              <label
                htmlFor="checkout-purchased-date"
                className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]"
              >
                Ngày mua hàng
              </label>
              <input
                id="checkout-purchased-date"
                type="date"
                value={purchasedDate}
                onChange={(e) => onChangePurchasedDate(e.target.value)}
                className="glass-input font-mono-tabular min-h-[44px] w-full min-w-0 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none"
              />
            </div>
            {remaining === 0 && (
              <div className="min-w-0">
                <label
                  htmlFor="checkout-paid-date"
                  className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]"
                >
                  Ngày thanh toán
                </label>
                <input
                  id="checkout-paid-date"
                  type="date"
                  value={paidDate}
                  onChange={(e) => onChangePaidDate(e.target.value)}
                  className="glass-input font-mono-tabular min-h-[44px] w-full min-w-0 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              Thông tin người mua trên sổ
            </p>
            {!hasActiveCustomer && (
              <div>
                <label
                  htmlFor="checkout-buyer-name"
                  className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
                >
                  Tên người mua
                </label>
                <input
                  id="checkout-buyer-name"
                  type="text"
                  value={buyerName}
                  onChange={(e) => onChangeBuyerName(e.target.value)}
                  placeholder="Mặc định: Khách lẻ"
                  className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="checkout-buyer-phone"
                  className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
                >
                  SĐT người mua
                </label>
                <input
                  id="checkout-buyer-phone"
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => onChangeBuyerPhone(e.target.value)}
                  placeholder="0901234567"
                  className="glass-input font-mono-tabular min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="checkout-buyer-address"
                  className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
                >
                  Địa chỉ giao hàng
                </label>
                <input
                  id="checkout-buyer-address"
                  type="text"
                  value={buyerAddress}
                  onChange={(e) => onChangeBuyerAddress(e.target.value)}
                  placeholder="Số nhà, đường..."
                  className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>
            {buyerContactChanged && (
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[13px] text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={syncToCustomer}
                  onChange={(e) => onChangeSyncToCustomer(e.target.checked)}
                  className="h-4 w-4 accent-[var(--brand-jade)]"
                />
                <span>Lưu SĐT / Địa chỉ mới vào danh bạ khách</span>
              </label>
            )}
          </div>

          <div>
            <label
              htmlFor="checkout-note"
              className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]"
            >
              Ghi chú đơn
            </label>
            <input
              id="checkout-note"
              type="text"
              value={note}
              onChange={(e) => onChangeNote(e.target.value)}
              placeholder="Ghi chú giao hàng hoặc thanh toán..."
              className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
