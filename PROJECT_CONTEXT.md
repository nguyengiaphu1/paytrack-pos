# PayTrack POS — Project Context & Agent Quickstart

> **Purpose**: Single-source-of-truth context file for AI assistants and developers. Read this file first in a new session instead of scanning the entire repository.
> **Last Updated**: 2026-11-24 (`v2.1.0` — Impeccable UI/UX Overhaul, Audit Optimize & Critique Hardening merged via PR #10–#11; 80/80 tests pass)

---

## 1. Project Overview & Tech Stack

**PayTrack POS** (`v2.1.0`) is a responsive Vietnamese home online-shop sales ledger and rapid order-entry app (juggling Zalo/Messenger chats on iPhone `375px` + evening 12-column ledger/profit reconciliation on Windows `1280px+`), with 12-field sales ledger & 9 payment accounts, FIFO customer debt ledger, multi-device Web Push reminder (iPhone Safari PWA + Windows Chrome/Edge), dynamic VietQR, customizable e-invoice (`PNG` / `A5` / `80mm`), Excel-safe CSV export, and visual analytics.

- **Framework**: Next.js `^16.4.6` (App Router, Turbopack dev), React `^19.3.1`, TypeScript `^5.9.0`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), 60–30–10 Light/Dark WCAG AA CSS custom properties (`--status-debt: #9A4306` in Light for `5.95:1` contrast, `--status-overdue-solid: #DC2626` in Dark for `4.83:1`) + intentional `.glass-dock`/`.glass-surface` utilities (`prefers-reduced-transparency` + opacity-preserving `prefers-reduced-motion` compliant) in `src/app/globals.css`, fonts `Be Vietnam Pro` + `JetBrains Mono` (`>= 12px` Vietnamese floor, `>= 16px` input floor)
- **Database / Auth / Realtime / Cron**: Supabase (`@supabase/ssr ^0.9.0`, `@supabase/supabase-js ^2.100.0`, Postgres 17, `pg_cron` + `pg_net`)
- **Utilities**: `qrcode` (dynamically imported EMVCo/Napas 247 VietQR), `html-to-image` (dynamically imported PNG export/share), `web-push` (VAPID Web Push), `recharts` (charts), `lucide-react` (icons)
- **Testing**: `vitest ^4.1.0` (unit tests in `tests/unit/` — 12 suites, 80 tests)

---

## 2. Environments, Git & Live Deployment (Non-Secret)

### Git Topology
- `main`: Active production branch (`v2.1.0` via PR #1–#11). Create feature/fix/chore branches from `main` — **do not commit directly to `main`**.
- Previous branches: `feat/spec-kit-foundation` (PR #1), `feat/001-paytrack-pos-mvp` (PR #2), `feat/002-ux-polish-theme` (PR #3), `fix/cron-reminders-not-firing` (PR #4), `chore/release-1.1.1` (PR #5), `fix/daily-digest-not-firing` (PR #6), `chore/release-1.1.2` (PR #7), `feat/003-mom-ledger-glass-dock` (PR #8), `fix/003-converge-polish` (PR #9), `fix/ui-impeccable-overhaul` (PR #10), `chore/release-2.1.0` (PR #11). Tags: `v1.0.0`–`v2.1.0`.

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
- `create_order_with_items(...)`: Locks customer, supports buyer snapshots (`name`, `address`, `phone`), `purchased_at`, `total_cost` + item `cost_price` snapshots, `payment_account`/`note`, `paid_at` (auto-filled when `paid`), logs initial `debt_payments` with account & `paid_at`, recomputes debt.
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
- `src/app/layout.tsx`: Root HTML (`lang="vi"`, `suppressHydrationWarning`), inline pre-hydration `THEME_BOOTSTRAP_SCRIPT`, dynamic Light/Dark `viewport.themeColor`, full PWA/favicon metadata, `ThemeProvider`, `AppBootSplash`, Google Fonts (`Be Vietnam Pro`, `JetBrains Mono`).
- `src/app/loading.tsx`: Root branded splash (`BrandLoadingScreen`).
- `src/app/manifest.ts`: Web App Manifest (`/manifest.webmanifest`, `any` + `maskable` icons, standalone portrait PWA).
- `src/app/login/page.tsx`: Focused single-card glass auth UI with `BrandMark` & `ThemeQuickToggle`.
- `src/app/auth/callback/route.ts`: PKCE code exchange (`exchangeCodeForSession`).
- `src/app/(app)/layout.tsx`: Server auth guard + `shop_profiles` fallback upsert + `PosDataProvider` & `AppShell`.
- `src/app/(app)/loading.tsx`: App shell route skeleton (`PosWorkspaceSkeleton`).
- `src/app/(app)/page.tsx`: **POS Workspace** — compact header + contextual alerts, primary column housing flat compact `CustomerPicker` (with `<Check>` + `Enter`-to-select single match) + `ProductCatalog` (unified 1-row search/`Món lẻ`/`Thêm SP`, desktop `/` + `Enter`-to-add shortcut, horizontal scrollable categories, conditional `Đã ẩn (N)` with 1-tap unarchive, explicit `Sửa` edit mode, `sm:items-start` grid alignment, mobile ledger rows & desktop 2–3 col cards, `QtyNumberInput`), desktop sticky `CartPanel` (`lg:max-h-[calc(100dvh-168px)]` preventing Floating Glass Dock overlap, full-width clear confirm strip + 10s Undo banner, `syncProductInCart` on edit), mobile floating cart pill + pinned-footer `ModalDialog` cart drawer (`variant="sheet"`), online-first `CheckoutModal` (session-keyed snapshot, post-RPC fallback confirmation resilience, `Enter`-safe inline buyer search/create with smooth scroll-focus, partial-over-total recovery, explicit paid/debt submit label, itemized preview, MRU `PaymentAccountSelector`, optional `Tính tiền thối`, collapsed bookkeeping disclosure, context-adaptive primary `Hóa đơn` / `Tạo QR` post-save CTAs).
- `src/app/(app)/debts/page.tsx`: **Debt Ledger** — flat ledger KPI strip & `.glass-surface` search/filter (searches name, phone, address), deep-links (`?customer=`, `?filter=due`), opens `DebtCustomerDrawer` (`ModalDialog` stacked cleanly under `CollectDebtModal` / `ReminderModal` / `VietQRModal`).
- `src/app/(app)/orders/page.tsx`: **12-Column Sales Ledger** — flat ledger totals strip (Giá bán / Giá vốn / Lãi / Còn nợ excluding cancelled) & `.glass-surface` filter bar (search + status + 9 payment accounts + `Chưa có TK` + VN date presets & custom `Từ`/`Đến` range on `purchased_at`), bounded scrollable 12-column sticky desktop table & overflow-free mobile cards (unified `Chưa nhập vốn` badge), `ModalDialog` order detail & `OrderLedgerEditModal` (full `htmlFor`/`id` bindings), inline `CollectDebtModal`, UTF-8 BOM Excel CSV export (`Xuất CSV`), pagination (`loadMoreOrders`), deduplicated Order Detail actions, `InvoicePreviewModal` (paid-order smart QR default, `Gửi ảnh` primary CTA, download feedback), `VietQRModal` (`context="order" | "debt"`, preserved order memo, dynamic `qrcode`), `cancel_order`.
- `src/app/(app)/stats/page.tsx`: **Analytics** — date presets + 9 payment account filter, 7 flat KPI cards (`16px` mobile / `20px` desktop), `RevenueCashChart`, `PaymentBreakdownChart`, `DebtAgingCard`, top products & top debtors (proper `h1` -> `h2` hierarchy).
- `src/app/(app)/settings/page.tsx`: **Simplified 4-Section Settings** — (1) Shop & VietQR (`Shop của Mẹ`, full `htmlFor`/`id` bindings), (2) Nhắc nợ (`PushNotificationSetup` single-row toggle + collapsible `<details>` diagnostics + daily digest time with `shouldResetDigestSentDate` reset & inline save feedback above submit button), (3) Giao diện (`SettingsThemeSelector`), (4) Tài khoản (email + `Thiết lập nhanh` re-triggering onboarding + Đăng xuất).

### API Routes & Service Worker
- `src/app/api/push/subscribe/route.ts`: `GET` (devices + pending/overdue/due/cronHeartbeat/digestStatus), `POST` upsert, `DELETE` remove.
- `src/app/api/push/test/route.ts`: `POST` sends test Web Push notification.
- `src/app/api/push/dispatch-due/route.ts`: `POST` authenticated single-user dispatch (`runReminderCron(now, { userId })`).
- `src/app/api/cron/reminders/route.ts`: `GET` / `POST` (`Authorization: Bearer $CRON_SECRET`) runs `runReminderCron()` and records `cron_heartbeats`.
- `public/sw.js`: Handles `push` and `notificationclick` deep-linking.

### Libraries, Hooks, Providers & Components
- `src/types/database.ts`: Shared TS interfaces (`PaymentAccount`, `ShopProfile`, `Product`, `Customer`, `Order`, `OrderItem`, `DebtPayment`, `DebtReminder`, `PushSubscriptionRecord`, `CartItem`, `AnalyticsSummary`).
- `src/lib/vietnamese.ts`: `stripVietnamese`, `formatVND`, `computeLineTotal`, `computeOrderTotals`, VN date/time helpers, `shouldResetDigestSentDate`, `buildZaloDebtMessage` (normalizes walk-in names `Khách lẻ`/`Khách hàng` to polite `anh/chị`).
- `src/lib/currency-k.ts`: `sanitizeKInput`, `parseKToVnd`, `formatVndToKInput`, `detectLikelyFullVndMistake` (K-unit `<->` VND `bigint` conversion, pure-integer 1000x guard, and Vietnamese dot-grouped thousands `"125.000"`/`"1.250.000"` safeguard).
- `src/lib/ledger.ts`: `PAYMENT_ACCOUNTS`, `isPaymentAccount`, `formatPaymentAccount`, `summarizeOrderItems`, `computeItemsCostTotal`, `computeOrderProfit`, `hasMissingCostPrice`, `computeLedgerTotals`, `resolveOrderPaidAt`, `toVnDateInput`, `dateInputToVnIso`, `computeVnDatePresetRange`, `isOrderInVnDateRange`, `buildLedgerCsv` (12-column UTF-8 BOM CSV).
- `src/lib/errors.ts`: `formatErrorMessageVN` translating raw network/JWT/Postgres errors to natural Vietnamese.
- `src/lib/pos-draft.ts`: `useSyncExternalStore`-backed `localStorage` POS draft persistence + `sanitizeQtyInput`/`parseQtyDraft`/`formatQtyForInput`.
- `src/lib/checkout-prefs.ts`: Online-first checkout preference & MRU 4-account quick-pick persistence (`getQuickPickAccounts`).
- `src/lib/vietqr.ts`, `src/lib/theme.ts` (multi-tag `meta[name="theme-color"]` sync), `src/lib/welcome.ts`, `src/lib/push.ts`, `src/lib/reminders-cron.ts`, `src/lib/supabase/{client,server,admin}.ts`.
- `src/hooks/useRealtimeSync.ts`, `src/components/providers/{ThemeProvider,PosDataProvider}.tsx` (`PosDataProvider` exports split `useShellPosData()` isolating `AppShell` from cart mutations, `syncProductInCart()`, persists POS draft via `useSyncExternalStore`, resets customer on save, fetches nested `order_items`, sorts by `purchased_at DESC`, supports `loadMoreOrders`, `upsertOrderLocal`, and `paymentAccount` analytics).
- `src/components/shell/AppShell.tsx`: Consumes `useShellPosData()`, skip-to-main-content link (`#main-content`), slim translucent top bar (`SyncStatusPill` `"Đã đồng bộ"` with `role="status"`), and unified bottom **Floating Glass Dock** (`.glass-dock`, `12px` mobile dock labels) on both `375px` and `1280px` (no desktop left rail), `useAppUser()` (`userId`, `userEmail`, `openOnboarding`).
- `src/components/ui/`: `ModalDialog.tsx` (stacked `Escape`, `Tab` focus trap, focus restoration, scroll lock, `hasOpenModalDialog()` — wired across all 13 app dialogs/drawers), `QtyNumberInput.tsx`, `BrandMark.tsx`, `AppBootSplash.tsx`, `BrandLoadingScreen.tsx`, `VndKInput.tsx`, `PaymentAccountSelector.tsx` (MRU 3-chip default + 2-group expand + `aria-pressed`), `ThemeToggle.tsx`, `PageSkeletons.tsx`, `EmptyStateCard.tsx`.
- `src/components/orders/OrderLedgerEditModal.tsx`, `src/components/pos/*`, `src/components/debts/*`, `src/components/qr/VietQRModal.tsx` (`context="order" | "debt"`, dynamic `qrcode` + `html-to-image`, `VndKInput`, `aria-pressed`), `src/components/invoice/{InvoicePreviewModal,ReceiptTemplate}.tsx` (paid-order smart QR default, calm Jade settled badge, `Gửi ảnh` primary CTA, dynamic `qrcode` + `html-to-image`), `src/components/stats/*`, `src/components/pwa/PushNotificationSetup.tsx`, `src/components/welcome/WelcomeOnboardingModal.tsx` (3-step progressive accordion, accurate completion check, auto-saves dirty inputs on finish).

### Unit Tests (`tests/unit/` — 12 files, 80 tests)
- `currency-k.test.ts` (`K <-> VND`, `.`/`,` decimals, round-trip, 1000x & dot-grouped thousands guards)
- `ledger.test.ts` (9 payment accounts + `Khác`, item summaries, profit excluding cancelled, missing cost detection, `paid_at` resolution, VN date inputs & date-range presets, 12-col UTF-8 BOM CSV)
- `ux-guards.test.ts` (60–30–10 + `.glass-dock`/`.glass-surface`, `prefers-reduced-transparency` & `prefers-reduced-motion`, PWA icons & `AppBootSplash`, Floating Glass Dock without `228px` rail, exposed POS Customer Bar, simplified Settings, `.print-surface-light`, strict AI-slop bans, `>= 16px` inputs, `>= 44px` touch targets)
- `harden-resilience.test.ts` (Vietnamese error mapping, `pos-draft` persistence, `QtyNumberInput`, session-keyed Checkout snapshot, 2-tap clear confirm + Undo)
- `distill-checkout.test.ts` (online-first `full_transfer` default, MRU account ordering, `context="order"` VietQR copy)
- `audit-a11y.test.ts` (`ModalDialog` mechanics & all 13 wired dialogs, `htmlFor`/`id` across POS & secondary routes, `ProductCatalog` `/` shortcut & live announcements, desktop sticky cart dock clearance, strict `>= 12px` legibility floor, opacity-preserving `prefers-reduced-motion`, `#main-content` skip link, dynamic `html-to-image` & `qrcode`, split `useShellPosData`, `aria-pressed` toggles, Checkout `Enter`-key & paid-receipt QR guards)
- `mobile-overflow-guards.test.ts`, `tab-cache-architecture.test.ts`, `theme-and-welcome.test.ts`, `vietnamese.test.ts` (incl. walk-in `anh/chị` greeting), `vietqr.test.ts`, `reminders-cron.test.ts`.

---

## 5. Non-Negotiable Conventions & Workflows

1. **Design & Anti-AI-Slop (`DESIGN.md`, `.impeccable/design-full.md`, `.impeccable/design.json`, `PRODUCT.md`, Constitution `v1.1.0`)**:
   - **60–30–10 Light**: `#F5F7F6` canvas (60%), `#FFFFFF` sheets & `.glass-dock`/`.glass-surface` (30%), `#0E6B4E` Jade / `#9A4306` debt (`5.95:1` on `#FEF3C7`) / `#B91C1C` overdue (10%).
   - **60–30–10 Dark (`:root[data-theme="dark"]`)**: `#0D1215` canvas, `#151C21` surface, `#1D272E` subtle, `#293640` borders, `#F1F5F4` ink, `#15805E` Jade CTA / `#4CC39B` Jade text, `+0.005em` body tracking. `.print-surface-light` lock on receipts & VietQR.
   - **Canonical Typography**: 7 Operate steps (`12 / 13 / 14 / 15 / 16 / 20 / 24px`), `>= 12px` Vietnamese diacritic floor (zero `10px`/`11px`), `>= 16px` input floor, `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs.
   - **Semantic Glass Only**: Real-time blur is restricted exclusively to `.glass-dock` and `.glass-surface` in `globals.css` (floating chrome, filter bars, and login card only — never inline scrolling KPI or form cards; `prefers-reduced-transparency` fallback). Permanent AI-slop bans: `indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`, scattered `backdrop-blur`/`shadow-lg`/`rounded-2xl`/`rounded-3xl` in TSX.
   - **Mobile Ergonomics & A11y**: `>= 44px`/`48px` touch targets, all 13 dialogs on `ModalDialog`, full `htmlFor`/`id` + `aria-pressed` semantics, concise Vietnamese home online-shop copy (`Shop của Mẹ`).
2. **Data Integrity**: Integer VND (`bigint`) everywhere in DB & VietQR; `K` conversion strictly at UI layer; never expose secrets/tokens in client code or git.
3. **Spec Kit & Impeccable Workflows**:
   - Features under `specs/<NNN>-<slug>/` (active feature tracked in `.specify/feature.json`, gitignored).
   - Shared `impeccable` `0.1.27` context: `PRODUCT.md` (schema 1, `web`), `DESIGN.md` (compacted map) + `.impeccable/design-full.md`, `.impeccable/design.json` (schemaVersion 2), `.impeccable/surfaces/`, `.impeccable/config.json` (`telemetry: false`, `buildPath: "comp"`, `reports.commit: false`), `.impeccable/live/config.json`. Local reports/reviews ignored in `.gitignore`.
4. **Verification Gate Before Any Commit/PR**:
   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```

---

## 6. Current Status & Open Backlog

- **Live in Production (`v2.1.0` via PR #10–#11 on `main`, deployed to `https://paytrack-pos.vercel.app`)**:
  - Live Supabase (`mezuxaqvbtjbbtugsohm`) migrated through `0005_mom_ledger_fields.sql` (no schema changes required in `v2.1.0`).
  - Completed full Impeccable `0.1.27` context standardization, 7-step UI/UX overhaul (`harden` -> `distill` -> `clarify` -> `audit` -> `layout` -> `typeset` -> `polish`), Audit Optimize pass, and dual-agent Critique P1/P2 remediation (`0` detector errors/warnings, all 13 dialogs on `ModalDialog`, `80/80` unit tests passing, production build verified).

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
