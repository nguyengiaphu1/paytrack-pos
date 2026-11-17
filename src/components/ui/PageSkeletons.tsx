'use client';

import { RefreshCw, WifiOff } from 'lucide-react';

function Bone({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} aria-hidden="true" />;
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
      className="animate-fade-in rounded-[10px] border border-[var(--status-overdue-border)] bg-[var(--bg-surface)] p-6 text-center"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-overdue-bg)] text-[var(--status-overdue)]">
        <WifiOff className="h-6 w-6" />
      </div>
      <h2 className="text-[17px] font-bold text-[var(--text-primary)]">{title}</h2>
      <p className="mx-auto mt-1 max-w-[420px] text-[14px] text-[var(--text-secondary)]">
        {message || 'Vui lòng kiểm tra lại kết nối Wi-Fi hoặc 4G rồi bấm Thử lại.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="press-tactile mt-4 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
      >
        <RefreshCw className="h-4 w-4 shrink-0" />
        <span>Thử lại ngay</span>
      </button>
    </div>
  );
}

export function PosWorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải màn hình bán hàng" className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
      {/* Left Catalog Skeleton */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Bone className="h-12 flex-1 min-w-[200px]" />
          <Bone className="h-12 w-32" />
          <Bone className="h-12 w-32" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          <Bone className="h-9 w-20 rounded-full" />
          <Bone className="h-9 w-24 rounded-full" />
          <Bone className="h-9 w-20 rounded-full" />
          <Bone className="h-9 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <Bone className="h-5 w-3/4" />
                  <Bone className="h-4 w-1/2" />
                </div>
                <Bone className="h-10 w-10 rounded-lg" />
              </div>
              <Bone className="mt-3 h-5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Right Cart Skeleton */}
      <div className="hidden rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 lg:block">
        <Bone className="h-6 w-36" />
        <Bone className="mt-3 h-12 w-full" />
        <div className="mt-4 space-y-2.5 border-y border-[var(--border-default)] py-4">
          <Bone className="h-14 w-full" />
          <Bone className="h-14 w-full" />
        </div>
        <div className="mt-4 space-y-2">
          <Bone className="h-5 w-full" />
          <Bone className="h-7 w-full" />
        </div>
        <Bone className="mt-4 h-12 w-full" />
      </div>
    </div>
  );
}

export function DebtsPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải sổ nợ khách hàng" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:col-span-1">
          <Bone className="h-4 w-32" />
          <Bone className="mt-2 h-8 w-40" />
        </div>
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <Bone className="h-4 w-24" />
          <Bone className="mt-2 h-8 w-16" />
        </div>
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <Bone className="h-4 w-28" />
          <Bone className="mt-2 h-8 w-16" />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Bone className="h-11 w-full sm:max-w-[360px]" />
        <div className="flex gap-2">
          <Bone className="h-10 w-24" />
          <Bone className="h-10 w-28" />
          <Bone className="h-10 w-20" />
        </div>
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
          >
            <div className="flex-1 space-y-2">
              <Bone className="h-5 w-44" />
              <Bone className="h-4 w-32" />
            </div>
            <div className="space-y-2 text-right">
              <Bone className="ml-auto h-5 w-24" />
              <Bone className="ml-auto h-8 w-20" />
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Bone className="h-11 w-full sm:max-w-[340px]" />
        <div className="flex flex-wrap gap-1.5">
          <Bone className="h-10 w-20" />
          <Bone className="h-10 w-24" />
          <Bone className="h-10 w-24" />
          <Bone className="h-10 w-20" />
        </div>
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
          >
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
          >
            <Bone className="h-4 w-24" />
            <Bone className="mt-2 h-7 w-32" />
            <Bone className="mt-2 h-3.5 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <Bone className="h-5 w-52" />
          <Bone className="mt-1.5 h-4 w-64" />
          <Bone className="mt-4 h-[240px] w-full" />
        </div>
        <div className="space-y-4">
          <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <Bone className="h-5 w-40" />
            <Bone className="mt-3 h-4 w-full rounded-full" />
            <div className="mt-4 space-y-2.5">
              <Bone className="h-5 w-full" />
              <Bone className="h-5 w-full" />
              <Bone className="h-5 w-full" />
            </div>
          </div>
          <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <Bone className="h-5 w-44" />
            <div className="mt-4 space-y-3">
              <Bone className="h-8 w-full" />
              <Bone className="h-8 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải cài đặt cửa hàng" className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
        >
          <Bone className="h-5 w-48" />
          <Bone className="mt-1.5 h-4 w-72 max-w-full" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Bone className="h-12 w-full" />
            <Bone className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
