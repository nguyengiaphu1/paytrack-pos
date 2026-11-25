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

<!-- impeccable:design-map -->
Name: PayTrack POS
Colors: primary: jade-primary #0E6B4E; neutral: limestone-canvas #BCC3CE; semantic: status-paid #085E4E; neutral: porcelain-surface #FFFFFF; neutral: dark-canvas #161C26; semantic: status-debt #9A4306 (+1 more in the sidecar)
Fonts: Be Vietnam Pro (headline, headline-mobile, metric, metric-sm, title, body, body-sm, label, caption, tabular)
Spacing: xs 4px, sm 8px, md 12px, lg 16px, xl 24px
Radius: control 14px, inset 16px, well 18px, card 22px, surface 24px, panel 26px, modal 28px, dock 30px, full 9999px
North Star: "Sunlit Limestone & Jade Crystal"
Rules:
- The 60-30-10 Crystal Restraint Rule. Hold 60% neutral architectural studio canvas, 30% neutral frosted crystal tiles and opaque controls, and <= 10% Deep Forest Jade or semantic status accents; never flood inactive surfaces or backgrounds with saturated green.
- The Chat-Ready Light-Paper Lock Rule. Receipts and VietQR cards always apply `.print-surface-light` (`porcelain-surface` + `print-ink`, `color-scheme: light`, `backdrop-filter: none`) even when Dark Mode is active.
- The 16px Input & 12px Diacritic Floor Rule. Every `input`, `select`, and `textarea` renders at `>= 16px` (`src/app/globals.css`, preventing iOS Safari auto-zoom), and no Vietnamese UI, badge, or receipt copy drops below `12px`.
- (+1 more)
Elevation:
- Tier 1 — Recessed Crystal Well (.glass-well): Soft inset shadow and bottom rim highlight for nested summary trays, cart rows, chart wells, and segmented control tracks.
- (+4 more)
Don't:
- Don't use banned AI-slop (`indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`) or scatter raw `backdrop-blur`, `shadow-lg`, `rounded-2xl`, or `rounded-3xl` utility classes in TSX.
- Don't add a fixed desktop left sidebar that compresses the 12-column sales ledger, or add decorative numbered eyebrows and generic marketing filler copy.
- Don't use pure `#000000` on interactive UI dark grounds or define conflicting color/glass tokens outside `src/app/globals.css`.
Map: src/app/globals.css
Map: public/favicon.svg
Map: public/favicon.ico
Map: src/components/ui/PaymentAccountSelector.tsx
Map: src/components/pos/ProductCatalog.tsx
Map: src/components/ui/ModalDialog.tsx
Map: src/components/ui/VndKInput.tsx
Map: src/components/shell/AppShell.tsx
Full: .impeccable/design-full.md (read a section when you need its detail)
