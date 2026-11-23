'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import {
  getThemePreferenceLabelVN,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeQuickToggleProps {
  compact?: boolean;
  iconOnly?: boolean;
}

export function ThemeQuickToggle({
  compact = false,
  iconOnly = false,
}: ThemeQuickToggleProps) {
  const { preference, resolvedTheme, cyclePreference } = useTheme();

  const Icon =
    preference === 'system'
      ? Monitor
      : resolvedTheme === 'dark'
        ? Moon
        : Sun;

  const label = getThemePreferenceLabelVN(preference);

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={cyclePreference}
        aria-label={`Giao diện: ${label}`}
        title={`Giao diện: ${label}`}
        className="press-tactile flex h-[46px] w-[46px] items-center justify-center rounded-[16px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
      >
        <Icon className="h-[18px] w-[18px] text-[var(--brand-jade-text)]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cyclePreference}
      aria-label={`Đổi giao diện: ${label}`}
      title={`Giao diện: ${label}`}
      className="press-tactile inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
      <span>{compact ? label : `Giao diện: ${label}`}</span>
    </button>
  );
}

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: 'system', label: 'Theo máy', icon: Monitor },
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
];

export function SettingsThemeSelector() {
  const { preference, setPreference } = useTheme();

  return (
    <section
      aria-labelledby="settings-theme-heading"
      className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5"
    >
      <h2
        id="settings-theme-heading"
        className="mb-3 text-[15px] font-bold text-[var(--text-primary)]"
      >
        Giao diện
      </h2>

      <div className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = preference === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPreference(opt.value)}
              aria-pressed={active}
              className={`press-tactile flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] border px-2 text-[14px] font-semibold transition-colors ${
                active
                  ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
