# Bug Verification: Thông báo nhắc nợ đặt lịch không tự hiện và không gửi khi app đóng/không chạy ngầm

- **Slug**: scheduled-push-notifications
- **Tested**: 2026-11-17T09:28:54Z
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Toàn bộ kiểm tra mã nguồn cục bộ (`tsc --noEmit`, `eslint .`, `vitest run` 21/21 test — gồm 5 test mới cho cron nhắc nợ & `sendPushToSubscriptions`, `next build`, và `node --check public/sw.js`) đều **PASS** không lỗi. Tuy nhiên, kịch bản tái hiện end-to-end với `pg_cron` trên Supabase production + đẩy APNs/FCM khi đóng app trên iPhone PWA & Windows cần được chạy trên môi trường thật nên kết quả được giữ ở mức `partial`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Đặt lịch `ReminderModal` & đợi `pg_cron` gọi `https://paytrack-pos.vercel.app/api/cron/reminders` khi đóng app trên iPhone PWA & Windows | skipped | Cần deploy bản sửa lên Vercel + xác nhận `paytrack_reminder_dispatch` trên Supabase + thiết bị thật. |
| New / updated tests | `npm test` (`tests/unit/reminders-cron.test.ts`) | pass | 5/5 tests pass (`urgency: 'high'`, `TTL: 86400`, xóa `410`, không đánh dấu `sent` khi `sent === 0`, không khóa `last_digest_sent_date` khi `count === 0`). |
| Regression suite | `npm test && npm run build` | pass | `5 passed (5)` test files, `21 passed (21)` tests; `next build` compile thành công 13/13 route. |
| Lint / type-check | `npm run typecheck && npm run lint && node --check public/sw.js` | pass | `tsc --noEmit`, `eslint .`, và `node --check public/sw.js` đều exit code 0. |

## Output Excerpts

```text
 ✓ tests/unit/reminders-cron.test.ts (5 tests) 62ms
 Test Files  5 passed (5)
      Tests  21 passed (21)
✓ Compiled successfully in 9.7s
✓ Generating static pages using 1 worker (13/13) in 251ms
```

## Residual Risks

- Job `paytrack_reminder_dispatch` trên Supabase (`mezuxaqvbtjbbtugsohm`) phải được cập nhật & kiểm tra thực tế đang chạy lịch `* * * * *`, URL `https://paytrack-pos.vercel.app/api/cron/reminders` và đúng `CRON_SECRET` (`cron.job_run_details` / `net._http_response` HTTP 200).
- Trên Windows PC, Chrome/Edge cần cài PayTrack POS thành PWA hoặc bật *"Continue running background apps when closed"* để nhận Web Push khi đóng hết cửa sổ; trên iPhone, cần mở app từ icon Màn hình chính (iOS 16.4+).

## Recommendation

Hold — Local build, typecheck, lint, and all 21 unit tests pass; promote to `verified` after deploying to Vercel, confirming Supabase `paytrack_reminder_dispatch` returns HTTP 200, and verifying closed-app push delivery on iPhone PWA & Windows Chrome/Edge.
