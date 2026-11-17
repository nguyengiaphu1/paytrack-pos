# Bug Verification: Đặt lịch nhắc nợ và nhắc nợ tự động theo khung giờ không gửi Web Push (chỉ nút Gửi thử hoạt động)

- **Slug**: cron-reminders-not-firing
- **Tested**: 2026-11-17T08:14:00-08:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

Đã xác nhận thực tế trên môi trường Production (`https://paytrack-pos.vercel.app`) sau khi merge PR #4 (`9eaf3da`), deploy Vercel thành công (`state: success`) và cấu hình đúng URL/secret cho job `paytrack_reminder_dispatch` trên Supabase (`mezuxaqvbtjbbtugsohm`): cả hai luồng **đặt lịch nhắc nợ từng khách** và **tự động nhắc theo khung giờ mỗi ngày** đều đã gửi Web Push thành công ngay cả khi đóng app.

## Checks Performed

| Check | Command / Action | Result | Notes |
|---|---|---|---|
| Reproduction (post-fix) | Kiểm tra trên `https://paytrack-pos.vercel.app` & Supabase sau khi sửa `pg_cron` + merge PR #4 (`9eaf3da`): đặt lịch hẹn nhắc khách & bật nhắc tự động theo giờ khi đóng app | pass | Người dùng xác nhận cả đặt lịch nhắc nợ lẫn nhắc tự động theo giờ đều đã push thành công khi đóng app. |
| Production build & TypeScript | Vercel Preview (`6ab2952`) & Production (`9eaf3da`) deploy (`next build` + `tsc`) | pass | `Deployment has completed` (`state: success`). |
| Static syntax & UX/token checks | `node --check public/sw.js`, parse `vercel.json`, static UX/CSS/token guards trên 7 file `src/` đã sửa | pass | Không có lỗi cú pháp, banned token, CSS var thiếu hay interactive control `< 44px`. |
| Unit tests & ESLint (VM) | `npm test` (`vitest run`), `npm run lint` (`eslint .`) | not-run | VM thiếu `node_modules` và proxy sandbox chặn `registry.npmjs.org` (`403 Forbidden`). |

## Output Excerpts

```text
PR #4 merged into main (9eaf3da)
Vercel Production deployment: {"description":"Deployment has completed","state":"success"}
User live verification: Cả đặt lịch nhắc nợ và nhắc tự động theo giờ đều đã push thành công khi đóng app
```

## Residual Risks

- Bộ unit test Vitest (`tests/unit/reminders-cron.test.ts`) và `eslint .` chưa được chạy trong VM do giới hạn mạng npm của sandbox; nên chạy `npm ci && npm test && npm run lint` một lần trên máy local khi có dịp để khóa hồi quy tự động.

## Recommendation

Close the bug — Đã được xác nhận hoạt động end-to-end trên Production (`https://paytrack-pos.vercel.app` + Supabase `pg_cron`) cho cả đặt lịch từng khách và tự động nhắc theo khung giờ khi đóng app.
