import { toVnDateInput } from '@/lib/ledger';
import { getTodayVN, stripVietnamese } from '@/lib/vietnamese';
import type { Customer, Order, PaymentMethod, PaymentStatus, Product } from '@/types/database';
import {
  SUMMARY_ITEM_LABELS,
  detectColumns,
  detectLikelyCsvUnitMode,
  inferDefaultCsvYear,
  parseCsvDateCell,
  parseCsvMatrix,
  parseCsvMoneyCell,
  resolveCsvPaymentAccount,
} from './parsers';
import type {
  CsvImportOptions,
  CsvImportPreview,
  CsvImportTotals,
  DetectedColumns,
  ParsedCsvRow,
  PlannedImportCustomer,
  PlannedImportItem,
  PlannedImportOrder,
  PlannedImportProduct,
  SkippedCsvRow,
} from './types';

export function buildOrderFingerprint(params: {
  vnDate: string;
  normalizedCustomerName: string | null;
  totalAmount: number;
  paidAmount: number;
  items: Array<{ productName: string; unitPrice: number; costPrice?: number | null }>;
}): string {
  const custKey = params.normalizedCustomerName || 'khach-le';
  const itemSigs = params.items
    .map(
      (item) =>
        `${stripVietnamese(item.productName)}:${Math.round(item.unitPrice)}:${Math.round(item.costPrice ?? 0)}`
    )
    .sort()
    .join(',');
  return `${params.vnDate}|${custKey}|${Math.round(params.totalAmount)}|${Math.round(params.paidAmount)}|${itemSigs}`;
}

export function buildExistingOrderFingerprint(
  order: Pick<
    Order,
    'purchased_at' | 'created_at' | 'customer_name_snapshot' | 'total_amount' | 'paid_amount' | 'order_items'
  >
): string {
  const vnDate = toVnDateInput(order.purchased_at || order.created_at);
  const custNorm = stripVietnamese(order.customer_name_snapshot || '');
  const normalizedCustomerName = !custNorm || custNorm === 'khach le' ? null : custNorm;

  const items = (order.order_items ?? []).map((item) => ({
    productName: item.product_name,
    unitPrice: Number(item.unit_price),
    costPrice: item.cost_price !== null && item.cost_price !== undefined ? Number(item.cost_price) : 0,
  }));

  return buildOrderFingerprint({
    vnDate,
    normalizedCustomerName,
    totalAmount: Number(order.total_amount),
    paidAmount: Number(order.paid_amount),
    items,
  });
}

function sumOrderTotals(orders: PlannedImportOrder[]): CsvImportTotals {
  let totalRevenue = 0;
  let totalCost = 0;
  let totalPaid = 0;
  let totalDebt = 0;

  for (const order of orders) {
    totalRevenue += order.totalAmount;
    totalCost += order.totalCost;
    totalPaid += order.paidAmount;
    totalDebt += order.remainingAmount;
  }

  return {
    totalRevenue,
    totalCost,
    totalProfit: totalRevenue - totalCost,
    totalPaid,
    totalDebt,
  };
}

function extractParsedRows(
  matrix: string[][],
  cols: DetectedColumns,
  options: CsvImportOptions,
  todayVN: string
): {
  parsedRows: ParsedCsvRow[];
  skippedRows: SkippedCsvRow[];
  fallbackDateLines: number[];
  ignoredSummaryRowCount: number;
} {
  const parsedRows: ParsedCsvRow[] = [];
  const skippedRows: SkippedCsvRow[] = [];
  const fallbackDateLines: number[] = [];
  let ignoredSummaryRowCount = 0;
  let carriedDate: string | null = null;

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    const lineNumber = i + 1;

    if (row.every((c) => !c.trim())) {
      continue;
    }

    const rawDate = cols.date >= 0 ? (row[cols.date] ?? '').trim() : '';
    const rawItem = cols.item >= 0 ? (row[cols.item] ?? '').trim() : '';
    const rawOut = cols.out >= 0 ? (row[cols.out] ?? '').trim() : '';
    const rawIn = cols.in >= 0 ? (row[cols.in] ?? '').trim() : '';
    const rawDebt = cols.debt >= 0 ? (row[cols.debt] ?? '').trim() : '';
    const rawCustomer = cols.customer >= 0 ? (row[cols.customer] ?? '').trim() : '';
    const rawReceiver = cols.receiver >= 0 ? (row[cols.receiver] ?? '').trim() : '';
    const rawStatus = cols.status >= 0 ? (row[cols.status] ?? '').trim() : '';

    // Detect bottom summary / totals row (no Date, no Item, numeric totals)
    const itemNorm = stripVietnamese(rawItem);
    const hasNumericTotals = Boolean(rawOut || rawIn || rawDebt);
    if ((!rawDate && !rawItem && hasNumericTotals) || SUMMARY_ITEM_LABELS.has(itemNorm)) {
      ignoredSummaryRowCount++;
      continue;
    }

    // Carry forward date from previous non-empty date row
    let rowDate: string | null = null;
    let usedFallbackToday = false;
    if (rawDate) {
      rowDate = parseCsvDateCell(rawDate, options.year);
      if (!rowDate) {
        skippedRows.push({
          lineNumber,
          rawSummary: rawItem || rawDate,
          reason: `Ngày "${rawDate}" không hợp lệ`,
          kind: 'invalid',
        });
        continue;
      }
      carriedDate = rowDate;
    } else if (carriedDate) {
      rowDate = carriedDate;
    } else {
      rowDate = todayVN;
      usedFallbackToday = true;
    }

    if (!rawItem) {
      skippedRows.push({
        lineNumber,
        rawSummary: rawCustomer || `Dòng ${lineNumber}`,
        reason: 'Thiếu tên món hàng',
        kind: 'incomplete',
      });
      continue;
    }

    const outVal = parseCsvMoneyCell(rawOut, options.unitMode);
    const inVal = parseCsvMoneyCell(rawIn, options.unitMode);
    const debtVal = parseCsvMoneyCell(rawDebt, options.unitMode);

    if (Number.isNaN(outVal) || Number.isNaN(inVal) || Number.isNaN(debtVal)) {
      skippedRows.push({
        lineNumber,
        rawSummary: rawItem,
        reason: 'Giá trị tiền không hợp lệ (chỉ nhập số không âm)',
        kind: 'invalid',
      });
      continue;
    }

    const costVnd = outVal ?? 0;
    const paidVnd = inVal ?? 0;
    const debtVnd = debtVal ?? 0;
    const sellingPriceVnd = paidVnd + debtVnd;

    if (sellingPriceVnd <= 0) {
      skippedRows.push({
        lineNumber,
        rawSummary: rawItem,
        reason: rawCustomer ? 'Thiếu giá bán (In / Tồn)' : 'Thiếu giá bán và tên khách hàng',
        kind: 'incomplete',
      });
      continue;
    }

    const customerName = rawCustomer || null;
    if (debtVnd > 0 && !customerName) {
      skippedRows.push({
        lineNumber,
        rawSummary: rawItem,
        reason: 'Đơn còn nợ (Tồn) bắt buộc phải có tên khách hàng',
        kind: 'invalid',
      });
      continue;
    }

    if (usedFallbackToday) {
      fallbackDateLines.push(lineNumber);
    }

    const { paymentAccount, paymentAccountNote } = resolveCsvPaymentAccount(rawReceiver);

    parsedRows.push({
      lineNumber,
      vnDate: rowDate,
      itemName: rawItem,
      normalizedItemName: itemNorm,
      costVnd,
      paidVnd,
      debtVnd,
      sellingPriceVnd,
      customerName,
      normalizedCustomerName: customerName ? stripVietnamese(customerName) : null,
      paymentAccount,
      paymentAccountNote,
      statusText: rawStatus || null,
    });
  }

  return { parsedRows, skippedRows, fallbackDateLines, ignoredSummaryRowCount };
}

function buildPlannedProducts(
  parsedRows: ParsedCsvRow[],
  existingProductNorms: Set<string>
): PlannedImportProduct[] {
  const productMap = new Map<string, PlannedImportProduct>();
  for (const row of parsedRows) {
    const existing = productMap.get(row.normalizedItemName);
    if (!existing) {
      productMap.set(row.normalizedItemName, {
        name: row.itemName,
        normalizedName: row.normalizedItemName,
        unit: 'cái',
        price: row.sellingPriceVnd,
        costPrice: row.costVnd > 0 ? row.costVnd : null,
        isNew: !existingProductNorms.has(row.normalizedItemName),
      });
    } else if (row.sellingPriceVnd < existing.price) {
      existing.price = row.sellingPriceVnd;
      existing.costPrice = row.costVnd > 0 ? row.costVnd : existing.costPrice;
    }
  }
  return Array.from(productMap.values());
}

function buildPlannedOrders(
  parsedRows: ParsedCsvRow[],
  groupSameDayOrders: boolean,
  existingOrderFingerprints: Set<string>
): PlannedImportOrder[] {
  const groupedEntries: Array<{ rows: ParsedCsvRow[] }> = [];
  if (groupSameDayOrders) {
    const groupMap = new Map<string, { rows: ParsedCsvRow[] }>();
    for (const row of parsedRows) {
      const rowStatus: Exclude<PaymentStatus, 'cancelled'> =
        row.debtVnd === 0 ? 'paid' : row.paidVnd > 0 ? 'partial' : 'unpaid';
      const key = [
        row.vnDate,
        row.normalizedCustomerName ?? '__walkin__',
        rowStatus,
        row.paymentAccount ?? '',
        row.paymentAccountNote ?? '',
      ].join('|');

      let bucket = groupMap.get(key);
      if (!bucket) {
        bucket = { rows: [] };
        groupMap.set(key, bucket);
        groupedEntries.push(bucket);
      }
      bucket.rows.push(row);
    }
  } else {
    for (const row of parsedRows) {
      groupedEntries.push({ rows: [row] });
    }
  }

  return groupedEntries.map(({ rows }) => {
    const first = rows[0];
    const totalAmount = rows.reduce((sum, r) => sum + r.sellingPriceVnd, 0);
    const totalCost = rows.reduce((sum, r) => sum + r.costVnd, 0);
    const paidAmount = rows.reduce((sum, r) => sum + r.paidVnd, 0);
    const remainingAmount = totalAmount - paidAmount;

    const paymentStatus: Exclude<PaymentStatus, 'cancelled'> =
      remainingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    const paymentMethod: PaymentMethod =
      paymentStatus === 'paid'
        ? first.paymentAccount
          ? 'transfer'
          : 'cash'
        : paymentStatus === 'partial'
          ? 'mixed'
          : 'debt';

    const purchasedAtIso = `${first.vnDate}T12:00:00+07:00`;
    const paidAtIso = paymentStatus === 'paid' ? purchasedAtIso : null;

    const items: PlannedImportItem[] = rows.map((r) => ({
      productName: r.itemName,
      normalizedProductName: r.normalizedItemName,
      unit: 'cái',
      unitPrice: r.sellingPriceVnd,
      costPrice: r.costVnd,
      quantity: 1,
    }));

    const statuses = Array.from(new Set(rows.map((r) => r.statusText).filter(Boolean)));
    const note = statuses.length > 0 ? `Nhập CSV (${statuses.join(', ')})` : 'Nhập từ CSV';

    const fingerprint = buildOrderFingerprint({
      vnDate: first.vnDate,
      normalizedCustomerName: first.normalizedCustomerName,
      totalAmount,
      paidAmount,
      items,
    });

    return {
      fingerprint,
      vnDate: first.vnDate,
      purchasedAtIso,
      customerName: first.customerName,
      normalizedCustomerName: first.normalizedCustomerName,
      paymentStatus,
      paymentMethod,
      paymentAccount: first.paymentAccount,
      paymentAccountNote: first.paymentAccountNote,
      totalAmount,
      totalCost,
      paidAmount,
      remainingAmount,
      paidAtIso,
      note,
      items,
      sourceLines: rows.map((r) => r.lineNumber),
      isDuplicate: existingOrderFingerprints.has(fingerprint),
    };
  });
}

function buildPlannedCustomers(
  plannedOrders: PlannedImportOrder[],
  existingCustomerNorms: Set<string>,
  skipDuplicates: boolean
): PlannedImportCustomer[] {
  const customerMap = new Map<string, PlannedImportCustomer>();
  for (const order of plannedOrders) {
    if (!order.customerName || !order.normalizedCustomerName) continue;
    let entry = customerMap.get(order.normalizedCustomerName);
    if (!entry) {
      entry = {
        name: order.customerName,
        normalizedName: order.normalizedCustomerName,
        isNew: !existingCustomerNorms.has(order.normalizedCustomerName),
        orderCount: 0,
        debtToAdd: 0,
      };
      customerMap.set(order.normalizedCustomerName, entry);
    }
    entry.orderCount++;
    if (!skipDuplicates || !order.isDuplicate) {
      entry.debtToAdd += order.remainingAmount;
    }
  }
  return Array.from(customerMap.values());
}

export function buildCsvImportPreview(params: {
  csvText: string;
  options: CsvImportOptions;
  existingCustomers?: Array<Pick<Customer, 'name'>>;
  existingProducts?: Array<Pick<Product, 'name'>>;
  existingOrders?: Array<
    Pick<
      Order,
      | 'payment_status'
      | 'purchased_at'
      | 'created_at'
      | 'customer_name_snapshot'
      | 'total_amount'
      | 'paid_amount'
      | 'order_items'
    >
  >;
  todayVN?: string;
}): CsvImportPreview {
  const todayVN = params.todayVN ?? getTodayVN();
  const inferredYear = inferDefaultCsvYear(params.csvText, todayVN);
  const detectedUnitMode = detectLikelyCsvUnitMode(params.csvText);
  const emptyTotals: CsvImportTotals = {
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalPaid: 0,
    totalDebt: 0,
  };

  const makeError = (error: string): CsvImportPreview => ({
    ok: false,
    error,
    validRowCount: 0,
    plannedOrders: [],
    newOrders: [],
    duplicateOrderCount: 0,
    plannedCustomers: [],
    newCustomerCount: 0,
    matchedCustomerCount: 0,
    plannedProducts: [],
    newProductCount: 0,
    matchedProductCount: 0,
    skippedRows: [],
    notices: [],
    ignoredSummaryRowCount: 0,
    totals: emptyTotals,
    newOrdersTotals: emptyTotals,
    inferredYear,
    detectedUnitMode,
  });

  if (!params.csvText.trim()) {
    return makeError('File CSV trống, vui lòng chọn file có dữ liệu.');
  }

  const matrix = parseCsvMatrix(params.csvText);
  if (matrix.length < 2) {
    return makeError('File CSV không có dòng dữ liệu nào.');
  }

  const cols = detectColumns(matrix[0]);
  if (!cols) {
    return makeError(
      'Không nhận diện được cột của file CSV. File cần có cột Item (món hàng) và cột In hoặc Tồn (giá bán).'
    );
  }

  const { parsedRows, skippedRows, fallbackDateLines, ignoredSummaryRowCount } = extractParsedRows(
    matrix,
    cols,
    params.options,
    todayVN
  );

  if (parsedRows.length === 0) {
    return {
      ...makeError('Không tìm thấy dòng đơn hàng hợp lệ nào để nhập.'),
      skippedRows,
      ignoredSummaryRowCount,
    };
  }

  const existingCustomerNorms = new Set(
    (params.existingCustomers ?? []).map((c) => stripVietnamese(c.name))
  );
  const existingProductNorms = new Set(
    (params.existingProducts ?? []).map((p) => stripVietnamese(p.name))
  );
  const existingOrderFingerprints = new Set(
    (params.existingOrders ?? [])
      .filter((o) => o.payment_status !== 'cancelled')
      .map((o) => buildExistingOrderFingerprint(o))
  );

  const plannedProducts = buildPlannedProducts(parsedRows, existingProductNorms);
  const plannedOrders = buildPlannedOrders(
    parsedRows,
    params.options.groupSameDayOrders,
    existingOrderFingerprints
  );
  const newOrders = params.options.skipDuplicates
    ? plannedOrders.filter((o) => !o.isDuplicate)
    : plannedOrders;
  const duplicateOrderCount = plannedOrders.filter((o) => o.isDuplicate).length;
  const plannedCustomers = buildPlannedCustomers(
    plannedOrders,
    existingCustomerNorms,
    params.options.skipDuplicates
  );

  const notices: string[] = [];
  if (fallbackDateLines.length > 0) {
    const previewLines = fallbackDateLines.slice(0, 3).join(', ');
    const suffix = fallbackDateLines.length > 3 ? '...' : '';
    notices.push(
      `Có ${fallbackDateLines.length} dòng đầu chưa ghi ngày (dòng ${previewLines}${suffix}), hệ thống tạm lấy ngày hôm nay (${todayVN}).`
    );
  }

  return {
    ok: true,
    error: null,
    validRowCount: parsedRows.length,
    plannedOrders,
    newOrders,
    duplicateOrderCount,
    plannedCustomers,
    newCustomerCount: plannedCustomers.filter((c) => c.isNew).length,
    matchedCustomerCount: plannedCustomers.filter((c) => !c.isNew).length,
    plannedProducts,
    newProductCount: plannedProducts.filter((p) => p.isNew).length,
    matchedProductCount: plannedProducts.filter((p) => !p.isNew).length,
    skippedRows,
    notices,
    ignoredSummaryRowCount,
    totals: sumOrderTotals(plannedOrders),
    newOrdersTotals: sumOrderTotals(newOrders),
    inferredYear,
    detectedUnitMode,
  };
}
