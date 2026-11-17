# Bug Assessment: Thông báo nhắc nợ đặt lịch không tự hiện và không gửi khi app đóng/không chạy ngầm

- **Slug**: scheduled-push-notifications
- **Created**: 2026-11-17T09:07:00Z
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> 1. Lỗi chưa thấy hiện thông báo khi đặt lịch hay gì đó mà chỉ hiện khi bấm nút test. Làm cho thông báo hiện ngay cả khi web app không chạy ngầm (trên đt) hoặc không dc bật (trên pc)

## Symptom

Khi bấm nút **Gửi thử thông báo** trong Cài đặt (`POST /api/push/test`), thiết bị nhận được Web Push bình thường; tuy nhiên khi người dùng đặt lịch nhắc thu nợ (`ReminderModal`) hoặc đến giờ tổng hợp thu nợ buổi sáng (`reminder_default_hour` / `next_due_date`), thông báo không tự xuất hiện. Ngoài ra, người dùng kỳ vọng thông báo phải bật lên ngay cả khi web app không chạy ngầm (trên điện thoại) hoặc trình duyệt/web app không được mở (trên PC).

## Reproduction

1. Mở **Cài đặt → Thông báo nhắc thu nợ trên thiết bị này**, bấm **Bật thông báo trên thiết bị này**, sau đó bấm **Gửi thử thông báo** → thông báo thử xuất hiện.
2. Mở **Sổ nợ → chọn khách hàng → Hẹn nhắc** (`ReminderModal`), đặt lịch vào một mốc giờ sắp tới (hoặc tạo đơn ghi nợ có `next_due_date` là hôm nay).
3. Đóng tab/thoát ứng dụng trên điện thoại hoặc đóng trình duyệt trên PC và chờ qua mốc giờ đã hẹn.
4. Quan sát: không có thông báo nhắc nợ xuất hiện. [NEEDS CLARIFICATION: Cần kiểm tra thêm trên Supabase Dashboard xem job `paytrack_reminder_dispatch` trong `cron.job_run_details` và `net._http_response` có đang trả lỗi 401/404 hay vẫn còn placeholder trong URL/secret hay không.]

## Suspected Code Paths

- `supabase/migrations/0003_reminder_cron.sql:19-32` — `pg_cron` job `paytrack_reminder_dispatch` chạy mỗi 5 phút (`*/5 * * * *`) gọi `net.http_post` tới `https://<YOUR_VERCEL_DOMAIN>/api/cron/reminders` với `Bearer <YOUR_CRON_SECRET>`. Đây là trigger duy nhất cho toàn bộ lịch hẹn & tổng hợp sáng; nếu cấu hình thực tế trên Supabase bị sai domain/secret, bị Vercel Protection chặn, hoặc job không chạy, không có bất kỳ cơ chế fallback hay cảnh báo nào.
- `src/app/api/cron/reminders/route.ts:20-82` — Chỉ export `POST` (không hỗ trợ `GET` của Vercel Cron nếu cần fallback); đánh dấu `debt_reminders.status = 'sent'` ngay cả khi `subList.length === 0` hoặc `sendPushToSubscriptions` trả về `sent === 0` (làm mất lịch hẹn âm thầm, không retry, không ghi log lỗi).
- `src/app/api/cron/reminders/route.ts:85-131` — Cập nhật `shop_profiles.last_digest_sent_date = todayVN` **bên ngoài** điều kiện `if (count > 0)` (dòng 127–130). Nếu cron chạy lúc 08:35 khi chưa có khách đến hạn (`count === 0`), trường `last_digest_sent_date` vẫn bị đánh dấu đã gửi cho cả ngày hôm đó; các đơn ghi nợ hẹn thu hôm nay được tạo sau 08:35 sẽ không bao giờ nhận được digest trong ngày.
- `src/lib/push.ts:14-27, 48-77` — `ensureVapidConfigured()` dùng fallback `'mailto:support@paytrack.local'` nếu thiếu `VAPID_SUBJECT` (một số push service như Apple APNs có thể từ chối domain `.local`); `webpush.sendNotification(...)` (dòng 51) không truyền options `{ TTL: 86400, urgency: 'high' }`, khiến APNs/FCM dễ hoãn hoặc bỏ qua wakeup khi thiết bị khóa màn hình/không chạy ngầm; khối `catch` (dòng 62–73) chỉ xử lý `410`/`404` và nuốt hoàn toàn mọi mã lỗi khác (`400`, `401`, `403`, `429`, `5xx`) mà không log.
- `src/components/debts/ReminderModal.tsx:55-66` — Lưu thẳng vào bảng `debt_reminders` với độ trễ polling của cron lên tới 5 phút (`*/5 * * * *`) mà không hiển thị trạng thái cron/thiết bị nhận push.
- `src/components/pwa/PushNotificationSetup.tsx:39-92, 94-139` — Chỉ kiểm tra `reg.pushManager.getSubscription()` phía trình duyệt, không đối chiếu lại với bảng `push_subscriptions` trên DB (trường hợp endpoint bị xóa trên server nhưng browser vẫn giữ subscription, hoặc đăng ký sai tài khoản/chưa cài ra Màn hình chính iOS/chưa bật chạy nền trình duyệt Windows).
- `public/sw.js:11-44` — Handler `push` gọi `self.registration.showNotification(...)` đúng chuẩn Apple APNs, nhưng chưa dùng `renotify: true` / `requireInteraction` cho nhắc nợ ưu tiên trên desktop.

## Root Cause Hypothesis

Có **2 nhóm nguyên nhân gốc** kết hợp (confidence: **high**):

1. **Chuỗi kích hoạt cron nhắc lịch (`pg_cron` → `/api/cron/reminders`) im lặng thất bại hoặc bỏ sót**: Nút **Gửi thử** gọi trực tiếp `POST /api/push/test` từ trình duyệt nên chạy ngay, trong khi nhắc lịch hoàn toàn phụ thuộc `pg_cron` + `pg_net` gọi `POST /api/cron/reminders`. Do `route.ts` không ghi log/lỗi, luôn đánh dấu `status = 'sent'` dù `sent === 0`, và luôn khóa `last_digest_sent_date = todayVN` kể cả khi `count === 0`, bất kỳ sai lệch nào ở `pg_cron`/`CRON_SECRET` hoặc thời điểm tạo đơn sau giờ digest đều khiến nhắc lịch không bao giờ hiển thị.
2. **Thiếu cờ ưu tiên wakeup cho Web Push nền & giới hạn nền tảng khi app tắt hẳn**: `webpush.sendNotification` thiếu `{ urgency: 'high', TTL: 86400 }`, rất quan trọng để Apple APNs (iPhone PWA iOS 16.4+) và FCM đánh thức Service Worker khi app bị vuốt tắt/không chạy ngầm. Trên Windows PC, Web Push hoạt động khi đóng tab/app nếu **cài PayTrack POS thành PWA** hoặc **bật chạy nền của Chrome/Edge** (*Continue running background apps when closed*) để dịch vụ đẩy của trình duyệt nhận tín hiệu từ WNS/FCM; nếu tắt hoàn toàn tiến trình trình duyệt và tắt chế độ chạy nền ở mức hệ điều hành, chuẩn Web Push trên trình duyệt web thuần túy không thể tự khởi động lại tiến trình OS.

## Proposed Remediation

**Preferred**:
1. **Gia cố `src/lib/push.ts`**:
   - Truyền `{ TTL: 86400, urgency: 'high' }` vào `webpush.sendNotification(...)` để APNs (iPhone) và FCM/WNS ưu tiên đánh thức Service Worker ngay cả khi PWA không chạy ngầm.
   - Trả về chi tiết lỗi (`failed`, `errors` có `statusCode` đã redact endpoint) và log server-side mọi lỗi push ngoài `404`/`410`. Dùng `VAPID_SUBJECT` hợp lệ (`https://paytrack-pos.vercel.app` hoặc `mailto:` domain thật thay vì `.local` fallback).
2. **Sửa logic dispatch & retry trong `src/app/api/cron/reminders/route.ts`**:
   - Chỉ cập nhật `debt_reminders.status = 'sent'` khi `res.sent > 0` (hoặc khi `subList.length > 0` và gửi thành công tối thiểu 1 thiết bị); nếu `subList.length === 0` hoặc `res.sent === 0`, giữ `pending` (hoặc thêm cột `last_error`/`attempt_count` nếu cần) và log nguyên nhân để không làm mất lịch hẹn âm thầm.
   - Di chuyển lệnh cập nhật `shop_profiles.last_digest_sent_date = todayVN` vào **bên trong** nhánh `if (count > 0 && digestSent > 0)` để không tự khóa digest khi đầu ngày chưa có nợ đến hạn.
   - Hỗ trợ cả `GET` (tương thích Vercel Cron fallback) lẫn `POST` (Supabase `pg_cron`), đồng thời đổi tần suất `pg_cron` trong `0003_reminder_cron.sql` thành `* * * * *` (mỗi 1 phút — Supabase `pg_cron` hỗ trợ cron 1 phút) để lịch hẹn nổ đúng phút người dùng đặt thay vì trễ tới 5 phút.
3. **Nâng cấp chẩn đoán & đồng bộ trong `PushNotificationSetup.tsx` + `/api/push/subscribe` + `public/sw.js`**:
   - Khi mở Cài đặt (hoặc lúc app khởi động), tự đồng bộ lại `existing` PushSubscription lên `/api/push/subscribe` nếu DB chưa có bản ghi, hiển thị danh sách thiết bị đang nhận thông báo (`device_label`, `last_seen_at`) và trạng thái kiểm tra `pg_cron` gần nhất.
   - Bổ sung hướng dẫn rõ ngay trong UI cho **Windows (Edge/Chrome)**: nút/hướng dẫn cài đặt thành App (PWA) và bật *"Tiếp tục chạy ứng dụng nền khi đóng trình duyệt"* để nhận thông báo khi PC không mở web; và cho **iPhone**: xác minh mở từ icon Màn hình chính (standalone) + bật Thông báo trong Cài đặt iOS.
   - Trong `public/sw.js`, thêm `renotify: true` (khi có `tag` trùng) để OS luôn rung/báo lại thông báo mới.

**Alternatives**:
- *Thêm Vercel Cron (`vercel.json`)*: Trên gói Vercel Hobby chỉ cho phép tối đa 1 lần/ngày (`0 1 * * *` UTC), không đủ cho nhắc lịch theo giờ/phút; chỉ phù hợp làm backup digest sáng, còn `pg_cron` của Supabase (`* * * * *`) mới chạy được theo từng phút miễn phí.
- *Bọc app bằng Electron/Tauri trên Windows hoặc App native iOS*: Giải quyết được trường hợp tắt sạch 100% trình duyệt trên Windows không cần bật background mode của Chrome/Edge, nhưng phá vỡ kiến trúc PWA web-only hiện tại (tăng chi phí đóng gói, ký code, bảo trì).

**Files likely to change**:
- `src/lib/push.ts`
- `src/app/api/cron/reminders/route.ts`
- `src/app/api/push/subscribe/route.ts`
- `src/components/pwa/PushNotificationSetup.tsx`
- `public/sw.js`
- `supabase/migrations/0003_reminder_cron.sql` (cập nhật tần suất `* * * * *` và hướng dẫn kiểm tra `net._http_response`)

**Tests to add or update**:
- Unit test cho `src/app/api/cron/reminders/route.ts` (mock Supabase admin + `sendPushToSubscriptions`): xác nhận không đánh dấu `sent` khi `sent === 0`, không cập nhật `last_digest_sent_date` khi `count === 0`, và truyền `urgency: 'high'` + `TTL` trong `src/lib/push.ts`.

## Risks & Considerations

- **Supabase `pg_cron` trên production**: Việc sửa code Next.js chỉ có hiệu lực hoàn toàn sau khi xác minh job `paytrack_reminder_dispatch` trên project Supabase `mezuxaqvbtjbbtugsohm` đang dùng đúng URL `https://paytrack-pos.vercel.app/api/cron/reminders` và đúng `CRON_SECRET` khớp với Vercel (không còn placeholder `<YOUR_VERCEL_DOMAIN>` / `<YOUR_CRON_SECRET>`).
- **Giới hạn OS trên Windows & iOS**: Trên iOS 16.4+, PWA đã thêm vào Màn hình chính **có thể** nhận push khi app không chạy ngầm (qua APNs wakeup). Trên Windows, Chrome/Edge bắt buộc phải bật background service hoặc cài PWA để nhận push khi đóng hết cửa sổ.
- **Bảo mật**: Không được lộ `CRON_SECRET` hoặc `VAPID_PRIVATE_KEY` ra client khi thêm UI hiển thị trạng thái cron/thiết bị.

## Open Questions

- [NEEDS CLARIFICATION: Cần kiểm tra log `cron.job_run_details` và `net._http_response` trên Supabase project `mezuxaqvbtjbbtugsohm` để biết job `paytrack_reminder_dispatch` hiện tại đang trả HTTP status code nào (401, 404, hay chưa thay placeholder).]
- [NEEDS CLARIFICATION: Khi kiểm tra thực tế, bạn đặt lịch qua modal **Hẹn nhắc** (`ReminderModal`) hay qua **Ngày hẹn thu** lúc tạo đơn (`CheckoutModal`)? Trên iPhone (đã thêm ra Màn hình chính chưa) hay trên Windows Chrome/Edge?]
