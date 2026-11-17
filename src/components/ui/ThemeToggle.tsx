'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import {
  getThemePreferenceLabelVN,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeQuickToggleProps {
  compact?: boolean;
  fullWidth?: boolean;
}

export function ThemeQuickToggle({
  compact = false,
  fullWidth = false,
}: ThemeQuickToggleProps) {
  const { preference, resolvedTheme, cyclePreference } = useTheme();

  const Icon =
    preference === 'system'
      ? Monitor
      : resolvedTheme === 'dark'
        ? Moon
        : Sun;

  const label = getThemePreferenceLabelVN(preference);

  return (
    <button
      type="button"
      onClick={cyclePreference}
      aria-label={`Đổi giao diện (hiện tại: ${label}). Bấm để chuyển Sáng, Tối hoặc Theo máy`}
      title={`Giao diện: ${label} (bấm để đổi)`}
      className={`press-tactile inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] ${
        fullWidth ? 'w-full justify-between' : ''
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
        <span>{compact ? label : `Giao diện: ${label}`}</span>
      </span>
      {fullWidth && (
        <span className="text-[12px] font-normal text-[var(--text-secondary)]">
          Đổi
        </span>
      )}
    </button>
  );
}

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  title: string;
  description: string;
  icon: typeof Monitor;
}> = [
  {
    value: 'system',
    title: 'Theo thiết bị (Mặc định)',
    description: 'Tự đổi Sáng / Tối theo cài đặt của điện thoại hoặc máy tính.',
    icon: Monitor,
  },
  {
    value: 'light',
    title: 'Chế độ Sáng',
    description: 'Nền giấy sáng rõ, dễ nhìn khi bán hàng ban ngày ngoài quầy.',
    icon: Sun,
  },
  {
    value: 'dark',
    title: 'Chế độ Tối',
    description: 'Nền trầm dịu mắt khi kiểm sổ buổi tối. Hóa đơn & QR vẫn giữ nền trắng để quét.',
    icon: Moon,
  },
];

export function SettingsThemeSelector() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <section
      aria-labelledby="settings-theme-heading"
      className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="settings-theme-heading" className="text-[16px] font-bold text-[var(--text-primary)]">
            1. Giao diện Sáng / Tối
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Cài đặt này lưu riêng cho máy này (điện thoại và máy tính chọn riêng được).
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-subtle)] px-2.5 py-1 text-[12px] font-semibold text-[var(--text-secondary)]">
          Đang hiển thị: {resolvedTheme === 'dark' ? 'Tối' : 'Sáng'}
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = preference === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPreference(opt.value)}
              aria-pressed={active}
              className={`press-tactile flex min-h-[76px] flex-col items-start gap-1.5 rounded-[10px] border p-3.5 text-left transition-colors ${
                active
                  ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-2 text-[14px] font-bold ${
                    active ? 'text-[var(--brand-jade-text)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{opt.title}</span>
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
