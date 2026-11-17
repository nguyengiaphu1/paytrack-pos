# Bug Assessment: Tốc độ chuyển đổi giữa các tab chậm

- **Slug**: slow-tab-navigation
- **Created**: 2026-11-17T09:07:00Z
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> 2. Tốc độ giữa các tab khá chậm

## Symptom

Khi người dùng chuyển qua lại giữa 5 tab chính (`Bán hàng`, `Sổ nợ`, `Đơn hàng`, `Thống kê`, `Cài đặt`), mỗi lần bấm tab bị khựng/đợi lâu rồi mới hiển thị nội dung (hiện trạng thái `"Đang tải..."` lặp đi lặp lại dù mới mở tab đó trước đó vài giây).

## Reproduction

1. Đăng nhập vào PayTrack POS trên điện thoại hoặc máy tính.
2. Chuyển lần lượt qua các tab: **Bán hàng (`/`)** → **Sổ nợ (`/debts`)** → **Đơn hàng (`/orders`)** → **Thống kê (`/stats`)** → quay lại **Bán hàng (`/`)**.
3. Quan sát độ trễ từ lúc chạm link điều hướng đến lúc dữ liệu hiển thị xong.

## Suspected Code Paths

- `src/middleware.ts:44-46` — Gọi `await supabase.auth.getUser()` trên **mọi** request chuyển route/RSC prefetch (mỗi lần bấm `<Link>` trong App Router đều gửi request lên Next.js server, kích hoạt `getUser()` gọi mạng sang Supabase Auth API).
- `src/app/(app)/layout.tsx:10-41` — Server Component bọc cả 5 tab, tiếp tục gọi `await supabase.auth.getUser()` và truy vấn `shop_profiles` trên mỗi navigation nếu RSC payload bị re-fetch; đồng thời không có `src/app/(app)/loading.tsx` nên Next.js soft navigation không có fallback chuyển cảnh tức thì.
- `src/app/(app)/page.tsx:33-57` (`Bán hàng`), `src/app/(app)/debts/page.tsx:30-65` (`Sổ nợ`), `src/app/(app)/orders/page.tsx:57-83` (`Đơn hàng`), `src/app/(app)/stats/page.tsx:61-88` (`Thống kê`), `src/app/(app)/settings/page.tsx:31-55` (`Cài đặt`):
  - Cả 5 trang đều là `'use client'` với state cục bộ (`useState`), **không dùng cache chung** (như React Context store hoặc SWR/stale-while-revalidate). Mỗi lần chuyển tab là component unmount hoàn toàn; khi quay lại tab cũ, trang reset `loading = true`, hiện hộp `"Đang tải..."` và fetch lại toàn bộ `SELECT *` từ Supabase (`products`, `customers`, `shop_profiles`, 200 `orders`, `get_analytics_summary`).
  - Mỗi trang dùng `setTimeout(..., 0)` trong `useEffect` trước khi bắt đầu fetch, trễ thêm 1 macrotask.
- `src/components/shell/AppShell.tsx:35-41` & `src/hooks/useRealtimeSync.ts:42-63` — `AppShell` đã mở sẵn kênh Realtime `shell-sync` cho `['products', 'customers', 'orders', 'debt_payments']` và phát sự kiện `window.dispatchEvent(new CustomEvent('paytrack:realtime-update'))`. Tuy nhiên, 4 trang con (`page.tsx`, `debts/page.tsx`, `orders/page.tsx`, `stats/page.tsx`) không lắng nghe sự kiện đó mà mỗi trang tự mở + subscribe thêm **một kênh Supabase Realtime WebSocket riêng** lúc mount và `removeChannel` lúc unmount, gây tốn handshake/kết nối lại liên tục mỗi lần đổi tab.
- `vercel.json` (chưa tồn tại) — Chưa khai báo `regions: ["sin1"]` (Singapore); nếu Vercel Function chạy ở `iad1` (US East) mặc định trong khi Supabase đặt ở `ap-southeast-1` (Singapore), mỗi lần chuyển tab qua `middleware.ts` + `(app)/layout.tsx` sẽ bị nhân đôi độ trễ xuyên lục địa (VN → US → SG → US → VN).

## Root Cause Hypothesis

Tốc độ chuyển tab chậm do **3 nút cổ chai cộng dồn** (confidence: **high**):
1. **Không có client-side data cache / shared store giữa các tab**: Mỗi lần bấm tab là unmount/remount từ đầu, hiện màn hình loading và tải lại toàn bộ dữ liệu từ Supabase dù dữ liệu vừa mới tải xong hoặc đã có `Realtime` cập nhật ngầm.
2. **Double server auth & DB round-trip trên mọi lần chuyển tab**: `middleware.ts` và `(app)/layout.tsx` cùng gọi `supabase.auth.getUser()` + query `shop_profiles`, không có `loading.tsx`, và có khả năng Vercel Serverless chạy khác region (`iad1`) so với Supabase (`ap-southeast-1`).
3. **Tạo/hủy kênh Supabase Realtime trùng lặp ở từng trang**: Thay vì tái sử dụng kênh duy nhất ở `AppShell`, mỗi tab tự subscribe/unsubscribe WebSocket channel riêng mỗi lần chuyển tab.

## Proposed Remediation

**Preferred**:
1. **Tạo Shared Store / SWR-style Cache ở tầng `AppShell` (hoặc Context Provider trong `(app)/layout.tsx`)**:
   - Giữ cache in-memory cho `products`, `customers`, `orders`, `profile`, và `analyticsSummary` (theo preset) kèm mốc `lastFetchedAt`.
   - Khi chuyển tab, hiển thị **ngay lập tức** dữ liệu đang có trong cache (`stale-while-revalidate` — không hiện màn hình `"Đang tải..."` chặn UI), đồng thời âm thầm làm mới nền hoặc chỉ refetch khi có sự kiện Realtime `paytrack:realtime-update` / thao tác ghi mới.
2. **Hợp nhất Realtime về một kênh duy nhất ở `AppShell`**:
   - Loại bỏ các `useRealtimeSync` trùng lặp trong `page.tsx`, `debts/page.tsx`, `orders/page.tsx`, `stats/page.tsx`; các trang chỉ lắng nghe event `paytrack:realtime-update` (hoặc nhận dữ liệu trực tiếp từ Context store) để không phải mở/đóng WebSocket channel mỗi lần đổi tab.
3. **Giảm độ trễ server-side khi điều hướng**:
   - Thêm `src/app/(app)/loading.tsx` nhẹ để chuyển route tức thì.
   - Truyền `initialProfile` từ `(app)/layout.tsx` xuống Context/AppShell để các trang con không phải query lại `shop_profiles` ở client.
   - Cấu hình `vercel.json` với `regions: ["sin1"]` (nếu gói Vercel cho phép) hoặc tối ưu `middleware.ts` tránh gọi trùng `getUser()` không cần thiết khi chỉ làm mới session.
   - Chọn lọc cột (`select(...)` thay vì `select('*')`) cho danh sách `orders` (bỏ bớt dữ liệu thừa) và tải song song mượt mà.

**Alternatives**:
- *Chuyển sang giữ DOM cả 5 tab ẩn bằng CSS (`display: none`) trong 1 page*: Chuyển tab sẽ tức thì 0ms, nhưng làm URL không còn phản ánh đúng route (`/debts`, `/orders`, `/stats`, `/settings`), mất deep-link từ Web Push notification (`/debts?customer=...`), và tăng bộ nhớ DOM trên iPhone. Giải pháp Context cache + App Router giữ nguyên deep-link sạch sẽ hơn.

**Files likely to change**:
- `src/components/shell/AppShell.tsx` (hoặc thêm `src/components/providers/PosDataProvider.tsx`)
- `src/app/(app)/layout.tsx`
- `src/app/(app)/loading.tsx` (mới)
- `src/app/(app)/page.tsx`
- `src/app/(app)/debts/page.tsx`
- `src/app/(app)/orders/page.tsx`
- `src/app/(app)/stats/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/middleware.ts`
- `vercel.json` (tùy chọn cấu hình region `sin1`)

**Tests to add or update**:
- Unit/component test cho cache store (lần chuyển tab thứ 2 render ngay từ cache không bị reset về loading state, và invalidation cập nhật đúng khi có event `paytrack:realtime-update` hoặc mutation).

## Risks & Considerations

- **Stale cache**: Nếu mutation (tạo đơn, thu nợ, hủy đơn, sửa sản phẩm/cài đặt) quên gọi `invalidate` / `refresh`, UI có thể hiển thị số cũ tạm thời cho tới khi Realtime đẩy về. Cần đảm bảo mọi callback `onSaved` / `onOrderCreated` / `onCollected` đều cập nhật hoặc invalidate cache tập trung.
- **Auth security trong `middleware.ts`**: Không được bỏ qua việc xác thực session trên server ở các route bảo vệ; nếu tối ưu `middleware.ts`, vẫn phải giữ đúng hành vi redirect `/login` khi session không hợp lệ.

## Open Questions

- [NEEDS CLARIFICATION: Độ chậm xảy ra ngay cả khi chạy local (`localhost:3000`) hay rõ nhất trên bản live `paytrack-pos.vercel.app` (liên quan độ trễ mạng/region Vercel ↔ Supabase `ap-southeast-1`)?]
