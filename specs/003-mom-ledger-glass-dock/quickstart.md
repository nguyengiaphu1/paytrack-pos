# Quickstart & Validation Guide: 003-mom-ledger-glass-dock

## 1. Automated Verification Gate
Run from repo root:
```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## 2. Database Migration (Production Supabase `mezuxaqvbtjbbtugsohm`)
Before merging `feat/003-mom-ledger-glass-dock` to `main`, apply:
- `supabase/migrations/0005_mom_ledger_fields.sql`

Verify post-migration:
- Existing orders have `purchased_at = created_at`, `total_cost >= 0`, `customer_phone_snapshot` backfilled, and `paid_at` populated for `paid` orders.
- All 4 RPCs (`create_order_with_items`, `record_debt_payment`, `update_order_ledger_fields`, `get_analytics_summary`) exist with single non-ambiguous signatures.

## 3. Manual E2E Walkthrough (`375px` Mobile & `1280px` Desktop)
1. **POS (`375px`)**: Confirm Customer Bar is visible at top of POS before adding items; pick/add customer with separated Address & Phone; tap product card -> `- 1 +` stepper appears; open Quick Item, enter price `35` & cost `22,5`, verify preview `35.000đ` / `22.500đ`; test typing `50000` -> verify 1-tap `Đổi thành 50` warning; checkout with `Thuỳ Trang` or `Khác: Momo` and custom purchase date.
2. **Sổ bán (`Orders`, `1280px` & `375px`)**: Confirm all 12 columns display cleanly with dynamic STT, right-aligned `tabular-nums`, summary bar (Giá bán / Giá vốn / Lãi excluding cancelled), filter by 9 Payment Accounts, manual edit of `purchased_at`/`paid_at`/`payment_account`/cost price, direct "Thu tiền" on unpaid order, and CSV export opening cleanly in Excel.
3. **Floating Glass Dock, Theme, Print Isolation & PWA**: Switch Light/Dark/System on both viewports; confirm zero horizontal overflow, dock never overlaps CTAs, `.print-surface-light` preserves white receipt & VietQR in Dark Mode, Settings fits cleanly in 4 sections, and PWA icons + zero-flash Boot Splash load cleanly.
