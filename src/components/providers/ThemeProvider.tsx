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
import { ensureGsapInitialized, gsap, GSAP_MOTION } from '@/lib/gsap';
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

export interface ThemeTransitionOrigin {
  x: number;
  y: number;
}

export interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference, origin?: ThemeTransitionOrigin) => void;
  cyclePreference: (origin?: ThemeTransitionOrigin) => void;
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
      applyDomThemeInstant(
        resolveTheme(cachedPreference, getSystemPrefersDark()),
        getPaletteSnapshot()
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
      applyDomThemeInstant(
        resolveTheme(getPreferenceSnapshot(), getSystemPrefersDark()),
        cachedPalette
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

function applyDomThemeInstant(resolved: ResolvedTheme, palette: CustomThemePalette) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;

  const paletteCanvas = applyPaletteToDom(palette, resolved);
  const themeColor =
    paletteCanvas || (resolved === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', themeColor);
  });
}

function runRadialThemeTransition(
  resolved: ResolvedTheme,
  palette: CustomThemePalette,
  origin?: ThemeTransitionOrigin
) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');

  if (current === resolved) {
    applyDomThemeInstant(resolved, palette);
    return;
  }

  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    applyDomThemeInstant(resolved, palette);
    return;
  }

  const x = origin?.x ?? window.innerWidth - 36;
  const y = origin?.y ?? 36;
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );
  const toDark = resolved === 'dark';

  root.classList.add('theme-switching');
  if (transitionTimer) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }

  const docWithVt = document as Document & {
    startViewTransition?: (cb: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };

  if (typeof docWithVt.startViewTransition === 'function') {
    root.dataset.themeTransitionDir = toDark ? 'expand' : 'collapse';
    const vt = docWithVt.startViewTransition(() => {
      applyDomThemeInstant(resolved, palette);
    });

    vt.ready
      .then(() => {
        const clipStart = `circle(0px at ${x}px ${y}px)`;
        const clipEnd = `circle(${Math.ceil(maxRadius)}px at ${x}px ${y}px)`;
        root.animate(
          {
            clipPath: toDark ? [clipStart, clipEnd] : [clipEnd, clipStart],
          },
          {
            duration: 540,
            easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
            fill: 'both',
            pseudoElement: toDark ? '::view-transition-new(root)' : '::view-transition-old(root)',
          }
        );
      })
      .catch(() => {
        applyDomThemeInstant(resolved, palette);
      });

    vt.finished
      .catch(() => {})
      .finally(() => {
        root.classList.remove('theme-switching');
        delete root.dataset.themeTransitionDir;
      });
    return;
  }

  // Fallback for iOS 15–17 Safari without View Transitions API: GPU circular overlay wipe
  ensureGsapInitialized();
  const diameter = Math.ceil(maxRadius * 2);
  const circle = document.createElement('div');
  circle.setAttribute('aria-hidden', 'true');
  circle.style.position = 'fixed';
  circle.style.left = `${x - maxRadius}px`;
  circle.style.top = `${y - maxRadius}px`;
  circle.style.width = `${diameter}px`;
  circle.style.height = `${diameter}px`;
  circle.style.borderRadius = '9999px';
  circle.style.pointerEvents = 'none';
  circle.style.zIndex = '9999';
  circle.style.willChange = 'transform, opacity';
  circle.style.backgroundColor = toDark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
  document.body.appendChild(circle);

  if (toDark) {
    gsap.fromTo(
      circle,
      { scale: 0.01 },
      {
        scale: 1,
        duration: 0.48,
        ease: GSAP_MOTION.ease.iosSheet,
        onComplete: () => {
          applyDomThemeInstant(resolved, palette);
          gsap.to(circle, {
            opacity: 0,
            duration: 0.16,
            onComplete: () => {
              circle.remove();
              root.classList.remove('theme-switching');
            },
          });
        },
      }
    );
  } else {
    applyDomThemeInstant(resolved, palette);
    gsap.fromTo(
      circle,
      { scale: 1 },
      {
        scale: 0.01,
        opacity: 0,
        duration: 0.46,
        ease: GSAP_MOTION.ease.iosSheet,
        onComplete: () => {
          circle.remove();
          root.classList.remove('theme-switching');
        },
      }
    );
  }

  transitionTimer = setTimeout(() => {
    circle.remove();
    root.classList.remove('theme-switching');
    transitionTimer = null;
  }, 800);
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
    applyDomThemeInstant(resolvedTheme, palette);
  }, [resolvedTheme, palette]);

  useEffect(() => {
    return () => {
      if (paletteRafRef.current !== null) {
        cancelAnimationFrame(paletteRafRef.current);
      }
    };
  }, []);

  const setPreference = useCallback(
    (next: ThemePreference, origin?: ThemeTransitionOrigin) => {
      const normalized = normalizeThemePreference(next);
      cachedPreference = normalized;
      writeStoredThemePreference(normalized);
      const nextResolved = resolveTheme(normalized, getSystemPrefersDark());
      runRadialThemeTransition(nextResolved, getPaletteSnapshot(), origin);
      notifyPreferenceListeners();
    },
    []
  );

  const cyclePreference = useCallback(
    (origin?: ThemeTransitionOrigin) => {
      const current = getPreferenceSnapshot();
      setPreference(getNextThemePreference(current), origin);
    },
    [setPreference]
  );

  const setPalette = useCallback((next: CustomThemePalette) => {
    const normalized = normalizeThemePalette(next);
    cachedPalette = normalized;
    writeStoredThemePalette(normalized);

    if (paletteRafRef.current !== null) {
      cancelAnimationFrame(paletteRafRef.current);
    }
    paletteRafRef.current = requestAnimationFrame(() => {
      paletteRafRef.current = null;
      applyDomThemeInstant(
        resolveTheme(getPreferenceSnapshot(), getSystemPrefersDark()),
        normalized
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
