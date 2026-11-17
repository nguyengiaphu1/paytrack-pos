# Bug Fix: Đặt lịch nhắc nợ và nhắc nợ tự động theo khung giờ không gửi Web Push (chỉ nút Gửi thử hoạt động)

- **Slug**: cron-reminders-not-firing
- **Fixed**: 2026-11-17T07:22:00-08:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Gia cố hệ thống nhắc thu nợ định kỳ để phát hiện và xử lý triệt để trường hợp `pg_cron` chưa chạy hoặc lỗi cấu hình: chuẩn hóa `getTodayVN(now)` và kiểm tra lỗi truy vấn trong `runReminderCron()`, thêm bảng theo dõi `cron_heartbeats` (`0004_cron_heartbeat.sql`), thêm `timeout_milliseconds := 10000` vào `0003_reminder_cron.sql`, thêm Vercel Cron dự phòng mỗi sáng (`0 1 * * *`), thêm endpoint `POST /api/push/dispatch-due`, và hiển thị cảnh báo lịch quá giờ + nút **Gửi lịch đến hạn ngay** trong `PushNotificationSetup`.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/vietnamese.ts` | modified | Cập nhật `getTodayVN(now: Date = new Date())` để tính đúng ngày VN theo tham số `now`. |
| `src/lib/reminders-cron.ts` | modified | Kiểm tra & throw lỗi truy vấn Supabase thay vì nuốt lỗi; truyền `now` vào `getTodayVN(now)`; thêm `normalizeHHMM`; hỗ trợ `options.userId`; thêm `recordCronHeartbeat()`. |
| `src/app/api/cron/reminders/route.ts` | modified | `.trim()` `CRON_SECRET` và header `Authorization`; bọc `try/catch` và ghi trạng thái vào `cron_heartbeats`. |
| `src/app/api/push/subscribe/route.ts` | modified | `GET` trả thêm `overdueReminders`, `dueCustomersToday`, và `cronHeartbeat` (an toàn ngay cả khi chưa chạy migration `0004`). |
| `src/app/api/push/dispatch-due/route.ts` | added | Endpoint `POST` cho người dùng đã đăng nhập tự chạy `runReminderCron(new Date(), { userId: user.id })`. |
| `src/components/pwa/PushNotificationSetup.tsx` | modified | Hiển thị cảnh báo khi `cronHeartbeat` lỗi hoặc có lịch quá giờ chưa gửi; hiển thị số khách đến hạn hôm nay & lần chạy cron gần nhất; thêm nút **Gửi lịch đến hạn ngay**. |
| `src/app/(app)/settings/page.tsx` | modified | Làm rõ mô tả điều kiện gửi tổng hợp ngày (khách còn nợ có `Ngày hẹn thu` hôm nay hoặc quá hạn). |
| `supabase/migrations/0003_reminder_cron.sql` | modified | Thêm `timeout_milliseconds := 10000` cho `net.http_post` và bổ sung câu SQL kiểm tra `cron.job` + `cron_heartbeats`. |
| `supabase/migrations/0004_cron_heartbeat.sql` | added | Tạo bảng `public.cron_heartbeats` với RLS chỉ cho `authenticated` đọc và `service_role` ghi. |
| `vercel.json` | modified | Thêm Vercel Cron dự phòng `0 1 * * *` (08:00 sáng VN hằng ngày) gọi `/api/cron/reminders`. |
| `tests/unit/reminders-cron.test.ts` | modified | Cập nhật `makeFakeAdmin` hỗ trợ mô phỏng lỗi & lọc `userId`; thêm 3 unit test mới. |

## Diff Highlights (optional)

```ts
// src/lib/reminders-cron.ts
const { data: pendingReminders, error: remindersError } = await remindersQuery.limit(100);
if (remindersError) {
  console.error('[cron/reminders] failed querying debt_reminders', remindersError);
  throw new Error(`Không thể truy vấn debt_reminders: ${remindersError.message}`);
}
```

```ts
// src/app/api/push/dispatch-due/route.ts
const summary = await runReminderCron(new Date(), { userId: user.id });
return NextResponse.json(summary);
```

## Tests Added or Updated

- `tests/unit/reminders-cron.test.ts::derives todayVN from passed now across VN midnight and normalizes single-digit HH:MM` — Kiểm tra `getTodayVN(now)` qua ranh giới nửa đêm VN và `normalizeHHMM('8:30')`.
- `tests/unit/reminders-cron.test.ts::throws an explicit error when Supabase query fails instead of silently returning 0` — Đảm bảo lỗi truy vấn Supabase không bị nuốt âm thầm.
- `tests/unit/reminders-cron.test.ts::scopes reminders and daily digest strictly to userId when options.userId is provided` — Đảm bảo `/api/push/dispatch-due` chỉ xử lý dữ liệu của đúng người dùng đang đăng nhập.

## Local Verification

- Commands run:
  - `node --check public/sw.js` → pass (exit code 0).
  - `node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))"` → pass (`vercel.json valid`).
  - Static Node check cho UX/CSS/Token guards trên 7 file `src/` đã sửa → pass (không có banned token, không có CSS var thiếu, không có interactive control `< 44px`).
  - `npm run typecheck && npm run lint && npm test && npm run build` → **blocked trong VM** (`tsc: not found` do chưa có `node_modules`; `npm ci` trả `403 Forbidden` từ proxy sandbox đối với `registry.npmjs.org`). Cần chạy lại đầy đủ trên máy local / CI có `node_modules` trước khi merge PR.
- Manual checks: Đã rà soát kỹ luồng Next.js App Router exports, RLS policy trên `cron_heartbeats`, và khả năng tương thích ngược khi `0004_cron_heartbeat.sql` chưa chạy trên production.

## Deviations from Assessment

- Bổ sung nhánh xử lý an toàn khi truy vấn `cron_heartbeats` trong `/api/push/subscribe` (`GET`) và `recordCronHeartbeat` (`reminders-cron.ts`) để ứng dụng không bị lỗi HTTP 500 nếu deploy code lên Vercel trước khi chạy migration `0004_cron_heartbeat.sql` trên Supabase.

## Follow-ups

- Chạy `npm ci && npm run typecheck && npm run lint && npm test && npm run build` trên máy local hoặc CI có mạng tới `registry.npmjs.org`.
- Trên **Supabase Dashboard (`mezuxaqvbtjbbtugsohm`) → SQL Editor**:
  1. Chạy [`supabase/migrations/0004_cron_heartbeat.sql`](../../supabase/migrations/0004_cron_heartbeat.sql).
  2. Chỉnh [`supabase/migrations/0003_reminder_cron.sql`](../../supabase/migrations/0003_reminder_cron.sql) với domain thật `paytrack-pos.vercel.app` và `CRON_SECRET` khớp **Vercel → Settings → Environment Variables (Production)** rồi chạy để kích hoạt job `paytrack_reminder_dispatch` (`* * * * *`).
  3. Kiểm tra lại bằng `SELECT status_code, content, error_msg FROM net._http_response ORDER BY created DESC LIMIT 5;` và `SELECT * FROM public.cron_heartbeats;`.
- Cập nhật `PROJECT_CONTEXT.md` sau khi hoàn tất verify / merge.
