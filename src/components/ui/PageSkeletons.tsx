'use client';

import { RefreshCw, WifiOff } from 'lucide-react';

function Bone({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-[12px] ${className}`} aria-hidden="true" />;
}

export function FetchErrorCard({
  title = 'Chưa tải được dữ liệu',
  message,
  onRetry,
}: {
  title?: string;
  message?: string | null;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      data-gsap-reveal="fetch-error"
      className="animate-fade-in glass-card rounded-[24px] p-6 text-center"
    >
      <div className="glass-badge-overdue mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-[18px]">
        <WifiOff className="h-6 w-6" />
      </div>
      <h2 className="text-[16px] font-bold text-[var(--text-primary)]">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-[420px] text-[14px] text-[var(--text-secondary)]">
        {message || 'Kiểm tra kết nối mạng rồi thử lại.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="glass-btn-primary press-tactile mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold"
      >
        <RefreshCw className="h-4 w-4 shrink-0" />
        <span>Thử lại</span>
      </button>
    </div>
  );
}

export function PosWorkspaceSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải màn hình bán hàng"
      className="grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-5"
    >
      {/* Left Buyer Bar + Catalog Skeleton */}
      <div className="space-y-3 lg:col-span-7 xl:col-span-8">
        <div className="glass-card rounded-[22px] p-3">
          <Bone className="h-[46px] w-full rounded-[14px]" />
        </div>
        <div className="glass-surface flex gap-2 rounded-[22px] p-2.5">
          <Bone className="h-[46px] flex-1 rounded-full" />
          <Bone className="h-[46px] w-[96px] rounded-full sm:w-28" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          <Bone className="h-11 w-24 shrink-0 rounded-full" />
          <Bone className="h-11 w-28 shrink-0 rounded-full" />
          <Bone className="h-11 w-24 shrink-0 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="glass-card space-y-2.5 rounded-[22px] p-3.5">
              <Bone className="h-5 w-3/4" />
              <div className="flex items-center justify-between gap-3">
                <Bone className="h-6 w-24" />
                <Bone className="h-11 w-11 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Right Cart Skeleton */}
      <div className="glass-panel hidden rounded-[24px] p-5 lg:col-span-5 lg:block xl:col-span-4">
        <Bone className="h-6 w-36" />
        <Bone className="mt-3 h-11 w-full rounded-[14px]" />
        <div className="glass-divider mt-4 space-y-2.5 border-y py-4">
          <Bone className="h-16 w-full rounded-[16px]" />
          <Bone className="h-16 w-full rounded-[16px]" />
        </div>
        <div className="mt-4 space-y-2">
          <Bone className="h-5 w-full" />
          <Bone className="h-7 w-full" />
        </div>
        <Bone className="mt-4 h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export function DebtsPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải sổ nợ khách hàng" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="glass-card col-span-2 rounded-[22px] p-4 sm:col-span-1">
          <Bone className="h-4 w-32" />
          <Bone className="mt-2.5 h-8 w-40" />
        </div>
        <div className="glass-card rounded-[22px] p-4">
          <Bone className="h-4 w-24" />
          <Bone className="mt-2.5 h-8 w-16" />
        </div>
        <div className="glass-card rounded-[22px] p-4">
          <Bone className="h-4 w-28" />
          <Bone className="mt-2.5 h-8 w-16" />
        </div>
      </div>

      <div className="glass-surface flex flex-col gap-3 rounded-[22px] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <Bone className="h-11 w-full rounded-[14px] sm:max-w-[360px]" />
        <div className="flex gap-2">
          <Bone className="h-11 w-24 rounded-full" />
          <Bone className="h-11 w-28 rounded-full" />
          <Bone className="h-11 w-20 rounded-full" />
        </div>
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="glass-card flex items-center justify-between gap-3 rounded-[20px] p-4"
          >
            <div className="flex-1 space-y-2">
              <Bone className="h-5 w-44" />
              <Bone className="h-4 w-32" />
            </div>
            <div className="space-y-2 text-right">
              <Bone className="ml-auto h-5 w-24" />
              <Bone className="ml-auto h-9 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrdersPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải lịch sử đơn hàng" className="space-y-4">
      <div className="glass-surface flex flex-col gap-3 rounded-[22px] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <Bone className="h-11 w-full rounded-[14px] sm:max-w-[340px]" />
        <div className="flex flex-wrap gap-2">
          <Bone className="h-11 w-24 rounded-full" />
          <Bone className="h-11 w-28 rounded-full" />
          <Bone className="h-11 w-24 rounded-full" />
        </div>
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="glass-card rounded-[20px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-2">
                <Bone className="h-5 w-40" />
                <Bone className="h-4 w-52" />
              </div>
              <div className="space-y-2 text-right">
                <Bone className="ml-auto h-6 w-28" />
                <Bone className="ml-auto h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải thống kê bán hàng" className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="glass-panel rounded-[26px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <Bone className="h-4 w-28" />
              <Bone className="h-5 w-20 rounded-full" />
            </div>
            <Bone className="mt-3 h-8 w-44" />
            <Bone className="mt-4 h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="glass-card rounded-[22px] p-4">
            <div className="flex items-center justify-between gap-2">
              <Bone className="h-4 w-24" />
              <Bone className="h-6 w-32" />
            </div>
            <Bone className="mt-3 h-2.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-[26px] p-5">
        <Bone className="h-5 w-52" />
        <Bone className="mt-4 h-[250px] w-full rounded-[18px]" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="glass-panel rounded-[26px] p-5">
            <Bone className="h-5 w-40" />
            <div className="mt-4 space-y-2.5">
              <Bone className="h-11 w-full rounded-[14px]" />
              <Bone className="h-11 w-full rounded-[14px]" />
              <Bone className="h-11 w-full rounded-[14px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải cài đặt cửa hàng" className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="glass-panel rounded-[24px] p-5">
          <Bone className="h-5 w-48" />
          <Bone className="mt-1.5 h-4 w-72 max-w-full" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Bone className="h-12 w-full rounded-[14px]" />
            <Bone className="h-12 w-full rounded-[14px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
