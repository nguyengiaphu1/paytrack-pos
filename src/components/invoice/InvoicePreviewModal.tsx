'use client';

import { toPng } from 'html-to-image';
import { useRef, useState } from 'react';
import { Download, Printer, ReceiptText, Share2, X } from 'lucide-react';
import type { InvoiceFormat, Order, OrderItem, ShopProfile } from '@/types/database';
import { ReceiptTemplate } from './ReceiptTemplate';

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
  const [format, setFormat] = useState<InvoiceFormat>(
    profile?.default_invoice_format ?? 'a5'
  );
  const [showCumulativeDebt, setShowCumulativeDebt] = useState<boolean>(
    profile?.default_show_cumulative_debt ?? true
  );
  const [showQr, setShowQr] = useState<boolean>(
    profile?.default_show_qr_on_invoice ?? true
  );
  const [exporting, setExporting] = useState(false);

  async function renderPng() {
    if (!sheetRef.current) return null;
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
    setExporting(true);
    try {
      const rendered = await renderPng();
      if (!rendered) return;
      const link = document.createElement('a');
      link.download = `hoadon-${order.order_code}.png`;
      link.href = rendered.dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function handleSharePng() {
    setExporting(true);
    try {
      const rendered = await renderPng();
      if (!rendered) return;
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
      }
    } catch {
      // Người dùng đóng hộp thoại chia sẻ
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xem trước và xuất hóa đơn"
    >
      <div className="max-h-[94dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-canvas)] sm:rounded-[10px]">
        {/* Header & Toggles (hidden during window.print) */}
        <div className="no-print sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ReceiptText className="h-5 w-5 shrink-0 text-[var(--brand-jade)]" />
              <h2 className="min-w-0 truncate text-[17px] font-bold text-[var(--text-primary)]">
                Xuất hóa đơn {order.order_code}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Live Customization Controls */}
          <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[13px]">
            <div className="inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-0.5">
              <button
                type="button"
                onClick={() => setFormat('a5')}
                className={`min-h-[34px] rounded-md px-3 font-semibold ${
                  format === 'a5'
                    ? 'bg-[var(--bg-surface)] text-[var(--brand-jade)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Khổ A5 / PNG
              </button>
              <button
                type="button"
                onClick={() => setFormat('80mm')}
                className={`min-h-[34px] rounded-md px-3 font-semibold ${
                  format === '80mm'
                    ? 'bg-[var(--bg-surface)] text-[var(--brand-jade)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Nhiệt 80mm
              </button>
            </div>

            {order.customer_id && (
              <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 font-medium">
                <input
                  type="checkbox"
                  checked={showCumulativeDebt}
                  onChange={(e) => setShowCumulativeDebt(e.target.checked)}
                  className="h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
                />
                <span>Hiện công nợ lũy kế</span>
              </label>
            )}

            <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 font-medium">
              <input
                type="checkbox"
                checked={showQr}
                onChange={(e) => setShowQr(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
              />
              <span>Hiện mã VietQR</span>
            </label>
          </div>
        </div>

        {/* Receipt Preview Sheet */}
        <div className="p-3 sm:p-4">
          <div
            ref={sheetRef}
            className={`print-only-sheet ${
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

        {/* Footer Actions */}
        <div className="no-print sticky bottom-0 grid grid-cols-3 gap-1.5 border-t border-[var(--border-default)] bg-[var(--bg-surface)] p-3 sm:gap-2 sm:p-4">
          <button
            type="button"
            disabled={exporting}
            onClick={handleDownloadPng}
            className="flex min-h-[48px] items-center justify-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-1.5 text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-50 sm:gap-1.5 sm:px-2 sm:text-[14px]"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className="truncate">Tải PNG</span>
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={handleSharePng}
            className="flex min-h-[48px] items-center justify-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-1.5 text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-50 sm:gap-1.5 sm:px-2 sm:text-[14px]"
          >
            <Share2 className="h-4 w-4 shrink-0" />
            <span className="truncate">Gửi ảnh</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex min-h-[48px] items-center justify-center gap-1 rounded-lg bg-[var(--brand-jade)] px-1.5 text-[12px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] sm:gap-1.5 sm:px-2 sm:text-[14px]"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span className="truncate">In / PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
