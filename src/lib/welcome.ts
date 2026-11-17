import { getTodayVN } from '@/lib/vietnamese';

export const ONBOARDING_STORAGE_PREFIX = 'paytrack-onboarding-v2:';
export const DAILY_GREETING_STORAGE_PREFIX = 'paytrack-greeting-collapsed:';

export function getVietnamHour(date: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '8';
    const hour = Number.parseInt(hourStr, 10);
    return Number.isFinite(hour) ? hour % 24 : 8;
  } catch {
    return 8;
  }
}

export function getTimeOfDayGreetingVN(date: Date = new Date()): string {
  const hour = getVietnamHour(date);
  if (hour >= 5 && hour < 11) return 'Chào buổi sáng';
  if (hour >= 11 && hour < 14) return 'Chào buổi trưa';
  if (hour >= 14 && hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function getOnboardingMirrorKey(userId: string): string {
  return `${ONBOARDING_STORAGE_PREFIX}${userId}`;
}

export function readOnboardingMirror(userId: string): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getOnboardingMirrorKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function writeOnboardingMirror(userId: string, seen: boolean): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    if (seen) {
      window.localStorage.setItem(getOnboardingMirrorKey(userId), '1');
    } else {
      window.localStorage.removeItem(getOnboardingMirrorKey(userId));
    }
  } catch {
    // Ignore storage restriction gracefully
  }
}

export function getDailyGreetingStorageKey(
  userId: string,
  dateStr: string = getTodayVN()
): string {
  return `${DAILY_GREETING_STORAGE_PREFIX}${userId}:${dateStr}`;
}

export function readDailyGreetingCollapsed(
  userId: string,
  dateStr: string = getTodayVN()
): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getDailyGreetingStorageKey(userId, dateStr)) === '1';
  } catch {
    return false;
  }
}

export function writeDailyGreetingCollapsed(
  userId: string,
  collapsed: boolean,
  dateStr: string = getTodayVN()
): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    const key = getDailyGreetingStorageKey(userId, dateStr);
    if (collapsed) {
      window.localStorage.setItem(key, '1');
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage restriction gracefully
  }
}
