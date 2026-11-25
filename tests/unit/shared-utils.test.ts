import { describe, expect, it } from 'vitest';
import {
  buildCustomerSearchText,
  filterCustomersByQuery,
  resolveOrStubOrderCustomer,
} from '@/lib/customers';
import { computeVnDatePresetIsoRange, computeVnDatePresetRange } from '@/lib/ledger';
import type { Customer, Order } from '@/types/database';

function makeCustomer(overrides: Partial<Customer>): Customer {
  return {
    id: 'cust-1',
    user_id: 'user-1',
    name: 'Nguyễn Thị Lan',
    search_text: 'nguyen thi lan 0901234567 quan 3',
    phone: '0901234567',
    address: 'Quận 3, TP.HCM',
    note: 'Khách quen',
    total_debt: 0,
    next_due_date: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

describe('Shared customer helpers (src/lib/customers.ts)', () => {
  it('builds normalized diacritic-free search_text', () => {
    expect(buildCustomerSearchText('Cô Lan', '0909 123', 'Đường 3/2')).toBe(
      'co lan 0909 123 duong 3/2'
    );
  });

  it('filters customers across Vietnamese diacritics, phone, address, and optional limit', () => {
    const list = [
      makeCustomer({ id: 'c1', name: 'Cô Lan', phone: '0901111111', address: 'Quận 1' }),
      makeCustomer({ id: 'c2', name: 'Chị Hoa', phone: '0902222222', address: 'Bình Thạnh' }),
      makeCustomer({ id: 'c3', name: 'Anh Lâm', phone: '0903333333', address: 'Quận 1' }),
    ];

    expect(filterCustomersByQuery(list, '', 2).map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(filterCustomersByQuery(list, 'binh thanh').map((c) => c.id)).toEqual(['c2']);
    expect(filterCustomersByQuery(list, '090333').map((c) => c.id)).toEqual(['c3']);
    expect(filterCustomersByQuery(list, 'quan 1', 1).map((c) => c.id)).toEqual(['c1']);
  });

  it('resolves cached customer or synthesizes a safe Customer stub from an order', () => {
    const existing = makeCustomer({ id: 'c-existing', name: 'Chị Mai', total_debt: 500000 });
    const baseOrder: Order = {
      id: 'ord-1',
      user_id: 'user-1',
      order_code: 'DH-20261125-0001',
      customer_id: 'c-existing',
      customer_name_snapshot: 'Chị Mai',
      customer_address_snapshot: 'Hà Nội',
      customer_phone_snapshot: '0911222333',
      subtotal: 200000,
      discount_amount: 0,
      total_amount: 200000,
      total_cost: 120000,
      paid_amount: 0,
      remaining_amount: 200000,
      previous_customer_debt: 300000,
      payment_status: 'unpaid',
      payment_method: 'debt',
      payment_account: null,
      payment_account_note: null,
      debt_due_date: '2026-12-01',
      purchased_at: '2026-11-25T05:00:00Z',
      paid_at: null,
      note: null,
      created_at: '2026-11-25T05:00:00Z',
      updated_at: '2026-11-25T05:00:00Z',
    };

    expect(resolveOrStubOrderCustomer(baseOrder, [existing])).toBe(existing);
    expect(resolveOrStubOrderCustomer({ ...baseOrder, customer_id: null }, [existing])).toBeNull();

    const stub = resolveOrStubOrderCustomer({ ...baseOrder, customer_id: 'c-missing' }, [existing]);
    expect(stub).not.toBeNull();
    expect(stub?.id).toBe('c-missing');
    expect(stub?.name).toBe('Chị Mai');
    expect(stub?.total_debt).toBe(200000);
    expect(stub?.search_text).toContain('chi mai');
  });
});

describe('Unified VN date range presets (30d & ISO boundaries)', () => {
  it('computes exact timezone-safe 7d and 30d ranges in Asia/Ho_Chi_Minh without UTC day shift', () => {
    // 2026-11-25 00:30 VN time (still 2026-11-24 17:30 UTC)
    const ref = new Date('2026-11-25T00:30:00+07:00');
    expect(computeVnDatePresetRange('7d', undefined, undefined, ref)).toEqual({
      start: '2026-11-19',
      end: '2026-11-25',
    });
    expect(computeVnDatePresetRange('30d', undefined, undefined, ref)).toEqual({
      start: '2026-10-27',
      end: '2026-11-25',
    });
    expect(computeVnDatePresetIsoRange('30d', undefined, undefined, ref)).toEqual({
      startIso: '2026-10-27T00:00:00+07:00',
      endIso: '2026-11-25T23:59:59.999+07:00',
    });
  });

  it('swaps reversed custom date inputs safely in computeVnDatePresetIsoRange', () => {
    const ref = new Date('2026-11-25T10:00:00+07:00');
    expect(computeVnDatePresetIsoRange('custom', '2026-11-20', '2026-11-10', ref)).toEqual({
      startIso: '2026-11-10T00:00:00+07:00',
      endIso: '2026-11-20T23:59:59.999+07:00',
    });
  });
});
