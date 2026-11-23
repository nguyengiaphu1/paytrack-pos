# PayTrack POS Constitution

## Core Principles

### I. Mom-First Simplicity & Vietnamese Retail Clarity
Every workflow MUST optimize for speed, legibility, and low cognitive load for a solo shop owner operating on a phone (iPhone) or shop computer (Windows).
- Primary POS actions (pick customer, add/step quantity, enter K-unit price, record payment/debt, generate VietQR, export receipt) MUST be reachable within 1–2 taps/clicks from the main workspace.
- All user-facing copy MUST be short, direct, natural Vietnamese used in daily retail (e.g., "Bán hàng", "Sổ bán", "Công nợ", "Thu tiền", "Lưu")—never corporate jargon, redundant explanations, or AI marketing filler.
- Interactive controls MUST meet at least `44px × 44px` (`48px` preferred on primary mobile actions), with `16px+` input font sizes to prevent iOS Safari auto-zoom.

### II. Cloud-First Truth & Real-Time Sync (NON-NEGOTIABLE)
All business records (products, customers, 12-field sales orders, line items with cost snapshots, debt payments with payment accounts, shop settings, push subscriptions) MUST persist in Supabase PostgreSQL as the single source of truth.
- Refreshing the browser, closing the PWA, or switching between iPhone and Windows MUST NEVER lose saved transactions.
- Active POS, Debt Ledger, and Sales Ledger views MUST subscribe to Supabase Realtime changes so updates sync across devices without manual page refreshes.
- All database tables MUST enforce Row Level Security (RLS) scoped to the authenticated shop owner (`auth.uid()`).

### III. Spec-Driven Development & Branch Discipline
All features and changes MUST follow the GitHub Spec Kit lifecycle (`/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`).
- Direct commits to `main` are prohibited for feature or bugfix work. Every new feature, fix, or refactor MUST happen on a dedicated branch (`feat/<number>-<short-name>`, `fix/<short-name>`, `chore/<short-name>`) and merge via Pull Request.
- Implementation MUST NOT begin until the feature's `spec.md` and `plan.md` are documented.

### IV. Anti-AI-Slop Visual Craft & Intentional 60–30–10 Glass System (NON-NEGOTIABLE)
The UI MUST follow `DESIGN.md` and avoid AI-generated design clichés while applying an intentional **60–30–10** hierarchy with a purpose-built **Floating Glass Dock**:
- **Banned AI tells**: Purple/indigo gradients (`indigo-`, `purple-`), gradient headline text (`bg-clip-text`), untouched shadcn/ui `Inter`/`Geist` typography, cards nested inside cards, unrestrained decorative glassmorphism outside semantic utilities, decorative `01/02/03` section numbering, all-caps tracked eyebrow spam (`tracking-widest`), `animate-bounce`, and `Sparkles` icons.
- **Required craft**:
  - **60% Canvas**: Soft daylight-first paper ground (`#F5F7F6`) and eye-comfort charcoal Dark ground (`#0D1215`, never pure `#000`).
  - **30% Surfaces & Intentional Glass**: Crisp `1px` hairline surfaces (`#FFFFFF` / `#151C21`) paired with semantic `.glass-dock` and `.glass-surface` (`backdrop-filter: blur(...) saturate(...)` with `prefers-reduced-transparency` opaque fallback).
  - **10% Semantic Brand Accents**: Deep Forest Jade (`#0E6B4E` Light / `#15805E` + `#4CC39B` Dark) for primary actions & profit, Amber (`#B45309` / `#FBBF24`) strictly for debt/partial status, Crimson (`#B91C1C` / `#F87171`) strictly for overdue/destructive states.
  - **Typography & Isolation**: `Be Vietnam Pro` + `JetBrains Mono` (`tabular-nums` right-aligned for VND columns), WCAG AA ≥ 4.5:1 contrast, `.print-surface-light` lock on receipts & VietQR, and full `prefers-reduced-motion` compliance.

### V. Financial Integrity & Safe Defaults
Money calculations, profit figures, debt balances, and VietQR amounts MUST be deterministic and auditable.
- Store VND amounts as exact integer `bigint` values in PostgreSQL (never float drift). UI thousand-VND (`K` / `.000 đ`) entry translates strictly at input boundaries with 1000x typo detection.
- Cancelled orders MUST NEVER be counted in revenue, cost, or profit totals.
- Outstanding debt MUST be maintained atomically via database RPCs (`FOR UPDATE` locking) so partial/FIFO repayments and `paid_at` timestamps remain consistent.
- Dynamic VietQR payloads MUST embed the exact integer VND balance and unique reference memo.

## Technology Stack & Platform Constraints

- **Frontend / Full-Stack Framework**: Next.js (App Router, TypeScript) deployed on **Vercel** (`sin1`).
- **Backend / Database / Auth / Realtime**: **Supabase** (PostgreSQL 17 + RLS + Auth + Realtime + `pg_cron`/`pg_net`).
- **PWA & Cross-Platform Push Notifications**: Web App Manifest, crisp multi-platform icons (`favicon.svg`, `favicon.ico`, `180/192/512/maskable`), zero-flash Boot Splash, Service Worker (`sw.js`), and VAPID Web Push (iOS 16.4+ PWA + Windows Chrome/Edge).
- **E-Invoice, QR & Export**: Client-side dynamic VietQR (EMVCo / Napas 247), PNG/PDF receipt (A5 / 80mm), and UTF-8 BOM 12-column CSV export for Excel.

## Development Workflow & Quality Gates

1. **Specification Gate**: Every feature starts with `specs/<NNN>-<slug>/spec.md` defining testable user stories and edge cases.
2. **Design Gate**: Every UI change is checked against `DESIGN.md` and `impeccable` craft checks (`distill`, `clarify`, `audit`, `adapt`, `harden`, `polish`).
3. **Verification Gate**: `npm run typecheck && npm run lint && npm test && npm run build` MUST pass before committing/merging.
4. **Security Gate**: Never commit `.env*` secrets, `SUPABASE_SERVICE_ROLE_KEY`, private VAPID keys, or `CRON_SECRET`.

## Governance

This Constitution supersedes ad-hoc prompting habits. Any amendment requires updating `.specify/memory/constitution.md`, bumping the version according to semantic versioning, and committing the change on a dedicated branch.

**Version**: 1.1.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-23
