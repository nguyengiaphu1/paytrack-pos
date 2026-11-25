# Tasks: POS UX Polish, Analytics Hierarchy, CSV Shop Import & Neutral Geometric Glassmorphism

**Input**: Design documents from `/specs/004-pos-ux-csv-glass/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/csv-import-api.md](./contracts/csv-import-api.md), [contracts/design-tokens-and-motion.md](./contracts/design-tokens-and-motion.md), [quickstart.md](./quickstart.md)

**Tests**: Unit tests are included for CSV import parsing/deduplication (`tests/unit/csv-import.test.ts`) and updated architectural/accessibility design guardrails (`tests/unit/ux-guards.test.ts`, `tests/unit/audit-a11y.test.ts`, `tests/unit/theme-and-welcome.test.ts`) as required by FR-022 and Constitution IV.

**Organization**: Tasks are grouped by user story (`[US1]`–`[US6]`) so each slice can be implemented and verified independently.

---

## Phase 1: Setup (Shared Prerequisites)

**Purpose**: Verify baseline repository health on branch `feat/004-pos-ux-csv-glass` before modifying source files.

- [X] T001 Verify clean baseline build and test suite (`npm run typecheck && npm test`) on branch `feat/004-pos-ux-csv-glass` in repository root

---

## Phase 2: Foundational (Modal Slide-Up & Directional Tab Slide Animations)

**Purpose**: Establish shared GPU-composited modal slide-up and directional tab slide-left/right transition infrastructure (FR-023) before building new modals and route views.

- [X] T002 Upgrade `.animate-modal-in` (`translateY(28px) scale(0.985) -> translateY(0) scale(1)`, `260ms cubic-bezier(0.22, 1, 0.36, 1)`), `.animate-sheet-up` (`translateY(44px) -> translateY(0)`, `280ms`), and add `.animate-tab-slide-left` (`translateX(28px) -> 0`, `240ms`, `backwards`) and `.animate-tab-slide-right` (`translateX(-28px) -> 0`, `240ms`, `backwards`) plus `@media (prefers-reduced-motion: reduce)` opacity-only fallbacks in `src/app/globals.css`
- [X] T003 Implement directional tab transition state (`NAV_ITEMS` index tracking `0..4` for `/`, `/debts`, `/orders`, `/stats`, `/settings`) with sticky-safe `onAnimationEnd` cleanup on the `<main>` content wrapper in `src/components/shell/AppShell.tsx`
- [X] T004 Ensure `ModalDialog` supports smooth default slide-up entrance across all modals without breaking focus trap, Escape stack, or scroll lock in `src/components/ui/ModalDialog.tsx`

**Checkpoint**: Modal slide-up and directional tab slide-left/right transitions are active across all routes with zero `position: sticky` regression.

---

## Phase 3: User Story 1 - Bulk Import Shop Ledger from CSV (Priority: P1) 🎯 MVP

**Goal**: Enable signed-in shop owners to upload `ThuChi.csv` (and compatible shop CSV files), review an instant Vietnamese preview with exact financial totals, adjustable year/unit/grouping controls, and skipped-row warnings, and commit missing customers, missing products (lowest positive row price, never overwriting existing items), and historical orders via authenticated RLS RPC with idempotent duplicate protection.

**Independent Test**: Upload `/home/antigravity/ThuChi.csv` → preview shows 57 valid rows, 45 grouped orders (or 57 ungrouped), 40 customers, 46 products, Revenue `48,320,000đ`, Cost `37,234,000đ`, Profit `11,086,000đ`, Paid `320,000đ`, Debt `48,000,000đ`, line 55 skipped cleanly, line 65 totals row ignored → confirm imports all records and refreshes POS/Sổ bán/Công nợ/Thống kê → re-upload skips all 45 duplicates (`0` new duplicates).

### Implementation for User Story 1

- [X] T005 [P] [US1] Implement pure RFC-4180 CSV parser, `ThuChi.csv` column mapper (tolerating UTF-8 BOM, CRLF/LF, trailing whitespace, spacer columns, optional trailing status column), date carry-forward & `DD/MM` year inference, bottom summary-row filter, canonical 9-account + `'Khác'` note resolver, lowest-positive-row-price product aggregator, same-day/customer/status/account order grouper, deterministic order fingerprint generator, and `buildCsvImportPreview()` planner in `src/lib/csv-import.ts`
- [X] T006 [US1] Create authenticated `POST /api/import/csv` route handler validating `csvText` (`<= 2_000_000` bytes), `year` (`2000..2100`), `unitMode` (`'k' | 'vnd'`), `groupSameDayOrders`, `skipDuplicates`, and max `500` orders per batch, matching/bulk-inserting missing `customers` and `products` (never overwriting existing products), skipping duplicate order fingerprints, invoking `create_order_with_items` RPC sequentially under RLS (`auth.uid()`), and returning summary + warnings JSON per `contracts/csv-import-api.md` in `src/app/api/import/csv/route.ts`
- [X] T007 [US1] Build interactive `CsvImportModal` (`ModalDialog` with slide-up animation, `ariaLabelledBy="csv-import-modal-title"`, drag/file picker for `.csv`, instant preview summary cards, editable year/unit/grouping/duplicate controls, skipped-row warning accordion, confirm CTA calling `POST /api/import/csv`, Vietnamese completion summary, and live `PosDataProvider` refresh) in `src/components/orders/CsvImportModal.tsx`
- [X] T008 [P] [US1] Wire `"Nhập CSV"` trigger button and `CsvImportModal` into the Sổ bán ledger toolbar (refreshing catalog, customers, orders, and analytics after import) in `src/app/(app)/orders/page.tsx`
- [X] T009 [P] [US1] Wire `"Nhập dữ liệu từ CSV"` action card and `CsvImportModal` into the Cài đặt workspace (refreshing catalog, customers, orders, and analytics after import) in `src/app/(app)/settings/page.tsx`
- [X] T010 [P] [US1] Write comprehensive unit tests covering RFC-4180 parsing, BOM/CRLF handling, `ThuChi.csv` exact reconciliation (`57` rows, `45` grouped orders, `40` customers, `46` products, `48,320,000đ` revenue, `37,234,000đ` cost, `11,086,000đ` profit, `320,000đ` paid, `48,000,000đ` debt, line 55 skipped, line 65 summary ignored, `'Trần Huyền'` → `'Khác'` note), ungrouped mode, full-VND mode, existing product preservation, and idempotent duplicate detection in `tests/unit/csv-import.test.ts`

**Checkpoint**: User Story 1 is complete and independently verifiable end-to-end with `ThuChi.csv`.

---

## Phase 4: User Story 2 - Streamlined POS Product Toolbar ("Thêm món" Replaces "Món lẻ") (Priority: P1)

**Goal**: Completely remove `"Món lẻ"` (`QuickItemModal`) from the POS toolbar and promote `"Thêm món"` (previously `"Thêm SP"`) into the primary right-hand search-bar slot without duplicating it inside catalog management trays.

**Independent Test**: Open `/` on `375px` and `1280px` → confirm `"Món lẻ"` and `"Thêm SP"` are absent everywhere, tap `"Thêm món"` next to search → `ProductFormModal` slides up → saving adds the product directly to the catalog.

### Implementation for User Story 2

- [X] T011 [P] [US2] Replace the `"Món lẻ"` button in the search bar with `"Thêm món"` wired to `onOpenNewProduct`, remove the `onOpenQuickItem` prop and duplicate `"Thêm SP"` buttons from both desktop management pills and the mobile `"Quản lý"` tray, and align empty-state CTA copy to `"Thêm món"` in `src/components/pos/ProductCatalog.tsx`
- [X] T012 [US2] Remove `QuickItemModal` state, import, render, and `onOpenQuickItem` wiring from the POS workspace page in `src/app/(app)/page.tsx`

**Checkpoint**: POS toolbar shows `"Tìm món..."` + `"Thêm món"` cleanly in 1 row on `375px` and desktop with zero duplicate product-creation triggers.

---

## Phase 5: User Story 3 - Unobstructed Mobile Customer Selection ("Chọn khách") (Priority: P1)

**Goal**: Ensure tapping `"Chọn khách"` opens the customer sheet cleanly showing recent buyers and the customer list immediately without popping up the mobile virtual keyboard until the user manually taps the search input.

**Independent Test**: Tap `"Chọn khách"` on mobile viewport → verify the search `<input>` does NOT receive focus on open (`document.activeElement` is the dialog container, not the input), recent/existing customers are immediately visible and tappable, and manually tapping the search box opens the keyboard while keeping search results visible and Enter-to-select working.

### Implementation for User Story 3

- [X] T013 [US3] Remove `data-autofocus` from the search `<input>` (and keep `creating` form inputs smoothly scrollable within viewport height without hiding modal header/footer) while preserving `Enter`-to-select and accessible modal focus management in `src/components/pos/CustomerPicker.tsx`

**Checkpoint**: `"Chọn khách"` opens unobstructed on iPhone/Android with manual keyboard trigger on input tap.

---

## Phase 6: User Story 4 - Redesigned Analytics Hierarchy ("Thống kê") (Priority: P2)

**Goal**: Replace the cluttered 7-equal-KPI grid and standalone `Phương thức thanh toán` & `Tuổi nợ` boxes with a clear 2-tier KPI hierarchy (2 Hero focal cards for `Lãi` and `Giá bán` with inline cost/margin/order count + 2 Compact secondary cards for `Thực thu` with inline cash-vs-transfer progress bar and `Tổng nợ` with inline `Nợ mới` context), followed by the dominant trend chart and only the two actionable lists (`Nợ nhiều nhất`, `Món bán chạy`).

**Independent Test**: Open `/stats` on `375px` and `1280px+` → verify 2 prominent Hero cards above 2 compact Cash/Debt cards (with inline cash-vs-transfer bar inside `Thực thu`), verify `Phương thức thanh toán` and `Tuổi nợ` standalone cards are gone, verify date presets and payment account filters update all numbers accurately with zero overflow.

### Implementation for User Story 4

- [X] T014 [P] [US4] Redesign `/stats` into the 2-tier KPI layout (Hero `Lãi` with inline `Giá vốn` + margin %, Hero `Giá bán` with inline `Số đơn` + avg order value; Compact `Thực thu` with embedded cash-vs-transfer mix progress bar, Compact `Tổng nợ` with inline `Nợ mới` + `/debts` quick link), keep `RevenueCashChart`, `Nợ nhiều nhất`, and `Món bán chạy`, and remove standalone `PaymentBreakdownChart` and `DebtAgingCard` renders in `src/app/(app)/stats/page.tsx`
- [X] T015 [P] [US4] Update `StatsPageSkeleton` to match the new 2-Hero + 2-Compact + Trend Chart + 2-List hierarchy in `src/components/ui/PageSkeletons.tsx`

**Checkpoint**: `"Thống kê"` presents a clear focal visual hierarchy without equally weighted box clutter.

---

## Phase 7: User Story 5 & User Story 6 - System-Wide Neutral 60–30–10 Glassmorphism & Crisp Geometric Backdrop (Priority: P2)

**Goal**: Replace the radial light-beam wallpaper and green-tinted glass chips/orbs with Warm Gray (`#ECEFED`) + dark forest-gray grid lines (`rgba(15, 23, 20, 0.07)`) in Light Mode and Matte Obsidian (`#0C100E`) + crisp white dot-grid (`rgba(255, 255, 255, 0.08)`) in Dark Mode; render 30% tiles as pure neutral frosted glassmorphism (zero green glass) while reserving solid opaque Deep Forest Jade strictly for important primary buttons (~10%) and semantic status badges; preserve `.print-surface-light` and `prefers-reduced-transparency`.

**Independent Test**: Audit all 5 routes + `/login` + core modals in both Light Mode and Dark Mode → verify `#ECEFED` grid lines (`7%`) and `#0C100E` white dot-grid (`8%`) behind translucent neutral glass tiles, verify zero green-tinted glass on tiles/chips/orbs/dock, verify primary CTA buttons stand out as solid high-contrast Deep Forest Jade (`>= 5.1:1`), and verify receipts/VietQR stay solid opaque white paper.

### Implementation for User Stories 5 & 6

- [X] T016 [US6] Update `THEME_COLOR_LIGHT` to `'#ECEFED'` and `THEME_COLOR_DARK` to `'#0C100E'` so pre-hydration script and PWA browser chrome match the geometric backdrop base colors in `src/lib/theme.ts`
- [X] T017 [US5] Overhaul design tokens and glass utilities in `src/app/globals.css`: replace `body::before`/`body::after` with solid `#ECEFED` + `28px` dark forest-gray grid lines (`rgba(15, 23, 20, 0.07)`) in Light Mode and solid `#0C100E` + `24px` crisp white dot-grid (`rgba(255, 255, 255, 0.08)`) in Dark Mode; convert `.glass-dock`, `.glass-surface`, `.glass-panel`, `.glass-card` (frosted `backdrop-filter: blur(12px) saturate(145%)` + `contain: layout style`), `.glass-modal`, `.glass-chip-active`, `.glass-icon-orb`, and `.glass-card-selected` to pure neutral glassmorphism with zero green glass tinting; style `.glass-btn-primary` and `.glass-btn-danger` as solid opaque WCAG AA (`>= 5.1:1`) CTA controls; preserve `@media (prefers-reduced-transparency: reduce)` opaque fallbacks and `.print-surface-light` lock
- [X] T018 [P] [US5] Replace non-primary `.glass-pill-jade` filter toggles, segmented tabs, and decorative rank/undo pills with neutral `.glass-chip-active` / `.glass-solid-control` across `src/app/login/page.tsx`, `src/app/(app)/debts/page.tsx`, `src/app/(app)/stats/page.tsx`, `src/app/(app)/page.tsx`, `src/app/(app)/orders/page.tsx`, `src/components/ui/ThemeToggle.tsx`, `src/components/invoice/InvoicePreviewModal.tsx`, `src/components/qr/VietQRModal.tsx`, and `src/components/debts/DebtCustomerDrawer.tsx` while keeping `.glass-btn-primary` strictly on important forward CTAs

**Checkpoint**: Entire app renders true neutral 60–30–10 Glassmorphism over crisp geometric grid/dot patterns in both Light & Dark modes.

---

## Phase 8: Polish, Guardrails, Documentation & Verification Gate

**Purpose**: Synchronize design system docs, automated UI/accessibility guard tests, and `PROJECT_CONTEXT.md`, then execute the full verification gate.

- [X] T019 [P] Refresh `DESIGN.md` and `.impeccable/design.json` to document the Warm Gray (`#ECEFED`) geometric grid / Matte Obsidian (`#0C100E`) white dot-grid backdrop, neutral 60–30–10 glassmorphism rules (zero green glass), solid primary CTAs, and modal/tab slide motion tokens
- [X] T020 [P] Update `tests/unit/ux-guards.test.ts` and `tests/unit/audit-a11y.test.ts` (and `tests/unit/theme-and-welcome.test.ts` if needed) to enforce: `"Thêm món"` replacing `"Món lẻ"`/`"Thêm SP"`, `CustomerPicker` search input without `data-autofocus`, redesigned `stats/page.tsx` without standalone Payment Breakdown / Debt Aging boxes, `CsvImportModal` wired in `ModalDialog` audit list, `#ECEFED`/`#0C100E` geometric backdrop tokens, neutral frosted glassmorphism without green glass on active chips/orbs, and `.animate-tab-slide-left`/`.animate-tab-slide-right` + modal slide-up animations
- [X] T021 Update `PROJECT_CONTEXT.md` (affected sections in Sections 1–6, `Last Updated`, and `Recent Changelog`) reflecting `v2.3.0` changes per `AGENTS.md` maintenance protocol
- [X] T022 Run full verification gate (`npm run typecheck && npm run lint && npm test && npm run build`) and confirm zero errors, zero warnings, all unit tests passing, and clean Next.js production build across all routes including `POST /api/import/csv`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately (`T001`).
- **Phase 2 (Foundational Motion)**: Depends on `T001`; adds shared slide-up modal & directional tab animations (`T002` → `T003`, `T004`) used across all stories.
- **Phase 3 (US1 — CSV Import)**: Depends on Phase 2 (`T005` → `T006` → `T007` → parallel `T008`, `T009`; `T010` can run in parallel right after `T005`).
- **Phase 4 (US2 — POS `"Thêm món"`)**: Independent of US1 (`T011` → `T012`).
- **Phase 5 (US3 — Mobile `"Chọn khách"`)**: Independent (`T013`).
- **Phase 6 (US4 — `"Thống kê"` Hierarchy)**: Independent (`T014`, `T015` in parallel).
- **Phase 7 (US5 & US6 — Neutral 60–30–10 Glassmorphism & Geometric Backdrop)**: Touches `src/app/globals.css`, `src/lib/theme.ts`, and secondary toggle classes across pages (`T016`, `T017` → `T018`); run after US1–US4 page edits (or coordinate cleanly so page files are edited once).
- **Phase 8 (Polish & Gate)**: Depends on Phases 2–7 (`T019`, `T020` in parallel → `T021` → `T022`).

### Parallel Opportunities

- Within **US1**: `T008` (`orders/page.tsx`), `T009` (`settings/page.tsx`), and `T010` (`tests/unit/csv-import.test.ts`) operate on independent files once `T005`–`T007` are ready.
- Across **US2 / US3 / US4**: `T011`–`T012` (POS toolbar), `T013` (`CustomerPicker`), and `T014`–`T015` (`stats/page.tsx` + `PageSkeletons.tsx`) touch completely separate files and can be implemented in parallel.
- Within **Phase 8**: `T019` (`DESIGN.md` + `.impeccable/design.json`) and `T020` (`tests/unit/*.test.ts`) can run in parallel.

### Parallel Example: US2 + US3 + US4

```bash
# Independent files across three user stories:
Task T011: Replace "Món lẻ" with "Thêm món" in src/components/pos/ProductCatalog.tsx
Task T013: Remove search data-autofocus in src/components/pos/CustomerPicker.tsx
Task T014: Redesign KPI hierarchy & remove secondary chart boxes in src/app/(app)/stats/page.tsx
Task T015: Match StatsPageSkeleton to new layout in src/components/ui/PageSkeletons.tsx
```

---

## Implementation Strategy

### MVP First (User Stories 1–3, Priority P1)
1. Complete Phase 1 (Setup) + Phase 2 (Foundational modal slide-up & tab slide animations).
2. Deliver Phase 3 (US1 — CSV Shop Import) and validate with `tests/unit/csv-import.test.ts` against `ThuChi.csv`.
3. Deliver Phase 4 (US2 — `"Thêm món"`) and Phase 5 (US3 — unobstructed `"Chọn khách"`).

### Full Feature Delivery (Priority P2 + Polish)
4. Deliver Phase 6 (US4 — `"Thống kê"` hierarchy redesign).
5. Deliver Phase 7 (US5 & US6 — Neutral 60–30–10 Glassmorphism & `#ECEFED` / `#0C100E` geometric backdrop across all screens).
6. Complete Phase 8 (Docs, guard tests, `PROJECT_CONTEXT.md`, and `npm run typecheck && npm run lint && npm test && npm run build`).

---

## Phase 9: Convergence

- [X] T023 Emit a non-blocking preview warning in `src/lib/csv-import.ts` (and display it in `src/components/orders/CsvImportModal.tsx` with a unit test in `tests/unit/csv-import.test.ts`) whenever leading CSV data rows lack a `Date` value and default to the import date per `spec: Edge Cases — CSV Date Inference` (`partial`)
- [X] T024 Harmonize PWA manifest `background_color` in `src/app/manifest.ts` from legacy `#F5F7F6` to Warm Gray `#ECEFED` (`THEME_COLOR_LIGHT`) and assert `#ECEFED`/`#0C100E` in `tests/unit/theme-and-welcome.test.ts` per `US6 / FR-019` (`partial`)
- [X] T025 Replace temporary `copiedZalo ? 'glass-pill-jade'` feedback on the secondary Zalo copy button in `src/components/debts/DebtCustomerDrawer.tsx` with `glass-badge-paid` so solid Jade pills remain reserved strictly for primary forward CTAs per `FR-018` (`partial`)
