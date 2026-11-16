# Phase 0 Research: PayTrack POS

**Feature**: `specs/001-paytrack-pos/spec.md`  
**Date**: 2026-11-16

---

## 1. Full-Stack Web Framework & Deployment

- **Decision**: **Next.js 16 (App Router, TypeScript, React 19)** + **Tailwind CSS v4** deployed on **Vercel**.
- **Rationale**: Single codebase for responsive UI, PWA assets (`manifest.ts`, `public/sw.js`), Auth callback route, and secure server Route Handlers (`/api/push/*`, `/api/cron/reminders`) using `SUPABASE_SERVICE_ROLE_KEY` and `VAPID_PRIVATE_KEY` without deploying a separate backend server. Vercel automatically builds Preview URLs for every Git branch.
- **Alternatives Considered**: Vite + React SPA + separate Express/Edge backend (rejected: splits auth/push APIs across two deployments and loses Next.js Route Handlers + `next/font/google` optimization).

---

## 2. Cloud Database, Auth & Real-Time Sync

- **Decision**: **Supabase** (PostgreSQL + Row Level Security + Supabase Auth + Supabase Realtime `postgres_changes`).
- **Rationale**: Relational PostgreSQL guarantees ACID integrity for orders, line-item price/cost snapshots, and partial debt repayments (FIFO allocation via atomic PL/pgSQL RPCs). Supabase Realtime pushes row changes across Mom's iPhone and Windows browsers in under 2 seconds without manual refreshes. Supabase Auth supports both 1-tap Google OAuth and Email/Password with persistent cookie sessions via `@supabase/ssr`.
- **Alternatives Considered**: Firebase Firestore (rejected: lacks SQL transactions across multi-document debt allocations and relational aggregation for daily/monthly profit & debt-aging reports).

---

## 3. Cross-Platform Push Notifications & Scheduling (iPhone PWA + Windows)

- **Decision**: Standard **Web Push API (VAPID)** with `web-push` Node library in Next.js Route Handlers + custom `public/sw.js` Service Worker, scheduled by **Supabase `pg_cron` + `pg_net`** calling `/api/cron/reminders` every 5 minutes (authenticated via `CRON_SECRET`).
- **Rationale**:
  - **Vercel Hobby Cron Limitation**: Vercel's free Hobby plan caps cron jobs to once per day and rejects sub-daily schedules at deploy time, which cannot deliver custom per-customer reminder times (e.g., `14:30`). Running `pg_cron` + `pg_net` inside Supabase Free Tier triggers Vercel every 5 minutes at `$0` cost and also keeps the Supabase free project active.
  - **iOS 16.4+ Safari PWA Constraints**: Mobile Safari hides `PushManager` and `Notification` until launched in `standalone` mode via *Share → Add to Home Screen*. The UI must detect `display-mode: standalone` and render a guided Vietnamese setup banner when opened in regular Safari, never assume `window.Notification` exists, require every `push` event to call `showNotification()`, delete `410`/`404` dead endpoints on send, and serve `/sw.js` with `Cache-Control: no-cache`.
- **Alternatives Considered**: Vercel Pro Cron ($20/month — unnecessary cost), Firebase Cloud Messaging (adds a second cloud vendor alongside Supabase), or OneSignal (unnecessary third-party dependency & limits).

---

## 4. Dynamic VietQR Generation (Napas 247 / EMVCo)

- **Decision**: Pure TypeScript **EMVCo / Napas 247 VietQR payload builder** with CRC16-CCITT checksum + local **`qrcode`** library (SVG/Canvas), bundled with standard Vietnamese bank BIN codes.
- **Rationale**: Deterministic, instant (`< 5ms`), works even with unstable shop Wi-Fi, embeds exact integer VND amounts and sanitized ASCII transfer memos (`PT DH1024` / `PT NO ANH MINH`), and has zero dependency on external QR image APIs (`img.vietqr.io`) that could rate-limit or go down.
- **Alternatives Considered**: Fetching `https://img.vietqr.io/image/...` URLs (rejected: requires internet round-trip per QR render and creates a third-party runtime dependency).

---

## 5. E-Invoice Export (PNG Image + PDF / Thermal 80mm & A5)

- **Decision**: **`html-to-image`** (`toPng`, `pixelRatio: 2`) for crisp Zalo/Messenger PNG sharing (`navigator.share` on iOS / file download on Windows) + **native CSS `@media print`** (`@page` dynamically sized for `A5` or `80mm` thermal) for PDF export and direct counter printing.
- **Rationale**: Guarantees 100% accurate Vietnamese diacritics (`Be Vietnam Pro` + `JetBrains Mono` embedded in DOM/print) without the font-embedding bloat and text-wrapping bugs of `jspdf` or heavy headless Chromium PDF servers. Supports instant live toggling of *Cumulative Debt* (`Nợ cũ + Đơn này − Đã trả = Tổng nợ còn lại`) and *VietQR block* before exporting.
- **Alternatives Considered**: `jspdf` (rejected: requires bundling large custom TTF font subsets for Vietnamese), server-side Puppeteer PDF (rejected: exceeds Vercel serverless bundle limits and adds latency).

---

## 6. Visual Analytics & Anti-AI-Slop UI Architecture

- **Decision**: **Recharts** (or clean responsive SVG primitives) styled strictly via `DESIGN.md` tokens (`#0E6B4E` Jade, `#D97706` Amber, `#B91C1C` Crimson, `#DDE2E7` 1px gridlines, `JetBrains Mono` tabular tooltips) + zero-dependency anti-slop discipline.
- **Rationale**: Delivers responsive daily Revenue vs Collected Cash bar charts, Payment Method breakdown, and Debt Aging buckets cleanly on `375px` and `1280px` viewports without generic purple gradients, glowing shadows, or cluttered SaaS dashboards.
- **Alternatives Considered**: Heavy dashboard kits (`tremor` / untouched `shadcn` dashboard blocks — rejected due to generic AI-slop aesthetic tells).
