# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary user**: Solo Vietnamese online-shop owner ("Mẹ") managing orders, deliveries, and customer debts mainly from home — entering orders quickly one-handed on an iPhone Safari PWA (`375px`) while chatting with buyers (Zalo/Messenger/phone), and reconciling the full 12-column sales ledger, real profit, and bank transfers on a Windows desktop browser (Chrome/Edge, `1280px+`).

## Product Purpose

PayTrack POS replaces paper notebooks and manual spreadsheets with a focused online-shop order entry tool, 12-field sales ledger, FIFO customer debt tracker, dynamic VietQR payment card, and shareable e-invoice generator (`PNG` for Zalo/Messenger chat, `A5` and `80mm` print/PDF). Success means logging an incoming online order in seconds without typing trailing zeros, keeping iPhone and Windows automatically synced in real time, tracking which bank/family account received each transfer, always knowing true profit and remaining debt, and following up on overdue balances on time.

## Positioning

Unlike bloated SaaS POS suites built for multi-staff physical retail chains, PayTrack POS is purpose-built for a home-based Vietnamese online seller: pairing fast mobile order entry (exposed customer bar with address/phone, inline `-`/`+` product steppers, thousand-VND `K` entry with 1000x and dot-thousands typo guards) directly with an accountant-grade 12-column sales ledger (buyer address/phone snapshots, cost/profit, 9 personal/shipping payment accounts, manual purchase/paid date edits, Excel-ready UTF-8 BOM CSV) and FIFO debt tracking with free multi-device Web Push reminders.

## Operating Context

- **Environment & timing**: Used primarily at home throughout the day (daylight Light mode default) and during evening order/profit reconciliation (eye-comfort Dark mode).
- **Devices & connectivity**: iPhone Safari PWA (`375px`, one-handed touch while messaging buyers) and Windows Chrome/Edge (`1280px+`, full-width 12-column table review) synced in real time over home Wi-Fi or mobile 4G.
- **iOS Web Push prerequisite**: On iPhone (iOS 16.4+), Web Push requires adding PayTrack POS to the Home Screen via Safari Share -> Add to Home Screen and launching from the installed PWA icon. On Windows (Chrome/Edge), Web Push works directly in-browser or as an installed PWA.
- **Daily workflows**:
  1. **Quick Order Entry (`/`)**: Select or create buyer (with phone & shipping address) -> tap products or adjust inline `-`/`+` steppers -> enter prices in thousand-VND (`.000đ`) -> record payment across 9 accounts -> generate dynamic VietQR or shareable PNG receipt to send in chat.
  2. **12-Field Sales Ledger (`/orders`)**: Filter by search, status, 9 payment accounts, or VN date range -> review live totals (Giá bán / Giá vốn / Lãi / Còn nợ) -> edit manual dates, buyer address/phone snapshots, or item cost prices -> settle debt inline or export UTF-8 BOM CSV.
  3. **Customer Debt Ledger (`/debts`)**: Review due/overdue balances -> record FIFO oldest-first debt payments across 9 accounts -> schedule Web Push reminders or copy Zalo/VietQR payment prompts.
  4. **Analytics (`/stats`)**: Track revenue, cost, real profit, cash collected, and debt aging by date range and payment account.
  5. **Settings (`/settings`)**: Configure shop profile & VietQR bank details, Web Push & daily digest reminders, theme preference, and account sign-out.

## Capabilities and Constraints

- **Data integrity**: All monetary values are stored as integer VND (`bigint`) in Supabase Postgres 17 with strict per-user RLS (`user_id = auth.uid()`). Thousand-VND (`K` / `.000đ`) entry converts strictly at UI boundaries.
- **Real-time cloud sync**: Orders, items, products, customers, debt payments, and reminders sync live across iPhone and Windows via Supabase Realtime without manual reloads.
- **Canonical 9 payment accounts**: `Thanh`, `Phú`, `Trang`, `Trang Lê`, `Thuỳ Trang`, `Thuỷ`, `Kiều Thương`, `Vận chuyển`, `Khác` (with free-text note shown as `Khác: ...`).
- **Debt & ledger invariants**: Walk-in/anonymous orders cannot remain unpaid; debt payments allocate FIFO oldest-first unless tied to a specific order; cancelled orders are excluded from revenue, cost, and profit totals.
- **Auth scope**: Supabase email/password authentication is active; Google OAuth is disabled in the current deployment.
- **Out of scope / undecided**: Multi-staff RBAC, physical store cash-drawer/barcode hardware, and multi-branch warehouse inventory are not part of this solo home online-shop product.
- **Copy standard**: Direct, concise Vietnamese selling/ledger language (*Bán hàng*, *Sổ bán*, *Công nợ*, *Thống kê*, *Cài đặt*, *Thu tiền*, *Lưu*). No marketing filler, obvious helper paragraphs, or decorative section numbering.

## Brand Commitments

- **Name & terminology**: PayTrack POS, using native Vietnamese retail/online-ledger copy across all screens.
- **Visual marks**: Geometric Jade ledger mark shipped in `public/favicon.svg`, `public/favicon.ico`, and `public/icons/*`.
- **Receipt & VietQR readability**: Shareable PNG receipts and VietQR cards sent over Zalo/Messenger (and A5/80mm prints) must always preserve crisp light-paper legibility regardless of Dark Mode.

## Evidence on Hand

- Live production web app at `https://paytrack-pos.vercel.app` backed by Supabase Postgres 17 (`0001`–`0005` migrations + `pg_cron` Web Push dispatch).
- Production PWA icon set (`public/favicon.svg`, `public/favicon.ico`, `public/icons/apple-touch-icon.png`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png`).
- Automated unit test suites under `tests/unit/` (9 suites, 59 tests) covering VND/K math, ledger calculations, VietQR payloads, reminder cron, theme, and UX guards.
- **Absences (do not fabricate)**: No external marketing testimonials, customer logos, case studies, pricing tiers, or press quotes exist (internal solo online-shop operations tool).

## Product Principles

1. **Zero-friction order logging**: Minimize taps while switching between chat apps and PayTrack; keep the buyer bar visible and accept thousand-VND shorthand with automatic typo protection.
2. **Every VND reconciles**: Sales, costs, real profits, 9 payment accounts, and FIFO debt balances stay consistent across order entry, ledger, analytics, and CSV export.
3. **Full-width clarity on desktop, thumb comfort on phone**: Never waste horizontal space needed by the 12-column ledger, and never ship cramped touch targets on mobile.
4. **Honest operational feedback**: Show real sync/offline state, missing-cost warnings, and clear inline validation without hiding errors or fabricating status.

## Accessibility & Inclusion

- WCAG AA contrast (`>= 4.5:1`) in both Light and Dark modes, with light-paper lock on shareable receipts and VietQR cards.
- Minimum `16px` font size on all `input`, `select`, and `textarea` controls to prevent iOS Safari auto-zoom.
- Minimum `44px`–`48px` interactive touch targets across mobile and desktop controls.
- Full support for `prefers-reduced-motion` and `prefers-reduced-transparency`.
