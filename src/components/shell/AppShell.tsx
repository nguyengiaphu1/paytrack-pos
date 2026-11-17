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
  BookOpenCheck,
  ReceiptText,
  Settings,
  ShoppingBag,
  Users,
  WifiOff,
} from 'lucide-react';
import { usePosData } from '@/components/providers/PosDataProvider';
import { ThemeQuickToggle } from '@/components/ui/ThemeToggle';
import { WelcomeOnboardingModal } from '@/components/welcome/WelcomeOnboardingModal';
import { readOnboardingMirror } from '@/lib/welcome';

interface AppUserContextValue {
  userId: string;
  openOnboarding: () => void;
}

const AppUserContext = createContext<AppUserContextValue>({
  userId: '',
  openOnboarding: () => {},
});

export function useAppUser(): AppUserContextValue {
  return useContext(AppUserContext);
}

const emptySubscribe = () => () => {};

const NAV_ITEMS = [
  { href: '/', label: 'Bán hàng', icon: ShoppingBag },
  { href: '/debts', label: 'Sổ nợ', icon: Users },
  { href: '/orders', label: 'Đơn hàng', icon: ReceiptText },
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
    products,
    setProfileLocal,
    upsertProductLocal,
  } = usePosData();
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
          // Bỏ qua lỗi đăng ký SW trong môi trường dev không hỗ trợ HTTPS/SW
        });
    }
  }, [swRegistered]);

  const userCtxValue = useMemo(
    () => ({ userId, openOnboarding }),
    [userId, openOnboarding]
  );

  return (
    <AppUserContext.Provider value={userCtxValue}>
      <div className="flex min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Desktop Left Rail Sidebar (>= 1024px) */}
      <aside className="no-print hidden lg:flex lg:w-[228px] lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--border-default)] lg:bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--border-default)] px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-jade)] text-white">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[var(--text-primary)]">
              {displayShopName}
            </p>
            <p className="truncate text-[12px] text-[var(--text-secondary)]">
              {userEmail}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`press-tactile flex min-h-[46px] items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors ${
                  active
                    ? 'bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade-text)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2.5 border-t border-[var(--border-default)] p-3">
          <ThemeQuickToggle fullWidth />
          <SyncStatusPill status={status} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Bar (< 1024px) */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 sm:px-4 lg:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-jade)] text-white">
              <BookOpenCheck className="h-4 w-4" />
            </div>
            <span className="truncate text-[15px] font-bold text-[var(--text-primary)]">
              {displayShopName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeQuickToggle compact />
            <SyncStatusPill status={status} compact />
          </div>
        </header>

        {/* Offline Banner */}
        {status === 'offline' && (
          <div
            role="alert"
            className="no-print flex items-center justify-center gap-2 border-b border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-4 py-2 text-[13px] font-medium text-[var(--status-overdue)]"
          >
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Mất mạng — đơn chưa thể lưu. Vui lòng bật lại Wi-Fi hoặc 4G trước khi lưu đơn.</span>
          </div>
        )}

        <main className="min-w-0 flex-1 pb-[84px] lg:pb-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 1024px) */}
      <nav
        aria-label="Thanh điều hướng di động"
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-default)] bg-[var(--bg-surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`press-tactile flex min-h-[60px] w-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors ${
                  active
                    ? 'font-semibold text-[var(--brand-jade-text)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
    {onboardingOpen && (
      <WelcomeOnboardingModal
        open={onboardingOpen}
        userId={userId}
        profile={profile}
        productsCount={products.length}
        onClose={handleCloseOnboarding}
        setProfileLocal={setProfileLocal}
        upsertProductLocal={upsertProductLocal}
      />
    )}
    </AppUserContext.Provider>
  );
}

function SyncStatusPill({ status, compact = false }: { status: 'synced' | 'connecting' | 'offline'; compact?: boolean }) {
  if (status === 'offline') {
    return (
      <div className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--status-overdue-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--status-overdue)]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-overdue)]" />
        <span>{compact ? 'Mất mạng' : 'Mất kết nối mạng'}</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--status-debt-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--status-debt)]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-debt)]" />
        <span>{compact ? 'Đang nối' : 'Đang kết nối lại...'}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--status-paid-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--status-paid)]">
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-paid)]" />
      <span>{compact ? 'Đã lưu' : 'Đã lưu tự động'}</span>
    </div>
  );
}
