# Bug Verification: Lỗi responsive trên điện thoại bị tràn chữ

- **Slug**: mobile-text-overflow
- **Tested**: 2026-11-17T09:28:54Z
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Toàn bộ kiểm tra mã nguồn cục bộ (`tsc --noEmit`, `eslint .`, `vitest run` 21/21 test — gồm 4 test kiểm tra các guard chống tràn mobile & quy tắc input `16px`, và `next build`) đều **PASS** không lỗi. Do chưa đo trực tiếp `scrollWidth <= innerWidth` trên trình duyệt di động `375×812` / `360×780`, kết quả được giữ ở mức `partial`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Kiểm tra DevTools mobile `375×812` & `360×780` (`scrollWidth <= innerWidth`) trên 5 tab, `"Chưa có giá vốn"`, `DebtCustomerDrawer`, `ReminderModal`, `QuickItemModal`, `ReceiptTemplate` | skipped | Cần mở trình duyệt/điện thoại thật kiểm tra trực quan sau khi deploy. |
| New / updated tests | `npm test` (`tests/unit/mobile-overflow-guards.test.ts`) | pass | 4/4 tests pass (KPI `"Chưa có giá vốn"`, lưới drawer/modal, `table-fixed` & `AppShell`, rule `font-size: 16px`). |
| Regression suite | `npm test && npm run build` | pass | `5 passed (5)` test files, `21 passed (21)` tests; `next build` compile thành công 13/13 route. |
| Lint / type-check | `npm run typecheck && npm run lint` | pass | `tsc --noEmit` và `eslint .` đều exit code 0. |

## Output Excerpts

```text
 ✓ tests/unit/mobile-overflow-guards.test.ts (4 tests) 4ms
 Test Files  5 passed (5)
      Tests  21 passed (21)
✓ Compiled successfully in 9.7s
✓ Generating static pages using 1 worker (13/13) in 251ms
```

## Residual Risks

- Hóa đơn khổ `80mm` và `A5` trên điện thoại với tên món dài hoặc số tiền 8–9 chữ số cần được rà soát trực quan khi chạy trình duyệt để chắc chắn không bị xuống dòng lệch cột.
- Các input `type="date"` / `type="time"` trên Safari iOS thực tế cần xác nhận không tràn khỏi thẻ ở chiều ngang `375px`.

## Recommendation

Hold — Local build, typecheck, lint, and all 21 unit tests pass; promote to `verified` after visual inspection at `375×812` / `360×780` and on real iPhone Safari confirms zero horizontal overflow or clipped text.
