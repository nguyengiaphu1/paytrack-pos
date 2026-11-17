'use client';

import Link from 'next/link';
import { useCallback, useSyncExternalStore } from 'react';
import { ArrowRight, ChevronUp, SunMedium, Users } from 'lucide-react';
import {
  getDailyGreetingStorageKey,
  getTimeOfDayGreetingVN,
  readDailyGreetingCollapsed,
  writeDailyGreetingCollapsed,
} from '@/lib/welcome';

interface DailyWelcomeBannerProps {
  userId: string;
  shopName: string;
  dueDebtorsCount: number;
  todayOrderCount: number | null;
}

const collapseListeners = new Set<() => void>();

function subscribeCollapse(listener: () => void): () => void {
  collapseListeners.add(listener);
  const onStorage = () => listener();
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    collapseListeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

export function DailyWelcomeBanner({
  userId,
  shopName,
  dueDebtorsCount,
  todayOrderCount,
}: DailyWelcomeBannerProps) {
  const storageKey = getDailyGreetingStorageKey(userId);

  const isCollapsed = useSyncExternalStore(
    subscribeCollapse,
    () => (userId ? readDailyGreetingCollapsed(userId) : false),
    () => true
  );

  const handleCollapse = useCallback(() => {
    if (!userId) return;
    writeDailyGreetingCollapsed(userId, true);
    for (const listener of collapseListeners) listener();
  }, [userId]);

  // Keep key referenced cleanly for storage updates
  void storageKey;

  if (isCollapsed) return null;

  const greeting = getTimeOfDayGreetingVN();

  return (
    <section
      aria-label="Lời chào đầu phiên"
      className="animate-fade-in mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]">
          <SunMedium className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-[var(--text-primary)]">
            {greeting}, {shopName}!
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
            {dueDebtorsCount > 0
              ? `Hôm nay có ${dueDebtorsCount} khách đến hạn thu tiền. Bạn có thể mở Sổ nợ để nhắc khách ngay.`
              : todayOrderCount === 0
                ? 'Chúc bạn một ngày buôn may bán đắt! Chạm vào món bên dưới để tạo đơn đầu tiên hôm nay.'
                : 'Sổ bán hàng đã sẵn sàng. Chạm vào món bên dưới để lên đơn nhanh chóng.'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {dueDebtorsCount > 0 && (
          <Link
            href="/debts?filter=due"
            className="press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--status-debt-bg)] px-3 text-[13px] font-semibold text-[var(--status-debt)]"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Xem {dueDebtorsCount} khách đến hạn</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        )}
        <button
          type="button"
          onClick={handleCollapse}
          aria-label="Thu gọn lời chào hôm nay"
          className="press-tactile inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
        >
          <ChevronUp className="h-4 w-4 shrink-0" />
          <span>Thu gọn</span>
        </button>
      </div>
    </section>
  );
}
