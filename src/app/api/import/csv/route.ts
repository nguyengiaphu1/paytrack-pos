import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import {
  buildCsvImportPreview,
  inferDefaultCsvYear,
  type CsvUnitMode,
} from '@/lib/csv-import';
import { formatErrorMessageVN } from '@/lib/errors';
import { stripVietnamese } from '@/lib/vietnamese';
import type { Order } from '@/types/database';

const MAX_CSV_BYTES = 2_000_000;
const MAX_ORDERS_PER_BATCH = 500;

interface ImportCsvRequestBody {
  csvText?: unknown;
  year?: unknown;
  unitMode?: unknown;
  groupSameDayOrders?: unknown;
  skipDuplicates?: unknown;
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  let body: ImportCsvRequestBody;
  try {
    body = (await request.json()) as ImportCsvRequestBody;
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  if (typeof body.csvText !== 'string' || !body.csvText.trim()) {
    return NextResponse.json({ error: 'Vui lòng chọn file CSV có dữ liệu.' }, { status: 400 });
  }

  if (new TextEncoder().encode(body.csvText).length > MAX_CSV_BYTES) {
    return NextResponse.json(
      { error: 'File CSV quá lớn (tối đa 2 MB mỗi lần nhập).' },
      { status: 400 }
    );
  }

  const inferredYear = inferDefaultCsvYear(body.csvText);
  const year =
    typeof body.year === 'number' && Number.isInteger(body.year) && body.year >= 2000 && body.year <= 2100
      ? body.year
      : inferredYear;

  const unitMode: CsvUnitMode = body.unitMode === 'vnd' ? 'vnd' : 'k';
  const groupSameDayOrders = body.groupSameDayOrders !== false;
  const skipDuplicates = body.skipDuplicates !== false;

  // Load existing account entities under RLS for accurate deduplication & preservation
  const [custRes, prodRes, orderRes] = await Promise.all([
    supabase.from('customers').select('id, name').eq('user_id', user.id),
    supabase.from('products').select('id, name').eq('user_id', user.id),
    supabase
      .from('orders')
      .select(
        'id, payment_status, purchased_at, created_at, customer_name_snapshot, total_amount, paid_amount, order_items(product_name, unit_price, cost_price)'
      )
      .eq('user_id', user.id)
      .neq('payment_status', 'cancelled')
      .limit(2000),
  ]);

  if (custRes.error || prodRes.error || orderRes.error) {
    const rawErr = custRes.error ?? prodRes.error ?? orderRes.error;
    return NextResponse.json(
      { error: formatErrorMessageVN(rawErr, 'Không tải được dữ liệu hiện có của cửa hàng.') },
      { status: 500 }
    );
  }

  const existingCustomers = (custRes.data ?? []) as Array<{ id: string; name: string }>;
  const existingProducts = (prodRes.data ?? []) as Array<{ id: string; name: string }>;
  const existingOrders = (orderRes.data ?? []) as unknown as Array<
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

  const preview = buildCsvImportPreview({
    csvText: body.csvText,
    options: { year, unitMode, groupSameDayOrders, skipDuplicates },
    existingCustomers,
    existingProducts,
    existingOrders,
  });

  if (!preview.ok) {
    return NextResponse.json(
      {
        error: preview.error ?? 'File CSV không hợp lệ.',
        warnings: preview.skippedRows.map((w) => ({
          lineNumber: w.lineNumber,
          rawSummary: w.rawSummary,
          reason: w.reason,
        })),
      },
      { status: 400 }
    );
  }

  if (preview.newOrders.length > MAX_ORDERS_PER_BATCH) {
    return NextResponse.json(
      {
        error: `Tối đa ${MAX_ORDERS_PER_BATCH} đơn mỗi lần nhập (file hiện có ${preview.newOrders.length} đơn mới). Vui lòng chia nhỏ file CSV.`,
      },
      { status: 400 }
    );
  }

  // 1. Resolve or bulk-insert missing customers
  const customerIdByNorm = new Map<string, string>(
    existingCustomers.map((c) => [stripVietnamese(c.name), c.id])
  );
  const missingCustomers = preview.plannedCustomers.filter(
    (c) => !customerIdByNorm.has(c.normalizedName)
  );

  let createdCustomers = 0;
  if (missingCustomers.length > 0) {
    const { data: insertedCusts, error: insertCustErr } = await supabase
      .from('customers')
      .insert(
        missingCustomers.map((c) => ({
          user_id: user.id,
          name: c.name,
          search_text: c.normalizedName,
          total_debt: 0,
        }))
      )
      .select('id, name');

    if (insertCustErr) {
      return NextResponse.json(
        { error: formatErrorMessageVN(insertCustErr, 'Không thể tạo danh sách khách hàng mới.') },
        { status: 500 }
      );
    }

    for (const c of (insertedCusts ?? []) as Array<{ id: string; name: string }>) {
      customerIdByNorm.set(stripVietnamese(c.name), c.id);
      createdCustomers++;
    }
  }

  // 2. Resolve or bulk-insert missing products (never overwrite existing catalog prices)
  const productIdByNorm = new Map<string, string>(
    existingProducts.map((p) => [stripVietnamese(p.name), p.id])
  );
  const missingProducts = preview.plannedProducts.filter(
    (p) => !productIdByNorm.has(p.normalizedName)
  );

  let createdProducts = 0;
  if (missingProducts.length > 0) {
    const { data: insertedProds, error: insertProdErr } = await supabase
      .from('products')
      .insert(
        missingProducts.map((p) => ({
          user_id: user.id,
          name: p.name,
          search_text: p.normalizedName,
          unit: p.unit,
          price: p.price,
          cost_price: p.costPrice,
          is_active: true,
        }))
      )
      .select('id, name');

    if (insertProdErr) {
      return NextResponse.json(
        { error: formatErrorMessageVN(insertProdErr, 'Không thể tạo danh mục món mới.') },
        { status: 500 }
      );
    }

    for (const p of (insertedProds ?? []) as Array<{ id: string; name: string }>) {
      productIdByNorm.set(stripVietnamese(p.name), p.id);
      createdProducts++;
    }
  }

  // 3. Create historical orders sequentially via atomic create_order_with_items RPC
  let createdOrders = 0;
  for (const order of preview.newOrders) {
    const customerId = order.normalizedCustomerName
      ? (customerIdByNorm.get(order.normalizedCustomerName) ?? null)
      : null;

    const rpcItems = order.items.map((item) => ({
      product_id: productIdByNorm.get(item.normalizedProductName) ?? null,
      product_name: item.productName,
      unit: item.unit,
      unit_price: item.unitPrice,
      cost_price: item.costPrice > 0 ? item.costPrice : null,
      quantity: item.quantity,
    }));

    const { error: rpcErr } = await supabase.rpc('create_order_with_items', {
      p_customer_id: customerId,
      p_discount_amount: 0,
      p_paid_amount: order.paidAmount,
      p_payment_method: order.paymentMethod,
      p_debt_due_date: null,
      p_note: order.note,
      p_items: rpcItems,
      p_customer_name_snapshot: order.customerName,
      p_customer_address_snapshot: null,
      p_customer_phone_snapshot: null,
      p_purchased_at: order.purchasedAtIso,
      p_total_cost: order.totalCost,
      p_payment_account: order.paymentAccount,
      p_payment_account_note: order.paymentAccountNote,
      p_paid_at: order.paidAtIso,
    });

    if (rpcErr) {
      return NextResponse.json(
        {
          error: formatErrorMessageVN(
            rpcErr,
            `Lỗi khi nhập đơn ngày ${order.vnDate} (${order.customerName ?? 'Khách lẻ'}). Đã lưu ${createdOrders} đơn trước đó — bạn có thể bấm nhập lại để tiếp tục mà không bị trùng.`
          ),
          partial: { createdOrders, createdCustomers, createdProducts },
        },
        { status: 500 }
      );
    }

    createdOrders++;
  }

  return NextResponse.json({
    ok: true,
    summary: {
      createdCustomers,
      matchedCustomers: preview.plannedCustomers.length - createdCustomers,
      createdProducts,
      matchedProducts: preview.plannedProducts.length - createdProducts,
      createdOrders,
      skippedDuplicateOrders: skipDuplicates ? preview.duplicateOrderCount : 0,
      skippedInvalidRows: preview.skippedRows.length,
      ignoredSummaryRows: preview.ignoredSummaryRowCount,
      totals: preview.newOrdersTotals,
    },
    warnings: preview.skippedRows.map((w) => ({
      lineNumber: w.lineNumber,
      rawSummary: w.rawSummary,
      reason: w.reason,
    })),
  });
}
