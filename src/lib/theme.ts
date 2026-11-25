/**
 * Device-scoped Light / Dark / System theme utilities.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'paytrack-theme';
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

export const THEME_COLOR_LIGHT = '#EEF0F3';
export const THEME_COLOR_DARK = '#0B0D11';

export function isValidThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return isValidThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return DEFAULT_THEME_PREFERENCE;
  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function writeStoredThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage quota/private browsing failures gracefully
  }
}

export function getNextThemePreference(current: ThemePreference): ThemePreference {
  if (current === 'system') return 'light';
  if (current === 'light') return 'dark';
  return 'system';
}

export function getThemePreferenceLabelVN(preference: ThemePreference): string {
  switch (preference) {
    case 'light':
      return 'Sáng';
    case 'dark':
      return 'Tối';
    case 'system':
      return 'Theo máy';
  }
}

/**
 * Synchronous inline script injected into <head> before React hydration
 * to prevent any light/dark flash on initial paint.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var p=localStorage.getItem(k);if(p!=='light'&&p!=='dark'&&p!=='system'){p='system';}var d=false;if(p==='dark'){d=true;}else if(p==='system'&&window.matchMedia){d=window.matchMedia('(prefers-color-scheme: dark)').matches;}var t=d?'dark':'light';var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=t;var c=d?'${THEME_COLOR_DARK}':'${THEME_COLOR_LIGHT}';var ms=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<ms.length;i++){ms[i].setAttribute('content',c);}}catch(e){}})();`;
