# Phase 0 Research: POS UX Polish, Analytics Hierarchy, CSV Shop Import & Neutral Geometric Glassmorphism

**Feature**: `004-pos-ux-csv-glass` | **Date**: 2026-11-25

## 1. CSV Parsing & Integration Architecture (`ThuChi.csv`)

### Decision
Build a shared, dependency-free pure TypeScript CSV parser & planner (`src/lib/csv-import.ts`) used on both the client (for instant `< 50ms` interactive preview) and an authenticated Next.js App Router endpoint (`POST /api/import/csv`) that executes the import via Supabase SSR (`auth.uid()` RLS) + existing `create_order_with_items` RPC.

### Rationale
- **Real file validation against `/home/antigravity/ThuChi.csv`**:
  - Header: `Date,Item ,Out,In ,Tồn ,,Customer,Người nhận CK,` (contains trailing spaces, blank spacer column index 5, optional status column index 8 e.g. `Done`, CRLF line endings).
  - 57 valid item rows: `Out = 37,234 K` (`37,234,000đ`), `In = 320 K` (`320,000đ`), `Tồn = 48,000 K` (`48,000,000đ`), `Revenue = 48,320,000đ`, `Profit = 11,086,000đ`.
  - Line 55 (`,2 túi mm mint,,,,,,,`): missing prices & customer → flagged as skipped incomplete row (`Thiếu giá bán và tên khách hàng`).
  - Line 65 (`,,37234,320,48000,,11086,,`): empty `Date` & `Item` with summary totals → detected and ignored automatically (never creates a customer named `"11086"`).
  - Unique entities: 40 customers, 46 normalized products, 45 grouped orders (same date + normalized customer + payment status + normalized payment account) or 57 ungrouped orders.
  - Payment receivers: `'Kiều Thương'` → `'Kiều Thương'`, `'Thanh '` → `'Thanh'`, `'Trần Huyền'` → `'Khác'` with `payment_account_note = 'Trần Huyền'`.
- **Zero DB migrations needed**: Migration `0005_mom_ledger_fields.sql` already defines `create_order_with_items` accepting `p_customer_id`, `p_paid_amount`, `p_payment_method`, `p_items` (with `cost_price`), `p_purchased_at`, `p_total_cost`, `p_payment_account`, `p_payment_account_note`, `p_paid_at`, and `p_note`, while atomically locking the customer row (`FOR UPDATE`), recording `debt_payments`, and running `recompute_customer_debt_state`.
- **Server-side execution (`POST /api/import/csv`)**: Because Vercel (`sin1`) and Supabase (`ap-southeast-1`) sit in the same Singapore region (~2–5ms RTT), running batch customer/product inserts + 45 sequential RPC calls on the server finishes in ~1 second instead of 45 slow mobile 4G browser roundtrips, while preserving full RLS via `createClient()` from `@/lib/supabase/server`.
- **Idempotent duplicate detection**: Each planned order computes a deterministic fingerprint from `(vnDate, normalizedCustomerName, totalAmount, paidAmount, sortedItemSignatures)`. Comparing against existing non-cancelled orders in the account allows accurate preview duplicate counts and zero double-counting on re-upload or partial retry.

### Alternatives Considered
- *Client-only sequential RPC calls from browser*: Rejected due to high latency/drop risk over mobile 4G when importing 45–200 orders.
- *Adding a new bulk-import Postgres RPC migration*: Rejected to avoid requiring live Supabase migration execution before deploying and to reuse the battle-tested `create_order_with_items` invariants.
- *Adding an external CSV npm dependency (`papaparse`)*: Rejected because RFC-4180 quoted-field parsing in TypeScript is ~45 lines, adds 0 KB bundle bloat, and gives full control over Vietnamese headers, BOM stripping, and blank spacer columns.

---

## 2. Neutral 60–30–10 Glassmorphism & Geometric Architectural Backdrop

### Decision
Shift the global design token system in `src/app/globals.css`, `src/lib/theme.ts`, `DESIGN.md`, and `.impeccable/design.json` from "Sunlit Limestone radial wallpaper + Jade-tinted crystal chips" to **Neutral Architectural Glassmorphism** under strict 60–30–10 rules:
- **60% Solid Base + Crisp Geometric Pattern (`body::before`, `body::after` removed/simplified)**:
  - **Light Mode**: Solid Warm Gray (`#ECEFED`) base layered with crisp dark forest-gray `28px × 28px` architectural grid lines (`rgba(15, 23, 20, 0.07)`) via pure CSS `linear-gradient` repeating tiles + ultra-subtle geometric architectural accent shapes (or clean minimal grid so tiles remain effortlessly readable).
  - **Dark Mode**: Solid Matte Obsidian (`#0C100E`) base layered with crisp white dot-grid (`radial-gradient(circle, rgba(255, 255, 255, 0.08) 1.25px, transparent 1.25px)` at `24px × 24px`).
  - Sync `THEME_COLOR_LIGHT = '#ECEFED'` and `THEME_COLOR_DARK = '#0C100E'` in `src/lib/theme.ts` and root layout `viewport.themeColor`.
- **30% Pure Neutral Frosted Glassmorphism (Zero Green Glass)**:
  - Cards (`.glass-card`), panels (`.glass-panel`), structural bars (`.glass-surface`), modals (`.glass-modal`), and dock (`.glass-dock`) use neutral translucent fills (`rgba(255, 255, 255, 0.68–0.84)` Light; `rgba(22, 28, 25, 0.64–0.82)` / neutral obsidian-slate Dark) with `backdrop-filter: blur(...) saturate(140–170%)` so the geometric grid/dot pattern subtly frosts through every tile.
  - Eliminate ALL green glass tinting:
    - `.glass-chip-active`: Neutral high-contrast frosted pill (crisp bright white surface with dark charcoal `#0B111A` text & subtle dark ring in Light Mode; bright neutral charcoal-silver frosted surface with crisp `#F4F6F8` text & white rim in Dark Mode) — zero green glass fill or jade bevel rim!
    - `.glass-icon-orb`: Neutral frosted glass orb with subtle crisp border (no green glass background).
    - `.glass-card-selected`: Crisp neutral elevation + sharp `1.5px` neutral/brand outline instead of green shadow wash.
    - `.glass-pill-jade` on non-primary filter toggles / segmented controls (`Thống kê` date presets, `Công nợ` filter tabs, `A5/80mm` toggle, `ThemeToggle`, `Login` tab switcher, `#1` rank orb): replace with neutral active frosted pill (`.glass-chip-active`) so green does NOT flood secondary controls!
- **10% Solid Opaque Accent Reserved Strictly for Important Primary Buttons & Semantic Status**:
  - `.glass-btn-primary`: Solid opaque Deep Forest Jade (`#0E6B4E` Light / `#127A59` Dark, crisp `#FFFFFF` ink, `>= 5.1:1` WCAG AA contrast, solid tactile shadow, NO translucent glass wash or emerald caustic halo).
  - `.glass-btn-danger`: Solid opaque Crimson (`#B91C1C` / `#DC2626`, `#FFFFFF` ink).
  - Semantic status badges (`.glass-badge-paid`, `.glass-badge-debt`, `.glass-badge-overdue`) and financial figure colors (`Lãi`, `Nợ`, `Quá hạn`) retain high-contrast accessible semantic tones.
- **Reduced Transparency & Print Lock**:
  - `@media (prefers-reduced-transparency: reduce)` turns every frosted glass tier opaque (`#FFFFFF` / `#161B19`) with `1px solid` hairline borders.
  - `.print-surface-light` preserves opaque white paper for receipts and VietQR cards.

### Rationale
- Research & UX best practices for 60–30–10 Glassmorphism establish that frosted translucent surfaces need high-frequency low-contrast background geometry (grid lines / dot-grids) to be perceivable as glass without competing with text legibility, and that keeping 30% of tiles strictly achromatic/neutral lets the 10% solid CTA buttons command immediate visual attention.
- Adjusting `tests/unit/ux-guards.test.ts` and `tests/unit/audit-a11y.test.ts` (explicitly authorized by the user) aligns automated CI verification with the new neutral glassmorphism design guardrails.

### Alternatives Considered
- *Keeping `.glass-card` opaque without `backdrop-filter`*: Rejected because cards over the geometric grid would look like flat solid cards instead of system-wide glassmorphism; instead we use a tuned lightweight `backdrop-filter: blur(12px) saturate(145%)` with `contain: layout style` for smooth scrolling.
- *SVG noise/complex multi-layer shapes in `body::before`*: Rejected because crisp CSS `linear-gradient` grid lines (`7%`) and `radial-gradient` dot-grids (`8%`) are GPU-cheap, razor-sharp at Retina 2x/3x DPR, and exact to the user's specification.

---

## 3. Modal Slide-Up & Directional Tab Slide-Left/Right Animations

### Decision
1. **Unified Modal Slide-Up Animation**:
   - Upgrade `.animate-modal-in` (`paytrack-modal-in`) to a crisp slide-up entrance (`translateY(28px) scale(0.985)` → `translateY(0) scale(1)`, `opacity: 0 → 1`, `260ms cubic-bezier(0.22, 1, 0.36, 1)`) and `.animate-sheet-up` (`paytrack-sheet-up`) to `translateY(44px)` → `0` (`280ms cubic-bezier(0.22, 1, 0.36, 1)`), so every modal and bottom sheet visibly slides upward on open across both mobile and desktop.
   - Ensure `ModalDialog` supports default slide-up panel motion cleanly and respects `@media (prefers-reduced-motion: reduce)` with a gentle `120ms` opacity fade.
2. **Directional Tab Slide-Left / Slide-Right Animation in `AppShell`**:
   - Track the previous top-level tab index (`0..4` from `NAV_ITEMS`: `/`, `/debts`, `/orders`, `/stats`, `/settings`) in a `ref` inside `AppShell.tsx`.
   - When `pathname` switches to a higher tab index (`nextIdx > prevIdx`), apply `.animate-tab-slide-left` (`translateX(28px) → 0`, `opacity: 0 → 1`, `240ms cubic-bezier(0.22, 1, 0.36, 1)`).
   - When `pathname` switches to a lower tab index (`nextIdx < prevIdx`), apply `.animate-tab-slide-right` (`translateX(-28px) → 0`, `opacity: 0 → 1`, `240ms cubic-bezier(0.22, 1, 0.36, 1)`).
   - **Critical CSS sticky-safety detail**: Use `animation-fill-mode: backwards` (NOT `both`/`forwards`) AND clear the animation class on `onAnimationEnd` so that once the 240ms slide finishes, the wrapper has `transform: none` and `position: sticky` inside POS `CartPanel` and `/orders` table headers never breaks!
   - Under `@media (prefers-reduced-motion: reduce)`, `.animate-tab-slide-left` and `.animate-tab-slide-right` degrade gracefully to `paytrack-fade-in 120ms ease-out` (zero horizontal slide).

### Rationale
- Pure CSS GPU-composited `transform` + `opacity` animations require zero third-party animation libraries (`0 KB` added JS), run smoothly at 60fps on iPhone Safari, and give immediate spatial continuity matching the 5-tab Floating Glass Dock order.

### Alternatives Considered
- *Adding `framer-motion`*: Rejected to avoid ~35–50 KB extra client bundle weight and unnecessary hydration complexity in Next.js App Router.
- *CSS View Transitions API (`document.startViewTransition`)*: Rejected as primary mechanism because cross-browser support in Next.js App Router + older iOS Safari versions is inconsistent; CSS keyframes on a keyed wrapper work reliably everywhere.

---

## 4. POS Toolbar ("Thêm món") & Mobile Customer Picker ("Chọn khách")

### Decision
1. **POS Toolbar Consolidation**:
   - Remove `QuickItemModal` trigger (`Món lẻ`) and `onOpenQuickItem` prop from `ProductCatalog.tsx` and `src/app/(app)/page.tsx` (retaining `addQuickItemToCart` in `PosDataProvider` harmlessly or cleaning unused imports so no existing cart draft breaks).
   - Place the **"Thêm món"** button (with `Plus` icon, `glass-btn-primary` or crisp high-contrast control — wait: keeping search tray balanced with `glass-solid-control` or solid primary? On POS, the main 10% primary CTA is `Chốt đơn` / `Thanh toán`, while `Thêm món` sits right next to the search bar as a neutral `.glass-solid-control` or clean `+ Thêm món` pill so it doesn't fight `Chốt đơn`!) right in the search bar's right-hand slot previously occupied by `Món lẻ`.
   - Remove the duplicate `Thêm SP` button from both the desktop filter row and mobile `Quản lý` tray (leaving `Đã ẩn (N)` when applicable and `Sửa`).
   - Update `ProductCatalog` empty-state CTA label to `"Thêm món"` for terminology consistency.
2. **Unobstructed Mobile `"Chọn khách"` Modal**:
   - Remove `data-autofocus` from the search `<input>` inside `CustomerPicker.tsx` (lines 317–332).
   - Keep `ModalDialog`'s panel focus (`panelEl.focus({ preventScroll: true })`) when no `[data-autofocus]` element exists — this preserves screen-reader/keyboard accessibility (`Escape` + `Tab` trap) while guaranteeing mobile iOS Safari & Android Chrome do **NOT** pop up the virtual keyboard on modal open!
   - Also remove `data-autofocus` on mobile or keep `creating` mode responsive (`max-h-[85dvh]` + scrollable body) so tapping any field scrolls smoothly above the virtual keyboard without hiding the header or footer.

### Rationale
- Removing `data-autofocus` on the search input directly fixes the root cause of the mobile keyboard immediately covering the modal sheet on open, while preserving `ModalDialog` keyboard accessibility (`panelEl.focus({ preventScroll: true })`).

---

## 5. Analytics ("Thống kê") Hierarchy Redesign

### Decision
Refactor `src/app/(app)/stats/page.tsx` (and `StatsPageSkeleton` in `src/components/ui/PageSkeletons.tsx`) from 7 equal-weight KPI boxes + 4 equal chart/list panels into a clear 3-level visual hierarchy:
1. **Level 1 — Hero Financial Summary (2 Focal Cards, 2-col on `sm+` / stacked cleanly on `375px`)**:
   - **Hero Card 1 — Lãi (Profit)** (largest figure `24px–28px`, bold semantic jade/crimson tone): displays net profit prominently, with inline supporting breakdown (`Giá vốn: ...` and profit margin `%` when revenue > 0).
   - **Hero Card 2 — Giá bán (Revenue)** (`24px–28px`, crisp primary ink): displays period revenue prominently, with inline `Số đơn` pill badge (`X đơn`) and average order value when `order_count > 0`.
2. **Level 2 — Subordinate Cash & Debt Strip (2 Compact Cards, 2-col on `sm+`)**:
   - **Compact Card 1 — Thực thu (Cash Collected)** (`18px–20px` figure): displays cash collected + an **embedded compact cash-vs-transfer progress bar** (showing `Tiền mặt` vs `Chuyển khoản` percentages/amounts cleanly inline, replacing the removed standalone `PaymentBreakdownChart` box!).
   - **Compact Card 2 — Tổng nợ hiện tại (Total Outstanding Debt)** (`18px–20px` figure, amber/overdue cue): displays total outstanding debt + inline context chip (`Nợ mới kỳ này: ...`), with quick link to `/debts` when debt > 0.
3. **Level 3 — Primary Visual Anchor & Focused Actionable Lists**:
   - Full-width **RevenueCashChart** (`Doanh thu & Thực thu` trend chart).
   - Below the chart: ONLY the 2 actionable panels side-by-side (`lg:grid-cols-2`): **Nợ nhiều nhất** (tap-to-collect links to `/debts?customer=...`) and **Món bán chạy** (top products ranked with neutral glass badges).
   - Remove standalone `PaymentBreakdownChart` and `DebtAgingCard` renders from `stats/page.tsx`.

### Rationale
- Directly solves "a mess full of equally important boxes": reduces 7 KPI tiles → 2 Hero + 2 Compact cards, eliminates 2 low-signal standalone cards (`Phương thức thanh toán` & `Tuổi nợ`), preserves 100% of essential business numbers (profit, cost, revenue, order count, cash collected + cash/transfer split, total debt + new period debt), and matches the confirmed Q3 clarification.
