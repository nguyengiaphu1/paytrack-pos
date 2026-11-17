'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
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

const NAV_ITEMS = [
  { href: '/', label: 'Bán hàng', icon: ShoppingBag },
  { href: '/debts', label: 'Sổ nợ', icon: Users },
  { href: '/orders', label: 'Đơn hàng', icon: ReceiptText },
  { href: '/stats', label: 'Thống kê', icon: BarChart3 },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
] as const;

interface AppShellProps {
  shopName: string;
  userEmail: string;
  children: ReactNode;
}

export function AppShell({ shopName, userEmail, children }: AppShellProps) {
  const pathname = usePathname();
  const [swRegistered, setSwRegistered] = useState(false);
  const { syncStatus: status, profile } = usePosData();
  const displayShopName = profile?.shop_name || shopName;

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

  return (
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
                className={`flex min-h-[46px] items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors ${
                  active
                    ? 'bg-[var(--status-paid-bg)] font-semibold text-[var(--brand-jade)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border-default)] p-3">
          <SyncStatusPill status={status} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Bar (< 1024px) */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5 lg:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-jade)] text-white">
              <BookOpenCheck className="h-4 w-4" />
            </div>
            <span className="truncate text-[15px] font-bold text-[var(--text-primary)]">
              {displayShopName}
            </span>
          </div>
          <SyncStatusPill status={status} compact />
        </header>

        {/* Offline Banner */}
        {status === 'offline' && (
          <div
            role="alert"
            className="no-print flex items-center justify-center gap-2 border-b border-[#FCA5A5] bg-[var(--status-overdue-bg)] px-4 py-2 text-[13px] font-medium text-[var(--status-overdue)]"
          >
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Mất kết nối — chưa lưu lên cloud. Kiểm tra Wi-Fi/4G trước khi lưu đơn.</span>
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
                className={`flex min-h-[60px] w-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors ${
                  active
                    ? 'font-semibold text-[var(--brand-jade)]'
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
  );
}

function SyncStatusPill({ status, compact = false }: { status: 'synced' | 'connecting' | 'offline'; compact?: boolean }) {
  if (status === 'offline') {
    return (
      <div className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--status-overdue-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--status-overdue)]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-overdue)]" />
        <span>{compact ? 'Mất mạng' : 'Mất kết nối'}</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--status-debt-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--status-debt)]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-debt)]" />
        <span>{compact ? 'Đang nối' : 'Đang kết nối cloud...'}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--status-paid-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--status-paid)]">
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-paid)]" />
      <span>{compact ? 'Cloud OK' : 'Đã đồng bộ Cloud'}</span>
    </div>
  );
}
