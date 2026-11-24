import { describe, expect, it } from 'vitest';
import {
  buildZaloDebtMessage,
  computeLineTotal,
  computeOrderTotals,
  formatVND,
  stripVietnamese,
} from '@/lib/vietnamese';

describe('vietnamese utilities & VND rounding', () => {
  it('strips Vietnamese diacritics and đ/Đ accurately', () => {
    expect(stripVietnamese('Nước Mắm Nam Ngư 750ml')).toBe('nuoc mam nam ngu 750ml');
    expect(stripVietnamese('Đường Trắng Biên Hòa')).toBe('duong trang bien hoa');
    expect(stripVietnamese('  Cô Lan - Gạo ST25  ')).toBe('co lan - gao st25');
  });

  it('rounds fractional quantity line totals to nearest integer VND', () => {
    expect(computeLineTotal(0.5, 25000)).toBe(12500);
    expect(computeLineTotal(1.25, 33333)).toBe(41666);
    expect(computeLineTotal(0.3, 10005)).toBe(3002); // 3001.5 -> 3002
    expect(computeLineTotal(2, 18500)).toBe(37000);
  });

  it('computes subtotal, capped discount, and total cleanly', () => {
    const res = computeOrderTotals(
      [
        { quantity: 0.5, unit_price: 45000 }, // 22500
        { quantity: 2, unit_price: 18000 }, // 36000
      ],
      5000
    );
    expect(res).toEqual({ subtotal: 58500, discount: 5000, total: 53500 });

    const capped = computeOrderTotals([{ quantity: 1, unit_price: 20000 }], 50000);
    expect(capped).toEqual({ subtotal: 20000, discount: 20000, total: 0 });
  });

  it('formats VND amounts with dot separators', () => {
    expect(formatVND(185000)).toBe('185.000đ');
    expect(formatVND(0)).toBe('0đ');
  });

  it('builds polite Zalo debt reminder text with order codes and bank info', () => {
    const msg = buildZaloDebtMessage({
      shopName: 'Tạp Hóa Cô Hai',
      customerName: 'Cô Lan',
      amount: 370000,
      bankName: 'Vietcombank',
      accountNo: '0123456789',
      accountName: 'NGUYEN THI HAI',
      memo: 'PT NO CO LAN',
      orderCodes: ['DH-20261116-0001', 'DH-20261116-0002'],
    });
    expect(msg).toContain('370.000đ');
    expect(msg).toContain('0123456789');
    expect(msg).toContain('PT NO CO LAN');
    expect(msg).toContain('DH-20261116-0001');
  });

  it('uses polite anh/chị salutation when customerName is generic walk-in', () => {
    const walkIn = buildZaloDebtMessage({
      shopName: 'Shop của Mẹ',
      customerName: 'Khách lẻ',
      amount: 150000,
      memo: 'PT DH-01',
    });
    expect(walkIn).toContain('Dạ anh/chị ơi');
    expect(walkIn).toContain('Cảm ơn anh/chị nhiều ạ!');
    expect(walkIn).not.toContain('Khách lẻ ơi');

    const generic = buildZaloDebtMessage({
      shopName: 'Shop của Mẹ',
      customerName: 'Khách hàng',
      amount: 150000,
      memo: 'PT DH-02',
    });
    expect(generic).toContain('Dạ anh/chị ơi');
    expect(generic).not.toContain('Khách hàng ơi');
  });
});
