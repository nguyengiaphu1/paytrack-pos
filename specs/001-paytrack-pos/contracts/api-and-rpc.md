# Phase 1 Interface Contracts: Supabase RPCs, Next.js API Routes & Client Contracts

**Feature**: `specs/001-paytrack-pos/spec.md`  
**Date**: 2026-11-16

---

## 1. Supabase PostgreSQL RPC Contracts (`SECURITY INVOKER` + RLS)

All RPCs derive `v_user_id := auth.uid()` directly inside Postgres (raising an exception if null) and perform row locking (`FOR UPDATE`) to prevent concurrent iPhone/Windows race conditions.

### `create_order_with_items`
Atomically creates an order, inserts line-item snapshots, updates customer debt, and records initial payment if applicable.
- **Input**:
  ```json
  {
    "p_customer_id": "uuid | null",
    "p_discount_amount": "integer (>= 0)",
    "p_paid_amount": "integer (>= 0)",
    "p_payment_method": "'cash' | 'transfer' | 'debt' | 'mixed'",
    "p_debt_due_date": "YYYY-MM-DD | null",
    "p_note": "string | null",
    "p_items": [
      {
        "product_id": "uuid | null",
        "product_name": "string",
        "unit": "string",
        "unit_price": "integer (>= 0)",
        "cost_price": "integer | null",
        "quantity": "number (> 0)"
      }
    ]
  }
  ```
- **Output**: `{ "order_id": "uuid", "order_code": "string", "total_amount": "bigint", "remaining_amount": "bigint", "new_customer_debt": "bigint" }`
- **Validation**: Computes each `line_total = ROUND(quantity * unit_price)::bigint` (nearest integer VND). Rejects empty `p_items`, rejects `p_paid_amount > total_amount`, rejects `remaining_amount > 0` when `p_customer_id IS NULL`.

### `record_debt_payment`
Atomically records a customer debt repayment and allocates across unpaid/partial orders (FIFO oldest-first or targeted single order).
- **Input**:
  ```json
  {
    "p_customer_id": "uuid",
    "p_amount": "integer (> 0)",
    "p_payment_method": "'cash' | 'transfer'",
    "p_order_id": "uuid | null",
    "p_note": "string | null"
  }
  ```
- **Output**: `{ "payment_ids": ["uuid"], "allocated_orders": [{ "order_id": "uuid", "applied": "bigint", "new_status": "string" }], "remaining_customer_debt": "bigint" }`
- **Validation**: Rejects `p_amount > customer.total_debt` (or `> order.remaining_amount` when `p_order_id` is provided).

### `cancel_order`
Cancels an order, subtracts only its unpaid `remaining_amount` (`total_amount - paid_amount`) from `customers.total_debt`, and dismisses pending `debt_reminders` linked to that order. Preserves historical `debt_payments` rows (`paid_amount` already collected is not auto-refunded or turned negative).
- **Input**: `{ "p_order_id": "uuid" }`
- **Output**: `{ "order_id": "uuid", "payment_status": "cancelled", "reversed_debt_amount": "bigint", "remaining_customer_debt": "bigint" }`

### `get_analytics_summary`
Returns period KPIs, daily Revenue vs Collected Cash series, Payment Method breakdown, Debt Aging buckets, Top Products, and Top Debt Customers for a date range `[p_start, p_end]`.
- **Input**: `{ "p_start": "timestamptz", "p_end": "timestamptz" }`
- **Output**:
  ```json
  {
    "kpis": {
      "total_revenue": "bigint",
      "cash_collected": "bigint",
      "estimated_gross_profit": "bigint | null",
      "profit_tracked_ratio": "number (0..1)",
      "new_debt_created": "bigint",
      "total_outstanding_debt": "bigint",
      "order_count": "integer"
    },
    "daily_series": [{ "date": "YYYY-MM-DD", "revenue": "bigint", "collected": "bigint" }],
    "payment_breakdown": { "cash": "bigint", "transfer": "bigint", "debt": "bigint" },
    "debt_aging": { "due_or_upcoming": "bigint", "overdue": "bigint", "no_due_date": "bigint" },
    "top_products": [{ "product_name": "string", "qty": "number", "revenue": "bigint" }],
    "top_debtors": [{ "customer_id": "uuid", "name": "string", "total_debt": "bigint", "next_due_date": "date | null" }]
  }
  ```

---

## 2. Next.js App Router API Contracts

### `GET /auth/callback`
Exchanges Supabase OAuth/recovery `code` for session cookies (`@supabase/ssr`) and redirects to `/` (or `next` query param).

### `POST /api/push/subscribe`
Saves or updates a browser's Web Push subscription for the authenticated user.
- **Auth**: Supabase session cookie (`401` if unauthenticated).
- **Body**: `{ "subscription": { "endpoint": "string", "keys": { "p256dh": "string", "auth": "string" } }, "deviceLabel": "string" }`
- **Response**: `200 { "ok": true }`

### `DELETE /api/push/subscribe`
Removes a device's push subscription when toggled off.
- **Body**: `{ "endpoint": "string" }`

### `POST /api/push/test`
Sends an immediate test Web Push notification to all active `push_subscriptions` belonging to the authenticated user (auto-purging `410`/`404` endpoints).
- **Response**: `200 { "sent": number, "removed": number }`

### `POST /api/cron/reminders`
Protected internal endpoint called every 5 minutes by Supabase `pg_cron` + `pg_net` (using `Authorization: Bearer ${CRON_SECRET}`).
- **Logic**:
  1. **Custom reminders**: Query `debt_reminders` where `status = 'pending'` and `scheduled_for <= now()`. Send Web Push with customer name, exact debt amount, and `url: /debts?customer=<id>`. Mark `status = 'sent'`.
  2. **Morning digest**: Query `shop_profiles` where `reminder_digest_enabled = true`, current `Asia/Ho_Chi_Minh` time `>= reminder_default_hour`, and `(last_digest_sent_date IS NULL OR last_digest_sent_date < today_vn)`. If the shop has customers with `total_debt > 0` and `next_due_date <= today_vn`, send 1 summary Web Push (`"Hôm nay có N khách đến hạn/quá hạn thu Xđ"`) pointing to `/debts?filter=due` and update `last_digest_sent_date = today_vn`.
  3. Clean up any expired `410`/`404` subscriptions immediately.

---

## 3. Service Worker Push Payload Contract (`public/sw.js`)

```json
{
  "title": "PayTrack POS — Nhắc thu nợ",
  "body": "Cô Lan còn nợ 350.000đ (hẹn thu hôm nay)",
  "url": "/debts?customer=<uuid>",
  "tag": "debt-reminder-<id>"
}
```
- `push` listener ALWAYS invokes `self.registration.showNotification(title, { body, icon, badge, data: { url }, tag })` (required by Apple APNs).
- `notificationclick` listener focuses an existing PWA/browser window or opens `clients.openWindow(data.url)`.

---

## 4. Client Dynamic VietQR Contract (`src/lib/vietqr.ts`)

```ts
export interface VietQRInput {
  bankBin: string;       // 6 digits, e.g. "970436"
  accountNo: string;     // Bank account number
  amount: number;        // Exact integer VND (> 0)
  memo: string;          // Sanitized ASCII, max 25 chars (e.g. "PT DH1024 CO LAN")
}

export function buildVietQRPayload(input: VietQRInput): string;
```
- Outputs compliant EMVCo Merchant Presented QR string (`00` Payload Format `01`, `01` Point of Initiation `12` dynamic, `38` Napas AID `A000000727` + Bank BIN + Account No, `53` Currency `704` VND, `54` Exact integer amount, `58` Country `VN`, `62` Purpose/Memo, `63` CRC16-CCITT).
