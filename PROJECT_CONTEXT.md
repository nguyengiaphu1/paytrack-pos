# PayTrack POS — Project Context & Agent Quickstart

> **Purpose**: Single-source-of-truth context file for AI assistants and developers. Read this file first in a new session instead of scanning the entire repository.
> **Last Updated**: 2026-11-24 (`fix/ui-taste-redesign` Turns 1 & 2 complete: Full-app 3D Crystal Liquid Glass overhaul across Foundation, Shell, UI primitives, POS, Auth, Settings, Onboarding, Push, Orders, Debts, Stats/Charts, and all 13 modals/drawers)

---

## 1. Project Overview & Tech Stack

**PayTrack POS** (`v2.1.0+crystal-glass`) is a responsive Vietnamese home online-shop sales ledger and rapid order-entry app (juggling Zalo/Messenger chats on iPhone `375px` + evening 12-column ledger/profit reconciliation on Windows `1280px+`), with 12-field sales ledger & 9 payment accounts, FIFO customer debt ledger, multi-device Web Push reminder (iPhone Safari PWA + Windows Chrome/Edge), dynamic VietQR, customizable e-invoice (`PNG` / `A5` / `80mm`), Excel-safe CSV export, and visual analytics.

- **Framework**: Next.js `^16.4.6` (App Router, Turbopack dev), React `^19.3.1`, TypeScript `^5.9.0`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), **Crystal Liquid Glass / Deep Forest Jade (`#0E6B4E`)** 3D specular bevel material system in `src/app/globals.css` (high-contrast directional Forest Jade & Mineral Pearl Light / Obsidian Forest Jade Dark fixed `body::before` + `body::after` optical backdrop, `@layer components` `mask-composite: exclude` 135° specular bevel rims without uniform 1px gray borders, `.glass-well`, `.glass-card`/`-selected`/`-editing`, `.glass-surface`, `.glass-panel`, `.glass-modal`, `.glass-dock`, opaque-inside-translucent `.glass-input` & `.glass-solid-control`, caustic-glow `.glass-btn-primary` & `.glass-pill-jade`, `.glass-chip/-active`, `.glass-badge-*`, `prefers-reduced-transparency` + opacity-preserving `prefers-reduced-motion`, WCAG AA contrast, `.print-surface-light` solid paper lock), fonts `Be Vietnam Pro` (`tabular-nums` for prices/quantities/phones via `.font-mono-tabular`, `>= 12px` Vietnamese floor, `>= 16px` input floor)
- **Database / Auth / Realtime / Cron**: Supabase (`@supabase/ssr ^0.9.0`, `@supabase/supabase-js ^2.100.0`, Postgres 17, `pg_cron` + `pg_net`)
- **Utilities**: `qrcode` (dynamically imported EMVCo/Napas 247 VietQR), `html-to-image` (dynamically imported PNG export/share), `web-push` (VAPID Web Push), `recharts` (charts), `lucide-react` (icons)
- **Testing**: `vitest ^4.1.0` (unit tests in `tests/unit/` — 12 suites, 80 tests)

---

## 2. Environments, Git & Live Deployment (Non-Secret)

### Git Topology
- `main`: Active production branch (auto-deploys to Vercel Production `https://paytrack-pos.vercel.app`). Create feature/fix/chore branches from `main` — **do not commit directly to `main`**.
- Previous branches: `feat/spec-kit-foundation` (PR #1), `feat/001-paytrack-pos-mvp` (PR #2), `feat/002-ux-polish-theme` (PR #3), `fix/cron-reminders-not-firing` (PR #4), `chore/release-1.1.1` (PR #5), `fix/daily-digest-not-firing` (PR #6), `chore/release-1.1.2` (PR #7), `feat/003-mom-ledger-glass-dock` (PR #8), `fix/003-converge-polish` (PR #9), `fix/ui-impeccable-overhaul` (PR #10), `chore/release-2.1.0` (PR #11), `feat/liquid-glass-ui-overhaul`. Tags: `v1.0.0`–`v2.1.0`.

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
- `src/app/login/page.tsx`: Focused single-card Crystal Liquid Glass auth UI with `BrandMark`, `ThemeQuickToggle`, `.glass-pill-jade` segmented `Đăng nhập | Đăng ký` toggle, and `.glass-solid-control` Google button (zero Floating Glass Dock).
- `src/app/auth/callback/route.ts`: PKCE code exchange (`exchangeCodeForSession`).
- `src/app/(app)/layout.tsx`: Server auth guard + `shop_profiles` fallback upsert + `PosDataProvider` & `AppShell`.
- `src/app/(app)/loading.tsx`: App shell route skeleton (`PosWorkspaceSkeleton`).
- `src/app/(app)/page.tsx`: **POS Workspace** — compact header + contextual alerts, primary column housing `CustomerPicker` (with `<Check>` + `Enter`-to-select single match) + `ProductCatalog` (unified 1-row pill search/`Món lẻ`/`Thêm SP`, desktop `/` + `Enter`-to-add shortcut, horizontal scrollable categories with caustic shadow bleed, conditional `Đã ẩn (N)` with 1-tap unarchive, explicit `Sửa` edit mode, `sm:items-stretch` equal-height cards with 1-row Price + inline `-/+` `.glass-solid-control` stepper & `QtyNumberInput`), desktop sticky `CartPanel` (`lg:max-h-[calc(100dvh-168px)]`, full-width clear confirm strip + 10s Undo banner, `syncProductInCart` on edit), mobile floating Jade caustic cart pill + pinned-footer `ModalDialog` cart drawer (`variant="sheet"`), and `rounded-[28px]` POS modals (`ProductFormModal`, `QuickItemModal`, online-first `CheckoutModal` with `.glass-pill-jade` payment presets, `.glass-solid-control` secondary/switcher buttons, session-keyed snapshot, post-RPC fallback resilience, `Enter`-safe inline buyer search/create, MRU `PaymentAccountSelector`, collapsed bookkeeping disclosure, and context-adaptive post-save CTAs).
- `src/app/(app)/debts/page.tsx`: **Debt Ledger** — elevated `.glass-card` KPI strip, `.glass-surface` pill search + `.glass-pill-jade` filter pills (`Đang nợ`, `Đến hạn`, `Tất cả`), `.glass-card` customer rows with `.glass-solid-control` `Chi tiết` & `.glass-btn-primary` `Thu nợ`, deep-links (`?customer=`, `?filter=due`), opening `rounded-t-[28px]` `DebtCustomerDrawer` (`.glass-pill-jade` edit/copied/per-order collect + `.glass-solid-control` QR/reminder/dismiss buttons) stacked cleanly under `rounded-[28px]` `CollectDebtModal` / `ReminderModal` / `VietQRModal`.
- `src/app/(app)/orders/page.tsx`: **12-Column Sales Ledger** — elevated `.glass-card` totals strip (Giá bán / Giá vốn / Lãi / Còn nợ excluding cancelled), airy `.glass-surface` command filter bar (pill search + 3 frosted `<select>` controls + conditional `.glass-well` custom `Từ`/`Đến` tray + active-filter pills & `.glass-solid-control` `Xóa lọc` / `Xuất CSV` / `Tải thêm`), sculpted `rounded-[26px]` `.glass-panel` bounded scrollable 12-column sticky desktop table & overflow-free `.glass-card` mobile cards (unified `Chưa nhập vốn` badge, `.glass-pill-jade` quick `Thu` / `Thu tiền` pills), `rounded-[28px]` `.glass-modal` order detail & `OrderLedgerEditModal`, inline `CollectDebtModal`, UTF-8 BOM Excel CSV export, pagination (`loadMoreOrders`), `InvoicePreviewModal` (`.glass-modal` + `.glass-pill-jade` A5/80mm toggle + solid `.print-surface-light` receipt), `VietQRModal` (`.glass-modal` + `.glass-pill-jade` 3-way toggle + solid `.print-surface-light` QR card), `cancel_order`.
- `src/app/(app)/stats/page.tsx`: **Analytics** — floating `rounded-[24px]` `.glass-surface` bar with `.glass-pill-jade` date presets + pill payment account `<select>`, 7 sculpted `.glass-card` KPI tiles (`16px` mobile / `18px`+ desktop), `rounded-[26px]` `.glass-panel` `RevenueCashChart` (`Be Vietnam Pro` `tabular-nums` axes & crystal tooltip), `PaymentBreakdownChart`, `DebtAgingCard`, top products (`.glass-pill-jade` `#1` rank orb) & top debtors (`.glass-solid-control` tappable rows).
- `src/app/(app)/settings/page.tsx`: **Simplified 4-Section Settings** — 4 cohesive `rounded-[26px]` `.glass-panel` cards: (1) Shop & VietQR (`Shop của Mẹ`, full `htmlFor`/`id` bindings), (2) Nhắc nợ (`PushNotificationSetup` single-row toggle + `.glass-solid-control` test/dispatch actions + `.glass-well` collapsible `<details>` diagnostics + daily digest time with `shouldResetDigestSentDate` reset & inline save feedback above submit button), (3) Giao diện (`SettingsThemeSelector`), (4) Tài khoản (email + `.glass-solid-control` `Thiết lập nhanh` re-triggering `rounded-[28px]` `WelcomeOnboardingModal` + Đăng xuất).

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
- `src/lib/vietqr.ts`, `src/lib/theme.ts` (multi-tag `meta[name="theme-color"]` synced with `#E8F3EF`/`#041013`), `src/lib/welcome.ts`, `src/lib/push.ts`, `src/lib/reminders-cron.ts`, `src/lib/supabase/{client,server,admin}.ts`.
- `src/hooks/useRealtimeSync.ts`, `src/components/providers/{ThemeProvider,PosDataProvider}.tsx` (`PosDataProvider` exports split `useShellPosData()` isolating `AppShell` from cart mutations, `syncProductInCart()`, persists POS draft via `useSyncExternalStore`, resets customer on save, fetches nested `order_items`, sorts by `purchased_at DESC`, supports `loadMoreOrders`, `upsertOrderLocal`, and `paymentAccount` analytics).
- `src/components/shell/AppShell.tsx`: Consumes `useShellPosData()`, skip-to-main-content link (`#main-content`), floating Crystal Liquid Glass top bar (`.glass-surface`, `.glass-icon-orb` `BrandMark`, `.glass-badge-*` `SyncStatusPill` `"Đã đồng bộ"` with `role="status"`, `ThemeQuickToggle` on all viewports), and sculpted 3D bottom **Floating Glass Dock** (`.glass-dock`, `.glass-pill-jade` active pill with emerald caustic glow, untruncated 1-line `12px` mobile dock labels) on both `375px` and `1280px` (no desktop left rail), `useAppUser()` (`userId`, `userEmail`, `openOnboarding`).
- `src/components/ui/`: `ModalDialog.tsx` (default `.glass-backdrop`, stacked `Escape`, `Tab` focus trap, focus restoration, scroll lock, `hasOpenModalDialog()` — wired across all 13 app dialogs/drawers), `QtyNumberInput.tsx`, `BrandMark.tsx`, `AppBootSplash.tsx`, `BrandLoadingScreen.tsx`, `VndKInput.tsx`, `PaymentAccountSelector.tsx` (MRU 3-chip default + `.glass-well` 2-group expand + `.glass-pill-jade` active + `aria-pressed`), `ThemeToggle.tsx`, `PageSkeletons.tsx`, `EmptyStateCard.tsx`.
- `src/components/orders/OrderLedgerEditModal.tsx`, `src/components/pos/*`, `src/components/debts/*`, `src/components/qr/VietQRModal.tsx` (`.glass-modal` chrome + solid `.print-surface-light` QR card, `context="order" | "debt"`, dynamic `qrcode` + `html-to-image`, `VndKInput`, `aria-pressed`), `src/components/invoice/{InvoicePreviewModal,ReceiptTemplate}.tsx` (`.glass-modal` chrome + solid `.print-surface-light` receipt paper, paid-order smart QR default, calm Jade settled badge, `Gửi ảnh` primary CTA, dynamic `qrcode` + `html-to-image`), `src/components/stats/*`, `src/components/pwa/PushNotificationSetup.tsx`, `src/components/welcome/WelcomeOnboardingModal.tsx` (3-step progressive `.glass-modal` accordion, accurate completion check, auto-saves dirty inputs on finish).

### Unit Tests (`tests/unit/` — 12 files, 80 tests)
- `currency-k.test.ts` (`K <-> VND`, `.`/`,` decimals, round-trip, 1000x & dot-grouped thousands guards)
- `ledger.test.ts` (9 payment accounts + `Khác`, item summaries, profit excluding cancelled, missing cost detection, `paid_at` resolution, VN date inputs & date-range presets, 12-col UTF-8 BOM CSV)
- `ux-guards.test.ts` (Crystal Liquid Glass optical utilities + `body::before`/`body::after` depth canvas + `mask-composite: exclude` specular bevels + `Be Vietnam Pro` `tabular-nums`, `prefers-reduced-transparency` & `prefers-reduced-motion`, PWA icons & `AppBootSplash`, Floating Glass Dock without `228px` rail, exposed POS Customer Bar & compact cards, simplified Settings, `.print-surface-light`, strict AI-slop bans, `>= 16px` inputs, `>= 44px` touch targets)
- `harden-resilience.test.ts` (Vietnamese error mapping, `pos-draft` persistence, `QtyNumberInput`, session-keyed Checkout snapshot, 2-tap clear confirm + Undo)
- `distill-checkout.test.ts` (online-first `full_transfer` default, MRU account ordering, `context="order"` VietQR copy)
- `audit-a11y.test.ts` (`ModalDialog` mechanics & all 13 wired dialogs, `htmlFor`/`id` across POS & secondary routes, `ProductCatalog` `/` shortcut & live announcements, desktop sticky cart dock clearance, strict `>= 12px` legibility floor, opacity-preserving `prefers-reduced-motion`, `#main-content` skip link, dynamic `html-to-image` & `qrcode`, split `useShellPosData`, `aria-pressed` toggles, Checkout `Enter`-key & paid-receipt QR guards)
- `mobile-overflow-guards.test.ts`, `tab-cache-architecture.test.ts`, `theme-and-welcome.test.ts`, `vietnamese.test.ts` (incl. walk-in `anh/chị` greeting), `vietqr.test.ts`, `reminders-cron.test.ts`.

---

## 5. Non-Negotiable Conventions & Workflows

1. **Design & Anti-AI-Slop (`DESIGN.md`, `globals.css`, `PRODUCT.md`, Constitution `v1.1.0`)**:
   - **Crystal Liquid Glass Light ("Mineral Pearl & Deep Forest Jade")**: `#E8F3EF` base canvas + fixed `body::before`/`body::after` directional Deep Forest Jade & Aqua refraction beams; translucent `.glass-well`/`.glass-card`/`.glass-surface`/`.glass-panel`/`.glass-modal`/`.glass-dock` with `135°` `mask-composite: exclude` specular bevel rims & multi-layer 3D drop shadows (zero flat 1px gray outlines); glossy caustic `.glass-btn-primary` / `.glass-pill-jade`; opaque-inside-translucent `.glass-input` / `.glass-solid-control`; `#0E6B4E` Jade / `#9A4306` debt / `#B91C1C` overdue.
   - **Crystal Liquid Glass Dark (`:root[data-theme="dark"]`, "Obsidian Forest Jade")**: `#041013` base canvas + deep emerald/teal directional light rays, luminous silver-jade specular bevel rims, `#F2F7F5` ink, `#158763` Jade CTA / `#5CE0B3` Jade text, `+0.005em` body tracking, dark-mode-safe `<option>` background. `.print-surface-light` solid white paper lock on receipts & VietQR.
   - **Canonical Typography**: 7 Operate steps (`12 / 13 / 14 / 15 / 16 / 20 / 24px`), `Be Vietnam Pro` + `tabular-nums` for currency/quantities/phones (`.font-mono-tabular`), `>= 12px` Vietnamese diacritic floor (zero `10px`/`11px`), `>= 16px` input floor, `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs.
   - **Semantic Glass System Only**: All real-time blur & 3D elevation routes through semantic `.glass-*` utilities in `globals.css` (`prefers-reduced-transparency` fallback). Permanent AI-slop bans: `indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`, scattered raw `backdrop-blur`/`shadow-lg`/`rounded-2xl`/`rounded-3xl` in TSX.
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

- **Live in Production (`main`, deployed to `https://paytrack-pos.vercel.app`)**:
  - Live Supabase (`mezuxaqvbtjbbtugsohm`) migrated through `0005_mom_ledger_fields.sql`.
  - Shipped Liquid Glass 3D presentation overhaul (`#12`, `#13`) on `main`.
- **Ready for Push / PR (`fix/ui-taste-redesign` — Turns 1 & 2 complete)**:
  - **Turn 1**: Foundation (`globals.css`, `theme.ts`), `AppShell`, `ui/*`, and POS (`page.tsx`, `CustomerPicker`, `ProductCatalog`, `CartPanel`) upgraded to 3D Crystal Liquid Glass (`135°` specular bevels via `mask-composite: exclude`, directional Forest Jade & Aqua Light/Dark optical backdrop, caustic Jade CTAs & active pills, opaque-inside-translucent inputs/steppers, `Be Vietnam Pro` `tabular-nums`, header `ThemeQuickToggle` on all viewports, 5-tab untruncated 1-line dock, and compact equal-height 1-row Price + inline `-/+` stepper POS cards).
  - **Turn 2**: All remaining routes & modals synchronized to the same Crystal Liquid Glass language — `/login`, `/settings`, `PushNotificationSetup`, `WelcomeOnboardingModal`, `ProductFormModal`, `QuickItemModal`, `CheckoutModal`, `/orders`, `OrderLedgerEditModal`, `InvoicePreviewModal`, `VietQRModal`, `/debts`, `DebtCustomerDrawer`, `CollectDebtModal`, `ReminderModal`, `/stats`, `RevenueCashChart`, `PaymentBreakdownChart`, and `DebtAgingCard` (preserving 100% `v2.1.0` business logic, `.print-surface-light`, `>= 16px` inputs, `>= 44px` touch targets, and `80/80` tests).

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
| 2026-11-24 | `feat/liquid-glass-ui-overhaul` Liquid Glass 3D UI Overhaul | Rebuilt full-app presentation via 3-Phase Swarm into a 4-tier Liquid Glass / Jade Crystal optical material system (`.glass-well`/`-card`/`-surface`/`-panel`/`-modal`/`-dock`/`-input`/`-btn-*`/`-chip*`/`-badge-*`, fixed Light/Dark `body::before` ambient depth canvas, specular rims & 3D elevation) across `AppShell`, `ui/*`, POS, Orders (de-cluttered filter bar replacing 21-chip wall with search + 3 frosted dropdowns), Debts, Stats, Settings, Login, Onboarding, and Invoice/VietQR outer modals while preserving 100% business logic, `.print-surface-light`, and `80/80` tests. |
| 2026-11-24 | `fix/ui-taste-redesign` Turn 1: Crystal Liquid Glass Foundation + POS | Upgraded `globals.css`, `AppShell`, `ui/*`, POS `page.tsx`, `CustomerPicker`, `ProductCatalog`, and `CartPanel` to 3D Crystal Liquid Glass (`mask-composite: exclude` 135° specular bevels, high-contrast directional Forest Jade & Aqua Light/Dark optical backdrop, caustic glow CTAs/active pills, opaque-inside-translucent inputs/steppers, `Be Vietnam Pro` `tabular-nums`, header `ThemeQuickToggle` on all viewports, 1-line untruncated 5-tab dock, `Thêm SP` label, and compact equal-height 1-row Price + inline `-/+` stepper product cards without redundant `Số lượng` footer). |
| 2026-11-24 | `fix/ui-taste-redesign` Turn 2: Secondary Routes, Modals & Charts | Synchronized all remaining routes and dialogs (`/login`, `/settings`, `PushNotificationSetup`, `WelcomeOnboardingModal`, `ProductFormModal`, `QuickItemModal`, `CheckoutModal`, `/orders`, `OrderLedgerEditModal`, `InvoicePreviewModal`, `VietQRModal`, `/debts`, `DebtCustomerDrawer`, `CollectDebtModal`, `ReminderModal`, `/stats`, `RevenueCashChart`, `PaymentBreakdownChart`, `DebtAgingCard`) to the Turn 1 Crystal Liquid Glass language (`rounded-[28px]` modals, `.glass-pill-jade` active toggles/presets/quick-collect pills, `.glass-solid-control` opaque-inside-translucent secondary controls, pill search/selects, `Be Vietnam Pro` `tabular-nums` chart tooltips, mobile safe-area modal padding) while preserving `.print-surface-light`, all `v2.1.0` logic, and `80/80` tests. |
