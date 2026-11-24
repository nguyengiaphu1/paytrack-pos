'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, QrCode, Settings, Share2, X } from 'lucide-react';
import type { Order, ShopProfile } from '@/types/database';
import { buildVietQRPayload, sanitizeVietQRMemo } from '@/lib/vietqr';
import { buildZaloDebtMessage, formatVND } from '@/lib/vietnamese';
import { VndKInput } from '@/components/ui/VndKInput';
import { ModalDialog } from '@/components/ui/ModalDialog';

export interface VietQRModalProps {
  open: boolean;
  onClose: () => void;
  profile: ShopProfile | null;
  customerName: string;
  totalCustomerDebt?: number;
  unpaidOrders?: Order[];
  fixedOrder?: Order | null;
  context?: 'order' | 'debt';
}

type AmountMode = 'total_debt' | 'single_order' | 'custom';

export function VietQRModal(props: VietQRModalProps) {
  if (!props.open) return null;
  const key = `${props.fixedOrder?.id ?? props.customerName}-${props.totalCustomerDebt ?? 0}`;
  return <VietQRModalBody key={key} {...props} />;
}

function VietQRModalBody({
  onClose,
  profile,
  customerName,
  totalCustomerDebt = 0,
  unpaidOrders = [],
  fixedOrder = null,
  context,
}: VietQRModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const initialMode: AmountMode = fixedOrder
    ? 'single_order'
    : totalCustomerDebt > 0
      ? 'total_debt'
      : 'custom';

  const [mode, setMode] = useState<AmountMode>(initialMode);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    fixedOrder?.id ?? unpaidOrders[0]?.id ?? ''
  );
  const [customAmountVnd, setCustomAmountVnd] = useState<number | null>(
    fixedOrder
      ? fixedOrder.remaining_amount > 0
        ? fixedOrder.remaining_amount
        : fixedOrder.total_amount
      : totalCustomerDebt > 0
        ? totalCustomerDebt
        : null
  );
  const [qrState, setQrState] = useState<{ key: string; url: string; error: string | null }>({
    key: '',
    url: '',
    error: null,
  });
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [downloadedPng, setDownloadedPng] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeOrder = useMemo(() => {
    if (fixedOrder) return fixedOrder;
    return unpaidOrders.find((o) => o.id === selectedOrderId) ?? unpaidOrders[0] ?? null;
  }, [fixedOrder, unpaidOrders, selectedOrderId]);

  const effectiveAmount = useMemo(() => {
    if (mode === 'total_debt') {
      return Math.max(0, Math.round(totalCustomerDebt));
    }
    if (mode === 'single_order' && activeOrder) {
      const rem =
        activeOrder.remaining_amount > 0 ? activeOrder.remaining_amount : activeOrder.total_amount;
      return Math.max(0, Math.round(rem));
    }
    return Math.max(0, Math.round(customAmountVnd ?? 0));
  }, [mode, totalCustomerDebt, activeOrder, customAmountVnd]);

  const isOrderContext = context ? context === 'order' : Boolean(fixedOrder);

  const memo = useMemo(() => {
    if (fixedOrder) {
      return sanitizeVietQRMemo(`PT ${fixedOrder.order_code}`);
    }
    if (mode === 'single_order' && activeOrder) {
      return sanitizeVietQRMemo(`PT ${activeOrder.order_code}`);
    }
    if (isOrderContext) {
      return sanitizeVietQRMemo(`PT ${customerName}`);
    }
    return sanitizeVietQRMemo(`PT NO ${customerName}`);
  }, [fixedOrder, mode, activeOrder, isOrderContext, customerName]);

  const hasBankConfig = Boolean(profile?.bank_bin && profile?.bank_account_no);
  const qrKey = `${profile?.bank_bin ?? ''}|${profile?.bank_account_no ?? ''}|${effectiveAmount}|${memo}`;

  useEffect(() => {
    if (!hasBankConfig || !profile?.bank_bin || !profile?.bank_account_no || effectiveAmount <= 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const payload = buildVietQRPayload({
          bankBin: profile.bank_bin!,
          accountNo: profile.bank_account_no!,
          amount: effectiveAmount,
          memo,
        });

        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(payload, {
          width: 560,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#141A21', light: '#FFFFFF' },
        });
        if (!cancelled) setQrState({ key: qrKey, url, error: null });
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error && err.message
              ? err.message
              : 'Không thể vẽ mã QR, vui lòng kiểm tra lại thông tin.';
          setQrState({ key: qrKey, url: '', error: msg });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasBankConfig, profile?.bank_bin, profile?.bank_account_no, effectiveAmount, memo, qrKey]);

  const qrDataUrl =
    hasBankConfig && effectiveAmount > 0 && qrState.key === qrKey ? qrState.url : '';
  const qrError =
    effectiveAmount <= 0
      ? 'Nhập số tiền lớn hơn 0đ để tạo mã QR'
      : qrState.key === qrKey
        ? qrState.error
        : null;

  async function renderCardBlob(): Promise<{ dataUrl: string; blob: Blob } | null> {
    if (!cardRef.current) return null;
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(cardRef.current, {
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
    setActionError(null);
    setExporting(true);
    try {
      const rendered = await renderCardBlob();
      if (!rendered) {
        setActionError('Không tạo được ảnh QR, vui lòng thử lại.');
        return;
      }
      const link = document.createElement('a');
      link.download = `vietqr-${memo.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = rendered.dataUrl;
      link.click();
      setDownloadedPng(true);
      setTimeout(() => setDownloadedPng(false), 2500);
    } catch {
      setActionError('Không tải được ảnh QR, vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  }

  async function handleShareCard() {
    if (exporting) return;
    setActionError(null);
    setExporting(true);
    try {
      const rendered = await renderCardBlob();
      if (!rendered) {
        setActionError('Không tạo được ảnh QR, vui lòng thử lại.');
        return;
      }
      const file = new File([rendered.blob], `vietqr-${Date.now()}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Mã QR thanh toán ${formatVND(effectiveAmount)}`,
          text: `${profile?.shop_name ?? 'PayTrack POS'} gửi mã thanh toán ${formatVND(effectiveAmount)}`,
        });
      } else {
        const link = document.createElement('a');
        link.download = `vietqr-${memo.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = rendered.dataUrl;
        link.click();
        setDownloadedPng(true);
        setTimeout(() => setDownloadedPng(false), 2500);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setActionError('Không chia sẻ được ảnh QR. Bạn có thể bấm Tải ảnh QR.');
    } finally {
      setExporting(false);
    }
  }

  async function handleCopyZalo() {
    setActionError(null);
    const orderCodes = fixedOrder
      ? [fixedOrder.order_code]
      : mode === 'single_order' && activeOrder
        ? [activeOrder.order_code]
        : unpaidOrders.map((o) => o.order_code);

    const text = buildZaloDebtMessage({
      shopName: profile?.shop_name ?? 'Cửa hàng',
      customerName,
      amount: effectiveAmount,
      bankName: profile?.bank_name,
      accountNo: profile?.bank_account_no,
      accountName: profile?.bank_account_name,
      memo,
      orderCodes,
    });

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!ok) throw new Error('Clipboard unavailable');
      }
      setCopiedZalo(true);
      setTimeout(() => setCopiedZalo(false), 2500);
    } catch {
      setActionError('Trình duyệt không cho copy tự động — bạn có thể chia sẻ ảnh QR ở trên.');
    }
  }

  return (
    <ModalDialog
      open
      onClose={onClose}
      ariaLabelledBy="vietqr-modal-title"
      panelClassName="animate-sheet-up sm:animate-modal-in glass-modal max-h-[92dvh] w-full max-w-[468px] overflow-y-auto rounded-t-[26px] sm:rounded-[26px]"
    >
      <div className="glass-modal-header sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[var(--brand-jade-text)]">
            <QrCode className="h-4.5 w-4.5 shrink-0" />
          </span>
          <h2
            id="vietqr-modal-title"
            className="min-w-0 truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            {isOrderContext ? 'Mã VietQR thanh toán' : 'Mã VietQR thu nợ'}
          </h2>
        </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="glass-btn-secondary press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4 pb-[calc(18px+env(safe-area-inset-bottom))] sm:p-5 sm:pb-5">
          {!hasBankConfig ? (
            <div className="glass-well rounded-[20px] p-5 text-center">
              <p className="mb-1 text-[15px] font-semibold text-[var(--text-primary)]">
                Chưa cài đặt ngân hàng VietQR
              </p>
              <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
                Thêm STK trong Cài đặt để tạo mã QR tự động.
              </p>
              <Link
                href="/settings#bank"
                onClick={onClose}
                className="glass-btn-primary press-tactile inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold"
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Cài đặt ngân hàng</span>
              </Link>
            </div>
          ) : (
            <>
              {!fixedOrder && (
                <div
                  role="group"
                  aria-label="Chọn cách tính số tiền QR"
                  className="glass-well grid grid-cols-3 gap-1.5 rounded-full p-1"
                >
                  <button
                    type="button"
                    aria-pressed={mode === 'total_debt'}
                    disabled={totalCustomerDebt <= 0}
                    onClick={() => setMode('total_debt')}
                    className={`press-tactile min-h-[44px] truncate rounded-full px-1.5 text-[12px] font-semibold transition-all disabled:opacity-40 sm:px-2 sm:text-[13px] ${
                      mode === 'total_debt'
                        ? 'glass-chip-active'
                        : 'border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Tổng nợ
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === 'single_order'}
                    disabled={unpaidOrders.length === 0}
                    onClick={() => setMode('single_order')}
                    className={`press-tactile min-h-[44px] truncate rounded-full px-1.5 text-[12px] font-semibold transition-all disabled:opacity-40 sm:px-2 sm:text-[13px] ${
                      mode === 'single_order'
                        ? 'glass-chip-active'
                        : 'border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Theo đơn
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === 'custom'}
                    onClick={() => {
                      setCustomAmountVnd(effectiveAmount > 0 ? effectiveAmount : null);
                      setMode('custom');
                    }}
                    className={`press-tactile min-h-[44px] truncate rounded-full px-1.5 text-[12px] font-semibold transition-all sm:px-2 sm:text-[13px] ${
                      mode === 'custom'
                        ? 'glass-chip-active'
                        : 'border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Sửa tiền
                  </button>
                </div>
              )}

              {mode === 'single_order' && !fixedOrder && unpaidOrders.length > 0 && (
                <div>
                  <label
                    htmlFor="vietqr-order-select"
                    className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]"
                  >
                    Đơn còn nợ
                  </label>
                  <select
                    id="vietqr-order-select"
                    value={activeOrder?.id ?? ''}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                  >
                    {unpaidOrders.map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        {ord.order_code} — Còn {formatVND(ord.remaining_amount)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(mode === 'custom' || fixedOrder) && (
                <div>
                  <label
                    htmlFor="vietqr-amount-input"
                    className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]"
                  >
                    Số tiền cần thu (nghìn)
                  </label>
                  <VndKInput
                    id="vietqr-amount-input"
                    valueVnd={mode === 'custom' ? customAmountVnd : effectiveAmount}
                    onChangeVnd={(val) => {
                      setMode('custom');
                      setCustomAmountVnd(val);
                    }}
                    placeholder="100"
                    showPreview
                  />
                </div>
              )}

              {/* Shareable QR Card (strictly isolated .print-surface-light white paper) */}
              <div
                ref={cardRef}
                className="print-surface-light rounded-[14px] border border-[var(--border-default)] bg-white p-4 text-center"
              >
                <p className="break-words text-[14px] font-bold uppercase tracking-wide text-[var(--brand-jade)]">
                  {profile?.shop_name ?? 'PayTrack POS'}
                </p>
                <p className="mt-0.5 break-words text-[13px] text-[var(--text-secondary)]">
                  Khách hàng: <strong className="text-[var(--text-primary)]">{customerName}</strong>
                </p>

                <div className="my-3 flex items-center justify-center">
                  {qrError ? (
                    <div className="flex h-[220px] w-[220px] items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-[13px] text-[var(--status-overdue)]">
                      {qrError}
                    </div>
                  ) : qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt={`Mã VietQR thu ${formatVND(effectiveAmount)}`}
                      className="h-[228px] w-[228px] max-w-full rounded-lg border border-[var(--border-default)]"
                    />
                  ) : (
                    <div className="h-[228px] w-[228px] max-w-full rounded-lg bg-[var(--bg-subtle)]" />
                  )}
                </div>

                <p className="font-mono-tabular break-words text-[24px] font-bold text-[var(--text-primary)]">
                  {formatVND(effectiveAmount)}
                </p>

                <div className="mt-3 space-y-1 border-t border-dashed border-[var(--border-default)] pt-3 text-[13px]">
                  <p className="break-words font-semibold text-[var(--text-primary)]">
                    {profile?.bank_name || `BIN ${profile?.bank_bin}`} ·{' '}
                    <span className="font-mono-tabular">{profile?.bank_account_no}</span>
                  </p>
                  {profile?.bank_account_name && (
                    <p className="break-words text-[12px] uppercase text-[var(--text-secondary)]">
                      {profile.bank_account_name}
                    </p>
                  )}
                  <p className="break-words text-[12px] text-[var(--text-secondary)]">
                    Nội dung CK:{' '}
                    <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {memo}
                    </span>
                  </p>
                </div>
              </div>

              {actionError && (
                <div
                  role="alert"
                  className="glass-badge-overdue rounded-[14px] px-3.5 py-2.5 text-[13px] font-medium"
                >
                  {actionError}
                </div>
              )}

              {downloadedPng && !actionError && (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-center text-[13px] font-semibold text-[var(--brand-jade-text)]"
                >
                  Đã tải ảnh mã QR về máy
                </p>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={!qrDataUrl || exporting}
                  onClick={handleDownloadPng}
                  className="glass-btn-secondary press-tactile flex min-h-[48px] items-center justify-center gap-2 rounded-full px-3 text-[14px] font-semibold disabled:opacity-50"
                >
                  {downloadedPng ? (
                    <>
                      <Check className="h-4 w-4 text-[var(--brand-jade-text)]" />
                      <span className="text-[var(--brand-jade-text)]">Đã tải ảnh</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>{exporting ? 'Đang xuất ảnh...' : 'Tải ảnh QR'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={!qrDataUrl || exporting}
                  onClick={handleShareCard}
                  className="glass-btn-primary press-tactile flex min-h-[48px] items-center justify-center gap-2 rounded-full px-3 text-[14px] font-semibold disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{exporting ? 'Đang chuẩn bị...' : 'Chia sẻ ảnh'}</span>
                </button>
              </div>

              <button
                type="button"
                disabled={effectiveAmount <= 0}
                onClick={handleCopyZalo}
                className="glass-btn-secondary press-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-4 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copiedZalo ? (
                  <>
                    <Check className="h-4 w-4 text-[var(--brand-jade-text)]" />
                    <span className="text-[var(--brand-jade-text)]">
                      {isOrderContext
                        ? 'Đã copy thông tin chuyển khoản!'
                        : 'Đã copy tin nhắn gửi Zalo!'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>
                      {isOrderContext
                        ? 'Copy thông tin chuyển khoản gửi Zalo'
                        : 'Copy tin nhắn thu nợ gửi Zalo'}
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
    </ModalDialog>
  );
}
