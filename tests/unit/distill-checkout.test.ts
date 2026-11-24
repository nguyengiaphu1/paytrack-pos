import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHECKOUT_PREFS,
  getQuickPickAccounts,
  sanitizeCheckoutPrefs,
} from '@/lib/checkout-prefs';

const ROOT = path.resolve(__dirname, '../..');

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Checkout preferences & MRU quick-pick accounts (checkout-prefs)', () => {
  it('defaults to full_transfer and sanitizes invalid/unknown values safely', () => {
    expect(sanitizeCheckoutPrefs(null)).toEqual(DEFAULT_CHECKOUT_PREFS);
    expect(sanitizeCheckoutPrefs({ lastChoice: 'unpaid', lastAccount: 'Unknown' })).toEqual({
      lastChoice: 'full_transfer',
      lastAccount: null,
      recentAccounts: [],
    });

    expect(
      sanitizeCheckoutPrefs({
        lastChoice: 'full_cash',
        lastAccount: 'Trang Lê',
        recentAccounts: ['Trang Lê', 'Thanh', 'Fake', 'Trang Lê', 'Vận chuyển', 'Phú', 'Khác'],
      })
    ).toEqual({
      lastChoice: 'full_cash',
      lastAccount: 'Trang Lê',
      recentAccounts: ['Trang Lê', 'Thanh', 'Vận chuyển', 'Phú'],
    });
  });

  it('builds a <= 4 quick-pick list prioritizing selected, then MRU, then defaults', () => {
    expect(getQuickPickAccounts(null, [], 3)).toEqual(['Thanh', 'Phú', 'Vận chuyển']);
    expect(getQuickPickAccounts('Kiều Thương', ['Trang Lê', 'Thanh'], 3)).toEqual([
      'Kiều Thương',
      'Trang Lê',
      'Thanh',
    ]);
    expect(getQuickPickAccounts('Thuỷ', ['Thuỷ'], 3)).toEqual(['Thuỷ', 'Thanh', 'Phú']);
  });
});

describe('Distilled online-shop CheckoutModal & PaymentAccountSelector architecture', () => {
  it('removes dead partialMethod select, collapses bookkeeping details, surfaces Chưa nhập vốn, and pins sticky submit footer', () => {
    const checkout = readRel('src/components/pos/CheckoutModal.tsx');
    expect(checkout).not.toContain('partialMethod');
    expect(checkout).toContain('loadCheckoutPrefs');
    expect(checkout).toContain('saveCheckoutPrefs');
    expect(checkout).toContain('Chưa nhập vốn');
    expect(checkout).toContain('Ngày, SĐT/địa chỉ & ghi chú');
    expect(checkout).toContain('showChangeCalc');
    expect(checkout).toContain('Sticky Submit Footer');
  });

  it('keeps PaymentAccountSelector collapsed to quick-picks by default with grouped expanded drawer', () => {
    const selector = readRel('src/components/ui/PaymentAccountSelector.tsx');
    expect(selector).toContain('getQuickPickAccounts');
    expect(selector).toContain('Tài khoản cá nhân');
    expect(selector).toContain('Vận chuyển & Khác');
    expect(selector).toContain('Thu gọn');
  });

  it('aligns online-shop chat copy, Gửi ảnh primary CTA, honest SyncStatusPill, and Settings onboarding trigger', () => {
    const invoice = readRel('src/components/invoice/InvoicePreviewModal.tsx');
    expect(invoice).toContain('Gửi ảnh is primary Jade CTA');
    const shareIdx = invoice.indexOf('handleSharePng');
    const printIdx = invoice.indexOf('handlePrint');
    const lastShareBtn = invoice.lastIndexOf('handleSharePng');
    const lastPrintBtn = invoice.lastIndexOf('handlePrint');
    expect(shareIdx).toBeGreaterThan(-1);
    expect(printIdx).toBeGreaterThan(-1);
    expect(lastShareBtn).toBeGreaterThan(lastPrintBtn);

    const qr = readRel('src/components/qr/VietQRModal.tsx');
    expect(qr).toContain('Copy thông tin chuyển khoản gửi Zalo');
    expect(qr).toContain('Mã VietQR thanh toán');
    expect(qr).not.toContain('nhắc nợ');

    const shell = readRel('src/components/shell/AppShell.tsx');
    expect(shell).toContain('Đã đồng bộ');
    expect(shell).toContain('aria-live="polite"');

    const settings = readRel('src/app/(app)/settings/page.tsx');
    expect(settings).toContain('openOnboarding');
    expect(settings).toContain('Thiết lập nhanh');

    const welcome = readRel('src/components/welcome/WelcomeOnboardingModal.tsx');
    expect(welcome).toContain('saveDirtyAndStart');
    expect(welcome).not.toContain('Tạp Hóa Mẹ');
  });
});
