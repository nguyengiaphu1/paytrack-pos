# Implementation Plan: 003-mom-ledger-glass-dock

**Branch**: `feat/003-mom-ledger-glass-dock` | **Date**: 2026-11-23 | **Spec**: [spec.md](./spec.md)

## Summary

Upgrade PayTrack POS into a complete 12-field Vietnamese retail sales ledger with one-handed thousand-VND (`K`) entry, inline product steppers, exposed POS customer bar, CSV export, and an intentional 60–30–10 Floating Glass Dock UI overhaul with crisp PWA icons, zero-flash boot splash, and stripped-down Settings & copy.

## Technical Context

- **Language/Version**: TypeScript `^5.9.0`, Next.js `^16.4.6` (App Router), React `^19.3.1`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), CSS custom properties in `src/app/globals.css`
- **Database**: Supabase PostgreSQL 17 (`mezuxaqvbtjbbtugsohm`), RLS `user_id = auth.uid()`, integer VND `bigint`
- **Testing**: Vitest `^4.1.0` (`tests/unit/`), ESLint, `tsc --noEmit`, `next build`
- **Target Viewports**: Mobile `375px` (iPhone Safari PWA) and Desktop `1280px` (Windows Chrome/Edge)

## Constitution Check

- **I. Mom-First Simplicity**: PASS — `>= 16px` inputs, `>= 44px`/`48px` touch targets, natural concise Vietnamese retail copy, exposed Customer Bar & `-`/`+` steppers reduce taps on mobile.
- **II. Cloud-First Truth & Real-Time Sync**: PASS — All 12 ledger fields persisted in Postgres with RLS; `PosDataProvider` fetches nested `order_items` and stays subscribed via Realtime.
- **III. Spec-Driven & Branch Discipline**: PASS — Dedicated branch `feat/003-mom-ledger-glass-dock`, complete spec/plan/tasks artifacts before code.
- **IV. Anti-AI-Slop Visual Craft**: **AMENDMENT REQUIRED (v1.0.0 -> v1.1.0)** in Track B — Amend `.specify/memory/constitution.md` and `DESIGN.md` to permit intentional semantic `.glass-dock` & `.glass-surface` (with hairline borders and reduced-transparency fallback) while maintaining strict bans on AI-slop (`indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`).
- **V. Financial Integrity**: PASS — All VND amounts remain integer `bigint`; `K` conversion happens purely at UI boundaries with unit-tested rounding & 1000x guard; `cancelled` orders excluded from profit/revenue.

## Execution Architecture (3 Checkpoints)

### Track A — Backend, Schema, RPCs, Business Logic & Data Wiring (Commit #1)
1. **Migration**: `supabase/migrations/0005_mom_ledger_fields.sql` (schema columns, CHECK constraints, safe production backfill, indexes, updated `create_order_with_items`, `record_debt_payment`, `get_analytics_summary`, new `update_order_ledger_fields`).
2. **Types & Core Libraries**:
   - Update `src/types/database.ts` (`Customer`, `Order`, `DebtPayment`, `AnalyticsSummary`, `PaymentAccount`).
   - Add `src/lib/currency-k.ts` (`parseKToVnd`, `formatVndToKInput`, `detectLikelyFullVndMistake`).
   - Add `src/lib/ledger.ts` (`PAYMENT_ACCOUNTS`, `formatPaymentAccount`, `summarizeOrderItems`, `computeOrderProfit`, `hasMissingCostPrice`, `computeLedgerTotals`, `buildLedgerCsv`, `formatDateInputVN`, `toVnIsoTimestamp`).
3. **Reusable Input & Data Wiring**:
   - Add `src/components/ui/VndKInput.tsx` (fixed `.000 đ` suffix, `inputMode="decimal"`, 1000x safeguard).
   - Add `src/components/ui/PaymentAccountSelector.tsx` (9 canonical options + `Khác: ...` note input).
   - Update `src/components/providers/PosDataProvider.tsx` (nested `order_items`, `purchased_at` sort, pagination `loadMoreOrders`, `paymentAccount` analytics param).
   - Wire POS (`page.tsx`, `CustomerPicker`, `ProductCatalog`, `CartPanel`, `QuickItemModal`, `ProductFormModal`, `CheckoutModal`), Orders (`orders/page.tsx` 12 columns + edit modal + inline debt collection + CSV export), Debts (`CollectDebtModal`, `DebtCustomerDrawer`, `debts/page.tsx`), Stats (`stats/page.tsx` with `total_cost`, `total_profit`, payment account filter).
4. **Unit Tests**: `tests/unit/currency-k.test.ts` and `tests/unit/ledger.test.ts`.
5. **Checkpoint 1**: Run `npm run typecheck && npm run lint && npm test && npm run build` (keeping existing `ux-guards.test.ts` green) -> Commit #1.

### Track B — UI/UX Overhaul with `impeccable` (Commit #2)
1. **Design Governance & Foundations**:
   - Amend `.specify/memory/constitution.md` (`v1.1.0`), create `PRODUCT.md`, update `DESIGN.md` & `.gitignore` (ignore `.impeccable/` runtime artifacts).
   - Update `src/app/globals.css` with 60–30–10 Light/Dark tokens + `.glass-dock` + `.glass-surface` + `prefers-reduced-transparency` + boot splash styles.
2. **Target 1 — PWA Icons & Zero-Flash Boot Splash**:
   - Generate crisp geometric Jade icon assets (`public/favicon.svg`, `public/favicon.ico`, `public/icons/apple-touch-icon.png`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png`).
   - Update `src/app/manifest.ts`, `src/app/layout.tsx` (dynamic Light/Dark `themeColor` + icons), `src/components/ui/BrandLoadingScreen.tsx`, and add `src/components/ui/AppBootSplash.tsx`.
3. **Target 2 — `AppShell.tsx` Floating Glass Dock**:
   - Replace `228px` desktop left rail + mobile bottom bar with unified bottom Floating Glass Dock (`.glass-dock`) + slim top bar (shop name, sync dot, theme toggle).
4. **Target 3–5 — Narrow Surface Overhaul & Copy Distill**:
   - `Orders` (full-width sticky 12-column desktop ledger + clean mobile cards + `.glass-surface` summary/filter strip).
   - `POS` (strip `DailyWelcomeBanner` bloat -> compact due-debt pill when needed; polished exposed Customer Bar, `-`/`+` product card steppers, pill floating mobile cart bar harmoniously stacked above dock).
   - `Settings` (4 ultra-clean sections without AI-slop numbering; `PushNotificationSetup` technical diagnostics folded into `<details>`).
   - `Debts` & `Stats` (60–30–10 alignment, crisp `tabular-nums`, zero filler copy).
   - Controlled update of `tests/unit/ux-guards.test.ts`.
5. **Checkpoint 2**: Verify all 4 gates -> Commit #2.

### Track C — `impeccable` Review Pass, Docs & Final Handover
1. Execute `impeccable` review pass (`distill`, `clarify`, `audit`, `adapt`, `harden`, `polish`) across modified targets.
2. Update `PROJECT_CONTEXT.md` (`v2.0.0`).
3. Final `npm run typecheck && npm run lint && npm test && npm run build` & clean `git status`.
