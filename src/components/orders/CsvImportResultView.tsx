'use client';

import { CheckCircle2 } from 'lucide-react';
import { formatVND } from '@/lib/vietnamese';

export interface CsvImportSummary {
  createdCustomers: number;
  matchedCustomers: number;
  createdProducts: number;
  matchedProducts: number;
  createdOrders: number;
  skippedDuplicateOrders: number;
  skippedInvalidRows: number;
  ignoredSummaryRows: number;
  totals: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalPaid: number;
    totalDebt: number;
  };
}

interface CsvImportResultViewProps {
  result: CsvImportSummary;
}

export function CsvImportResultView({ result }: CsvImportResultViewProps) {
  return (
    <div className="space-y-4">
      <div className="glass-well rounded-[20px] p-5 text-center">
        <div className="glass-icon-orb mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] text-[var(--brand-jade-text)]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
          Đã nhập xong vào cửa hàng
        </h3>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Toàn bộ khách hàng, món hàng, đơn bán và công nợ đã được đồng bộ.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="glass-card rounded-[18px] p-3 text-center">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">Đơn đã tạo</p>
          <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--text-primary)]">
            {result.createdOrders}
          </p>
        </div>
        <div className="glass-card rounded-[18px] p-3 text-center">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">Khách mới</p>
          <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--brand-jade-text)]">
            +{result.createdCustomers}
          </p>
        </div>
        <div className="glass-card rounded-[18px] p-3 text-center">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">Món mới</p>
          <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--brand-jade-text)]">
            +{result.createdProducts}
          </p>
        </div>
      </div>

      <div className="glass-well space-y-2 rounded-[18px] p-3.5 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--text-secondary)]">Doanh thu đã nhập</span>
          <strong className="font-mono-tabular text-[var(--text-primary)]">
            {formatVND(result.totals.totalRevenue)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--text-secondary)]">Giá vốn</span>
          <strong className="font-mono-tabular text-[var(--text-secondary)]">
            {formatVND(result.totals.totalCost)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--text-secondary)]">Lãi tạm tính</span>
          <strong className="font-mono-tabular text-[var(--brand-jade-text)]">
            {formatVND(result.totals.totalProfit)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--text-secondary)]">Còn nợ đã cộng vào sổ</span>
          <strong className="font-mono-tabular text-[var(--status-debt)]">
            {formatVND(result.totals.totalDebt)}
          </strong>
        </div>
        {result.skippedDuplicateOrders > 0 && (
          <p className="glass-divider border-t pt-2 text-[12px] text-[var(--text-secondary)]">
            Đã bỏ qua {result.skippedDuplicateOrders} đơn trùng đã có sẵn.
          </p>
        )}
      </div>
    </div>
  );
}
