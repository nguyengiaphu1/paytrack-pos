'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateVN, formatVND, getTodayVN } from '@/lib/vietnamese';
import { usePosData } from '@/components/providers/PosDataProvider';
import type { AnalyticsSummary } from '@/types/database';
import { RevenueCashChart } from '@/components/stats/RevenueCashChart';
import { PaymentBreakdownChart } from '@/components/stats/PaymentBreakdownChart';
import { DebtAgingCard } from '@/components/stats/DebtAgingCard';

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

  const activeSummary = cached ?? (fetched?.key === rangeKey ? fetched.data : null);
  const kpis = activeSummary?.kpis;
  const loading = !activeSummary;

  return (
    <div className="mx-auto max-w-[1220px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-[-0.015em] lg:text-[24px]">
            Thống kê bán hàng
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Doanh thu, tiền thực thu, lợi nhuận ước tính và tình hình công nợ
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
              className={`min-h-[38px] rounded-lg border px-3 text-[13px] font-semibold ${
                preset === key
                  ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
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
              className="font-mono-tabular min-h-[40px] min-w-0 flex-1 rounded-lg border border-[var(--border-default)] px-2.5 sm:flex-initial"
            />
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
            <label className="shrink-0 text-[13px] font-medium">Đến ngày</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="font-mono-tabular min-h-[40px] min-w-0 flex-1 rounded-lg border border-[var(--border-default)] px-2.5 sm:flex-initial"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-[#FCA5A5] bg-[var(--status-overdue-bg)] px-4 py-3 text-[14px] text-[var(--status-overdue)]">
          Không tải được thống kê: {error}
        </div>
      )}

      {loading || !activeSummary || !kpis ? (
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-[14px] text-[var(--text-secondary)]">
          Đang tổng hợp số liệu...
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">Doanh thu</p>
              <p className="font-mono-tabular mt-1 break-words text-[17px] font-bold text-[var(--text-primary)] sm:text-[20px]">
                {formatVND(kpis.total_revenue)}
              </p>
            </div>
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">Tiền thực thu</p>
              <p className="font-mono-tabular mt-1 break-words text-[17px] font-bold text-[var(--brand-jade)] sm:text-[20px]">
                {formatVND(kpis.cash_collected)}
              </p>
            </div>
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">
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
              {kpis.estimated_gross_profit !== null && kpis.profit_tracked_ratio < 1 && (
                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  Tính trên {Math.round(kpis.profit_tracked_ratio * 100)}% doanh thu có giá vốn
                </p>
              )}
            </div>
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">Nợ mới phát sinh</p>
              <p className="font-mono-tabular mt-1 break-words text-[17px] font-bold text-[var(--status-debt)] sm:text-[20px]">
                {formatVND(kpis.new_debt_created)}
              </p>
            </div>
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">Tổng nợ toàn shop</p>
              <p className="font-mono-tabular mt-1 break-words text-[17px] font-bold text-[var(--status-overdue)] sm:text-[20px]">
                {formatVND(kpis.total_outstanding_debt)}
              </p>
            </div>
            <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">Số đơn hợp lệ</p>
              <p className="font-mono-tabular mt-1 text-[17px] font-bold text-[var(--text-primary)] sm:text-[20px]">
                {kpis.order_count}
              </p>
            </div>
          </div>

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
                      <span className="font-mono-tabular shrink-0 font-bold text-[var(--brand-jade)]">
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
                      className="flex items-center justify-between gap-2 py-2.5 text-[14px] hover:bg-[var(--bg-subtle)]"
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
