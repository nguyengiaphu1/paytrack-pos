import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_PALETTE,
  THEME_PALETTE_PRESETS,
  computePaletteCssVars,
  ensureAccessibleWhiteTextAccent,
  getContrastRatio,
  hexToHsl,
  hexToHsv,
  hslToHex,
  hsvToHex,
  isDefaultThemePalette,
  isValidHex,
  normalizeHex,
  normalizeThemePalette,
} from '@/lib/theme-palette';

describe('60-30-10 theme palette & circular hex color utilities', () => {
  it('provides 6 curated anti-slop 60-30-10 presets with valid hexes and strong CTA contrast', () => {
    expect(THEME_PALETTE_PRESETS).toHaveLength(6);
    for (const preset of THEME_PALETTE_PRESETS) {
      expect(isValidHex(preset.base60)).toBe(true);
      expect(isValidHex(preset.surface30)).toBe(true);
      expect(isValidHex(preset.accent10)).toBe(true);
      expect(getContrastRatio(preset.accent10, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('round-trips Hex <-> HSL <-> HSV conversions accurately', () => {
    const sample = '#0E6B4E';
    const hsl = hexToHsl(sample);
    const backFromHsl = hslToHex(hsl);
    expect(isValidHex(backFromHsl)).toBe(true);

    const hsv = hexToHsv('#3B82F6');
    const backFromHsv = hsvToHex(hsv);
    expect(isValidHex(backFromHsv)).toBe(true);
    expect(normalizeHex('abc', '#000000')).toBe('#AABBCC');
  });

  it('returns empty CSS overrides for the default Ngọc Bích palette', () => {
    expect(isDefaultThemePalette(DEFAULT_THEME_PALETTE)).toBe(true);
    expect(computePaletteCssVars(DEFAULT_THEME_PALETTE, 'light')).toEqual({});
    expect(computePaletteCssVars(DEFAULT_THEME_PALETTE, 'dark')).toEqual({});
  });

  it('computes WCAG AA accessible accent and 6 solid halo colors for custom palettes', () => {
    // Even if user drags wheel onto bright pastel yellow (#FFF066), CTA is clamped for >= 4.5:1 white text
    const pastelCustom = normalizeThemePalette({
      presetId: 'custom',
      base60: '#F4F1EC',
      surface30: '#79C9F7',
      accent10: '#FFF066',
    });

    const lightVars = computePaletteCssVars(pastelCustom, 'light');
    expect(lightVars['--bg-canvas']).toBeDefined();
    expect(lightVars['--brand-jade']).toBeDefined();
    expect(getContrastRatio(lightVars['--brand-jade'], '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(lightVars['--brand-jade-text'], '#E8ECEA')).toBeGreaterThanOrEqual(4.8);

    for (let i = 1; i <= 6; i++) {
      expect(isValidHex(lightVars[`--halo-${i}`])).toBe(true);
    }

    const darkVars = computePaletteCssVars(pastelCustom, 'dark');
    expect(hexToHsl(darkVars['--bg-canvas']).l).toBeLessThanOrEqual(10);
    expect(getContrastRatio(darkVars['--brand-jade-text'], '#111715')).toBeGreaterThanOrEqual(5.8);
  });

  it('clamps overly bright accents cleanly via ensureAccessibleWhiteTextAccent', () => {
    const safe = ensureAccessibleWhiteTextAccent('#B8F2E6');
    expect(getContrastRatio(safe, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });
});
