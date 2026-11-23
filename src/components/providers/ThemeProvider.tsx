'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  THEME_STORAGE_KEY,
  getNextThemePreference,
  getSystemPrefersDark,
  normalizeThemePreference,
  readStoredThemePreference,
  resolveTheme,
  writeStoredThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';

export interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  cyclePreference: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const preferenceListeners = new Set<() => void>();
let cachedPreference: ThemePreference | null = null;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

function notifyPreferenceListeners() {
  for (const listener of preferenceListeners) {
    listener();
  }
}

function getPreferenceSnapshot(): ThemePreference {
  if (cachedPreference === null) {
    cachedPreference = readStoredThemePreference();
  }
  return cachedPreference;
}

function getServerPreferenceSnapshot(): ThemePreference {
  return DEFAULT_THEME_PREFERENCE;
}

function subscribePreference(listener: () => void): () => void {
  preferenceListeners.add(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      cachedPreference = normalizeThemePreference(e.newValue);
      applyDomTheme(
        resolveTheme(cachedPreference, getSystemPrefersDark()),
        true
      );
      notifyPreferenceListeners();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return () => {
    preferenceListeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

function subscribeSystemDark(listener: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => listener();
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }
  mq.addListener(handler);
  return () => mq.removeListener(handler);
}

function getSystemDarkSnapshot(): boolean {
  return getSystemPrefersDark();
}

function getSystemDarkServerSnapshot(): boolean {
  return false;
}

function applyDomTheme(resolved: ResolvedTheme, animate: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');

  if (animate && current !== resolved) {
    root.classList.add('theme-transitioning');
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
      transitionTimer = null;
    }, 320);
  }

  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;

  const themeColor = resolved === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', themeColor);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribePreference,
    getPreferenceSnapshot,
    getServerPreferenceSnapshot
  );

  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    getSystemDarkSnapshot,
    getSystemDarkServerSnapshot
  );

  const resolvedTheme = resolveTheme(preference, systemDark);

  // Sync DOM attributes when system theme changes under 'system' preference
  useEffect(() => {
    const root = document.documentElement;
    const currentAttr = root.getAttribute('data-theme');
    const shouldAnimate = currentAttr === 'light' || currentAttr === 'dark';
    applyDomTheme(resolvedTheme, shouldAnimate);
  }, [resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    const normalized = normalizeThemePreference(next);
    cachedPreference = normalized;
    writeStoredThemePreference(normalized);
    applyDomTheme(resolveTheme(normalized, getSystemPrefersDark()), true);
    notifyPreferenceListeners();
  }, []);

  const cyclePreference = useCallback(() => {
    const current = getPreferenceSnapshot();
    setPreference(getNextThemePreference(current));
  }, [setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
      cyclePreference,
    }),
    [preference, resolvedTheme, setPreference, cyclePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}
