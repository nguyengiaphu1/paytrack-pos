import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatErrorMessageVN } from '@/lib/errors';
import {
  EMPTY_POS_DRAFT,
  formatQtyForInput,
  getPosDraftStorageKey,
  parseQtyDraft,
  sanitizeCartItem,
  sanitizePosDraft,
  sanitizeQtyInput,
} from '@/lib/pos-draft';

const ROOT = path.resolve(__dirname, '../..');

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Vietnamese error formatting (formatErrorMessageVN)', () => {
  it('translates common network, auth, and Postgres errors into direct Vietnamese copy', () => {
    expect(formatErrorMessageVN(new Error('Failed to fetch'))).toContain('Mất kết nối mạng');
    expect(formatErrorMessageVN(new Error('JWT expired'))).toContain('Phiên đăng nhập đã hết hạn');
    expect(formatErrorMessageVN({ code: '23505', message: 'duplicate key value' })).toContain(
      'trùng lặp'
    );
    expect(
      formatErrorMessageVN({ code: '23514', message: 'violates check constraint customer_id' })
    ).toContain('bắt buộc phải chọn khách hàng');
    expect(formatErrorMessageVN({ code: '42501', message: 'row-level security policy' })).toContain(
      'Không có quyền'
    );
  });

  it('preserves intentional Vietnamese messages and masks unknown raw English errors', () => {
    expect(formatErrorMessageVN(new Error('Đơn ghi nợ bắt buộc chọn khách hàng.'))).toBe(
      'Đơn ghi nợ bắt buộc chọn khách hàng.'
    );
    expect(
      formatErrorMessageVN(new Error('Unexpected PostgREST internal panic'), 'Không lưu được đơn.')
    ).toBe('Không lưu được đơn.');
  });
});

describe('POS draft persistence & decimal quantity helpers (pos-draft)', () => {
  it('sanitizes malformed cart drafts, deduplicates keys, and preserves valid values', () => {
    expect(sanitizePosDraft(null)).toEqual(EMPTY_POS_DRAFT);
    expect(sanitizeCartItem({ key: '', product_name: 'A', unit_price: 1000, quantity: 1 })).toBeNull();
    expect(
      sanitizeCartItem({ key: 'k1', product_name: 'A', unit_price: -50, quantity: 1 })
    ).toBeNull();
    expect(sanitizeCartItem({ key: 'k1', product_name: 'A', unit_price: 1000, quantity: 0 })).toBeNull();

    const cleaned = sanitizePosDraft({
      cart: [
        {
          key: 'p1',
          product_id: 'p1',
          product_name: ' Mật ong 500ml ',
          unit: 'chai',
          unit_price: 240000,
          cost_price: 170000,
          quantity: 1.5,
        },
        {
          key: 'p1',
          product_id: 'p1',
          product_name: 'Duplicate',
          unit: 'chai',
          unit_price: 100,
          cost_price: null,
          quantity: 2,
        },
        { key: 'bad', product_name: '', unit_price: 100, quantity: -1 },
      ],
      discount: 15000.4,
      selectedCustomerId: 'cust-1',
    });

    expect(cleaned.cart).toHaveLength(1);
    expect(cleaned.cart[0].product_name).toBe('Mật ong 500ml');
    expect(cleaned.discount).toBe(15000);
    expect(cleaned.selectedCustomerId).toBe('cust-1');
    expect(getPosDraftStorageKey('user-99')).toBe('paytrack:pos-draft:user-99');
  });

  it('allows clearing and decimal typing without trapping backspace', () => {
    expect(sanitizeQtyInput('')).toBe('');
    expect(sanitizeQtyInput('2,5')).toBe('2.5');
    expect(sanitizeQtyInput('1.2.3abc')).toBe('1.23');
    expect(parseQtyDraft('')).toBeNull();
    expect(parseQtyDraft('.')).toBeNull();
    expect(parseQtyDraft('0')).toBeNull();
    expect(parseQtyDraft('2,5')).toBe(2.5);
    expect(parseQtyDraft('3.456')).toBe(3.46);
    expect(formatQtyForInput(2.5)).toBe('2.5');
    expect(formatQtyForInput(0)).toBe('1');
  });
});

describe('P0 & P1 POS checkout, draft cart, and input hardening regressions', () => {
  it('keys CheckoutModalBody strictly by sessionId (never items.length) and freezes orderItems', () => {
    const checkout = readRel('src/components/pos/CheckoutModal.tsx');
    expect(checkout).toContain('<CheckoutModalBody key={props.sessionId}');
    expect(checkout).not.toContain('props.items.length');
    expect(checkout).toContain('orderItems.length === 0');
    expect(checkout).toContain('Đổi khách');
    expect(checkout).toContain('Chọn khách');
    expect(checkout).toContain('Tạo mới');
  });

  it('persists cart draft via PosDataProvider, resets customer after save, and separates discountInputId', () => {
    const page = readRel('src/app/(app)/page.tsx');
    expect(page).toContain('resetOrderDraftAfterSave()');
    expect(page).toContain('checkoutSessionId');
    expect(page).toContain('discountInputId="cart-discount-desktop"');
    expect(page).toContain('discountInputId="cart-discount-mobile"');
    expect(page).toContain('Hoàn tác');

    const provider = readRel('src/components/providers/PosDataProvider.tsx');
    expect(provider).toContain('useSyncExternalStore');
    expect(provider).toContain('resetOrderDraftAfterSave');
  });

  it('uses QtyNumberInput in ProductCatalog and CartPanel, 2-tap clear confirm, and unmounts QuickItemModalBody on close', () => {
    const catalog = readRel('src/components/pos/ProductCatalog.tsx');
    expect(catalog).toContain('<QtyNumberInput');
    expect(catalog).toContain('Xem tất cả');

    const cart = readRel('src/components/pos/CartPanel.tsx');
    expect(cart).toContain('<QtyNumberInput');
    expect(cart).toContain('Xác nhận xóa');

    const quick = readRel('src/components/pos/QuickItemModal.tsx');
    expect(quick).toContain('if (!props.open) return null;');
    expect(quick).toContain('<QuickItemModalBody');
  });
});
