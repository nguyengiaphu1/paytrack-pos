# PayTrack POS — Design System (`DESIGN.md`)

> Grounded in the visual artifact of a **Vietnamese retail ledger & crisp thermal/paper receipt** (*sổ bán hàng + hóa đơn bán lẻ rõ nét*). Engineered to be daylight-legible on an iPhone at a shop counter and spacious on a Windows desktop — while explicitly avoiding generic AI-generated UI ("AI slop").

---

## 1. Anti-AI-Slop Rules (Mandatory Checks)

Distilled from community design-engineering repositories ([`impeccable`](https://github.com/pbakaus/impeccable), [`avoid-ai-design`](https://github.com/funboy322/avoid-ai-design), [`taste-skill`](https://github.com/Leonxlnx/taste-skill), [`hallmark`](https://github.com/Nutlope/hallmark), [`anthropics/skills`](https://github.com/anthropics/skills/tree/main/skills/frontend-design)):

| Category | Banned AI Tell | PayTrack POS Standard |
|---|---|---|
| **Color** | Purple/indigo gradients (`C1`), gradient `bg-clip-text` headlines (`C6`), untouched neon emerald (`#10b981`), or unsolicited dark-mode + neon acid green (`SD2`) | Light daylight-first paper ground (`#F8F9FA`) with Deep Forest Jade (`#0E6B4E`) for primary payment/confirm actions and semantic Amber/Crimson strictly for debt status |
| **Typography** | `Inter`, `Roboto`, `Space Grotesk`, or untouched `Geist` (`T1`/`T2`/`T4`); italic serif word-accents (`T3`/`SD5`); tracked all-caps eyebrow spam (`T5`) | **`Be Vietnam Pro`** (native Vietnamese diacritics, clean geometric legibility) + **`JetBrains Mono`** (`font-variant-numeric: tabular-nums`) for all VND amounts, invoice codes, and ledger columns |
| **Surfaces** | `rounded-2xl shadow-lg` floating SaaS cards everywhere (`K2`), cards nested inside cards, reflexive `backdrop-blur` glassmorphism (`K3`) | Crisp `1px solid #DDE2E7` borders, subtle `8px` (`rounded-lg`) or `10px` radii, flat elevation using spacing and hairline dividers instead of heavy drop shadows |
| **Layout** | Generic centered hero + 3 identical icon-in-square cards (`L1`/`L2`), decorative `01/02/03` badges (`SD6`), fake macOS window dots (`SD7`) | Task-first workspace: mobile bottom-tab bar + sticky checkout summary bar; desktop 2-column POS split-pane (`Catalog` left / `Active Bill` right) |
| **Copy & Icons** | Marketing filler ("Siêu cấp", "Đột phá"), AI sparkle icons, arrows welded onto every CTA | Natural Vietnamese retail terms: *"Tạo đơn"*, *"Ghi nợ"*, *"Thu tiền"*, *"Khách quen"*, *"Xuất hóa đơn"*, *"Tạo QR"* |
| **Motion** | Bouncy springs, pulsing status dots on static cards, fade-up stagger on every list row | Instant tactile press feedback (`120ms ease-out`), state transitions only when data/sync state actually changes, full `prefers-reduced-motion` support |

---

## 2. Color Palette (WCAG AA ≥ 4.5:1)

| Role | Token | Hex | Usage |
|---|---|---|---|
| **App Ground** | `--bg-canvas` | `#F8F9FA` | Main page background (cool paper white, zero glare under shop fluorescent light) |
| **Surface / Sheet** | `--bg-surface` | `#FFFFFF` | Product rows, order bill, customer ledger table, printable receipt |
| **Subtle Tint** | `--bg-subtle` | `#EFF2F5` | Table headers, secondary pills, active tab hover |
| **Hairline Border** | `--border-default` | `#DDE2E7` | 1px structural dividers, input borders, ledger grid lines |
| **Primary Ink** | `--text-primary` | `#141A21` | Headings, product titles, VND totals (contrast > 13:1 on white) |
| **Secondary Ink** | `--text-secondary` | `#4B5563` | Sub-labels, timestamps, phone numbers (contrast > 7:1 on white) |
| **Primary Action** | `--brand-jade` | `#0E6B4E` | *"Thanh toán"*, *"Lưu đơn"*, *"Tạo mã QR"*, active navigation state |
| **Primary Hover** | `--brand-jade-hover` | `#0A543D` | Button hover/pressed state |
| **Paid / Synced** | `--status-paid` | `#0F766E` / `#CCFBF1` | *"Đã trả đủ"*, *"Đã đồng bộ"* badge |
| **Unpaid / Debt Due** | `--status-debt` | `#B45309` / `#FEF3C7` | *"Còn nợ"*, *"Trả một phần"*, upcoming reminder badge |
| **Overdue / Error** | `--status-overdue` | `#B91C1C` / `#FEE2E2` | *"Quá hạn thu"*, destructive actions, validation error |

### Dark Mode Ledger Extension (`:root[data-theme="dark"]`) & Print Isolation

- **Default preference**: `'system'` (**Theo thiết bị**), stored per device under `localStorage['paytrack-theme']` (`'system' | 'light' | 'dark'`) and resolved synchronously before hydration in `src/app/layout.tsx` via `THEME_BOOTSTRAP_SCRIPT` (zero reload flash).
- **Smooth theme transitions**: Switching Light ↔ Dark adds `.theme-transitioning` to `<html>` for `320ms` (`280ms cubic-bezier(0.22, 1, 0.36, 1)` on colors/borders only, never slowing regular counter taps; respects `prefers-reduced-motion: reduce`).
- **Dark surface palette (WCAG AA)**:
  - `--bg-canvas`: `#0E1317` | `--bg-surface`: `#161D24` | `--bg-subtle`: `#1F2933` | `--border-default`: `#2A3642`
  - `--text-primary`: `#F1F5F9` | `--text-secondary`: `#9CA3AF`
  - `--brand-jade`: `#15805E` (solid buttons with white text) | `--brand-jade-text`: `#4CC39B` (Jade text/icons on dark surfaces)
  - `--status-paid`: `#4CC39B` / `#12352C` | `--status-debt`: `#FBBF24` / `#33250C` | `--status-overdue`: `#F87171` / `#3A1619`
- **Receipt & VietQR Light-Paper Lock (`.print-surface-light`)**: Printable invoices (`ReceiptTemplate`, `InvoicePreviewModal`) and shareable QR cards (`VietQRModal`) lock light-paper tokens (`#FFFFFF` / `#141A21`) even when the app is in Dark mode.

---

## 3. Typography Scale & Numeric Rules

- **UI & Headings**: `'Be Vietnam Pro', system-ui, sans-serif`
  - Page Title: `20px` (mobile) / `24px` (desktop), `font-weight: 700`, `letter-spacing: -0.015em`
  - Section Header: `16px`, `font-weight: 600`
  - Body / List Row: `15px–16px`, `line-height: 1.5`
  - Form Inputs: **minimum `16px`** (prevents iOS Safari auto-zoom on tap)
  - Helper / Timestamp: `13px`, `#4B5563`
- **Money, Quantities & Invoice IDs**: `'JetBrains Mono', monospace` with `font-variant-numeric: tabular-nums`
  - All VND amounts formatted cleanly with dot thousand separators: `125.000đ`
  - Right-aligned in tables and receipts so decimal/thousand columns stack straight.

---

## 4. Responsive Ergonomics (iPhone & Windows Desktop)

### Mobile (`< 768px`, iPhone at Counter / On the Go)
- **Bottom Navigation Bar** (5 clear tabs, `64px` height + `env(safe-area-inset-bottom)`):
  1. **Bán hàng** (POS)
  2. **Sổ nợ** (Debt Ledger + Reminders)
  3. **Đơn hàng** (Order History + Re-print/QR)
  4. **Thống kê** (Sales & Debt Stats)
  5. **Cài đặt** (Shop Info, Bank/VietQR, Notifications, Account)
- **Minimum Touch Target**: `48px × 48px` on `+ / -` quantity steppers, product quick-add rows, and primary checkout CTA.
- **Cart / Checkout Drawer**: Sticky bottom bar showing `Số món · Tổng tiền` that expands into full checkout sheet (choose customer, paid amount vs remaining debt, instant VietQR or receipt export).

### Desktop / Tablet (`>= 1024px`, Windows Shop Counter)
- **Left Rail Sidebar** (`220px` fixed, crisp 1px right border) with shop status & real-time sync badge (`● Đã đồng bộ Cloud`).
- **POS Split-Pane**:
  - Left (`~60%`): Search bar + category filter pills + fast dense product grid/list.
  - Right (`~40%`, sticky): Active Bill (customer selector, line items, discount, cash/transfer/debt split, instant *"Lưu & Xuất QR"* / *"Lưu & In hóa đơn"*).

---

## 5. Receipt & Dynamic QR Card Craft

- **E-Invoice Export (PDF & PNG)**:
  - Fixed-width thermal-inspired receipt frame (`380px` preview / crisp A5 or 80mm print layout) with clean black-on-white typography, dashed hairline separators, itemized quantities & subtotals, paid vs remaining debt summary, and embedded VietQR block when `remaining_debt > 0`.
- **Dynamic VietQR Share Card**:
  - Self-contained PNG-exportable card showing: Shop Name, Bank Logo/Name, Account Number & Holder, Customer Name, Exact Amount (`tabular-nums`), Transfer Content (`PT DHxxxx`), and high-contrast scannable QR code — ready to send directly via Zalo/Messenger.
