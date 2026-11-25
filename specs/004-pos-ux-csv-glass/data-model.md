# Data Model: POS UX Polish, Analytics Hierarchy, CSV Shop Import & Neutral Geometric Glassmorphism

**Feature**: `004-pos-ux-csv-glass` | **Date**: 2026-11-25

No PostgreSQL schema migrations are required — all persisted entities map cleanly onto existing Supabase tables (`customers`, `products`, `orders`, `order_items`, `debt_payments`) and the existing atomic RPC `create_order_with_items` (`0005_mom_ledger_fields.sql`), strictly scoped by RLS (`user_id = auth.uid()`).

## 1. Transient CSV Import Types (`src/lib/csv-import.ts`)

### `CsvUnitMode`
- `'k'`: Values in `Out`, `In`, `Tồn` represent thousand-VND units (default for `ThuChi.csv`, e.g., `355` → `355000`).
- `'vnd'`: Values represent full integer VND (e.g., `355000` → `355000`).

### `CsvImportOptions`
| Field | Type | Default | Description |
|---|---|---|---|
| `year` | `number` | Inferred calendar year (2020–2100) | Year applied to `D/M` dates lacking a year component |
| `unitMode` | `CsvUnitMode` | `'k'` | Monetary unit multiplier (`1000` vs `1`) |
| `groupSameDayOrders` | `boolean` | `true` | Group rows sharing `(vnDate, normalizedCustomer, paymentStatus, paymentAccount, paymentAccountNote)` into 1 multi-item order |
| `skipDuplicates` | `boolean` | `true` | Skip planned orders whose fingerprint matches an existing non-cancelled order |

### `ParsedCsvRow`
| Field | Type | Validation / Rules |
|---|---|---|
| `lineNumber` | `number` | 1-indexed source line number in uploaded CSV |
| `vnDate` | `string` | `YYYY-MM-DD` (inherited from previous non-empty `Date` row when blank) |
| `itemName` | `string` | Trimmed non-empty item name |
| `normalizedItemName` | `string` | `stripVietnamese(itemName)` for deduplication |
| `costVnd` | `number` | Non-negative integer VND from `Out` (`0` if blank) |
| `paidVnd` | `number` | Non-negative integer VND from `In` (`0` if blank) |
| `debtVnd` | `number` | Non-negative integer VND from `Tồn` (`0` if blank) |
| `sellingPriceVnd` | `number` | Computed `paidVnd + debtVnd` (must be `> 0`) |
| `customerName` | `string \| null` | Trimmed buyer name (`null` only allowed if `debtVnd === 0`, treated as walk-in `Khách lẻ`) |
| `normalizedCustomerName` | `string \| null` | `stripVietnamese(customerName)` when present |
| `paymentAccount` | `PaymentAccount \| null` | Matched against canonical 9 accounts (`PAYMENT_ACCOUNTS`), or `'Khác'` if non-canonical text provided, or `null` if blank |
| `paymentAccountNote` | `string \| null` | Preserves trimmed original `Người nhận CK` text when `paymentAccount === 'Khác'` |
| `statusText` | `string \| null` | Optional trailing status column (e.g., `'Done'`) |

### `SkippedCsvRow`
| Field | Type | Description |
|---|---|---|
| `lineNumber` | `number` | 1-indexed CSV line |
| `rawSummary` | `string` | Short readable excerpt (e.g., `2 túi mm mint`) |
| `reason` | `string` | Vietnamese reason (`Thiếu giá bán và tên khách hàng`, `Đơn còn nợ nhưng thiếu tên khách hàng`, `Ngày không hợp lệ`, etc.) |
| `kind` | `'incomplete' \| 'invalid' \| 'summary'` | Classification (`summary` totals rows are quietly excluded from errors and counted separately) |

### `PlannedImportOrder`
| Field | Type | Description |
|---|---|---|
| `fingerprint` | `string` | Deterministic deduplication key: `${vnDate}|${normalizedCustomerName ?? 'khach-le'}|${totalAmount}|${paidAmount}|${sortedItemSigs.join(',')}` |
| `vnDate` | `string` | `YYYY-MM-DD` |
| `purchasedAtIso` | `string` | `${vnDate}T12:00:00+07:00` |
| `customerName` | `string \| null` | Display customer name (`null` = walk-in) |
| `normalizedCustomerName` | `string \| null` | Normalized matching key |
| `paymentStatus` | `'paid' \| 'partial' \| 'unpaid'` | Derived from `paidAmount` & `remainingAmount` |
| `paymentMethod` | `'cash' \| 'transfer' \| 'debt' \| 'mixed'` | `'transfer'` if paid with `paymentAccount`, `'cash'` if paid without account, `'debt'` if `paidAmount === 0`, `'mixed'` if partial |
| `paymentAccount` | `PaymentAccount \| null` | Canonical account or `'Khác'` |
| `paymentAccountNote` | `string \| null` | Custom receiver name when `'Khác'` |
| `totalAmount` | `number` | Exact integer VND sum of item `unit_price` |
| `totalCost` | `number` | Exact integer VND sum of item `cost_price` |
| `paidAmount` | `number` | Exact integer VND paid |
| `remainingAmount` | `number` | `totalAmount - paidAmount` |
| `paidAtIso` | `string \| null` | `purchasedAtIso` when `paymentStatus === 'paid'`, else `null` |
| `items` | `Array<{ productName: string; normalizedProductName: string; unit: string; unitPrice: number; costPrice: number; quantity: number }>` | Individual item rows preserved verbatim |
| `sourceLines` | `number[]` | Source CSV line numbers merged into this order |

### `PlannedImportProduct`
| Field | Type | Rule |
|---|---|---|
| `name` | `string` | First canonical display casing seen in CSV |
| `normalizedName` | `string` | `stripVietnamese(name)` |
| `unit` | `string` | Default `'cái'` |
| `price` | `number` | Lowest positive `sellingPriceVnd` across all CSV rows for this product (avoids multi-unit bundle price inflation) |
| `costPrice` | `number \| null` | `costVnd` from that same lowest-price row (`null` if `0`) |

### `CsvImportPreview`
- `validRowCount`: number of valid item rows parsed
- `plannedOrders`: `PlannedImportOrder[]`
- `newOrders`: orders not matching existing order fingerprints
- `duplicateOrderCount`: count of matched existing orders
- `plannedCustomers`: unique customer summaries (`name`, `normalizedName`, `isNew`, `orderCount`, `debtToAdd`)
- `plannedProducts`: unique product summaries (`name`, `normalizedName`, `isNew`, `price`, `costPrice`)
- `skippedRows`: `SkippedCsvRow[]` (incomplete/invalid rows shown in preview)
- `ignoredSummaryRowCount`: count of excluded bottom totals rows
- `totals`: `{ totalRevenue, totalCost, totalProfit, totalPaid, totalDebt }` (integer VND)

---

## 2. Database Mapping on Confirm (`POST /api/import/csv`)

1. **Customers (`public.customers`)**:
   - Match existing rows by `stripVietnamese(c.name)`.
   - Bulk-insert missing customers with `{ user_id, name, search_text: stripVietnamese(name), total_debt: 0 }`.
   - Never overwrite existing customer phone/address/note.
2. **Products (`public.products`)**:
   - Match existing rows by `stripVietnamese(p.name)`.
   - Bulk-insert missing products with `{ user_id, name, search_text: stripVietnamese(name), unit: 'cái', price, cost_price, is_active: true }`.
   - **Never overwrite** already-existing catalog products (per Q2 clarification).
3. **Orders (`create_order_with_items` RPC)**:
   - For each non-duplicate `PlannedImportOrder`:
     - Resolve `p_customer_id` from customer map (`null` for walk-in).
     - Resolve each item's `product_id` from product map.
     - Invoke `create_order_with_items(...)` with `p_purchased_at`, `p_paid_at`, `p_payment_account`, `p_payment_account_note`, `p_total_cost`, `p_paid_amount`, `p_payment_method`, `p_items`, and `p_note: 'Nhập từ CSV'` (or status text if present).
     - RPC atomically inserts `orders`, `order_items`, `debt_payments` (when `paid > 0`), and recalculates `customers.total_debt`.

---

## 3. UI State Extensions

- **`AppShell` Tab Transition State**:
  - `TAB_ORDER`: `['/', '/debts', '/orders', '/stats', '/settings']`
  - Tracks `prevTabIndexRef` to compute transition direction (`'left' | 'right' | null`) on route change, clearing the animation class on `onAnimationEnd` so sticky children (`CartPanel`, `/orders` table header) retain normal containing blocks.
