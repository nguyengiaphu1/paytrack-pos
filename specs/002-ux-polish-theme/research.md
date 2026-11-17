# Research: UX Polish, Loading Skeletons, 3-Layer Welcome & Smooth Theme Switching

**Feature**: `002-ux-polish-theme` | **Date**: 2026-11-17

## 1. Zero-Flash Theme Initialization & Smooth Light ↔ Dark Crossfade

- **Decision**: Use an inline pre-hydration script in root `src/app/layout.tsx` (`<head>`) paired with a `ThemeProvider` context and a transient `.theme-transitioning` CSS class applied for `320ms` only during live theme switches or OS `prefers-color-scheme` changes.
- **Rationale**:
  - Reading `localStorage.getItem('paytrack-theme')` (`'light' | 'dark' | 'system'`, default `'system'`) and applying `data-theme="dark" | "light"` + `colorScheme` + `<meta name="theme-color">` before React hydrates prevents the white flash on dark-mode reload (`FR-003`).
  - Applying `transition: background-color 280ms cubic-bezier(0.22, 1, 0.36, 1), color 280ms ..., border-color 280ms ..., fill 280ms ..., stroke 280ms ...` **only** while `.theme-transitioning` is active ensures buttery-smooth Light ↔ Dark transitions (`200–350ms` per `SC-001`) without slowing down tactile button hover/press feedback (`120ms`) or causing unwanted animations on initial load.
  - Using CSS `.theme-transitioning` rather than `document.startViewTransition` works uniformly across iOS Safari PWA, Windows Chrome, and Edge without snapshot flicker on sticky bars or Recharts SVGs, and automatically respects `@media (prefers-reduced-motion: reduce)`.
- **Alternatives considered**:
  - `next-themes` library: Adds external dependency and still requires custom transient transition rules to animate smoothly without breaking `120ms` button responsiveness; a small self-contained `ThemeProvider` (~110 LOC) integrates directly with our CSS variable system and `theme-color` meta tag.
  - Global permanent `* { transition: background-color ... }`: Causes subtle lag during scrolling, drags down mobile touch responsiveness, and triggers transitions during initial hydration.

## 2. Dark Mode Palette Design Aligned with `DESIGN.md` (WCAG AA)

- **Decision**: Define `[data-theme="dark"]` CSS custom properties in `src/app/globals.css` using a neutral-slate ledger ground (`#0E1317` canvas, `#161D24` surface, `#1F2933` subtle, `#2A3642` border), high-legibility light ink (`#F1F5F9` primary, `#9CA3AF` secondary), WCAG AA-verified Jade action button (`#15805E` with `#FFFFFF` text >= 4.9:1; `#11694D` hover), and accessible semantic status tokens (`--status-paid: #4CC39B` on `#12352C`, `--status-debt: #FBBF24` on `#33250C`, `--status-overdue: #F87171` on `#3A1619`). Isolate printable receipts and VietQR cards inside `.print-surface-light`.
- **Rationale**:
  - Preserves PayTrack POS's grounded retail-ledger identity (no neon acid green `#10b981`, no purple/indigo gradients, no `backdrop-blur`, no heavy shadows).
  - Keeps text contrast well above WCAG AA (`>= 4.5:1`) on both light and dark surfaces, including Recharts axes/tooltips/gridlines (replacing hardcoded `#DDE2E7` / `#4B5563` / `#FCA5A5` with CSS variables).
  - `.print-surface-light` forces light-paper CSS variables (`#FFFFFF` / `#141A21`) inside `ReceiptTemplate` and the VietQR export card so PNG exports, printouts, and banking QR scanners remain 100% crisp even when the user operates the app in Dark mode.
- **Alternatives considered**:
  - Pure `#000000` OLED black: Harsh contrast halation for reading dense ledger numbers at night.
  - Inverting the whole page with CSS filters: Breaks QR code scannability, distorts bank colors, and causes flickering during theme transitions.

## 3. Per-Account Onboarding State Persistence (`WelcomeOnboardingModal`)

- **Decision**: Persist the one-time 3-step onboarding completion flag (`welcome_v2_seen: true`) in Supabase Auth `user_metadata` via `supabase.auth.updateUser({ data: { welcome_v2_seen: true } })`, mirrored with a `localStorage` cache (`paytrack-onboarding-done:<userId>`) for instant dismissal without waiting for server re-fetch.
- **Rationale**:
  - `(app)/layout.tsx` already calls `supabase.auth.getUser()`, so `user.user_metadata?.welcome_v2_seen` is available immediately on SSR with **zero extra database queries** and **zero risk of breaking production if a SQL migration hasn't been manually applied yet**.
  - Syncs naturally across iPhone and Windows for the same account (fulfilling the clarified requirement that every shop account sees the 3-step setup guide once after this update and remembers dismissal across devices).
  - Daily greeting strip collapse state (`paytrack-daily-greeting:<userId>:<YYYY-MM-DD>`) stays in `localStorage`/`sessionStorage` per device/day so each new day/session greets the shop owner cleanly without getting in the way after 1-tap collapse.
- **Alternatives considered**:
  - Adding a `welcome_completed` column to `shop_profiles`: Clean in SQL, but requires coordinating a production DB migration before any code deploy/preview works; `user_metadata` achieves the exact same per-account cross-device persistence safely and immediately.

## 4. Context-Matched Loading Splash & 5-Tab Skeleton Architecture

- **Decision**: Provide a branded `BrandLoadingScreen` for root route/auth initialization (`src/app/loading.tsx`) and dedicated layout-matched skeleton components (`PosWorkspaceSkeleton`, `DebtsPageSkeleton`, `OrdersPageSkeleton`, `StatsPageSkeleton`, `SettingsPageSkeleton`) rendered both in `(app)/loading.tsx` (generic shell-safe fallback) and inside each client page while `PosDataProvider` fetches initial data, plus an explicit offline/error retry card if data fails to load.
- **Rationale**:
  - Because `(app)` tabs share client state in `PosDataProvider`, initial tab visits show page-level `loading` states (`!productsLoaded`, `!customersLoaded`, etc.) rather than Next.js `loading.tsx`. Matching each skeleton directly to its page layout eliminates jarring layout shifts and reassuringly communicates what is loading.
  - Adding a network/fetch error retry state in `PosDataProvider` ensures users never remain stuck on an infinite skeleton when offline (`Edge Cases`).
- **Alternatives considered**:
  - Single generic spinner or single 3-box skeleton across all tabs: Feels broken/slow on complex layouts like POS split-pane or Stats charts.

## 5. Purposeful Micro-Animations & Low-Tech Ergonomics

- **Decision**: Add lightweight pure-CSS animation primitives in `src/app/globals.css` (`press-tactile`, `animate-modal-in`, `animate-sheet-up`, `animate-drawer-in`, `animate-badge-pop`, `animate-fade-in`, `skeleton-shimmer`) paired with `@media (prefers-reduced-motion: reduce)` fallbacks, and conduct a systematic low-tech UX copy/layout pass across `/login`, `/`, `/debts`, `/orders`, `/stats`, `/settings`, and `AppShell`.
- **Rationale**:
  - Pure CSS animations add ~0 KB JS overhead, never delay fast 3-item checkouts (`SC-005`), and respect OS reduced-motion settings automatically.
  - Replacing terse icons/jargon with labeled buttons, inline helper hints, transparent payment/change/debt previews, password visibility toggle, and guided empty states directly achieves `SC-003` (90%+ unassisted first-time completion by low-tech users).
- **Alternatives considered**:
  - Adding `framer-motion`: Unnecessary ~30–40 KB bundle weight for simple modal/drawer/press transitions and harder to coordinate with `prefers-reduced-motion` + Tailwind v4 CSS variables.
