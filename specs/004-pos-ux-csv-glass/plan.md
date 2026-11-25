# Implementation Plan: POS UX Polish, Analytics Hierarchy, CSV Shop Import & Neutral Geometric Glassmorphism

**Branch**: `feat/004-pos-ux-csv-glass` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-pos-ux-csv-glass/spec.md` + motion enhancement request (modal slide-up and directional tab slide-left/right animations).

## Summary

Deliver six cohesive user-driven improvements plus fluid navigation/modal motion for PayTrack POS (`v2.3.0`) with zero database migrations:
1. **POS Toolbar Cleanup**: Remove `"Món lẻ"` (`QuickItemModal` trigger) from the POS catalog bar and promote `"Thêm món"` (formerly `"Thêm SP"`) into the primary right-hand search-bar slot without duplicating it in the management tray.
2. **Unobstructed Mobile `"Chọn khách"`**: Remove `data-autofocus` from `CustomerPicker`'s search input so opening the sheet never forcibly triggers the mobile virtual keyboard, letting the owner tap recent/listed customers immediately or tap the search box when needed.
3. **Redesigned `"Thống kê"` Hierarchy**: Replace the flat 7-equal-KPI grid and standalone `Phương thức thanh toán` / `Tuổi nợ` boxes with a clear 2-tier summary (2 Hero focal cards for `Lãi` & `Giá bán` with inline cost/margin/order count + 2 Compact secondary cards for `Thực thu` with inline cash-vs-transfer bar & `Tổng nợ` with inline new-debt context), followed by the dominant trend chart and only the two actionable lists (`Nợ nhiều nhất`, `Món bán chạy`).
4. **Automated Shop CSV Import (`ThuChi.csv`)**: Build a pure shared CSV parser/planner (`src/lib/csv-import.ts`), authenticated SSR import endpoint (`POST /api/import/csv` calling existing `create_order_with_items` RPC), and interactive preview/import modal (`src/components/orders/CsvImportModal.tsx`) accessible from both `Sổ bán` and `Cài đặt`, supporting `K`/`VND` unit toggle, adjustable year, same-day/customer grouping toggle (on by default), lowest-price product auto-creation without overwriting existing catalog items, canonical + `Khác` payment account mapping, skipped-row reporting, and idempotent duplicate detection.
5. **System-Wide Neutral 60–30–10 Glassmorphism & Geometric Backdrop**: Replace the radial light-beam wallpaper and green-tinted glass chips/orbs with Warm Gray (`#ECEFED`) + dark forest-gray grid lines (`rgba(15, 23, 20, 0.07)`) in Light Mode and Matte Obsidian (`#0C100E`) + crisp white dot-grid (`rgba(255, 255, 255, 0.08)`) in Dark Mode; render 30% tiles as pure neutral frosted glass (`backdrop-filter: blur(...)`, zero green glass) while reserving 10% solid opaque Deep Forest Jade strictly for important primary CTA buttons and semantic status cues; update `DESIGN.md`, `.impeccable/design.json`, `src/lib/theme.ts`, and guard tests.
6. **Fluid Modal & Tab Animations**: Upgrade modal/sheet entrance keyframes to unmistakable smooth slide-up motion across mobile and desktop, and add directional slide-left / slide-right tab transition animations in `AppShell` keyed to the 5-tab dock order with sticky-safe `onAnimationEnd` cleanup and `prefers-reduced-motion` opacity fallback.

## Technical Context

**Language/Version**: TypeScript `^5.9.0`, React `^19.3.1`, Next.js `^16.4.6` (App Router)
**Primary Dependencies**: Tailwind CSS v4 (`@tailwindcss/postcss`), Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`), `lucide-react`, dynamically imported `recharts`, `qrcode`, `html-to-image` (zero new npm packages required)
**Storage**: Existing Supabase PostgreSQL 17 tables (`customers`, `products`, `orders`, `order_items`, `debt_payments`) + existing `create_order_with_items` RPC (`0005_mom_ledger_fields.sql`, `SECURITY INVOKER` + RLS `user_id = auth.uid()`)
**Testing**: Vitest `^4.1.0` (`tests/unit/*.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`
**Target Platform**: Responsive Web / PWA — iPhone Safari (`375px` touch) & Windows Chrome/Edge (`1280px+` desktop)
**Project Type**: Full-stack Next.js App Router web application
**Performance Goals**: CSV preview parsing `< 100ms` (spec `< 2s` for `ThuChi.csv`), server-side CSV import `< 3s` in `sin1`, 60fps scrolling & GPU-composited `transform`/`opacity` animations (`240–280ms`), zero layout shift on tab switches
**Constraints**: Integer VND (`bigint`) only, strict RLS (`user_id = auth.uid()`), `>= 16px` form inputs, `>= 12px` Vietnamese typography floor, `>= 44px` touch targets, WCAG AA `>= 4.5:1` contrast, `.print-surface-light` lock on receipts/VietQR, `prefers-reduced-transparency` & `prefers-reduced-motion` compliance, zero banned AI-slop tokens
**Scale/Scope**: Single-owner retail shop accounts; CSV batch import bounded to `<= 2 MB` / `<= 500` orders per upload; 5 primary app routes + `/login` + 13+ modals/drawers

## Constitution Check

*GATE: Evaluated before Phase 0 and re-checked post-Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. Mom-First Simplicity & Vietnamese Retail Clarity** | PASS | `"Thêm món"` promoted to 1-tap primary toolbar; `"Chọn khách"` unobstructed on mobile; `"Thống kê"` simplified to 2 Hero + 2 Compact KPIs; CSV upload eliminates manual onboarding; all copy remains concise Vietnamese. |
| **II. Cloud-First Truth & Real-Time Sync** | PASS | `POST /api/import/csv` authenticates via Supabase SSR cookies (`auth.uid()`), writes via RLS + `create_order_with_items` RPC, and triggers `PosDataProvider` refresh (`refreshPosCatalog`, `refreshCustomers`, `refreshOrders`, `invalidateAfterMutation`) so all devices sync live. |
| **III. Spec-Driven Development & Branch Discipline** | PASS | Working on dedicated branch `feat/004-pos-ux-csv-glass` with completed `spec.md`, 5 recorded clarifications, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`. |
| **IV. Anti-AI-Slop Visual Craft & Intentional 60–30–10 Glass System** | PASS (Guardrails Updated) | Strictly enforces 60–30–10 (60% geometric Warm Gray `#ECEFED` / Matte Obsidian `#0C100E`, 30% pure neutral frosted glass tiles with zero green glass, 10% solid Deep Forest Jade CTAs + semantic status). Banned AI-slop tokens remain forbidden. Updates `DESIGN.md`, `.impeccable/design.json`, `ux-guards.test.ts`, and `audit-a11y.test.ts` per explicit user authorization. |
| **V. Financial Integrity & Safe Defaults** | PASS | All CSV amounts convert to exact integer VND (`bigint`), verified against `ThuChi.csv` totals (`48,320,000đ` revenue, `37,234,000đ` cost, `320,000đ` paid, `48,000,000đ` debt, `11,086,000đ` profit); incomplete/summary rows excluded; re-upload duplicate protection prevents double-counting debt. |

## Project Structure

### Documentation (this feature)

```text
specs/004-pos-ux-csv-glass/
├── spec.md                              # Feature specification + 5 clarifications + FR-023 motion
├── plan.md                              # This implementation plan
├── research.md                          # Phase 0 technical decisions & ThuChi.csv analysis
├── data-model.md                        # Phase 1 CSV import types, fingerprints & DB mapping
├── quickstart.md                        # Phase 1 verification & manual test runbook
├── checklists/
│   └── requirements.md                  # Spec quality checklist (16/16 passed)
└── contracts/
    ├── csv-import-api.md                # POST /api/import/csv request/response contract
    └── design-tokens-and-motion.md      # 60-30-10 neutral glass tokens & slide animations contract
```

### Source Code (affected & new files)

```text
src/
├── app/
│   ├── globals.css                      # Neutral 60-30-10 glass tokens, #ECEFED grid & #0C100E dot-grid,
│   │                                    # zero green glass, solid primary CTAs, modal slide-up & tab slide keyframes
│   ├── layout.tsx                       # Uses updated THEME_COLOR_LIGHT / THEME_COLOR_DARK
│   ├── login/page.tsx                   # Switch non-CTA segmented tabs from glass-pill-jade -> glass-chip-active
│   ├── api/
│   │   └── import/
│   │       └── csv/route.ts             # [NEW] Authenticated SSR CSV import execution endpoint
│   └── (app)/
│       ├── page.tsx                     # Remove QuickItemModal / onOpenQuickItem wiring; neutral Undo pill
│       ├── debts/page.tsx               # Switch filter tabs from glass-pill-jade -> glass-chip-active
│       ├── orders/page.tsx              # Add "Nhập CSV" trigger button + CsvImportModal; primary/neutral pill audit
│       ├── stats/page.tsx               # Redesign KPI hierarchy (2 Hero + 2 Compact + inline cash/transfer bar);
│       │                                # remove standalone PaymentBreakdownChart & DebtAgingCard
│       └── settings/page.tsx            # Add CSV Import card/button opening CsvImportModal
├── components/
│   ├── shell/
│   │   └── AppShell.tsx                 # Directional tab slide-left / slide-right animation + sticky-safe cleanup
│   ├── pos/
│   │   ├── ProductCatalog.tsx           # Replace "Món lẻ" with "Thêm món", remove duplicate "Thêm SP"
│   │   ├── CustomerPicker.tsx           # Remove data-autofocus from search input so mobile keyboard stays closed
│   │   └── CheckoutModal.tsx            # Audit neutral active chips vs solid primary CTA
│   ├── orders/
│   │   └── CsvImportModal.tsx           # [NEW] Drag/pick CSV file, live preview (totals/options/warnings), confirm import
│   ├── invoice/
│   │   └── InvoicePreviewModal.tsx      # Switch A5/80mm toggle from glass-pill-jade -> glass-chip-active
│   ├── qr/
│   │   └── VietQRModal.tsx              # Switch amount mode toggle from glass-pill-jade -> glass-chip-active
│   └── ui/
│       ├── ThemeToggle.tsx              # Switch theme selector active state to neutral glass-chip-active
│       └── PageSkeletons.tsx            # Update StatsPageSkeleton to match new 2-Hero + 2-Compact layout
└── lib/
    ├── csv-import.ts                    # [NEW] RFC-4180 CSV parser, ThuChi.csv normalizer, grouping, dedup & preview planner
    └── theme.ts                         # Update THEME_COLOR_LIGHT = '#ECEFED', THEME_COLOR_DARK = '#0C100E'

tests/unit/
├── csv-import.test.ts                   # [NEW] Comprehensive parser/preview/grouping/dedup tests incl. real ThuChi.csv checks
├── ux-guards.test.ts                    # Update guards for neutral 60-30-10 glass, #ECEFED/#0C100E patterns, "Thêm món", animations
├── audit-a11y.test.ts                   # Update guards for CustomerPicker no-autofocus, redesigned Stats, frosted glass cards
└── theme-and-welcome.test.ts            # Update expected THEME_COLOR_LIGHT/DARK if asserted

DESIGN.md                                # Refresh design tokens & neutral 60-30-10 geometric glass rules
.impeccable/design.json                  # Sync colorMeta/north star tokens with DESIGN.md
PROJECT_CONTEXT.md                       # Update after implementation completes
```

**Structure Decision**: Single Next.js App Router repository (`src/` + `tests/unit/`). All CSV parsing logic lives in a pure isomorphic module (`src/lib/csv-import.ts`) shared between client preview (`CsvImportModal.tsx`) and server commit (`POST /api/import/csv`) so client totals and server database writes are guaranteed identical.

## Complexity Tracking

No unjustified Constitution violations. Updating design guardrails (`DESIGN.md`, `.impeccable/design.json`, `ux-guards.test.ts`, `audit-a11y.test.ts`) for neutral 60–30–10 glassmorphism and geometric backdrops was explicitly requested and authorized by the user while keeping all Anti-AI-Slop bans, accessibility floors (`>= 16px` inputs, `>= 12px` Vietnamese text, `>= 44px` touch targets, WCAG AA contrast), and `.print-surface-light` protections intact.
