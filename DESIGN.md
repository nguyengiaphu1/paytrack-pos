# PayTrack POS — Design System (`DESIGN.md`)

> Grounded in a **modern Vietnamese retail ledger & tactile POS instrument**. Engineered for one-handed iPhone counter speed and full-width Windows desktop 12-column ledger clarity using a disciplined **60–30–10** color architecture and an intentional **Floating Glass Dock**.

---

## 1. Anti-AI-Slop Rules & Intentional Glass Policy

| Category | Banned AI Tell | PayTrack POS Standard |
|---|---|---|
| **Color** | Purple/indigo gradients (`indigo-`, `purple-`), gradient `bg-clip-text` headlines, harsh pure `#000000` dark backgrounds | **60–30–10**: 60% calm neutral canvas (`#F5F7F6` Light / `#0D1215` Dark), 30% crisp surfaces & intentional semantic glass (`.glass-dock`, `.glass-surface`), 10% Deep Forest Jade (`#0E6B4E`) + semantic Amber/Crimson strictly for debt status |
| **Typography** | `Inter`, `Roboto`, `Space Grotesk`, untouched `Geist`, tracked all-caps eyebrow spam (`tracking-widest`) | **`Be Vietnam Pro`** (clean native Vietnamese diacritics) + **`JetBrains Mono`** (`font-variant-numeric: tabular-nums`) right-aligned for all VND amounts, invoice codes, and ledger columns |
| **Surfaces** | Cards nested inside cards, decorative glassmorphism scattered across every box, arbitrary `shadow-lg` everywhere | Clean `1px` hairline surfaces (`rounded-[12px]`) + intentional real-time blur **exclusively** on `.glass-dock` (navigation dock, slim top header) and `.glass-surface` (sticky filter/summary bars & floating mobile cart pill), with `@media (prefers-reduced-transparency: reduce)` opaque fallback |
| **Layout** | Cluttered desktop sidebar eating table width, decorative `01/02/03` numbering, generic SaaS hero cards | Unified bottom **Floating Glass Dock** on both `375px` and `1280px` (freeing 100% horizontal viewport for the 12-column Sales Ledger) + exposed POS Customer Bar + inline `-`/`+` product steppers |
| **Copy & Icons** | Marketing filler ("Siêu cấp", "Giải pháp toàn diện"), obvious page subtitles, `Sparkles` icons, `animate-bounce` | Direct Vietnamese retail labels: *"Bán hàng"*, *"Sổ bán"*, *"Công nợ"*, *"Thống kê"*, *"Cài đặt"*, *"Thu tiền"*, *"Lưu"* |
| **Motion** | Bouncy springs, decorative stagger, artificial splash delays | Crisp tactile press (`120ms ease-out`), fast zero-flash Boot Splash fade (`~240ms`), and full `prefers-reduced-motion` respect |

---

## 2. 60–30–10 Color Palette (WCAG AA ≥ 4.5:1)

### Light Mode (60% Soft Daylight Paper — 30% Crisp Sheet/Glass — 10% Jade/Semantic)
| Role | Token | Value | Usage |
|---|---|---|---|
| **60% Canvas** | `--bg-canvas` | `#F5F7F6` | Page ground (gentle jade-tinted off-white, zero glare) |
| **30% Surface** | `--bg-surface` | `#FFFFFF` | Product cards, 12-column table, forms, drawers |
| **30% Subtle** | `--bg-subtle` | `#EDF1F0` | Table headers, secondary pills, summary sub-blocks |
| **30% Glass** | `--glass-bg` / `--glass-dock-bg` | `rgba(255,255,255,0.78)` / `0.84` | `.glass-surface` & `.glass-dock` with `blur(18px) saturate(160%)` |
| **Hairline Border** | `--border-default` / `--glass-border` | `#D9E0DE` / `rgba(14,26,22,0.10)` | Structural dividers, input frames, dock perimeter |
| **Primary Ink** | `--text-primary` | `#121917` | Headings, product titles, VND totals (contrast > 14:1) |
| **Secondary Ink** | `--text-secondary` | `#4B5854` | Labels, metadata, timestamps (contrast > 7:1) |
| **10% Primary Jade** | `--brand-jade` / `--brand-jade-hover` | `#0E6B4E` / `#0A543D` | Primary CTAs, active dock indicator, profit values |
| **Paid / Synced** | `--status-paid` / `--status-paid-bg` | `#0F766E` / `#D1FAE5` | Paid status, live sync dot |
| **Debt / Partial** | `--status-debt` / `--status-debt-bg` | `#B45309` / `#FEF3C7` | Unpaid/partial balance, missing-cost alert |
| **Overdue / Error** | `--status-overdue` / `--status-overdue-bg` | `#B91C1C` / `#FEE2E2` | Overdue debt, cancel/logout actions, validation errors |

### Dark Mode (`:root[data-theme="dark"]` — Eye-Comfort Deep Slate)
- **60% Canvas**: `--bg-canvas: #0D1215` (never pure `#000000`)
- **30% Surfaces**: `--bg-surface: #151C21` | `--bg-subtle: #1D272E` | `--border-default: #293640` | `--glass-bg: rgba(21, 28, 33, 0.78)` | `--glass-dock-bg: rgba(18, 25, 30, 0.86)` | `--glass-border: rgba(241, 245, 249, 0.12)`
- **Ink**: `--text-primary: #F1F5F4` | `--text-secondary: #98A6A2`
- **10% Accents**: `--brand-jade: #15805E` (solid white-text CTA) | `--brand-jade-text: #4CC39B` | `--status-debt: #FBBF24` / `#33250C` | `--status-overdue: #F87171` / `#3A1619`
- **Receipt & VietQR Light-Paper Lock (`.print-surface-light`)**: Receipts and shareable VietQR cards ALWAYS lock `#FFFFFF` background & `#141A21` ink even in Dark Mode.
- **Zero-Flash Bootstrap**: Synchronous `<head>` script (`THEME_BOOTSTRAP_SCRIPT`) sets `data-theme`, `colorScheme`, and `<meta name="theme-color">` (`#F5F7F6` / `#0D1215`) before first paint.

---

## 3. Typography & Numeric Precision

- **UI**: `'Be Vietnam Pro', system-ui, sans-serif`
  - Page Title: `20px` (mobile) / `24px` (desktop), `font-weight: 700`, `tracking-[-0.015em]`
  - Body / Rows: `14px–15px`
  - Form Controls: **minimum `16px`** (prevents iOS Safari auto-zoom)
- **Money, Quantities & Dates**: `'JetBrains Mono', monospace` with `font-variant-numeric: tabular-nums`
  - Thousand-VND (`VndKInput`) inputs display a locked `.000đ` suffix, `inputMode="decimal"`, and a 1-tap 1000x typo guard (`50000` -> suggest `50`).

---

## 4. Floating Glass Dock & Responsive Ergonomics

- **Unified Bottom Floating Glass Dock (`.glass-dock`)**:
  - **Mobile (`375px`)**: Centered floating pill at `bottom: calc(10px + env(safe-area-inset-bottom))`, 5 tabs (`Bán hàng`, `Công nợ`, `Sổ bán`, `Thống kê`, `Cài đặt`) with `>= 48px` tap targets. When cart has items, a matching floating cart pill sits cleanly above the dock with zero overlap.
  - **Desktop (`1280px`)**: Centered floating dock at bottom (`bottom: 16px`), unlocking 100% viewport width for the 12-column Sales Ledger and POS split-pane. A slim frosted top header carries shop name, live sync dot, and theme quick-toggle.
  - **Safe Bottom Cushion**: `<main>` reserves generous bottom padding (`pb-[108px]` mobile / `pb-[100px]` desktop; extra clearance on POS when cart pill is active) so the dock never covers content or buttons.
- **PWA Branding & Boot Splash**:
  - Geometric Jade mark (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png` 180px, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`).
  - `AppBootSplash` matches Light/Dark ground from frame 0 and exits smoothly (`~240ms`, instant under `prefers-reduced-motion`).
