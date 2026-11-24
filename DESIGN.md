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

<!-- impeccable:design-map -->
Name: PayTrack POS
Colors: primary: jade-primary #0E6B4E; neutral: paper-canvas #F5F7F6; semantic: status-paid #0F766E; neutral: dark-canvas #0D1215; semantic: status-debt #9A4306; semantic: status-overdue #B91C1C
Fonts: Be Vietnam Pro (headline, headline-mobile, title, body, body-sm, label, caption); JetBrains Mono (mono)
Spacing: xs 4px, sm 8px, md 12px, lg 16px, xl 24px
Radius: sm 8px, md 10px, lg 12px, dock-item 16px, dock 22px, full 9999px
North Star: "The Calm Home-Shop Ledger"
Rules:
- The 60-30-10 Restraint Rule. Keep 60% calm canvas, 30% flat sheets and semantic glass, and <= 10% Jade or status accents; never flood inactive controls with saturated fills.
- The Chat-Ready Light-Paper Lock Rule. Receipts and VietQR cards always apply `.print-surface-light` (`sheet-surface` + `print-ink`, `color-scheme: light`) even in Dark Mode.
- The 16px Input & 12px Diacritic Floor Rule. Every `input`, `select`, and `textarea` renders at `>= 16px` (`src/app/globals.css`, preventing iOS Safari zoom), and no UI/badge/receipt text drops below `12px`.
- The Semantic Glass Only Rule. Backdrop blur lives strictly on `.glass-dock` and `.glass-surface` in `src/app/globals.css` with reduced-transparency fallbacks; never scatter raw `backdrop-blur` or `shadow-lg` in TSX.
Elevation:
- `.glass-dock`: --glass-dock-bg
- `.glass-surface`: --glass-bg
Don't:
- Don't use banned AI-slop (`indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`) or raw `backdrop-blur`/`shadow-lg`/`rounded-2xl`/`rounded-3xl` in TSX.
- Don't add a fixed desktop left sidebar or decorative numbered eyebrows / generic marketing copy.
- Don't use pure `#000000` dark grounds or define conflicting tokens outside `src/app/globals.css`.
Do:
- Do use CSS custom properties from `src/app/globals.css` (`--bg-canvas`, `--bg-surface`, `--brand-jade`, status tokens) for clean Light/Dark switching.
- Do format VND, profit, debt, and dates with `.font-mono-tabular` and keep `>= 44px` targets and `>= 16px` inputs.
- (+1 more)
Map: src/app/globals.css
Map: public/favicon.svg
Map: public/icons/
Map: src/app/manifest.ts
Map: src/components/ui/PaymentAccountSelector.tsx
Map: src/app/(app)/orders/page.tsx
Map: src/components/pos/ProductCatalog.tsx
Map: src/components/ui/EmptyStateCard.tsx
Full: .impeccable/design-full.md (read a section when you need its detail)
