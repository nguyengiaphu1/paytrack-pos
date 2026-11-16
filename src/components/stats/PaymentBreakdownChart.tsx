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
    { label: 'Tiền mặt', amount: breakdown.cash, color: '#0E6B4E' },
    { label: 'Chuyển khoản', amount: breakdown.transfer, color: '#0F766E' },
    { label: 'Ghi nợ', amount: breakdown.debt, color: '#B45309' },
  ];

  return (
    <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
        Tỷ trọng thanh toán
      </h3>
      <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
        Phân bổ theo hình thức thu tại lúc lập đơn
      </p>

      {/* Stacked proportion strip */}
      <div className="mb-4 flex h-3.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
        {total > 0 &&
          rows.map((r) => {
            const pct = (r.amount / total) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={r.label}
                style={{ width: `${pct}%`, backgroundColor: r.color }}
                title={`${r.label}: ${formatVND(r.amount)}`}
              />
            );
          })}
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
          return (
            <div key={r.label} className="flex items-center justify-between text-[14px]">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: r.color }}
                />
                <span className="font-medium text-[var(--text-primary)]">{r.label}</span>
                <span className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                  ({pct}%)
                </span>
              </div>
              <span className="font-mono-tabular font-bold text-[var(--text-primary)]">
                {formatVND(r.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
