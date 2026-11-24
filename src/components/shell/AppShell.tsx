'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  BarChart3,
  ReceiptText,
  Settings,
  ShoppingBag,
  Users,
  WifiOff,
} from 'lucide-react';
import { useShellPosData } from '@/components/providers/PosDataProvider';
import { BrandMark } from '@/components/ui/BrandMark';
import { ThemeQuickToggle } from '@/components/ui/ThemeToggle';
import { WelcomeOnboardingModal } from '@/components/welcome/WelcomeOnboardingModal';
import { readOnboardingMirror } from '@/lib/welcome';

interface AppUserContextValue {
  userId: string;
  userEmail: string;
  openOnboarding: () => void;
}

const AppUserContext = createContext<AppUserContextValue>({
  userId: '',
  userEmail: '',
  openOnboarding: () => {},
});

export function useAppUser(): AppUserContextValue {
  return useContext(AppUserContext);
}

const emptySubscribe = () => () => {};

const NAV_ITEMS = [
  { href: '/', label: 'Bán hàng', icon: ShoppingBag },
  { href: '/debts', label: 'Công nợ', icon: Users },
  { href: '/orders', label: 'Sổ bán', icon: ReceiptText },
  { href: '/stats', label: 'Thống kê', icon: BarChart3 },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
] as const;

interface AppShellProps {
  userId: string;
  initialWelcomeSeen: boolean;
  shopName: string;
  userEmail: string;
  children: ReactNode;
}

export function AppShell({
  userId,
  initialWelcomeSeen,
  shopName,
  userEmail,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [swRegistered, setSwRegistered] = useState(false);
  const [forceOnboardingOpen, setForceOnboardingOpen] = useState(false);
  const [dismissedInSession, setDismissedInSession] = useState(false);
  const {
    syncStatus: status,
    profile,
    productsCount,
    setProfileLocal,
    upsertProductLocal,
  } = useShellPosData();
  const displayShopName = profile?.shop_name || shopName;

  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const mirrorSeen = hydrated && userId ? readOnboardingMirror(userId) : false;
  const onboardingOpen =
    forceOnboardingOpen ||
    (hydrated && Boolean(userId) && !initialWelcomeSeen && !mirrorSeen && !dismissedInSession);

  const openOnboarding = useCallback(() => {
    setForceOnboardingOpen(true);
  }, []);

  const handleCloseOnboarding = useCallback(() => {
    setForceOnboardingOpen(false);
    setDismissedInSession(true);
  }, []);

  useEffect(() => {
    const onOpenEvent = () => setForceOnboardingOpen(true);
    window.addEventListener('paytrack:open-onboarding', onOpenEvent);
    return () => window.removeEventListener('paytrack:open-onboarding', onOpenEvent);
  }, []);

  useEffect(() => {
    if (swRegistered || typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(() => setSwRegistered(true))
        .catch(() => {
          // Ignore SW registration failure in non-HTTPS dev environments
        });
    }
  }, [swRegistered]);

  const userCtxValue = useMemo(
    () => ({ userId, userEmail, openOnboarding }),
    [userId, userEmail, openOnboarding]
  );

  return (
    <AppUserContext.Provider value={userCtxValue}>
      <div className="flex min-h-dvh flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
        <a
          href="#main-content"
          className="no-print sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-3 focus:z-50 focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-lg focus:bg-[var(--brand-jade)] focus:px-4 focus:text-[14px] focus:font-semibold focus:text-white"
        >
          Bỏ qua tới nội dung chính
        </a>

        {/* Slim Translucent Top Bar (Mobile & Desktop) */}
        <header className="no-print glass-surface sticky top-0 z-20 border-x-0 border-t-0">
          <div className="mx-auto flex h-[54px] max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-6">
            <Link
              href="/"
              prefetch={true}
              className="flex min-h-[44px] min-w-0 items-center gap-2.5"
            >
              <BrandMark className="h-8 w-8 shrink-0" />
              <span className="truncate text-[15px] font-bold tracking-[-0.01em] text-[var(--text-primary)] sm:text-[16px]">
                {displayShopName}
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-1.5">
              <SyncStatusPill status={status} />
              <div className="lg:hidden">
                <ThemeQuickToggle iconOnly />
              </div>
            </div>
          </div>
        </header>

        {/* Offline Alert Banner */}
        {status === 'offline' && (
          <div
            role="alert"
            className="no-print flex items-center justify-center gap-2 border-b border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-4 py-2 text-[13px] font-medium text-[var(--status-overdue)]"
          >
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Mất mạng — bật Wi-Fi hoặc 4G để lưu đơn.</span>
          </div>
        )}

        {/* Full-Width Main Workspace (safe bottom padding for Floating Glass Dock) */}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-[112px] outline-none lg:pb-[104px]">
          {children}
        </main>

        {/* Unified Floating Glass Dock (375px Mobile & 1280px Desktop) */}
        <div className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[calc(10px+env(safe-area-inset-bottom))] lg:pb-4">
          <nav
            aria-label="Điều hướng chính"
            className="glass-dock pointer-events-auto flex w-full max-w-[440px] items-center gap-1 rounded-[22px] p-1.5 lg:w-auto lg:max-w-none lg:gap-1.5 lg:px-2"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  aria-current={active ? 'page' : undefined}
                  className={`press-tactile flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] px-0.5 text-[12px] font-medium transition-colors lg:min-h-[46px] lg:flex-initial lg:flex-row lg:gap-2 lg:px-4 lg:text-[14px] ${
                    active
                      ? 'bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 lg:h-[18px] lg:w-[18px]" />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              );
            })}

            <div className="mx-1 hidden h-6 w-px bg-[var(--border-default)] lg:block" />
            <div className="hidden lg:block">
              <ThemeQuickToggle iconOnly />
            </div>
          </nav>
        </div>
      </div>

      {onboardingOpen && (
        <WelcomeOnboardingModal
          open={onboardingOpen}
          userId={userId}
          profile={profile}
          productsCount={productsCount}
          onClose={handleCloseOnboarding}
          setProfileLocal={setProfileLocal}
          upsertProductLocal={upsertProductLocal}
        />
      )}
    </AppUserContext.Provider>
  );
}

function SyncStatusPill({ status }: { status: 'synced' | 'connecting' | 'offline' }) {
  if (status === 'offline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--status-overdue-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--status-overdue)]"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-overdue)]" />
        <span>Mất mạng</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--status-debt-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--status-debt)]"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-debt)]" />
        <span>Đang nối</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--status-paid-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--status-paid)]"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-paid)]" />
      <span>Đã đồng bộ</span>
    </div>
  );
}
