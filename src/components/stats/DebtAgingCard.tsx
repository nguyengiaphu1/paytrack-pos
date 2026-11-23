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
      badgeBg: 'bg-[var(--status-overdue-bg)] text-[var(--status-overdue)]',
      barColor: 'var(--status-overdue)',
    },
    {
      label: 'Trong hạn / Hẹn thu',
      amount: aging.due_or_upcoming,
      badgeBg: 'bg-[var(--status-debt-bg)] text-[var(--status-debt)]',
      barColor: 'var(--status-debt)',
    },
    {
      label: 'Chưa đặt ngày hẹn',
      amount: aging.no_due_date,
      badgeBg: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
      barColor: 'var(--text-secondary)',
    },
  ];

  return (
    <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <h3 className="mb-3.5 text-[15px] font-bold text-[var(--text-primary)]">
        Tuổi nợ
      </h3>

      <div className="space-y-3.5">
        {buckets.map((b) => {
          const pct = total > 0 ? Math.round((b.amount / total) * 100) : 0;
          return (
            <div key={b.label}>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[14px]">
                <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${b.badgeBg}`}>
                  {b.label}
                </span>
                <span className="font-mono-tabular shrink-0 font-bold text-[var(--text-primary)]">
                  {formatVND(b.amount)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: b.barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
