'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { ensureGsapInitialized, gsap, GSAP_MOTION, ScrollTrigger, useGSAP } from '@/lib/gsap';
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
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const dockPillRef = useRef<HTMLSpanElement>(null);
  const tabStageRef = useRef<HTMLDivElement>(null);
  const hasBootedShellRef = useRef(false);
  const pillInitializedRef = useRef(false);

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

  // Initial top-bar + floating dock GSAP timeline + ScrollTrigger header polish
  useGSAP(
    () => {
      ensureGsapInitialized();
      if (hasBootedShellRef.current) return;
      hasBootedShellRef.current = true;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const bootTl = gsap.timeline();
        if (headerRef.current) {
          bootTl.from(
            headerRef.current,
            {
              y: -12,
              autoAlpha: 0,
              duration: GSAP_MOTION.duration.enter,
              ease: GSAP_MOTION.ease.iosSheet,
              clearProps: 'transform,opacity,visibility',
            },
            0
          );

          ScrollTrigger.create({
            start: 18,
            end: 'max',
            onEnter: () => {
              if (!headerRef.current) return;
              gsap.to(headerRef.current, {
                scale: 0.992,
                duration: 0.2,
                ease: GSAP_MOTION.ease.smooth,
              });
            },
            onLeaveBack: () => {
              if (!headerRef.current) return;
              gsap.to(headerRef.current, {
                scale: 1,
                duration: 0.2,
                ease: GSAP_MOTION.ease.smooth,
                clearProps: 'transform',
              });
            },
          });
        }
        if (dockRef.current) {
          bootTl.from(
            dockRef.current,
            {
              y: 20,
              scale: 0.97,
              autoAlpha: 0,
              duration: 0.26,
              ease: GSAP_MOTION.ease.iosSheet,
              clearProps: 'transform,opacity,visibility',
            },
            0.03
          );
        }
      });

      return () => mm.revert();
    },
    { scope: shellRef }
  );

  // Sliding Floating Glass Dock GPU-only pill (x/y/scaleX/scaleY, zero width/height layout thrash)
  useGSAP(
    () => {
      ensureGsapInitialized();
      const navEl = dockRef.current;
      const pillEl = dockPillRef.current;
      if (!navEl || !pillEl) return;

      const positionPill = (animate: boolean) => {
        const activeLink = navEl.querySelector<HTMLElement>('[aria-current="page"]');
        if (!activeLink) return;
        const x = activeLink.offsetLeft;
        const y = activeLink.offsetTop;
        const width = activeLink.offsetWidth;
        const height = activeLink.offsetHeight;
        if (width <= 0 || height <= 0) return;

        const baseWidth = 100;
        const baseHeight = 44;
        const scaleX = width / baseWidth;
        const scaleY = height / baseHeight;

        if (!animate) {
          gsap.set(pillEl, {
            x,
            y,
            scaleX,
            scaleY,
            transformOrigin: '0 0',
            autoAlpha: 1,
          });
          return;
        }

        const mm = gsap.matchMedia();
        mm.add(
          {
            all: 'all',
            reduceMotion: '(prefers-reduced-motion: reduce)',
          },
          (context) => {
            if (context.conditions?.reduceMotion) {
              gsap.set(pillEl, {
                x,
                y,
                scaleX,
                scaleY,
                transformOrigin: '0 0',
                autoAlpha: 1,
              });
              return;
            }
            const dockTl = gsap.timeline();
            dockTl.to(
              pillEl,
              {
                x,
                y,
                scaleX,
                scaleY,
                transformOrigin: '0 0',
                autoAlpha: 1,
                duration: 0.26,
                ease: GSAP_MOTION.ease.iosMove,
              },
              0
            );

            const activeIcon = activeLink.querySelector<SVGSVGElement>('svg');
            if (activeIcon) {
              dockTl.fromTo(
                activeIcon,
                { y: -3, scale: 1.08 },
                {
                  y: 0,
                  scale: 1,
                  duration: 0.22,
                  ease: GSAP_MOTION.ease.iosSheet,
                  clearProps: 'transform',
                },
                0.02
              );
            }
          }
        );
      };

      const shouldAnimate = pillInitializedRef.current;
      pillInitializedRef.current = true;
      positionPill(shouldAnimate);

      const ro =
        typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(() => positionPill(false))
          : null;
      ro?.observe(navEl);
      return () => ro?.disconnect();
    },
    { scope: dockRef, dependencies: [activeTabIndex] }
  );

  // Directional page timeline + staggered glass card entrance on dock tab switches
  // (preserves CSS class names animate-tab-slide-left / animate-tab-slide-right for reduced-motion & tests)
  useGSAP(
    () => {
      ensureGsapInitialized();
      const prevIdx = prevTabIndexRef.current;
      if (prevIdx === activeTabIndex) return;
      prevTabIndexRef.current = activeTabIndex;

      const stage = tabStageRef.current;
      if (!stage) return;

      const direction = activeTabIndex > prevIdx ? 1 : -1;
      const fallbackClass =
        direction > 0 ? 'animate-tab-slide-left' : 'animate-tab-slide-right';

      const mm = gsap.matchMedia();
      mm.add(
        {
          all: 'all',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          if (context.conditions?.reduceMotion) {
            stage.classList.remove('animate-tab-slide-left', 'animate-tab-slide-right');
            void stage.offsetWidth;
            stage.classList.add(fallbackClass);
            return;
          }

          const pageTl = gsap.timeline({
            onComplete: () => ScrollTrigger.refresh(),
          });

          pageTl.fromTo(
            stage,
            { x: direction * 28, autoAlpha: 0 },
            {
              x: 0,
              autoAlpha: 1,
              duration: GSAP_MOTION.duration.pageIn,
              ease: GSAP_MOTION.ease.iosSheet,
              clearProps: 'transform,opacity,visibility',
            },
            0
          );

          const heading = stage.querySelector<HTMLElement>('h1');
          if (heading) {
            pageTl.from(
              heading,
              {
                y: 8,
                autoAlpha: 0,
                duration: 0.22,
                ease: GSAP_MOTION.ease.iosSheet,
                clearProps: 'transform,opacity,visibility',
              },
              0.02
            );
          }

          const cards = Array.from(
            stage.querySelectorAll<HTMLElement>('.glass-panel, .glass-surface, .glass-card')
          )
            .filter((el) => !el.closest('.print-surface-light'))
            .slice(0, 8);

          if (cards.length > 0) {
            pageTl.from(
              cards,
              {
                y: 12,
                scale: 0.97,
                autoAlpha: 0,
                duration: 0.24,
                stagger: {
                  each: 0.028,
                  from: 'start',
                },
                ease: GSAP_MOTION.ease.iosSheet,
                clearProps: 'transform,opacity,visibility',
              },
              0.03
            );
          }
        }
      );

      return () => mm.revert();
    },
    { scope: tabStageRef, dependencies: [activeTabIndex] }
  );

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
      <div ref={shellRef} className="relative flex min-h-dvh flex-col text-[var(--text-primary)]">
        <a
          href="#main-content"
          className="no-print glass-btn-primary sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-full focus:px-4 focus:text-[14px] focus:font-semibold"
        >
          Bỏ qua tới nội dung chính
        </a>

        {/* Neutral Frosted Glass Top Bar (Mobile & Desktop) */}
        <div className="no-print sticky top-0 z-20 px-2.5 pt-2.5 sm:px-5 sm:pt-3">
          <header
            ref={headerRef}
            className="glass-surface mx-auto flex h-[60px] max-w-[1440px] items-center justify-between gap-1.5 rounded-[24px] px-2.5 sm:gap-2 sm:px-4"
          >
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
            ref={dockRef}
            aria-label="Điều hướng chính"
            className="glass-dock pointer-events-auto relative flex w-full max-w-[440px] items-center gap-0.5 rounded-[30px] p-1 lg:w-auto lg:max-w-none lg:gap-1.5 lg:rounded-full lg:px-2 lg:py-1.5"
          >
            <span
              ref={dockPillRef}
              aria-hidden="true"
              className="glass-dock-pill pointer-events-none absolute top-0 left-0 z-0 h-[44px] w-[100px] rounded-[24px] opacity-0 will-change-transform lg:rounded-full"
            />
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
                  className={`press-tactile relative z-[1] flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[24px] px-0 text-[12px] tracking-[-0.015em] leading-none transition-[transform,background-color,color] lg:min-h-[46px] lg:flex-initial lg:flex-row lg:gap-2 lg:rounded-full lg:px-4 lg:text-[14px] lg:tracking-normal ${
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
