# Quickstart Validation Guide: Feature `004-pos-ux-csv-glass`

**Branch**: `feat/004-pos-ux-csv-glass`

## 1. Automated Verification Gate

Run from repository root (`/home/antigravity/nguyengiaphu1/paytrack-pos`):

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Expected outcomes:
- TypeScript compiles with 0 errors.
- ESLint passes with 0 errors/warnings.
- All Vitest unit suites pass, including new CSV import parser tests against `ThuChi.csv` fixture assertions, updated `ux-guards.test.ts` (neutral 60–30–10 glassmorphism, `#ECEFED` grid / `#0C100E` dot-grid, `"Thêm món"` without `"Món lẻ"`, modal slide-up & directional tab transitions), and updated `audit-a11y.test.ts` (`CustomerPicker` search input without `data-autofocus`, `stats/page.tsx` hierarchy without standalone Payment Breakdown / Debt Aging boxes).
- `next build` succeeds cleanly across all routes including `POST /api/import/csv`.

## 2. End-to-End Manual Validation Scenarios

Start dev server (`npm run dev`) and verify on both Mobile (`375px`) and Desktop (`1280px+`):

1. **POS Toolbar (`/` — Bán hàng)**:
   - Confirm `"Món lẻ"` and `"Thêm SP"` do not appear anywhere in the catalog bar or mobile `"Quản lý"` tray.
   - Tap **"Thêm món"** next to the search input → Product creation modal slides up smoothly; saving adds the product directly to the catalog.
2. **Mobile Customer Picker (`/` → Chọn khách)**:
   - Tap **"Chọn khách"** on a touch/mobile viewport → Modal slides up cleanly showing recent buyers and customer list immediately without popping up the virtual keyboard.
   - Tap inside the search box manually → Keyboard opens; search input and top matches remain visible and tappable.
3. **Directional Tab Transitions & Modal Slide-Up**:
   - Click/tap tabs left-to-right (`Bán hàng` → `Công nợ` → `Sổ bán` → `Thống kê` → `Cài đặt`) → Each view slides smoothly from right to left.
   - Click/tap tabs right-to-left (`Cài đặt` → `Bán hàng`) → Each view slides smoothly from left to right.
   - Verify desktop sticky `CartPanel` (`/`) and sticky 12-col ledger header (`/orders`) still stick properly while scrolling after tab transition completes.
   - Open any modal (`Thêm món`, `Chọn khách`, `Chốt đơn`, `Nhập CSV`, `Chi tiết đơn`) → Modal slides upward smoothly.
4. **Redesigned Analytics (`/stats` — Thống kê)**:
   - Confirm top KPI section shows 2 prominent Hero cards (`Lãi` + inline `Giá vốn` & margin; `Giá bán` + inline `Số đơn`) over 2 compact secondary cards (`Thực thu` + inline cash-vs-transfer mix bar; `Tổng nợ` + inline `Nợ mới`).
   - Confirm standalone `Phương thức thanh toán` and `Tuổi nợ` boxes are removed; only the main `Doanh thu & Thực thu` chart, `Nợ nhiều nhất`, and `Món bán chạy` render below.
5. **Automated CSV Shop Import (`/orders` and `/settings`)**:
   - Click **"Nhập CSV"** → Upload `ThuChi.csv`.
   - Verify preview shows: `57` valid rows (`45` grouped orders, `40` customers, `46` products), Revenue `48.320.000 đ`, Cost `37.234.000 đ`, Profit `11.086.000 đ`, Paid `320.000 đ`, Debt `48.000.000 đ`, `1` skipped incomplete row (line 55 `2 túi mm mint`), and bottom summary row cleanly ignored.
   - Confirm import → Verify POS products, Sổ bán orders, Công nợ customer balances, and Thống kê update immediately without reloading.
   - Re-upload the exact same `ThuChi.csv` → Verify preview detects `45` duplicate orders and imports `0` duplicates.
6. **Neutral 60–30–10 Glassmorphism & Geometric Backdrop (Light & Dark)**:
   - Light Mode: Warm Gray (`#ECEFED`) background with crisp dark forest-gray grid lines (`7%`), pure neutral white frosted glass tiles (zero green-tinted glass), solid Deep Forest Jade primary CTAs (`Chốt đơn`, `Thu nợ`, `Lưu`).
   - Dark Mode: Matte Obsidian (`#0C100E`) background with crisp white dot-grid (`8%`), neutral dark frosted glass tiles (zero green-tinted glass), solid Jade primary CTAs.
   - Open Receipt preview & VietQR modal in Dark Mode → Verify `.print-surface-light` remains crisp solid white paper.
