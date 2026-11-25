'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { formatDateVN, formatVND, getTodayVN } from '@/lib/vietnamese';
import {
  PAYMENT_ACCOUNTS,
  computeVnDatePresetIsoRange,
  type LedgerDatePreset,
} from '@/lib/ledger';
import { usePosData } from '@/components/providers/PosDataProvider';
import type { AnalyticsSummary, PaymentAccount } from '@/types/database';
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

type DatePreset = Exclude<LedgerDatePreset, 'all'>;

export default function StatsPage() {
  const todayVN = getTodayVN();
  const { analyticsVersion, fetchAnalytics, getCachedAnalytics } = usePosData();

  const [preset, setPreset] = useState<DatePreset>('7d');
  const [customStart, setCustomStart] = useState(todayVN);
  const [customEnd, setCustomEnd] = useState(todayVN);
  const [accountFilter, setAccountFilter] = useState<'ALL' | PaymentAccount>('ALL');

  const { startIso, endIso } = computeVnDatePresetIsoRange(preset, customStart, customEnd);
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
  const totalRevenue = kpis?.total_revenue ?? 0;
  const totalProfit =
    kpis?.total_profit !== undefined
      ? kpis.total_profit
      : kpis?.estimated_gross_profit ?? 0;
  const profitMarginPct =
    totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : null;
  const avgOrderValue =
    kpis && kpis.order_count > 0 ? Math.round(totalRevenue / kpis.order_count) : null;

  const cashAmt = activeSummary?.payment_breakdown.cash ?? 0;
  const transferAmt = activeSummary?.payment_breakdown.transfer ?? 0;
  const collectedMixTotal = cashAmt + transferAmt;
  const cashPct =
    collectedMixTotal > 0 ? Math.round((cashAmt / collectedMixTotal) * 100) : 0;
  const transferPct = collectedMixTotal > 0 ? 100 - cashPct : 0;

  return (
    <div className="mx-auto max-w-[1220px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-[22px] font-bold tracking-[-0.015em] text-[var(--text-primary)] lg:text-[24px]">
            Thống kê
          </h1>
          {accountFilter !== 'ALL' && (
            <span className="glass-badge-neutral rounded-full px-3 py-1 text-[12px] font-semibold">
              TK: {accountFilter}
            </span>
          )}
        </div>

        {/* Neutral Frosted Glass Date Presets + Payment Account Filter Bar */}
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
                    preset === key ? 'glass-chip-active font-bold' : 'glass-chip font-semibold'
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

          {/* Tier 1: Hero Business Summary (2 Prominent Focal Metrics) */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {/* Hero 1: Lãi (Profit + Inline Giá vốn & Margin) */}
            <section className="glass-panel min-w-0 rounded-[26px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
                  Lãi ước tính
                </p>
                {profitMarginPct !== null && (
                  <span
                    className={`font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      totalProfit >= 0 ? 'glass-badge-paid' : 'glass-badge-overdue'
                    }`}
                  >
                    Biên lãi {profitMarginPct}%
                  </span>
                )}
              </div>
              <p
                className={`font-mono-tabular mt-2 break-words text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[30px] ${
                  totalProfit >= 0
                    ? 'text-[var(--brand-jade-text)]'
                    : 'text-[var(--status-overdue)]'
                }`}
              >
                {formatVND(totalProfit)}
              </p>
              <div className="glass-divider mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[13px] text-[var(--text-secondary)]">
                <span>Giá vốn trong kỳ</span>
                <strong className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                  {formatVND(totalCost)}
                </strong>
              </div>
            </section>

            {/* Hero 2: Giá bán (Revenue + Inline Số đơn & Avg Order) */}
            <section className="glass-panel min-w-0 rounded-[26px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
                  Giá bán (Doanh thu)
                </p>
                <span className="glass-badge-neutral font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                  {kpis.order_count} đơn
                </span>
              </div>
              <p className="font-mono-tabular mt-2 break-words text-[26px] leading-tight font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-[30px]">
                {formatVND(totalRevenue)}
              </p>
              <div className="glass-divider mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[13px] text-[var(--text-secondary)]">
                <span>Trung bình mỗi đơn</span>
                <strong className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                  {avgOrderValue !== null ? formatVND(avgOrderValue) : '—'}
                </strong>
              </div>
            </section>
          </div>

          {/* Tier 2: Subordinate Cash & Debt Health Strip (2 Compact Cards) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Compact 1: Thực thu + Embedded Cash-vs-Transfer Progress Bar */}
            <div className="glass-card min-w-0 rounded-[22px] p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
                  Thực thu
                </p>
                <p className="font-mono-tabular text-[18px] font-bold text-[var(--text-primary)] sm:text-[20px]">
                  {formatVND(kpis.cash_collected)}
                </p>
              </div>

              {collectedMixTotal > 0 ? (
                <div className="mt-3 space-y-1.5">
                  <div
                    role="img"
                    aria-label={`Tiền mặt ${cashPct}%, Chuyển khoản ${transferPct}%`}
                    className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]"
                  >
                    {cashAmt > 0 && (
                      <div
                        style={{ width: `${cashPct}%` }}
                        className="h-full rounded-full bg-[var(--brand-jade)]"
                      />
                    )}
                    {transferAmt > 0 && (
                      <div
                        style={{ width: `${transferPct}%` }}
                        className="h-full rounded-full bg-[var(--chart-transfer)]"
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 rounded-full bg-[var(--brand-jade)]"
                      />
                      <span>
                        Tiền mặt <strong className="font-mono-tabular text-[var(--text-primary)]">{cashPct}%</strong>
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 rounded-full bg-[var(--chart-transfer)]"
                      />
                      <span>
                        Chuyển khoản{' '}
                        <strong className="font-mono-tabular text-[var(--text-primary)]">
                          {transferPct}%
                        </strong>
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                  Chưa có khoản thu trong kỳ này.
                </p>
              )}
            </div>

            {/* Compact 2: Tổng nợ hiện tại + Inline Nợ mới kỳ này */}
            <div className="glass-card min-w-0 rounded-[22px] p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
                  Tổng nợ hiện tại
                </p>
                <p
                  className={`font-mono-tabular text-[18px] font-bold sm:text-[20px] ${
                    kpis.total_outstanding_debt > 0
                      ? 'text-[var(--status-debt)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {formatVND(kpis.total_outstanding_debt)}
                </p>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]">
                <span>
                  Nợ mới trong kỳ:{' '}
                  <strong className="font-mono-tabular text-[var(--text-primary)]">
                    {formatVND(kpis.new_debt_created)}
                  </strong>
                </span>
                {kpis.total_outstanding_debt > 0 && (
                  <Link
                    href="/debts"
                    className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-[var(--brand-jade-text)] hover:underline"
                  >
                    <span>Thu nợ</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
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

          {/* Tier 3: Dominant Revenue & Cash Trend Chart */}
          <RevenueCashChart data={activeSummary.daily_series} />

          {/* Tier 4: Actionable Lists Only (Nợ nhiều nhất & Món bán chạy) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                            idx === 0 ? 'glass-chip-active' : 'glass-badge-neutral'
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
                      <span className="font-mono-tabular shrink-0 font-bold text-[var(--text-primary)]">
                        {formatVND(prod.revenue)}
                      </span>
                    </div>
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
