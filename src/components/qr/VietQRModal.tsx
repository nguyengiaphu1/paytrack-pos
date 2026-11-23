'use client';

import Link from 'next/link';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, QrCode, Settings, Share2, X } from 'lucide-react';
import type { Order, ShopProfile } from '@/types/database';
import { buildVietQRPayload, sanitizeVietQRMemo } from '@/lib/vietqr';
import { buildZaloDebtMessage, formatVND } from '@/lib/vietnamese';
import { VndKInput } from '@/components/ui/VndKInput';

export interface VietQRModalProps {
  open: boolean;
  onClose: () => void;
  profile: ShopProfile | null;
  customerName: string;
  totalCustomerDebt?: number;
  unpaidOrders?: Order[];
  fixedOrder?: Order | null;
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
  const [exporting, setExporting] = useState(false);

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

  const memo = useMemo(() => {
    if (mode === 'single_order' && activeOrder) {
      return sanitizeVietQRMemo(`PT ${activeOrder.order_code}`);
    }
    return sanitizeVietQRMemo(`PT NO ${customerName}`);
  }, [mode, activeOrder, customerName]);

  const hasBankConfig = Boolean(profile?.bank_bin && profile?.bank_account_no);
  const qrKey = `${profile?.bank_bin ?? ''}|${profile?.bank_account_no ?? ''}|${effectiveAmount}|${memo}`;

  useEffect(() => {
    if (!hasBankConfig || !profile?.bank_bin || !profile?.bank_account_no || effectiveAmount <= 0) {
      return;
    }

    let cancelled = false;
    try {
      const payload = buildVietQRPayload({
        bankBin: profile.bank_bin,
        accountNo: profile.bank_account_no,
        amount: effectiveAmount,
        memo,
      });

      QRCode.toDataURL(payload, {
        width: 560,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#141A21', light: '#FFFFFF' },
      })
        .then((url) => {
          if (!cancelled) setQrState({ key: qrKey, url, error: null });
        })
        .catch(() => {
          if (!cancelled) {
            setQrState({
              key: qrKey,
              url: '',
              error: 'Không thể vẽ mã QR, vui lòng kiểm tra lại thông tin.',
            });
          }
        });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Thông tin ngân hàng chưa hợp lệ';
      queueMicrotask(() => {
        if (!cancelled) setQrState({ key: qrKey, url: '', error: msg });
      });
    }

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
    setExporting(true);
    try {
      const rendered = await renderCardBlob();
      if (!rendered) return;
      const link = document.createElement('a');
      link.download = `vietqr-${memo.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = rendered.dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function handleShareCard() {
    setExporting(true);
    try {
      const rendered = await renderCardBlob();
      if (!rendered) return;
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
      }
    } catch {
      // Người dùng hủy Share Sheet
    } finally {
      setExporting(false);
    }
  }

  async function handleCopyZalo() {
    const orderCodes =
      mode === 'single_order' && activeOrder
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

    await navigator.clipboard.writeText(text);
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2500);
  }

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tạo mã VietQR động"
    >
      <div className="animate-sheet-up sm:animate-modal-in max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <QrCode className="h-5 w-5 shrink-0 text-[var(--brand-jade-text)]" />
            <h2 className="min-w-0 truncate text-[17px] font-bold text-[var(--text-primary)]">
              Mã VietQR thu tiền
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {!hasBankConfig ? (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-center">
              <p className="mb-1 text-[15px] font-semibold text-[var(--text-primary)]">
                Chưa cài đặt ngân hàng VietQR
              </p>
              <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
                Thêm STK trong Cài đặt để tạo mã QR tự động.
              </p>
              <Link
                href="/settings#bank"
                onClick={onClose}
                className="press-tactile inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Cài đặt ngân hàng</span>
              </Link>
            </div>
          ) : (
            <>
              {!fixedOrder && (
                <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-[var(--bg-subtle)] p-1">
                  <button
                    type="button"
                    disabled={totalCustomerDebt <= 0}
                    onClick={() => setMode('total_debt')}
                    className={`press-tactile min-h-[44px] truncate rounded-md px-1.5 text-[12px] font-semibold transition-colors disabled:opacity-40 sm:px-2 sm:text-[13px] ${
                      mode === 'total_debt'
                        ? 'border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--brand-jade-text)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Tổng nợ
                  </button>
                  <button
                    type="button"
                    disabled={unpaidOrders.length === 0}
                    onClick={() => setMode('single_order')}
                    className={`press-tactile min-h-[44px] truncate rounded-md px-1.5 text-[12px] font-semibold transition-colors disabled:opacity-40 sm:px-2 sm:text-[13px] ${
                      mode === 'single_order'
                        ? 'border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--brand-jade-text)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Theo đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomAmountVnd(effectiveAmount > 0 ? effectiveAmount : null);
                      setMode('custom');
                    }}
                    className={`press-tactile min-h-[44px] truncate rounded-md px-1.5 text-[12px] font-semibold transition-colors sm:px-2 sm:text-[13px] ${
                      mode === 'custom'
                        ? 'border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--brand-jade-text)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Sửa tiền
                  </button>
                </div>
              )}

              {mode === 'single_order' && !fixedOrder && unpaidOrders.length > 0 && (
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-[var(--text-secondary)]">
                    Đơn còn nợ
                  </label>
                  <select
                    value={activeOrder?.id ?? ''}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[16px] text-[var(--text-primary)]"
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
                    className="mb-1 block text-[13px] font-medium text-[var(--text-secondary)]"
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

              {/* Shareable QR Card */}
              <div
                ref={cardRef}
                className="print-surface-light rounded-[10px] border border-[var(--border-default)] bg-white p-4 text-center"
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

                <p className="font-mono-tabular break-words text-[24px] font-bold text-[var(--text-primary)] sm:text-[26px]">
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

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={!qrDataUrl || exporting}
                  onClick={handleDownloadPng}
                  className="press-tactile flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>{exporting ? 'Đang xuất ảnh...' : 'Tải ảnh QR'}</span>
                </button>
                <button
                  type="button"
                  disabled={!qrDataUrl || exporting}
                  onClick={handleShareCard}
                  className="press-tactile flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-3 text-[14px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{exporting ? 'Đang chuẩn bị...' : 'Chia sẻ ảnh'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyZalo}
                className="press-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 text-[14px] font-semibold text-[var(--text-primary)] hover:border-[var(--brand-jade)]"
              >
                {copiedZalo ? (
                  <>
                    <Check className="h-4 w-4 text-[var(--brand-jade-text)]" />
                    <span className="text-[var(--brand-jade-text)]">Đã copy tin nhắn nhắc nợ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy tin nhắn nhắc nợ gửi Zalo</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
