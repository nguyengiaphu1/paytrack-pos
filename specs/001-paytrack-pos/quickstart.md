# Quickstart & Validation Guide: PayTrack POS

**Feature**: `specs/001-paytrack-pos/spec.md`  
**References**: [`data-model.md`](./data-model.md) · [`contracts/api-and-rpc.md`](./contracts/api-and-rpc.md) · [`../../DESIGN.md`](../../DESIGN.md)

---

## 1. Prerequisites & Environment Setup

1. **Supabase Project**:
   - Create a Supabase project (Singapore region `ap-southeast-1` recommended for Vietnam latency).
   - Enable **Email/Password** and **Google OAuth** under *Authentication → Providers*, adding `https://<your-vercel-domain>/auth/callback` and `http://localhost:3000/auth/callback` to Redirect URLs.
   - Enable `pg_cron` and `pg_net` extensions under *Database → Extensions*.
   - Apply the SQL migrations (`supabase/migrations/*`) covering tables, RLS, Realtime publication, atomic RPCs, and the 5-minute reminder cron trigger.
2. **Generate VAPID Keys** (for iPhone & Windows Web Push):
   ```bash
   npx web-push generate-vapid-keys
   ```
3. **Environment Variables** (`.env.local` locally and Vercel Project Settings):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (`mailto:you@example.com`)
   - `CRON_SECRET` (random 32+ char secret shared with `pg_cron` header)

---

## 2. Local Development & Quality Verification

```bash
npm install
npm run dev          # Starts Next.js on http://localhost:3000
npm run lint         # ESLint check
npm run typecheck    # TypeScript strict check
npm run build        # Production build verification
```

---

## 3. End-to-End Validation Scenarios

### Scenario A: Cloud Persistence & Real-Time Sync (`375px` + `1280px`)
1. Open the app in a desktop browser (`1280×800`) and a mobile viewport (`375×812`), logged into the same account.
2. Add 2 products (1 with optional `cost_price`, 1 without) and 1 customer (`Cô Lan`).
3. Create an order on mobile (`350.000đ`, paid `100.000đ`, remaining `250.000đ`, due today).
4. **Expected**: Desktop view updates within `<= 2s` without refresh; refreshing both browsers preserves all products, orders, and `250.000đ` debt.

### Scenario B: Customizable E-Invoice (PNG + A5 / 80mm Print)
1. Create a second order for `Cô Lan` (`120.000đ`, paid `0đ`).
2. Open Invoice Preview → toggle **"Hiện công nợ lũy kế"** ON (`Nợ cũ 250.000đ + Đơn này 120.000đ = Tổng nợ 370.000đ`) then toggle OFF (shows only current order total).
3. Switch between `A5` and `80mm`, download **PNG** (verify crisp Vietnamese diacritics), and test **In / PDF** (`window.print()` hides navigation chrome).

### Scenario C: Dynamic VietQR & FIFO Debt Collection
1. Configure bank BIN + account number in Settings.
2. Open `Cô Lan` in **Sổ nợ** → click **Tạo QR** → verify default amount is `370.000đ`, switch to single-order QR (`250.000đ`), edit custom amount (`200.000đ`), and copy Zalo reminder text.
3. Confirm repayment of `300.000đ` → verify `record_debt_payment` marks the older `250.000đ` order `paid` first (FIFO) and reduces the newer `120.000đ` order to `partial` (`70.000đ` remaining).

### Scenario D: Cross-Platform Push Notifications (Windows & iPhone PWA)
1. On Windows Chrome/Edge: open **Cài đặt → Thông báo**, allow permission, click **Gửi thử thông báo** → Windows toast arrives; clicking it opens `/debts`.
2. On iPhone (iOS 16.4+): open in Safari → verify app prompts *"Share → Add to Home Screen"* when not standalone; launch from Home Screen icon → allow notifications → click **Gửi thử thông báo** → iOS lock-screen/banner notification arrives.

### Scenario E: Visual Analytics & Anti-AI-Slop Check
1. Open **Thống kê** → verify KPIs (`Doanh thu`, `Thực thu`, `Lợi nhuận ước tính`, `Công nợ`), daily Revenue vs Collected chart, payment method breakdown, debt aging, and top products/debtors match Scenarios A–C.
2. Verify against [`../../DESIGN.md`](../../DESIGN.md): zero horizontal overflow at `375px`, `Be Vietnam Pro` + `JetBrains Mono` loaded, no banned purple gradients or generic AI template chrome.
