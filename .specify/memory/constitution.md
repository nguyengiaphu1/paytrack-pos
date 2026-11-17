# PayTrack POS Constitution

## Core Principles

### I. Mom-First Simplicity & Vietnamese Retail Clarity
Every workflow MUST optimize for speed, legibility, and low cognitive load for a solo shop owner operating on a phone (iPhone) or shop computer (Windows).
- Primary POS actions (add item, record payment, record customer debt, generate VietQR, export receipt) MUST be reachable within 1–2 taps/clicks from the main workspace.
- All user-facing copy MUST be plain, natural Vietnamese used in daily retail (e.g., "Ghi nợ", "Thu tiền", "Xuất hóa đơn", "Khách quen")—never corporate jargon or AI marketing filler.
- Interactive controls MUST meet at least `44px × 44px` (`48px` preferred on mobile POS buttons), with `16px+` input font sizes to prevent iOS Safari auto-zoom.

### II. Cloud-First Truth & Real-Time Sync (NON-NEGOTIABLE)
All business records (products, customers, orders, line items, partial debt payments, shop settings, push subscriptions) MUST persist in Supabase PostgreSQL as the single source of truth.
- Refreshing the browser, closing the PWA, or switching between iPhone and Windows MUST NEVER lose saved transactions.
- Active POS, Debt Ledger, and Order History views MUST subscribe to Supabase Realtime changes so updates sync across devices without manual page refreshes.
- All database tables MUST enforce Row Level Security (RLS) scoped to the authenticated shop owner (`auth.uid()`).

### III. Spec-Driven Development & Branch Discipline
All features and changes MUST follow the GitHub Spec Kit lifecycle (`/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`).
- Direct commits to `main` are prohibited for feature or bugfix work. Every new feature, fix, or refactor MUST happen on a dedicated branch (e.g., `feat/<number>-<short-name>`, `fix/<short-name>`, `chore/<short-name>`) and merge via Pull Request.
- Implementation MUST NOT begin until the feature's `spec.md` and `plan.md` are reviewed and approved.

### IV. Anti-AI-Slop Visual Craft (NON-NEGOTIABLE)
The UI MUST follow `DESIGN.md` and avoid both first-order and second-order AI-generated design clichés (distilled from `impeccable`, `avoid-ai-design`, `taste-skill`, `hallmark`, and Anthropic `frontend-design`):
- **Banned defaults**: Purple/indigo gradients (`C1`), gradient headline text (`C6`), untouched shadcn/ui `Inter`/`Geist` typography (`T1`/`T4`), excessive `rounded-2xl shadow-lg` cards (`K2`), cards nested inside cards, reflexive `backdrop-blur` glassmorphism (`K3`), decorative `01/02/03` numbering (`SD6`), all-caps tracked eyebrow spam (`T5`), and "AI sparkle" icons.
- **Required craft**: Grounded retail-ledger palette (`#F8F9FA` paper ground, `#141A21` ink, `#0E6B4E` forest jade primary, semantic amber/crimson strictly for debt status), Vietnamese-native typography (`Be Vietnam Pro` + `JetBrains Mono` with `tabular-nums` for currency alignment), flat 1px hairline structure, and ≥ 4.5:1 WCAG AA contrast everywhere.

### V. Financial Integrity & Safe Defaults
Money calculations, debt balances, and VietQR amounts MUST be deterministic and auditable.
- Store VND amounts as exact integer `bigint`/`integer` values in PostgreSQL (no floating-point rounding drift).
- Outstanding debt MUST be derived consistently from `order.total_amount - SUM(payments.amount)` (or maintained atomically via database transaction/trigger) so partial repayments are always accurate.
- Dynamic VietQR payloads MUST embed the exact remaining balance and unique order/debt reference code to prevent transfer mix-ups.

## Technology Stack & Platform Constraints

- **Frontend / Full-Stack Framework**: Next.js (App Router, TypeScript) deployed on **Vercel** (supports SSR/Route Handlers, static assets, and Preview Deployments per Git branch).
- **Backend / Database / Auth / Realtime**: **Supabase** (PostgreSQL + RLS + Supabase Auth + Supabase Realtime + Edge Functions).
- **PWA & Cross-Platform Push Notifications**: Web App Manifest + Service Worker (`sw.js`) + Web Push API (VAPID). On iPhone (iOS 16.4+), push delivery requires the user to install the app via Safari **"Add to Home Screen"**; the app MUST include an explicit guided prompt/status indicator for iOS & Windows notification permissions.
- **E-Invoice & QR**: Client-side dynamic VietQR generation (EMVCo / Napas 247 compliant) + downloadable/shareable **PNG** image and printable **PDF** receipt.

## Development Workflow & Quality Gates

1. **Specification Gate**: Every feature starts with `specs/<NNN>-<slug>/spec.md` defining testable user stories (P1, P2, ...) and edge cases.
2. **Design Gate**: Every UI change is checked against `DESIGN.md` and `avoid-ai-design` / `impeccable` rules before merge.
3. **Verification Gate**: TypeScript typecheck, lint, build (`next build`), and critical user-journey checks (POS checkout, debt repayment, QR generation, receipt export, Realtime sync, responsive 375px & 1280px viewports) MUST pass before merging a branch.
4. **Security Gate**: Never commit `.env*` secrets, `SUPABASE_SERVICE_ROLE_KEY`, or private VAPID keys. Only `NEXT_PUBLIC_*` keys may be exposed to the browser.

## Governance

This Constitution supersedes ad-hoc prompting habits during vibe coding. Any amendment requires updating `.specify/memory/constitution.md`, bumping the version according to semantic versioning, and committing the change on a dedicated branch.

**Version**: 1.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16
