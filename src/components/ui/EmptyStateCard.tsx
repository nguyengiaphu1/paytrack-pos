import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryHint?: string;
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  secondaryHint,
}: EmptyStateCardProps) {
  return (
    <div className="animate-fade-in rounded-[10px] border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--brand-jade-text)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-[16px] font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[420px] text-[14px] leading-relaxed text-[var(--text-secondary)]">
        {description}
      </p>
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2.5">{action}</div>}
      {secondaryHint && (
        <p className="mt-3 text-[12px] text-[var(--text-secondary)]">{secondaryHint}</p>
      )}
    </div>
  );
}
