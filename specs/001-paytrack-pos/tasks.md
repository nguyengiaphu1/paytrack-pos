# Tasks: PayTrack POS

**Input**: Design documents from `/specs/001-paytrack-pos/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-and-rpc.md`, `quickstart.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to User Stories in `spec.md` (`US1`..`US5`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Next.js 16 + TypeScript + Tailwind CSS v4 project, PWA shell, and typography/color foundation from `DESIGN.md`.

- [X] T001 Initialize Next.js 16 App Router TypeScript project with Tailwind CSS v4 and Vitest in `package.json`, `tsconfig.json`, and `vitest.config.ts`
- [X] T002 Install runtime dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `qrcode`, `html-to-image`, `web-push`, `recharts`, `lucide-react`) and dev types (`@types/qrcode`, `@types/web-push`) in `package.json`
- [X] T003 [P] Create `.env.example` documenting all required Supabase, VAPID, and Cron variables in `.env.example`
- [X] T004 [P] Configure Next.js headers (`Cache-Control: no-cache` for `/sw.js`) in `next.config.ts`
- [X] T005 [P] Configure `Be Vietnam Pro` + `JetBrains Mono` fonts, `DESIGN.md` CSS variables, and `@media print` A5/80mm rules in `src/app/layout.tsx` and `src/app/globals.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, RLS, atomic RPCs, Supabase Auth (`Google OAuth` + `Email/Password`), responsive app shell, and Realtime sync foundation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Create Supabase tables (`shop_profiles`, `products`, `customers`, `orders`, `order_items`, `debt_payments`, `debt_reminders`, `push_subscriptions`), `handle_new_user` auto-profile trigger, indexes, RLS policies (`user_id = auth.uid()`), and `supabase_realtime` publication in `supabase/migrations/0001_initial_schema.sql`
- [X] T007 Create atomic PostgreSQL RPC functions (`create_order_with_items` with `ROUND` integer VND, `record_debt_payment`, `cancel_order` reversing `remaining_amount`, `get_analytics_summary`) with `FOR UPDATE` locking in `supabase/migrations/0002_rpc_functions.sql`
- [X] T008 [P] Create shared TypeScript database & domain types in `src/types/database.ts`
- [X] T009 [P] Implement Vietnamese utilities (VND formatter, accent-stripper `stripVietnamese`, Zalo debt message builder) in `src/lib/vietnamese.ts`
- [X] T010 [P] Create Supabase browser, SSR server, and service-role admin clients in `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, and `src/lib/supabase/admin.ts`
- [X] T011 Implement auth session refresh & protected route guard in `src/middleware.ts` and OAuth/recovery callback handler in `src/app/auth/callback/route.ts`
- [X] T012 Implement login/signup/forgot-password page supporting Email+Password and 1-tap Google OAuth in `src/app/login/page.tsx`
- [X] T013 [P] Create PWA manifest and base app icons in `src/app/manifest.ts` and `public/icons/`
- [X] T014 Implement responsive 5-tab app shell (iPhone bottom navigation bar + Windows left sidebar + Realtime cloud sync status pill) in `src/app/(app)/layout.tsx` and `src/hooks/useRealtimeSync.ts`

**Checkpoint**: Auth, database schema/RLS, Realtime shell, and `DESIGN.md` tokens ready.

---

## Phase 3: User Story 1 - Tạo đơn bán hàng nhanh & đồng bộ Cloud real-time (Priority: P1) 🎯 MVP

**Goal**: Mom can manage products & customers, build a cart (including quick custom items), choose paid/partial/debt at checkout, and watch orders sync across iPhone and Windows in real time without data loss on refresh.

**Independent Test**: Open 2 browsers (`375px` and `1280px`) logged into the same account; add a product, create a partial-payment order on mobile, verify it appears immediately on desktop (`<= 2s`), and survives hard refresh (`F5`) on both devices.

- [X] T015 [P] [US1] Implement unit tests for `stripVietnamese` and VND total/discount/fractional-quantity rounding calculations in `tests/unit/vietnamese.test.ts`
- [X] T016 [P] [US1] Create product catalog CRUD modal, search/category filter bar, and friendly first-time empty-state CTA in `src/components/pos/ProductCatalog.tsx` and `src/components/pos/ProductFormModal.tsx`
- [X] T017 [P] [US1] Create customer quick-picker and new-customer inline modal in `src/components/pos/CustomerPicker.tsx`
- [X] T018 [P] [US1] Create quick custom-item modal ("Thêm món nhanh" with optional save-to-catalog toggle) in `src/components/pos/QuickItemModal.tsx`
- [X] T019 [US1] Implement responsive POS workspace (`Bán hàng`) with desktop split-pane, mobile sticky cart drawer, and guided onboarding banner when catalog/bank settings are empty in `src/app/(app)/page.tsx` and `src/components/pos/CartPanel.tsx`
- [X] T020 [US1] Implement checkout confirmation modal calling `create_order_with_items` RPC (paid / partial / unpaid + due date) with offline/error guard in `src/components/pos/CheckoutModal.tsx`
- [X] T021 [US1] Implement order history page (`Đơn hàng`) with search, status filter, order detail drawer, and `cancel_order` RPC action with explicit confirmation warning when `paid_amount > 0` in `src/app/(app)/orders/page.tsx`
- [X] T022 [US1] Wire `useRealtimeSync` subscriptions (`products`, `customers`, `orders`) into POS and Orders pages in `src/app/(app)/page.tsx` and `src/app/(app)/orders/page.tsx`

**Checkpoint**: User Story 1 MVP fully functional on cloud with real-time multi-device sync.

---

## Phase 4: User Story 2 - Quản lý công nợ & Nhắc thu tiền đa thiết bị iPhone / Windows (Priority: P1)

**Goal**: Mom can view total & per-customer debts, collect partial/full repayments (FIFO or per-order), schedule custom reminders, enable Web Push on Windows and iPhone Home Screen PWA, and receive morning digest (`08:30`) + custom scheduled reminders that deep-link to the customer's debt view.

**Independent Test**: Create a debt order due today, record a partial repayment verifying FIFO reduction, click **Gửi thử thông báo** on Windows Chrome/Edge and iPhone Safari PWA (`standalone`), and trigger `/api/cron/reminders` to verify push delivery and deep-link navigation.

- [X] T023 [P] [US2] Create `pg_cron` + `pg_net` 5-minute reminder schedule migration in `supabase/migrations/0003_reminder_cron.sql`
- [X] T024 [P] [US2] Implement Service Worker (`push` notification display + `notificationclick` deep-link handler) in `public/sw.js`
- [X] T025 [P] [US2] Implement server Web Push sender with automatic `410`/`404` stale subscription cleanup in `src/lib/push.ts`
- [X] T026 [US2] Implement push subscription management endpoints (`POST`/`DELETE`) and immediate test endpoint in `src/app/api/push/subscribe/route.ts` and `src/app/api/push/test/route.ts`
- [X] T027 [US2] Implement `POST /api/cron/reminders` route handler (`CRON_SECRET` auth, custom `debt_reminders` + `08:30` VN morning digest idempotency) in `src/app/api/cron/reminders/route.ts`
- [X] T028 [P] [US2] Create Debt Ledger list (`Sổ nợ`) with overdue/due-today badges, customer debt detail drawer (including editing customer name/phone/note), and repayment history in `src/app/(app)/debts/page.tsx` and `src/components/debts/DebtCustomerDrawer.tsx`
- [X] T029 [P] [US2] Create FIFO/per-order Collect Debt modal (`record_debt_payment` RPC) and Custom Reminder modal (`debt_reminders`) in `src/components/debts/CollectDebtModal.tsx` and `src/components/debts/ReminderModal.tsx`
- [X] T030 [US2] Create iPhone PWA (`display-mode: standalone` detector + Vietnamese "Share → Add to Home Screen" guide) & Windows Web Push setup widget in `src/components/pwa/PushNotificationSetup.tsx`

**Checkpoint**: Debt ledger, FIFO collection, and iPhone/Windows push reminders operational.

---

## Phase 5: User Story 3 - Tạo & chia sẻ QR động thu chính xác số tiền cho từng khách (Priority: P2)

**Goal**: Mom configures her bank account once and generates instant offline-resilient EMVCo/Napas 247 VietQR codes with exact VND amounts (order balance or customer total debt default with per-order/custom switch), shareable PNG QR cards, and 1-tap Zalo reminder message copy.

**Independent Test**: Save bank BIN/account in Settings, generate QR for a `185.000đ` order and for a multi-order debtor (`total_debt` default → switch single order → edit amount), verify EMVCo CRC16 unit test passes, export QR card PNG, and copy Zalo message.

- [X] T031 [P] [US3] Implement EMVCo/Napas 247 VietQR payload builder, CRC16-CCITT checksum, and Vietnamese bank BIN catalog in `src/lib/vietqr.ts`
- [X] T032 [P] [US3] Write unit tests verifying VietQR tag structure, exact amount encoding, memo sanitization, and CRC16 checksum in `tests/unit/vietqr.test.ts`
- [X] T033 [US3] Create `VietQRModal` component supporting order balance / customer total-debt default, per-order & custom-amount switching, PNG card download/Web Share (`html-to-image`), and 1-tap Zalo text copy in `src/components/qr/VietQRModal.tsx`
- [X] T034 [US3] Integrate `VietQRModal` triggers into POS Checkout, Order Detail, and Customer Debt Drawer in `src/components/pos/CheckoutModal.tsx`, `src/app/(app)/orders/page.tsx`, and `src/components/debts/DebtCustomerDrawer.tsx`

**Checkpoint**: Dynamic VietQR generation and Zalo sharing available across POS, Orders, and Debt Ledger.

---

## Phase 6: User Story 4 - Xuất & In hóa đơn điện tử tùy biến (PDF & Hình ảnh PNG) (Priority: P2)

**Goal**: Mom previews any saved order as a crisp Vietnamese receipt, toggles *"Hiện công nợ lũy kế"* (`Nợ cũ + Đơn này − Đã trả = Tổng nợ còn lại`) vs basic receipt and *"Hiện mã VietQR"*, switches `A5` / `80mm` thermal format, and exports high-DPI PNG or prints/saves PDF.

**Independent Test**: Open an order for a customer with prior debt, toggle cumulative debt ON/OFF verifying exact recalculation, switch between A5 and 80mm preview, download crisp Vietnamese PNG, and verify print preview hides navigation chrome.

- [X] T035 [P] [US4] Create customizable receipt component supporting `A5` and `80mm` layouts, cumulative debt toggle, and embedded VietQR block in `src/components/invoice/ReceiptTemplate.tsx`
- [X] T036 [US4] Create `InvoicePreviewModal` with live customization checkboxes, `html-to-image` 2x PNG download / `navigator.share`, and `window.print()` PDF/thermal trigger in `src/components/invoice/InvoicePreviewModal.tsx`
- [X] T037 [US4] Wire `InvoicePreviewModal` into post-checkout success action and Order History rows in `src/components/pos/CheckoutModal.tsx` and `src/app/(app)/orders/page.tsx`

**Checkpoint**: Customizable PDF/80mm & PNG e-invoices working cleanly.

---

## Phase 7: User Story 5 - Thống kê chi tiết trực quan & Cài đặt cửa hàng (Priority: P3)

**Goal**: Mom views date-filtered KPIs (Revenue, Collected Cash, Estimated Gross Profit for optional `cost_price` items, New/Total Debt, Order Count), interactive Revenue vs Collected bar chart, Payment Method breakdown, Debt Aging buckets, and Top Products/Debtors, plus full Shop Settings (`Cài đặt`).

**Independent Test**: Filter `Thống kê` by Today / 7 days / 30 days / Custom range; verify numbers and charts match test orders (including partial `cost_price` items), and update Shop/Bank/Invoice/Reminder defaults in `Cài đặt` verifying persistence across refresh.

- [X] T038 [P] [US5] Create visual chart components (Revenue vs Collected Cash bar chart, Payment Method breakdown, Debt Aging buckets) styled per `DESIGN.md` in `src/components/stats/RevenueCashChart.tsx`, `src/components/stats/PaymentBreakdownChart.tsx`, and `src/components/stats/DebtAgingCard.tsx`
- [X] T039 [US5] Implement Statistics page (`Thống kê`) consuming `get_analytics_summary` RPC with date presets, KPI cards, charts, and Top Products / Top Debtors tables in `src/app/(app)/stats/page.tsx`
- [X] T040 [US5] Implement Shop Settings page (`Cài đặt`) for shop info, VietQR bank account, morning digest hour (`08:30`), default invoice format/toggles, `PushNotificationSetup`, and sign-out in `src/app/(app)/settings/page.tsx`

**Checkpoint**: All 5 user stories implemented end-to-end.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Anti-AI-slop audit, responsive & print verification, automated checks, and deployment readiness.

- [X] T041 [P] Audit all routes and components against `DESIGN.md` (`375px` & `1280px`, zero horizontal overflow, ≥ 48px touch targets, zero banned AI-slop tells)
- [X] T042 Run `npm run lint`, `npm run typecheck`, `vitest run`, and `npm run build` verifying zero errors
- [X] T043 Update `README.md` with exact deployed Vercel setup steps, Supabase migration runbook, and `pg_cron` SQL secret placeholder instructions in `README.md`
- [ ] T044 Execute all 5 end-to-end validation scenarios in `specs/001-paytrack-pos/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** → **Phase 2 (Foundational)**: Blocks all user stories (`T006`–`T014`).
- **Phase 3 (`US1`, P1 MVP)** → **Phase 4 (`US2`, P1)** → **Phase 5 (`US3`, P2)** → **Phase 6 (`US4`, P2)** → **Phase 7 (`US5`, P3)** → **Phase 8 (Polish)**.
- Note: Once Phase 2 completes, `US2` Push infrastructure (`T023`–`T025`) and `US3` VietQR core (`T031`–`T032`) can run in parallel with `US1` UI work because they touch separate files.

### Parallel Example (Phase 2 + US1 Start)

```text
Parallel Group A (Phase 2 libs): T008 (database.ts) | T009 (vietnamese.ts) | T010 (supabase clients) | T013 (manifest/icons)
Parallel Group B (US1 components): T015 (vietnamese.test.ts) | T016 (ProductCatalog) | T017 (CustomerPicker) | T018 (QuickItemModal)
Parallel Group C (US3 + US4 core): T031 (vietqr.ts) | T032 (vietqr.test.ts) | T035 (ReceiptTemplate.tsx)
```

---

## Implementation Strategy

1. **MVP First (`Phase 1 + Phase 2 + Phase 3`)**: Ship working cloud POS + Auth + Order History + Real-time sync first so Mom can immediately record sales without losing data.
2. **Core Value Increment (`Phase 4 + Phase 5`)**: Add Debt Ledger, FIFO collection, iPhone/Windows Push reminders, and dynamic VietQR sharing.
3. **Receipts & Insights (`Phase 6 + Phase 7 + Phase 8`)**: Add customizable PNG/A5/80mm receipts, visual statistics, and full Anti-AI-Slop + responsive verification on a dedicated feature branch (`feat/001-paytrack-pos-mvp`) with Vercel Preview testing before merging to `main`.
