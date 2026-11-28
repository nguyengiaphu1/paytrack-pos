import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
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
    <div data-gsap-reveal="empty-state" className="animate-fade-in glass-card rounded-[24px] px-5 py-9 text-center">
      <div className="glass-icon-orb mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-[18px] text-[var(--brand-jade-text)]">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-[16px] font-bold text-[var(--text-primary)]">{title}</h2>
      {description && (
        <p className="mx-auto mt-1.5 max-w-[420px] text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2.5">{action}</div>}
      {secondaryHint && (
        <p className="mt-3.5 text-[12px] text-[var(--text-secondary)]">{secondaryHint}</p>
      )}
    </div>
  );
}
