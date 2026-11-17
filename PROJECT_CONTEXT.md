# PayTrack POS — Project Context & Agent Quickstart

> **Purpose**: Single-source-of-truth context file for AI assistants and developers. Read this file first in a new session instead of scanning the entire repository.
> **Last Updated**: 2026-11-17 (`v1.1.1` — Web Push Cron Reliability, Heartbeat Diagnostics, Overdue Warning & Live Verification)

---

## 1. Project Overview & Tech Stack

**PayTrack POS** (`v1.1.1`) is a responsive Vietnamese retail POS, customer FIFO debt ledger, multi-device Web Push reminder (iPhone Safari PWA + Windows Chrome/Edge), dynamic VietQR, customizable e-invoice (`PNG` / `A5` / `80mm`), and visual analytics web app.

- **Framework**: Next.js `^16.4.6` (App Router, Turbopack dev), React `^19.3.1`, TypeScript `^5.9.0`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), CSS custom properties in `src/app/globals.css` (Light + Dark WCAG AA themes + pure CSS micro-animations + `prefers-reduced-motion`), fonts `Be Vietnam Pro` + `JetBrains Mono`
- **Database / Auth / Realtime / Cron**: Supabase (`@supabase/ssr ^0.9.0`, `@supabase/supabase-js ^2.100.0`, Postgres 17, `pg_cron` + `pg_net`)
- **Utilities**: `qrcode` (EMVCo/Napas 247 VietQR), `html-to-image` (PNG export/share), `web-push` (VAPID Web Push), `recharts` (charts), `lucide-react` (icons)
- **Testing**: `vitest ^4.1.0` (unit tests in `tests/unit/`)

---

## 2. Environments, Git & Live Deployment (Non-Secret)

### Git Topology
- `main`: Active production branch (`v1.1.1`, includes Spec Kit foundation + MVP + `002-ux-polish-theme` + `cron-reminders-not-firing` fix via PR #1, #2, #3, #4). Create feature/fix/chore branches from `main` — **do not commit directly to `main`**.
- Previous branches: `feat/spec-kit-foundation` (PR #1), `feat/001-paytrack-pos-mvp` (PR #2), `feat/002-ux-polish-theme` (PR #3), `fix/cron-reminders-not-firing` (PR #4). Tags: `v1.0.0`, `v1.0.1`, `v1.1.0`, `v1.1.1`.

### Live Infrastructure
- **Vercel Production**: `https://paytrack-pos.vercel.app` (team `phu-nguyen4`, project `paytrack-pos`, preset `nextjs`, Node `24.x`, region `sin1`, plus daily fallback cron `0 1 * * *` via `vercel.json`).
  - *Important*: Supabase env vars currently live in Vercel **Production** only (not `Preview`), so PR preview deployments lack Supabase service keys unless copied.
- **Supabase Project**: ref `mezuxaqvbtjbbtugsohm` (`ap-southeast-1`, Postgres 17).
  - Migrations `0001_initial_schema.sql`, `0002_rpc_functions.sql`, `0003_reminder_cron.sql`, and `0004_cron_heartbeat.sql` applied on live Supabase (`cron_heartbeats` observability + `paytrack_reminder_dispatch` verified live).
  - `pg_cron` job `paytrack_reminder_dispatch` (`* * * * *`, `timeout_milliseconds := 10000` in `0003_reminder_cron.sql`), calling `https://paytrack-pos.vercel.app/api/cron/reminders` with `Authorization: Bearer <CRON_SECRET>`.
  - Auth config: `site_url = https://paytrack-pos.vercel.app`; Email auth enabled; Google OAuth currently disabled on Supabase Auth dashboard (UI button exists in `src/app/login/page.tsx`).

### Required Environment Variables (see `.env.example` — NEVER commit secrets)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `CRON_SECRET`

---

## 3. Database Schema, RLS & RPC Functions

All tables enforce Row Level Security (`user_id = auth.uid()`). All monetary amounts are **integer VND (`bigint`)**.

### Tables (`supabase/migrations/0001_initial_schema.sql`)
1. `shop_profiles`: `user_id` (unique), `shop_name`, `phone`, `address`, `bank_bin`, `bank_name`, `bank_account_no`, `bank_account_name`, `reminder_digest_enabled`, `reminder_default_hour` (`'08:30'`), `last_digest_sent_date`, `default_invoice_format` (`'a5' | '80mm'`), `default_show_cumulative_debt`, `default_show_qr_on_invoice`. Auto-created on signup via `handle_new_user()` trigger (and safe fallback upsert in `src/app/(app)/layout.tsx`).
2. `products`: `name`, `search_text` (diacritic-stripped via `stripVietnamese`), `unit`, `price`, `cost_price` (nullable), `category`, `sku`, `is_active`.
3. `customers`: `name`, `search_text`, `phone`, `note`, `total_debt` (`>= 0`), `next_due_date`.
4. `orders`: `order_code` (`DH-YYYYMMDD-XXXX`), `customer_id` (nullable walk-in), `customer_name_snapshot`, `subtotal`, `discount_amount`, `total_amount`, `paid_amount`, `remaining_amount` (generated `total_amount - paid_amount`), `previous_customer_debt`, `payment_status` (`'paid' | 'partial' | 'unpaid' | 'cancelled'`), `payment_method` (`'cash' | 'transfer' | 'debt' | 'mixed'`), `debt_due_date`, `note`. Constraint: `total_amount = paid_amount OR customer_id IS NOT NULL`.
5. `order_items`: `order_id`, `product_id` (nullable for quick items), `product_name`, `unit`, `unit_price`, `cost_price`, `quantity` (`numeric(10,2)`), `line_total`.
6. `debt_payments`: `customer_id`, `order_id` (nullable), `amount`, `payment_method` (`'cash' | 'transfer'`), `note`, `paid_at`.
7. `debt_reminders`: `customer_id`, `order_id` (nullable), `reminder_type` (`'digest' | 'custom'`), `scheduled_for`, `message`, `target_url`, `status` (`'pending' | 'sent' | 'dismissed'`), `sent_at`.
8. `push_subscriptions`: `user_id`, `endpoint` (unique), `p256dh`, `auth`, `device_label`, `last_seen_at`.
9. `cron_heartbeats` (`0004_cron_heartbeat.sql`): `job_name` (PK), `last_run_at`, `last_status` (`'ok' | 'error'`), `last_summary` (`jsonb`), `last_error` (RLS `SELECT` for authenticated; written only by `service_role`).

### Atomic RPC Functions (`supabase/migrations/0002_rpc_functions.sql` — `SECURITY INVOKER` + `FOR UPDATE`)
- `recompute_customer_debt_state(p_customer_id, p_user_id)`: Recalculates `customers.total_debt` and `MIN(debt_due_date)` across `unpaid`/`partial` orders.
- `create_order_with_items(p_customer_id, p_discount_amount, p_paid_amount, p_payment_method, p_debt_due_date, p_note, p_items)`: Locks customer, rounds `ROUND(qty * unit_price)` per line, creates `DH-YYYYMMDD-XXXX` order + items + initial `debt_payments` (if `customer_id` & `paid > 0`), recomputes debt.
- `record_debt_payment(p_customer_id, p_amount, p_payment_method, p_order_id, p_note)`: Allocates to `p_order_id` or **FIFO oldest-first** (`ORDER BY created_at ASC, id ASC`) across `unpaid`/`partial` orders, logs `debt_payments`, recomputes debt.
- `cancel_order(p_order_id)`: Marks order `cancelled`, dismisses pending `debt_reminders` for that order, reverses **only unpaid `remaining_amount`** from customer debt (preserves historical `debt_payments`).
- `get_analytics_summary(p_start, p_end)`: Returns `{ kpis, daily_series, payment_breakdown, debt_aging, top_products, top_debtors }` in `Asia/Ho_Chi_Minh`.

### Realtime Publication
Enabled on: `products`, `customers`, `orders`, `debt_payments`, `debt_reminders`.

---

## 4. Codebase Map

### App Routes & Middleware
- `src/middleware.ts`: Refreshes Supabase SSR session; redirects unauthenticated page requests to `/login`; bypasses `/login`, `/auth/callback`, `/api/cron/reminders`, `/manifest.webmanifest`, `/sw.js`, `/icons/*`.
- `src/app/layout.tsx`: Root HTML (`lang="vi"`, `suppressHydrationWarning`), inline pre-hydration `THEME_BOOTSTRAP_SCRIPT` in `<head>`, wraps children in `ThemeProvider`, Google Fonts (`Be Vietnam Pro`, `JetBrains Mono`), Apple PWA metadata.
- `src/app/loading.tsx`: Root branded splash (`BrandLoadingScreen`).
- `src/app/manifest.ts`: Web App Manifest (`/manifest.webmanifest`, standalone portrait PWA).
- `src/app/login/page.tsx`: Layer 1 integrated Welcome highlights + Email/password login, signup (passes `shop_name` metadata), password show/hide toggle, password reset, Google OAuth trigger, `ThemeQuickToggle`.
- `src/app/auth/callback/route.ts`: PKCE code exchange (`exchangeCodeForSession`).
- `src/app/(app)/layout.tsx`: Server auth guard + `shop_profiles` fallback upsert + reads `user.user_metadata?.welcome_v2_seen` + wraps children in `PosDataProvider` & `AppShell`.
- `src/app/(app)/loading.tsx`: App shell route skeleton (`PosWorkspaceSkeleton`).
- `src/app/(app)/page.tsx`: **POS Workspace** — `DailyWelcomeBanner`, `PosWorkspaceSkeleton`, `FetchErrorCard`, product catalog, quick item, mobile cart sheet / desktop split-pane (`CartPanel`), checkout (`CheckoutModal`).
- `src/app/(app)/debts/page.tsx`: **Debt Ledger** — `DebtsPageSkeleton`, `FetchErrorCard`, `EmptyStateCard`, KPI strip, filters (`debtors` / `due` / `all`), search, deep-links (`?customer=`, `?filter=due`), opens `DebtCustomerDrawer`.
- `src/app/(app)/orders/page.tsx`: **Order History** — `OrdersPageSkeleton`, `FetchErrorCard`, `EmptyStateCard`, status filter, search, item breakdown modal, `InvoicePreviewModal`, `VietQRModal`, `cancel_order` confirmation.
- `src/app/(app)/stats/page.tsx`: **Analytics** — `StatsPageSkeleton`, `FetchErrorCard`, `EmptyStateCard`, date presets (`today`, `7d`, `30d`, `month`, `custom`), KPI cards with plain Vietnamese subtitles, `RevenueCashChart`, `PaymentBreakdownChart`, `DebtAgingCard`, top products & top debtors.
- `src/app/(app)/settings/page.tsx`: **Settings** — `SettingsPageSkeleton`, `FetchErrorCard`, `SettingsThemeSelector` (Section 1), numbered sections (`PushNotificationSetup`, shop profile, VietQR bank config `VIETNAM_BANKS`, digest & invoice defaults, replayable onboarding trigger, logout).

### API Routes & Service Worker
- `src/app/api/push/subscribe/route.ts`: `GET` (registered devices + `pendingReminders` + `overdueReminders` + `dueCustomersToday` + `cronHeartbeat`), `POST` upsert, `DELETE` remove user's `push_subscriptions`.
- `src/app/api/push/test/route.ts`: `POST` sends test Web Push notification to current user's subscribed devices.
- `src/app/api/push/dispatch-due/route.ts`: `POST` authenticated single-user dispatch (`runReminderCron(now, { userId })`) to flush due reminders/digest on demand from Settings.
- `src/app/api/cron/reminders/route.ts`: `GET` / `POST` (`Authorization: Bearer $CRON_SECRET`, trimmed) delegates to `runReminderCron()` and records `cron_heartbeats`.
- `public/sw.js` (+ no-cache header in `next.config.ts`): Handles `push` (calls `showNotification` for APNs compliance) and `notificationclick` deep-linking (`client.navigate` + `focus` or `openWindow`).

### Libraries, Hooks, Providers & Types
- `src/types/database.ts`: Shared TS interfaces (`ShopProfile`, `Product`, `Customer`, `Order`, `OrderItem`, `DebtPayment`, `DebtReminder`, `PushSubscriptionRecord`, `CartItem`, `AnalyticsSummary`).
- `src/lib/vietnamese.ts`: `stripVietnamese`, `formatVND`, `computeLineTotal`, `computeOrderTotals`, `formatDateTimeVN`, `formatDateVN`, `getTodayVN(now?)`, `buildZaloDebtMessage`.
- `src/lib/vietqr.ts`: `VIETNAM_BANKS`, `sanitizeVietQRMemo`, `computeCRC16CCITT`, `buildVietQRPayload` (EMVCo / Napas 247 dynamic QR).
- `src/lib/theme.ts`: Pure theme utilities (`ThemePreference`, `resolveTheme`, `getNextThemePreference`, `readStoredThemePreference`/`writeStoredThemePreference`, `THEME_BOOTSTRAP_SCRIPT`).
- `src/lib/welcome.ts`: Pure Vietnam time-of-day greeting (`getTimeOfDayGreetingVN` in `Asia/Ho_Chi_Minh`), onboarding mirror & daily greeting collapse storage helpers.
- `src/lib/push.ts`: `sendPushToSubscriptions` (VAPID setup + auto-purges `410`/`404` dead endpoints).
- `src/lib/reminders-cron.ts`: `runReminderCron(now?, { userId? })`, `recordCronHeartbeat()`, `normalizeHHMM()`, `getCurrentTimeHHMM_VN()` — checks DB errors explicitly, dispatches due custom `debt_reminders` & morning digests; only marks `sent` / `last_digest_sent_date` when `res.sent > 0`.
- `src/lib/supabase/client.ts`: Browser client (`createBrowserClient`).
- `src/lib/supabase/server.ts`: Server component/route client (`createServerClient` with Next `cookies()`).
- `src/lib/supabase/admin.ts`: **Server-only** service-role client (`createAdminClient`) — NEVER import in client components.
- `src/hooks/useRealtimeSync.ts`: Subscribes to Supabase `postgres_changes` + `online`/`offline` events (`synced` / `connecting` / `offline`).
- `src/components/providers/ThemeProvider.tsx`: Device-scoped Light / Dark / System provider using `useSyncExternalStore` + `matchMedia` listener + `320ms` `.theme-transitioning` smooth transition window.
- `src/components/providers/PosDataProvider.tsx`: App-level shared tab cache, explicit fetch error states (`catalogError`, `customersError`, `ordersError`, `profileError`), & in-flight request deduplication (`products`, `customers`, `orders`, `profile`, `analyticsCacheRef`, realtime sync).

### Components
- `src/components/shell/AppShell.tsx`: Desktop left rail (`228px`) + mobile top/bottom 5-tab bar + `ThemeQuickToggle` + SW registration + sync pill + offline alert + `WelcomeOnboardingModal` host + `useAppUser()` context.
- `src/components/ui/`: `ThemeToggle.tsx` (`ThemeQuickToggle`, `SettingsThemeSelector`), `BrandLoadingScreen.tsx`, `PageSkeletons.tsx` (5 layout-matched skeletons + `FetchErrorCard`), `EmptyStateCard.tsx`.
- `src/components/welcome/`: `WelcomeOnboardingModal.tsx` (Layer 2 3-step guided setup synced to `user_metadata.welcome_v2_seen`), `DailyWelcomeBanner.tsx` (Layer 3 collapsible greeting strip).
- `src/components/pos/`: `ProductCatalog.tsx`, `ProductFormModal.tsx`, `QuickItemModal.tsx`, `CartPanel.tsx`, `CustomerPicker.tsx`, `CheckoutModal.tsx`.
- `src/components/debts/`: `DebtCustomerDrawer.tsx`, `CollectDebtModal.tsx`, `ReminderModal.tsx`.
- `src/components/qr/VietQRModal.tsx`: Total debt / single order / custom amount dynamic QR card (`.print-surface-light`), PNG download/share, Zalo reminder message copy.
- `src/components/invoice/`: `InvoicePreviewModal.tsx` (A5 / 80mm toggle, cumulative debt toggle, QR toggle, PNG download/share, `window.print()`, `.print-surface-light`), `ReceiptTemplate.tsx`.
- `src/components/stats/`: `RevenueCashChart.tsx`, `PaymentBreakdownChart.tsx`, `DebtAgingCard.tsx` (CSS-variable theme-safe charts).
- `src/components/pwa/PushNotificationSetup.tsx`: iOS Safari "Add to Home Screen" guide + Web Push subscribe/test/dispatch-due/unsubscribe + overdue/cron heartbeat diagnostics.

### Unit Tests (`tests/unit/`)
- `tests/unit/vietnamese.test.ts` (diacritic stripping, fractional rounding, order totals, VND format, Zalo message).
- `tests/unit/vietqr.test.ts` (CRC-16/CCITT-FALSE, memo sanitization, Napas 247 payload, validation errors).
- `tests/unit/reminders-cron.test.ts` (scheduled push dispatch, failure retry preservation, digest timing, VN midnight `00:` & date consistency, Supabase error propagation, `userId` scoping).
- `tests/unit/tab-cache-architecture.test.ts` (shared `PosDataProvider` cache & deduplication checks).
- `tests/unit/mobile-overflow-guards.test.ts` (mobile horizontal overflow CSS/layout guards).
- `tests/unit/theme-and-welcome.test.ts` (theme resolution/storage fallback, Vietnam time-of-day greetings, welcome storage keys).
- `tests/unit/ux-guards.test.ts` (dark tokens, `.theme-transitioning`, `.print-surface-light`, `prefers-reduced-motion`, zero-flash `<head>` script, 5 route skeletons/retries, Anti-AI-Slop checks, CSS `var(--*)` token completeness, `>= 16px` form control guard, and `>= 44px` interactive control guard).

---

## 5. Non-Negotiable Conventions & Workflows

1. **Design & Anti-AI-Slop (`DESIGN.md`)**:
   - Light Palette: `#F8F9FA` canvas, `#FFFFFF` sheets, `#DDE2E7` 1px borders, `#0E6B4E` primary Jade, `#B45309` debt, `#B91C1C` overdue.
   - Dark Palette (`:root[data-theme="dark"]`): `#0E1317` canvas, `#161D24` surface, `#1F2933` subtle, `#2A3642` borders, `#F1F5F9` ink, `#15805E` primary Jade (`#4CC39B` Jade text via `--brand-jade-text`), `.print-surface-light` on receipts/VietQR export cards.
   - Banned tokens: `backdrop-blur`, `shadow-lg`, `rounded-2xl`, `rounded-3xl`, `indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`.
   - Mobile ergonomics: `>= 16px` input font-size (prevents iOS zoom), `>= 48px` primary touch targets, natural Vietnamese retail copy.
2. **Data Integrity**:
   - Keep money as integer VND (`bigint`), quantities rounded per line (`Math.round(qty * price)` / Postgres `ROUND()`).
   - Never expose `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, or tokens in client code or git.
3. **Spec Kit & Bug Triage Workflows**:
   - Skills in `.agents/skills/`: `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, `speckit-implement`, `speckit-converge`, `speckit-analyze`, `speckit-checklist`, `speckit-bug-assess`, `speckit-bug-fix`, `speckit-bug-test`.
   - **Small bug fixes**: `/speckit-bug-assess` → `/speckit-bug-fix` → `/speckit-bug-test` (records artifacts under `.specify/bugs/<slug>/`).
   - **New features / changes**: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
   - Do not modify `[ ]` items in `specs/001-paytrack-pos/checklists/mvp-readiness.md` without running actual verification.
4. **Verification Gate Before Any Commit/PR**:
   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```

---

## 6. Current Status & Open Backlog

- **Completed**:
  - MVP (`T001`–`T043`) + `v1.0.1` fixes + `v1.1.0` (`002-ux-polish-theme` PR #3) + `v1.1.1` (`cron-reminders-not-firing` PR #4) merged into `main` and deployed live on Vercel (`https://paytrack-pos.vercel.app`, region `sin1`).
  - Bug fix `cron-reminders-not-firing` (PR #4, `9eaf3da`, **verified** live on Production + Supabase `pg_cron`): Added `0004_cron_heartbeat.sql` + `cron_heartbeats` recording in `/api/cron/reminders`, `overdueReminders`/`dueCustomersToday`/`cronHeartbeat` diagnostics in `/api/push/subscribe`, authenticated `POST /api/push/dispatch-due` + UI button & warning banner in `PushNotificationSetup`, explicit Supabase error checking + `getTodayVN(now)` + `normalizeHHMM` + `userId` scoping in `runReminderCron`, `timeout_milliseconds := 10000` in `0003_reminder_cron.sql`, and daily Vercel Cron fallback `0 1 * * *` in `vercel.json`. Confirmed live that both scheduled customer debt reminders and daily auto digest push notifications when the app is closed.
- **Pending Verification / Infra Sync**:
  - Run `npm ci && npm run typecheck && npm run lint && npm test && npm run build` in an environment with `registry.npmjs.org` access to lock automated Vitest/ESLint regression checks (blocked in sandbox VM by proxy `403`).
  - Manual visual & device walkthrough (`specs/001-paytrack-pos/quickstart.md` + `specs/002-ux-polish-theme/quickstart.md`: dark-mode receipt & VietQR check / `375px` & `1280px` layout).
- **Branch / PR State**: PR #1, #2, #3, #4 merged into `main`; release `v1.1.1` prepared from `main`.

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
| 2026-11-17 | `v1.1.0` UX Polish & Theme (`002-ux-polish-theme`) | Completed `T001`–`T046`: smooth Light/Dark/System theme (`280ms`, zero-flash bootstrap, `.print-surface-light`, complete `--status-*-border` tokens), `BrandLoadingScreen` + 5 skeletons + `FetchErrorCard`, 3-layer Welcome (`login`, `WelcomeOnboardingModal`, `DailyWelcomeBanner` with `ordersLoaded`), low-tech Vietnamese UX + `>= 16px` controls & `>= 44px` hit targets, CSS micro-animations (`prefers-reduced-motion`), and `theme-and-welcome` + `ux-guards` tests (`37/37` pass). |
| 2026-11-17 | `v1.1.1` Push Cron Fix & Release (`PR #4`) | Merged `fix/cron-reminders-not-firing` (`PR #4`): added `0004_cron_heartbeat.sql`, `POST /api/push/dispatch-due`, overdue/cron diagnostics in `PushNotificationSetup`, explicit query error checks + `getTodayVN(now)` + `userId` scoping in `runReminderCron`, `timeout_milliseconds := 10000` in `0003_reminder_cron.sql`, and Vercel daily cron fallback (`0 1 * * *`). Applied `0003` + `0004` on live Supabase and verified scheduled + daily auto Web Push notifications end-to-end when app is closed (`cron-reminders-not-firing` -> `verified`). |
