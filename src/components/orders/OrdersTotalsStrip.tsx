'use client';

import { formatVND } from '@/lib/vietnamese';
import type { LedgerTotals } from '@/lib/ledger';

interface OrdersTotalsStripProps {
  totals: LedgerTotals;
}

export function OrdersTotalsStrip({ totals }: OrdersTotalsStripProps) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-[var(--text-primary)]/45"
          />
          <span className="truncate">Giá bán ({totals.activeCount} đơn)</span>
        </p>
        <p className="font-mono-tabular mt-1 truncate text-[16px] font-bold text-[var(--text-primary)] sm:text-[20px]">
          {formatVND(totals.totalRevenue)}
        </p>
      </div>
      <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-[var(--text-secondary)]/55"
          />
          <span className="truncate">Giá vốn</span>
        </p>
        <p className="font-mono-tabular mt-1 truncate text-[16px] font-bold text-[var(--text-secondary)] sm:text-[20px]">
          {formatVND(totals.totalCost)}
        </p>
      </div>
      <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${
              totals.totalProfit >= 0 ? 'bg-[var(--brand-jade)]' : 'bg-[var(--status-overdue)]'
            }`}
          />
          <span className="truncate">Lãi tạm tính</span>
        </p>
        <p
          className={`font-mono-tabular mt-1 truncate text-[16px] font-bold sm:text-[20px] ${
            totals.totalProfit >= 0
              ? 'text-[var(--brand-jade-text)]'
              : 'text-[var(--status-overdue)]'
          }`}
        >
          {formatVND(totals.totalProfit)}
        </p>
      </div>
      <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-debt)]"
          />
          <span className="truncate">Còn nợ</span>
        </p>
        <p className="font-mono-tabular mt-1 truncate text-[16px] font-bold text-[var(--status-debt)] sm:text-[20px]">
          {formatVND(totals.totalRemainingDebt)}
        </p>
      </div>
    </div>
  );
}
