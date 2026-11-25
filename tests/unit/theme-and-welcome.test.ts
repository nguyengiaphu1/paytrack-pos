import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_BOOTSTRAP_SCRIPT,
  THEME_STORAGE_KEY,
  getNextThemePreference,
  getThemePreferenceLabelVN,
  isValidThemePreference,
  normalizeThemePreference,
  readStoredThemePreference,
  resolveTheme,
  writeStoredThemePreference,
} from '@/lib/theme';
import {
  getDailyGreetingStorageKey,
  getOnboardingMirrorKey,
  getTimeOfDayGreetingVN,
  getVietnamHour,
  readDailyGreetingCollapsed,
  readOnboardingMirror,
  writeDailyGreetingCollapsed,
  writeOnboardingMirror,
} from '@/lib/welcome';

function mockWindowStorage() {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  vi.stubGlobal('window', { localStorage: mockStorage });
  return { store, mockStorage };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('theme utilities', () => {
  it('validates and normalizes theme preferences with system default fallback', () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe('system');
    expect(isValidThemePreference('light')).toBe(true);
    expect(isValidThemePreference('dark')).toBe(true);
    expect(isValidThemePreference('system')).toBe(true);
    expect(isValidThemePreference('midnight')).toBe(false);
    expect(isValidThemePreference(null)).toBe(false);

    expect(normalizeThemePreference('dark')).toBe('dark');
    expect(normalizeThemePreference('unknown')).toBe('system');
    expect(normalizeThemePreference(undefined)).toBe('system');
  });

  it('resolves effective theme from preference and OS dark setting', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('cycles theme preferences and provides Vietnamese labels', () => {
    expect(getNextThemePreference('system')).toBe('light');
    expect(getNextThemePreference('light')).toBe('dark');
    expect(getNextThemePreference('dark')).toBe('system');

    expect(getThemePreferenceLabelVN('system')).toBe('Theo máy');
    expect(getThemePreferenceLabelVN('light')).toBe('Sáng');
    expect(getThemePreferenceLabelVN('dark')).toBe('Tối');
  });

  it('reads and writes theme preference safely even if window or localStorage fails', () => {
    // Node environment without window
    expect(readStoredThemePreference()).toBe('system');
    expect(() => writeStoredThemePreference('dark')).not.toThrow();

    // Valid window.localStorage
    const { store } = mockWindowStorage();
    writeStoredThemePreference('dark');
    expect(store.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredThemePreference()).toBe('dark');

    // Corrupted stored value falls back cleanly
    store.set(THEME_STORAGE_KEY, 'invalid-value');
    expect(readStoredThemePreference()).toBe('system');

    // Throwing localStorage falls back cleanly
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      },
    });
    expect(readStoredThemePreference()).toBe('system');
    expect(() => writeStoredThemePreference('light')).not.toThrow();
  });

  it('includes data-theme bootstrap logic and syncs harmonized #ECEFED / #0C100E theme-color meta tags', () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(THEME_STORAGE_KEY);
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("setAttribute('data-theme',t)");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('prefers-color-scheme: dark');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('#ECEFED');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('#0C100E');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('querySelectorAll(\'meta[name="theme-color"]\')');
  });
});

describe('welcome greeting and onboarding storage helpers', () => {
  it('computes Vietnam time-of-day greetings accurately in Asia/Ho_Chi_Minh (+07:00)', () => {
    const morning = new Date('2026-11-17T08:30:00+07:00');
    const noon = new Date('2026-11-17T12:15:00+07:00');
    const afternoon = new Date('2026-11-17T15:45:00+07:00');
    const evening = new Date('2026-11-17T20:10:00+07:00');
    const lateNight = new Date('2026-11-17T01:00:00+07:00');

    expect(getVietnamHour(morning)).toBe(8);
    expect(getTimeOfDayGreetingVN(morning)).toBe('Chào buổi sáng');
    expect(getTimeOfDayGreetingVN(noon)).toBe('Chào buổi trưa');
    expect(getTimeOfDayGreetingVN(afternoon)).toBe('Chào buổi chiều');
    expect(getTimeOfDayGreetingVN(evening)).toBe('Chào buổi tối');
    expect(getTimeOfDayGreetingVN(lateNight)).toBe('Chào buổi tối');
  });

  it('builds scoped keys and persists onboarding + daily greeting collapse state', () => {
    expect(getOnboardingMirrorKey('user-1')).toBe('paytrack-onboarding-v2:user-1');
    expect(getDailyGreetingStorageKey('user-1', '2026-11-17')).toBe(
      'paytrack-greeting-collapsed:user-1:2026-11-17'
    );

    mockWindowStorage();

    expect(readOnboardingMirror('user-1')).toBe(false);
    writeOnboardingMirror('user-1', true);
    expect(readOnboardingMirror('user-1')).toBe(true);
    writeOnboardingMirror('user-1', false);
    expect(readOnboardingMirror('user-1')).toBe(false);

    expect(readDailyGreetingCollapsed('user-1', '2026-11-17')).toBe(false);
    writeDailyGreetingCollapsed('user-1', true, '2026-11-17');
    expect(readDailyGreetingCollapsed('user-1', '2026-11-17')).toBe(true);
    expect(readDailyGreetingCollapsed('user-1', '2026-11-18')).toBe(false);
  });
});
