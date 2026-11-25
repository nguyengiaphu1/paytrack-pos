# PayTrack POS — Project Context & Agent Quickstart

> **Purpose**: Single-source-of-truth context file for AI assistants and developers. Read this file first in a new session instead of scanning the entire repository.
> **Last Updated**: 2026-11-25 (`v2.3.1` / `refactor/modularize-shared-core`: Removed 3 dead components, extracted shared utilities `browser-export`, `customers`, `api-auth`, `OrderStatusBadge`, `ModalHeader`, unified VN date presets with `'30d'`, split `csv-import`, `CheckoutModal`, `orders/page.tsx`, `CsvImportModal`, and `ProductCatalog` into focused submodules; `97/97` tests)

---

## 1. Project Overview & Tech Stack

**PayTrack POS** (`v2.3.1`) is a responsive Vietnamese home online-shop sales ledger and rapid order-entry app (juggling Zalo/Messenger chats on iPhone `375px` + evening 12-column ledger/profit reconciliation on Windows `1280px+`), with 12-field sales ledger & 9 payment accounts, automated `ThuChi.csv` ledger import, FIFO customer debt ledger, multi-device Web Push reminder (iPhone Safari PWA + Windows Chrome/Edge), dynamic VietQR, customizable e-invoice (`PNG` / `A5` / `80mm`), Excel-safe CSV export, and focused visual analytics.

- **Framework**: Next.js `^16.4.6` (App Router, Turbopack dev), React `^19.3.1`, TypeScript `^5.9.0`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), **Neutral Architectural Glassmorphism (60–30–10)** in `src/app/globals.css`:
  - **60% Geometric Backdrop (`body::before`)**: Light Mode solid Warm Gray (`#ECEFED`) layered with crisp `28px` dark forest-gray grid lines (`rgba(15, 23, 20, 0.07)`); Dark Mode solid Matte Obsidian (`#0C100E`) layered with crisp `24px` white dot-grid (`rgba(255, 255, 255, 0.08)`).
  - **30% Pure Neutral Frosted Glass Tiles (Zero Green Glass)**: `.glass-dock`, `.glass-surface`, `.glass-panel`, `.glass-card` (`blur(12px)` + `contain: layout style`), `.glass-modal`, `.glass-chip-active`, `.glass-icon-orb`, `.glass-well`, and opaque-inside-translucent `.glass-input` / `.glass-solid-control` — all strictly neutral without green-tinted glass washes.
  - **10% Solid Opaque Accent**: Solid Deep Forest Jade (`#0E6B4E` Light / `#127A59` Dark, WCAG AA `>= 5.1:1`) reserved strictly for important primary CTAs (`.glass-btn-primary`, compact `.glass-pill-jade` inline collect) and semantic status badges (`#075444` paid, `#8A3B04`/`#FCD34D` debt, `#9F1616`/`#FCA5A5` overdue).
  - **Motion & Isolation**: Unified modal/sheet slide-up (`.animate-modal-in` / `.animate-sheet-up`), sticky-safe directional tab slide-left/right (`.animate-tab-slide-left` / `.animate-tab-slide-right` in `AppShell`), full `prefers-reduced-transparency` + opacity-only `prefers-reduced-motion`, `.print-surface-light` solid paper lock, `Be Vietnam Pro` + `tabular-nums` (`>= 12px` floor, `>= 16px` inputs).
- **Database / Auth / Realtime / Cron**: Supabase (`@supabase/ssr ^0.9.0`, `@supabase/supabase-js ^2.100.0`, Postgres 17, `pg_cron` + `pg_net`)
- **Utilities**: `qrcode` (dynamically imported EMVCo/Napas 247 VietQR), `html-to-image` (dynamically imported via `src/lib/browser-export.ts`), `web-push` (VAPID Web Push), `recharts` (dynamically imported charts), `lucide-react` (icons)
- **Testing**: `vitest ^4.1.0` (unit tests in `tests/unit/` — 14 suites, 97 tests)

---

## 2. Environments, Git & Live Deployment (Non-Secret)

### Git Topology
- `main`: Active production branch (auto-deploys to Vercel Production `https://paytrack-pos.vercel.app`). Create feature/fix/chore branches from `main` — **do not commit directly to `main`**.
- Previous branches: `feat/spec-kit-foundation` (PR #1), `feat/001-paytrack-pos-mvp` (PR #2), `feat/002-ux-polish-theme` (PR #3), `fix/cron-reminders-not-firing` (PR #4), `chore/release-1.1.1` (PR #5), `fix/daily-digest-not-firing` (PR #6), `chore/release-1.1.2` (PR #7), `feat/003-mom-ledger-glass-dock` (PR #8), `fix/003-converge-polish` (PR #9), `fix/ui-impeccable-overhaul` (PR #10), `chore/release-2.1.0` (PR #11), `feat/liquid-glass-ui-overhaul` (PR #12), `feat/liquid-glass-wallpaper-backdrop` (PR #13), `fix/ui-taste-redesign` (PR #14), `fix/neutral-60-30-10-backdrop` (PR #15), `fix/wallpaper-tile-pop` (PR #16), `fix/impeccable-audit-p1` (PR #17), `fix/darker-glass-backdrop` (PR #18), `feat/004-pos-ux-csv-glass` (PR #19). Tags: `v1.0.0`–`v2.3.0`.

### Live Infrastructure
- **Vercel Production**: `https://paytrack-pos.vercel.app` (team `phu-nguyen4`, project `paytrack-pos`, preset `nextjs`, Node `24.x`, region `sin1`, plus daily fallback cron `0 1 * * *` via `vercel.json`).
  - *Important*: Supabase env vars currently live in Vercel **Production** only (not `Preview`), so PR preview deployments lack Supabase service keys unless copied.
- **Supabase Project**: ref `mezuxaqvbtjbbtugsohm` (`ap-southeast-1`, Postgres 17).
  - Migrations `0001_initial_schema.sql`–`0005_mom_ledger_fields.sql` all applied live on production.
  - `pg_cron` job `paytrack_reminder_dispatch` (`* * * * *`, `timeout_milliseconds := 10000` in `0003_reminder_cron.sql`), calling `https://paytrack-pos.vercel.app/api/cron/reminders` with `Authorization: Bearer <CRON_SECRET>`.
  - Auth config: `site_url = https://paytrack-pos.vercel.app`; Email auth enabled; Google OAuth currently disabled on Supabase Auth dashboard.

### Required Environment Variables (see `.env.example` — NEVER commit secrets)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `CRON_SECRET`

---

## 3. Database Schema, RLS & RPC Functions

All tables enforce Row Level Security (`user_id = auth.uid()`). All monetary amounts are **integer VND (`bigint`)**. UI thousand-VND (`K` / `.000đ`) entry translates strictly at UI boundaries (`src/lib/currency-k.ts`).

### Tables (`0001_initial_schema.sql` + `0004_cron_heartbeat.sql` + `0005_mom_ledger_fields.sql`)
1. `shop_profiles`: `user_id` (unique), `shop_name`, `phone`, `address`, `bank_bin`, `bank_name`, `bank_account_no`, `bank_account_name`, `reminder_digest_enabled`, `reminder_default_hour` (`'08:30'`), `last_digest_sent_date`, `default_invoice_format` (`'a5' | '80mm'`), `default_show_cumulative_debt`, `default_show_qr_on_invoice`. Auto-created on signup via `handle_new_user()` trigger (and safe fallback upsert in `src/app/(app)/layout.tsx`).
2. `products`: `name`, `search_text` (diacritic-stripped via `stripVietnamese`), `unit`, `price`, `cost_price` (nullable), `category`, `sku`, `is_active`.
3. `customers`: `name`, `search_text`, `phone`, `address` (`0005`), `note`, `total_debt` (`>= 0`), `next_due_date`.
4. `orders`: `order_code` (`DH-YYYYMMDD-XXXX`), `customer_id` (nullable walk-in), `customer_name_snapshot`, `customer_address_snapshot` (`0005`), `customer_phone_snapshot` (`0005`), `purchased_at` (`0005`, NOT NULL DEFAULT `now()`), `subtotal`, `discount_amount`, `total_amount`, `total_cost` (`0005`, `bigint NOT NULL DEFAULT 0`), `paid_amount`, `remaining_amount` (generated `total_amount - paid_amount`), `previous_customer_debt`, `payment_status` (`'paid' | 'partial' | 'unpaid' | 'cancelled'`), `payment_method` (`'cash' | 'transfer' | 'debt' | 'mixed'`), `payment_account` (`0005`, 9 canonical options), `payment_account_note` (`0005`), `paid_at` (`0005`, nullable), `debt_due_date`, `note`. Constraint: `total_amount = paid_amount OR customer_id IS NOT NULL`.
5. `order_items`: `order_id`, `product_id` (nullable for quick items), `product_name`, `unit`, `unit_price`, `cost_price` (snapshot, editable via `update_order_ledger_fields`), `quantity` (`numeric(10,2)`), `line_total`.
6. `debt_payments`: `customer_id`, `order_id` (nullable), `amount`, `payment_method` (`'cash' | 'transfer'`), `payment_account` (`0005`), `payment_account_note` (`0005`), `note`, `paid_at`.
7. `debt_reminders`: `customer_id`, `order_id` (nullable), `reminder_type` (`'digest' | 'custom'`), `scheduled_for`, `message`, `target_url`, `status` (`'pending' | 'sent' | 'dismissed'`), `sent_at`.
8. `push_subscriptions`: `user_id`, `endpoint` (unique), `p256dh`, `auth`, `device_label`, `last_seen_at`.
9. `cron_heartbeats` (`0004`): `job_name` (PK), `last_run_at`, `last_status` (`'ok' | 'error'`), `last_summary` (`jsonb`), `last_error`.

### Canonical 9 Payment Accounts (`PAYMENT_ACCOUNTS` in `src/lib/ledger.ts` & SQL CHECK in `0005`)
`Thanh`, `Phú`, `Trang`, `Trang Lê`, `Thuỳ Trang`, `Thuỷ`, `Kiều Thương`, `Vận chuyển`, `Khác` (with `payment_account_note` shown as `Khác: ...`).

### Atomic RPC Functions (`0002_rpc_functions.sql` updated by `0005_mom_ledger_fields.sql` — `SECURITY INVOKER` + `FOR UPDATE`)
- `recompute_customer_debt_state(p_customer_id, p_user_id)`: Recalculates `customers.total_debt` and `MIN(debt_due_date)` across `unpaid`/`partial` orders.
- `create_order_with_items(...)`: Locks customer, supports buyer snapshots (`name`, `address`, `phone`), `purchased_at`, `total_cost` + item `cost_price` snapshots, `payment_account`/`note`, `paid_at` (auto-filled when `paid`), logs initial `debt_payments` with account & `paid_at`, recomputes debt. Also reused server-side by `POST /api/import/csv`.
- `record_debt_payment(...)`: Allocates to `p_order_id` or **FIFO oldest-first** (`ORDER BY purchased_at ASC, created_at ASC, id ASC`), records `payment_account`/`note` + `paid_at` on `debt_payments`, updates order `payment_account` and sets `orders.paid_at` when order reaches `paid`.
- `update_order_ledger_fields(...)` (`0005`): Safely edits manual ledger fields (`customer_name/address/phone_snapshot`, `purchased_at`, `paid_at`, `payment_account`/`note`, per-item `cost_price` or `total_cost`, `note`) without breaking debt invariants.
- `cancel_order(p_order_id)`: Marks order `cancelled`, dismisses pending `debt_reminders`, reverses only unpaid `remaining_amount`.
- `get_analytics_summary(p_start, p_end, p_payment_account?)`: Queries by `purchased_at`, supports `payment_account` filter, returns `total_cost` & `total_profit` alongside KPIs/charts in `Asia/Ho_Chi_Minh`.

### Realtime Publication
Enabled on: `products`, `customers`, `orders`, `debt_payments`, `debt_reminders`.

---

## 4. Codebase Map

### App Routes, PWA Assets & Middleware
- `public/favicon.svg`, `public/favicon.ico`, `public/icons/apple-touch-icon.png` (`180x180`), `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png`: Crisp Jade `#0E6B4E` geometric ledger icons.
- `src/middleware.ts`: Refreshes Supabase SSR session; redirects unauthenticated page requests to `/login`; bypasses static assets/icons/favicons, `/login`, `/auth/callback`, `/api/cron/reminders`, `/manifest.webmanifest`, `/sw.js`.
- `src/app/layout.tsx`: Root HTML (`lang="vi"`, `suppressHydrationWarning`), inline pre-hydration `THEME_BOOTSTRAP_SCRIPT`, dynamic Light/Dark `viewport.themeColor` (`#ECEFED` / `#0C100E`), full PWA/favicon metadata, `ThemeProvider`, `AppBootSplash`, Google Fonts (`Be Vietnam Pro`).
- `src/app/loading.tsx`: Root branded splash (`BrandLoadingScreen`).
- `src/app/manifest.ts`: Web App Manifest (`/manifest.webmanifest`, `any` + `maskable` icons, standalone portrait PWA).
- `src/app/login/page.tsx`: Focused single-card neutral glassmorphism auth UI with `BrandMark`, `ThemeQuickToggle`, neutral `.glass-chip-active` segmented `Đăng nhập | Đăng ký` toggle, and `.glass-solid-control` Google button (zero Floating Glass Dock).
- `src/app/auth/callback/route.ts`: PKCE code exchange (`exchangeCodeForSession`).
- `src/app/(app)/layout.tsx`: Server auth guard + `shop_profiles` fallback upsert + `PosDataProvider` & `AppShell`.
- `src/app/(app)/loading.tsx`: App shell route skeleton (`PosWorkspaceSkeleton`).
- `src/app/(app)/page.tsx`: **POS Workspace** — compact header + contextual alerts, primary column housing `CustomerPicker` (unobstructed mobile open without search auto-focus, `<Check>`, `Enter`-to-select single match) + `ProductCatalog` (unified 1-row pill search + 1-tap `"Thêm món"` catalog creation button replacing `"Món lẻ"`/`"Thêm SP"`, desktop `/` + `Enter`-to-add shortcut, horizontal scrollable categories, conditional `Đã ẩn (N)` with 1-tap unarchive, explicit `Sửa` edit mode, `sm:items-stretch` equal-height frosted cards with 1-row Price + inline `-/+` `.glass-solid-control` stepper & `QtyNumberInput`), desktop sticky `CartPanel` (`lg:max-h-[calc(100dvh-168px)]`, full-width clear confirm strip + 10s Undo banner, `syncProductInCart` on edit), mobile floating cart pill + pinned-footer `ModalDialog` cart drawer (`variant="sheet"`), and slide-up `ProductFormModal` + `CheckoutModal`.
- `src/app/(app)/debts/page.tsx`: **Debt Ledger** — frosted `.glass-card` KPI strip, `.glass-surface` pill search + neutral `.glass-chip-active` filter pills (`Đang nợ`, `Đến hạn`, `Tất cả`), `.glass-card` customer rows with `.glass-solid-control` `Chi tiết` & solid `.glass-btn-primary` `Thu nợ`, deep-links (`?customer=`, `?filter=due`), opening `DebtCustomerDrawer` stacked cleanly under slide-up `CollectDebtModal` / `ReminderModal` / `VietQRModal`.
- `src/app/(app)/orders/page.tsx`: **12-Column Sales Ledger** — header with solid `"Nhập CSV"` CTA (`CsvImportModal`) + `"Xuất CSV"`, frosted `.glass-card` totals strip, `.glass-surface` command filter bar, `.glass-panel` bounded scrollable 12-column sticky desktop table & overflow-free `.glass-card` mobile cards, slide-up order detail & `OrderLedgerEditModal`, inline `CollectDebtModal`, UTF-8 BOM Excel CSV export, pagination (`loadMoreOrders`), `InvoicePreviewModal` & `VietQRModal` (neutral glass chrome + solid `.print-surface-light` document), `cancel_order`.
- `src/app/(app)/stats/page.tsx`: **Redesigned Analytics** — floating `.glass-surface` bar with neutral `.glass-chip-active` date presets + payment account `<select>`, **2-tier KPI hierarchy** (2 Hero `.glass-panel` focal cards for `Lãi ước tính` + inline `Giá vốn`/biên lãi & `Giá bán` + inline `Số đơn`/TB mỗi đơn; 2 Compact `.glass-card` indicators for `Thực thu` + embedded cash-vs-transfer progress bar & `Tổng nợ hiện tại` + inline `Nợ mới` + `/debts` link), dominant `RevenueCashChart`, and strictly the 2 actionable lists (`Nợ nhiều nhất` & `Món bán chạy`; standalone `PaymentBreakdownChart` and `DebtAgingCard` removed).
- `src/app/(app)/settings/page.tsx`: **Settings** — cohesive `.glass-panel` cards: (1) Shop & VietQR (`Shop của Mẹ`), (2) Nhắc nợ (`PushNotificationSetup` + daily digest), (3) Nhập sổ bán từ CSV (`CsvImportModal`), (4) Giao diện (`SettingsThemeSelector`), (5) Tài khoản (email + `Thiết lập nhanh` + Đăng xuất).

### API Routes & Service Worker
- `src/app/api/import/csv/route.ts`: Authenticated `POST /api/import/csv` executing shop ledger CSV import (`<= 2 MB`, `<= 500` orders) via RLS, bulk-inserting missing customers & products (never overwriting existing products), skipping duplicate order fingerprints, and calling `create_order_with_items` RPC.
- `src/app/api/push/subscribe/route.ts`: `GET` (devices + pending/overdue/due/cronHeartbeat/digestStatus), `POST` upsert, `DELETE` remove.
- `src/app/api/push/test/route.ts`: `POST` sends test Web Push notification.
- `src/app/api/push/dispatch-due/route.ts`: `POST` authenticated single-user dispatch (`runReminderCron(now, { userId })`).
- `src/app/api/cron/reminders/route.ts`: `GET` / `POST` (`Authorization: Bearer $CRON_SECRET`) runs `runReminderCron()` and records `cron_heartbeats`.
- `public/sw.js`: Handles `push` and `notificationclick` deep-linking.

### Libraries, Hooks, Providers & Components
- `src/types/database.ts`: Shared TS interfaces (`PaymentAccount`, `ShopProfile`, `Product`, `Customer`, `Order`, `OrderItem`, `DebtPayment`, `DebtReminder`, `PushSubscriptionRecord`, `CartItem`, `AnalyticsSummary`).
- `src/lib/csv-import.ts` (barrel) + `src/lib/csv-import/{types,parsers,planner}.ts`: Pure RFC-4180 CSV parser, `ThuChi.csv` column mapper (UTF-8 BOM, CRLF/LF, date carry-forward, `DD/MM` year inference, bottom summary-row filter), canonical 9-account + `'Khác'` note resolver, lowest-positive-row-price product aggregator, same-day/customer order grouper, deterministic order fingerprint deduplicator, and `buildCsvImportPreview()` planner.
- `src/lib/browser-export.ts`: Shared client-side `copyTextToClipboard` (with fallback), `triggerBlobDownload`, `triggerDataUrlDownload`, dynamic `captureElementAsPng` (`html-to-image`), and `shareOrDownloadElementPng` (shared across `VietQRModal`, `InvoicePreviewModal`, `DebtCustomerDrawer`, `/orders`).
- `src/lib/customers.ts`: Shared `buildCustomerSearchText`, `filterCustomersByQuery`, `createCustomerRecord`, and `resolveOrStubOrderCustomer` (shared across `CustomerPicker`, `CheckoutBuyerSection`, `DebtCustomerDrawer`, `/debts`, `/orders`).
- `src/lib/api-auth.ts`: Shared `requireApiUser()` Supabase server auth guard across authenticated API routes (`/api/import/csv`, `/api/push/{subscribe,test,dispatch-due}`).
- `src/lib/vietnamese.ts`: `stripVietnamese`, `formatVND`, `computeLineTotal`, `computeOrderTotals`, VN date/time helpers, `shouldResetDigestSentDate`, `buildZaloDebtMessage`.
- `src/lib/currency-k.ts`: `sanitizeKInput`, `parseKToVnd`, `formatVndToKInput`, `detectLikelyFullVndMistake`.
- `src/lib/ledger.ts`: `PAYMENT_ACCOUNTS`, `isPaymentAccount`, `formatPaymentAccount`, `summarizeOrderItems`, `computeItemsCostTotal`, `computeOrderProfit`, `hasMissingCostPrice`, `computeLedgerTotals`, `resolveOrderPaidAt`, `toVnDateInput`, `dateInputToVnIso`, `computeVnDatePresetRange` (including `'30d'`), `computeVnDatePresetIsoRange` (shared by `/orders` & `/stats`), `isOrderInVnDateRange`, `buildLedgerCsv`.
- `src/lib/errors.ts`, `src/lib/pos-draft.ts`, `src/lib/checkout-prefs.ts`, `src/lib/vietqr.ts`, `src/lib/theme.ts` (`#ECEFED` / `#0C100E`), `src/lib/welcome.ts`, `src/lib/push.ts`, `src/lib/reminders-cron.ts`, `src/lib/supabase/{client,server,admin}.ts`.
- `src/hooks/useRealtimeSync.ts`, `src/components/providers/{ThemeProvider,PosDataProvider}.tsx`.
- `src/components/shell/AppShell.tsx`: Consumes `useShellPosData()`, skip-to-main-content link, neutral frosted top bar & 5-tab bottom **Floating Glass Dock**, and directional slide-left/right tab transitions (`useLayoutEffect` + sticky-safe `onAnimationEnd` cleanup).
- `src/components/ui/`: `ModalDialog.tsx` (default slide-up animation, `.glass-backdrop`, stacked `Escape`, `Tab` focus trap, focus restoration, scroll lock, `hasOpenModalDialog()` — wired across all 13 active app dialogs/drawers), `ModalHeader.tsx`, `OrderStatusBadge.tsx`, `QtyNumberInput.tsx`, `BrandMark.tsx`, `AppBootSplash.tsx`, `BrandLoadingScreen.tsx`, `VndKInput.tsx`, `PaymentAccountSelector.tsx`, `ThemeToggle.tsx`, `PageSkeletons.tsx`, `EmptyStateCard.tsx`.
- `src/components/orders/`: `OrdersTotalsStrip.tsx`, `OrdersFilterBar.tsx`, `OrdersDesktopTable.tsx`, `OrdersMobileList.tsx`, `OrderDetailModal.tsx`, `OrderLedgerEditModal.tsx`, `CsvImportModal.tsx`, `CsvImportPreviewPanel.tsx`, `CsvImportResultView.tsx`.
- `src/components/pos/`: `ProductCatalog.tsx`, `ProductCard.tsx`, `ProductFormModal.tsx`, `CustomerPicker.tsx`, `CartPanel.tsx`, `CheckoutModal.tsx`, plus `checkout/{CheckoutSuccessView,CheckoutBuyerSection,CheckoutOrderSummary,CheckoutBookkeepingSection}.tsx`.
- `src/components/debts/*`, `src/components/qr/VietQRModal.tsx`, `src/components/invoice/{InvoicePreviewModal,ReceiptTemplate}.tsx`, `src/components/stats/RevenueCashChart.tsx`, `src/components/pwa/PushNotificationSetup.tsx`, `src/components/welcome/WelcomeOnboardingModal.tsx`.

### Unit Tests (`tests/unit/` — 14 files, 97 tests)
- `csv-import.test.ts` (RFC-4180 BOM/CRLF parsing, `ThuChi.csv` exact reconciliation `57` rows / `45` grouped orders / `40` customers / `46` products / `48.320.000đ` revenue / `37.234.000đ` cost / `11.086.000đ` profit / `320.000đ` paid / `48.000.000đ` debt, line 55 skipped, line 65 summary ignored, `'Trần Huyền'` → `'Khác'` note, ungrouped mode, idempotent duplicate skip)
- `shared-utils.test.ts` (`customers.ts` search/filter/stub helpers + timezone-safe `'30d'` & `computeVnDatePresetIsoRange` tests)
- `currency-k.test.ts`, `ledger.test.ts`, `ux-guards.test.ts` (neutral 60–30–10 glassmorphism, `#ECEFED` grid / `#0C100E` dot-grid, `"Thêm món"` without `"Món lẻ"`, slide-up & directional tab animations, Anti-AI-Slop bans, `>= 16px` inputs, `>= 44px` touch targets), `harden-resilience.test.ts`, `distill-checkout.test.ts`, `audit-a11y.test.ts` (`ModalDialog` across all 13 active dialogs, unobstructed `CustomerPicker`, redesigned `stats/page.tsx`, frosted glass cards, `>= 12px` floor, dynamic imports, `aria-pressed`), `mobile-overflow-guards.test.ts`, `tab-cache-architecture.test.ts`, `theme-and-welcome.test.ts`, `vietnamese.test.ts`, `vietqr.test.ts`, `reminders-cron.test.ts`.

---

## 5. Non-Negotiable Conventions & Workflows

1. **Design & Anti-AI-Slop (`DESIGN.md`, `globals.css`, `PRODUCT.md`, Constitution `v1.1.0`)**:
   - **Strict 60–30–10 Architectural Neutral Glassmorphism (Light)**: 60% Warm Gray (`#ECEFED`) solid base + `28px` dark forest-gray grid lines (`rgba(15, 23, 20, 0.07)`); 30% pure neutral frosted white glass tiles (`.glass-dock`, `.glass-surface`, `.glass-panel`, `.glass-card`, `.glass-modal`, `.glass-chip-active`, `.glass-icon-orb`) with zero green-tinted glass; 10% solid opaque Deep Forest Jade `#0E6B4E` reserved strictly for important primary CTAs and semantic status badges.
   - **Strict 60–30–10 Architectural Neutral Glassmorphism (Dark)**: 60% Matte Obsidian (`#0C100E`) solid base + `24px` crisp white dot-grid (`rgba(255, 255, 255, 0.08)`); 30% pure neutral frosted obsidian glass tiles with subtle silver specular bevels; 10% solid `#127A59` Jade CTAs & accessible semantic badges. `.print-surface-light` solid white paper lock on receipts & VietQR.
   - **Motion**: Modals/sheets slide up smoothly (`.animate-sheet-up` / `.animate-modal-in`), top-level tabs slide left/right directionally (`.animate-tab-slide-left` / `.animate-tab-slide-right`) with sticky-safe cleanup and opacity-only `prefers-reduced-motion` fallback.
   - **Canonical Typography & A11y**: `Be Vietnam Pro` + `tabular-nums`, `>= 12px` Vietnamese floor, `>= 16px` input floor, `>= 44px`/`48px` touch targets, all 13 active dialogs on `ModalDialog`, zero banned AI-slop tokens (`indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`, scattered raw `backdrop-blur`/`shadow-lg`/`rounded-2xl`/`rounded-3xl` in TSX).
2. **Data Integrity**: Integer VND (`bigint`) everywhere in DB & VietQR; `K` conversion strictly at UI layer; never expose secrets/tokens in client code or git.
3. **Spec Kit & Impeccable Workflows**: Features under `specs/<NNN>-<slug>/` (active feature tracked in `.specify/feature.json`, gitignored).
4. **Verification Gate Before Any Commit/PR**:
   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```

---

## 6. Current Status & Open Backlog

- **Live in Production (`main`, deployed to `https://paytrack-pos.vercel.app`, tag `v2.3.1`)**:
  - Live Supabase (`mezuxaqvbtjbbtugsohm`) migrated through `0005_mom_ledger_fields.sql`.
  - Shipped `v2.3.0` (`PR #19`, `specs/004-pos-ux-csv-glass/` `T001`–`T025`): POS `"Thêm món"` toolbar cleanup, unobstructed mobile `"Chọn khách"`, redesigned 2-tier `"Thống kê"` hierarchy, automated `ThuChi.csv` importer (`src/lib/csv-import.ts`, `POST /api/import/csv`, `CsvImportModal`), system-wide neutral 60–30–10 glassmorphism + Warm Gray `#ECEFED` grid / Matte Obsidian `#0C100E` dot-grid backdrop, modal slide-up & sticky-safe directional tab slide animations, refreshed `DESIGN.md` + `.impeccable/design.json`.
  - Shipped `v2.3.1` (`refactor/modularize-shared-core`): Modularized monoliths & extracted shared reusable core (`browser-export`, `customers`, `api-auth`, `OrderStatusBadge`, `ModalHeader`, `csv-import/*`, `pos/checkout/*`, `orders/*`, `ProductCard`), removed 3 dead components, deduplicated `DebtCustomerDrawer` queries & `/stats` date presets (`97/97` unit tests, `15/15` routes).

---

## 7. Maintenance Protocol for AI Agents (NHẮC NHỞ BẮT BUỘC)

> [!IMPORTANT]
> **KHI NÀO CẦN CẬP NHẬT FILE NÀY**:
> Không cần cập nhật sau các câu trả lời hỏi-đáp thông thường để tiết kiệm quota.
> **BẮT BUỘC cập nhật `PROJECT_CONTEXT.md`** ngay trước khi kết thúc tác vụ mỗi khi hoàn thành một trong các việc sau:
> 1. **Sửa xong 1 bug** (`/speckit-bug-fix` hoặc patch lỗi)
> 2. **Hoàn thành 1 tính năng mới / thay đổi UI hoặc logic** (`/speckit-implement` hoặc feature PR)
> 3. **Thay đổi DB schema, RPC, API route, biến môi trường, hoặc cấu hình deploy**
> 4. **Phát hành version mới hoặc merge PR**
>
> **Cập nhật những gì**: Chỉnh lại các mục bị ảnh hưởng trong Sections 2–6 (routes/components/tables/env/status), cập nhật `Last Updated`, và thêm 1 dòng ngắn gọn vào bảng **Recent Changelog** bên dưới. **Tuyệt đối không ghi secret/token/key vào file này.**

### Recent Changelog
| Date | Version / Scope | Summary |
|---|---|---|
| 2026-11-17 | `v1.0.0` MVP | Built & converged MVP (`T001`–`T043`), deployed Vercel + Supabase (`0001`–`0003` + `pg_cron`), added `bug` extension `v1.0.2`. |
| 2026-11-17 | `v1.0.1` Bug Fixes + Context | Hardened `runReminderCron`, added `PosDataProvider` shared tab cache & mobile overflow guards; added `PROJECT_CONTEXT.md`, `AGENTS.md`, and persistent `paytrack-pos-context` skill. |
| 2026-11-17 | `v1.1.0` UX Polish & Theme (`002-ux-polish-theme`) | Completed `T001`–`T046`: smooth Light/Dark/System theme (`280ms`, zero-flash bootstrap, `.print-surface-light`), `BrandLoadingScreen` + 5 skeletons + `FetchErrorCard`, 3-layer Welcome, CSS micro-animations, and `ux-guards` tests. |
| 2026-11-17 | `v1.1.1` Push Cron Fix & Release (`PR #4`) | Added `0004_cron_heartbeat.sql`, `POST /api/push/dispatch-due`, cron diagnostics, and verified scheduled + daily auto Web Push live. |
| 2026-11-17 | `v1.1.2` Settings & Daily Digest Fix (`PR #6`, `PR #7`) | Fixed Settings form remount hiding save banner, added `shouldResetDigestSentDate()` in-day reschedule reset, and added `digestStatus` diagnostics. |
| 2026-11-23 | `v2.0.0` 12-Field Ledger & Floating Glass Dock (`PR #8`) | Applied migration `0005` live, merged PR #8 & tagged `v2.0.0`: RPCs (`update_order_ledger_fields`, 9 payment accounts, cost/profit, `purchased_at`/`paid_at`), `VndKInput` (`K` / `.000đ` + 1000x guard), inline `-`/`+` steppers, exposed POS Customer Bar, 12-col Sales Ledger + inline debt collect + UTF-8 BOM CSV export, 60–30–10 Floating Glass Dock, crisp PWA icons + zero-flash `AppBootSplash`, 4-section simplified Settings, and full AI-slop copy purge (`58/58` tests pass). |
| 2026-11-23 | `v2.0.1` Phase 8 Convergence Polish (`PR #9`) | Merged PR #9 & tagged `v2.0.1` (`T032`–`T037`, converged 0 findings): added `/orders` date-range filter (`purchased_at`), dot-grouped thousands safeguard (`"125.000"`/`"1.250.000"`), deduplicated paid-order VietQR CTA, multi-tag `meta[name="theme-color"]` sync, sticky 12-col desktop table scroll bound, and unified `Chưa nhập vốn` badge (`59/59` tests pass). |
| 2026-11-24 | `v2.1.0` Impeccable UI/UX Overhaul & Hardening (`PR #10`, `PR #11`) | Merged PR #10–#11 & tagged `v2.1.0`: `ModalDialog` across all 13 dialogs, `useShellPosData` context split, dynamic `qrcode` + `html-to-image`, flat scrolling KPI cards, `--status-debt` `#9A4306` (`5.95:1`) & `--status-overdue-solid` `#DC2626` (`4.83:1` dark), `parseKToVnd` direct multi-dot millions (`1.250.000`), `CheckoutModal` post-RPC fallback + `Enter`-safe buyer search/create + auto-scroll errors + `noValidate` + partial-over-total guard + adaptive paid/debt CTAs + `Ctrl/Cmd+Enter` shortcut, paid-receipt smart VietQR default & calm Jade settled badge, pinned mobile/desktop `CartPanel` + 10s Undo + `syncProductInCart`, 1-row `375px` search bar + `iconOnly` mobile theme button, 3-step `WelcomeOnboardingModal` accordion, `buildZaloDebtMessage` walk-in `anh/chị` copy, full secondary-route `htmlFor`/`id` & `aria-pressed` semantics (`80/80` tests pass, `0` detector errors/warnings). |
| 2026-11-24 | `feat/liquid-glass-ui-overhaul` Liquid Glass 3D UI Overhaul (`PR #12`, `PR #13`) | Rebuilt full-app presentation into a 4-tier Liquid Glass / Jade Crystal optical material system across all routes & modals while preserving 100% business logic, `.print-surface-light`, and `80/80` tests. |
| 2026-11-24 | `fix/ui-taste-redesign` Crystal Liquid Glass Full-App Redesign (`PR #14`) | Merged PR #14 (Turns 1 & 2): 3D specular bevel crystal system (`mask-composite: exclude`), caustic Jade CTAs/active pills, opaque-inside-translucent controls, `Be Vietnam Pro` `tabular-nums`, untruncated 5-tab dock, compact 1-row Price + stepper POS cards, and synchronized all secondary routes, modals, drawers & charts (`80/80` tests pass). |
| 2026-11-24 | `fix/neutral-60-30-10-backdrop` Neutral 60-30-10 Studio Canvas (`PR #15`) | Switched Light/Dark canvases to neutral tones obeying 60-30-10 so Deep Forest Jade `#0E6B4E` stays a clean 10% accent. |
| 2026-11-25 | `fix/wallpaper-tile-pop` Tile-Pop Studio Wallpaper (`PR #16`) | Upgraded Light (`#BCC3CE` Sunlit Limestone & Pewter Slate) and Dark (`#161C26` Lit Brushed Titanium & Deep Graphite) wallpapers plus brighter frosted crystal tiles & grounded 3D shadows so every tile stands out distinctly above the backdrop while keeping strict 60-30-10 balance. |
| 2026-11-25 | `v2.2.0` Crystal Liquid Glass Audit & POS Critique Polish (`PR #17`) | Refreshed & compacted `DESIGN.md` + `.impeccable/design.json`; resolved all 15 audit findings and completed 6-step POS critique (`layout`, `harden`, `quieter`, `distill`, `clarify`, `polish`; `84/84` tests). |
| 2026-11-25 | `v2.3.0` POS UX, Stats Hierarchy, CSV Import & Neutral Geometric Glassmorphism (`PR #19`) | Replaced `"Món lẻ"`/`"Thêm SP"` with 1-tap `"Thêm món"`; removed mobile keyboard auto-popup on `"Chọn khách"`; redesigned `"Thống kê"` into 2 Hero + 2 Compact KPIs with inline cash-vs-transfer bar (removed standalone Payment Breakdown & Debt Aging boxes); shipped `ThuChi.csv` importer (`src/lib/csv-import.ts`, `POST /api/import/csv`, `CsvImportModal` in `/orders` & `/settings`) with preview, grouping, lowest-price catalog creation, leading-date fallback notice, and duplicate protection; overhauled to strict 60–30–10 neutral glassmorphism (zero green glass) over Warm Gray `#ECEFED` grid (`7%`) & Matte Obsidian `#0C100E` dot-grid (`8%`); added modal slide-up & sticky-safe directional tab slide-left/right animations (`92/92` tests). |
| 2026-11-25 | `v2.3.1` Modularization & Code Reuse Refactor (`refactor/modularize-shared-core`) | Removed 3 orphaned components (`QuickItemModal`, `DebtAgingCard`, `PaymentBreakdownChart`); extracted shared utilities (`src/lib/browser-export.ts`, `src/lib/customers.ts`, `src/lib/api-auth.ts`) and UI primitives (`OrderStatusBadge`, `ModalHeader`); unified `/stats` & `/orders` VN date ranges via `computeVnDatePresetIsoRange` (fixing TZ shift); split `csv-import.ts` (917→27 barrel + `csv-import/{types,parsers,planner}.ts`); decomposed `CheckoutModal` (1515→728 lines), `orders/page.tsx` (1301→387 lines), `CsvImportModal` (637→339 lines), and `ProductCatalog` (529→392 lines + `ProductCard`); deduplicated `DebtCustomerDrawer` queries (`97/97` tests). |
