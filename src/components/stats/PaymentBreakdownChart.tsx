'use client';

import { formatVND } from '@/lib/vietnamese';

interface PaymentBreakdownChartProps {
  breakdown: {
    cash: number;
    transfer: number;
    debt: number;
  };
}

export function PaymentBreakdownChart({ breakdown }: PaymentBreakdownChartProps) {
  const total = breakdown.cash + breakdown.transfer + breakdown.debt;

  const rows = [
    { label: 'Tiền mặt', amount: breakdown.cash, color: 'var(--brand-jade)' },
    { label: 'Chuyển khoản', amount: breakdown.transfer, color: 'var(--status-paid)' },
    { label: 'Ghi nợ', amount: breakdown.debt, color: 'var(--status-debt)' },
  ];

  return (
    <section className="glass-panel min-w-0 rounded-[24px] p-4 sm:p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
          Tỷ trọng thanh toán
        </h2>
        {total > 0 && (
          <span className="glass-badge-neutral font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
            {formatVND(total)}
          </span>
        )}
      </div>

      {/* Stacked proportion strip inside recessed glass well */}
      <div className="glass-well mb-4 flex h-4 w-full overflow-hidden rounded-full p-0.5">
        {total > 0 &&
          rows.map((r) => {
            const pct = (r.amount / total) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={r.label}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${pct}%`, backgroundColor: r.color }}
                title={`${r.label}: ${formatVND(r.amount)}`}
              />
            );
          })}
      </div>

      <div className="glass-well divide-y divide-[var(--glass-border-subtle)] rounded-[18px] px-3.5 py-1">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
          return (
            <div
              key={r.label}
              className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-2.5 text-[14px]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: r.color }}
                />
                <span className="font-semibold text-[var(--text-primary)]">{r.label}</span>
                <span className="glass-badge-neutral font-mono-tabular rounded-full px-2 py-0.5 text-[12px] font-semibold">
                  {pct}%
                </span>
              </div>
              <span className="font-mono-tabular shrink-0 font-bold text-[var(--text-primary)]">
                {formatVND(r.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
