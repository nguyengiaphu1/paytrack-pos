# Phase 1 Data Model: PayTrack POS

**Database**: Supabase PostgreSQL (`public` schema)  
**Security**: Row Level Security (RLS) enabled on ALL tables, strictly scoped to `user_id = auth.uid()`.  
**Money Convention**: All VND amounts stored as exact integer `bigint` (`>= 0`).

---

## 1. Entity Relationship Overview

```text
auth.users (1) ──── (1) shop_profiles
     │
     ├──── (*) products
     ├──── (*) customers ──── (*) orders ──── (*) order_items
     │              │               │
     │              └──── (*) debt_payments ────┘
     ├──── (*) debt_reminders (optional customer_id / order_id)
     └──── (*) push_subscriptions
```

---

## 2. Tables & Validation Rules

### `shop_profiles`
Stores shop identity, bank details for VietQR, reminder defaults, and invoice customization defaults.
- `id`: `uuid` PK (`gen_random_uuid()`)
- `user_id`: `uuid` UNIQUE NOT NULL FK → `auth.users(id)` ON DELETE CASCADE
- `shop_name`: `text` NOT NULL (default `'Tạp Hóa Mẹ'`)
- `phone`: `text` NULL
- `address`: `text` NULL
- `bank_bin`: `text` NULL (6-digit Napas BIN, e.g. `'970436'`)
- `bank_name`: `text` NULL (e.g. `'Vietcombank'`)
- `bank_account_no`: `text` NULL
- `bank_account_name`: `text` NULL (ASCII uppercase recommended for VietQR display)
- `reminder_digest_enabled`: `boolean` NOT NULL DEFAULT `true`
- `reminder_default_hour`: `text` NOT NULL DEFAULT `'08:30'` (`HH:MM` in `Asia/Ho_Chi_Minh`)
- `last_digest_sent_date`: `date` NULL (idempotency guard so morning digest sends once per day)
- `default_invoice_format`: `text` NOT NULL DEFAULT `'a5'` CHECK (`in ('a5', '80mm')`)
- `default_show_cumulative_debt`: `boolean` NOT NULL DEFAULT `true`
- `default_show_qr_on_invoice`: `boolean` NOT NULL DEFAULT `true`
- `created_at`, `updated_at`: `timestamptz` NOT NULL DEFAULT `now()`

### `products`
Catalog items with optional cost price for profit analytics and accent-stripped search column.
- `id`: `uuid` PK DEFAULT `gen_random_uuid()`
- `user_id`: `uuid` NOT NULL FK → `auth.users(id)` ON DELETE CASCADE
- `name`: `text` NOT NULL
- `search_text`: `text` NOT NULL (lowercase accent-stripped name + SKU for instant Vietnamese search)
- `unit`: `text` NOT NULL DEFAULT `'cái'`
- `price`: `bigint` NOT NULL CHECK (`price >= 0`)
- `cost_price`: `bigint` NULL CHECK (`cost_price IS NULL OR cost_price >= 0`)
- `category`: `text` NULL
- `sku`: `text` NULL
- `is_active`: `boolean` NOT NULL DEFAULT `true`
- `created_at`, `updated_at`: `timestamptz` NOT NULL DEFAULT `now()`
- **Indexes**: `(user_id, is_active, name)`, `(user_id, search_text)`

### `customers`
Customer directory and cached `total_debt` (atomically updated by order/payment/cancel RPCs).
- `id`: `uuid` PK DEFAULT `gen_random_uuid()`
- `user_id`: `uuid` NOT NULL FK → `auth.users(id)` ON DELETE CASCADE
- `name`: `text` NOT NULL
- `search_text`: `text` NOT NULL
- `phone`: `text` NULL
- `note`: `text` NULL
- `total_debt`: `bigint` NOT NULL DEFAULT `0` CHECK (`total_debt >= 0`)
- `next_due_date`: `date` NULL (earliest unpaid due date or custom target date)
- `created_at`, `updated_at`: `timestamptz` NOT NULL DEFAULT `now()`
- **Indexes**: `(user_id, total_debt DESC)`, `(user_id, search_text)`

### `orders`
POS invoices with payment tracking, customer debt snapshot, and status lifecycle.
- `id`: `uuid` PK DEFAULT `gen_random_uuid()`
- `user_id`: `uuid` NOT NULL FK → `auth.users(id)` ON DELETE CASCADE
- `order_code`: `text` NOT NULL (e.g., `DH-20261116-0001`, unique per `user_id`)
- `customer_id`: `uuid` NULL FK → `customers(id)` ON DELETE SET NULL
- `customer_name_snapshot`: `text` NOT NULL DEFAULT `'Khách lẻ'`
- `subtotal`: `bigint` NOT NULL CHECK (`subtotal >= 0`)
- `discount_amount`: `bigint` NOT NULL DEFAULT `0` CHECK (`discount_amount >= 0`)
- `total_amount`: `bigint` NOT NULL CHECK (`total_amount >= 0`)
- `paid_amount`: `bigint` NOT NULL DEFAULT `0` CHECK (`paid_amount >= 0 AND paid_amount <= total_amount`)
- `remaining_amount`: `bigint` GENERATED ALWAYS AS (`total_amount - paid_amount`) STORED
- `previous_customer_debt`: `bigint` NOT NULL DEFAULT `0` (snapshot of customer debt right before this order, enabling accurate historical cumulative-debt invoice rendering)
- `payment_status`: `text` NOT NULL CHECK (`in ('paid', 'partial', 'unpaid', 'cancelled')`)
- `payment_method`: `text` NOT NULL DEFAULT `'cash'` CHECK (`in ('cash', 'transfer', 'debt', 'mixed')`)
- `debt_due_date`: `date` NULL
- `note`: `text` NULL
- `created_at`, `updated_at`: `timestamptz` NOT NULL DEFAULT `now()`
- **Constraint**: If `total_amount > paid_amount`, `customer_id` MUST NOT be NULL (cannot record debt without a named customer).
- **Indexes**: `(user_id, created_at DESC)`, `(user_id, customer_id, payment_status)`

### `order_items`
Immutable line-item snapshots so later product price/cost edits never corrupt historical invoices or profit reports.
- `id`: `uuid` PK DEFAULT `gen_random_uuid()`
- `user_id`: `uuid` NOT NULL FK → `auth.users(id)` ON DELETE CASCADE
- `order_id`: `uuid` NOT NULL FK → `orders(id)` ON DELETE CASCADE
- `product_id`: `uuid` NULL FK → `products(id)` ON DELETE SET NULL
- `product_name`: `text` NOT NULL
- `unit`: `text` NOT NULL DEFAULT `'cái'`
- `unit_price`: `bigint` NOT NULL CHECK (`unit_price >= 0`)
- `cost_price`: `bigint` NULL CHECK (`cost_price IS NULL OR cost_price >= 0`)
- `quantity`: `numeric(10, 2)` NOT NULL CHECK (`quantity > 0`) (supports fractional kg like `0.5 kg`, `1.2 kg`)
- `line_total`: `bigint` NOT NULL CHECK (`line_total >= 0`)

### `debt_payments`
Audit log of every repayment (both initial partial/full payments at checkout or subsequent debt collections).
- `id`: `uuid` PK DEFAULT `gen_random_uuid()`
- `user_id`: `uuid` NOT NULL FK → `auth.users(id)` ON DELETE CASCADE
- `customer_id`: `uuid` NOT NULL FK → `customers(id)` ON DELETE CASCADE
- `order_id`: `uuid` NULL FK → `orders(id)` ON DELETE SET NULL (populated per allocated order so FIFO repayments link cleanly)
- `amount`: `bigint` NOT NULL CHECK (`amount > 0`)
- `payment_method`: `text` NOT NULL DEFAULT `'cash'` CHECK (`in ('cash', 'transfer')`)
- `note`: `text` NULL
- `paid_at`: `timestamptz` NOT NULL DEFAULT `now()`

### `debt_reminders`
Custom per-customer/per-order scheduled reminders.
- `id`: `uuid` PK DEFAULT `gen_random_uuid()`
- `user_id`: `uuid` NOT NULL FK → `auth.users(id)` ON DELETE CASCADE
- `customer_id`: `uuid` NOT NULL FK → `customers(id)` ON DELETE CASCADE
- `order_id`: `uuid` NULL FK → `orders(id)` ON DELETE CASCADE
- `reminder_type`: `text` NOT NULL DEFAULT `'custom'` CHECK (`in ('digest', 'custom')`)
- `scheduled_for`: `timestamptz` NOT NULL
- `message`: `text` NULL
- `target_url`: `text` NOT NULL (e.g., `/debts?customer=<id>`)
- `status`: `text` NOT NULL DEFAULT `'pending'` CHECK (`in ('pending', 'sent', 'dismissed')`)
- `sent_at`: `timestamptz` NULL
- `created_at`: `timestamptz` NOT NULL DEFAULT `now()`
- **Index**: `(status, scheduled_for)` for fast cron polling.

### `push_subscriptions`
Device-specific Web Push VAPID endpoints (Windows Chrome/Edge, iPhone Safari PWA).
- `id`: `uuid` PK DEFAULT `gen_random_uuid()`
- `user_id`: `uuid` NOT NULL FK → `auth.users(id)` ON DELETE CASCADE
- `endpoint`: `text` UNIQUE NOT NULL
- `p256dh`: `text` NOT NULL
- `auth`: `text` NOT NULL
- `device_label`: `text` NULL (e.g., `'iPhone PWA'`, `'Windows Chrome'`)
- `created_at`, `last_seen_at`: `timestamptz` NOT NULL DEFAULT `now()`

---

## 3. Order & Debt State Transitions

```text
  [Checkout]
     ├── paid_amount == total_amount ──────────────► 'paid'
     ├── 0 < paid_amount < total_amount ───────────► 'partial' ──(collect full remaining)──► 'paid'
     └── paid_amount == 0 ─────────────────────────► 'unpaid'  ──(collect partial)────────► 'partial'
                                                                └──(collect full)──────────► 'paid'
  Any active status ('paid' | 'partial' | 'unpaid') ──(cancel_order RPC)──► 'cancelled'
```

- **FIFO Repayment Rule**: When `record_debt_payment(customer_id, amount, order_id=NULL)` runs, it locks the customer row (`FOR UPDATE`), verifies `amount <= customer.total_debt`, and either applies `amount` to the targeted `order_id` or iterates through `orders` with `payment_status IN ('unpaid', 'partial')` ordered by `created_at ASC`, creating `debt_payments` rows and updating each order's `paid_amount` and `payment_status`, then recomputing `customers.total_debt`.
- **Realtime Publication**: Enable `supabase_realtime` publication on `products`, `customers`, `orders`, `debt_payments`, and `debt_reminders`.
