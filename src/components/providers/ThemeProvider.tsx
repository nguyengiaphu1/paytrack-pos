'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import {
  DEFAULT_THEME_PALETTE,
  THEME_PALETTE_STORAGE_KEY,
  applyPaletteToDom,
  normalizeThemePalette,
  readStoredThemePalette,
  writeStoredThemePalette,
  type CustomThemePalette,
} from '@/lib/theme-palette';

export interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  cyclePreference: () => void;
  palette: CustomThemePalette;
  setPalette: (next: CustomThemePalette) => void;
  resetPalette: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const preferenceListeners = new Set<() => void>();
const paletteListeners = new Set<() => void>();
let cachedPreference: ThemePreference | null = null;
let cachedPalette: CustomThemePalette | null = null;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

function notifyPreferenceListeners() {
  for (const listener of preferenceListeners) {
    listener();
  }
}

function notifyPaletteListeners() {
  for (const listener of paletteListeners) {
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

function getPaletteSnapshot(): CustomThemePalette {
  if (cachedPalette === null) {
    cachedPalette = readStoredThemePalette();
  }
  return cachedPalette;
}

function getServerPaletteSnapshot(): CustomThemePalette {
  return DEFAULT_THEME_PALETTE;
}

function subscribePreference(listener: () => void): () => void {
  preferenceListeners.add(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      cachedPreference = normalizeThemePreference(e.newValue);
      applyDomTheme(
        resolveTheme(cachedPreference, getSystemPrefersDark()),
        getPaletteSnapshot(),
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

function subscribePalette(listener: () => void): () => void {
  paletteListeners.add(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_PALETTE_STORAGE_KEY) {
      try {
        cachedPalette = e.newValue
          ? normalizeThemePalette(JSON.parse(e.newValue))
          : DEFAULT_THEME_PALETTE;
      } catch {
        cachedPalette = DEFAULT_THEME_PALETTE;
      }
      applyDomTheme(
        resolveTheme(getPreferenceSnapshot(), getSystemPrefersDark()),
        cachedPalette,
        false
      );
      notifyPaletteListeners();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return () => {
    paletteListeners.delete(listener);
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

function applyDomTheme(
  resolved: ResolvedTheme,
  palette: CustomThemePalette,
  animate: boolean
) {
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

  const paletteCanvas = applyPaletteToDom(palette, resolved);
  const themeColor =
    paletteCanvas || (resolved === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
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

  const palette = useSyncExternalStore(
    subscribePalette,
    getPaletteSnapshot,
    getServerPaletteSnapshot
  );

  const resolvedTheme = resolveTheme(preference, systemDark);
  const paletteRafRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const currentAttr = root.getAttribute('data-theme');
    const shouldAnimate = currentAttr === 'light' || currentAttr === 'dark';
    applyDomTheme(resolvedTheme, palette, shouldAnimate);
  }, [resolvedTheme, palette]);

  useEffect(() => {
    return () => {
      if (paletteRafRef.current !== null) {
        cancelAnimationFrame(paletteRafRef.current);
      }
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    const normalized = normalizeThemePreference(next);
    cachedPreference = normalized;
    writeStoredThemePreference(normalized);
    applyDomTheme(
      resolveTheme(normalized, getSystemPrefersDark()),
      getPaletteSnapshot(),
      true
    );
    notifyPreferenceListeners();
  }, []);

  const cyclePreference = useCallback(() => {
    const current = getPreferenceSnapshot();
    setPreference(getNextThemePreference(current));
  }, [setPreference]);

  const setPalette = useCallback((next: CustomThemePalette) => {
    const normalized = normalizeThemePalette(next);
    cachedPalette = normalized;
    writeStoredThemePalette(normalized);

    if (paletteRafRef.current !== null) {
      cancelAnimationFrame(paletteRafRef.current);
    }
    paletteRafRef.current = requestAnimationFrame(() => {
      paletteRafRef.current = null;
      applyDomTheme(
        resolveTheme(getPreferenceSnapshot(), getSystemPrefersDark()),
        normalized,
        false
      );
    });
    notifyPaletteListeners();
  }, []);

  const resetPalette = useCallback(() => {
    setPalette(DEFAULT_THEME_PALETTE);
  }, [setPalette]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
      cyclePreference,
      palette,
      setPalette,
      resetPalette,
    }),
    [preference, resolvedTheme, setPreference, cyclePreference, palette, setPalette, resetPalette]
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
