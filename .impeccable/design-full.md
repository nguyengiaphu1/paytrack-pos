---
name: PayTrack POS
description: Sunlit Limestone & Jade Crystal home online-shop sales ledger and rapid order-entry system with 60-30-10 Deep Forest Jade hierarchy and Floating Glass Dock.
colors:
  jade-primary: "#0E6B4E"
  jade-hover: "#0A563F"
  jade-text: "#09583F"
  limestone-canvas: "#BCC3CE"
  limestone-mid: "#AEB6C3"
  pewter-slate: "#99A3B3"
  porcelain-surface: "#FFFFFF"
  porcelain-subtle: "rgba(15, 23, 42, 0.06)"
  slate-border: "rgba(15, 23, 42, 0.14)"
  ink-primary: "#0B111A"
  ink-secondary: "#1E293B"
  status-paid: "#075444"
  status-paid-bg: "rgba(232, 250, 243, 0.92)"
  status-debt: "#8A3B04"
  status-debt-bg: "rgba(254, 243, 212, 0.94)"
  status-overdue: "#9F1616"
  status-overdue-bg: "rgba(254, 232, 232, 0.94)"
  chart-transfer: "#0284C7"
  glass-input-light: "rgba(255, 255, 255, 0.96)"
  glass-border-light: "rgba(255, 255, 255, 0.96)"
  dark-canvas: "#161C26"
  dark-surface: "#1E2633"
  dark-subtle: "rgba(226, 232, 240, 0.08)"
  dark-border: "rgba(226, 232, 240, 0.15)"
  dark-ink-primary: "#F4F6F8"
  dark-ink-secondary: "#B4BECE"
  dark-jade-primary: "#127A59"
  dark-jade-hover: "#0E6347"
  dark-jade-text: "#62E6BA"
  dark-status-debt: "#FCD34D"
  dark-status-overdue: "#FCA5A5"
  dark-status-overdue-solid: "#DC2626"
  dark-chart-transfer: "#38BDF8"
  glass-input-dark: "rgba(12, 16, 23, 0.92)"
  glass-border-dark: "rgba(241, 245, 249, 0.26)"
  print-ink: "#141A21"
  print-secondary: "#4B5563"
  print-border: "#DDE2E7"
  print-paid: "#0F766E"
  print-paid-bg: "#CCFBF1"
  print-debt-bg: "#FEF3C7"
  print-overdue-bg: "#FEE2E2"
typography:
  headline:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  headline-mobile:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  metric:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
    fontFeature: '"tnum" 1'
  metric-sm:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    fontFeature: '"tnum" 1'
  title:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.35
  tabular:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.3
    fontFeature: '"tnum" 1'
rounded:
  control: "14px"
  inset: "16px"
  well: "18px"
  card: "22px"
  surface: "24px"
  panel: "26px"
  modal: "28px"
  dock: "30px"
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
    textColor: "{colors.porcelain-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.jade-hover}"
    textColor: "{colors.porcelain-surface}"
  button-secondary:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "48px"
  pill-jade:
    backgroundColor: "{colors.jade-primary}"
    textColor: "{colors.porcelain-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "44px"
  input-field:
    backgroundColor: "{colors.glass-input-light}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
    height: "46px"
  chip-default:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "44px"
  card-product:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.card}"
    padding: "12px 14px"
  customer-bar:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.card}"
    padding: "10px 14px"
  dock-nav:
    backgroundColor: "{colors.porcelain-surface}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.dock}"
    padding: "4px"
---

# Design System: PayTrack POS

## Overview

**Creative North Star: "Sunlit Limestone & Jade Crystal"**

PayTrack POS pairs a calm architectural daylight studio with sculpted frosted crystal tiles, purpose-built for a solo Vietnamese online-shop owner working from her phone and desk. In daytime Light Mode, a mid-tone neutral Sunlit Limestone and Pewter Slate studio canvas gives bright frosted white crystal cards immediate 3D lift so product prices, buyer addresses, and debt balances pop cleanly between Zalo and Messenger chats. In evening Dark Mode, the workspace transitions smoothly (`280ms`) into Lit Brushed Titanium and Deep Graphite so smoked titanium glass tiles and luminous silver bevel rims stay crisp without eye-straining pure `#000000` UI grounds.

Across iPhone Safari PWA (`375px`) and Windows desktop (`1280px+`), tactile craft serves operational speed: opaque porcelain inputs and solid stepper pills sit inside translucent glass panels for zero-ambiguity legibility, Deep Forest Jade concentrates strictly on primary actions and active navigation, and a unified bottom Floating Glass Dock keeps 100% horizontal viewport open for the 12-column accounting ledger.

**Key Characteristics:**
- Strict 60-30-10 material hierarchy: 60% neutral architectural studio canvas, 30% sculpted multi-tier frosted crystal tiles with `135°` specular bevel rims, and <= 10% Deep Forest Jade caustic focal controls and semantic status pills.
- Opaque-inside-translucent ergonomics: crisp solid porcelain (Light) and deep slate (Dark) form fields and stepper controls embedded inside frosted crystal containers.
- Unified Be Vietnam Pro typography across Vietnamese prose and tabular numerals (`tabular-nums`), honoring a `16px` input floor (no iOS Safari auto-zoom) and a `12px` Vietnamese diacritic floor.
- Chat-ready light-paper lock on shareable PNG receipts and VietQR cards (`.print-surface-light`) regardless of active Light/Dark theme.

## Colors

All color tokens are normatively defined as CSS custom properties in `src/app/globals.css` and mirrored in the YAML frontmatter above.

### Primary
- **Deep Forest Jade** (`jade-primary`, hover `jade-hover`, text `jade-text`; dark `dark-jade-primary`, `dark-jade-hover`, `dark-jade-text`): Reserved strictly for primary submit CTAs, active Floating Glass Dock and filter pills, brand mark, selected card bevels, positive profit figures, keyboard focus rings, and text caret.

### Neutral
- **Sunlit Limestone & Pewter Slate** (`limestone-canvas`, `limestone-mid`, `pewter-slate`): 60% Light Mode architectural backdrop behind fixed studio light planes so bright white crystal tiles separate cleanly in 3D relief.
- **Lit Brushed Titanium & Deep Graphite** (`dark-canvas`, `dark-surface`): 60% Dark Mode studio canvas and solid fallback surface; never drops to pure `#000000` on screen.
- **Porcelain & Smoked Crystal Solids** (`porcelain-surface`, `porcelain-subtle`, `slate-border`, `glass-input-light`, `glass-border-light` / `dark-subtle`, `dark-border`, `glass-input-dark`, `glass-border-dark`): 30% frosted crystal fills, specular bevel edges, and opaque-inside-translucent form controls.
- **Charcoal & Silver Ink** (`ink-primary`, `ink-secondary` / `dark-ink-primary`, `dark-ink-secondary`): High-contrast primary and secondary body ink tuned for readability over translucent tiles.
- **Light-Paper Print Isolation** (`print-ink`, `print-secondary`, `print-border`, `print-paid`, `print-paid-bg`, `print-debt-bg`, `print-overdue-bg`): Locked solid white receipt and VietQR palette applied inside `.print-surface-light`.

### Semantic Status
- **Settled / Synced** (`status-paid`, `status-paid-bg`; dark `dark-jade-text`): Paid orders (`Đã trả`), live sync pill (`Đã đồng bộ`), and confirmation banners.
- **Debt / Missing Cost** (`status-debt`, `status-debt-bg`; dark `dark-status-debt`): Partial/unpaid orders (`Trả 1 phần`, `Chưa trả`), buyer debt pills, `Chưa nhập vốn` warnings, and thousand-VND typo guards.
- **Overdue / Destructive** (`status-overdue`, `status-overdue-bg`; dark `dark-status-overdue`, `dark-status-overdue-solid`): Overdue debt, offline banner (`Mất mạng`), order cancellation, sign-out, and validation alerts.

### Named Rules
**The 60-30-10 Crystal Restraint Rule.** Hold 60% neutral architectural studio canvas, 30% neutral frosted crystal tiles and opaque controls, and <= 10% Deep Forest Jade or semantic status accents; never flood inactive surfaces or backgrounds with saturated green.

**The Chat-Ready Light-Paper Lock Rule.** Receipts and VietQR cards always apply `.print-surface-light` (`porcelain-surface` + `print-ink`, `color-scheme: light`, `backdrop-filter: none`) even when Dark Mode is active.

## Typography

**Display & UI Font:** Be Vietnam Pro (fallback `system-ui, -apple-system, sans-serif`)
**Tabular Numeric Style:** Be Vietnam Pro with `font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum" 1` (`.font-mono-tabular`)

**Character:** A single disciplined Vietnamese sans-serif family (`400`–`700`) with clean diacritics and optical balance, switching to fixed-width tabular numerals for prices, costs, profits, quantities, dates, and phone numbers so accounting columns align without jarring typeface switches. Headings use `text-wrap: balance`, body paragraphs use `text-wrap: pretty`, and Dark Mode applies `+0.005em` body letter-spacing for crispness.

### Hierarchy
- **Headline** (`700`, `24px` desktop `headline` / `22px` mobile `headline-mobile`, `1.25`, `-0.015em` to `-0.02em`): Route headers (*Bán hàng*, *Sổ bán*, *Công nợ*, *Thống kê*, *Cài đặt*) and login brand title.
- **Metric** (`700`, `20px` `metric` / `18px` `metric-sm`, `1.3`, `tabular-nums`): Order/cart totals, VietQR amounts, and desktop KPI figures.
- **Title** (`700`, `16px`, `1.35`, `-0.01em`): Shop name in top bar, modal/drawer/section titles, card prices, mobile KPI figures, and the mandatory iOS input floor.
- **Body** (`400`–`600`, `15px` `body` / `14px` `body-sm`, `1.45`–`1.5`): Product names, ledger cells, customer addresses, notes, and primary/secondary button labels.
- **Label** (`600`, `13px`, `1.3`): Filter pills, payment account chips, table headers, and toolbar controls.
- **Caption** (`500`–`600`, `12px`, `1.35`): Strict Vietnamese legibility floor for status badges, debt pills, mobile dock labels, chart ticks, and receipt footnotes.

### Named Rules
**The 16px Input & 12px Diacritic Floor Rule.** Every `input`, `select`, and `textarea` renders at `>= 16px` (`src/app/globals.css`, preventing iOS Safari auto-zoom), and no Vietnamese UI, badge, or receipt copy drops below `12px`.

## Layout

- **Full-width ledger & split order workspace**: Floating translucent top header caps content at `1440px` (`h-[60px]`, `px-2.5 sm:px-5`). `<main id="main-content">` spans full width with no desktop left sidebar and reserves bottom clearance for the Floating Glass Dock (`pb-[118px]` mobile / `pb-[112px]` desktop, plus safe-area inset handling).
- **Responsive breakpoints**: Mobile baseline `375px` (iPhone Safari PWA), `sm` (`640px`), `lg` (`1024px`), `xl` (`1280px` Windows desktop), and `1440px` shell max-width. Product grids scale from `1` column (`375px`) -> `2` columns (`sm`) -> `3` columns (`xl`) alongside a sticky desktop cart panel (`lg:max-h-[calc(100dvh-168px)]`); `/orders` switches from stacked overflow-free mobile cards to a bounded scrollable sticky-header 12-column table at `lg`+.
- **Spacing rhythm**: `4px`–`8px` inside pill tracks, steppers, and badge clusters; `12px` between cards and form groups; `16px`–`24px` between major panels and route sections.

## Elevation & Depth

PayTrack POS uses a **Tactile 3D Crystal Lift** hierarchy built in `@layer components` in `src/app/globals.css`. Fixed studio wallpaper layers (`body::before`, `body::after`) sit behind translucent frosted crystal surfaces edged with `135°` reflective bevel rims (`::before` `mask-composite: exclude`) and multi-layer grounded drop shadows + specular inner highlights.

### Shadow & Glass Tier Vocabulary
- **Tier 1 — Recessed Crystal Well (`.glass-well`)**: Soft inset shadow and bottom rim highlight for nested summary trays, cart rows, chart wells, and segmented control tracks.
- **Tier 2 — Elevated Crystal Card (`.glass-card`)**: Frosted tile (`blur(20px) saturate(190%)`) with `1.25px` bevel rim and grounded lift shadow for product tiles, buyer bar, KPI cards, and mobile order/debt cards; shifts to `.glass-card-selected` Jade bevel rim when active in cart.
- **Tier 3 — Structural Crystal Surface & Panel (`.glass-surface`, `.glass-panel`)**: Deeper frosted clarity (`blur(22px–24px) saturate(200%)`, `1.5px` panel bevel rim) for the sticky top bar, search/filter bars, desktop cart panel, 12-column ledger container, analytics charts, and Settings sections.
- **Tier 4 — Floating Dock & Thick Crystal Modal (`.glass-dock`, `.glass-modal`)**: Highest elevation (`blur(28px–30px) saturate(210%–215%)`) with deep lift shadow for the bottom navigation capsule and stacked dialogs/sheets/drawers (over `.glass-backdrop`).
- **Opaque-Inside-Translucent Controls (`.glass-input`, `.glass-solid-control`)**: Crisp high-opacity porcelain (Light) / charcoal slate (Dark) surfaces inside translucent glass containers for immediate focus and tap clarity.

### Named Rules
**The Semantic Glass Only Rule.** All backdrop blur, specular bevel rims, and multi-layer elevation live strictly inside semantic `.glass-*` utilities in `src/app/globals.css` with `@media (prefers-reduced-transparency: reduce)` solid fallbacks; never scatter raw `backdrop-blur`, `shadow-lg`, `rounded-2xl`, or `rounded-3xl` utility classes in TSX.

## Shapes

- **Capsule controls (`9999px`)**: Primary/secondary action buttons, active Jade pills, search inputs, category/account chips, status badges, stepper pills, and the desktop Floating Glass Dock.
- **Nested controls, alerts & wells (`14px` / `16px` / `18px`)**: Form inputs and icon orbs use `14px` (`control`); offline alerts, chart tooltips, and compact summary trays use `16px` (`inset`); recessed `.glass-well` containers and cart item trays use `18px` (`well`).
- **Cards, surfaces, panels & modals (`22px` / `24px` / `26px` / `28px`)**: Concentric corner progression scales cleanly from `22px` tiles (`card`) -> `24px` bars (`surface`) -> `26px` workspace panels (`panel`) -> `28px` dialogs/sheets (`modal`) -> `30px` mobile outer dock (`dock`).
- **Brand mark**: Geometric Deep Forest Jade ledger emblem shipped in `public/favicon.svg`, `public/favicon.ico`, and `public/icons/*` (`180px`, `192px`, `512px`, `512px maskable`).

## Components

Every interactive component pairs sculpted crystal framing with `>= 44px` touch targets (`48px` primary CTAs), `2px` Jade keyboard `:focus-visible` outlines, tactile `120ms`–`140ms` press feedback, and opacity-preserving `prefers-reduced-motion` alternatives (`120ms` fades without spatial translation).

### Buttons
- **Shape:** Full capsule (`9999px`), `48px` primary height (`44px` floor for compact controls).
- **Primary (`.glass-btn-primary`):** Deep Forest Jade crystal gradient with `135°` bevel rim and emerald caustic glow shadow, white semibold label, subtle `-1.5px` lift on hover, `scale(0.975)` press.
- **Secondary (`.glass-btn-secondary` & `.glass-solid-control`):** Convex frosted or solid porcelain/slate capsule with `ink-primary` text and crisp specular top highlight.
- **Destructive (`.glass-btn-danger`):** Crimson crystal gradient with matching caustic glow for irreversible actions.

### Chips & Status Badges
- **Filter & Payment Account Chips (`src/components/ui/PaymentAccountSelector.tsx`):** `44px` tall capsule pills; inactive uses `.glass-chip`, selected shifts to `.glass-pill-jade` (luminous Jade capsule with `aria-pressed="true"`).
- **Status & Sync Badges (`.glass-badge-paid`, `.glass-badge-debt`, `.glass-badge-overdue`, `.glass-badge-neutral`):** Full capsules (`9999px`, `12px` semibold) mapping `Đã trả` / `Đã đồng bộ`, `Trả 1 phần` / `Chưa trả` / `Đang nối`, `Quá hạn` / `Mất mạng`, and `Đã hủy`.

### Cards / Containers
- **Product Card (`src/components/pos/ProductCatalog.tsx`):** `22px` `.glass-card` with compact title/unit header and single-row tabular price + inline `.glass-solid-control` `-` / editable qty / `+` stepper (or `+` orb when qty is 0); switches to `.glass-card-selected` Jade bevel when in cart.
- **Workspace Panels & Modals (`src/components/ui/ModalDialog.tsx`):** `26px` `.glass-panel` containers for cart, 12-column table, charts, and 4-section Settings; `28px` `.glass-modal` dialogs and bottom sheets with frosted sticky header/footer bars (`.glass-modal-header`, `.glass-modal-footer`), stacked `Escape`, and `Tab` focus trap.

### Inputs / Fields
- **Base Inputs (`.glass-input`):** `14px` radius (`9999px` for search), `>= 44px`–`46px` height, `16px` text, opaque-inside-translucent porcelain/slate fill, shifting to `jade-primary` border with a `3px` `--brand-jade-glow` halo on `:focus` / `:focus-within`.
- **Thousand-VND Field (`src/components/ui/VndKInput.tsx`):** Right-locked `.000đ` pill inside a `tabular-nums` `inputMode="decimal"` field with a 1-tap amber typo-guard banner catching accidental full-VND entries (`50000`, `125.000`, `1.250.000`).

### Navigation
- **Floating Top Bar & Sculpted Floating Glass Dock (`src/components/shell/AppShell.tsx`):** Sticky `60px` `24px`-radius `.glass-surface` header (`BrandMark` orb, shop name, `SyncStatusPill`, `ThemeQuickToggle`) paired with a bottom `.glass-dock` (`30px` mobile / `9999px` desktop) holding 5 tabs (*Bán hàng*, *Công nợ*, *Sổ bán*, *Thống kê*, *Cài đặt*) with `.glass-pill-jade` active state and `aria-current="page"`.

### Signature Component: Exposed Buyer Bar (`CustomerPicker`)
- **`CustomerPicker` (`src/components/pos/CustomerPicker.tsx`):** Sits permanently at the top of `/` as a `22px` `.glass-card` displaying the selected buyer (or *Khách lẻ*), current debt badge in tabular numerals, shipping phone/address preview, and 1-tap search/create modal.

## Do's and Don'ts

### Do:
- **Do** consume CSS custom properties and `.glass-*` material utilities from `src/app/globals.css` so Light (`#BCC3CE`) and Dark (`#161C26`) themes switch cleanly in `280ms` with reduced-transparency and reduced-motion fallbacks.
- **Do** format every VND amount, profit, debt, quantity, phone, and date with `.font-mono-tabular` (`Be Vietnam Pro` + `tabular-nums`) and maintain `>= 44px` touch targets and `>= 16px` form inputs.
- **Do** wrap shareable PNG receipts and VietQR cards in `.print-surface-light`, and pair every route with layout-matched skeletons and `FetchErrorCard` retries.

### Don't:
- **Don't** use banned AI-slop (`indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`) or scatter raw `backdrop-blur`, `shadow-lg`, `rounded-2xl`, or `rounded-3xl` utility classes in TSX.
- **Don't** add a fixed desktop left sidebar that compresses the 12-column sales ledger, or add decorative numbered eyebrows and generic marketing filler copy.
- **Don't** use pure `#000000` on interactive UI dark grounds or define conflicting color/glass tokens outside `src/app/globals.css`.
