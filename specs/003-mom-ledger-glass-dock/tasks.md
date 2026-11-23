# Tasks: 003-mom-ledger-glass-dock

**Input**: Design documents from `specs/003-mom-ledger-glass-dock/`

## Phase 1: Setup & Track A Foundation (Migration, Types, Core Helpers)

- [x] T001 Create migration `supabase/migrations/0005_mom_ledger_fields.sql` adding 12-field columns, constraints, safe backfills, indexes, updated RPCs (`create_order_with_items`, `record_debt_payment`, `get_analytics_summary`), and `update_order_ledger_fields`
- [x] T002 [P] Update TypeScript domain models in `src/types/database.ts` (`PaymentAccount`, `Customer.address`, `Order` ledger fields, `DebtPayment` account fields, `AnalyticsSummary` cost/profit fields)
- [x] T003 [P] Create thousand-VND conversion & 1000x-guard library in `src/lib/currency-k.ts`
- [x] T004 [P] Create 12-field sales ledger library (9 payment accounts constant, item summary, profit, CSV UTF-8 BOM builder, VN date/datetime helpers) in `src/lib/ledger.ts`
- [x] T005 [P] Add unit tests for `K <-> VND` precision & 1000x safeguard in `tests/unit/currency-k.test.ts`
- [x] T006 [P] Add unit tests for 12-field ledger calculations, 9 accounts + Khác, CSV export, and `paid_at` logic in `tests/unit/ledger.test.ts`

## Phase 2: Track A — Shared Controls & Data Provider

- [x] T007 [P] Build shared `VndKInput` component (fixed `.000 đ` suffix, `inputMode="decimal"`, `>= 16px`, 1000x safeguard) in `src/components/ui/VndKInput.tsx`
- [x] T008 [P] Build shared `PaymentAccountSelector` (9 accounts + `Khác: ...` note input) in `src/components/ui/PaymentAccountSelector.tsx`
- [x] T009 Update `src/components/providers/PosDataProvider.tsx` to fetch nested `order_items`, sort by `purchased_at DESC, created_at DESC`, support `loadMoreOrders()`, and pass optional `paymentAccount` to `get_analytics_summary`

## Phase 3: Track A — POS Fast Entry, Exposed Customer Bar & Stepper ([US2])

- [x] T010 [US2] Upgrade `src/components/pos/CustomerPicker.tsx` to separate `address` & `note`, show phone/address/debt summary, and support exposed top-bar display
- [x] T011 [US2] Upgrade `src/components/pos/ProductCatalog.tsx` to display active cart quantity & inline `-`/`+` steppers (`>= 44px`, tap-to-edit) on product cards
- [x] T012 [US2] Upgrade `src/components/pos/QuickItemModal.tsx` and `src/components/pos/ProductFormModal.tsx` to use `VndKInput` for price/cost_price and add `-`/`+` quantity stepper in `QuickItemModal`
- [x] T013 [US2] Upgrade `src/components/pos/CartPanel.tsx` and `src/app/(app)/page.tsx` to expose Customer Bar directly at top of POS on mobile (`375px`) & desktop (`1280px`), remove duplicate picker inside `CartPanel`, and use `VndKInput` for discount
- [x] T014 [US2] Upgrade `src/components/pos/CheckoutModal.tsx` to use `VndKInput`, allow editing buyer address/phone snapshot & `purchased_at`, select 9 Payment Accounts (+ `Khác: ...`) and `paid_at`, and call updated `create_order_with_items`

## Phase 4: Track A — 12-Field Sales Ledger, Debts & Stats Data Wiring ([US1])

- [x] T015 [US1] Upgrade `src/components/debts/CollectDebtModal.tsx`, `src/components/debts/DebtCustomerDrawer.tsx`, and `src/app/(app)/debts/page.tsx` to use `VndKInput`, 9 Payment Accounts (+ `Khác: ...`), `paid_at`, and display `address` & account history
- [x] T016 [US1] Upgrade `src/app/(app)/orders/page.tsx` into full 12-field Sales Ledger with dynamic STT, summary bar (Giá bán / Giá vốn / Lãi), 9-account + status + date + search filters, manual ledger/cost edit modal (`update_order_ledger_fields`), inline debt collection (`CollectDebtModal`), and UTF-8 BOM CSV export
- [x] T017 [US1] Upgrade `src/app/(app)/stats/page.tsx` to surface `total_cost` & `total_profit` and filter by 9 Payment Accounts
- [x] T018 Checkpoint 1 verification (`npm run typecheck && npm run lint && npm test && npm run build`) and Commit #1

## Phase 5: Track B — Design System, PWA Icons/Splash & Floating Glass Dock ([US3])

- [x] T019 [US3] Amend `.specify/memory/constitution.md` (`v1.1.0`), create `PRODUCT.md`, update `DESIGN.md` (60–30–10 + intentional Floating Glass Dock), and update `.gitignore` for `.impeccable/` runtime artifacts
- [x] T020 [US3] Update `src/app/globals.css` with 60–30–10 Light/Dark tokens, `.glass-dock`, `.glass-surface`, `prefers-reduced-transparency`, and boot splash animations
- [x] T021 [P] [US3] Generate crisp PWA icon suite (`public/favicon.svg`, `public/favicon.ico`, `public/icons/apple-touch-icon.png`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png`) and update `src/app/manifest.ts` & `src/app/layout.tsx`
- [x] T022 [P] [US3] Build zero-flash `src/components/ui/AppBootSplash.tsx` and polish `src/components/ui/BrandLoadingScreen.tsx`
- [x] T023 [US3] Overhaul `src/components/shell/AppShell.tsx` from left rail + bottom bar to Floating Glass Dock (`.glass-dock`) + slim top header on both `375px` and `1280px`

## Phase 6: Track B — Surface Overhaul, Simplified Settings & Copy Distill ([US3])

- [x] T024 [US3] Polish `Orders` 12-column desktop table & mobile cards with `.glass-surface`, `tabular-nums`, and concise copy in `src/app/(app)/orders/page.tsx`
- [x] T025 [US3] Polish `POS` layout (replace wordy `DailyWelcomeBanner` with minimal due-debt chip, glass Customer Bar, harmonious pill cart bar above dock) in `src/app/(app)/page.tsx` & `src/components/pos/`
- [x] T026 [US3] Overhaul `src/app/(app)/settings/page.tsx` & `src/components/pwa/PushNotificationSetup.tsx` into 4 ultra-clean sections with technical diagnostics folded under `<details>`
- [x] T027 [US3] Align `Debts`, `Stats`, `Login`, and shared modals (`EmptyStateCard`, `ThemeToggle`, `WelcomeOnboardingModal`) to 60–30–10 tokens and strip all redundant/AI-slop copy
- [x] T028 [US3] Update `tests/unit/ux-guards.test.ts` (controlled `.glass-dock`/`.glass-surface` allowance + strict AI-slop bans + simplified Settings/PWA/splash checks)

## Phase 7: Track C — Impeccable Review, Context Update & Final Verification

- [x] T029 Run `impeccable` review checklist (`distill`, `clarify`, `audit`, `adapt`, `harden`, `polish`) across all modified surfaces and fix any gaps
- [x] T030 Update `PROJECT_CONTEXT.md` to `v2.0.0` (Sections 2–6 + Recent Changelog)
- [x] T031 Run final Verification Gate (`npm run typecheck && npm run lint && npm test && npm run build`), verify clean `git status`, and create Commit #2

## Phase 8: Convergence

- [X] T032 Add date-range filter controls (presets and custom start/end date inputs filtering `purchased_at`, integrated with `filtered`, totals summary, reset button, and CSV export) in `src/app/(app)/orders/page.tsx` per FR-003 (missing)
- [X] T033 Extend `sanitizeKInput` and `detectLikelyFullVndMistake` in `src/lib/currency-k.ts` (plus unit tests in `tests/unit/currency-k.test.ts`) to detect Vietnamese dot-grouped thousands inputs (e.g., `"125.000"`, `"1.250.000"`) with a 1-tap safe conversion suggestion instead of dropping extra dots and silently under-parsing per FR-007 (partial)
- [X] T034 Remove the duplicate VietQR button (`Tạo QR` + `Mã VietQR`) rendered simultaneously for paid orders in the Order Detail modal of `src/app/(app)/orders/page.tsx` per FR-013 (partial)
- [X] T035 Update `THEME_BOOTSTRAP_SCRIPT` in `src/lib/theme.ts` and `applyDomTheme` in `src/components/providers/ThemeProvider.tsx` to update all `meta[name="theme-color"]` elements (rather than only the first `querySelector` match) so Light/Dark overrides match OS chrome in both directions per FR-012 (partial)
- [X] T036 Give the desktop 12-column ledger table wrapper (`hidden overflow-x-auto`) in `src/app/(app)/orders/page.tsx` a bounded vertical scroll height (`overflow-y-auto max-h-[calc(100dvh-260px)]`) so the sticky `<thead>` actually stays pinned when scrolling long ledgers per plan: Track B Target 3 (partial)
- [X] T037 Unify the missing-cost warning badge text on desktop rows and mobile cards in `src/app/(app)/orders/page.tsx` to `Chưa nhập vốn` to match the acceptance scenario verbatim per US1/AC3 (partial)
