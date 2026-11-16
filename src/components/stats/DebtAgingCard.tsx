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
      barColor: '#B91C1C',
    },
    {
      label: 'Trong hạn / Hẹn thu',
      amount: aging.due_or_upcoming,
      badgeBg: 'bg-[var(--status-debt-bg)] text-[var(--status-debt)]',
      barColor: '#B45309',
    },
    {
      label: 'Chưa đặt ngày hẹn',
      amount: aging.no_due_date,
      badgeBg: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
      barColor: '#6B7280',
    },
  ];

  return (
    <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
        Phân nhóm tuổi nợ hiện tại
      </h3>
      <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
        Theo dõi các khoản nợ quá hạn cần ưu tiên nhắc
      </p>

      <div className="space-y-3.5">
        {buckets.map((b) => {
          const pct = total > 0 ? Math.round((b.amount / total) * 100) : 0;
          return (
            <div key={b.label}>
              <div className="mb-1 flex items-center justify-between text-[14px]">
                <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${b.badgeBg}`}>
                  {b.label}
                </span>
                <span className="font-mono-tabular font-bold text-[var(--text-primary)]">
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
