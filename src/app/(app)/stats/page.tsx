'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateVN, formatVND, getTodayVN } from '@/lib/vietnamese';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
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
  const [preset, setPreset] = useState<DatePreset>('7d');
  const [customStart, setCustomStart] = useState(todayVN);
  const [customEnd, setCustomEnd] = useState(todayVN);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setError(null);
    const { startIso, endIso } = computeDateRange(preset, customStart, customEnd);
    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc('get_analytics_summary', {
      p_start: startIso,
      p_end: endIso,
    });
    if (rpcErr) {
      setError(rpcErr.message);
    } else {
      setSummary(data as AnalyticsSummary);
    }
    setLoading(false);
  }, [preset, customStart, customEnd]);

  useEffect(() => {
    const id = setTimeout(() => {
      void loadAnalytics();
    }, 0);
    return () => clearTimeout(id);
  }, [loadAnalytics]);

  useRealtimeSync({
    tables: ['orders', 'debt_payments', 'customers'],
    onDataChange: loadAnalytics,
    channelName: 'stats-page',
  });

  const kpis = summary?.kpis;

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
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
          <div className="flex items-center gap-2">
            <label className="text-[13px] font-medium">Từ ngày</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="font-mono-tabular min-h-[40px] rounded-lg border border-[var(--border-default)] px-2.5"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[13px] font-medium">Đến ngày</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="font-mono-tabular min-h-[40px] rounded-lg border border-[var(--border-default)] px-2.5"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-[#FCA5A5] bg-[var(--status-overdue-bg)] px-4 py-3 text-[14px] text-[var(--status-overdue)]">
          Không tải được thống kê: {error}
        </div>
      )}

      {loading || !summary || !kpis ? (
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-[14px] text-[var(--text-secondary)]">
          Đang tổng hợp số liệu...
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">Doanh thu</p>
              <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--text-primary)]">
                {formatVND(kpis.total_revenue)}
              </p>
            </div>
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">Tiền thực thu</p>
              <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--brand-jade)]">
                {formatVND(kpis.cash_collected)}
              </p>
            </div>
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">
                Lợi nhuận ước tính
              </p>
              <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--status-paid)]">
                {kpis.estimated_gross_profit !== null
                  ? formatVND(kpis.estimated_gross_profit)
                  : 'Chưa có giá vốn'}
              </p>
              {kpis.estimated_gross_profit !== null && kpis.profit_tracked_ratio < 1 && (
                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  Tính trên {Math.round(kpis.profit_tracked_ratio * 100)}% doanh thu có giá vốn
                </p>
              )}
            </div>
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">Nợ mới phát sinh</p>
              <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--status-debt)]">
                {formatVND(kpis.new_debt_created)}
              </p>
            </div>
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">Tổng nợ toàn shop</p>
              <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--status-overdue)]">
                {formatVND(kpis.total_outstanding_debt)}
              </p>
            </div>
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5">
              <p className="text-[12px] text-[var(--text-secondary)]">Số đơn hợp lệ</p>
              <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--text-primary)]">
                {kpis.order_count}
              </p>
            </div>
          </div>

          {/* Primary Chart */}
          <RevenueCashChart data={summary.daily_series} />

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PaymentBreakdownChart breakdown={summary.payment_breakdown} />
            <DebtAgingCard aging={summary.debt_aging} />
          </div>

          {/* Top Products & Top Debtors */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <h3 className="mb-3 text-[16px] font-bold">Top sản phẩm bán chạy</h3>
              {summary.top_products.length === 0 ? (
                <p className="text-[14px] text-[var(--text-secondary)]">
                  Chưa có sản phẩm bán ra trong kỳ này.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-default)]">
                  {summary.top_products.map((prod, idx) => (
                    <div
                      key={`${prod.product_name}-${idx}`}
                      className="flex items-center justify-between gap-2 py-2.5 text-[14px]"
                    >
                      <div className="min-w-0">
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

            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <h3 className="mb-3 text-[16px] font-bold">Khách hàng dư nợ cao</h3>
              {summary.top_debtors.length === 0 ? (
                <p className="text-[14px] text-[var(--text-secondary)]">
                  Hiện tại không có khách hàng nào còn nợ.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-default)]">
                  {summary.top_debtors.map((deb) => (
                    <Link
                      key={deb.customer_id}
                      href={`/debts?customer=${deb.customer_id}`}
                      className="flex items-center justify-between gap-2 py-2.5 text-[14px] hover:bg-[var(--bg-subtle)]"
                    >
                      <div className="min-w-0">
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
