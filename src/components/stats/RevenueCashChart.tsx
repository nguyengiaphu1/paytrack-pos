'use client';

import { useSyncExternalStore } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatVND } from '@/lib/vietnamese';

interface DailyPoint {
  date: string;
  revenue: number;
  collected: number;
}

interface RevenueCashChartProps {
  data: DailyPoint[];
}

function subscribeReducedMotion(listener: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }
  mq.addListener(listener);
  return () => mq.removeListener(listener);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

export function RevenueCashChart({ data }: RevenueCashChartProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  const chartData = data.map((d) => ({
    ...d,
    label: formatShortDate(d.date),
  }));

  return (
    <section className="glass-panel rounded-[26px] p-4 sm:p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
          Doanh thu &amp; Thực thu theo ngày
        </h2>
        <span className="glass-badge-neutral rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
          Đơn vị: VNĐ
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="glass-well flex h-[240px] items-center justify-center rounded-[20px] text-[14px] text-[var(--text-secondary)]">
          Chưa có dữ liệu.
        </div>
      ) : (
        <div className="glass-well rounded-[20px] p-2.5 sm:p-3.5">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--glass-border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 12,
                    fill: 'var(--text-secondary)',
                    fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  }}
                  axisLine={{ stroke: 'var(--glass-border-subtle)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val: number) =>
                    val >= 1_000_000
                      ? `${(val / 1_000_000).toFixed(1)}tr`
                      : val >= 1_000
                        ? `${Math.round(val / 1_000)}k`
                        : String(val)
                  }
                  tick={{
                    fontSize: 12,
                    fill: 'var(--text-secondary)',
                    fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: 'var(--bg-subtle)', radius: 8 }}
                  formatter={(value, name) => [
                    formatVND(Number(value ?? 0)),
                    name === 'revenue' ? 'Doanh thu' : 'Thực thu',
                  ]}
                  labelStyle={{
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-panel-shadow)',
                    color: 'var(--text-primary)',
                    borderRadius: '16px',
                    padding: '10px 14px',
                    fontFamily: 'var(--font-sans), system-ui, sans-serif',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '13px',
                  }}
                />
                <Legend
                  formatter={(value) => (value === 'revenue' ? 'Doanh thu' : 'Thực thu')}
                  wrapperStyle={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    paddingTop: '6px',
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--brand-jade)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={!reducedMotion}
                />
                <Bar
                  dataKey="collected"
                  fill="var(--status-debt)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={!reducedMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
