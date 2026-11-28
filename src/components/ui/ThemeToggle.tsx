'use client';

import { useState } from 'react';
import { Check, ChevronDown, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { AnimatedSwap } from '@/components/ui/AnimatedSwap';
import { HexColorWheel } from '@/components/ui/HexColorWheel';
import {
  getThemePreferenceLabelVN,
  type ThemePreference,
} from '@/lib/theme';
import {
  THEME_PALETTE_PRESETS,
  isDefaultThemePalette,
} from '@/lib/theme-palette';

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
  const iconKey = `${preference}-${resolvedTheme}`;

  if (responsiveLabel) {
    return (
      <button
        type="button"
        onClick={cyclePreference}
        aria-label={`Đổi giao diện: ${label}`}
        title={`Giao diện: ${label}`}
        className="glass-solid-control press-tactile inline-flex h-[44px] w-[44px] items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold text-[var(--text-primary)] transition-[transform,opacity,background-color,color] hover:opacity-95 sm:w-auto sm:px-3.5"
      >
        <AnimatedSwap swapKey={iconKey} direction="flip">
          <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--brand-jade-text)]" />
        </AnimatedSwap>
        <span className="hidden sm:inline-flex">
          <AnimatedSwap swapKey={label} direction="up">
            <span>{label}</span>
          </AnimatedSwap>
        </span>
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
        <AnimatedSwap swapKey={iconKey} direction="flip">
          <Icon className="h-[18px] w-[18px]" />
        </AnimatedSwap>
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
      <AnimatedSwap swapKey={iconKey} direction="flip">
        <Icon className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
      </AnimatedSwap>
      <AnimatedSwap swapKey={label} direction="up">
        <span>{compact ? label : `Giao diện: ${label}`}</span>
      </AnimatedSwap>
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
  const { preference, setPreference, palette, setPalette, resetPalette } = useTheme();
  const [wheelOpen, setWheelOpen] = useState(true);

  return (
    <section
      aria-labelledby="settings-theme-heading"
      className="glass-panel space-y-4 rounded-[24px] p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="settings-theme-heading"
          className="text-[15px] font-bold text-[var(--text-primary)]"
        >
          Giao diện &amp; Bảng màu 60–30–10
        </h2>
        {!isDefaultThemePalette(palette) && (
          <span className="glass-badge-paid rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
            Đã tùy chỉnh
          </span>
        )}
      </div>

      {/* Light / Dark / System Segmented Switch */}
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
              className={`press-tactile flex min-h-[46px] items-center justify-center gap-1.5 rounded-full px-1.5 text-[13px] font-semibold transition-[transform,opacity,background-color,color] sm:gap-2 sm:px-2 sm:text-[14px] ${
                active
                  ? 'glass-chip-active'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <AnimatedSwap swapKey={active ? 'on' : 'off'} direction="flip">
                <Icon className="h-4 w-4 shrink-0" />
              </AnimatedSwap>
              <span className="truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Suggested 60-30-10 Theme Presets */}
      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
          Bảng màu 60–30–10 đề xuất
        </p>
        <div
          role="group"
          aria-label="Bảng màu 60-30-10 đề xuất"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {THEME_PALETTE_PRESETS.map((preset) => {
            const active =
              palette.base60 === preset.base60 &&
              palette.surface30 === preset.surface30 &&
              palette.accent10 === preset.accent10;
            return (
              <button
                key={preset.presetId}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setPalette({
                    presetId: preset.presetId,
                    base60: preset.base60,
                    surface30: preset.surface30,
                    accent10: preset.accent10,
                  })
                }
                className={`press-tactile flex min-h-[60px] flex-col justify-between gap-2 rounded-[18px] p-2.5 text-left transition-[transform,background-color,color] ${
                  active
                    ? 'glass-chip-active ring-2 ring-[var(--brand-jade)]'
                    : 'glass-solid-control text-[var(--text-primary)]'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1.5">
                  <span className="truncate text-[13px] font-bold text-[var(--text-primary)]">
                    {preset.name}
                  </span>
                  {active && (
                    <Check
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]"
                    />
                  )}
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full border border-[var(--border-default)]">
                  <span style={{ width: '60%', backgroundColor: preset.base60 }} />
                  <span style={{ width: '30%', backgroundColor: preset.surface30 }} />
                  <span style={{ width: '10%', backgroundColor: preset.accent10 }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Circular Hex Color Wheel */}
      <div className="space-y-2.5">
        <button
          type="button"
          aria-expanded={wheelOpen}
          aria-controls="settings-hex-color-wheel"
          onClick={() => setWheelOpen((v) => !v)}
          className="glass-solid-control press-tactile flex min-h-[46px] w-full items-center justify-between gap-2 rounded-[18px] px-3.5 text-[13px] font-semibold text-[var(--text-primary)]"
        >
          <span className="inline-flex items-center gap-2">
            <Palette className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
            <span>Bánh xe màu Hex (tùy chỉnh từng lớp 60–30–10)</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform duration-200 ${
              wheelOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {wheelOpen && (
          <div id="settings-hex-color-wheel">
            <HexColorWheel
              palette={palette}
              onChange={setPalette}
              onReset={resetPalette}
            />
          </div>
        )}
      </div>
    </section>
  );
}
