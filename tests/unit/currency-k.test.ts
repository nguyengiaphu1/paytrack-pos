import { describe, expect, it } from 'vitest';
import {
  detectLikelyFullVndMistake,
  formatVndToKInput,
  parseKToVnd,
  sanitizeKInput,
} from '@/lib/currency-k';

describe('thousand-VND (K <-> VND bigint) conversion utilities', () => {
  it('converts integer K inputs into exact VND integers', () => {
    expect(parseKToVnd('50')).toBe(50_000);
    expect(parseKToVnd('125')).toBe(125_000);
    expect(parseKToVnd('1500')).toBe(1_500_000);
    expect(parseKToVnd('0')).toBe(0);
  });

  it('supports both dot and Vietnamese comma fractional half-thousand inputs', () => {
    expect(parseKToVnd('12.5')).toBe(12_500);
    expect(parseKToVnd('12,5')).toBe(12_500);
    expect(parseKToVnd('0.5')).toBe(500);
    expect(parseKToVnd('0,5')).toBe(500);
    expect(parseKToVnd('25.25')).toBe(25_250);
  });

  it('returns null for empty, whitespace, negative, or malformed inputs', () => {
    expect(parseKToVnd('')).toBeNull();
    expect(parseKToVnd('   ')).toBeNull();
    expect(parseKToVnd('-10')).toBeNull();
    expect(parseKToVnd('abc')).toBeNull();
    expect(parseKToVnd('12.3.4')).toBeNull();
  });

  it('formats stored VND back to K input cleanly and preserves round-trip accuracy', () => {
    expect(formatVndToKInput(125_000)).toBe('125');
    expect(formatVndToKInput(12_500)).toBe('12.5');
    expect(formatVndToKInput(500)).toBe('0.5');
    expect(formatVndToKInput(0)).toBe('0');
    expect(formatVndToKInput(null)).toBe('');
    expect(formatVndToKInput(undefined)).toBe('');

    const samples = [0, 500, 12_500, 50_000, 125_000, 1_250_000, 99_999_500];
    for (const vnd of samples) {
      const kStr = formatVndToKInput(vnd);
      expect(parseKToVnd(kStr)).toBe(vnd);
    }
  });

  it('sanitizes typed K strings safely', () => {
    expect(sanitizeKInput('12,5')).toBe('12.5');
    expect(sanitizeKInput('12.5.9')).toBe('12.59');
    expect(sanitizeKInput('.5')).toBe('0.5');
    expect(sanitizeKInput(' 50k ')).toBe('50');
  });

  it('detects likely full-VND 1000x typing mistakes without false positives on normal K values', () => {
    const warn = detectLikelyFullVndMistake('50000');
    expect(warn).toEqual({
      enteredVnd: 50_000_000,
      suggestedK: '50',
      suggestedVnd: 50_000,
    });

    const warnLarge = detectLikelyFullVndMistake('125000');
    expect(warnLarge).toEqual({
      enteredVnd: 125_000_000,
      suggestedK: '125',
      suggestedVnd: 125_000,
    });

    // Normal K prices should NOT trigger warning
    expect(detectLikelyFullVndMistake('50')).toBeNull();
    expect(detectLikelyFullVndMistake('1500')).toBeNull(); // 1.5 triệu
    expect(detectLikelyFullVndMistake('12500')).toBeNull(); // not multiple of 1000
    expect(detectLikelyFullVndMistake('12.5')).toBeNull();
  });
});
