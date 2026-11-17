# Bug Verification: Tốc độ chuyển đổi giữa các tab chậm

- **Slug**: slow-tab-navigation
- **Tested**: 2026-11-17T09:28:54Z
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Toàn bộ kiểm tra mã nguồn cục bộ (`tsc --noEmit`, `eslint .`, `vitest run` 21/21 test — gồm 3 test kiến trúc cache & single-realtime, `next build`, và kiểm tra JSON `vercel.json`) đều **PASS** không lỗi. Do chưa đo thời gian chuyển đổi 5 tab thực tế trên bản deploy Vercel `sin1` kèm phiên đăng nhập Supabase thật, kết quả được giữ ở mức `partial`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Chuyển qua lại 5 tab `/`, `/debts`, `/orders`, `/stats`, `/settings` trên bản live và kiểm tra chuyển cảnh từ cache | skipped | Cần deploy lên Vercel (`sin1`) + đăng nhập kiểm tra trên thiết bị thật. |
| New / updated tests | `npm test` (`tests/unit/tab-cache-architecture.test.ts`) | pass | 3/3 tests pass (`PosDataProvider`, `loading.tsx`, 1 kênh Realtime `'shell-sync'`, `prefetch={true}`, `vercel.json` `sin1`). |
| Regression suite | `npm test && npm run build` | pass | `5 passed (5)` test files, `21 passed (21)` tests; `next build` compile thành công 13/13 route. |
| Lint / type-check | `npm run typecheck && npm run lint` | pass | `tsc --noEmit` và `eslint .` đều exit code 0. |

## Output Excerpts

```text
 ✓ tests/unit/tab-cache-architecture.test.ts (3 tests) 5ms
 Test Files  5 passed (5)
      Tests  21 passed (21)
✓ Compiled successfully in 9.7s
✓ Generating static pages using 1 worker (13/13) in 251ms
```

## Residual Risks

- Nếu gói Vercel hiện tại không hỗ trợ khai báo `"regions": ["sin1"]` trong `vercel.json`, bước deploy Vercel có thể báo lỗi hoặc bỏ qua cấu hình region.
- Cần xác nhận trên UI thực tế rằng mọi mutation (lên đơn, thu nợ, hủy đơn, sửa món, lưu cài đặt) đều cập nhật cache tức thì trên các tab còn lại.

## Recommendation

Hold — Local build, typecheck, lint, and all 21 unit tests pass; promote to `verified` after deploying to Vercel and confirming instant cached tab switching across all 5 routes on mobile and desktop.
