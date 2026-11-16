'use client';

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

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

export function RevenueCashChart({ data }: RevenueCashChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatShortDate(d.date),
  }));

  return (
    <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <div className="mb-3">
        <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
          Doanh thu vs Tiền thực thu theo ngày
        </h3>
        <p className="text-[13px] text-[var(--text-secondary)]">
          So sánh tổng giá trị bán ra và tiền thực tế đã thu vào
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-[14px] text-[var(--text-secondary)]">
          Chưa có dữ liệu trong khoảng thời gian này.
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE2E7" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#4B5563' }}
                axisLine={{ stroke: '#DDE2E7' }}
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
                tick={{ fontSize: 12, fill: '#4B5563' }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatVND(Number(value ?? 0)),
                  name === 'revenue' ? 'Doanh thu' : 'Thực thu',
                ]}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DDE2E7',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '13px',
                }}
              />
              <Legend
                formatter={(value) => (value === 'revenue' ? 'Doanh thu' : 'Thực thu')}
                wrapperStyle={{ fontSize: '13px' }}
              />
              <Bar dataKey="revenue" fill="#0E6B4E" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="collected" fill="#D97706" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
