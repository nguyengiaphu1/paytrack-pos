# Bug Fix: Thông báo nhắc nợ đặt lịch không tự hiện và không gửi khi app đóng/không chạy ngầm

- **Slug**: scheduled-push-notifications
- **Fixed**: 2026-11-17T09:20:32Z
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Gia cố toàn bộ luồng gửi Web Push nhắc nợ định kỳ (`src/lib/push.ts`, `src/lib/reminders-cron.ts`, `/api/cron/reminders`, `supabase/migrations/0003_reminder_cron.sql`, `public/sw.js`) để ưu tiên đánh thức Service Worker ngay cả khi PWA không chạy ngầm (`urgency: 'high'`, `TTL: 86400`), không đánh dấu `sent` / không tự khóa digest sáng khi chưa gửi được thông báo, tự đồng bộ subscription giữa trình duyệt và database, và bổ sung hướng dẫn cấu hình PWA/chạy nền rõ ràng cho iPhone & Windows.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/push.ts` | modified | Dùng `VAPID_SUBJECT` mặc định `https://paytrack-pos.vercel.app` (thay `.local`), thêm `{ TTL: 86400, urgency: 'high' }`, trả `SendPushResult` (`sent`, `removed`, `failed`, `errors`) và log lỗi push ngoài `404`/`410`. |
| `src/lib/reminders-cron.ts` | added | Tách logic `getCurrentTimeHHMM_VN` (chuẩn hóa giờ `'24'` lúc nửa đêm sang `'00'`) và `runReminderCron`: chỉ cập nhật `debt_reminders.status = 'sent'` khi `res.sent > 0`; chỉ cập nhật `shop_profiles.last_digest_sent_date` khi `count > 0` và `res.sent > 0`. |
| `src/app/api/cron/reminders/route.ts` | modified | Ủy quyền cả `POST` và `GET` cho `runReminderCron()`, giữ route handler chỉ export HTTP methods hợp lệ theo chuẩn Next.js App Router. |
| `src/app/api/push/subscribe/route.ts` | modified | Thêm `GET` handler trả về danh sách thiết bị đã đăng ký (`push_subscriptions`) và số `pendingReminders` của người dùng. |
| `src/components/pwa/PushNotificationSetup.tsx` | modified | Tự đồng bộ lại `PushSubscription` hiện có từ trình duyệt lên `/api/push/subscribe` nếu thiếu trên DB; hiển thị số thiết bị nhận thông báo, số lịch hẹn chờ và hướng dẫn bật chạy nền cho iPhone PWA & Windows Chrome/Edge. |
| `public/sw.js` | modified | Thêm `renotify: true` và `vibrate: [200, 100, 200]` trong `showNotification`. |
| `supabase/migrations/0003_reminder_cron.sql` | modified | Đổi lịch `pg_cron` từ `*/5 * * * *` sang `* * * * *` (mỗi phút) và bổ sung chú thích SQL kiểm tra `cron.job_run_details` / `net._http_response`. |
| `tests/unit/reminders-cron.test.ts` | added | Unit test mock `web-push` và Supabase admin client kiểm tra toàn bộ điều kiện gửi, dọn endpoint `410`, và không đánh dấu `sent`/`last_digest_sent_date` sai. |

## Diff Highlights (optional)

```ts
// src/lib/push.ts
await webpush.sendNotification(
  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
  jsonPayload,
  { TTL: 86400, urgency: 'high' }
);
```

```ts
// src/lib/reminders-cron.ts
if (res.sent > 0) {
  await admin
    .from('debt_reminders')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', rem.id);
} else {
  customFailed += 1;
}
```

## Tests Added or Updated

- `tests/unit/reminders-cron.test.ts::normalizes Asia/Ho_Chi_Minh HH:MM including midnight hour` — Kiểm tra chuẩn hóa múi giờ VN `00:05` thay vì `24:05`.
- `tests/unit/reminders-cron.test.ts::sends Web Push with urgency=high, TTL=86400, valid subject fallback, and cleans 410 endpoints` — Xác nhận truyền `TTL: 86400`, `urgency: 'high'`, fallback `VAPID_SUBJECT` hợp lệ, xóa endpoint `410`, và ghi nhận lỗi `500`.
- `tests/unit/reminders-cron.test.ts::does not mark debt_reminders as sent when user has no subscriptions or push fails` — Đảm bảo không làm mất lịch hẹn âm thầm khi `sent === 0`.
- `tests/unit/reminders-cron.test.ts::marks reminder sent when delivered and dismisses reminders when customer debt is 0` — Xác nhận `dismissed` khi hết nợ và `sent` khi gửi thành công.
- `tests/unit/reminders-cron.test.ts::updates last_digest_sent_date ONLY when due customers exist and push succeeds` — Đảm bảo không khóa digest cả ngày khi sáng sớm chưa có khách đến hạn.

## Local Verification

- Commands run:
  - `node --check public/sw.js` → pass (exit code 0).
  - `npm ci` → pass (`added 487 packages`, 0 vulnerabilities).
  - `npm run typecheck && npm run lint && npm test && npm run build` → pass (`tsc --noEmit` 0 lỗi, `eslint .` 0 lỗi, Vitest `5 passed (5)` / `21 passed (21)` gồm 5 test trong `tests/unit/reminders-cron.test.ts`, `next build` thành công 13/13 route).
- Manual checks: Đã rà soát tĩnh luồng push, cron dispatch và Service Worker theo quy tắc Next.js App Router và TypeScript strict.

## Deviations from Assessment

- Tách phần nghiệp vụ `runReminderCron` và `getCurrentTimeHHMM_VN` từ `src/app/api/cron/reminders/route.ts` sang file mới `src/lib/reminders-cron.ts` để `route.ts` chỉ export `POST` và `GET` (Next.js App Router build cấm export helper tùy ý từ `route.ts`) và giúp unit test import trực tiếp dễ dàng hơn.

## Follow-ups

- Chạy `npm ci && npm run typecheck && npm run lint && npm test && npm run build` ở môi trường có quyền truy cập `registry.npmjs.org` (local máy người dùng hoặc Vercel build).
- Trên Supabase Dashboard (`mezuxaqvbtjbbtugsohm`), chạy lại SQL cập nhật job `paytrack_reminder_dispatch` với tần suất `* * * * *`, URL thật `https://paytrack-pos.vercel.app/api/cron/reminders`, và `CRON_SECRET` khớp Vercel; kiểm tra `cron.job_run_details` và `net._http_response` xác nhận HTTP 200.
- Trên iPhone: mở từ icon **PayTrack POS** ngoài Màn hình chính và bật lại thông báo; trên Windows Chrome/Edge: cài app PWA hoặc bật *Continue running background apps when Google Chrome/Edge is closed*.
