import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildCsvImportPreview,
  detectLikelyCsvUnitMode,
  inferDefaultCsvYear,
  parseCsvDateCell,
  parseCsvMatrix,
  parseCsvMoneyCell,
  resolveCsvPaymentAccount,
} from '@/lib/csv-import';
import type { Order } from '@/types/database';

const SAMPLE_THUCHI_CSV = [
  '\uFEFFDate,Item ,Out,In ,Tồn ,,Customer,Người nhận CK,',
  '2/11,Kẹo gấu,355,,460,,Diệu,Kiều Thương,',
  ',Kem nẻ ,85,,145,,Diệu,Kiều Thương,',
  ',Nước hoa white tea 50ml,798,,998,,Lan Nguyễn,,',
  '3/11,Lăn chống nắng sum,175,,265,,Hương Nguyễn,Thanh ,',
  '7/11,Set son sum,225,320,,,Lan Bùi,Trần Huyền,Done',
  '10/11,Dầu gội Head,2125,,2750,,Hoàng Thuý Hà,,',
  ',Dầu gội Head,425,,530,,Coca Cola,,',
  ',2 túi mm mint,,,,,,,',
  ',,,,,,,,',
  ',,4188,320,5148,,1280,,',
].join('\r\n');

describe('csv-import parser and ThuChi.csv ledger integration', () => {
  it('parses RFC-4180 CSV with BOM, CRLF, and quoted commas', () => {
    const matrix = parseCsvMatrix('\uFEFFDate,Item,Note\r\n2/11,"Son Mac, màu đỏ","Ghi chú ""gấp"""\r\n');
    expect(matrix).toEqual([
      ['Date', 'Item', 'Note'],
      ['2/11', 'Son Mac, màu đỏ', 'Ghi chú "gấp"'],
    ]);
  });

  it('parses money cells accurately in K and VND modes', () => {
    expect(parseCsvMoneyCell('355', 'k')).toBe(355000);
    expect(parseCsvMoneyCell('355.5', 'k')).toBe(355500);
    expect(parseCsvMoneyCell('1,250', 'k')).toBe(1250000);
    expect(parseCsvMoneyCell('460.000', 'k')).toBe(460000);
    expect(parseCsvMoneyCell('460000', 'vnd')).toBe(460000);
    expect(parseCsvMoneyCell('', 'k')).toBeNull();
    expect(Number.isNaN(parseCsvMoneyCell('-10', 'k'))).toBe(true);
  });

  it('parses DD/MM and DD/MM/YYYY dates and infers year cleanly', () => {
    expect(parseCsvDateCell('2/11', 2026)).toBe('2026-11-02');
    expect(parseCsvDateCell('10/11/2025', 2026)).toBe('2025-11-10');
    expect(parseCsvDateCell('31/2', 2026)).toBeNull();
    expect(inferDefaultCsvYear(SAMPLE_THUCHI_CSV, '2026-11-25')).toBe(2026);
    expect(inferDefaultCsvYear(SAMPLE_THUCHI_CSV, '2026-01-10')).toBe(2025);
    expect(detectLikelyCsvUnitMode(SAMPLE_THUCHI_CSV)).toBe('k');
  });

  it('maps canonical payment accounts and falls back to Khác with original note', () => {
    expect(resolveCsvPaymentAccount('Thanh ')).toEqual({
      paymentAccount: 'Thanh',
      paymentAccountNote: null,
    });
    expect(resolveCsvPaymentAccount('Kiều Thương')).toEqual({
      paymentAccount: 'Kiều Thương',
      paymentAccountNote: null,
    });
    expect(resolveCsvPaymentAccount('Trần Huyền')).toEqual({
      paymentAccount: 'Khác',
      paymentAccountNote: 'Trần Huyền',
    });
    expect(resolveCsvPaymentAccount('   ')).toEqual({
      paymentAccount: null,
      paymentAccountNote: null,
    });
  });

  it('groups same-day same-customer rows, picks lowest positive product price, skips incomplete and summary rows, and preserves existing products', () => {
    const preview = buildCsvImportPreview({
      csvText: SAMPLE_THUCHI_CSV,
      options: {
        year: 2026,
        unitMode: 'k',
        groupSameDayOrders: true,
        skipDuplicates: true,
      },
      existingCustomers: [{ name: 'Diệu' }],
      existingProducts: [{ name: 'Kẹo gấu' }],
    });

    expect(preview.ok).toBe(true);
    expect(preview.validRowCount).toBe(7);
    // Diệu's 2 rows on 2/11 (Kẹo gấu + Kem nẻ) merge into 1 order -> 6 grouped orders
    expect(preview.plannedOrders).toHaveLength(6);
    expect(preview.ignoredSummaryRowCount).toBe(1);
    expect(preview.skippedRows).toHaveLength(1);
    expect(preview.skippedRows[0]).toMatchObject({
      lineNumber: 9,
      rawSummary: '2 túi mm mint',
      kind: 'incomplete',
    });

    // Existing customer & product matched without overwriting
    expect(preview.matchedCustomerCount).toBe(1);
    expect(preview.newCustomerCount).toBe(5);
    expect(preview.matchedProductCount).toBe(1);
    expect(preview.newProductCount).toBe(5);

    // Dầu gội Head appeared at 2750K (cost 2125K) and 530K (cost 425K) -> uses lowest price 530K
    const shampoo = preview.plannedProducts.find((p) => p.name === 'Dầu gội Head');
    expect(shampoo).toMatchObject({
      price: 530000,
      costPrice: 425000,
      isNew: true,
    });

    // Lan Bùi paid order maps Trần Huyền -> Khác + note
    const paidOrder = preview.plannedOrders.find((o) => o.customerName === 'Lan Bùi');
    expect(paidOrder).toMatchObject({
      vnDate: '2026-11-07',
      paymentStatus: 'paid',
      paymentMethod: 'transfer',
      paymentAccount: 'Khác',
      paymentAccountNote: 'Trần Huyền',
      totalAmount: 320000,
      paidAmount: 320000,
      remainingAmount: 0,
      totalCost: 225000,
    });
    expect(paidOrder?.paidAtIso).toBe('2026-11-07T12:00:00+07:00');

    // Exact totals reconciliation
    expect(preview.totals).toEqual({
      totalRevenue: 5468000,
      totalCost: 4188000,
      totalProfit: 1280000,
      totalPaid: 320000,
      totalDebt: 5148000,
    });

    // Re-uploading against already-imported orders skips 100% duplicates
    const existingAsDbOrders = preview.plannedOrders.map(
      (o, idx) =>
        ({
          payment_status: o.paymentStatus,
          purchased_at: o.purchasedAtIso,
          created_at: o.purchasedAtIso,
          customer_name_snapshot: o.customerName ?? 'Khách lẻ',
          total_amount: o.totalAmount,
          paid_amount: o.paidAmount,
          order_items: o.items.map((it, j) => ({
            id: `oi-${idx}-${j}`,
            user_id: 'u1',
            order_id: `o-${idx}`,
            product_id: null,
            product_name: it.productName,
            unit: it.unit,
            unit_price: it.unitPrice,
            cost_price: it.costPrice,
            quantity: it.quantity,
            line_total: it.unitPrice,
            created_at: o.purchasedAtIso,
          })),
        }) as unknown as Order
    );

    const reupload = buildCsvImportPreview({
      csvText: SAMPLE_THUCHI_CSV,
      options: {
        year: 2026,
        unitMode: 'k',
        groupSameDayOrders: true,
        skipDuplicates: true,
      },
      existingOrders: existingAsDbOrders,
    });

    expect(reupload.duplicateOrderCount).toBe(6);
    expect(reupload.newOrders).toHaveLength(0);
    expect(reupload.newOrdersTotals.totalRevenue).toBe(0);
  });

  it('supports ungrouped 1-order-per-row mode', () => {
    const preview = buildCsvImportPreview({
      csvText: SAMPLE_THUCHI_CSV,
      options: {
        year: 2026,
        unitMode: 'k',
        groupSameDayOrders: false,
        skipDuplicates: true,
      },
    });

    expect(preview.ok).toBe(true);
    expect(preview.plannedOrders).toHaveLength(7);
  });

  it('reconciles the real attached /home/antigravity/ThuChi.csv to exact VND figures when present', () => {
    const samplePath = '/home/antigravity/ThuChi.csv';
    if (!fs.existsSync(samplePath)) return;

    const csvText = fs.readFileSync(samplePath, 'utf8');
    const preview = buildCsvImportPreview({
      csvText,
      options: {
        year: 2026,
        unitMode: 'k',
        groupSameDayOrders: true,
        skipDuplicates: true,
      },
    });

    expect(preview.ok).toBe(true);
    expect(preview.validRowCount).toBe(57);
    expect(preview.plannedOrders).toHaveLength(45);
    expect(preview.plannedCustomers).toHaveLength(40);
    expect(preview.plannedProducts).toHaveLength(46);
    expect(preview.skippedRows).toHaveLength(1);
    expect(preview.skippedRows[0].lineNumber).toBe(55);
    expect(preview.ignoredSummaryRowCount).toBe(1);
    expect(preview.totals).toEqual({
      totalRevenue: 48_320_000,
      totalCost: 37_234_000,
      totalProfit: 11_086_000,
      totalPaid: 320_000,
      totalDebt: 48_000_000,
    });
  });

  it('defaults leading rows without a Date to todayVN and emits a preview warning notice', () => {
    const csv = [
      'Date,Item,Out,In,Tồn,,Customer,Người nhận CK,',
      ',Kẹo gấu,355,,460,,Diệu,Kiều Thương,',
      '3/11,Kem nẻ,85,,145,,Diệu,Kiều Thương,',
    ].join('\n');

    const preview = buildCsvImportPreview({
      csvText: csv,
      options: {
        year: 2026,
        unitMode: 'k',
        groupSameDayOrders: true,
        skipDuplicates: true,
      },
      todayVN: '2026-11-25',
    });

    expect(preview.ok).toBe(true);
    expect(preview.plannedOrders[0].vnDate).toBe('2026-11-25');
    expect(preview.plannedOrders[1].vnDate).toBe('2026-11-03');
    expect(preview.notices).toHaveLength(1);
    expect(preview.notices[0]).toContain('2026-11-25');
  });
});
