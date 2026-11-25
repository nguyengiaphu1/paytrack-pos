'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { formatDateVN, formatVND, getTodayVN } from '@/lib/vietnamese';
import { PAYMENT_ACCOUNTS } from '@/lib/ledger';
import { usePosData } from '@/components/providers/PosDataProvider';
import type { AnalyticsSummary, PaymentAccount } from '@/types/database';
import { PaymentBreakdownChart } from '@/components/stats/PaymentBreakdownChart';
import { DebtAgingCard } from '@/components/stats/DebtAgingCard';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { FetchErrorCard, StatsPageSkeleton } from '@/components/ui/PageSkeletons';

const RevenueCashChart = dynamic(
  () => import('@/components/stats/RevenueCashChart').then((m) => m.RevenueCashChart),
  {
    ssr: false,
    loading: () => (
      <section className="glass-panel rounded-[26px] p-4 sm:p-5">
        <div className="skeleton-shimmer mb-3.5 h-5 w-52 rounded-full" />
        <div className="glass-well rounded-[20px] p-3">
          <div className="skeleton-shimmer h-[260px] w-full rounded-[14px]" />
        </div>
      </section>
    ),
  }
);

type DatePreset = 'today' | '7d' | '30d' | 'month' | 'custom';

function computeDateRange(
  preset: DatePreset,
  customStart: string,
  customEnd: string
): { startIso: string; endIso: string } {
  const todayStr = getTodayVN();
  const todayDate = new Date(`${todayStr}T00:00:00+07:00`);

  let startStr = todayStr;
  let endStr = todayStr;

  if (preset === '7d') {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 6);
    startStr = d.toISOString().slice(0, 10);
  } else if (preset === '30d') {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 29);
    startStr = d.toISOString().slice(0, 10);
  } else if (preset === 'month') {
    startStr = `${todayStr.slice(0, 7)}-01`;
  } else if (preset === 'custom') {
    startStr = customStart || todayStr;
    endStr = customEnd || todayStr;
    if (startStr > endStr) {
      const tmp = startStr;
      startStr = endStr;
      endStr = tmp;
    }
  }

  return {
    startIso: `${startStr}T00:00:00+07:00`,
    endIso: `${endStr}T23:59:59.999+07:00`,
  };
}

export default function StatsPage() {
  const todayVN = getTodayVN();
  const { analyticsVersion, fetchAnalytics, getCachedAnalytics } = usePosData();

  const [preset, setPreset] = useState<DatePreset>('7d');
  const [customStart, setCustomStart] = useState(todayVN);
  const [customEnd, setCustomEnd] = useState(todayVN);
  const [accountFilter, setAccountFilter] = useState<'ALL' | PaymentAccount>('ALL');

  const { startIso, endIso } = computeDateRange(preset, customStart, customEnd);
  const paymentAccountParam = accountFilter === 'ALL' ? null : accountFilter;
  const rangeKey = `${startIso}|${endIso}|${paymentAccountParam ?? ''}`;
  const cached = getCachedAnalytics(startIso, endIso, paymentAccountParam);

  const [fetched, setFetched] = useState<{ key: string; data: AnalyticsSummary } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchAnalytics(startIso, endIso, { paymentAccount: paymentAccountParam }).then(
      ({ data, error: rpcErr }) => {
        if (!active) return;
        if (rpcErr) {
          setError(rpcErr);
        } else if (data) {
          setError(null);
          setFetched({ key: rangeKey, data });
        }
      }
    );

    return () => {
      active = false;
    };
  }, [startIso, endIso, paymentAccountParam, rangeKey, analyticsVersion, fetchAnalytics]);

  function handleRetry() {
    setError(null);
    void fetchAnalytics(startIso, endIso, {
      force: true,
      paymentAccount: paymentAccountParam,
    }).then(({ data, error: rpcErr }) => {
      if (rpcErr) {
        setError(rpcErr);
      } else if (data) {
        setError(null);
        setFetched({ key: rangeKey, data });
      }
    });
  }

  const activeSummary = cached ?? (fetched?.key === rangeKey ? fetched.data : null);
  const kpis = activeSummary?.kpis;
  const loading = !activeSummary && !error;

  const totalCost = kpis?.total_cost ?? 0;
  const totalProfit =
    kpis?.total_profit !== undefined
      ? kpis.total_profit
      : kpis?.estimated_gross_profit ?? 0;

  return (
    <div className="mx-auto max-w-[1220px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-[22px] font-bold tracking-[-0.015em] text-[var(--text-primary)] lg:text-[24px]">
            Thống kê
          </h1>
          {accountFilter !== 'ALL' && (
            <span className="glass-badge-paid rounded-full px-3 py-1 text-[12px] font-semibold">
              TK: {accountFilter}
            </span>
          )}
        </div>

        {/* Floating Liquid Glass Date Presets + Payment Account Filter Bar */}
        <div className="glass-surface rounded-[24px] p-3 sm:p-3.5">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['today', 'Hôm nay'],
                  ['7d', '7 ngày'],
                  ['30d', '30 ngày'],
                  ['month', 'Tháng này'],
                  ['custom', 'Tùy chọn'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={preset === key}
                  onClick={() => setPreset(key)}
                  className={`press-tactile min-h-[44px] rounded-full px-3.5 text-[13px] transition-[transform,background-color,color] ${
                    preset === key ? 'glass-pill-jade font-bold' : 'glass-chip font-semibold'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex min-w-0 items-center gap-2 lg:shrink-0">
              <label
                htmlFor="stats-account-filter"
                className="shrink-0 text-[13px] font-medium text-[var(--text-secondary)]"
              >
                Tài khoản
              </label>
              <select
                id="stats-account-filter"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value as 'ALL' | PaymentAccount)}
                className="glass-input min-h-[44px] min-w-0 flex-1 rounded-full px-4 text-[16px] font-medium text-[var(--text-primary)] outline-none lg:w-[210px] lg:flex-initial"
              >
                <option value="ALL">Tất cả TK</option>
                {PAYMENT_ACCOUNTS.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {preset === 'custom' && (
            <div className="glass-well mt-3 grid grid-cols-1 gap-2.5 rounded-[16px] p-3 sm:flex sm:flex-wrap sm:items-center">
              <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
                <label
                  htmlFor="stats-custom-start"
                  className="shrink-0 text-[13px] font-medium text-[var(--text-secondary)]"
                >
                  Từ
                </label>
                <input
                  id="stats-custom-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="glass-input font-mono-tabular min-h-[44px] min-w-0 flex-1 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none sm:flex-initial"
                />
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
                <label
                  htmlFor="stats-custom-end"
                  className="shrink-0 text-[13px] font-medium text-[var(--text-secondary)]"
                >
                  Đến
                </label>
                <input
                  id="stats-custom-end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="glass-input font-mono-tabular min-h-[44px] min-w-0 flex-1 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none sm:flex-initial"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && !activeSummary ? (
        <FetchErrorCard
          title="Chưa tải được thống kê"
          message={error}
          onRetry={handleRetry}
        />
      ) : loading || !activeSummary || !kpis ? (
        <StatsPageSkeleton />
      ) : (
        <div className="animate-fade-in space-y-5">
          {error && (
            <div
              role="alert"
              className="glass-badge-overdue rounded-[16px] px-4 py-3 text-[14px] font-medium"
            >
              {error}
            </div>
          )}

          {/* Sculpted 3D Liquid Glass KPI Grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
            <div className="glass-card col-span-2 min-w-0 rounded-[22px] p-4 lg:col-span-2 xl:col-span-1 xl:p-3.5">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand-jade)]"
                />
                <p className="truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                  Giá bán
                </p>
              </div>
              <p className="font-mono-tabular mt-1.5 break-words text-[16px] font-bold text-[var(--text-primary)] sm:text-[18px]">
                {formatVND(kpis.total_revenue)}
              </p>
            </div>

            <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4 xl:p-3.5">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--text-secondary)]"
                />
                <p className="truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                  Giá vốn
                </p>
              </div>
              <p className="font-mono-tabular mt-1.5 break-words text-[16px] font-bold text-[var(--text-secondary)] sm:text-[18px]">
                {formatVND(totalCost)}
              </p>
            </div>

            <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4 xl:p-3.5">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    totalProfit >= 0 ? 'bg-[var(--brand-jade)]' : 'bg-[var(--status-overdue)]'
                  }`}
                />
                <p className="truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                  Lãi
                </p>
              </div>
              <p
                className={`font-mono-tabular mt-1.5 break-words text-[16px] font-bold sm:text-[18px] ${
                  totalProfit >= 0 ? 'text-[var(--brand-jade-text)]' : 'text-[var(--status-overdue)]'
                }`}
              >
                {formatVND(totalProfit)}
              </p>
            </div>

            <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4 xl:p-3.5">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-paid)]"
                />
                <p className="truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                  Thực thu
                </p>
              </div>
              <p className="font-mono-tabular mt-1.5 break-words text-[16px] font-bold text-[var(--brand-jade-text)] sm:text-[18px]">
                {formatVND(kpis.cash_collected)}
              </p>
            </div>

            <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4 xl:p-3.5">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-debt)]"
                />
                <p className="truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                  Nợ mới
                </p>
              </div>
              <p className="font-mono-tabular mt-1.5 break-words text-[16px] font-bold text-[var(--status-debt)] sm:text-[18px]">
                {formatVND(kpis.new_debt_created)}
              </p>
            </div>

            <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4 xl:p-3.5">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-overdue)]"
                />
                <p className="truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                  Tổng nợ
                </p>
              </div>
              <p className="font-mono-tabular mt-1.5 break-words text-[16px] font-bold text-[var(--status-overdue)] sm:text-[18px]">
                {formatVND(kpis.total_outstanding_debt)}
              </p>
            </div>

            <div className="glass-card min-w-0 rounded-[22px] p-3.5 sm:p-4 xl:p-3.5">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--text-primary)]"
                />
                <p className="truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                  Số đơn
                </p>
              </div>
              <p className="font-mono-tabular mt-1.5 break-words text-[16px] font-bold text-[var(--text-primary)] sm:text-[18px]">
                {kpis.order_count}
              </p>
            </div>
          </div>

          {kpis.order_count === 0 && (
            <EmptyStateCard
              icon={BarChart3}
              title="Chưa có đơn trong kỳ này"
              action={
                <Link
                  href="/"
                  className="glass-btn-primary press-tactile inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-[15px] font-semibold"
                >
                  Bán hàng
                </Link>
              }
            />
          )}

          {/* Primary Chart */}
          <RevenueCashChart data={activeSummary.daily_series} />

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PaymentBreakdownChart breakdown={activeSummary.payment_breakdown} />
            <DebtAgingCard aging={activeSummary.debt_aging} />
          </div>

          {/* Top Products & Top Debtors */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="glass-panel min-w-0 rounded-[26px] p-4 sm:p-5">
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
                  Món bán chạy
                </h2>
                {activeSummary.top_products.length > 0 && (
                  <span className="glass-badge-neutral font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                    Top {activeSummary.top_products.length}
                  </span>
                )}
              </div>
              {activeSummary.top_products.length === 0 ? (
                <div className="glass-well rounded-[18px] px-4 py-6 text-center text-[14px] text-[var(--text-secondary)]">
                  Chưa có dữ liệu.
                </div>
              ) : (
                <div className="glass-well divide-y divide-[var(--glass-border-subtle)] rounded-[20px] px-3.5 py-1">
                  {activeSummary.top_products.map((prod, idx) => (
                    <div
                      key={`${prod.product_name}-${idx}`}
                      className="flex items-center justify-between gap-2.5 py-2.5 text-[14px]"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span
                          className={`font-mono-tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                            idx === 0
                              ? 'glass-pill-jade'
                              : 'glass-badge-neutral'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[var(--text-primary)]">
                            {prod.product_name}
                          </p>
                          <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                            SL: {Number(prod.qty)}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono-tabular shrink-0 font-bold text-[var(--brand-jade-text)]">
                        {formatVND(prod.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="glass-panel min-w-0 rounded-[26px] p-4 sm:p-5">
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
                  Nợ nhiều nhất
                </h2>
                {activeSummary.top_debtors.length > 0 && (
                  <span className="glass-badge-debt font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                    {activeSummary.top_debtors.length} khách
                  </span>
                )}
              </div>
              {activeSummary.top_debtors.length === 0 ? (
                <div className="glass-well rounded-[18px] px-4 py-6 text-center text-[14px] text-[var(--text-secondary)]">
                  Không có khách nợ.
                </div>
              ) : (
                <div className="glass-well space-y-2 rounded-[20px] p-2">
                  {activeSummary.top_debtors.map((deb) => (
                    <Link
                      key={deb.customer_id}
                      href={`/debts?customer=${deb.customer_id}`}
                      className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-between gap-2.5 rounded-[14px] px-3.5 py-2 text-[14px]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--text-primary)]">
                          {deb.name}
                        </p>
                        <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                          Hẹn: {formatDateVN(deb.next_due_date)}
                        </p>
                      </div>
                      <span className="font-mono-tabular shrink-0 font-bold text-[var(--status-debt)]">
                        {formatVND(deb.total_debt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
