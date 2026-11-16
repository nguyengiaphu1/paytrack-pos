'use client';

import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import type { InvoiceFormat, Order, OrderItem, ShopProfile } from '@/types/database';
import { buildVietQRPayload, sanitizeVietQRMemo } from '@/lib/vietqr';
import { formatDateTimeVN, formatVND } from '@/lib/vietnamese';

interface ReceiptTemplateProps {
  order: Order;
  items: OrderItem[];
  profile: ShopProfile | null;
  format: InvoiceFormat;
  showCumulativeDebt: boolean;
  showQr: boolean;
}

export function ReceiptTemplate({
  order,
  items,
  profile,
  format,
  showCumulativeDebt,
  showQr,
}: ReceiptTemplateProps) {
  const [qrState, setQrState] = useState<{ key: string; url: string }>({ key: '', url: '' });

  const hasCustomer = Boolean(order.customer_id);
  const cumulativeDebt = Math.max(
    0,
    order.previous_customer_debt + order.total_amount - order.paid_amount
  );
  const qrAmount = useMemo(() => {
    if (showCumulativeDebt && hasCustomer) {
      return cumulativeDebt > 0 ? cumulativeDebt : order.total_amount;
    }
    return order.remaining_amount > 0 ? order.remaining_amount : order.total_amount;
  }, [showCumulativeDebt, hasCustomer, cumulativeDebt, order.remaining_amount, order.total_amount]);

  const qrMemo = useMemo(
    () => sanitizeVietQRMemo(`PT ${order.order_code}`),
    [order.order_code]
  );

  const canRenderQr = Boolean(
    showQr && profile?.bank_bin && profile?.bank_account_no && qrAmount > 0
  );
  const qrKey = `${profile?.bank_bin ?? ''}|${profile?.bank_account_no ?? ''}|${qrAmount}|${qrMemo}`;

  useEffect(() => {
    if (!canRenderQr || !profile?.bank_bin || !profile?.bank_account_no) {
      return;
    }
    let cancelled = false;
    try {
      const payload = buildVietQRPayload({
        bankBin: profile.bank_bin,
        accountNo: profile.bank_account_no,
        amount: qrAmount,
        memo: qrMemo,
      });
      QRCode.toDataURL(payload, {
        width: 300,
        margin: 1,
        color: { dark: '#141A21', light: '#FFFFFF' },
      })
        .then((url) => {
          if (!cancelled) setQrState({ key: qrKey, url });
        })
        .catch(() => {
          if (!cancelled) setQrState({ key: qrKey, url: '' });
        });
    } catch {
      // Invalid bank info -> no QR rendered
    }
    return () => {
      cancelled = true;
    };
  }, [canRenderQr, profile?.bank_bin, profile?.bank_account_no, qrAmount, qrMemo, qrKey]);

  const qrUrl = canRenderQr && qrState.key === qrKey ? qrState.url : '';
  const is80mm = format === '80mm';

  return (
    <div
      className={`mx-auto bg-white text-[#141A21] border border-[var(--border-default)] ${
        is80mm ? 'w-[304px] p-4 text-[12px]' : 'w-full max-w-[460px] p-6 text-[14px]'
      }`}
    >
      {/* Shop Header */}
      <div className="border-b border-dashed border-[#CBD5E1] pb-3 text-center">
        <h3 className={`font-bold uppercase ${is80mm ? 'text-[15px]' : 'text-[18px]'}`}>
          {profile?.shop_name ?? 'Tạp Hóa Mẹ'}
        </h3>
        {profile?.address && (
          <p className="mt-0.5 text-[12px] text-[#4B5563]">{profile.address}</p>
        )}
        {profile?.phone && (
          <p className="font-mono-tabular text-[12px] text-[#4B5563]">ĐT: {profile.phone}</p>
        )}
      </div>

      {/* Invoice Meta */}
      <div className="border-b border-dashed border-[#CBD5E1] py-3">
        <p className={`text-center font-bold uppercase ${is80mm ? 'text-[13px]' : 'text-[15px]'}`}>
          HÓA ĐƠN BÁN HÀNG
        </p>
        <div className="mt-2 space-y-1 text-[12px]">
          <div className="flex justify-between gap-2">
            <span className="text-[#4B5563]">Mã đơn:</span>
            <span className="font-mono-tabular font-semibold">{order.order_code}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#4B5563]">Ngày giờ:</span>
            <span className="font-mono-tabular">{formatDateTimeVN(order.created_at)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#4B5563]">Khách hàng:</span>
            <span className="font-semibold">{order.customer_name_snapshot}</span>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <table className="w-full border-collapse py-2">
        <thead>
          <tr className="border-b border-[#DDE2E7] text-left text-[11px] uppercase text-[#4B5563]">
            <th className="py-2 font-semibold">Mặt hàng</th>
            <th className="py-2 text-right font-semibold">SL</th>
            <th className="py-2 text-right font-semibold">Đ.Giá</th>
            <th className="py-2 text-right font-semibold">T.Tiền</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-[#E5E7EB]">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2 pr-2 align-top font-medium">
                {item.product_name}
                <span className="ml-1 text-[11px] text-[#4B5563]">({item.unit})</span>
              </td>
              <td className="font-mono-tabular py-2 text-right align-top">
                {Number(item.quantity)}
              </td>
              <td className="font-mono-tabular py-2 text-right align-top">
                {item.unit_price.toLocaleString('vi-VN')}
              </td>
              <td className="font-mono-tabular py-2 text-right align-top font-semibold">
                {item.line_total.toLocaleString('vi-VN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals & Optional Cumulative Debt */}
      <div className="mt-2 space-y-1.5 border-t border-dashed border-[#CBD5E1] pt-3">
        {order.discount_amount > 0 && (
          <>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#4B5563]">Tạm tính</span>
              <span className="font-mono-tabular">{formatVND(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#4B5563]">Giảm giá</span>
              <span className="font-mono-tabular">-{formatVND(order.discount_amount)}</span>
            </div>
          </>
        )}

        <div className="flex justify-between text-[15px] font-bold">
          <span>Tổng đơn này</span>
          <span className="font-mono-tabular">{formatVND(order.total_amount)}</span>
        </div>

        <div className="flex justify-between text-[13px]">
          <span className="text-[#4B5563]">Đã thanh toán</span>
          <span className="font-mono-tabular font-semibold">{formatVND(order.paid_amount)}</span>
        </div>

        {showCumulativeDebt && hasCustomer ? (
          <div className="mt-2 space-y-1 border-t border-dashed border-[#CBD5E1] pt-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-[#4B5563]">Nợ cũ trước đơn</span>
              <span className="font-mono-tabular">
                {formatVND(order.previous_customer_debt)}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#4B5563]">Nợ phát sinh đơn này</span>
              <span className="font-mono-tabular">
                {formatVND(order.remaining_amount)}
              </span>
            </div>
            <div className="flex justify-between text-[15px] font-bold text-[#B45309]">
              <span>Tổng nợ còn lại</span>
              <span className="font-mono-tabular">{formatVND(cumulativeDebt)}</span>
            </div>
          </div>
        ) : (
          order.remaining_amount > 0 && (
            <div className="flex justify-between text-[14px] font-bold text-[#B45309]">
              <span>Còn lại chưa thu</span>
              <span className="font-mono-tabular">{formatVND(order.remaining_amount)}</span>
            </div>
          )
        )}
      </div>

      {order.note && (
        <p className="mt-2.5 border-t border-dashed border-[#CBD5E1] pt-2 text-[12px] text-[#4B5563]">
          Ghi chú: {order.note}
        </p>
      )}

      {/* Embedded VietQR Block */}
      {qrUrl && (
        <div className="mt-3 flex flex-col items-center border-t border-dashed border-[#CBD5E1] pt-3 text-center">
          <p className="text-[12px] font-semibold text-[#141A21]">
            Quét mã VietQR để chuyển khoản
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="VietQR thanh toán"
            className={`my-2 border border-[#DDE2E7] ${is80mm ? 'h-[132px] w-[132px]' : 'h-[156px] w-[156px]'}`}
          />
          <p className="text-[11px] text-[#4B5563]">
            {profile?.bank_name} · <span className="font-mono-tabular">{profile?.bank_account_no}</span>
          </p>
          <p className="font-mono-tabular text-[12px] font-bold">
            {formatVND(qrAmount)} · ND: {qrMemo}
          </p>
        </div>
      )}

      <p className="mt-3 border-t border-dashed border-[#CBD5E1] pt-2.5 text-center text-[12px] text-[#4B5563]">
        Cảm ơn quý khách đã ủng hộ!
      </p>
    </div>
  );
}
