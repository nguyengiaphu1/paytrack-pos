# Tasks: Nâng cấp Trải nghiệm Trực quan, Màn hình Chờ & Chế độ Sáng/Tối (`002-ux-polish-theme`)

**Input**: Design documents from `/specs/002-ux-polish-theme/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-theme-and-onboarding.md](./contracts/ui-theme-and-onboarding.md), [quickstart.md](./quickstart.md)

**Tests**: Unit tests for pure theme/onboarding logic and structural UI/CSS guards are included in Phase 8 alongside the full Verification Gate (`typecheck`, `lint`, `test`, `build`).

**Organization**: Tasks are grouped by user story (`US1`–`US5`) so each increment can be built and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story mapping (`[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`)
- Exact file paths are included in every task description.

---

## Phase 1: Setup (Shared Design Tokens & Helpers)

**Purpose**: Establish shared pure helper modules and CSS theme/motion foundation without modifying page behavior yet.

- [X] T001 [P] Create pure theme resolution and storage helper module (`ThemePreference = 'light' | 'dark' | 'system'`, default `'system'`, storage key `'paytrack-theme'`, safe fallback to `'light'` if `matchMedia` unavailable) in `src/lib/theme.ts`
- [X] T002 [P] Create pure greeting & onboarding helper module (Vietnam time-of-day greeting `Chào buổi sáng/trưa/chiều/tối` in `Asia/Ho_Chi_Minh`, daily collapse storage key `paytrack-greeting-collapsed:<userId>:<YYYY-MM-DD>`, onboarding mirror key `paytrack-onboarding-v2:<userId>`) in `src/lib/welcome.ts`
- [X] T003 Define `[data-theme="dark"]` WCAG AA ledger palette (`#0E1317` canvas, `#161D24` surface, `#1F2933` subtle, `#2A3642` border, `#F1F5F9` primary ink, `#9CA3AF` secondary ink, `#15805E` primary jade, semantic paid/debt/overdue tokens), `.theme-transitioning` (`280ms cubic-bezier(0.22, 1, 0.36, 1)`), and `.print-surface-light` isolation tokens in `src/app/globals.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core providers and layout/data infrastructure required before user story UI implementation.

**⚠️ CRITICAL**: Complete this phase before starting User Story phases.

- [X] T004 Implement `ThemeProvider` context (`preference`, `resolvedTheme`, `setPreference`, `cyclePreference`), live `matchMedia('(prefers-color-scheme: dark)')` listener, and `320ms` `.theme-transitioning` root class window (plus `<meta name="theme-color">` sync) in `src/components/providers/ThemeProvider.tsx`
- [X] T005 Inject zero-flash inline pre-hydration theme script in `<head>`, add `suppressHydrationWarning` on `<html>`, and wrap root app children with `ThemeProvider` in `src/app/layout.tsx`
- [X] T006 Extend `PosDataProvider` with explicit initial-load error states (`catalogError`, `customersError`, `ordersError`, `profileError`) and safe `try/catch` handling in `refreshPosCatalog`, `refreshCustomers`, `refreshOrders`, and `refreshProfile` so skeletons never hang forever offline in `src/components/providers/PosDataProvider.tsx`

**Checkpoint**: Zero-flash theme engine and error-aware `PosDataProvider` are ready for all stories.

---

## Phase 3: User Story 1 - Chuyển đổi Sáng / Tối / Theo thiết bị mượt mà (Priority: P1) 🎯 MVP

**Goal**: Enable smooth (`200–350ms`) Light / Dark / Follow-device theme switching from Settings, top header/sidebar, and Login with zero reload flash and high-contrast light-paper lock on receipts and VietQR cards.

**Independent Test**: Switch across Sáng / Tối / Theo thiết bị from both `/settings` and the quick switcher; verify smooth color transition, zero white flash on Dark reload, OS theme follow on device change, and white-paper contrast on `InvoicePreviewModal` & `VietQRModal`.

- [X] T007 [P] [US1] Create `ThemeQuickToggle` (1-tap labeled quick switcher for header/sidebar/login) and `SettingsThemeSelector` (3 tactile cards for Theo thiết bị / Sáng / Tối) in `src/components/ui/ThemeToggle.tsx`
- [X] T008 [US1] Integrate `ThemeQuickToggle` into mobile top header and desktop sidebar footer (and replace hardcoded `#FCA5A5` offline banner border with theme-safe classes) in `src/components/shell/AppShell.tsx`
- [X] T009 [P] [US1] Add `SettingsThemeSelector` as Section 1 of Settings in `src/app/(app)/settings/page.tsx`
- [X] T010 [P] [US1] Add `ThemeQuickToggle` to top-right corner of Login screen and replace any light-only hardcoded colors in `src/app/login/page.tsx`
- [X] T011 [P] [US1] Replace hardcoded `#DDE2E7` and `#4B5563` chart grid/axis/tooltip colors with CSS variables (`var(--border-default)`, `var(--text-secondary)`, `var(--bg-surface)`, `var(--text-primary)`) in `src/components/stats/RevenueCashChart.tsx`, `src/components/stats/PaymentBreakdownChart.tsx`, and `src/components/stats/DebtAgingCard.tsx`
- [X] T012 [P] [US1] Isolate printable receipt and VietQR export surfaces with `.print-surface-light` so exported PNGs, QR codes, and print previews remain crisp black-on-white in Dark mode across `src/components/invoice/InvoicePreviewModal.tsx`, `src/components/invoice/ReceiptTemplate.tsx`, and `src/components/qr/VietQRModal.tsx`

**Checkpoint**: User Story 1 is complete and independently testable across all pages, charts, receipts, and QR modals.

---

## Phase 4: User Story 2 - Màn hình Loading, Splash & Skeleton đúng ngữ cảnh (Priority: P1)

**Goal**: Replace blank white waits and generic boxes with a branded PayTrack POS loading splash, 5 layout-matched page skeletons, offline/error retry cards, and double-tap submission locks.

**Independent Test**: Throttle network to Slow 3G and navigate across `/`, `/debts`, `/orders`, `/stats`, `/settings`; verify layout-matched skeletons and offline `"Thử lại"` recovery, plus button busy locks on primary forms.

- [X] T013 [P] [US2] Create `BrandLoadingScreen` component with PayTrack POS emblem, title, and friendly Vietnamese status message (*"Đang mở sổ bán hàng..."*) in `src/components/ui/BrandLoadingScreen.tsx`
- [X] T014 [P] [US2] Create `PosWorkspaceSkeleton`, `DebtsPageSkeleton`, `OrdersPageSkeleton`, `StatsPageSkeleton`, `SettingsPageSkeleton`, and `FetchErrorCard` (with `48px` **"Thử lại"** CTA) in `src/components/ui/PageSkeletons.tsx`
- [X] T015 [US2] Wire `BrandLoadingScreen` into root `src/app/loading.tsx` and update app route suspense skeleton in `src/app/(app)/loading.tsx`
- [X] T016 [P] [US2] Wire `PosWorkspaceSkeleton` and `FetchErrorCard` retry into `src/app/(app)/page.tsx`
- [X] T017 [P] [US2] Wire `DebtsPageSkeleton` and `FetchErrorCard` retry into `src/app/(app)/debts/page.tsx`
- [X] T018 [P] [US2] Wire `OrdersPageSkeleton` and `FetchErrorCard` retry into `src/app/(app)/orders/page.tsx`
- [X] T019 [P] [US2] Wire `StatsPageSkeleton` and `FetchErrorCard` retry into `src/app/(app)/stats/page.tsx`
- [X] T020 [P] [US2] Wire `SettingsPageSkeleton` and `FetchErrorCard` retry into `src/app/(app)/settings/page.tsx`
- [X] T021 [US2] Audit and enforce busy/disabled double-tap locks with clear Vietnamese processing labels (*"Đang lưu đơn..."*, *"Đang ghi nhận..."*) across `src/components/pos/CheckoutModal.tsx`, `src/components/debts/CollectDebtModal.tsx`, `src/components/pos/ProductFormModal.tsx`, and `src/components/debts/ReminderModal.tsx`

**Checkpoint**: User Story 2 is complete; no route shows generic placeholders or gets stuck indefinitely on offline skeletons.

---

## Phase 5: User Story 3 - Giao diện trực quan, dễ hiểu cho người dùng ít rành công nghệ (Priority: P1)

**Goal**: Make every screen (`/login`, `/`, `/debts`, `/orders`, `/stats`, `/settings`) self-explanatory for low-tech shop owners with plain Vietnamese labels, guided empty states, transparent money/debt previews, and labeled action buttons (`>= 48px` touch targets, `>= 16px` inputs).

**Independent Test**: Have a first-time user perform adding/selling items, recording/collecting customer debt, and generating a VietQR code across `375px` mobile and `1280px` desktop without verbal help.

- [X] T022 [P] [US3] Create reusable `EmptyStateCard` component (icon + plain Vietnamese headline + 1-sentence guidance + prominent `48px` CTA button) in `src/components/ui/EmptyStateCard.tsx`
- [X] T023 [P] [US3] Add show/hide password toggle, plain everyday Vietnamese labels (*"Mở sổ bán hàng mới"*, *"Tên tiệm của bạn"*), and helper hints in `src/app/login/page.tsx`
- [X] T024 [P] [US3] Clarify sync status wording (*"Đã lưu tự động"*, *"Đang kết nối lại..."*, *"Mất kết nối mạng"*) and ensure mobile/desktop nav clarity in `src/components/shell/AppShell.tsx`
- [X] T025 [US3] Upgrade POS workspace empty states (`EmptyStateCard` when 0 products), clearer *"Thêm món mới"* / *"Bán món lẻ"* button labels, and transparent cart/checkout summary (showing *Tổng tiền*, *Khách đưa*, *Tiền thối lại* / *Còn ghi nợ* + preset buttons *"Khách trả đủ"*, *"Ghi nợ hết"*, *"Trả một phần"*) across `src/app/(app)/page.tsx`, `src/components/pos/ProductCatalog.tsx`, `src/components/pos/CartPanel.tsx`, and `src/components/pos/CheckoutModal.tsx`
- [X] T026 [P] [US3] Upgrade Debts page & modals with plain filter descriptions, `EmptyStateCard`, labeled action buttons (*"Thu tiền"*, *"Tạo mã QR"*, *"Hẹn nhắc"*), and clear before/after debt preview across `src/app/(app)/debts/page.tsx`, `src/components/debts/DebtCustomerDrawer.tsx`, `src/components/debts/CollectDebtModal.tsx`, and `src/components/debts/ReminderModal.tsx`
- [X] T027 [P] [US3] Upgrade Orders page with `EmptyStateCard`, clear labeled action buttons (*"Xem & In hóa đơn"*, *"Tạo QR thu tiền"*, *"Hủy đơn"*), and plain-language cancel confirmation explaining unpaid-debt reversal in `src/app/(app)/orders/page.tsx`
- [X] T028 [P] [US3] Add plain Vietnamese KPI helper captions (*"Tổng tiền hàng đã bán"*, *"Tiền đã cầm vào tay"*) and guided `EmptyStateCard` CTA back to POS in `src/app/(app)/stats/page.tsx`
- [X] T029 [P] [US3] Reorganize Settings into clearly numbered/titled Vietnamese sections with short explanatory captions under switches and prominent save confirmation in `src/app/(app)/settings/page.tsx`

**Checkpoint**: User Story 3 is complete across all 5 main pages and `/login`.

---

## Phase 6: User Story 4 - Trải nghiệm Welcome 3 lớp thân thiện (Priority: P2)

**Goal**: Deliver the 3-layer Welcome experience: (1) integrated intro on `/login`, (2) one-time-per-account 3-step `WelcomeOnboardingModal` (pre-checked for existing data, skippable, replayable from Settings), and (3) collapsible `DailyWelcomeBanner` on POS Home.

**Independent Test**: Verify (1) `/login` integrated welcome highlights, (2) 3-step onboarding modal auto-opening once per account and staying dismissed across reload/devices + replayable in `/settings`, and (3) `DailyWelcomeBanner` greeting by time of day and collapsing for today in 1 tap.

- [X] T030 [P] [US4] Add integrated 3-benefit welcome highlight block alongside Login / Create Account form (zero extra click gate, responsive at `375px` and `1280px`) in `src/app/login/page.tsx`
- [X] T031 [P] [US4] Create `WelcomeOnboardingModal` (3 steps: Shop name/phone, VietQR bank account, First product; live completion checkmarks, inline quick save, **"Bỏ qua, vào bán hàng ngay"** & **"Hoàn tất & Bắt đầu bán"**, updates `supabase.auth.updateUser({ data: { welcome_v2_seen: true } })` + local mirror) in `src/components/welcome/WelcomeOnboardingModal.tsx`
- [X] T032 [P] [US4] Create `DailyWelcomeBanner` (Vietnam time-of-day greeting + due/overdue debt quick link when `> 0` + 1-tap **"Thu gọn"** persisted per Vietnam calendar day) in `src/components/welcome/DailyWelcomeBanner.tsx`
- [X] T033 [US4] Read `Boolean(user.user_metadata?.welcome_v2_seen)` and `user.id` in `src/app/(app)/layout.tsx` and host `WelcomeOnboardingModal` in `src/components/shell/AppShell.tsx` (listening for replay event/context)
- [X] T034 [US4] Add **"Xem lại hướng dẫn bắt đầu"** replay trigger in `src/app/(app)/settings/page.tsx` and render `DailyWelcomeBanner` at top of POS workspace in `src/app/(app)/page.tsx`

**Checkpoint**: All 3 Welcome layers function smoothly without blocking returning counter sales.

---

## Phase 7: User Story 5 - Hiệu ứng chuyển động tinh tế tăng trải nghiệm (Priority: P2)

**Goal**: Add crisp, non-blocking CSS tactile press, badge pop, skeleton shimmer, and modal/sheet/drawer entrance animations that automatically collapse under `prefers-reduced-motion: reduce`.

**Independent Test**: Add/adjust items in cart, open/close modals, mobile cart sheet, and `DebtCustomerDrawer`, then toggle OS **Reduce Motion** and verify animations respect it without slowing 3-item checkout (`< 15s`).

- [X] T035 [US5] Add pure CSS motion primitives (`.press-tactile`, `.animate-fade-in`, `.animate-modal-in`, `.animate-sheet-up`, `.animate-drawer-in`, `.animate-badge-pop`, `.skeleton-shimmer`) with `@media (prefers-reduced-motion: reduce)` instant fallback in `src/app/globals.css`
- [X] T036 [P] [US5] Apply `.press-tactile` and `.animate-badge-pop` to product rows, primary buttons, and mobile/desktop cart counters in `src/components/pos/ProductCatalog.tsx`, `src/components/pos/CartPanel.tsx`, and `src/app/(app)/page.tsx`
- [X] T037 [P] [US5] Apply `.animate-backdrop-in`, `.animate-modal-in`, `.animate-sheet-up`, and `.animate-drawer-in` to modals and drawers across `src/components/pos/CheckoutModal.tsx`, `src/components/pos/ProductFormModal.tsx`, `src/components/pos/QuickItemModal.tsx`, `src/components/debts/DebtCustomerDrawer.tsx`, `src/components/debts/CollectDebtModal.tsx`, `src/components/debts/ReminderModal.tsx`, `src/components/qr/VietQRModal.tsx`, `src/components/invoice/InvoicePreviewModal.tsx`, and `src/components/welcome/WelcomeOnboardingModal.tsx`

**Checkpoint**: Micro-animations are smooth, purposeful, and fully reduced-motion compliant.

---

## Phase 8: Polish, Unit Tests & Verification Gate

**Purpose**: Verify correctness, Anti-AI-Slop rules, mobile responsiveness, and keep documentation synced.

- [X] T038 [P] Add unit tests for `resolveTheme`, storage fallbacks, `getTimeOfDayGreetingVN`, and daily greeting/onboarding keys in `tests/unit/theme-and-welcome.test.ts`
- [X] T039 [P] Add structural guard tests verifying `[data-theme="dark"]` tokens, `.theme-transitioning`, `.print-surface-light`, `prefers-reduced-motion`, zero-flash `<head>` script, and absence of banned AI-slop tokens (`backdrop-blur`, `shadow-lg`, `rounded-2xl`, `indigo-`, `purple-`) in `tests/unit/ux-guards.test.ts`
- [X] T040 Update `DESIGN.md` (Section 2 dark mode extension) and `PROJECT_CONTEXT.md` (Codebase Map, Recent Changelog `v1.1.0` / `002-ux-polish-theme`) after implementation passes
- [X] T041 Run full verification gate `npm run typecheck && npm run lint && npm test && npm run build` and validate flows against `specs/002-ux-polish-theme/quickstart.md` *(Passed: `tsc --noEmit`, `eslint .`, `vitest run` 7 files / 34 tests, `next build` 13/13 routes)*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — `T001`, `T002`, `T003` can run immediately (`T001` and `T002` in parallel).
- **Phase 2 (Foundational)**: Depends on Phase 1 (`T004` depends on `T001` & `T003`; `T005` depends on `T001` & `T004`; `T006` can run in parallel with `T004`). Blocks all User Story phases.
- **Phase 3 (`US1`, P1)**: Depends on Phase 2.
- **Phase 4 (`US2`, P1)**: Depends on Phase 2 (`T006` error states); can run in parallel with Phase 3 except shared edits in `settings/page.tsx` and `page.tsx` should sequence cleanly.
- **Phase 5 (`US3`, P1)**: Depends on Phase 2 and benefits from Phase 4 empty/error states being in place on the 5 pages.
- **Phase 6 (`US4`, P2)**: Depends on Phase 2 (`T002`, `PosDataProvider`) and coordinates with `login/page.tsx`, `AppShell.tsx`, `settings/page.tsx`, and `page.tsx`.
- **Phase 7 (`US5`, P2)**: Depends on `globals.css` (`T003`) and core UI files from `US1`–`US4`.
- **Phase 8 (Polish & Verification)**: Depends on all desired stories completing.

### Parallel Opportunities

- **Within Phase 1**: `T001` (`src/lib/theme.ts`) and `T002` (`src/lib/welcome.ts`) in parallel.
- **Within Phase 3 (`US1`)**: `T007`, `T009`, `T010`, `T011`, `T012` touch independent files and can run in parallel after `T004`–`T005`.
- **Within Phase 4 (`US2`)**: `T013` and `T014` in parallel; then `T016`, `T017`, `T018`, `T019`, `T020` in parallel across the 5 route pages.
- **Within Phase 5 (`US3`)**: `T022`, `T023`, `T024`, `T026`, `T027`, `T028`, `T029` target separate files and can run in parallel.
- **Within Phase 6 (`US4`)**: `T030`, `T031`, `T032` target separate files and can run in parallel.
- **Within Phase 8**: `T038` and `T039` unit tests in parallel before `T041`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (`T001`–`T003`) + Phase 2 (`T004`–`T006`).
2. Complete Phase 3 (`US1`: `T007`–`T012`) for full smooth Light / Dark / Follow-device theme support.
3. Validate `US1` independently (`npm run typecheck && npm run build` + theme/print check).

### Incremental Delivery

1. Setup + Foundational → Theme & error infrastructure ready.
2. Add `US1` (Smooth Light/Dark/System) → Validate.
3. Add `US2` (Brand Loading & 5 Page Skeletons + Retry) → Validate.
4. Add `US3` (Low-Tech Intuitive UI across all 5 tabs + Login) → Validate.
5. Add `US4` (3-Layer Welcome Experience) → Validate.
6. Add `US5` (Purposeful Micro-Animations + Reduced Motion) → Validate.
7. Run Phase 8 unit tests, doc sync, and full verification gate (`T038`–`T041`).

---

## Phase 9: Convergence

**Purpose**: Close remaining gaps against `spec.md`, `plan.md`, and `.specify/memory/constitution.md` uncovered during `/speckit-converge`.

- [X] T042 Define `--status-paid-border` and `--status-debt-border` CSS custom properties in `:root`, `:root[data-theme="dark"]`, and `.print-surface-light` inside `src/app/globals.css` (and add a guard assertion in `tests/unit/ux-guards.test.ts` verifying all `var(--*)` references in `src/` resolve to defined tokens) per `FR-004` / `Constitution IV` (`missing`)
- [X] T043 Update `<input>`, `<select>`, and `<textarea>` font sizes from `text-[15px]` to `text-[16px]` in `src/components/pos/CartPanel.tsx`, `src/components/debts/ReminderModal.tsx`, and `src/components/qr/VietQRModal.tsx` (and enforce in `tests/unit/ux-guards.test.ts`) so iOS Safari never auto-zooms per `Constitution I` / `FR-010` (`contradicts`)
- [X] T044 Raise interactive icon buttons below `44px × 44px` (`h-8 w-8`, `h-9 w-9`, `h-10 w-10`) to `min-h-[44px] min-w-[44px]` (`h-11 w-11`) across `src/components/debts/DebtCustomerDrawer.tsx`, `src/components/pos/CartPanel.tsx`, `src/components/welcome/WelcomeOnboardingModal.tsx`, `src/app/(app)/orders/page.tsx`, `src/components/pos/CheckoutModal.tsx`, `src/components/debts/CollectDebtModal.tsx`, `src/components/debts/ReminderModal.tsx`, `src/components/invoice/InvoicePreviewModal.tsx`, `src/components/pos/CustomerPicker.tsx`, and `src/components/qr/VietQRModal.tsx` per `Constitution I` / `FR-008` (`partial`)
- [X] T045 Refine `DailyWelcomeBanner` copy & `todayOrderCount` in `src/app/(app)/page.tsx` and `src/components/welcome/DailyWelcomeBanner.tsx` so it accurately checks Vietnam today orders only when `ordersLoaded` is true and avoids claiming *"tạo đơn đầu tiên"* when order history hasn't been fetched yet per `FR-007` / `US4/AC3` (`partial`)

---

## Phase 10: Convergence

**Purpose**: Close the remaining `Constitution I` touch-target gap uncovered during `/speckit-converge`.

- [X] T046 CRITICAL: Raise all remaining interactive controls below `44px` height (`min-h-[34px]`–`min-h-[42px]`) to at least `min-h-[44px]` across `src/components/invoice/InvoicePreviewModal.tsx` (`format` tabs & checkbox toggle `<label>`s), `src/components/debts/DebtCustomerDrawer.tsx` (inline edit `<input>`s & `"Thu đơn này"` button), `src/components/pos/ProductCatalog.tsx` (category pills), `src/app/(app)/debts/page.tsx` (filter tabs), `src/app/(app)/orders/page.tsx` (status tabs), `src/app/(app)/stats/page.tsx` (preset tabs & custom date `<input>`s), `src/components/welcome/WelcomeOnboardingModal.tsx` (quick-save buttons), `src/app/(app)/page.tsx` (`"Thêm món"` link), and `src/app/login/page.tsx` (auth mode tabs), and add a structural guard in `tests/unit/ux-guards.test.ts` forbidding `min-h-[1-43px]` on interactive controls per `Constitution I` (`partial`)
