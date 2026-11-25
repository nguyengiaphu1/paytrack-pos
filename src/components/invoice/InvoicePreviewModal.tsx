'use client';

import { useRef, useState } from 'react';
import { Check, Download, Printer, ReceiptText, Share2, X } from 'lucide-react';
import type { InvoiceFormat, Order, OrderItem, ShopProfile } from '@/types/database';
import { ReceiptTemplate } from './ReceiptTemplate';
import { ModalDialog } from '@/components/ui/ModalDialog';

interface InvoicePreviewModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  items: OrderItem[];
  profile: ShopProfile | null;
}

export function InvoicePreviewModal(props: InvoicePreviewModalProps) {
  if (!props.open || !props.order) return null;
  return (
    <InvoicePreviewModalBody
      key={props.order.id}
      {...props}
      order={props.order}
    />
  );
}

function InvoicePreviewModalBody({
  onClose,
  order,
  items,
  profile,
}: Omit<InvoicePreviewModalProps, 'open' | 'order'> & { order: Order }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const hasCustomer = Boolean(order.customer_id);
  const cumulativeDebt = Math.max(
    0,
    order.previous_customer_debt + order.total_amount - order.paid_amount
  );
  const initialShowCumulativeDebt = profile?.default_show_cumulative_debt ?? true;
  const hasBalanceDue =
    order.remaining_amount > 0 ||
    (initialShowCumulativeDebt && hasCustomer && cumulativeDebt > 0);

  const [format, setFormat] = useState<InvoiceFormat>(
    profile?.default_invoice_format ?? 'a5'
  );
  const [showCumulativeDebt, setShowCumulativeDebt] = useState<boolean>(
    initialShowCumulativeDebt
  );
  const [showQr, setShowQr] = useState<boolean>(
    Boolean((profile?.default_show_qr_on_invoice ?? true) && hasBalanceDue)
  );
  const [exporting, setExporting] = useState(false);
  const [downloadedPng, setDownloadedPng] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function markDownloaded() {
    setDownloadedPng(true);
    setTimeout(() => setDownloadedPng(false), 2400);
  }

  async function renderPng() {
    if (!sheetRef.current) return null;
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(sheetRef.current, {
      pixelRatio: 2,
      backgroundColor: '#FFFFFF',
      cacheBust: true,
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return { dataUrl, blob };
  }

  async function handleDownloadPng() {
    if (exporting) return;
    setExportError(null);
    setExporting(true);
    try {
      const rendered = await renderPng();
      if (!rendered) {
        setExportError('Không tạo được ảnh hóa đơn, vui lòng thử lại.');
        return;
      }
      const link = document.createElement('a');
      link.download = `hoadon-${order.order_code}.png`;
      link.href = rendered.dataUrl;
      link.click();
      markDownloaded();
    } catch {
      setExportError('Không tải được ảnh PNG hóa đơn, vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  }

  async function handleSharePng() {
    if (exporting) return;
    setExportError(null);
    setExporting(true);
    try {
      const rendered = await renderPng();
      if (!rendered) {
        setExportError('Không tạo được ảnh hóa đơn, vui lòng thử lại.');
        return;
      }
      const file = new File([rendered.blob], `hoadon-${order.order_code}.png`, {
        type: 'image/png',
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Hóa đơn ${order.order_code}`,
          text: `${profile?.shop_name ?? 'PayTrack POS'} gửi hóa đơn ${order.order_code}`,
        });
      } else {
        const link = document.createElement('a');
        link.download = `hoadon-${order.order_code}.png`;
        link.href = rendered.dataUrl;
        link.click();
        markDownloaded();
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setExportError('Không gửi được ảnh hóa đơn. Bạn có thể thử bấm Tải PNG.');
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    setExportError(null);
    window.print();
  }

  return (
    <ModalDialog
      open
      onClose={onClose}
      ariaLabelledBy="invoice-preview-modal-title"
      panelClassName="animate-sheet-up sm:animate-modal-in glass-modal max-h-[94dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[28px] sm:rounded-[28px]"
    >
      {/* Compact Sticky Title Header (hidden during window.print) */}
      <div className="no-print glass-modal-header sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-[var(--brand-jade-text)]">
            <ReceiptText className="h-4.5 w-4.5 shrink-0" />
          </span>
          <h2
            id="invoice-preview-modal-title"
            className="min-w-0 truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            Xuất hóa đơn {order.order_code}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Customization Controls (keeps receipt preview tall on 375px) */}
      <div className="no-print glass-divider flex flex-wrap items-center gap-2 border-b px-4 py-3 text-[13px] sm:px-5">
        <div
          role="group"
          aria-label="Chọn khổ hóa đơn"
          className="glass-well inline-flex gap-1 rounded-full p-1"
        >
          <button
            type="button"
            aria-pressed={format === 'a5'}
            onClick={() => setFormat('a5')}
            className={`press-tactile min-h-[44px] rounded-full px-3.5 font-semibold transition-[transform,background-color,color] ${
              format === 'a5'
                ? 'glass-chip-active'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Khổ A5 / PNG
          </button>
          <button
            type="button"
            aria-pressed={format === '80mm'}
            onClick={() => setFormat('80mm')}
            className={`press-tactile min-h-[44px] rounded-full px-3.5 font-semibold transition-[transform,background-color,color] ${
              format === '80mm'
                ? 'glass-chip-active'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Nhiệt 80mm
          </button>
        </div>

        {order.customer_id && (
          <label className="glass-solid-control inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full px-3.5 font-medium text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={showCumulativeDebt}
              onChange={(e) => setShowCumulativeDebt(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
            />
            <span>Hiện công nợ lũy kế</span>
          </label>
        )}

        <label
          className={`glass-solid-control inline-flex min-h-[44px] items-center gap-2 rounded-full px-3.5 font-medium text-[var(--text-primary)] ${
            profile?.bank_bin && profile?.bank_account_no
              ? 'cursor-pointer'
              : 'cursor-not-allowed opacity-60'
          }`}
        >
          <input
            type="checkbox"
            disabled={!profile?.bank_bin || !profile?.bank_account_no}
            checked={Boolean(showQr && profile?.bank_bin && profile?.bank_account_no)}
            onChange={(e) => setShowQr(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
          />
          <span>
            {profile?.bank_bin && profile?.bank_account_no
              ? 'Hiện mã VietQR'
              : 'Mã VietQR (chưa cài STK)'}
          </span>
        </label>
      </div>

      {/* Receipt Preview Sheet (strictly isolated .print-surface-light paper) */}
      <div className="p-3.5 sm:p-5">
        <div
          ref={sheetRef}
          className={`print-surface-light print-only-sheet overflow-hidden rounded-[12px] ${
            format === '80mm' ? 'print-format-80mm' : 'print-format-a5'
          }`}
        >
          <ReceiptTemplate
            order={order}
            items={items}
            profile={profile}
            format={format}
            showCumulativeDebt={showCumulativeDebt}
            showQr={showQr}
          />
        </div>
      </div>

      {exportError && (
        <div className="no-print px-4 pb-2.5 sm:px-5">
          <div
            role="alert"
            className="glass-badge-overdue rounded-[14px] px-3.5 py-2.5 text-[13px] font-medium"
          >
            {exportError}
          </div>
        </div>
      )}

      {downloadedPng && (
        <div className="no-print px-4 pb-2.5 sm:px-5">
          <div
            role="status"
            aria-live="polite"
            className="glass-badge-paid flex items-center justify-center gap-1.5 rounded-[14px] px-3.5 py-2.5 text-[13px] font-semibold"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>Đã tải ảnh PNG hóa đơn về máy</span>
          </div>
        </div>
      )}

      {/* Footer Actions (Chat-first: Gửi ảnh is primary Jade CTA) */}
      <div className="no-print glass-modal-footer sticky bottom-0 grid grid-cols-3 gap-2 p-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] sm:gap-2.5 sm:p-4 sm:pb-4">
        <button
          type="button"
          disabled={exporting}
          onClick={handleDownloadPng}
          className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2 text-[12px] font-semibold text-[var(--text-primary)] disabled:opacity-50 sm:px-3 sm:text-[14px]"
        >
          {downloadedPng ? (
            <Check className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
          ) : (
            <Download className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
          )}
          <span className="truncate">
            {exporting ? 'Đang tạo...' : downloadedPng ? 'Đã tải' : 'Tải PNG'}
          </span>
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2 text-[12px] font-semibold text-[var(--text-primary)] sm:px-3 sm:text-[14px]"
        >
          <Printer className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
          <span className="truncate">In / PDF</span>
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={handleSharePng}
          className="glass-btn-primary press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2 text-[12px] font-semibold disabled:opacity-50 sm:px-3 sm:text-[14px]"
        >
          <Share2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{exporting ? 'Đang gửi...' : 'Gửi ảnh'}</span>
        </button>
      </div>
    </ModalDialog>
  );
}
