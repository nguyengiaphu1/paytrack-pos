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
  responsiveLabel?: boolean;
}

export function ThemeQuickToggle({
  compact = false,
  iconOnly = false,
  responsiveLabel = false,
}: ThemeQuickToggleProps) {
  const { preference, resolvedTheme, cyclePreference } = useTheme();

  const Icon =
    preference === 'system'
      ? Monitor
      : resolvedTheme === 'dark'
        ? Moon
        : Sun;

  const label = getThemePreferenceLabelVN(preference);

  if (responsiveLabel) {
    return (
      <button
        type="button"
        onClick={cyclePreference}
        aria-label={`Đổi giao diện: ${label}`}
        title={`Giao diện: ${label}`}
        className="glass-solid-control press-tactile inline-flex h-[44px] w-[44px] items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold text-[var(--text-primary)] transition-[transform,opacity,background-color,color] hover:opacity-95 sm:w-auto sm:px-3.5"
      >
        <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--brand-jade-text)]" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={cyclePreference}
        aria-label={`Giao diện: ${label}`}
        title={`Giao diện: ${label}`}
        className="glass-solid-control press-tactile flex h-[44px] w-[44px] items-center justify-center rounded-full text-[var(--brand-jade-text)] transition-[transform,opacity,background-color,color] hover:opacity-95"
      >
        <Icon className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cyclePreference}
      aria-label={`Đổi giao diện: ${label}`}
      title={`Giao diện: ${label}`}
      className="glass-solid-control press-tactile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold text-[var(--text-primary)]"
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
      className="glass-panel rounded-[24px] p-4 sm:p-5"
    >
      <h2
        id="settings-theme-heading"
        className="mb-3.5 text-[15px] font-bold text-[var(--text-primary)]"
      >
        Giao diện
      </h2>

      <div className="glass-well grid grid-cols-3 gap-1.5 rounded-full p-1.5">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = preference === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPreference(opt.value)}
              aria-pressed={active}
              className={`press-tactile flex min-h-[46px] items-center justify-center gap-2 rounded-full px-2 text-[14px] font-semibold transition-[transform,opacity,background-color,color] ${
                active
                  ? 'glass-pill-jade'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
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
