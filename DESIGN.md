---
name: PayTrack POS
description: Neutral Glassmorphism (60-30-10) over gradient-free multi-color solid-blur ambient halos, powered by a global 60fps GSAP choreography engine and Floating Glass Dock.
colors:
  jade-primary: "#0E6B4E"
  jade-hover: "#0A563F"
  jade-text: "#09583F"
  limestone-canvas: "#ECEFED"
  halo-light-1: "#68D8B4"
  halo-light-2: "#F9BC8C"
  halo-light-3: "#79C9F7"
  halo-light-4: "#F3DA8A"
  halo-light-5: "#66CFC7"
  halo-light-6: "#F5A6A2"
  porcelain-surface: "#FFFFFF"
  porcelain-subtle: "rgba(15, 23, 20, 0.055)"
  slate-border: "rgba(15, 23, 20, 0.13)"
  ink-primary: "#0B111A"
  ink-secondary: "#2B3642"
  status-paid: "#075444"
  status-paid-bg: "rgba(232, 250, 243, 0.94)"
  status-debt: "#8A3B04"
  status-debt-bg: "rgba(254, 243, 212, 0.94)"
  status-overdue: "#9F1616"
  status-overdue-bg: "rgba(254, 232, 232, 0.94)"
  chart-transfer: "#0284C7"
  glass-input-light: "rgba(255, 255, 255, 0.96)"
  glass-border-light: "rgba(255, 255, 255, 0.92)"
  dark-canvas: "#0C100E"
  halo-dark-1: "#0F8C68"
  halo-dark-2: "#0C74A8"
  halo-dark-3: "#C46532"
  halo-dark-4: "#0E9B8C"
  halo-dark-5: "#B3882B"
  halo-dark-6: "#1E6F78"
  dark-surface: "#161B19"
  dark-subtle: "rgba(255, 255, 255, 0.07)"
  dark-border: "rgba(255, 255, 255, 0.14)"
  dark-ink-primary: "#F4F6F8"
  dark-ink-secondary: "#B4BECE"
  dark-jade-primary: "#127A59"
  dark-jade-hover: "#0E6347"
  dark-jade-text: "#62E6BA"
  dark-status-debt: "#FCD34D"
  dark-status-overdue: "#FCA5A5"
  dark-status-overdue-solid: "#DC2626"
  dark-chart-transfer: "#38BDF8"
  glass-input-dark: "rgba(12, 16, 14, 0.92)"
  glass-border-dark: "rgba(255, 255, 255, 0.18)"
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
Colors: primary: jade-primary #0E6B4E; neutral: limestone-canvas #ECEFED (+ 6 solid-blur multi-color halo orbs); neutral: porcelain-surface #FFFFFF; neutral: dark-canvas #0C100E (+ 6 solid-blur jewel halo orbs); semantic: status-paid #075444; semantic: status-debt #8A3B04; semantic: status-overdue #9F1616
Fonts: Be Vietnam Pro (headline, headline-mobile, metric, metric-sm, title, body, body-sm, label, caption, tabular)
Spacing: xs 4px, sm 8px, md 12px, lg 16px, xl 24px
Radius: control 14px, inset 16px, well 18px, card 22px, surface 24px, panel 26px, modal 28px, dock 30px, full 9999px
North Star: "Multi-Color Solid-Blur Ambient Halo Glassmorphism + Global GSAP Motion (60–30–10)"
Rules:
- The 60–30–10 Neutral Glassmorphism + Gradient-Free Halo Rule. Hold 60% solid canvas (`#ECEFED` Light / `#0C100E` Dark) paired with `AmbientHaloBackdrop` (6 harmonious solid-color `filter: blur(...)` orbs, ZERO CSS gradients), 30% pure neutral frosted glassmorphism tiles (`blur(12–28px) saturate(170–190%)`, zero green-tinted glass), and <= 10% solid opaque Deep Forest Jade reserved strictly for important primary CTA buttons and semantic status indicators.
- The Chat-Ready Light-Paper Lock Rule. Receipts and VietQR cards always apply `.print-surface-light` (`porcelain-surface` + `print-ink`, `color-scheme: light`, `backdrop-filter: none`) even when Dark Mode is active and are excluded from GSAP transforms.
- The 16px Input & 12px Diacritic Floor Rule. Every `input`, `select`, and `textarea` renders at `>= 16px` (`src/app/globals.css`, preventing iOS Safari auto-zoom), and no Vietnamese UI, badge, or receipt copy drops below `12px`.
- The Global GSAP Purposeful Motion & 60–30–10 Theme Studio Rule. `GsapMotionProvider` (`gsap` + `@gsap/react`) orchestrates delegated hover/press/focus micro-physics across cards, buttons, chips, icons, inputs, badges, and `[role="alert"]`, while `AppShell` drives the sliding `.glass-dock-pill` + directional tab transitions + card stagger, `ModalDialog` uses pure-CSS slide-up/fade with pointer-safe backdrop & iOS `overscroll-contain` scroll lock, `AmbientHaloBackdrop` drifts ambiently (pausing when hidden), and `ThemeProvider` + `HexColorWheel` enable 60–30–10 preset switching and live WCAG-AA-clamped circular Hex customization, with sticky-safe `clearProps` and `prefers-reduced-motion` degradation.
Elevation:
- Tier 1 — Recessed Neutral Well (.glass-well): Soft inset hairline well for nested summary trays, cart rows, chart wells, and segmented control tracks.
- Tier 2 — Frosted Neutral Card (.glass-card): Translucent neutral glass (`blur(12px)`) with specular bevel rim and layout/style containment.
- Tier 3 — Structural Glass Surface & Panel (.glass-surface, .glass-panel): Translucent neutral glass (`blur(18px)`) for top bar, search/filter trays, ledger tables, analytics hero cards, and settings panels.
- Tier 4 — Floating Dock & Modal (.glass-dock, .glass-modal): High-frost neutral glass (`blur(24–26px)`) for navigation dock and slide-up dialogs.
Don't:
- Don't use green-tinted glass on cards, chips, icon orbs, or active filter tabs; keep tiles strictly neutral glassmorphism and reserve solid Jade strictly for important buttons (~10%).
- Don't use banned AI-slop (`indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`) or scatter raw `backdrop-blur`, `shadow-lg`, `rounded-2xl`, or `rounded-3xl` utility classes in TSX.
- Don't auto-focus mobile search inputs inside `"Chọn khách"` modals where the virtual keyboard obscures the customer list.
Map: src/app/globals.css
Map: public/favicon.svg
Map: public/favicon.ico
Map: src/components/ui/PaymentAccountSelector.tsx
Map: src/components/pos/ProductCatalog.tsx
Map: src/components/ui/ModalDialog.tsx
Map: src/components/ui/VndKInput.tsx
Map: src/components/shell/AppShell.tsx
Full: .impeccable/design-full.md (read a section when you need its detail)
