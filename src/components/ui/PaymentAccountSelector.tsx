'use client';

import { PAYMENT_ACCOUNTS } from '@/lib/ledger';
import type { PaymentAccount } from '@/types/database';

interface PaymentAccountSelectorProps {
  value: PaymentAccount | null;
  note: string;
  onChangeAccount: (account: PaymentAccount | null) => void;
  onChangeNote: (note: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  label?: string;
}

export function PaymentAccountSelector({
  value,
  note,
  onChangeAccount,
  onChangeNote,
  allowEmpty = true,
  emptyLabel = 'Chưa chọn',
  label = 'Tên TK thanh toán',
}: PaymentAccountSelectorProps) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {allowEmpty && (
          <button
            type="button"
            onClick={() => {
              onChangeAccount(null);
              onChangeNote('');
            }}
            className={`press-tactile min-h-[44px] rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
              value === null
                ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
                : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {emptyLabel}
          </button>
        )}
        {PAYMENT_ACCOUNTS.map((acc) => {
          const active = value === acc;
          return (
            <button
              key={acc}
              type="button"
              onClick={() => {
                onChangeAccount(acc);
                if (acc !== 'Khác') onChangeNote('');
              }}
              className={`press-tactile min-h-[44px] rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
                active
                  ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {acc}
            </button>
          );
        })}
      </div>

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
