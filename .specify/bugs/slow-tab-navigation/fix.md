# Bug Fix: Tốc độ chuyển đổi giữa các tab chậm

- **Slug**: slow-tab-navigation
- **Fixed**: 2026-11-17T09:20:32Z
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Tạo `PosDataProvider` dùng chung bộ nhớ đệm in-memory (stale-while-revalidate) cho cả 5 tab chính (`Bán hàng`, `Sổ nợ`, `Đơn hàng`, `Thống kê`, `Cài đặt`), hợp nhất Realtime về một kênh duy nhất `'shell-sync'`, truyền `initialProfile` từ Server Component `(app)/layout.tsx`, bật `prefetch={true}`, thêm `(app)/loading.tsx` và cấu hình `vercel.json` chạy tại region Singapore (`sin1`) cùng vùng với Supabase `ap-southeast-1`.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/components/providers/PosDataProvider.tsx` | added | Store cache chung (`products`, `customers`, `orders`, `profile`, `analytics` map theo khoảng ngày), chống gọi trùng in-flight, một kênh `useRealtimeSync` duy nhất (`shell-sync`, debounce 250ms) và `invalidateAfterMutation`. |
| `src/app/(app)/layout.tsx` | modified | Đọc `shop_profiles` (`select('*')`) 1 lần trên server và bọc `AppShell` trong `<PosDataProvider initialProfile={typedProfile}>`. |
| `src/app/(app)/loading.tsx` | added | Skeleton nhẹ khi chuyển route ở tầng App Router. |
| `vercel.json` | added | Khai báo `"regions": ["sin1"]` để đặt Vercel Serverless/SSR tại Singapore gần Supabase `ap-southeast-1`. |
| `src/components/shell/AppShell.tsx` | modified | Đọc `syncStatus` và `profile` từ `usePosData()`, bật `prefetch={true}` trên mọi tab `<Link>`. |
| `src/app/(app)/page.tsx` | modified | Dùng `usePosData()` cache (`ensurePosCatalog`, `upsertProductLocal`, `upsertCustomerLocal`, `invalidateAfterMutation`), bỏ `useRealtimeSync` trùng lặp. |
| `src/app/(app)/debts/page.tsx` | modified | Dùng `usePosData()` cache (`ensureCustomers`, `invalidateAfterMutation`), bỏ `useRealtimeSync` trùng lặp. |
| `src/app/(app)/orders/page.tsx` | modified | Dùng `usePosData()` cache (`ensureOrders`, `invalidateAfterMutation`), bỏ `useRealtimeSync` trùng lặp. |
| `src/app/(app)/stats/page.tsx` | modified | Dùng `usePosData()` cache (`fetchAnalytics`, `getCachedAnalytics`, `analyticsVersion`), bỏ `useRealtimeSync` trùng lặp và khóa dữ liệu theo `rangeKey`. |
| `src/app/(app)/settings/page.tsx` | modified | Dùng `usePosData()` (`profile`, `ensureProfile`, `setProfileLocal`) và tách `<SettingsFormBody key={...}>` để không cần `setState` đồng bộ trong `useEffect`. |
| `tests/unit/tab-cache-architecture.test.ts` | added | Unit test kiểm tra kiến trúc cache chung, chỉ có 1 kênh Realtime duy nhất, `prefetch={true}`, `loading.tsx` và `vercel.json` `sin1`. |

## Diff Highlights (optional)

```tsx
// src/app/(app)/layout.tsx
return (
  <PosDataProvider initialProfile={typedProfile}>
    <AppShell shopName={typedProfile?.shop_name || 'Tạp Hóa Mẹ'} userEmail={user.email || ''}>
      {children}
    </AppShell>
  </PosDataProvider>
);
```

```tsx
// src/components/providers/PosDataProvider.tsx
const { status: syncStatus } = useRealtimeSync({
  tables: ['products', 'customers', 'orders', 'debt_payments', 'debt_reminders', 'shop_profiles'],
  onDataChange: handleRealtimeChange,
  channelName: 'shell-sync',
});
```

## Tests Added or Updated

- `tests/unit/tab-cache-architecture.test.ts::wraps app routes in PosDataProvider with initialProfile and loading skeleton` — Đảm bảo layout truyền `initialProfile` vào `PosDataProvider` và có `loading.tsx`.
- `tests/unit/tab-cache-architecture.test.ts::consolidates Realtime into a single shell-sync channel inside PosDataProvider` — Đảm bảo cả 5 tab đọc từ `usePosData()` và không mở `useRealtimeSync` trùng lặp.
- `tests/unit/tab-cache-architecture.test.ts::enables Next.js link prefetching in AppShell and configures sin1 region in vercel.json` — Xác nhận `prefetch={true}` và `"regions": ["sin1"]`.

## Local Verification

- Commands run:
  - `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json OK')"` → `vercel.json OK` (exit code 0).
  - `npm ci` → pass (`added 487 packages`, 0 vulnerabilities).
  - `npm run typecheck && npm run lint && npm test && npm run build` → pass (`tsc --noEmit` 0 lỗi, `eslint .` 0 lỗi, Vitest `5 passed (5)` / `21 passed (21)` gồm 3 test trong `tests/unit/tab-cache-architecture.test.ts`, `next build` thành công 13/13 route).
- Manual checks: Đã rà soát lại luồng invalidation trên tất cả mutation (`handleOrderCreated`, `onSaved`, `handleConfirmCancel`, `onDataUpdated`, `handleSave` settings) để đảm bảo cache luôn được làm mới đồng bộ, và loại bỏ pattern `setState` đồng bộ trong `useEffect` (ESLint React 19).

## Deviations from Assessment

- Giữ nguyên `src/middleware.ts` không chỉnh sửa (bảo toàn hoàn toàn logic `supabase.auth.getUser()` và bảo vệ route redirect `/login`), thay vào đó xử lý độ trễ bằng `PosDataProvider` cache + `initialProfile` + `prefetch={true}` + `(app)/loading.tsx` + `vercel.json` (`sin1`).
- Bổ sung `src/app/(app)/loading.tsx` và `vercel.json` (`sin1`) như đã liệt kê trong mục tùy chọn của assessment.
- Lưu ý: nếu gói Vercel Hobby không hỗ trợ ghim region `sin1` trong `vercel.json` lúc deploy, cần kiểm tra build log Vercel (có thể giữ hoặc bỏ `regions` trong `vercel.json` tùy gói Vercel).

## Follow-ups

- Chạy `npm ci && npm run typecheck && npm run lint && npm test && npm run build` và test chuyển đổi qua lại 5 tab trên bản deploy Vercel để đo thời gian phản hồi thực tế.
- Xác nhận Vercel deploy chấp nhận `"regions": ["sin1"]` trong `vercel.json`.
