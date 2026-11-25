'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import {
  buildCsvImportPreview,
  detectLikelyCsvUnitMode,
  inferDefaultCsvYear,
  type CsvUnitMode,
} from '@/lib/csv-import';
import { formatVND, getTodayVN } from '@/lib/vietnamese';
import { usePosData } from '@/components/providers/PosDataProvider';
import { ModalDialog } from '@/components/ui/ModalDialog';

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ImportApiResult {
  ok: boolean;
  summary?: {
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
  };
  warnings?: Array<{
    lineNumber: number;
    rawSummary: string;
    reason: string;
  }>;
  error?: string;
}

export function CsvImportModal({ open, onClose }: CsvImportModalProps) {
  const {
    customers,
    products,
    orders,
    ensurePosCatalog,
    ensureCustomers,
    ensureOrders,
    refreshPosCatalog,
    refreshCustomers,
    refreshOrders,
    invalidateAfterMutation,
  } = usePosData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [year, setYear] = useState<number>(() => Number(getTodayVN().slice(0, 4)) || 2026);
  const [unitMode, setUnitMode] = useState<CsvUnitMode>('k');
  const [groupSameDayOrders, setGroupSameDayOrders] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [importing, setImporting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportApiResult['summary'] | null>(null);

  useEffect(() => {
    if (!open) return;
    void ensurePosCatalog();
    void ensureCustomers();
    void ensureOrders();
  }, [open, ensurePosCatalog, ensureCustomers, ensureOrders]);

  const preview = useMemo(() => {
    if (!csvText.trim()) return null;
    return buildCsvImportPreview({
      csvText,
      options: {
        year,
        unitMode,
        groupSameDayOrders,
        skipDuplicates,
      },
      existingCustomers: customers,
      existingProducts: products,
      existingOrders: orders,
    });
  }, [csvText, year, unitMode, groupSameDayOrders, skipDuplicates, customers, products, orders]);

  function resetState() {
    setFileName(null);
    setCsvText('');
    setSubmitError(null);
    setResult(null);
    setShowWarnings(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleClose() {
    if (importing) return;
    resetState();
    onClose();
  }

  async function loadCsvFile(file: File) {
    setSubmitError(null);
    setResult(null);

    if (!file.name.toLowerCase().endsWith('.csv') && file.type && !file.type.includes('csv') && !file.type.includes('text')) {
      setSubmitError('Vui lòng chọn file định dạng .csv (xuất từ Excel hoặc Google Sheets).');
      return;
    }

    if (file.size > 2_000_000) {
      setSubmitError('File CSV vượt quá 2 MB. Vui lòng chia nhỏ file trước khi tải lên.');
      return;
    }

    try {
      const text = await file.text();
      setFileName(file.name);
      setCsvText(text);
      setYear(inferDefaultCsvYear(text));
      setUnitMode(detectLikelyCsvUnitMode(text));
      setShowWarnings(false);
    } catch {
      setSubmitError('Không đọc được nội dung file CSV, vui lòng thử lại.');
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void loadCsvFile(file);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void loadCsvFile(file);
    }
  }

  async function handleConfirmImport() {
    if (!preview || !preview.ok || preview.newOrders.length === 0 || importing) return;
    setSubmitError(null);
    setImporting(true);

    try {
      const response = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvText,
          year,
          unitMode,
          groupSameDayOrders,
          skipDuplicates,
        }),
      });

      const payload = (await response.json()) as ImportApiResult;
      if (!response.ok || !payload.ok || !payload.summary) {
        setSubmitError(payload.error ?? 'Nhập dữ liệu chưa thành công, vui lòng thử lại.');
        return;
      }

      setResult(payload.summary);
      invalidateAfterMutation();
      await Promise.all([refreshPosCatalog(), refreshCustomers(), refreshOrders()]);
    } catch {
      setSubmitError('Mất kết nối khi nhập CSV. Bạn có thể bấm thử lại, hệ thống sẽ tự bỏ qua các đơn đã lưu.');
    } finally {
      setImporting(false);
    }
  }

  const activeTotals = preview?.newOrdersTotals ?? preview?.totals;

  return (
    <ModalDialog
      open={open}
      onClose={handleClose}
      ariaLabelledBy="csv-import-modal-title"
      closeOnBackdrop={!importing}
      closeOnEscape={!importing}
      panelClassName="animate-sheet-up sm:animate-modal-in glass-modal flex max-h-[92dvh] w-full max-w-[580px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
    >
      {/* Header */}
      <div className="glass-modal-header flex shrink-0 items-center justify-between gap-2 px-5 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-[var(--brand-jade-text)]">
            <FileSpreadsheet className="h-[18px] w-[18px]" />
          </span>
          <h2
            id="csv-import-modal-title"
            className="min-w-0 truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            Nhập dữ liệu từ CSV
          </h2>
        </div>
        <button
          type="button"
          onClick={handleClose}
          disabled={importing}
          aria-label="Đóng"
          className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {submitError && (
          <div
            role="alert"
            className="glass-badge-overdue flex items-start gap-2 rounded-[16px] px-3.5 py-3 text-[13px] font-medium"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {result ? (
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
        ) : (
          <>
            {/* File Dropzone / Picker */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`glass-well rounded-[20px] border border-dashed p-4 text-center transition-colors ${
                dragActive ? 'border-[var(--brand-jade)]' : 'border-[var(--border-default)]'
              }`}
            >
              <input
                ref={fileInputRef}
                id="csv-import-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="sr-only"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="glass-icon-orb flex h-11 w-11 items-center justify-center rounded-[15px] text-[var(--brand-jade-text)]">
                  <Upload className="h-5 w-5" />
                </div>
                {fileName ? (
                  <div className="space-y-1">
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">{fileName}</p>
                    <label
                      htmlFor="csv-import-file"
                      className="glass-solid-control press-tactile inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-[var(--text-primary)]"
                    >
                      Chọn file khác
                    </label>
                  </div>
                ) : (
                  <>
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                      Tải file sổ bán hàng (.csv)
                    </p>
                    <p className="max-w-[380px] text-[12px] text-[var(--text-secondary)]">
                      Tự nhận cột Date, Item, Out (vốn), In (đã thu), Tồn (còn nợ), Customer và
                      Người nhận CK. Tự tạo khách, món và cập nhật công nợ.
                    </p>
                    <label
                      htmlFor="csv-import-file"
                      className="glass-solid-control press-tactile mt-1 inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold text-[var(--text-primary)]"
                    >
                      <Upload className="h-4 w-4 text-[var(--brand-jade-text)]" />
                      <span>Chọn file CSV</span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Preview Error */}
            {preview && !preview.ok && (
              <div
                role="alert"
                className="glass-badge-overdue rounded-[16px] px-3.5 py-3 text-[13px] font-medium"
              >
                {preview.error}
              </div>
            )}

            {/* Live Preview Summary */}
            {preview && preview.ok && activeTotals && (
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
                          if (Number.isInteger(next)) setYear(next);
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
                          onClick={() => setUnitMode('k')}
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
                          onClick={() => setUnitMode('vnd')}
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
                        onChange={(e) => setGroupSameDayOrders(e.target.checked)}
                        className="h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
                      />
                      <span>Gộp các món cùng ngày, cùng khách & trạng thái vào 1 đơn</span>
                    </label>
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13px] font-medium text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
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
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="glass-modal-footer flex shrink-0 gap-2.5 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-5 sm:pb-3.5">
        {result ? (
          <button
            type="button"
            onClick={handleClose}
            className="glass-btn-primary press-tactile flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-[15px] font-semibold"
          >
            Hoàn tất
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="glass-btn-secondary press-tactile min-h-[48px] shrink-0 rounded-full px-5 text-[14px] font-semibold disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={!preview || !preview.ok || preview.newOrders.length === 0 || importing}
              onClick={() => void handleConfirmImport()}
              className="glass-btn-primary press-tactile flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold disabled:opacity-50"
            >
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              <span className="truncate">
                {importing
                  ? 'Đang nhập dữ liệu...'
                  : preview?.ok && preview.newOrders.length === 0
                    ? 'Tất cả đơn đã có sẵn'
                    : preview?.ok
                      ? `Nhập ${preview.newOrders.length} đơn`
                      : 'Chọn file CSV để nhập'}
              </span>
            </button>
          </>
        )}
      </div>
    </ModalDialog>
  );
}
