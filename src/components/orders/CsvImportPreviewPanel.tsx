'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import type { CsvImportPreview, CsvImportTotals, CsvUnitMode } from '@/lib/csv-import';
import { formatVND } from '@/lib/vietnamese';

interface CsvImportPreviewPanelProps {
  preview: CsvImportPreview;
  activeTotals: CsvImportTotals;
  year: number;
  unitMode: CsvUnitMode;
  groupSameDayOrders: boolean;
  skipDuplicates: boolean;
  onChangeYear: (year: number) => void;
  onChangeUnitMode: (mode: CsvUnitMode) => void;
  onChangeGroupSameDayOrders: (group: boolean) => void;
  onChangeSkipDuplicates: (skip: boolean) => void;
}

export function CsvImportPreviewPanel({
  preview,
  activeTotals,
  year,
  unitMode,
  groupSameDayOrders,
  skipDuplicates,
  onChangeYear,
  onChangeUnitMode,
  onChangeGroupSameDayOrders,
  onChangeSkipDuplicates,
}: CsvImportPreviewPanelProps) {
  const [showWarnings, setShowWarnings] = useState(false);

  return (
    <div className="space-y-3.5">
      {/* Import Settings */}
      <div className="glass-well space-y-3 rounded-[18px] p-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="csv-import-year"
              className="mb-1 block text-[12px] font-semibold text-[var(--text-secondary)]"
            >
              Năm cho ngày dạng Ngày/Tháng
            </label>
            <input
              id="csv-import-year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isInteger(next)) onChangeYear(next);
              }}
              className="glass-input font-mono-tabular min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
            />
          </div>

          <div>
            <span className="mb-1 block text-[12px] font-semibold text-[var(--text-secondary)]">
              Đơn vị tiền trong file
            </span>
            <div
              role="group"
              aria-label="Chọn đơn vị tiền trong file CSV"
              className="glass-well grid grid-cols-2 gap-1 rounded-full p-1"
            >
              <button
                type="button"
                aria-pressed={unitMode === 'k'}
                onClick={() => onChangeUnitMode('k')}
                className={`press-tactile min-h-[44px] rounded-full px-2.5 text-[13px] font-semibold ${
                  unitMode === 'k'
                    ? 'glass-chip-active'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Nghìn (K)
              </button>
              <button
                type="button"
                aria-pressed={unitMode === 'vnd'}
                onClick={() => onChangeUnitMode('vnd')}
                className={`press-tactile min-h-[44px] rounded-full px-2.5 text-[13px] font-semibold ${
                  unitMode === 'vnd'
                    ? 'glass-chip-active'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Đồng (VND)
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13px] font-medium text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={groupSameDayOrders}
              onChange={(e) => onChangeGroupSameDayOrders(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
            />
            <span>Gộp các món cùng ngày, cùng khách & trạng thái vào 1 đơn</span>
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13px] font-medium text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => onChangeSkipDuplicates(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
            />
            <span>Tự động bỏ qua đơn đã nhập trước đó (tránh trùng nợ)</span>
          </label>
        </div>
      </div>

      {/* Entity Counts */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="glass-card rounded-[18px] p-3">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">Đơn sẽ nhập</p>
          <p className="font-mono-tabular mt-0.5 text-[18px] font-bold text-[var(--text-primary)]">
            {preview.newOrders.length}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {preview.duplicateOrderCount > 0 && skipDuplicates
              ? `Bỏ ${preview.duplicateOrderCount} trùng`
              : `${preview.validRowCount} dòng món`}
          </p>
        </div>
        <div className="glass-card rounded-[18px] p-3">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">Khách hàng</p>
          <p className="font-mono-tabular mt-0.5 text-[18px] font-bold text-[var(--brand-jade-text)]">
            +{preview.newCustomerCount}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {preview.matchedCustomerCount} đã có
          </p>
        </div>
        <div className="glass-card rounded-[18px] p-3">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">Món hàng</p>
          <p className="font-mono-tabular mt-0.5 text-[18px] font-bold text-[var(--brand-jade-text)]">
            +{preview.newProductCount}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {preview.matchedProductCount} giữ nguyên
          </p>
        </div>
      </div>

      {/* Financial Reconciliation Box */}
      <div className="glass-well space-y-2 rounded-[18px] p-3.5 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--text-secondary)]">Tổng giá bán (Doanh thu)</span>
          <strong className="font-mono-tabular text-[15px] text-[var(--text-primary)]">
            {formatVND(activeTotals.totalRevenue)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--text-secondary)]">Tổng giá vốn (Out)</span>
          <strong className="font-mono-tabular text-[var(--text-secondary)]">
            {formatVND(activeTotals.totalCost)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--text-secondary)]">Lãi ước tính</span>
          <strong className="font-mono-tabular text-[var(--brand-jade-text)]">
            {formatVND(activeTotals.totalProfit)}
          </strong>
        </div>
        <div className="glass-divider flex items-center justify-between gap-2 border-t pt-2">
          <span className="text-[var(--text-secondary)]">Đã thu (In)</span>
          <strong className="font-mono-tabular text-[var(--brand-jade-text)]">
            {formatVND(activeTotals.totalPaid)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--text-secondary)]">Còn nợ (Tồn)</span>
          <strong className="font-mono-tabular text-[var(--status-debt)]">
            {formatVND(activeTotals.totalDebt)}
          </strong>
        </div>
      </div>

      {/* Skipped rows, leading-date fallback notices & ignored summary row transparency */}
      {(preview.skippedRows.length > 0 ||
        preview.notices.length > 0 ||
        preview.ignoredSummaryRowCount > 0) && (
        <div className="glass-well space-y-2 rounded-[18px] p-3">
          {preview.notices.map((notice) => (
            <div
              key={notice}
              role="status"
              className="flex items-start gap-2 text-[12px] font-medium text-[var(--status-debt)]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          ))}
          {preview.skippedRows.length > 0 && (
            <div>
              <button
                type="button"
                aria-expanded={showWarnings}
                onClick={() => setShowWarnings((v) => !v)}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-[13px] font-semibold text-[var(--status-debt)]"
              >
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Bỏ qua {preview.skippedRows.length} dòng chưa đủ thông tin</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    showWarnings ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showWarnings && (
                <ul className="mt-2 space-y-1.5 text-[12px] text-[var(--text-secondary)]">
                  {preview.skippedRows.map((row) => (
                    <li
                      key={`${row.lineNumber}-${row.rawSummary}`}
                      className="flex items-start justify-between gap-2"
                    >
                      <span className="font-medium text-[var(--text-primary)]">
                        Dòng {row.lineNumber}: {row.rawSummary}
                      </span>
                      <span className="shrink-0 text-right">{row.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {preview.ignoredSummaryRowCount > 0 && (
            <p className="text-[12px] text-[var(--text-secondary)]">
              Đã tự động loại bỏ {preview.ignoredSummaryRowCount} dòng tổng cộng ở cuối bảng.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
