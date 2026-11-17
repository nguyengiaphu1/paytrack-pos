# UI & Client State Contracts: Theme, Loading Skeletons & 3-Layer Welcome

**Feature**: `002-ux-polish-theme` | **Date**: 2026-11-17

## 1. Theme Provider Contract (`src/components/providers/ThemeProvider.tsx`)

```ts
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  cyclePreference: () => void; // system -> light -> dark -> system (or light <-> dark with clear label)
}
```

### Behavioral Guarantees
1. **No-Flash Bootstrap**: Inline script in `src/app/layout.tsx` sets `document.documentElement.dataset.theme` (`'light' | 'dark'`) synchronously before hydration.
2. **Smooth Transition Window**: Calling `setPreference(next)` or receiving a `MediaQueryList` `change` event (when `preference === 'system'`) adds `theme-transitioning` to `document.documentElement` for `320ms`, smoothly animating `background-color`, `color`, `border-color`, `fill`, and `stroke` (`280ms cubic-bezier(0.22, 1, 0.36, 1)`), then removes the class cleanly so normal interactions remain crisp.
3. **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, `.theme-transitioning` transition durations collapse to `0.01ms` automatically.
4. **Print & VietQR Contrast Lock**: Elements with `.print-surface-light` override theme variables to fixed light-paper hex values (`#FFFFFF` bg, `#141A21` ink) regardless of `data-theme="dark"`.

## 2. Theme Switcher Controls

- **Quick Switcher (`ThemeQuickToggle`)**:
  - Placements: Mobile Top Bar (`AppShell`), Desktop Sidebar Footer (`AppShell`), and Login Screen top-right corner (`/login`).
  - Interaction: Opens compact 3-option popover or cycles cleanly with clear Vietnamese label + icon (`Theo máy` / `Sáng` / `Tối`), minimum `44px` touch target, zero horizontal overflow at `375px`.
- **Full Selector (`SettingsThemeSection`)**:
  - Placement: Top section of `/settings` (*"1. Giao diện Sáng / Tối"*).
  - Interaction: 3 large tactile option cards (**Theo thiết bị** [mặc định], **Chế độ Sáng**, **Chế độ Tối**) with plain Vietnamese explanation under each option.

## 3. Loading & Skeleton Contract

- **`BrandLoadingScreen`**: Centered PayTrack POS emblem, brand name, and friendly status text (*"Đang mở sổ bán hàng..."*), supporting both Light & Dark tokens immediately via `data-theme`.
- **Page Skeletons**:
  - `PosWorkspaceSkeleton`: Search + category pill strip + 6 product row/card placeholders + desktop `CartPanel` skeleton / mobile bottom bar skeleton.
  - `DebtsPageSkeleton`: 3 KPI card skeletons + search/filter strip + 5 debtor row skeletons.
  - `OrdersPageSkeleton`: Search + status tabs + 5 order card skeletons.
  - `StatsPageSkeleton`: Preset filter chips + 4 KPI cards + chart container + breakdown & aging card skeletons.
  - `SettingsPageSkeleton`: Push notification banner skeleton + form group skeletons.
- **Error Recovery**: If initial fetch fails (`!loaded && error`), show clear Vietnamese error banner + `48px` **"Thử lại"** button calling `refresh*()`.

## 4. 3-Layer Welcome Contract

1. **Layer 1 (`/login`)**: Integrated welcome card showing 3 concise benefits (*Bán hàng nhanh 3 chạm*, *Sổ nợ nhắc tự động*, *Mã VietQR thu đúng số tiền*) alongside the Login / Register form (`"Đăng nhập"` / `"Mở sổ mới"`), plus show/hide password toggle.
2. **Layer 2 (`WelcomeOnboardingModal`)**:
   - Auto-opens once per account when `!welcomeSeen` (checked from `user.user_metadata.welcome_v2_seen` + local mirror).
   - 3 guided steps with live completion checkmarks:
     1. Đặt tên cửa hàng
     2. Cài ngân hàng nhận tiền VietQR (tùy chọn)
     3. Thêm món hàng đầu tiên (tùy chọn)
   - Actions: **"Bỏ qua, vào bán hàng ngay"** and **"Hoàn tất & Bắt đầu bán"**; replayable via button in `/settings`.
3. **Layer 3 (`DailyWelcomeBanner`)**:
   - Rendered at top of `/` (POS Workspace) when not dismissed today.
   - Displays time-of-day greeting (`Chào buổi sáng/trưa/chiều/tối, {shopName}`), concise actionable cue (e.g., overdue/due customer count link to `/debts?filter=due` if `> 0`), and a 1-tap **"Thu gọn"** button persisted per Vietnam calendar day.

## 5. Low-Tech UX & Animation Rules

- **Empty State Pattern (`EmptyStateCard`)**: Icon + plain Vietnamese headline + 1-sentence instruction + primary `48px` CTA button (or secondary tip).
- **Action Button Safety**: All primary submit buttons (`CheckoutModal`, `CollectDebtModal`, `ProductFormModal`, `Settings`, `Login`) show inline spinner + disabled state while submitting to prevent double-creation.
- **Icon Labeling**: No standalone cryptic icon-only primary actions in POS, Debts, Orders, Stats, or Settings — every primary action displays a concise Vietnamese label alongside its icon.
- **Animation Classes (`globals.css`)**:
  - `.press-tactile` (`120ms` active scale `0.97`)
  - `.animate-fade-in` (`160ms` opacity/subtle reveal)
  - `.animate-modal-in` (`180ms` subtle scale `0.98->1` + opacity)
  - `.animate-sheet-up` (`220ms` translateY `16px->0` + opacity)
  - `.animate-drawer-in` (`220ms` translateX `20px->0` + opacity)
  - `.animate-badge-pop` (`180ms` cart counter feedback)
  - All animations collapse to instant (`0.01ms`) when `prefers-reduced-motion: reduce` is enabled.
