# Implementation Plan: PayTrack POS

**Branch**: `feat/spec-kit-foundation` (planned implementation on `feat/001-paytrack-pos-mvp`) | **Date**: 2026-11-16 | **Spec**: [`spec.md`](./spec.md)  
**Input**: Feature specification from `/specs/001-paytrack-pos/spec.md`

---

## Summary

Build **PayTrack POS**, a mobile-first + desktop-ready Vietnamese retail POS and customer debt ledger web app (PWA) for Mom. The app uses **Next.js (App Router, TypeScript, Tailwind CSS v4)** hosted on **Vercel** and backed by **Supabase** (PostgreSQL + RLS + Google/Email Auth + Realtime `postgres_changes` + `pg_cron`/`pg_net`). Key modules include fast POS checkout with atomic SQL transactions, FIFO customer debt tracking with Windows & iOS PWA Web Push reminders, client-side dynamic VietQR (EMVCo/Napas 247) generation & Zalo copy templates, customizable E-Invoices (`PNG` via `html-to-image` and `A5`/`80mm` PDF/print via `@media print`), and visual sales/profit/debt-aging analytics—strictly adhering to the Anti-AI-Slop design system in [`DESIGN.md`](../../DESIGN.md).

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24 LTS, React 19, Next.js 16 (App Router)  
**Primary Dependencies**: `@supabase/supabase-js`, `@supabase/ssr`, `qrcode`, `html-to-image`, `web-push`, `recharts`, `lucide-react` (selective functional icons only), `tailwindcss` v4  
**Storage**: Supabase PostgreSQL (`shop_profiles`, `products`, `customers`, `orders`, `order_items`, `debt_payments`, `debt_reminders`, `push_subscriptions`) with Row Level Security (RLS) and `supabase_realtime` publication  
**Testing**: Vitest (unit tests for VietQR EMVCo CRC16 builder, VND currency/FIFO helpers, accent-stripped Vietnamese search) + Playwright / manual responsive & multi-device verification (`375px` & `1280px`) + `tsc --noEmit` & `next build`  
**Target Platform**: Responsive Web App & Installable PWA — iPhone iOS 16.4+ Safari (Home Screen PWA) and Windows 10/11 (Chrome / Edge), deployed on Vercel  
**Project Type**: Full-stack Next.js Web Application + PWA (single repository)  
**Performance Goals**: Checkout flow `< 20s` (SC-001), Realtime cross-device sync `<= 2s` (SC-002), client-side VietQR generation `< 10ms`  
**Constraints**: All VND values stored as integer `bigint`; zero local-only unpersisted state; Vercel Hobby cron cap bypassed cleanly via Supabase `pg_cron` + `pg_net`; iOS Web Push restricted to `standalone` Home Screen PWA  
**Scale/Scope**: Solo shop owner across 2–5 concurrent devices (`< 10k` products, `< 50k` orders), 5 primary navigation workspaces (`Bán hàng`, `Sổ nợ`, `Đơn hàng`, `Thống kê`, `Cài đặt`)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Pre-Design | Post-Design | Notes |
|---|---|---|---|
| **I. Mom-First Simplicity & Vietnamese Retail Clarity** | PASS | PASS | Plain Vietnamese retail copy, `48px` mobile tap targets, `16px+` inputs, 5 clear tabs |
| **II. Cloud-First Truth & Real-Time Sync** | PASS | PASS | All entities persisted in Supabase Postgres with RLS (`user_id = auth.uid()`) + `postgres_changes` sync |
| **III. Spec-Driven Development & Branch Discipline** | PASS | PASS | `constitution.md` → `spec.md` → `clarify` (5/5) → `plan.md`; implementation planned on `feat/001-paytrack-pos-mvp` |
| **IV. Anti-AI-Slop Visual Craft** | PASS | PASS | Enforces `DESIGN.md` (`#F8F9FA`, `#0E6B4E`, `Be Vietnam Pro` + `JetBrains Mono`, zero purple gradients or SaaS boilerplate) |
| **V. Financial Integrity & Safe Defaults** | PASS | PASS | Integer `bigint` VND, atomic RPCs (`create_order_with_items`, `record_debt_payment`, `cancel_order`), exact VietQR payloads |

No Constitution violations exist; Complexity Tracking table is not required.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-paytrack-pos/
├── spec.md                    # Clarified feature specification
├── plan.md                    # This file (/speckit-plan output)
├── research.md                # Phase 0 architecture & platform decisions
├── data-model.md              # Phase 1 PostgreSQL schema, RLS & state transitions
├── quickstart.md              # Phase 1 setup & E2E validation scenarios
├── contracts/
│   └── api-and-rpc.md         # Supabase RPCs, Next.js API routes, SW & VietQR contracts
└── tasks.md                   # Phase 2 output (/speckit-tasks - not created here)
```

### Source Code (repository root)

```text
paytrack-pos/
├── public/
│   ├── sw.js                          # Web Push listener & notificationclick deep-linking
│   └── icons/                         # PWA 192x192, 512x512, apple-touch-icon.png
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql    # Tables, indexes, RLS policies, realtime publication
│       ├── 0002_rpc_functions.sql     # create_order_with_items, record_debt_payment, cancel_order, get_analytics_summary
│       └── 0003_reminder_cron.sql     # pg_cron + pg_net schedule calling /api/cron/reminders
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Be Vietnam Pro + JetBrains Mono fonts, PWA metadata, safe-area setup
│   │   ├── globals.css                # DESIGN.md CSS variables + @media print rules (A5 & 80mm)
│   │   ├── manifest.ts                # Next.js PWA manifest
│   │   ├── login/page.tsx             # Email/Password + forgot password + 1-tap Google OAuth
│   │   ├── auth/callback/route.ts     # Supabase OAuth/recovery session exchange
│   │   ├── (app)/
│   │   │   ├── layout.tsx             # Responsive shell (mobile bottom bar + desktop rail + sync status)
│   │   │   ├── page.tsx               # POS Bán hàng workspace (split-pane desktop / cart drawer mobile)
│   │   │   ├── debts/page.tsx         # Sổ nợ, lịch sử trả nợ, lịch nhắc & tạo QR thu nợ
│   │   │   ├── orders/page.tsx        # Lịch sử đơn hàng, hủy đơn, xem/xuất hóa đơn tùy biến
│   │   │   ├── stats/page.tsx         # Thống kê KPIs, biểu đồ doanh thu/thực thu/tiền lời & tuổi nợ
│   │   │   └── settings/page.tsx      # Thông tin shop, ngân hàng VietQR, mặc định hóa đơn, bật Push iOS/Windows
│   │   └── api/
│   │       ├── push/
│   │       │   ├── subscribe/route.ts # Save/delete Web Push subscription
│   │       │   └── test/route.ts      # Send test push to user's registered devices
│   │       └── cron/
│   │           └── reminders/route.ts # Morning digest + custom scheduled reminder push sender
│   ├── components/
│   │   ├── pos/                       # ProductGrid, QuickItemModal, CartSheet, CheckoutModal
│   │   ├── debts/                     # DebtCustomerList, CollectDebtModal, ReminderModal
│   │   ├── invoice/                   # InvoicePreviewModal (toggles + A5/80mm + PNG/PDF export)
│   │   ├── qr/                        # VietQRModal (total/per-order/custom amount + PNG share + Zalo copy)
│   │   ├── stats/                     # RevenueCashChart, PaymentBreakdownChart, DebtAgingCard
│   │   └── pwa/                       # PushNotificationSetup (iOS Safari Add-to-Home-Screen detector & guide)
│   ├── hooks/
│   │   └── useRealtimeSync.ts         # Supabase Realtime postgres_changes subscription + online indicator
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client
│   │   │   ├── server.ts              # Server Component / Route Handler Supabase client
│   │   │   └── admin.ts               # Service role client (cron & push cleanup only)
│   │   ├── vietqr.ts                  # EMVCo / Napas 247 dynamic QR payload + CRC16 + bank BIN catalog
│   │   ├── vietnamese.ts              # VND formatter, accent-stripper, Zalo debt message template
│   │   └── push.ts                    # Server web-push helper with 410/404 auto-cleanup
│   └── middleware.ts                  # Auth session refresh & protected route redirect
├── next.config.ts                     # Cache-Control: no-cache for /sw.js
├── package.json
└── vitest.config.ts
```

**Structure Decision**: Single Next.js App Router repository (`src/` + `supabase/migrations/`). Keeping UI, PWA Service Worker, Auth middleware, and secure Push/Cron Route Handlers in one Next.js project gives single-click Vercel deployment and atomic Git branch Preview URLs.

---

## Complexity Tracking

> No Constitution violations; section intentionally empty.
