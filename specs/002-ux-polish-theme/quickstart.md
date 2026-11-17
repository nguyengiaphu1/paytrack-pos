# Quickstart & Validation Guide: 002-ux-polish-theme

**Feature**: `002-ux-polish-theme` | **Branch**: `feat/002-ux-polish-theme`

## Prerequisites

1. Node.js 24 LTS & npm dependencies installed (`npm install` already present).
2. `.env.local` configured with existing Supabase & VAPID public/private environment variables (no new env vars or DB migrations required).
3. Automated verification gate:
   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```

## End-to-End Validation Scenarios

### 1. Smooth Light / Dark / Follow-Device Theme (`US1`)
1. Clear `localStorage['paytrack-theme']` and reload `/login` or `/`: confirm theme defaults to OS setting (`Theo thiết bị`).
2. Switch between **Sáng** → **Tối** → **Theo thiết bị** via both:
   - Quick theme toggle in Mobile Top Bar / Desktop Sidebar / `/login`
   - 3-option selector in **Cài đặt** (`/settings`)
3. Verify colors crossfade smoothly (`~280ms`) across backgrounds, cards, borders, text, and Stats charts without abrupt snapping.
4. Set Dark mode and hard-reload (`F5` / reopen PWA): verify zero white flash on initial paint.
5. In Dark mode, open **Xem hóa đơn** (`InvoicePreviewModal`) and **Tạo mã QR** (`VietQRModal`): verify the receipt sheet and QR export card remain crisp black-on-white for scanning/printing.

### 2. Branded Loading & Layout-Matched Skeletons (`US2`)
1. Throttle network in DevTools (e.g., Slow 3G) and navigate across `/`, `/debts`, `/orders`, `/stats`, and `/settings`.
2. Verify each route renders its dedicated skeleton matching the real layout before transitioning cleanly to data.
3. Disconnect network before data finishes loading: verify skeletons transition to a clear Vietnamese error message with a working **"Thử lại"** button instead of hanging forever.

### 3. Low-Tech Clarity & Micro-Animations (`US3`, `US5`)
1. Verify at `375px` mobile and `1280px` desktop:
   - Zero horizontal scrollbar on all 5 tabs and `/login`.
   - All inputs remain `>= 16px` (no iOS zoom).
   - Every empty state (0 products, 0 orders, 0 debtors) shows plain Vietnamese instructions and a clear action button.
   - Checkout (`CheckoutModal`) and Debt Collection (`CollectDebtModal`) clearly preview paid amount, change/remaining debt, and lock buttons while saving.
2. Add/adjust cart items and open/close `CheckoutModal`, Mobile Cart Sheet, and `DebtCustomerDrawer`: confirm crisp tactile feedback and smooth entrance animations.
3. Enable **Reduce Motion** in OS/DevTools: confirm motion animations collapse gracefully without breaking layout or transitions.

### 4. 3-Layer Welcome Experience (`US4`)
1. Open `/login` while signed out: confirm integrated welcome highlights appear alongside Login / Create Account tabs with a working password visibility toggle.
2. Log in with an account where `welcome_v2_seen` is unset: confirm the 3-step `WelcomeOnboardingModal` appears once, shows pre-checked steps for any existing shop name/bank/products, and stays dismissed across reloads/devices after clicking **"Bỏ qua, vào bán hàng ngay"** or **"Hoàn tất & Bắt đầu bán"**.
3. Reopen the guide from **Cài đặt** → **"Xem lại hướng dẫn bắt đầu"**.
4. On `/`, confirm `DailyWelcomeBanner` greets the shop owner by time of day and collapses in 1 tap for the rest of the Vietnam calendar day.
