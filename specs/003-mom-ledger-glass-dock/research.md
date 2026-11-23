# Research & Architectural Decisions: 003-mom-ledger-glass-dock

## 1. Safe Migration Backfill for `purchased_at` and `total_cost`
- **Decision**: Add `purchased_at` as nullable first, `UPDATE orders SET purchased_at = created_at WHERE purchased_at IS NULL`, then enforce `SET DEFAULT now()` and `SET NOT NULL`. For `total_cost`, backfill `order_items.cost_price` from `products.cost_price` where missing, then aggregate `SUM(ROUND(quantity * COALESCE(cost_price, 0)))` into `orders.total_cost`.
- **Rationale**: Adding `NOT NULL DEFAULT now()` directly would stamp historical rows with migration runtime instead of their true `created_at`. Two-step backfill is idempotent and preserves historical dates.
- **Alternatives**: Generated column on `orders` (impossible across `order_items` join in Postgres without triggers).

## 2. RPC Backward Compatibility
- **Decision**: Extend `create_order_with_items`, `record_debt_payment`, and `get_analytics_summary` by appending new parameters with `DEFAULT NULL` (and `DROP FUNCTION` only on previous exact signatures before `CREATE OR REPLACE` to avoid PostgREST overloaded-function ambiguity). Add `update_order_ledger_fields` for safe manual edits of ledger fields + optional item cost updates.
- **Rationale**: PostgREST fails with `PGRST203` if two overloaded signatures of the same function name exist. Dropping old exact signature and recreating with trailing `DEFAULT NULL` params keeps all existing call sites compatible while supporting all new fields.

## 3. Nested `order_items` Fetch in `PosDataProvider`
- **Decision**: Query `orders` with `.select('*, order_items(id, user_id, order_id, product_id, product_name, unit, unit_price, cost_price, quantity, line_total)')` ordered by `purchased_at DESC, created_at DESC`, with pagination (`limit(200)` initial + `loadMoreOrders()`).
- **Rationale**: Eliminates N+1 fetches for Column #6 (`Món hàng`) and makes order detail modal & invoice preview open instantaneously.

## 4. Thousand-VND Input (`VndKInput`) Safety
- **Decision**: Shared controlled component `src/components/ui/VndKInput.tsx` backed by pure helpers in `src/lib/currency-k.ts` (`parseKToVnd`, `formatVndToKInput`, `detectLikelyFullVndMistake`). Accepts `.` and `,` decimals (`12,5` -> `12500`), uses `inputMode="decimal"`, renders fixed `.000 đ` suffix, and displays a 1-tap correction helper when the user enters a value `>= 10000` divisible by `1000`.
- **Rationale**: Prevents the single biggest real-world POS data-entry mistake (typing `50000` instead of `50` and recording 50 million VND) while keeping DB and VietQR 100% standard VND `bigint`.

## 5. Floating Glass Dock & Constitution v1.1.0 Amendment
- **Decision**: Amend `.specify/memory/constitution.md` (`v1.0.0` -> `v1.1.0`) and `DESIGN.md` to establish an intentional **60–30–10 Floating Glass Dock** visual system (`.glass-dock`, `.glass-surface` with `backdrop-filter: blur(...) saturate(...)`, 1px hairline border, and `prefers-reduced-transparency` fallback), while keeping all AI-slop bans intact (`indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`).
- **Rationale**: Removing the desktop `228px` left rail unlocks 100% viewport width for the 12-column Orders ledger while giving iPhone and Windows users one unified bottom Floating Glass Dock navigation model.

## 6. PWA Icon Set & Zero-Flash Boot Splash
- **Decision**: Generate crisp vector SVG + PNG icon assets (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png` 180x180, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`) on brand Jade `#0E6B4E` using geometric ledger/receipt mark; expose dynamic Light/Dark `themeColor`; add a lightweight `AppBootSplash` that renders on initial app load with zero-flash theme canvas and fades out rapidly (~260ms) once hydrated, completely bypassing animation under `prefers-reduced-motion`.
- **Rationale**: Replaces 600-byte placeholder PNGs with crisp icons across iPhone Home Screen, Android PWA, and Windows browser tabs/shortcuts without artificial boot lag.
