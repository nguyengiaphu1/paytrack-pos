# PRODUCT.md — PayTrack POS

## Product Identity
- **Name**: PayTrack POS
- **Category**: Solo Vietnamese retail POS, 12-field sales ledger, FIFO customer debt tracker, dynamic VietQR & e-invoice PWA
- **Primary User**: Solo shop owner ("Mẹ") operating one-handed on an iPhone Safari PWA at the counter or on-the-go, and reconciling the 12-column sales ledger & profit on a Windows desktop browser.
- **Operating Environment**: Bright retail counter daylight (Light mode default) and evening ledger review (Dark mode), intermittent mobile 4G/Wi-Fi.

## Surface Mode
- **Primary Mode**: **Operate** (task-completion speed, scanability, zero wasted chrome, instant feedback, earned familiarity).

## Core Workflows
1. **Fast POS Sale (`/`)**: Exposed customer bar at top -> tap product or adjust inline `-`/`+` stepper -> enter prices in thousand-VND (`K` / `.000 đ`) -> checkout with 9 canonical payment accounts (`Thanh`, `Phú`, `Trang`, `Trang Lê`, `Thuỳ Trang`, `Thuỷ`, `Kiều Thương`, `Vận chuyển`, `Khác: ...`) -> instant VietQR / PNG receipt.
2. **12-Field Sales Ledger (`/orders`)**: Full-width 12-column table on desktop (`1280px`) and overflow-free mobile cards (`375px`) with live filtered totals (Giá bán / Giá vốn / Lãi), 9-account filter, manual edit of purchase/paid dates & item costs, inline debt settlement, and Excel-ready UTF-8 BOM CSV export.
3. **Customer Debt Ledger (`/debts`)**: KPI strip, due/overdue focus, FIFO debt collection with 9 payment accounts, Web Push reminders, and VietQR share cards.
4. **Analytics (`/stats`)**: Revenue, cost, real profit, cash collected, and debt aging filtered by date range and payment account.
5. **Minimal Settings (`/settings`)**: 4 focused sections (Shop & VietQR, Theme, Debt Notifications with collapsible diagnostics, Account).

## Tone & Copy Standard
- Direct, concise Vietnamese retail language. Zero marketing fluff, zero obvious helper paragraphs, zero decorative section numbering.
