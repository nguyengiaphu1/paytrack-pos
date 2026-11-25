'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
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

function getNavTabIndex(pathname: string): number {
  if (pathname === '/') return 0;
  const idx = NAV_ITEMS.findIndex((item) => item.href !== '/' && pathname.startsWith(item.href));
  return idx >= 0 ? idx : 0;
}

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
  const activeTabIndex = getNavTabIndex(pathname);
  const prevTabIndexRef = useRef<number>(activeTabIndex);
  const tabStageRef = useRef<HTMLDivElement>(null);

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

  useLayoutEffect(() => {
    const prevIdx = prevTabIndexRef.current;
    if (prevIdx === activeTabIndex) return;
    prevTabIndexRef.current = activeTabIndex;

    const stage = tabStageRef.current;
    if (!stage) return;

    const animClass =
      activeTabIndex > prevIdx ? 'animate-tab-slide-left' : 'animate-tab-slide-right';
    stage.classList.remove('animate-tab-slide-left', 'animate-tab-slide-right');
    // Force reflow so rapid consecutive tab switches restart the slide cleanly
    void stage.offsetWidth;
    stage.classList.add(animClass);
  }, [activeTabIndex]);

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
      <div className="relative flex min-h-dvh flex-col text-[var(--text-primary)]">
        <a
          href="#main-content"
          className="no-print glass-btn-primary sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-full focus:px-4 focus:text-[14px] focus:font-semibold"
        >
          Bỏ qua tới nội dung chính
        </a>

        {/* Neutral Frosted Glass Top Bar (Mobile & Desktop) */}
        <div className="no-print sticky top-0 z-20 px-2.5 pt-2.5 sm:px-5 sm:pt-3">
          <header className="glass-surface mx-auto flex h-[60px] max-w-[1440px] items-center justify-between gap-1.5 rounded-[24px] px-2.5 sm:gap-2 sm:px-4">
            <Link
              href="/"
              prefetch={true}
              className="flex min-h-[44px] min-w-0 items-center gap-2 rounded-full pr-1 transition-opacity hover:opacity-90 sm:gap-2.5 sm:pr-2"
            >
              <span className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] p-0.5">
                <BrandMark className="h-8 w-8 shrink-0" />
              </span>
              <span className="truncate text-[15px] font-bold tracking-[-0.015em] text-[var(--text-primary)] sm:text-[16px]">
                {displayShopName}
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <SyncStatusPill status={status} />
              <ThemeQuickToggle responsiveLabel />
            </div>
          </header>
        </div>

        {/* Offline Alert Banner */}
        {status === 'offline' && (
          <div className="no-print mx-auto mt-2 w-full max-w-[1440px] px-2.5 sm:px-5">
            <div
              role="alert"
              className="glass-badge-overdue flex items-center justify-center gap-2 rounded-[16px] px-4 py-2.5 text-[13px] font-semibold"
            >
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>Mất mạng — bật Wi-Fi hoặc 4G để lưu đơn.</span>
            </div>
          </div>
        )}

        {/* Full-Width Main Workspace with directional slide-left / slide-right tab transitions */}
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 pb-[118px] outline-none lg:pb-[112px]"
        >
          <div
            ref={tabStageRef}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget) {
                e.currentTarget.classList.remove(
                  'animate-tab-slide-left',
                  'animate-tab-slide-right'
                );
              }
            }}
          >
            {children}
          </div>
        </main>

        {/* Sculpted 3D Crystal Floating Glass Dock (5 tabs, 375px Mobile & 1280px+ Desktop) */}
        <div className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-[calc(10px+env(safe-area-inset-bottom))] lg:pb-4">
          <nav
            aria-label="Điều hướng chính"
            className="glass-dock pointer-events-auto flex w-full max-w-[440px] items-center gap-0.5 rounded-[30px] p-1 lg:w-auto lg:max-w-none lg:gap-1.5 lg:rounded-full lg:px-2 lg:py-1.5"
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
                  className={`press-tactile relative flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[24px] px-0 text-[12px] tracking-[-0.015em] leading-none transition-[transform,background-color,color] lg:min-h-[46px] lg:flex-initial lg:flex-row lg:gap-2 lg:rounded-full lg:px-4 lg:text-[14px] lg:tracking-normal ${
                    active
                      ? 'glass-chip-active font-semibold'
                      : 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="h-[19px] w-[19px] shrink-0 lg:h-[18px] lg:w-[18px]" />
                  <span className="max-w-full truncate whitespace-nowrap leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}
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
        className="glass-badge-overdue inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold sm:px-3"
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
        className="glass-badge-debt inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold sm:px-3"
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
      className="glass-badge-paid inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold sm:px-3"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-paid)]" />
      <span>Đã đồng bộ</span>
    </div>
  );
}
