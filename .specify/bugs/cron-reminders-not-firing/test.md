# Bug Verification: Đặt lịch nhắc nợ và nhắc nợ tự động theo khung giờ không gửi Web Push (chỉ nút Gửi thử hoạt động)

- **Slug**: cron-reminders-not-firing
- **Tested**: 2026-11-17T07:34:00-08:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Các kiểm tra tĩnh trong VM (`node --check public/sw.js`, parse `vercel.json`, kiểm tra migration SQL và rà soát static UX/CSS/token guards trên 7 file `src/` đã sửa) đều đạt. Tuy nhiên, bộ kiểm tra `npm run typecheck && npm run lint && npm test && npm run build` chưa chạy được trong VM do không có `node_modules` và proxy sandbox chặn `registry.npmjs.org` (`403 Forbidden`), đồng thời kịch bản tái hiện thực tế trên Vercel Production + Supabase `pg_cron` chưa được thực thi nên kết quả được ghi nhận ở mức `partial`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|---|---|---|---|
| Reproduction (post-fix) | Deploy `fix/cron-reminders-not-firing` lên Vercel, chạy `0004_cron_heartbeat.sql` + `0003_reminder_cron.sql` trên Supabase và thử đặt lịch + tổng hợp sáng trên thiết bị thật | skipped | Cần commit/push nhánh, mở PR/deploy Vercel và kiểm tra trực tiếp trên Supabase Dashboard (`mezuxaqvbtjbbtugsohm`). |
| New / updated tests | `npm test` (`tests/unit/reminders-cron.test.ts`) | not-run | VM thiếu `node_modules`; `npm ci` bị proxy sandbox chặn (`403 Forbidden` khi tải từ `registry.npmjs.org`). |
| Regression suite | `npm test && npm run build` | not-run | Cùng lý do môi trường VM không cài được dependencies npm. |
| Lint / type-check | `npm run typecheck && npm run lint` | not-run | `tsc: not found` do chưa có `node_modules`. |
| Static syntax & UX/token checks | `node --check public/sw.js`, parse `vercel.json`, kiểm tra `0003`/`0004` SQL & static UX/CSS/token guards trên 7 file `src/` đã sửa | pass | Không có lỗi cú pháp SW/JSON, không có banned token, không có CSS variable thiếu, không có interactive control `< 44px`. |

## Output Excerpts

```text
vercel.json ok
sql3 timeout: true
sql4 table: true
Static UX/CSS/Token guards passed on all 7 modified src files
npm ci -> 403 Forbidden - GET https://registry.npmjs.org/zod-validation-error/-/zod-validation-error-4.0.2.tgz
```

## Residual Risks

- Mã sửa lỗi hiện nằm cục bộ trên nhánh `fix/cron-reminders-not-firing` (chưa commit/push/deploy lên Vercel), nên trang live `https://paytrack-pos.vercel.app` chưa có UI cảnh báo quá giờ, nút **Gửi lịch đến hạn ngay**, hay `POST /api/push/dispatch-due`.
- Nếu trên Supabase `mezuxaqvbtjbbtugsohm` mới chỉ chạy `0004_cron_heartbeat.sql` (hoặc chưa thay `<YOUR_VERCEL_DOMAIN>` / `<YOUR_CRON_SECRET>` trong `0003_reminder_cron.sql`), `pg_cron` vẫn chưa thể gọi thành công `/api/cron/reminders`.
- Chưa chạy `tsc --noEmit`, `eslint .`, `vitest run` và `next build` nên chưa xác nhận build/test tự động bằng công cụ compiler/bundler.

## Recommendation

Hold — Chạy `npm ci && npm run typecheck && npm run lint && npm test && npm run build` ở môi trường local/CI có mạng npm trước khi commit & mở PR từ `fix/cron-reminders-not-firing` vào `main`. Sau khi Vercel deploy bản mới, kiểm tra trên Supabase SQL Editor cả `0004_cron_heartbeat.sql` lẫn `0003_reminder_cron.sql` (với URL `paytrack-pos.vercel.app` và `CRON_SECRET` thật) và đối chiếu `net._http_response` + `public.cron_heartbeats` trước khi nâng kết quả lên `verified`.
