# Interface & RPC Contracts: 003-mom-ledger-glass-dock

## 1. Shared Payment Account Constants (`src/lib/ledger.ts`)
Canonical 9 payment account options:
```ts
export const PAYMENT_ACCOUNTS = [
  'Thanh',
  'Phú',
  'Trang',
  'Trang Lê',
  'Thuỳ Trang',
  'Thuỷ',
  'Kiều Thương',
  'Vận chuyển',
  'Khác',
] as const;

export type PaymentAccount = (typeof PAYMENT_ACCOUNTS)[number];
```
Display helper: `formatPaymentAccount(account, note)`:
- If `!account`: returns `'—'`
- If `account === 'Khác'` and `note?.trim()`: returns `'Khác: ' + note.trim()`
- Otherwise returns `account`.

## 2. Thousand-VND Currency Helpers (`src/lib/currency-k.ts`)
- `parseKToVnd(raw: string): number | null`:
  - Empty / whitespace -> `null`
  - Normalizes `,` -> `.`, strips spaces
  - Parses finite non-negative number `n` -> `Math.round(n * 1000)`
  - Invalid / negative -> `null`
- `formatVndToKInput(vnd: number | null | undefined): string`:
  - `null` / `undefined` / non-finite -> `''`
  - `0` -> `'0'`
  - Divides by `1000`, trims trailing zeros (e.g. `125000` -> `'125'`, `12500` -> `'12.5'`, `500` -> `'0.5'`)
- `detectLikelyFullVndMistake(raw: string): { enteredVnd: number; suggestedK: string; suggestedVnd: number } | null`:
  - If user enters an integer string `>= 10000` divisible by `1000` (e.g., `'50000'`), returns suggestion `{ enteredVnd: 50000000, suggestedK: '50', suggestedVnd: 50000 }`.

## 3. PostgreSQL RPC Signatures (`supabase/migrations/0005_mom_ledger_fields.sql`)

### `create_order_with_items`
```sql
public.create_order_with_items(
  p_customer_id uuid DEFAULT NULL,
  p_discount_amount bigint DEFAULT 0,
  p_paid_amount bigint DEFAULT 0,
  p_payment_method text DEFAULT 'cash',
  p_debt_due_date date DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_customer_name_snapshot text DEFAULT NULL,
  p_customer_address_snapshot text DEFAULT NULL,
  p_customer_phone_snapshot text DEFAULT NULL,
  p_purchased_at timestamptz DEFAULT NULL,
  p_total_cost bigint DEFAULT NULL,
  p_payment_account text DEFAULT NULL,
  p_payment_account_note text DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL
) RETURNS jsonb
```
- Computes item `cost_price` snapshot (`>= 0` or `NULL`), sums `v_computed_total_cost = SUM(ROUND(qty * COALESCE(cost_price, 0)))`; uses `GREATEST(COALESCE(p_total_cost, v_computed_total_cost), 0)`.
- `v_purchased_at := COALESCE(p_purchased_at, now())`.
- `v_paid_at := CASE WHEN v_payment_status = 'paid' THEN COALESCE(p_paid_at, v_purchased_at) ELSE NULL END`.
- When `p_customer_id IS NOT NULL AND v_paid > 0`, inserts into `debt_payments` with `payment_account`, `payment_account_note`, `paid_at = COALESCE(p_paid_at, v_purchased_at)`.
- Validates `payment_account` against the 9 canonical values if non-null.

### `record_debt_payment`
```sql
public.record_debt_payment(
  p_customer_id uuid,
  p_amount bigint,
  p_payment_method text DEFAULT 'cash',
  p_order_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_payment_account text DEFAULT NULL,
  p_payment_account_note text DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL
) RETURNS jsonb
```
- Inserts `debt_payments` with `payment_account`, `payment_account_note`, `paid_at = COALESCE(p_paid_at, now())`.
- Updates affected orders: sets `payment_account` / `payment_account_note` (when provided), and sets `paid_at = COALESCE(p_paid_at, now())` **only when `v_new_status = 'paid'`**.

### `update_order_ledger_fields`
```sql
public.update_order_ledger_fields(
  p_order_id uuid,
  p_customer_name_snapshot text DEFAULT NULL,
  p_customer_address_snapshot text DEFAULT NULL,
  p_customer_phone_snapshot text DEFAULT NULL,
  p_purchased_at timestamptz DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL,
  p_clear_paid_at boolean DEFAULT false,
  p_payment_account text DEFAULT NULL,
  p_clear_payment_account boolean DEFAULT false,
  p_payment_account_note text DEFAULT NULL,
  p_total_cost bigint DEFAULT NULL,
  p_item_costs jsonb DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb
```
- `SECURITY INVOKER`, locks `orders` row for `auth.uid()`, updates ledger metadata and optional `order_items.cost_price` (recomputing `total_cost` from items when `p_item_costs` provided). Never mutates `total_amount`/`paid_amount`/`payment_status`.

### `get_analytics_summary`
```sql
public.get_analytics_summary(
  p_start timestamptz,
  p_end timestamptz,
  p_payment_account text DEFAULT NULL
) RETURNS jsonb
```
- Filters orders by `purchased_at >= p_start AND purchased_at <= p_end` (and optional `payment_account = p_payment_account`), returns `total_cost` and `total_profit` (`SUM(total_amount - total_cost)` excluding `cancelled`) alongside existing KPIs (`total_revenue`, `cash_collected`, `estimated_gross_profit`, `profit_tracked_ratio`, `new_debt_created`, `total_outstanding_debt`, `order_count`) and charts.
