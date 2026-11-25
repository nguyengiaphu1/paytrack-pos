'use client';

import { ChevronDown, RotateCcw, Search, X } from 'lucide-react';
import { PAYMENT_ACCOUNTS, type LedgerDatePreset } from '@/lib/ledger';
import type { PaymentAccount, PaymentStatus } from '@/types/database';

export type OrderAccountFilter = 'ALL' | 'NONE' | PaymentAccount;

interface OrdersFilterBarProps {
  query: string;
  statusFilter: 'ALL' | PaymentStatus;
  accountFilter: OrderAccountFilter;
  datePreset: LedgerDatePreset;
  customStart: string;
  customEnd: string;
  hasActiveFilter: boolean;
  activeFilterTags: string[];
  onChangeQuery: (next: string) => void;
  onChangeStatus: (next: 'ALL' | PaymentStatus) => void;
  onChangeAccount: (next: OrderAccountFilter) => void;
  onChangeDatePreset: (next: LedgerDatePreset) => void;
  onChangeCustomStart: (next: string) => void;
  onChangeCustomEnd: (next: string) => void;
  onClearAll: () => void;
}

export function OrdersFilterBar({
  query,
  statusFilter,
  accountFilter,
  datePreset,
  customStart,
  customEnd,
  hasActiveFilter,
  activeFilterTags,
  onChangeQuery,
  onChangeStatus,
  onChangeAccount,
  onChangeDatePreset,
  onChangeCustomStart,
  onChangeCustomEnd,
  onClearAll,
}: OrdersFilterBarProps) {
  return (
    <div className="glass-surface mb-4 space-y-3 rounded-[24px] p-3.5 sm:p-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
        {/* Search Input */}
        <div className="min-w-0 lg:col-span-5">
          <label
            htmlFor="orders-search"
            className="mb-1 hidden text-[12px] font-semibold text-[var(--text-secondary)] lg:block"
          >
            Tìm đơn hàng
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
            />
            <input
              id="orders-search"
              type="search"
              aria-label="Tìm tên khách, SĐT, địa chỉ, món hàng"
              value={query}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="Tìm tên khách, SĐT, địa chỉ, món hàng..."
              className="glass-input min-h-[46px] w-full rounded-full pr-11 pl-10 text-[16px] text-[var(--text-primary)] outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => onChangeQuery('')}
                aria-label="Xóa từ khóa tìm kiếm"
                className="press-tactile absolute top-1/2 right-0.5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 3 Clean Frosted Dropdowns (Status, Date Range, Payment Account) */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:col-span-7">
          {/* Status Select */}
          <div className="min-w-0">
            <label
              htmlFor="orders-status-filter"
              className={`mb-1 flex items-center gap-1.5 text-[12px] font-semibold ${
                statusFilter !== 'ALL'
                  ? 'text-[var(--brand-jade-text)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <span>Trạng thái</span>
              {statusFilter !== 'ALL' && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-jade)]"
                />
              )}
            </label>
            <div className="relative">
              <select
                id="orders-status-filter"
                value={statusFilter}
                onChange={(e) => onChangeStatus(e.target.value as 'ALL' | PaymentStatus)}
                className="glass-input min-h-[46px] w-full cursor-pointer appearance-none truncate rounded-[14px] pr-9 pl-3.5 text-[16px] font-medium text-[var(--text-primary)] outline-none"
              >
                <option value="ALL" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  Tất cả
                </option>
                <option value="paid" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  Đã trả
                </option>
                <option
                  value="partial"
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  Trả 1 phần
                </option>
                <option
                  value="unpaid"
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  Chưa trả
                </option>
                <option
                  value="cancelled"
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  Đã hủy
                </option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
              />
            </div>
          </div>

          {/* Date Preset Select */}
          <div className="min-w-0">
            <label
              htmlFor="orders-date-preset"
              className={`mb-1 flex items-center gap-1.5 text-[12px] font-semibold ${
                datePreset !== 'all'
                  ? 'text-[var(--brand-jade-text)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <span>Thời gian</span>
              {datePreset !== 'all' && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-jade)]"
                />
              )}
            </label>
            <div className="relative">
              <select
                id="orders-date-preset"
                value={datePreset}
                onChange={(e) => onChangeDatePreset(e.target.value as LedgerDatePreset)}
                className="glass-input min-h-[46px] w-full cursor-pointer appearance-none truncate rounded-[14px] pr-9 pl-3.5 text-[16px] font-medium text-[var(--text-primary)] outline-none"
              >
                <option value="all" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  Tất cả
                </option>
                <option value="today" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  Hôm nay
                </option>
                <option value="7d" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  7 ngày
                </option>
                <option value="month" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  Tháng này
                </option>
                <option
                  value="custom"
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  Tùy chọn
                </option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
              />
            </div>
          </div>

          {/* Payment Account Select */}
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <label
              htmlFor="orders-account-filter"
              className={`mb-1 flex items-center gap-1.5 text-[12px] font-semibold ${
                accountFilter !== 'ALL'
                  ? 'text-[var(--brand-jade-text)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <span>Tài khoản TK</span>
              {accountFilter !== 'ALL' && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-jade)]"
                />
              )}
            </label>
            <div className="relative">
              <select
                id="orders-account-filter"
                value={accountFilter}
                onChange={(e) => onChangeAccount(e.target.value as OrderAccountFilter)}
                className="glass-input min-h-[46px] w-full cursor-pointer appearance-none truncate rounded-[14px] pr-9 pl-3.5 text-[16px] font-medium text-[var(--text-primary)] outline-none"
              >
                <option value="ALL" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  Tất cả TK
                </option>
                {PAYMENT_ACCOUNTS.map((acc) => (
                  <option
                    key={acc}
                    value={acc}
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    {acc}
                  </option>
                ))}
                <option value="NONE" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  Chưa có TK
                </option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Date Range Tray */}
      {datePreset === 'custom' && (
        <div className="glass-well animate-fade-in grid grid-cols-1 gap-2.5 rounded-[16px] p-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-4">
          <div className="flex min-w-0 items-center justify-between gap-2.5 lg:justify-start">
            <label
              htmlFor="orders-date-start"
              className="shrink-0 text-[13px] font-semibold text-[var(--text-secondary)]"
            >
              Từ ngày
            </label>
            <input
              id="orders-date-start"
              type="date"
              value={customStart}
              onChange={(e) => onChangeCustomStart(e.target.value)}
              className="glass-input font-mono-tabular min-h-[44px] min-w-0 flex-1 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none lg:flex-initial"
            />
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2.5 lg:justify-start">
            <label
              htmlFor="orders-date-end"
              className="shrink-0 text-[13px] font-semibold text-[var(--text-secondary)]"
            >
              Đến ngày
            </label>
            <input
              id="orders-date-end"
              type="date"
              value={customEnd}
              onChange={(e) => onChangeCustomEnd(e.target.value)}
              className="glass-input font-mono-tabular min-h-[44px] min-w-0 flex-1 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none lg:flex-initial"
            />
          </div>
        </div>
      )}

      {/* Active Filter Summary Strip */}
      {hasActiveFilter && (
        <div className="glass-divider animate-fade-in flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">Đang lọc:</span>
            {activeFilterTags.map((tag) => (
              <span
                key={tag}
                className="glass-badge-paid max-w-full truncate rounded-full px-2.5 py-1 text-[12px] font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={onClearAll}
            className="glass-solid-control press-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-[var(--text-primary)]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[var(--brand-jade-text)]" />
            <span>Xóa lọc</span>
          </button>
        </div>
      )}
    </div>
  );
}
