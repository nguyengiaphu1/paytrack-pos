# Data Model: UX Polish, Theme Preference & 3-Layer Welcome

**Feature**: `002-ux-polish-theme` | **Date**: 2026-11-17

> Note: No PostgreSQL tables or RPC functions are added or altered by this feature. Existing integer VND `bigint` math, RLS policies, and FIFO debt logic remain untouched.

## 1. Client / Device-Scoped State

### `ThemePreference` (Device Local Storage)
Stored independently per browser/PWA installation so a daytime Windows counter PC and a nighttime iPhone can maintain separate theme choices.

- **Storage Key**: `paytrack-theme` (`localStorage`)
- **Allowed Values**: `'light' | 'dark' | 'system'`
- **Default**: `'system'` (Follow device setting)
- **Derived Runtime State**:
  - `resolvedTheme`: `'light' | 'dark'` — computed from `preference === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference`
  - Applied onto `<html data-theme={resolvedTheme}>`, `document.documentElement.style.colorScheme = resolvedTheme`, and `<meta name="theme-color">` (`#0E6B4E` for light, `#0E1317` for dark).
- **Validation & Fallback**:
  - Any unknown/corrupted value in `localStorage` falls back safely to `'system'`.
  - If `window.matchMedia` is unavailable or throws, `'system'` resolves safely to `'light'`.

### `DailyGreetingCollapseState` (Device + Date Scoped)
Tracks whether the shop owner collapsed the daily greeting strip (`DailyWelcomeBanner`) on the POS Home screen for the current Vietnam calendar day (`Asia/Ho_Chi_Minh`).

- **Storage Key**: `paytrack-greeting-collapsed:<userId>:<YYYY-MM-DD>` (`sessionStorage` or `localStorage`)
- **Value**: `'1'` when collapsed
- **Lifecycle**: Automatically resets on the next Vietnam calendar day (`getTodayVN()`) or when re-expanded manually, so each new workday begins with a warm greeting without nagging after collapse.

## 2. Account-Scoped State (Supabase Auth `user_metadata` + Client Cache)

### `OnboardingState`
Tracks whether the authenticated shop account has completed or skipped the one-time 3-step quick setup guide (`WelcomeOnboardingModal`).

- **Primary Cloud Source**: `user.user_metadata.welcome_v2_seen` (`boolean`, persisted via `supabase.auth.updateUser({ data: { welcome_v2_seen: true } })`)
- **Server-Side Hydration**: Read during SSR in `src/app/(app)/layout.tsx` from the already-fetched `user` object and passed into `AppShell` / `PosDataProvider`.
- **Optimistic Local Mirror**: `paytrack-onboarding-v2:<userId>` in `localStorage` (prevents re-opening on immediate refresh before token/session metadata propagates).
- **3-Step Progress Indicators (Derived from Live Data)**:
  1. **Tên tiệm & liên hệ**: `Boolean(profile?.shop_name && profile.shop_name.trim().length > 0)` (editable inline)
  2. **Tài khoản ngân hàng VietQR**: `Boolean(profile?.bank_bin && profile?.bank_account_no)` (editable inline with bank selector)
  3. **Món hàng đầu tiên**: `products.length > 0` (quick 1-row product creator inline)
- **Transitions**:
  - `welcome_v2_seen` is `false`/`undefined` -> modal auto-opens once after login/initial load.
  - User clicks **"Bỏ qua, vào bán hàng ngay"** or **"Hoàn tất & Bắt đầu bán"** -> sets optimistic local mirror + updates `user.user_metadata.welcome_v2_seen = true`.
  - User clicks **"Xem lại hướng dẫn bắt đầu"** in **Cài đặt** -> opens `WelcomeOnboardingModal` manually regardless of `welcome_v2_seen`.

## 3. PosDataProvider Load & Error States (Skeleton Control)

To prevent infinite skeletons when network drops (`Edge Cases`), `PosDataProvider` tracks explicit error states alongside `*Loaded` booleans:

- `catalogError: string | null`
- `customersError: string | null`
- `ordersError: string | null`
- `profileError: string | null`

When an error occurs before initial data arrives, the corresponding page renders a friendly Vietnamese offline/retry card (*"Không tải được dữ liệu — Kiểm tra Wi-Fi/4G và bấm Thử lại"*) instead of keeping the skeleton spinning indefinitely.
