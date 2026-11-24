---
name: PayTrack POS
description: Calm home online-shop sales ledger and rapid order-entry system with 60-30-10 Deep Forest Jade hierarchy and Floating Glass Dock.
colors:
  jade-primary: "#0E6B4E"
  jade-hover: "#0A543D"
  paper-canvas: "#F5F7F6"
  sheet-surface: "#FFFFFF"
  ledger-subtle: "#EDF1F0"
  hairline-border: "#D9E0DE"
  ink-primary: "#121917"
  ink-secondary: "#4B5854"
  status-paid: "#0F766E"
  status-paid-bg: "#D1FAE5"
  status-debt: "#9A4306"
  status-debt-bg: "#FEF3C7"
  status-overdue: "#B91C1C"
  status-overdue-bg: "#FEE2E2"
  glass-surface: "rgba(255, 255, 255, 0.78)"
  glass-dock: "rgba(255, 255, 255, 0.84)"
  glass-border: "rgba(18, 25, 23, 0.10)"
  dark-canvas: "#0D1215"
  dark-surface: "#151C21"
  dark-subtle: "#1D272E"
  dark-border: "#293640"
  dark-ink-primary: "#F1F5F4"
  dark-ink-secondary: "#98A6A2"
  dark-jade-primary: "#15805E"
  dark-jade-text: "#4CC39B"
  dark-glass-surface: "rgba(21, 28, 33, 0.78)"
  dark-glass-dock: "rgba(18, 25, 30, 0.86)"
  dark-glass-border: "rgba(241, 245, 244, 0.12)"
  print-ink: "#141A21"
typography:
  headline:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  headline-mobile:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.35
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.3
    fontFeature: '"tnum" 1'
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  dock-item: "16px"
  dock: "22px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.jade-primary}"
    textColor: "{colors.sheet-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.jade-hover}"
    textColor: "{colors.sheet-surface}"
  button-secondary:
    backgroundColor: "{colors.sheet-surface}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "48px"
  input-field:
    backgroundColor: "{colors.sheet-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "46px"
  chip-active:
    backgroundColor: "{colors.status-paid-bg}"
    textColor: "{colors.jade-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "44px"
  card-product:
    backgroundColor: "{colors.sheet-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "12px"
  customer-bar:
    backgroundColor: "{colors.sheet-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  dock-nav:
    backgroundColor: "{colors.glass-dock}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.dock}"
    padding: "6px 8px"
---

# Design System: PayTrack POS

## Overview

**Creative North Star: "The Calm Home-Shop Ledger"**

PayTrack POS is designed around a calm, dependable home accounting notebook built for a Vietnamese online seller working from her phone and desk. Daytime order entry runs on soft jade-tinted paper with crisp flat white sheets so buyer addresses, item quantities, and VND totals stay effortless to scan between Zalo and Messenger chats. Evening profit and debt reconciliation shifts smoothly into deep eye-comfort slate rather than harsh pure black.

Across iPhone Safari PWA (`375px`) and Windows desktop (`1280px+`), the interface favors earned operational familiarity over decorative flair: `1px` hairlines organize dense product grids and 12-column accounting rows, tabular monospace numerals align every VND figure vertically, and real-time translucent glass appears only on the top bar, sticky summary strips, and bottom Floating Glass Dock.

**Key Characteristics:**
- Disciplined 60-30-10 color balance where Deep Forest Jade leads primary actions, active navigation, and profit figures.
- Full-width desktop layout with no fixed left sidebar; a unified bottom Floating Glass Dock keeps 100% horizontal space open for the 12-column sales ledger.
- Clean Vietnamese diacritics in Be Vietnam Pro paired with tabular JetBrains Mono for VND amounts, order codes, quantities, and dates.
- Home-workflow ergonomics: exposed buyer bar with phone/address/debt preview, thousand-VND `.000đ` shorthand inputs, `>= 44px` touch targets, `>= 16px` inputs, and light-paper locked PNG receipts & VietQR cards ready for chat sharing.

## Colors

All color tokens are normatively authored as CSS custom properties in `src/app/globals.css` and mirrored in the frontmatter above, meeting WCAG AA (`>= 4.5:1`) in Light and Dark modes.

### Primary
- **Deep Forest Jade** (`jade-primary`, dark `dark-jade-primary` / `dark-jade-text`): Primary submit CTAs, active dock indicator, selected account/category chips, profit totals, focus rings, and text caret. Hover deepens to `jade-hover`.

### Neutral
- **Soft Ledger Paper & Deep Slate Canvas** (`paper-canvas` / `dark-canvas`): 60% page ground; dark mode stays eye-comfort slate and never drops to pure `#000000`.
- **Crisp Sheet & Subtle Banding** (`sheet-surface`, `ledger-subtle` / `dark-surface`, `dark-subtle`): 30% workspace sheets, product tiles, 12-column table rows, modals, drawers, and table headers.
- **Hairline Dividers & Ink** (`hairline-border`, `ink-primary`, `ink-secondary` / `dark-border`, `dark-ink-primary`, `dark-ink-secondary`): Structural `1px` rules and high-contrast ink (> 14:1 primary, > 7:1 secondary).

### Semantic Status
- **Paid / Synced** (`status-paid`, `status-paid-bg`): Settled orders (`Đã trả`), live sync pill (`Đã đồng bộ`), and active selection fills.
- **Debt / Missing Cost** (`status-debt`, `status-debt-bg`): Unpaid or partial orders (`Trả 1 phần`, `Chưa trả`), buyer debt badges, `Chưa nhập vốn` alerts, and `VndKInput` typo banners.
- **Overdue / Destructive** (`status-overdue`, `status-overdue-bg`): Overdue debt, offline banner (`Mất mạng`), order cancel, logout, and form errors.

### Named Rules
**The 60-30-10 Restraint Rule.** Keep 60% calm canvas, 30% flat sheets and semantic glass, and <= 10% Jade or status accents; never flood inactive controls with saturated fills.

**The Chat-Ready Light-Paper Lock Rule.** Receipts and VietQR cards always apply `.print-surface-light` (`sheet-surface` + `print-ink`, `color-scheme: light`) even in Dark Mode.

## Typography

**Body & UI Font:** Be Vietnam Pro (fallback `system-ui, -apple-system, sans-serif`)
**Numeric & Ledger Font:** JetBrains Mono (fallback `ui-monospace, SFMono-Regular, monospace`, `tabular-nums`)

**Character:** Workhorse Vietnamese UI sans (`400`–`700`) with balanced diacritics and zero decorative display bloat, paired with strict fixed-width numerals so columns of prices, costs, profits, and debts line up cleanly.

### Hierarchy
- **Headline** (`700`, `20px` `headline-mobile` / `24px` `headline`, `-0.015em`): Route headers (*Bán hàng*, *Sổ bán*, *Công nợ*, *Thống kê*, *Cài đặt*), hero KPIs, and VietQR amount display.
- **Title** (`700`, `16px`, `-0.01em`): Shop name in top bar, modal and drawer headings, section titles, mobile KPI values, and the iOS input floor.
- **Body** (`400`–`500`, `15px` `body` / `14px` `body-sm`, `1.45`–`1.5`): Product names, order cells, buyer notes, addresses, and concise operational prompts.
- **Label** (`600`, `13px`, `1.3`): Filter chips, table headers, compact form metadata, and toolbar pills.
- **Caption** (`500`, `12px`, `1.35`): Strict Vietnamese legibility floor for status pills, debt badges, mobile dock tab labels, and receipt footnotes (zero sub-12px text anywhere).
- **Mono Tabular** (`600`–`700`, `12px`–`24px`, `tabular-nums`): Right-aligned VND totals, order codes, quantities, dates, and `.000đ` fields.

### Named Rules
**The 16px Input & 12px Diacritic Floor Rule.** Every `input`, `select`, and `textarea` renders at `>= 16px` (`src/app/globals.css`, preventing iOS Safari zoom), and no UI/badge/receipt text drops below `12px`.

## Layout

- **Full-width ledger & split order workspace**: Sticky top header caps content at `1440px` (`h-[54px]`, `px-3 sm:px-6`). `<main>` spans full viewport width with bottom clearance for the floating dock (`pb-[112px]` mobile / `pb-[104px]` desktop, plus extra clearance on `/` when the mobile cart pill is active).
- **Responsive grids**: Product catalog scales from compact horizontal ledger rows (`375px`) -> `2` columns (`sm: 640px`) -> `3` columns (`xl: 1280px`) alongside a sticky desktop cart panel; `/orders` renders stacked overflow-free mobile cards at `375px` and a bounded scrollable sticky-header 12-column table at `1280px+`.
- **Spacing rhythm**: `4px`–`8px` micro spacing inside steppers, pills, and badge clusters; `12px` between cards and form rows; `16px`–`24px` between major workspace bands.

## Elevation & Depth

Surfaces sit flat by default with `1px` hairlines (`--border-default`). Translucent depth is strictly scoped to two classes in `src/app/globals.css`:

- **`.glass-dock`** (`--glass-dock-bg`, `--glass-border`, `blur(20px) saturate(165%)`, `--glass-shadow`): Bottom Floating Glass Dock.
- **`.glass-surface`** (`--glass-bg`, `--glass-border`, `blur(14px) saturate(145%)`, `--glass-surface-shadow`): Sticky top bar, filter/control strips, and login card (never on inline scrolling KPI or form cards).

### Named Rules
**The Semantic Glass Only Rule.** Backdrop blur lives strictly on `.glass-dock` and `.glass-surface` in `src/app/globals.css` with reduced-transparency fallbacks; never scatter raw `backdrop-blur` or `shadow-lg` in TSX.

## Shapes

- **Interactive controls**: Gently rounded `8px` corners (`rounded-lg`) across buttons, inputs, account/category chips, and stepper groups.
- **Workspace cards & containers**: `10px` corners (`rounded-[10px]`) on product tiles, exposed buyer bar, theme option tiles, and `EmptyStateCard`; `12px` (`rounded-[12px]`) on Settings panels, modals, and drawers.
- **Navigation dock & status pills**: Outer dock forms a `22px` capsule (`rounded-[22px]`) framing `16px` active tab pills (`rounded-[16px]`); sync indicators and payment status badges use full capsules (`9999px`).
- **Brand mark**: Crisp geometric Jade ledger icon set (`public/favicon.svg` and `public/icons/`, wired in `src/app/manifest.ts`).

## Components

Every interactive control pairs flat `1px` craft with `>= 44px` touch targets, `2px` Jade keyboard `:focus-visible` outlines, and tactile `120ms` `.press-tactile` press feedback (suppressed under `prefers-reduced-motion`).

### Buttons
- **Shape:** `8px` radius, `48px` primary action height (`44px` floor for compact inline controls).
- **Primary:** Solid `jade-primary` background, white semibold label, `jade-hover` hover state.
- **Secondary:** `sheet-surface` background, `1px` `hairline-border`, `ink-primary` text, `ledger-subtle` hover fill.

### Chips & Status Badges
- **Filter & Account Chips (`src/components/ui/PaymentAccountSelector.tsx`):** `44px` height, `8px` radius, `1px` border; selected shifts to `jade-primary` border, `status-paid-bg` fill, and `jade-primary` (`dark-jade-text`) ink.
- **Ledger Status Badges (`src/app/(app)/orders/page.tsx`):** Capsule badges (`9999px`) mapping `Đã trả` (`status-paid`), `Trả 1 phần` / `Chưa trả` (`status-debt`), and `Đã hủy` (`ledger-subtle` + `line-through`).

### Cards / Containers
- **Product Card (`src/components/pos/ProductCatalog.tsx`):** `10px` radius, flat `sheet-surface` with `1px` `hairline-border` (shifts to `jade-primary` when in cart or hovered); full-width tap-to-add row on `375px` with explicit `Sửa` edit-mode toggle plus an inline `44px` `-` / editable qty / `+` footer stepper.
- **Empty State & Theme Panel (`src/components/ui/EmptyStateCard.tsx`, `src/components/ui/ThemeToggle.tsx`):** Dashed `10px` empty states with concrete next actions; `12px` Settings cards with a 3-column `Theo máy / Sáng / Tối` segmented selector.

### Inputs / Fields
- **Base Fields:** `8px` radius, `1px` `hairline-border`, `sheet-surface` fill, `>= 44px`–`48px` height, `16px` text, `jade-primary` focus border.
- **`VndKInput` (`src/components/ui/VndKInput.tsx`):** Monospace `inputMode="decimal"` field with locked `.000đ` suffix and a 1-tap amber guard banner catching full-VND entries (`50000` or `125.000`).

### Navigation
- **Slim Top Bar & Floating Glass Dock (`src/components/shell/AppShell.tsx`):** Sticky `54px` `.glass-surface` header with `BrandMark`, shop name, `SyncStatusPill` (`Đã đồng bộ`, `Đang nối`, `Mất mạng`), and mobile theme button; centered bottom `.glass-dock` holding 5 tabs (*Bán hàng*, *Công nợ*, *Sổ bán*, *Thống kê*, *Cài đặt*) plus desktop theme button.

### Signature Component: Exposed Buyer Bar (`CustomerPicker`)
- **`CustomerPicker` (`src/components/pos/CustomerPicker.tsx`):** Sits visibly at the top of the primary workspace column on `/` as a compact flat `10px` hairline bar showing the active buyer (or *Khách lẻ*), current debt pill in amber tabular mono, and 1-tap picker/create modal with phone & shipping address fields.

## Do's and Don'ts

### Do:
- **Do** use CSS custom properties from `src/app/globals.css` (`--bg-canvas`, `--bg-surface`, `--brand-jade`, status tokens) for clean Light/Dark switching.
- **Do** format VND, profit, debt, and dates with `.font-mono-tabular` and keep `>= 44px` targets and `>= 16px` inputs.
- **Do** wrap PNG receipts and VietQR cards in `.print-surface-light`, and pair every route with skeletons and `FetchErrorCard`.

### Don't:
- **Don't** use banned AI-slop (`indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`) or raw `backdrop-blur`/`shadow-lg`/`rounded-2xl`/`rounded-3xl` in TSX.
- **Don't** add a fixed desktop left sidebar or decorative numbered eyebrows / generic marketing copy.
- **Don't** use pure `#000000` dark grounds or define conflicting tokens outside `src/app/globals.css`.
