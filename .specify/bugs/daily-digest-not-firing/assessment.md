# Bug Assessment: Báo tổng hợp khách đến hạn mỗi ngày không gửi push khi đổi giờ & bấm Lưu cài đặt không hiện thông báo đã lưu

- **Slug**: daily-digest-not-firing
- **Created**: 2026-11-17T16:42:00-08:00
- **Source**: pasted text + screenshot (`/home/antigravity/image.png`)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> `/speckit-bug-assess Sửa lỗi phần này không hoạt động`
>
> Ảnh đính kèm: Mục **5. Mặc định nhắc nợ & mẫu hóa đơn** → checkbox **Báo tổng hợp khách đến hạn mỗi ngày** (đã tích chọn) với khung giờ `07:30 PM`.
>
> Chi tiết bổ sung từ người dùng:
> 1. Đã bấm **Lưu tất cả cài đặt**, chờ qua giờ hẹn (`07:30 PM` / `19:30`) nhưng không thấy thông báo đẩy (Web Push) về máy.
> 2. Khi bấm **Lưu tất cả cài đặt** không có thông báo nào báo cho người dùng biết là đã lưu.

## Symptom

Trong màn hình **Cài đặt cửa hàng** (`/settings`), người dùng gặp đồng thời 2 lỗi liên quan đến mục **5. Mặc định nhắc nợ & mẫu hóa đơn**:
1. Khi bấm nút **Lưu tất cả cài đặt** ở cuối trang, giao diện không hiển thị thông báo xác nhận đã lưu thành công (dù dữ liệu có được gửi lên Supabase), khiến người dùng không biết thao tác lưu đã thành công hay chưa.
2. Khi bật **Báo tổng hợp khách đến hạn mỗi ngày** và đặt lại khung giờ (ví dụ `07:30 PM` / `19:30`) rồi chờ qua giờ hẹn, hệ thống không gửi Web Push tổng hợp công nợ về máy — đặc biệt khi trong ngày hôm đó digest đã từng chạy trước đó ở khung giờ cũ (mặc định `08:30`), hoặc khi không rõ trạng thái điều kiện kích hoạt (`last_digest_sent_date`, `dueCustomersToday`, `cronHeartbeat`).

## Reproduction

1. Mở `/settings`, cuộn xuống mục **5. Mặc định nhắc nợ & mẫu hóa đơn**.
2. Tích **Báo tổng hợp khách đến hạn mỗi ngày**, đổi giờ sang khung giờ sắp tới trong ngày (ví dụ `07:30 PM` / `19:30`), rồi bấm **Lưu tất cả cài đặt** ở cuối trang.
3. Quan sát ngay sau khi bấm lưu: không có thông báo trạng thái xác nhận đã lưu xuất hiện trên màn hình.
4. Chờ qua mốc `07:30 PM` (giờ VN) khi trong cửa hàng đã từng gửi digest trong ngày hôm đó ở khung giờ mặc định `08:30` (tức `shop_profiles.last_digest_sent_date = todayVN`) hoặc chưa có khách có `next_due_date <= hôm nay` → không có Web Push tổng hợp nào được gửi về máy.

## Suspected Code Paths

- `src/app/(app)/settings/page.tsx:59-64` — `<SettingsFormBody key={profile?.updated_at ?? 'new-profile'} ... />` dùng `profile?.updated_at` làm React `key`.
- `src/app/(app)/settings/page.tsx:146-148` — Trong `handleSave`, sau khi `upsert` bảng `shop_profiles` (trigger `trg_shop_profiles_updated_at` trong `supabase/migrations/0001_initial_schema.sql:151` tự cập nhật `updated_at := now()`), code gọi `setProfileLocal(savedRow as ShopProfile)` rồi `setSavedMsg('Đã lưu toàn bộ cài đặt cửa hàng thành công!')`. Vì `profile.updated_at` thay đổi, React unmount và remount toàn bộ `SettingsFormBody`, làm `savedMsg` (`useState`) bị reset về `null` ngay lập tức.
- `src/app/(app)/settings/page.tsx:175-183` & `388-395` — Banner `savedMsg` chỉ đặt ở đầu `<form>` (trên mục 3), không hiển thị gần nút **Lưu tất cả cài đặt** ở cuối form; ngay cả khi không bị remount, người dùng đang nhìn ở cuối trang cũng khó thấy phản hồi.
- `src/app/(app)/settings/page.tsx:123-144` — Khi người dùng thay đổi `reminder_default_hour` hoặc bật lại `reminder_digest_enabled`, `upsert` không xử lý reset `last_digest_sent_date`. Nếu trước đó trong cùng ngày digest đã chạy ở khung giờ cũ (ví dụ mặc định `'08:30'` đã ghi `last_digest_sent_date = todayVN`), việc đổi sang `'19:30'` (`07:30 PM`) trong ngày vẫn giữ nguyên `last_digest_sent_date = todayVN`.
- `src/lib/reminders-cron.ts:149-158` — `if (profile.last_digest_sent_date === todayVN) continue;` bỏ qua hoàn toàn mọi lần chạy lại trong cùng ngày ngay cả khi chủ tiệm đã đổi `reminder_default_hour` sang một giờ mới trong tương lai của ngày hôm đó. Ngoài ra, truy vấn `dueCustomers` chỉ tính khách có `next_due_date IS NOT NULL AND next_due_date <= todayVN` (lấy từ `orders.debt_due_date`), không báo rõ nếu cửa hàng chỉ có khách nợ chưa gán `next_due_date` hoặc đã đánh dấu `last_digest_sent_date === todayVN`.
- `src/app/api/push/subscribe/route.ts:29-78` & `src/components/pwa/PushNotificationSetup.tsx:283-320` — `GET /api/push/subscribe` không trả trạng thái cấu hình digest hiện tại (`lastDigestSentDate`, `reminderDigestEnabled`, `reminderDefaultHour`), và nút **Gửi lịch đến hạn ngay** (`POST /api/push/dispatch-due`) chỉ trả thông báo gộp chung khi `totalSent === 0`, không chỉ rõ lý do digest chưa gửi (đã gửi hôm nay rồi / chưa tới giờ / không có khách có `next_due_date <= hôm nay` / chưa bật tổng hợp).

## Root Cause Hypothesis

Có 2 nguyên nhân gốc độc lập nhau nhưng cùng xảy ra trên màn hình Cài đặt (confidence: **high**):

1. **Lỗi mất thông báo khi bấm Lưu (`settings/page.tsx`)**: Component `SettingsFormBody` được gắn `key={profile?.updated_at ?? 'new-profile'}`. Khi `handleSave` thành công, trigger Postgres `trg_shop_profiles_updated_at` trả về `updated_at` mới trong `savedRow`, và `setProfileLocal(savedRow)` làm `key` thay đổi. React lập tức hủy component `SettingsFormBody` cũ và mount instance mới với `savedMsg = null`, xóa sạch thông báo `"Đã lưu toàn bộ cài đặt cửa hàng thành công!"` ngay trong cùng chu kỳ render.
2. **Lỗi Báo tổng hợp mỗi ngày không bắn ở giờ mới (`07:30 PM`)**: Khi `shop_profiles` đã từng gửi digest trong ngày hôm nay (ví dụ theo giờ mặc định `'08:30'`) nên `last_digest_sent_date` đang bằng ngày VN hôm nay (`todayVN`), việc người dùng đổi `reminder_default_hour` sang `'19:30'` (`07:30 PM`) và lưu lại **không** reset `last_digest_sent_date`. Do đó `runReminderCron()` ở `src/lib/reminders-cron.ts:149` luôn `continue` khi gặp `profile.last_digest_sent_date === todayVN`, khiến cả `pg_cron` lúc `19:30` lẫn nút **Gửi lịch đến hạn ngay** đều bỏ qua. Ngoài ra, thiếu hiển thị chẩn đoán trạng thái digest (đã gửi hôm nay hay chưa, giờ hẹn đang lưu trên server, số khách `next_due_date <= todayVN`) khiến người dùng không biết nguyên nhân nếu digest bị bỏ qua do chưa có khách đến hạn hoặc cron chưa chạy.

## Proposed Remediation

**Preferred**:
1. **Sửa dứt điểm phản hồi lưu cài đặt trong `src/app/(app)/settings/page.tsx`**:
   - Bỏ `key={profile?.updated_at ?? 'new-profile'}` trên `SettingsFormBody` (thay bằng `key={profile?.id ?? 'new-profile'}` hoặc đồng bộ state bằng `useEffect` chỉ khi tải profile lần đầu / khác `id`) để `setProfileLocal(savedRow)` không remount form và không làm mất `savedMsg`.
   - Hiển thị thông báo xác nhận lưu thành công (kèm giờ nhắc đang lưu nếu bật digest, ví dụ `"Đã lưu cài đặt (nhắc tổng hợp lúc 19:30)"`) ngay **cạnh/phía trên nút Lưu tất cả cài đặt** ở cuối form (đồng thời giữ hoặc đồng bộ trạng thái rõ ràng ở cuối form nơi người dùng vừa bấm nút).
2. **Cho phép lịch tổng hợp mới trong ngày hoạt động khi người dùng đổi giờ hoặc bật lại (`src/app/(app)/settings/page.tsx` + helper thuần)**:
   - Khi lưu `shop_profiles`, nếu `digestEnabled` đang bật và người dùng **thay đổi `reminder_default_hour`** sang một khung giờ chưa qua trong ngày hôm nay (hoặc chuyển `reminder_digest_enabled` từ `false` → `true` và giờ hẹn `>= nowHHMM_VN`), gửi `last_digest_sent_date: null` trong payload `upsert` (nếu giờ mới `> nowHHMM_VN` — hoặc giữ `null` nếu user chủ động đổi giờ hẹn lại cho hôm nay) để `pg_cron` ở mốc `19:30` gửi đúng 1 lần theo lịch mới.
   - Tách logic quyết định reset `last_digest_sent_date` thành helper thuần (ví dụ `shouldResetDigestSentDateForToday(...)` trong `src/lib/reminders-cron.ts` hoặc helper riêng) để unit test được bằng Vitest.
   - Lưu ý khi user đổi giờ sang một mốc **đã qua** trong ngày (ví dụ đang 20:00 đổi về 08:30): chỉ reset `last_digest_sent_date` về `null` khi giờ mới `> currentHHMM_VN` (hoặc cung cấp phản hồi rõ) để tránh vừa đổi về giờ quá khứ là bắn lại ngay ngoài ý muốn — còn khi đặt giờ tương lai như `07:30 PM` lúc ban ngày/trước 19:30 thì reset `last_digest_sent_date = null` để 19:30 bắn bình thường!
3. **Cải thiện khả năng chẩn đoán digest trong `/api/push/subscribe`, `/api/push/dispatch-due`, và `PushNotificationSetup.tsx`**:
   - Trả thêm metadata digest trong `GET /api/push/subscribe` (`digestEnabled`, `digestHour`, `digestSentToday`) và `POST /api/push/dispatch-due` (hoặc `CronRemindersSummary` giữ nguyên tương thích, thêm trường lý do bỏ qua cho UI nếu cần) để mục 2 và mục 5 hiển thị rõ: hôm nay đã gửi digest lúc nào / đang chờ tới `19:30` / đang có `X` khách đến hạn hôm nay (hoặc chưa có khách nào có `Ngày hẹn thu <= hôm nay`).

**Alternatives**:
- *Đưa `savedMsg` lên component cha `SettingsPage` thay vì bỏ `key={profile?.updated_at}`*: Vẫn giải quyết được việc giữ `savedMsg`, nhưng bỏ `key={profile?.updated_at}` (dùng `key={profile?.id ?? 'new-profile'}`) sạch hơn vì không hủy scroll position hay các state UI khác khi lưu.
- *Dùng cột riêng `last_digest_sent_hour` trong DB để tự phát hiện đổi giờ trong `runReminderCron`*: Chính xác ở tầng DB nhưng cần thêm migration SQL mới; trong khi reset `last_digest_sent_date: null` khi người dùng đổi `reminder_default_hour` sang giờ tương lai trong ngày ở màn hình Cài đặt không cần đổi schema DB và hoạt động ngay lập tức trên Supabase hiện tại.

**Files likely to change**:
- `src/app/(app)/settings/page.tsx`
- `src/lib/reminders-cron.ts`
- `src/app/api/push/subscribe/route.ts`
- `src/components/pwa/PushNotificationSetup.tsx`
- `tests/unit/reminders-cron.test.ts`

**Tests to add or update**:
- Unit test trong `tests/unit/reminders-cron.test.ts` cho helper `shouldResetDigestSentDate(...)` (đổi giờ sang tương lai trong ngày → reset `null`; giữ nguyên giờ hoặc đổi về giờ đã qua trong ngày → giữ nguyên; bật lại digest → xử lý đúng) và kịch bản `runReminderCron` bắn digest lúc `19:30` VN (`12:30Z`) sau khi reset `last_digest_sent_date`.
- Guard test kiểm tra `src/app/(app)/settings/page.tsx` không dùng `profile?.updated_at` làm `key` remount `SettingsFormBody` và hiển thị thông báo lưu gần nút submit.

## Risks & Considerations

- **Điều kiện dữ liệu thực tế trên Production**: `runReminderCron` chỉ gửi digest khi đồng thời thỏa 4 điều kiện: (1) `reminder_digest_enabled = true` & `nowHHMM_VN >= reminder_default_hour`, (2) `last_digest_sent_date !== todayVN`, (3) có ít nhất 1 khách `total_debt > 0 AND next_due_date <= todayVN`, và (4) có ít nhất 1 `push_subscriptions` hợp lệ + `pg_cron` đang chạy đúng trên Supabase. Cần xác minh thêm trên tài khoản live của người dùng nếu sau khi sửa mà `dueCustomersToday === 0` hoặc `cron_heartbeats` không cập nhật.
- **Tránh bắn lại ngoài ý muốn**: Nếu lúc 20:00 tối (đã gửi digest lúc 19:30) người dùng lại sửa thông tin khác trong Cài đặt (như tên tiệm, số tài khoản) mà **không** đổi giờ digest, tuyệt đối không được reset `last_digest_sent_date` (nếu không 1 phút sau cron sẽ gửi trùng lần 2 trong cùng ngày).

## Open Questions

- [NEEDS CLARIFICATION: Ở thời điểm test `07:30 PM`, mục **2. Thông báo nhắc thu nợ trên thiết bị này** có hiện dòng `"Kiểm tra lịch tự động gần nhất: ..."` và `"X khách đến hạn hôm nay"` không, hay chỉ báo `"0 khách"` / không thấy dòng heartbeat?]
- [NEEDS CLARIFICATION: Trong ngày hôm đó trước khi đổi sang `07:30 PM`, app có đã từng gửi 1 thông báo tổng hợp ở giờ mặc định `08:30` chưa?]
