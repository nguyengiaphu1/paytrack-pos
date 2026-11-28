/**
 * 60-30-10 Theme Palette presets, circular Hex/HSV color math,
 * WCAG AA contrast clamping, and DOM CSS-variable hydration helpers.
 */

import type { ResolvedTheme } from './theme';

export interface CustomThemePalette {
  presetId: string;
  base60: string;
  surface30: string;
  accent10: string;
}

export interface ThemePalettePreset extends CustomThemePalette {
  name: string;
  description: string;
}

export const THEME_PALETTE_STORAGE_KEY = 'paytrack-theme-palette';

export const DEFAULT_THEME_PALETTE: CustomThemePalette = {
  presetId: 'jade-default',
  base60: '#ECEFED',
  surface30: '#68D8B4',
  accent10: '#0E6B4E',
};

export const THEME_PALETTE_PRESETS: readonly ThemePalettePreset[] = [
  {
    presetId: 'jade-default',
    name: 'Ngọc Bích',
    description: 'Mặc định',
    base60: '#ECEFED',
    surface30: '#68D8B4',
    accent10: '#0E6B4E',
  },
  {
    presetId: 'ocean-cobalt',
    name: 'Biển Xanh',
    description: 'Mát mắt',
    base60: '#EDF1F4',
    surface30: '#79C9F7',
    accent10: '#0B5D8E',
  },
  {
    presetId: 'terracotta-clay',
    name: 'Gốm Ấm',
    description: 'Ấm áp',
    base60: '#F3EFEA',
    surface30: '#F2B894',
    accent10: '#A8441E',
  },
  {
    presetId: 'amber-espresso',
    name: 'Cà Phê',
    description: 'Cổ điển',
    base60: '#F2EFE9',
    surface30: '#E8C78E',
    accent10: '#7C4D1E',
  },
  {
    presetId: 'rose-berry',
    name: 'Hồng Mận',
    description: 'Tươi tắn',
    base60: '#F3EEF0',
    surface30: '#F2A8B5',
    accent10: '#9F204B',
  },
  {
    presetId: 'slate-graphite',
    name: 'Đá Phiến',
    description: 'Tối giản',
    base60: '#EEF0F2',
    surface30: '#98AAB8',
    accent10: '#1F3447',
  },
];

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface HsvColor {
  h: number;
  s: number;
  v: number;
}

export function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

export function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().toUpperCase();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (/^#[0-9A-F]{6}$/.test(withHash)) return withHash;
  if (/^#[0-9A-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

export function hexToRgb(hex: string): RgbColor {
  const clean = normalizeHex(hex, '#000000').slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const clampByte = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${clampByte(r)}${clampByte(g)}${clampByte(b)}`;
}

export function hexToHsl(hex: string): HslColor {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }

  return {
    h: Math.round(h) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex({ h, s, l }: HslColor): string {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return rgbToHex({
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  });
}

export function hexToHsv(hex: string): HsvColor {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return {
    h: Math.round(h) % 360,
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

export function hsvToHex({ h, s, v }: HsvColor): string {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const vn = Math.max(0, Math.min(100, v)) / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = vn - c;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return rgbToHex({
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  });
}

function linearChannel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Ensures white text (#FFFFFF) on the 10% solid CTA accent passes WCAG AA (>= 4.5:1)
 * while preserving the user's chosen hue & saturation.
 */
export function ensureAccessibleWhiteTextAccent(hex: string): string {
  const hsl = hexToHsl(hex);
  let candidate = hslToHex(hsl);
  let l = hsl.l;
  while (getContrastRatio(candidate, '#FFFFFF') < 4.55 && l > 12) {
    l -= 2;
    candidate = hslToHex({ h: hsl.h, s: hsl.s, l });
  }
  return candidate;
}

/**
 * Ensures accent text on light frosted glass passes WCAG AA (>= 5.0:1 against light surface)
 * or bright luminous legibility (>= 6.0:1 against dark obsidian surface).
 */
export function deriveAccentTextColor(hex: string, theme: ResolvedTheme): string {
  const hsl = hexToHsl(hex);
  if (theme === 'dark') {
    let l = Math.max(66, hsl.l);
    const s = Math.min(88, Math.max(45, hsl.s));
    let candidate = hslToHex({ h: hsl.h, s, l });
    while (getContrastRatio(candidate, '#111715') < 6.0 && l < 88) {
      l += 2;
      candidate = hslToHex({ h: hsl.h, s, l });
    }
    return candidate;
  }

  let l = Math.min(36, hsl.l);
  const s = Math.min(92, Math.max(35, hsl.s));
  let candidate = hslToHex({ h: hsl.h, s, l });
  while (getContrastRatio(candidate, '#E8ECEA') < 5.0 && l > 10) {
    l -= 2;
    candidate = hslToHex({ h: hsl.h, s, l });
  }
  return candidate;
}

export function isDefaultThemePalette(palette: CustomThemePalette): boolean {
  return (
    normalizeHex(palette.base60, '') === DEFAULT_THEME_PALETTE.base60 &&
    normalizeHex(palette.surface30, '') === DEFAULT_THEME_PALETTE.surface30 &&
    normalizeHex(palette.accent10, '') === DEFAULT_THEME_PALETTE.accent10
  );
}

export function normalizeThemePalette(raw: unknown): CustomThemePalette {
  if (!raw || typeof raw !== 'object') return DEFAULT_THEME_PALETTE;
  const obj = raw as Partial<CustomThemePalette>;
  const base60 = normalizeHex(obj.base60, DEFAULT_THEME_PALETTE.base60);
  const surface30 = normalizeHex(obj.surface30, DEFAULT_THEME_PALETTE.surface30);
  const accent10 = normalizeHex(obj.accent10, DEFAULT_THEME_PALETTE.accent10);

  const matchedPreset = THEME_PALETTE_PRESETS.find(
    (p) => p.base60 === base60 && p.surface30 === surface30 && p.accent10 === accent10
  );

  return {
    presetId: matchedPreset?.presetId ?? 'custom',
    base60,
    surface30,
    accent10,
  };
}

export function readStoredThemePalette(): CustomThemePalette {
  if (typeof window === 'undefined') return DEFAULT_THEME_PALETTE;
  try {
    const raw = window.localStorage.getItem(THEME_PALETTE_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_PALETTE;
    return normalizeThemePalette(JSON.parse(raw));
  } catch {
    return DEFAULT_THEME_PALETTE;
  }
}

export function writeStoredThemePalette(palette: CustomThemePalette): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_PALETTE_STORAGE_KEY, JSON.stringify(palette));
  } catch {
    // Ignore storage quota / private browsing errors
  }
}

export const PALETTE_CSS_VAR_KEYS = [
  '--bg-canvas',
  '--halo-1',
  '--halo-2',
  '--halo-3',
  '--halo-4',
  '--halo-5',
  '--halo-6',
  '--brand-jade',
  '--brand-jade-hover',
  '--brand-jade-text',
  '--brand-jade-glow',
] as const;

export function computePaletteCssVars(
  palette: CustomThemePalette,
  resolvedTheme: ResolvedTheme
): Record<string, string> {
  if (isDefaultThemePalette(palette)) {
    return {};
  }

  const baseHsl = hexToHsl(palette.base60);
  const surfaceHsl = hexToHsl(palette.surface30);
  const accentHsl = hexToHsl(palette.accent10);

  const bgCanvas =
    resolvedTheme === 'dark'
      ? hslToHex({
          h: baseHsl.h,
          s: Math.min(20, Math.max(6, baseHsl.s)),
          l: 6,
        })
      : hslToHex({
          h: baseHsl.h,
          s: Math.min(24, baseHsl.s),
          l: Math.max(84, Math.min(96, baseHsl.l)),
        });

  const haloSat =
    resolvedTheme === 'dark'
      ? Math.max(46, Math.min(78, surfaceHsl.s || 60))
      : Math.max(54, Math.min(86, surfaceHsl.s || 70));
  const haloLight = resolvedTheme === 'dark' ? 36 : 70;

  const haloOffsets = [0, 38, -42, 74, 18, -68];
  const halos = haloOffsets.map((offset, idx) =>
    hslToHex({
      h: (idx === 4 ? accentHsl.h : surfaceHsl.h) + offset,
      s: Math.max(40, Math.min(88, haloSat + (idx % 2 === 0 ? 4 : -6))),
      l: haloLight + (idx % 3 === 1 ? 4 : idx % 3 === 2 ? -4 : 0),
    })
  );

  const ctaSolid = ensureAccessibleWhiteTextAccent(palette.accent10);
  const ctaHsl = hexToHsl(ctaSolid);
  const ctaHover = hslToHex({
    h: ctaHsl.h,
    s: ctaHsl.s,
    l: Math.max(10, ctaHsl.l - 6),
  });
  const ctaText = deriveAccentTextColor(palette.accent10, resolvedTheme);
  const glowSource = resolvedTheme === 'dark' ? hexToRgb(ctaText) : hexToRgb(ctaSolid);

  return {
    '--bg-canvas': bgCanvas,
    '--halo-1': halos[0],
    '--halo-2': halos[1],
    '--halo-3': halos[2],
    '--halo-4': halos[3],
    '--halo-5': halos[4],
    '--halo-6': halos[5],
    '--brand-jade': ctaSolid,
    '--brand-jade-hover': ctaHover,
    '--brand-jade-text': ctaText,
    '--brand-jade-glow': `rgba(${glowSource.r}, ${glowSource.g}, ${glowSource.b}, 0.24)`,
  };
}

export function applyPaletteToDom(
  palette: CustomThemePalette,
  resolvedTheme: ResolvedTheme
): string {
  if (typeof document === 'undefined') {
    return resolvedTheme === 'dark' ? '#0C100E' : '#ECEFED';
  }
  const root = document.documentElement;
  const vars = computePaletteCssVars(palette, resolvedTheme);

  if (Object.keys(vars).length === 0) {
    for (const key of PALETTE_CSS_VAR_KEYS) {
      root.style.removeProperty(key);
    }
    return resolvedTheme === 'dark' ? '#0C100E' : '#ECEFED';
  }

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  return vars['--bg-canvas'] ?? (resolvedTheme === 'dark' ? '#0C100E' : '#ECEFED');
}
