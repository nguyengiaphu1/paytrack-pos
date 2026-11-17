# Bug Assessment: Đặt lịch nhắc nợ và nhắc nợ tự động theo khung giờ không gửi Web Push (chỉ nút Gửi thử hoạt động)

- **Slug**: cron-reminders-not-firing
- **Created**: 2026-11-17T07:15:00-08:00
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> vẫn lỗi thông báo không push được, duy nhất chỉ có nút gửi thử thông báo là push notification được còn ví dụ đặt lịch nhắc nợ hay auto nhắc nợ 1 khung giờ mỗi ngày không push notification

(Thông tin bổ sung từ người dùng: chưa chạy lại SQL `supabase/migrations/0003_reminder_cron.sql` trên Supabase Dashboard và chưa kiểm tra log `cron.job_run_details` / `net._http_response` hay Vercel Logs.)

## Symptom

Trong màn hình **Cài đặt → 2. Thông báo nhắc thu nợ trên thiết bị này**, nút **Gửi thử thông báo** (`POST /api/push/test`) gửi được Web Push tới thiết bị bình thường. Tuy nhiên, cả hai luồng gửi tự động theo lịch:
1. Đặt lịch hẹn nhắc cho từng khách qua **Hẹn nhắc** (`ReminderModal` → bảng `debt_reminders`), và
2. Tự động nhắc tổng hợp công nợ mỗi ngày theo khung giờ cấu hình (`Settings` → `shop_profiles.reminder_digest_enabled` / `reminder_default_hour`)

đều không kích hoạt push notification.

## Reproduction

1. Mở **Cài đặt**, bật thông báo trên thiết bị và bấm **Gửi thử thông báo** → thiết bị nhận được push notification (`POST /api/push/test` trả `sent >= 1`).
2. Vào **Sổ nợ**, mở chi tiết khách còn nợ → bấm **Hẹn nhắc** (`ReminderModal`) chọn ngày/giờ sắp tới và lưu; hoặc bật **Báo tổng hợp khách đến hạn mỗi sáng** trong **Cài đặt** với giờ nhắc sắp tới (và có khách nợ với `next_due_date <= hôm nay`).
3. Chờ qua mốc giờ đã đặt (kể cả khi mở app hay đóng app).
4. Quan sát: không có thông báo push nào được gửi đi; trong **Cài đặt** vẫn hiển thị `X lịch hẹn đang chờ` tăng dần nhưng không có cảnh báo lỗi cron nào.

## Suspected Code Paths

- `supabase/migrations/0003_reminder_cron.sql:19-32` — `pg_cron` job `paytrack_reminder_dispatch` là trigger định kỳ duy nhất gọi `/api/cron/reminders`, nhưng file SQL vẫn chứa placeholder (`https://<YOUR_VERCEL_DOMAIN>/api/cron/reminders`, `Bearer <YOUR_CRON_SECRET>`) phải sửa tay và chạy thủ công trong Supabase SQL Editor. Ngoài ra, `net.http_post(...)` chưa cấu hình `timeout_milliseconds := 10000` (mặc định `pg_net` 2000–5000ms dễ timeout khi Vercel serverless cold start).
- `vercel.json:1-5` — Chỉ cấu hình `"regions": ["sin1"]`, chưa có `crons` dự phòng (`0 1 * * *` UTC = 08:00 sáng VN mỗi ngày, tương thích Vercel Hobby) để đảm bảo digest sáng vẫn chạy kể cả khi `pg_cron` chưa được cấu hình lại.
- `src/app/api/cron/reminders/route.ts:4-14` — So sánh `authHeader !== \`Bearer ${secret}\`` trực tiếp không `.trim()`, dễ trả `401 Unauthorized` nếu `CRON_SECRET` trên Vercel hoặc Supabase có khoảng trắng/newline thừa; không ghi nhận heartbeat/trạng thái lần chạy cron gần nhất để UI chẩn đoán.
- `src/lib/reminders-cron.ts:31-167` —
  - Các truy vấn Supabase ở dòng `44`, `65`, `102`, `111`, `127` bỏ qua biến `error`, nên nếu thiếu/sai `SUPABASE_SERVICE_ROLE_KEY` hoặc lỗi truy vấn sẽ âm thầm trả về `0` thay vì báo lỗi.
  - Dòng `34`: `getTodayVN()` không nhận tham số `now`, nên `runReminderCron(now)` luôn lấy `new Date()` thay vì ngày VN tương ứng với `now`.
  - Dòng `111-118`: Luồng tổng hợp sáng chỉ đếm khách có `next_due_date IS NOT NULL AND next_due_date <= todayVN`, dễ gây hiểu nhầm nếu shop có khách nợ nhưng chưa đặt `next_due_date`.
- `src/app/api/push/subscribe/route.ts:25-45` — `GET` chỉ trả tổng `pendingReminders` mà không phân biệt số lịch đã **quá giờ hẹn** (`scheduled_for < now - 2m`) và không trả trạng thái cron heartbeat (`lastCronRunAt` / `lastCronError`).
- `src/components/pwa/PushNotificationSetup.tsx:361-386` — Hiển thị badge xanh **Đã bật** và `X lịch hẹn đang chờ` mà không cảnh báo khi có lịch hẹn quá giờ chưa được xử lý (dấu hiệu rõ nhất cho thấy `pg_cron` chưa chạy hoặc gọi `/api/cron/reminders` thất bại), và thiếu nút tự kiểm tra/đẩy các lịch đã đến hạn từ UI để xác minh luồng `runReminderCron()`.

## Root Cause Hypothesis

Nguyên nhân gốc trực tiếp khiến **chỉ nút Gửi thử hoạt động** còn **đặt lịch nhắc & nhắc tự động hằng ngày đều không chạy** là do sự đứt gãy ở lớp kích hoạt định kỳ (confidence: **high**):

1. `POST /api/push/test` chạy trực tiếp từ trình duyệt của người dùng nên không phụ thuộc vào cron hay `CRON_SECRET`, chứng minh VAPID keys, `push_subscriptions` và Service Worker (`public/sw.js`) trên thiết bị đều đang hoạt động đúng.
2. Toàn bộ `debt_reminders` (đặt lịch từng khách) và `reminder_default_hour` (tổng hợp tự động mỗi ngày) chỉ được xử lý khi `/api/cron/reminders` được gọi từ bên ngoài. Do `supabase/migrations/0003_reminder_cron.sql` chưa được chạy lại trên Supabase với URL/secret thật (hoặc `pg_cron`/`pg_net` chưa kích hoạt thành công tới Vercel), `/api/cron/reminders` không hề được thực thi.
3. Mã nguồn hiện tại thiếu hoàn toàn **cơ chế tự chẩn đoán và fallback**: không lưu dấu vết lần chạy cron gần nhất, không cảnh báo khi có lịch `pending` bị quá giờ trên `PushNotificationSetup`, không có `vercel.json` cron backup cho digest sáng, và `runReminderCron` nuốt lỗi truy vấn Supabase.

## Proposed Remediation

**Preferred**:
1. **Thêm khả năng tự chẩn đoán cron & phát hiện lịch quá hạn bị kẹt**:
   - Tạo migration mới (ví dụ `0004_cron_heartbeat.sql`) bổ sung bảng `cron_heartbeats` (hoặc cột trạng thái hệ thống chỉ service-role ghi, user đọc được trạng thái tổng hợp qua API `/api/push/subscribe`) lưu `last_run_at`, `last_status`, `last_summary` / `last_error` mỗi khi `/api/cron/reminders` chạy.
   - Trong `src/app/api/push/subscribe/route.ts` (`GET`), tính thêm `overdueReminders` (`status = 'pending' AND scheduled_for <= now - 2 phút`) và đọc `lastCronRunAt` / `lastCronError` để trả về cho UI.
   - Trong `src/components/pwa/PushNotificationSetup.tsx`, nếu `overdueReminders > 0` hoặc `lastCronRunAt` quá cũ/chưa từng chạy, hiển thị cảnh báo rõ bằng tiếng Việt dễ hiểu (kèm hướng dẫn kiểm tra `pg_cron` trên Supabase) và nút **"Kiểm tra & gửi lịch đến hạn ngay"** (`POST /api/push/dispatch-due` xác thực theo phiên đăng nhập `user.id`, chỉ xử lý nhắc đến hạn của chính cửa hàng đang đăng nhập) để chủ tiệm kiểm tra luồng nhắc lịch và giải phóng lịch bị kẹt ngay lập tức.
2. **Gia cố `/api/cron/reminders`, `runReminderCron()`, và `0003_reminder_cron.sql`**:
   - Chuẩn hóa `.trim()` cho `CRON_SECRET` và header `Authorization` trong `src/app/api/cron/reminders/route.ts`, đồng thời ghi heartbeat khi chạy (kể cả khi có lỗi để dễ debug).
   - Cập nhật `getTodayVN(now?: Date)` trong `src/lib/vietnamese.ts` và truyền `now` từ `runReminderCron(now)` để ngày VN nhất quán; kiểm tra & throw/ghi nhận `error` từ các truy vấn Supabase trong `src/lib/reminders-cron.ts`.
   - Cập nhật `supabase/migrations/0003_reminder_cron.sql` thêm `timeout_milliseconds := 10000` cho `net.http_post` (tránh timeout khi cold start) và kèm SQL kiểm tra 1-click rõ ràng.
3. **Thêm Vercel Cron fallback cho tổng hợp sáng**:
   - Thêm `"crons": [{ "path": "/api/cron/reminders", "schedule": "0 1 * * *" }]` vào `vercel.json` (08:00 sáng VN hằng ngày, miễn phí trên gói Vercel Hobby) làm lớp dự phòng cho thông báo tổng hợp sáng ngay cả khi `pg_cron` chưa được cấu hình (Vercel tự gửi `Authorization: Bearer $CRON_SECRET` khi biến môi trường `CRON_SECRET` đã đặt trên Vercel).
4. **Làm rõ điều kiện nhắc tự động hằng ngày trong UI Cài đặt**:
   - Trong `src/app/(app)/settings/page.tsx` và `PushNotificationSetup.tsx`, ghi rõ thông báo tự động mỗi sáng tổng hợp các khách **đang có nợ và có "Ngày hẹn thu" (`next_due_date`) đến hạn/quá hạn hôm nay**, và hiển thị số khách đến hạn hôm nay nếu cần.

**Alternatives**:
- *Gọi cron ngầm khi người dùng mở app (client-side polling)*: Chỉ chạy khi người dùng mở web/PWA, không đáp ứng yêu cầu push khi app đóng hoàn toàn; chỉ nên dùng như cảnh báo trạng thái chứ không thay thế `pg_cron`.
- *Dùng dịch vụ cron ngoài (GitHub Actions / cron-job.org)*: Có thể gọi `/api/cron/reminders` mỗi 1–5 phút nếu Supabase `pg_cron` bị tắt, nhưng tăng phụ thuộc bên thứ 3 và phải lưu `CRON_SECRET` ở nơi khác; ưu tiên sửa và xác minh `pg_cron` trên Supabase trước.

**Files likely to change**:
- `src/lib/vietnamese.ts` (`getTodayVN(now?: Date)`)
- `src/lib/reminders-cron.ts` (bắt lỗi query Supabase, dùng `getTodayVN(now)`, tách hàm xử lý theo `userId` dùng chung cho cron & manual dispatch)
- `src/app/api/cron/reminders/route.ts` (`.trim()` secret, ghi `cron_heartbeats`)
- `src/app/api/push/subscribe/route.ts` (trả `overdueReminders` + trạng thái `cronHeartbeat`)
- `src/app/api/push/dispatch-due/route.ts` (endpoint mới cho user đăng nhập tự kiểm tra/gửi lịch đến hạn của chính mình)
- `src/components/pwa/PushNotificationSetup.tsx` (hiển thị trạng thái cron, cảnh báo lịch quá giờ bị kẹt, nút gửi lịch đến hạn ngay)
- `src/app/(app)/settings/page.tsx` (làm rõ mô tả điều kiện "khách có ngày hẹn thu đến hạn")
- `supabase/migrations/0003_reminder_cron.sql` (thêm `timeout_milliseconds := 10000`)
- `supabase/migrations/0004_cron_heartbeat.sql` (bảng `cron_heartbeats` + RLS)
- `vercel.json` (thêm Vercel Cron fallback `0 1 * * *`)
- `tests/unit/reminders-cron.test.ts` (thêm test cho `getTodayVN(now)`, lỗi DB query, và logic `dispatchDueForUser`)

**Tests to add or update**:
- Unit test `getTodayVN(now)` và `runReminderCron(now)` khi truyền mốc `now` cụ thể qua ranh giới ngày VN.
- Unit test xác nhận `runReminderCron` phát hiện và báo lỗi khi truy vấn Supabase trả `error` thay vì im lặng trả `0`.
- Unit test xác nhận logic dispatch thủ công theo `userId` chỉ xử lý lịch/digest của đúng người dùng đó.

## Risks & Considerations

- **Thao tác bắt buộc trên hạ tầng (Supabase Dashboard + Vercel)**: Dù thêm Vercel Cron (`0 1 * * *` = 1 lần/ngày), việc đặt lịch hẹn nhắc từng khách đúng phút/giờ (`ReminderModal`) **bắt buộc** phải có `pg_cron` trên Supabase (`mezuxaqvbtjbbtugsohm`) gọi `https://paytrack-pos.vercel.app/api/cron/reminders` với `CRON_SECRET` khớp Vercel Production (chạy SQL trong `0003_reminder_cron.sql` đã thay giá trị thật).
- **Bảo mật**: Bảng `cron_heartbeats` chỉ chứa metadata vận hành (`last_run_at`, `last_status`, `last_error` đã làm sạch, không chứa `CRON_SECRET` hay dữ liệu khách hàng); endpoint `/api/push/dispatch-due` phải kiểm tra `supabase.auth.getUser()` và giới hạn dữ liệu theo `user.id`.
- **Trùng lặp push**: Khi `Vercel Cron` (`0 1 * * *`) và `pg_cron` chạy cùng lúc ở phút 08:00 VN, việc cập nhật `debt_reminders.status = 'sent'` và `shop_profiles.last_digest_sent_date = todayVN` có thể gây race condition nhẹ nếu hai request song song — nên cân nhắc conditional update (`eq('status', 'pending')` + `.select('id')` hoặc advisory lock / tránh gửi trùng).

## Open Questions

- [NEEDS CLARIFICATION: Sau khi mở **Supabase SQL Editor** trên project `mezuxaqvbtjbbtugsohm`, kết quả của `SELECT jobname, schedule, active FROM cron.job;` và `SELECT status_code, error_msg FROM net._http_response ORDER BY created DESC LIMIT 10;` là gì?]
- [NEEDS CLARIFICATION: Biến `CRON_SECRET` trên **Vercel Production** đã được tạo và khớp với giá trị dùng trong `0003_reminder_cron.sql` chưa?]
