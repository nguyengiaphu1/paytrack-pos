'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { formatDateVN, formatVND, getTodayVN } from '@/lib/vietnamese';
import { usePosData } from '@/components/providers/PosDataProvider';
import type { AnalyticsSummary } from '@/types/database';
import { RevenueCashChart } from '@/components/stats/RevenueCashChart';
import { PaymentBreakdownChart } from '@/components/stats/PaymentBreakdownChart';
import { DebtAgingCard } from '@/components/stats/DebtAgingCard';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { FetchErrorCard, StatsPageSkeleton } from '@/components/ui/PageSkeletons';

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

  const { startIso, endIso } = computeDateRange(preset, customStart, customEnd);
  const rangeKey = `${startIso}|${endIso}`;
  const cached = getCachedAnalytics(startIso, endIso);

  const [fetched, setFetched] = useState<{ key: string; data: AnalyticsSummary } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchAnalytics(startIso, endIso).then(({ data, error: rpcErr }) => {
      if (!active) return;
      if (rpcErr) {
        setError(rpcErr);
      } else if (data) {
        setError(null);
        setFetched({ key: rangeKey, data });
      }
    });

    return () => {
      active = false;
    };
  }, [startIso, endIso, rangeKey, analyticsVersion, fetchAnalytics]);

  function handleRetry() {
    setError(null);
    void fetchAnalytics(startIso, endIso, { force: true }).then(({ data, error: rpcErr }) => {
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

  return (
    <div className="mx-auto max-w-[1220px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-[-0.015em] lg:text-[24px]">
            Thống kê bán hàng
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Xem tổng tiền bán ra, tiền đã cầm tay, lợi nhuận và tình hình công nợ theo khoảng thời gian
          </p>
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap gap-1.5">
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
              onClick={() => setPreset(key)}
              className={`press-tactile min-h-[44px] rounded-lg border px-3 text-[13px] font-semibold transition-colors ${
                preset === key
                  ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="mb-4 grid grid-cols-1 gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 sm:flex sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
            <label className="shrink-0 text-[13px] font-medium">Từ ngày</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="font-mono-tabular min-h-[44px] min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 text-[var(--text-primary)] sm:flex-initial"
            />
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
            <label className="shrink-0 text-[13px] font-medium">Đến ngày</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="font-mono-tabular min-h-[44px] min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 text-[var(--text-primary)] sm:flex-initial"
            />
          </div>
        </div>
      )}

      {error && !activeSummary ? (
        <FetchErrorCard
          title="Chưa tải được thống kê bán hàng"
          message={error}
          onRetry={handleRetry}
        />
      ) : loading || !activeSummary || !kpis ? (
        <StatsPageSkeleton />
      ) : (
        <div className="animate-fade-in space-y-5">
          {error && (
            <div className="rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-4 py-3 text-[14px] text-[var(--status-overdue)]">
              Chưa cập nhật được số liệu mới nhất: {error}
            </div>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">Doanh thu</p>
              <p className="font-mono-tabular mt-1 break-words text-[17px] font-bold text-[var(--text-primary)] sm:text-[20px]">
                {formatVND(kpis.total_revenue)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Tổng tiền hàng đã bán
              </p>
            </div>
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">Tiền thực thu</p>
              <p className="font-mono-tabular mt-1 break-words text-[17px] font-bold text-[var(--brand-jade-text)] sm:text-[20px]">
                {formatVND(kpis.cash_collected)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Tiền đã cầm vào tay
              </p>
            </div>
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                Lợi nhuận ước tính
              </p>
              {kpis.estimated_gross_profit !== null ? (
                <p className="font-mono-tabular mt-1 break-words text-[17px] font-bold text-[var(--status-paid)] sm:text-[20px]">
                  {formatVND(kpis.estimated_gross_profit)}
                </p>
              ) : (
                <p className="mt-1 break-words text-[14px] font-semibold text-[var(--text-secondary)] sm:text-[15px]">
                  Chưa có giá vốn
                </p>
              )}
              {kpis.estimated_gross_profit !== null && kpis.profit_tracked_ratio < 1 ? (
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                  Tính trên {Math.round(kpis.profit_tracked_ratio * 100)}% doanh thu có giá vốn
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                  Tiền lời tạm tính theo giá vốn
                </p>
              )}
            </div>
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">Nợ mới phát sinh</p>
              <p className="font-mono-tabular mt-1 break-words text-[17px] font-bold text-[var(--status-debt)] sm:text-[20px]">
                {formatVND(kpis.new_debt_created)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Khách mua chịu trong kỳ
              </p>
            </div>
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">Tổng nợ toàn shop</p>
              <p className="font-mono-tabular mt-1 break-words text-[17px] font-bold text-[var(--status-overdue)] sm:text-[20px]">
                {formatVND(kpis.total_outstanding_debt)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Tổng tiền khách còn thiếu
              </p>
            </div>
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">Số đơn hợp lệ</p>
              <p className="font-mono-tabular mt-1 text-[17px] font-bold text-[var(--text-primary)] sm:text-[20px]">
                {kpis.order_count}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Không tính đơn đã hủy
              </p>
            </div>
          </div>

          {kpis.order_count === 0 && (
            <EmptyStateCard
              icon={BarChart3}
              title="Chưa có đơn hàng nào trong khoảng thời gian này"
              description="Khi có đơn bán hàng mới, biểu đồ doanh thu và danh sách món bán chạy sẽ tự động hiển thị tại đây."
              action={
                <Link
                  href="/"
                  className="press-tactile inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
                >
                  Về màn hình Bán hàng
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
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <h3 className="mb-3 text-[16px] font-bold">Top sản phẩm bán chạy</h3>
              {activeSummary.top_products.length === 0 ? (
                <p className="text-[14px] text-[var(--text-secondary)]">
                  Chưa có sản phẩm bán ra trong kỳ này.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-default)]">
                  {activeSummary.top_products.map((prod, idx) => (
                    <div
                      key={`${prod.product_name}-${idx}`}
                      className="flex items-center justify-between gap-2 py-2.5 text-[14px]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{prod.product_name}</p>
                        <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                          SL: {Number(prod.qty)}
                        </p>
                      </div>
                      <span className="font-mono-tabular shrink-0 font-bold text-[var(--brand-jade-text)]">
                        {formatVND(prod.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <h3 className="mb-3 text-[16px] font-bold">Khách hàng dư nợ cao</h3>
              {activeSummary.top_debtors.length === 0 ? (
                <p className="text-[14px] text-[var(--text-secondary)]">
                  Hiện tại không có khách hàng nào còn nợ.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-default)]">
                  {activeSummary.top_debtors.map((deb) => (
                    <Link
                      key={deb.customer_id}
                      href={`/debts?customer=${deb.customer_id}`}
                      className="press-tactile flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-[14px] transition-colors hover:bg-[var(--bg-subtle)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--text-primary)]">
                          {deb.name}
                        </p>
                        <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                          Hẹn thu: {formatDateVN(deb.next_due_date)}
                        </p>
                      </div>
                      <span className="font-mono-tabular shrink-0 font-bold text-[var(--status-debt)]">
                        {formatVND(deb.total_debt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
