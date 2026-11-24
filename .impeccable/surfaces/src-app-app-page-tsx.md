---
version: 1
slug: "src-app-app-page-tsx"
primary_target: "src/app/(app)/page.tsx"
related_targets: ["src/app/(app)/orders/page.tsx","src/app/(app)/debts/page.tsx","src/app/(app)/stats/page.tsx","src/app/(app)/settings/page.tsx","src/components/shell/AppShell.tsx"]
---

# Surface Brief — PayTrack POS Home Online-Shop Workspace

## Scope & Visitor Mode
- **Mode**: **Operate** (task-completion speed, scanability, zero wasted chrome, instant feedback, earned familiarity).
- **Routes covered**: Quick order entry (`/`), 12-field sales ledger (`/orders`), customer debt ledger (`/debts`), analytics (`/stats`), settings (`/settings`), and shared `AppShell`.

## Audience, Job & Primary Actions
- **User in task**: Solo online-shop owner ("Mẹ") working primarily from home — logging buyer orders one-handed on iPhone Safari PWA (`375px`) while messaging customers on Zalo/Messenger, and reconciling the full-width 12-column ledger, profits, shipping/bank accounts, and debts on Windows desktop (`1280px+`).
- **Primary actions**: Select or add buyer (with phone/address), tap products or adjust inline `-`/`+` steppers, enter thousand-VND (`K`) amounts, record payment across 9 accounts, inspect/edit ledger entries, collect FIFO debts, and share VietQR / PNG receipts via chat.

## Layout & Interaction Commitments
- **Navigation topology**: Slim translucent top bar (shop name, live sync status pill, mobile theme toggle) paired with a unified bottom Floating Glass Dock across mobile and desktop so 100% horizontal viewport remains open for the 12-column ledger and order split pane.
- **Order-entry speed**: Exposed buyer bar (`CustomerPicker`) at top of `/`, inline `-`/`+` product steppers when an item is in cart, floating mobile cart pill stacked cleanly above the dock.
- **Operational states**: Layout-matched skeletons for loading, actionable empty states, inline error/retry cards (`FetchErrorCard`), offline alert banner, missing-cost warnings (`Chưa nhập vốn`), and 1-tap `VndKInput` 1000x/dot-thousands typo guard.

## Constraints
- Preserve all Vietnamese online-selling/ledger labels and operational density; never trade scanability or data visibility for decorative chrome.
- Keep shareable PNG receipts and VietQR cards locked to high-contrast light paper regardless of active Light/Dark theme.
- All Operate surfaces remain code-led.
