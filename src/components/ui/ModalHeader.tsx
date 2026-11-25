'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalHeaderProps {
  title: ReactNode;
  titleId: string;
  onClose: () => void;
  icon?: ReactNode;
  badge?: ReactNode;
  subtitle?: ReactNode;
  disabled?: boolean;
  className?: string;
  titleClassName?: string;
}

export function ModalHeader({
  title,
  titleId,
  onClose,
  icon,
  badge,
  subtitle,
  disabled = false,
  className = '',
  titleClassName = '',
}: ModalHeaderProps) {
  return (
    <div
      className={`glass-modal-header flex shrink-0 items-center justify-between gap-2.5 px-5 py-3.5 ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {icon && (
          <span className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-[var(--brand-jade-text)]">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id={titleId}
              className={`min-w-0 truncate text-[16px] font-bold text-[var(--text-primary)] ${titleClassName}`.trim()}
            >
              {title}
            </h2>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        aria-label="Đóng"
        className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
