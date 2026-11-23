import { describe, expect, it } from 'vitest';
import {
  PAYMENT_ACCOUNTS,
  buildLedgerCsv,
  computeItemsCostTotal,
  computeLedgerTotals,
  computeOrderProfit,
  computeVnDatePresetRange,
  dateInputToVnIso,
  formatPaymentAccount,
  hasMissingCostPrice,
  isOrderInVnDateRange,
  isPaymentAccount,
  resolveOrderPaidAt,
  summarizeOrderItems,
  toVnDateInput,
} from '@/lib/ledger';
import type { Order } from '@/types/database';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-1',
    user_id: 'user-1',
    order_code: 'DH-20261123-0001',
    customer_id: 'cust-1',
    customer_name_snapshot: 'Cô Lan',
    customer_address_snapshot: '12 Lê Lợi',
    customer_phone_snapshot: '0901234567',
    purchased_at: '2026-11-23T03:00:00.000Z',
    subtotal: 250_000,
    discount_amount: 0,
    total_amount: 250_000,
    total_cost: 180_000,
    paid_amount: 250_000,
    remaining_amount: 0,
    previous_customer_debt: 0,
    payment_status: 'paid',
    payment_method: 'transfer',
    payment_account: 'Thuỳ Trang',
    payment_account_note: null,
    paid_at: '2026-11-23T03:00:00.000Z',
    debt_due_date: null,
    note: null,
    created_at: '2026-11-23T03:00:00.000Z',
    updated_at: '2026-11-23T03:00:00.000Z',
    order_items: [
      {
        id: 'item-1',
        user_id: 'user-1',
        order_id: 'ord-1',
        product_id: 'prod-1',
        product_name: 'Gạo ST25',
        unit: 'túi',
        unit_price: 125_000,
        cost_price: 90_000,
        quantity: 2,
        line_total: 250_000,
      },
    ],
    ...overrides,
  };
}

describe('12-field sales ledger utilities', () => {
  it('defines the exact 9 canonical payment accounts', () => {
    expect(PAYMENT_ACCOUNTS).toEqual([
      'Thanh',
      'Phú',
      'Trang',
      'Trang Lê',
      'Thuỳ Trang',
      'Thuỷ',
      'Kiều Thương',
      'Vận chuyển',
      'Khác',
    ]);
    expect(isPaymentAccount('Thuỳ Trang')).toBe(true);
    expect(isPaymentAccount('Thuỷ')).toBe(true);
    expect(isPaymentAccount('Ngân hàng khác')).toBe(false);
  });

  it('formats payment accounts including Khác with custom note', () => {
    expect(formatPaymentAccount('Thanh')).toBe('Thanh');
    expect(formatPaymentAccount('Khác', 'Momo cô Ba')).toBe('Khác: Momo cô Ba');
    expect(formatPaymentAccount('Khác', '   ')).toBe('Khác');
    expect(formatPaymentAccount(null)).toBe('—');
  });

  it('summarizes order items cleanly with compact quantities', () => {
    expect(
      summarizeOrderItems([
        { product_name: 'Gạo ST25', quantity: 2 },
        { product_name: 'Thịt ba rọi', quantity: 0.5 },
        { product_name: 'Nước mắm', quantity: 1 },
      ])
    ).toBe('Gạo ST25 ×2, Thịt ba rọi ×0.5, Nước mắm ×1');

    expect(
      summarizeOrderItems(
        [
          { product_name: 'Gạo ST25', quantity: 2 },
          { product_name: 'Thịt ba rọi', quantity: 0.5 },
          { product_name: 'Nước mắm', quantity: 1 },
        ],
        2
      )
    ).toBe('Gạo ST25 ×2, Thịt ba rọi ×0.5 (+1)');
    expect(summarizeOrderItems([])).toBe('—');
  });

  it('computes order profit & ledger totals while strictly excluding cancelled orders', () => {
    const paidOrder = makeOrder({ total_amount: 250_000, total_cost: 180_000, payment_status: 'paid' });
    const unpaidOrder = makeOrder({
      id: 'ord-2',
      total_amount: 100_000,
      total_cost: 70_000,
      paid_amount: 0,
      remaining_amount: 100_000,
      payment_status: 'unpaid',
    });
    const cancelledOrder = makeOrder({
      id: 'ord-3',
      total_amount: 500_000,
      total_cost: 300_000,
      paid_amount: 0,
      remaining_amount: 500_000,
      payment_status: 'cancelled',
    });

    expect(computeOrderProfit(paidOrder)).toBe(70_000);
    expect(computeOrderProfit(cancelledOrder)).toBe(0);

    const totals = computeLedgerTotals([paidOrder, unpaidOrder, cancelledOrder]);
    expect(totals).toEqual({
      activeCount: 2,
      cancelledCount: 1,
      totalRevenue: 350_000,
      totalCost: 250_000,
      totalProfit: 100_000,
      totalRemainingDebt: 100_000,
    });
  });

  it('detects missing item cost prices and computes item cost totals accurately', () => {
    const complete = makeOrder();
    expect(hasMissingCostPrice(complete)).toBe(false);
    expect(computeItemsCostTotal(complete.order_items)).toBe(180_000);

    const missing = makeOrder({
      total_cost: 0,
      order_items: [
        {
          id: 'item-2',
          user_id: 'user-1',
          order_id: 'ord-1',
          product_id: null,
          product_name: 'Rau',
          unit: 'bó',
          unit_price: 15_000,
          cost_price: null,
          quantity: 2,
          line_total: 30_000,
        },
      ],
    });
    expect(hasMissingCostPrice(missing)).toBe(true);
  });

  it('resolves paid_at only when status is paid and converts VN date inputs without day shift', () => {
    const purchasedAt = '2026-11-20T05:00:00.000Z';
    expect(resolveOrderPaidAt({ paymentStatus: 'paid', purchasedAt })).toBe(purchasedAt);
    expect(
      resolveOrderPaidAt({
        paymentStatus: 'paid',
        explicitPaidAt: '2026-11-22T05:00:00.000Z',
        purchasedAt,
      })
    ).toBe('2026-11-22T05:00:00.000Z');
    expect(resolveOrderPaidAt({ paymentStatus: 'partial', purchasedAt })).toBeNull();
    expect(resolveOrderPaidAt({ paymentStatus: 'unpaid', purchasedAt })).toBeNull();

    const iso = dateInputToVnIso('2026-11-18', new Date('2026-11-23T04:00:00.000Z'));
    expect(iso).not.toBeNull();
    expect(toVnDateInput(iso)).toBe('2026-11-18');
  });

  it('exports a 12-column UTF-8 BOM CSV with escaped commas and quotes', () => {
    const order = makeOrder({
      customer_address_snapshot: 'Số 5, ngõ "Xanh"',
      payment_account: 'Khác',
      payment_account_note: 'Tiền mặt, cô Ba',
    });
    const csv = buildLedgerCsv([order]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('STT,Họ tên người mua,Địa chỉ,SĐT,Ngày mua hàng,Món hàng');
    expect(lines[1]).toContain('"Số 5, ngõ ""Xanh"""');
    expect(lines[1]).toContain('"Khác: Tiền mặt, cô Ba"');
    expect(lines[1]).toContain('180000,250000,70000');
  });

  it('computes Asia/Ho_Chi_Minh date preset ranges and filters order timestamps accurately', () => {
    // 2026-11-23 11:00 VN time
    const refNow = new Date('2026-11-23T04:00:00.000Z');
    expect(computeVnDatePresetRange('all', undefined, undefined, refNow)).toEqual({
      start: null,
      end: null,
    });
    expect(computeVnDatePresetRange('today', undefined, undefined, refNow)).toEqual({
      start: '2026-11-23',
      end: '2026-11-23',
    });
    expect(computeVnDatePresetRange('7d', undefined, undefined, refNow)).toEqual({
      start: '2026-11-17',
      end: '2026-11-23',
    });
    expect(computeVnDatePresetRange('month', undefined, undefined, refNow)).toEqual({
      start: '2026-11-01',
      end: '2026-11-23',
    });
    // Auto-swaps reversed custom bounds
    expect(computeVnDatePresetRange('custom', '2026-11-25', '2026-11-20', refNow)).toEqual({
      start: '2026-11-20',
      end: '2026-11-25',
    });

    const weekRange = computeVnDatePresetRange('7d', undefined, undefined, refNow);
    // 2026-11-16T18:00Z is 2026-11-17 01:00 VN -> inside 7d range
    expect(isOrderInVnDateRange('2026-11-16T18:00:00.000Z', weekRange)).toBe(true);
    // 2026-11-16T16:59Z is 2026-11-16 23:59 VN -> outside 7d range
    expect(isOrderInVnDateRange('2026-11-16T16:59:00.000Z', weekRange)).toBe(false);
    expect(isOrderInVnDateRange('2026-11-23T03:00:00.000Z', weekRange)).toBe(true);
    expect(isOrderInVnDateRange('2026-11-24T03:00:00.000Z', weekRange)).toBe(false);
  });
});
