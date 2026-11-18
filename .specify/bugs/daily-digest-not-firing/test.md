# Bug Verification: Xác minh sửa lỗi lưu cài đặt & báo tổng hợp khách đến hạn mỗi ngày

- **Slug**: daily-digest-not-firing
- **Tested**: 2026-11-17T16:57:30-08:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Tất cả các kiểm tra logic thuần (`normalizeHHMM`, `getCurrentTimeHHMM_VN`, `shouldResetDigestSentDate`), ranh giới client/server, và toàn bộ guard thiết kế/UX trên `53` file trong `src/` đều đạt (`ALL_SANDBOX_CHECKS_PASSED`). Tuy nhiên kết quả tổng thể được đánh dấu `partial` vì môi trường sandbox không có `node_modules` (`tsc: not found`, `vitest: not found`, proxy chặn `registry.npmjs.org`) và chưa thực hiện tái hiện end-to-end trên trình duyệt + Vercel/Supabase Production lúc `07:30 PM`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|---|---|---|---|
| Reproduction (post-fix) | Kiểm tra tĩnh `SettingsFormBody` không còn `key={profile?.updated_at}`, vị trí `savedMsg` trước nút `Lưu tất cả cài đặt`, và luồng E2E `07:30 PM` trên thiết bị thật | partial (static pass / live E2E not-run) | Đã xác minh mã nguồn không còn remount mất `savedMsg`; cần test bấm Lưu & chờ Web Push lúc `07:30 PM` sau khi deploy lên Vercel/Production |
| New / updated logic assertions | `node --input-type=module` chạy trực tiếp `./src/lib/vietnamese.ts` (`normalizeHHMM`, `getCurrentTimeHHMM_VN`, `shouldResetDigestSentDate`) | pass | Xác minh chuẩn hóa AM/PM (`07:30 PM` → `19:30`), reset `last_digest_sent_date` khi đổi sang giờ tương lai trong ngày, không reset nhầm khi sửa field khác |
| Regression & UX guards | `node --input-type=module` quét toàn bộ 53 file `src/` (client/server boundary, banned AI-slop tokens, `var(--*)` CSS tokens, input `>= 16px`, control `>= 44px`) | pass | `ALL_SANDBOX_CHECKS_PASSED (53 src files scanned)` |
| Vitest suite | `npm test` (`vitest run`) | not-run | `sh: 1: vitest: not found` — sandbox thiếu `node_modules` và proxy chặn npm registry |
| Typecheck / Lint / Build | `npm run typecheck` (`tsc --noEmit`), `npm run lint`, `npm run build` | not-run | `sh: 1: tsc: not found` — cần chạy đầy đủ `npm ci && npm run typecheck && npm run lint && npm test && npm run build` trước khi merge PR |

## Output Excerpts

```text
ALL_SANDBOX_CHECKS_PASSED (53 src files scanned)
```

```text
> paytrack-pos@1.1.1 typecheck
> tsc --noEmit
sh: 1: tsc: not found

> paytrack-pos@1.1.1 test
> vitest run
sh: 1: vitest: not found
```

## Residual Risks

- `npm run typecheck && npm run lint && npm test && npm run build` chưa chạy được trong sandbox VM do thiếu `node_modules` — có thể phát hiện lỗi type nhỏ hoặc lint rule khi chạy trên máy có dependencies / Vercel Build.
- Trên dữ liệu thực tế Production, luồng tự gửi tổng hợp lúc `07:30 PM` (`19:30`) vẫn phụ thuộc vào việc cửa hàng có ít nhất 1 khách `total_debt > 0 AND next_due_date <= todayVN`, thiết bị còn subscription hợp lệ trong `push_subscriptions`, và job `pg_cron` (`paytrack_reminder_dispatch`) đang hoạt động (nay có thể kiểm tra trực tiếp qua dòng `Tổng hợp mỗi ngày: ...` và `Kiểm tra lịch tự động gần nhất` trong mục 2 trang Cài đặt).

## Recommendation

Hold — giữ trạng thái `partial` tại sandbox; cần đẩy nhánh `fix/daily-digest-not-firing` lên GitHub / chạy `npm ci && npm run typecheck && npm run lint && npm test && npm run build` ở môi trường có npm registry (hoặc kiểm tra Vercel Build), sau đó test thủ công trên `/settings` (đổi giờ sang `07:30 PM` → bấm **Lưu tất cả cài đặt** xác nhận hiện banner thành công + xác nhận nhận được Web Push khi tới giờ).
