'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  getQuickPickAccounts,
  loadCheckoutPrefs,
  recordRecentPaymentAccount,
} from '@/lib/checkout-prefs';
import type { PaymentAccount } from '@/types/database';

const PERSONAL_ACCOUNTS: readonly PaymentAccount[] = [
  'Thanh',
  'Phú',
  'Trang',
  'Trang Lê',
  'Thuỳ Trang',
  'Thuỷ',
  'Kiều Thương',
];

const LOGISTICS_AND_OTHER_ACCOUNTS: readonly PaymentAccount[] = ['Vận chuyển', 'Khác'];

interface PaymentAccountSelectorProps {
  value: PaymentAccount | null;
  note: string;
  onChangeAccount: (account: PaymentAccount | null) => void;
  onChangeNote: (note: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  label?: string;
  collapsible?: boolean;
}

export function PaymentAccountSelector({
  value,
  note,
  onChangeAccount,
  onChangeNote,
  allowEmpty = true,
  emptyLabel = 'Bỏ chọn',
  label = 'Tên TK thanh toán',
  collapsible = true,
}: PaymentAccountSelectorProps) {
  const [recentAccounts, setRecentAccounts] = useState<PaymentAccount[]>(() =>
    loadCheckoutPrefs().recentAccounts
  );
  const [expanded, setExpanded] = useState(!collapsible);

  const quickPicks = getQuickPickAccounts(value, recentAccounts, 3);
  const remainingCount = 9 - quickPicks.length;

  function selectAccount(acc: PaymentAccount) {
    onChangeAccount(acc);
    if (acc !== 'Khác') onChangeNote('');
    setRecentAccounts(recordRecentPaymentAccount(acc));
  }

  function renderChip(acc: PaymentAccount) {
    const active = value === acc;
    return (
      <button
        key={acc}
        type="button"
        aria-pressed={active}
        onClick={() => selectAccount(acc)}
        className={`press-tactile min-h-[44px] rounded-lg border px-3 text-[13px] font-medium transition-colors ${
          active
            ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
            : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
        }`}
      >
        {acc}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {label ? (
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</p>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Chọn TK nhận tiền để đối soát sổ bán (tùy chọn)
            </p>
          </div>
        ) : (
          <span />
        )}
        {allowEmpty && value !== null && (
          <button
            type="button"
            onClick={() => {
              onChangeAccount(null);
              onChangeNote('');
            }}
            className="min-h-[44px] shrink-0 px-1 text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {emptyLabel}
          </button>
        )}
      </div>

      {!expanded ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={label || 'Tài khoản thanh toán'}>
          {quickPicks.map(renderChip)}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            className="press-tactile inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 text-[13px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-jade)] hover:text-[var(--text-primary)]"
          >
            <span>Thêm (+{remainingCount})</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-2.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
                Tài khoản cá nhân
              </span>
              {collapsible && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-expanded={true}
                  className="inline-flex min-h-[44px] items-center gap-1 px-1 text-[12px] font-semibold text-[var(--brand-jade-text)]"
                >
                  <span>Thu gọn</span>
                  <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PERSONAL_ACCOUNTS.map(renderChip)}
            </div>
          </div>

          <div className="space-y-1.5 border-t border-[var(--border-default)] pt-2">
            <span className="block text-[12px] font-semibold text-[var(--text-secondary)]">
              Vận chuyển & Khác
            </span>
            <div className="flex flex-wrap gap-1.5">
              {LOGISTICS_AND_OTHER_ACCOUNTS.map(renderChip)}
            </div>
          </div>
        </div>
      )}

      {value === 'Khác' && (
        <div>
          <input
            type="text"
            value={note}
            onChange={(e) => onChangeNote(e.target.value)}
            placeholder="Khác: nhập tên TK hoặc ghi chú..."
            aria-label="Ghi chú tài khoản khác"
            className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
          />
        </div>
      )}
    </div>
  );
}
