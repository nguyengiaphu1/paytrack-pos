# Implementation Plan: Nâng cấp Trải nghiệm Trực quan, Màn hình Chờ & Chế độ Sáng/Tối (`002-ux-polish-theme`)

**Branch**: `feat/002-ux-polish-theme` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [specs/002-ux-polish-theme/spec.md](./spec.md)

## Summary

Nâng cấp toàn diện trải nghiệm người dùng cho PayTrack POS theo 5 trụ cột mà không thay đổi logic tài chính cốt lõi:
1. **Chế độ Sáng / Tối / Theo thiết bị mượt mà**: Inline bootstrap script chống chớp sáng/tối trước khi hydrate, `ThemeProvider` lưu lựa chọn độc lập theo từng thiết bị (`localStorage`), chuyển màu mượt `280ms` qua lớp `.theme-transitioning` tạm thời, bảng màu Tối chuẩn WCAG AA theo tinh thần sổ bán hàng của `DESIGN.md`, và cô lập vùng in/xuất ảnh hóa đơn + thẻ VietQR luôn giữ nền trắng mực đen.
2. **Màn hình chờ thương hiệu & Skeleton đúng ngữ cảnh**: `BrandLoadingScreen` cho khởi chạy ứng dụng và 5 bộ skeleton riêng biệt khớp bố cục từng tab (`Bán hàng`, `Sổ nợ`, `Đơn hàng`, `Thống kê`, `Cài đặt`) kèm cơ chế báo lỗi & nút **"Thử lại"** khi mất mạng.
3. **Trải nghiệm Welcome 3 lớp**: (1) phần chào tích hợp gọn ngay tại `/login`, (2) hướng dẫn thiết lập nhanh 3 bước hiển thị một lần theo tài khoản (`user_metadata.welcome_v2_seen`) có thể bỏ qua & mở lại trong **Cài đặt**, và (3) dải chào theo buổi hằng ngày trên trang chủ Bán hàng thu gọn 1 chạm.
4. **Giao diện trực quan cho người low-tech**: Chuẩn hóa ngôn ngữ tiếng Việt bình dân, thêm nút hiện/ẩn mật khẩu, nhãn rõ ràng kèm biểu tượng, trạng thái trống có hướng dẫn bước tiếp theo (`EmptyStateCard`), và làm rõ phần xem trước tiền khách đưa / tiền thối / còn ghi nợ trên toàn bộ 5 màn hình chính và `/login`.
5. **Chuyển động tinh tế**: Bộ primitive CSS thuần (`press-tactile`, `animate-modal-in`, `animate-sheet-up`, `animate-drawer-in`, `animate-badge-pop`, `skeleton-shimmer`) tôn trọng hoàn toàn `prefers-reduced-motion: reduce`.

## Technical Context

**Language/Version**: TypeScript `^5.9.0`, React `^19.3.1`, Next.js `^16.4.6` (App Router)  
**Primary Dependencies**: Tailwind CSS v4 (`@tailwindcss/postcss`), `lucide-react`, `recharts`, `qrcode`, `html-to-image`, `@supabase/ssr` / `@supabase/supabase-js`  
**Storage**: Supabase Auth `user_metadata` (`welcome_v2_seen` cho trạng thái onboarding theo tài khoản) + `localStorage` (`paytrack-theme` theo thiết bị, `paytrack-greeting-collapsed` theo ngày VN). Không thay đổi schema Postgres hay RPC.  
**Testing**: Vitest `^4.1.0` (`tests/unit/`), ESLint 9, TypeScript `tsc --noEmit`, `next build`  
**Target Platform**: Responsive Web & PWA — iPhone Safari PWA (`375px+`, iOS 16.4+) và Windows Chrome/Edge (`1280px+`)  
**Project Type**: Full-stack Next.js App Router web application  
**Performance Goals**: Zero white/wrong-theme flash on initial load; smooth `200–350ms` theme crossfade; `0 KB` external animation library overhead; 3-item POS checkout stays `< 15s`  
**Constraints**: Tuân thủ nghiêm ngặt `DESIGN.md` (không neon green, không purple gradients, không `backdrop-blur`, không `rounded-2xl shadow-lg`, input `>= 16px`, touch target `>= 48px`, `prefers-reduced-motion` support, không tràn ngang ở `375px`)  
**Scale/Scope**: Toàn bộ màn hình `/login`, layout shell `AppShell`, và 5 route chính (`/`, `/debts`, `/orders`, `/stats`, `/settings`) cùng các modal/drawer trọng yếu (`CheckoutModal`, `CollectDebtModal`, `ProductFormModal`, `DebtCustomerDrawer`, `VietQRModal`, `InvoicePreviewModal`).

## Constitution Check

*GATE: Evaluated both pre-research and post-design against `.specify/memory/constitution.md`.*

- **I. Mom-First Simplicity & Vietnamese Retail Clarity**: **PASS** — Toàn bộ cải tiến hướng tới ngôn ngữ bình dân, nút có nhãn chữ rõ ràng, trạng thái trống có hướng dẫn hành động, `>= 48px` touch targets, `>= 16px` inputs, không thêm thao tác thừa vào luồng bán hàng hằng ngày.
- **II. Cloud-First Truth & Real-Time Sync**: **PASS** — Toàn bộ dữ liệu kinh doanh vẫn do Supabase Postgres & Realtime quản lý. Trạng thái hoàn thành onboarding 3 bước lưu trên Supabase Auth `user_metadata` (đồng bộ đa thiết bị cùng tài khoản); riêng tùy chọn Light/Dark lưu theo thiết bị đúng như yêu cầu đặc tả đã làm rõ.
- **III. Spec-Driven Development & Branch Discipline**: **PASS** — Phát triển trên nhánh riêng `feat/002-ux-polish-theme`, đi qua đầy đủ `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` trước khi tạo task và viết code.
- **IV. Anti-AI-Slop Visual Craft**: **PASS** — Chế độ Tối mở rộng trực tiếp từ thẩm mỹ sổ bán hàng của `DESIGN.md` (nền slate trầm `#0E1317` / `#161D24`, Jade đạt chuẩn WCAG AA `#15805E`, Amber/Crimson ngữ nghĩa, font `Be Vietnam Pro` + `JetBrains Mono` `tabular-nums`, đường viền `1px`, không glassmorphism/neon/AI sparkles).
- **V. Financial Integrity & Safe Defaults**: **PASS** — Không chạm vào phép tính VND `bigint`, `computeLineTotal`, `computeOrderTotals`, RPC `create_order_with_items` / `record_debt_payment` / `cancel_order`, hay payload VietQR.

*Post-Design Re-Check*: **PASS** — Không có ngoại lệ hay vi phạm Hiến pháp nào phát sinh trong Phase 0 và Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/002-ux-polish-theme/
├── spec.md              # Feature specification + Clarifications
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 architectural & UX research
├── data-model.md        # Phase 1 device/account state & error-state model
├── quickstart.md        # Phase 1 end-to-end validation guide
├── contracts/
│   └── ui-theme-and-onboarding.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css                          # Light + Dark CSS tokens, smooth .theme-transitioning, .print-surface-light, skeleton shimmer & micro-animations
│   ├── layout.tsx                           # Zero-flash inline theme script + ThemeProvider wrapper + suppressHydrationWarning
│   ├── loading.tsx                          # Root branded loading screen (BrandLoadingScreen)
│   ├── login/page.tsx                       # Layer 1 integrated Welcome + Login/Signup + password eye toggle + ThemeQuickToggle
│   └── (app)/
│       ├── layout.tsx                       # Pass user.user_metadata.welcome_v2_seen into AppShell/Onboarding
│       ├── loading.tsx                      # App shell route skeleton
│       ├── page.tsx                         # POS Workspace: DailyWelcomeBanner + PosWorkspaceSkeleton + retry + low-tech empty states
│       ├── debts/page.tsx                   # Debts: DebtsPageSkeleton + retry + clearer low-tech labels/empty states
│       ├── orders/page.tsx                  # Orders: OrdersPageSkeleton + retry + clearer action labels/cancel confirmation
│       ├── stats/page.tsx                   # Stats: StatsPageSkeleton + helper subtitles + theme-aware charts
│       └── settings/page.tsx                # Settings: SettingsPageSkeleton + Theme selector + Replay Onboarding button + clearer sections
├── components/
│   ├── providers/
│   │   ├── ThemeProvider.tsx                # NEW: Light/Dark/System state, matchMedia listener, 320ms smooth transition class
│   │   └── PosDataProvider.tsx              # Add explicit fetch error states + retry support for skeletons
│   ├── shell/
│   │   └── AppShell.tsx                     # Integrate ThemeQuickToggle (mobile top bar + desktop sidebar) & WelcomeOnboardingModal host
│   ├── ui/
│   │   ├── ThemeToggle.tsx                  # NEW: ThemeQuickToggle (header/sidebar/login) & SettingsThemeSelector
│   │   ├── BrandLoadingScreen.tsx           # NEW: Branded loading splash
│   │   ├── PageSkeletons.tsx                # NEW: 5 layout-matched page skeletons + FetchErrorCard
│   │   └── EmptyStateCard.tsx               # NEW: Guided low-tech empty state component
│   ├── welcome/
│   │   ├── WelcomeOnboardingModal.tsx       # NEW: Layer 2 3-step quick setup guide (replayable)
│   │   └── DailyWelcomeBanner.tsx           # NEW: Layer 3 collapsible daily greeting strip on POS home
│   ├── pos/
│   │   ├── ProductCatalog.tsx               # Guided empty state, clear labels, press-tactile feedback
│   │   ├── CartPanel.tsx                    # Clearer labels & animate-badge-pop feedback
│   │   ├── CheckoutModal.tsx                # Transparent change/debt summary, clear payment presets, modal/sheet animation
│   │   └── ProductFormModal.tsx / QuickItemModal.tsx  # Smooth modal entrance + clearer Vietnamese helper hints
│   ├── debts/
│   │   ├── DebtCustomerDrawer.tsx           # Smooth drawer entrance + labeled primary buttons
│   │   ├── CollectDebtModal.tsx             # Transparent before/after debt preview + smooth modal entrance
│   │   └── ReminderModal.tsx                # Smooth modal entrance + clearer wording
│   ├── qr/VietQRModal.tsx                   # Isolate QR export card with .print-surface-light + smooth modal entrance
│   ├── invoice/
│   │   ├── InvoicePreviewModal.tsx          # Isolate preview paper with .print-surface-light + smooth modal entrance
│   │   └── ReceiptTemplate.tsx              # Ensure explicit light-paper ink contrast in all themes
│   └── stats/
│       ├── RevenueCashChart.tsx             # Replace hardcoded light hex strokes/ticks with CSS variables
│       ├── PaymentBreakdownChart.tsx        # Theme-safe semantic colors
│       └── DebtAgingCard.tsx                # Theme-safe surface/text contrast
└── tests/
    └── unit/
        ├── theme-and-welcome.test.ts        # NEW: Unit tests for theme resolution, greeting time-of-day, onboarding state helpers
        └── ux-guards.test.ts                # NEW: Structural tests for dark tokens, reduced-motion, no-flash script, print isolation, labeled skeletons
```

**Structure Decision**: Giữ nguyên kiến trúc App Router hiện tại (`src/app/` + `src/components/`), chỉ bổ sung các module tập trung vào theme (`ThemeProvider`, `ThemeToggle`), loading/skeleton (`BrandLoadingScreen`, `PageSkeletons`), và welcome (`WelcomeOnboardingModal`, `DailyWelcomeBanner`), đồng thời tinh chỉnh trực tiếp các trang và modal hiện có.

## Complexity Tracking

> Không có vi phạm Constitution nào cần giải trình.
