'use client';

import { formatVND } from '@/lib/vietnamese';

interface DebtAgingCardProps {
  aging: {
    due_or_upcoming: number;
    overdue: number;
    no_due_date: number;
  };
}

export function DebtAgingCard({ aging }: DebtAgingCardProps) {
  const total = aging.due_or_upcoming + aging.overdue + aging.no_due_date;

  const buckets = [
    {
      label: 'Quá hạn thu',
      amount: aging.overdue,
      badgeClass: 'glass-badge-overdue',
      barColor: 'var(--status-overdue)',
    },
    {
      label: 'Trong hạn / Hẹn thu',
      amount: aging.due_or_upcoming,
      badgeClass: 'glass-badge-debt',
      barColor: 'var(--status-debt)',
    },
    {
      label: 'Chưa đặt ngày hẹn',
      amount: aging.no_due_date,
      badgeClass: 'glass-badge-neutral',
      barColor: 'var(--text-secondary)',
    },
  ];

  return (
    <section className="glass-panel min-w-0 rounded-[26px] p-4 sm:p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-[var(--text-primary)]">Tuổi nợ</h2>
        {total > 0 && (
          <span className="glass-badge-debt font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
            {formatVND(total)}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {buckets.map((b) => {
          const pct = total > 0 ? Math.round((b.amount / total) * 100) : 0;
          return (
            <div key={b.label} className="glass-well rounded-[18px] p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[14px]">
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${b.badgeClass}`}>
                  {b.label}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                    {pct}%
                  </span>
                  <span className="font-mono-tabular font-bold text-[var(--text-primary)]">
                    {formatVND(b.amount)}
                  </span>
                </div>
              </div>
              <div className="glass-well h-2.5 w-full overflow-hidden rounded-full p-0.5">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: b.barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
