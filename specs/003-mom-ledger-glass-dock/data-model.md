# Data Model: 003-mom-ledger-glass-dock

## Schema Changes (`supabase/migrations/0005_mom_ledger_fields.sql`)

All columns live in `public` tables already protected by RLS (`user_id = auth.uid()`). All currency fields remain exact integer VND (`bigint`).

### 1. `public.customers`
- **ADD** `address text NULL` — Separated street/delivery address (distinct from `note`).
- **Backfill**: Leave existing rows `NULL` (non-destructive; existing `note` preserved).

### 2. `public.orders`
- **ADD** `customer_address_snapshot text NULL` — Snapshot of buyer address at order creation (editable).
- **ADD** `customer_phone_snapshot text NULL` — Snapshot of buyer phone at order creation (editable).
- **ADD** `purchased_at timestamptz NOT NULL DEFAULT now()` — Business purchase timestamp (editable by shop owner).
- **ADD** `total_cost bigint NOT NULL DEFAULT 0 CHECK (total_cost >= 0)` — Sum of `ROUND(quantity * COALESCE(cost_price, 0))` across line items.
- **ADD** `payment_account text NULL` — One of the 9 canonical values: `Thanh`, `Phú`, `Trang`, `Trang Lê`, `Thuỳ Trang`, `Thuỷ`, `Kiều Thương`, `Vận chuyển`, `Khác` (nullable for unpaid orders or pre-migration historical rows).
- **ADD** `payment_account_note text NULL` — Free-text note when `payment_account = 'Khác'` (or extra transfer detail).
- **ADD** `paid_at timestamptz NULL` — Timestamp when order reached `paid` status (editable; `NULL` when `unpaid`/`partial`).
- **Constraints**:
  - `CHECK (payment_account IS NULL OR payment_account IN ('Thanh', 'Phú', 'Trang', 'Trang Lê', 'Thuỳ Trang', 'Thuỷ', 'Kiều Thương', 'Vận chuyển', 'Khác'))`
- **Indexes**:
  - `idx_orders_user_purchased_at ON public.orders(user_id, purchased_at DESC)`
  - `idx_orders_user_payment_account ON public.orders(user_id, payment_account)`
- **Production Backfill**:
  1. `UPDATE public.orders SET purchased_at = created_at WHERE purchased_at IS NULL OR purchased_at <> created_at` (applied cleanly during `ALTER TABLE` + backfill guard using a temporary column check or immediate update on existing rows where `purchased_at > created_at`). Specifically: add `purchased_at timestamptz`, backfill `UPDATE public.orders SET purchased_at = created_at WHERE purchased_at IS NULL`, then set `ALTER COLUMN purchased_at SET DEFAULT now(), ALTER COLUMN purchased_at SET NOT NULL`.
  2. Backfill `customer_phone_snapshot` and `customer_address_snapshot` from `public.customers` where `orders.customer_id = customers.id`.
  3. Backfill `order_items.cost_price` from `public.products.cost_price` where `order_items.cost_price IS NULL` and `products.cost_price IS NOT NULL`.
  4. Backfill `orders.total_cost` from `SUM(ROUND(oi.quantity * COALESCE(oi.cost_price, 0)))` per order.
  5. Backfill `orders.paid_at` for existing `payment_status = 'paid'` orders using latest `debt_payments.paid_at` for that order if present, else `orders.purchased_at`.

### 3. `public.debt_payments`
- **ADD** `payment_account text NULL` — Same 9-option CHECK constraint as `orders.payment_account`.
- **ADD** `payment_account_note text NULL` — Note when `payment_account = 'Khác'`.

### 4. Derived / UI-Only Fields
- **STT**: Computed client-side (`index + 1`) on the filtered ledger rows; NEVER persisted.
- **Món hàng (Summary)**: Derived from nested `order_items` (`Tên SP ×SL, ...`).
- **Lãi (`profit`)**: Derived as `order.total_amount - order.total_cost` (excluded from totals when `payment_status === 'cancelled'`).
- **Missing cost flag**: `order.order_items?.some((item) => item.cost_price === null) ?? false`.
