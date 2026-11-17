# Bug Fix: Lỗi responsive trên điện thoại bị tràn chữ

- **Slug**: mobile-text-overflow
- **Fixed**: 2026-11-17T09:20:32Z
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Chuẩn hóa bố cục responsive chống tràn chữ trên màn hình điện thoại (`360px–390px`, mốc `375px`) trên cả 5 tab và toàn bộ modal/drawer/hóa đơn: điều chỉnh cỡ chữ KPI trên `/stats`, đổi các lưới 3 cột/2 cột date-time chật chội sang stack hoặc 2+1 cột, đồng bộ `min-w-0 flex-1` + `break-words`/`truncate` cho văn bản dài và `shrink-0` cho số tiền/nút hành động, và dùng `table-fixed` cho bảng hóa đơn, vẫn giữ nguyên input `>= 16px` và tap target `>= 48px` theo `DESIGN.md`.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/app/(app)/stats/page.tsx` | modified | Cỡ chữ KPI responsive `text-[17px] sm:text-[20px]`, `"Chưa có giá vốn"` đổi sang `text-[14px] font-semibold sm:text-[15px]` (non-mono, `break-words`), input ngày tùy chọn stack dọc trên mobile (`grid-cols-1`). |
| `src/components/stats/DebtAgingCard.tsx` | modified | Thêm `min-w-0`, `flex-wrap`, `shrink-0` cho các dòng phân tuổi nợ. |
| `src/components/stats/PaymentBreakdownChart.tsx` | modified | Thêm `min-w-0`, `gap-2 flex-wrap`, `shrink-0` cho nhãn phương thức thanh toán. |
| `src/components/debts/DebtCustomerDrawer.tsx` | modified | Đổi 3 nút hành động sang `grid-cols-2 gap-2 sm:grid-cols-3` (`col-span-2 sm:col-span-1` cho nút `Hẹn nhắc`), thêm `min-w-0 flex-1`/`break-words`/`shrink-0` ở header, tổng nợ, lịch nhắc, đơn nợ và lịch sử thu. |
| `src/components/debts/ReminderModal.tsx` | modified | Đổi cặp ngày/giờ sang `grid-cols-1 gap-2.5 sm:grid-cols-2` với `min-w-0`; header dùng `min-w-0 truncate` + `shrink-0`. |
| `src/components/debts/CollectDebtModal.tsx` | modified | Header `min-w-0 truncate` + `shrink-0`, dòng nhãn `"Số tiền khách trả"` + nút `"Trả hết"` thêm `flex-wrap gap-2`. |
| `src/app/(app)/debts/page.tsx` | modified | KPI card dùng `min-w-0 break-words`; dòng khách nợ dùng `min-w-0 flex-1`, `break-words` trên tên khách, `shrink-0` trên badge/số tiền. |
| `src/app/(app)/orders/page.tsx` | modified | Header modal chi tiết đơn & danh sách món dùng `min-w-0 flex-1`/`break-words` + `shrink-0` cho số tiền và nút đóng. |
| `src/app/(app)/page.tsx` | modified | Thêm `min-w-0` cho cột danh mục, banner ngân hàng, thanh giỏ hàng mobile và sheet kiểm tra giỏ hàng. |
| `src/app/(app)/settings/page.tsx` | modified | Thêm `min-w-0` cho các ô lưới thông tin shop/ngân hàng, `break-words` cho nhãn checkbox và `shrink-0` cho nút đăng xuất. |
| `src/components/pos/CartPanel.tsx` | modified | Chuẩn hóa `min-w-0 flex-1`/`break-words` cho tên món trong giỏ và `shrink-0` cho cụm tăng giảm số lượng. |
| `src/components/pos/CheckoutModal.tsx` | modified | Chuẩn hóa header, nút phương thức thanh toán 2 cột (`leading-tight`), phần trả trước 1 phần (`grid-cols-1 sm:grid-cols-2`), và khối ghi nợ. |
| `src/components/pos/QuickItemModal.tsx` | modified | Đổi lưới `Số lượng / Đơn vị / Đơn giá *` từ `grid-cols-3` sang `grid-cols-2 gap-2.5 sm:grid-cols-3` (`col-span-2 sm:col-span-1` cho Đơn giá). |
| `src/components/pos/ProductFormModal.tsx` | modified | Thêm `gap-2`, `min-w-0 flex-1 truncate`, `shrink-0` trên header và `min-w-0` cho các ô grid 2 cột. |
| `src/components/pos/CustomerPicker.tsx` | modified | Thêm `min-w-0 flex-1`, `truncate`, `shrink-0` cho header modal, thanh tìm kiếm + nút `Khách mới`, và các dòng chọn khách. |
| `src/components/pos/ProductCatalog.tsx` | modified | Thêm `min-w-0`, `break-words`, `truncate` và `shrink-0` cho thẻ sản phẩm. |
| `src/components/invoice/InvoicePreviewModal.tsx` | modified | Thêm `min-w-0 truncate`/`shrink-0` trên header và tinh chỉnh padding/cỡ chữ 3 nút footer (`px-1.5 text-[12px] sm:text-[14px]`). |
| `src/components/invoice/ReceiptTemplate.tsx` | modified | Dùng `table-fixed` với tỉ lệ cột `42% / 12% / 21% / 25%` và `break-words`/`break-all` cho tên món, mã đơn, tên shop. |
| `src/components/qr/VietQRModal.tsx` | modified | Thêm `min-w-0`/`shrink-0`/`break-words` cho header, thông tin chuyển khoản và nút hành động. |
| `src/components/shell/AppShell.tsx` | modified | Thêm `shrink-0 whitespace-nowrap` cho `SyncStatusPill`, `w-full min-w-0` + `max-w-full truncate` cho từng tab bottom nav 5 cột. |
| `tests/unit/mobile-overflow-guards.test.ts` | added | Unit test kiểm tra các class chống tràn mobile và quy tắc input `16px` trong `globals.css`. |

## Diff Highlights (optional)

```tsx
// src/app/(app)/stats/page.tsx
{kpis.estimated_gross_profit !== null ? (
  <p className="font-mono-tabular mt-1 break-words text-[17px] font-bold text-[var(--status-paid)] sm:text-[20px]">
    {formatVND(kpis.estimated_gross_profit)}
  </p>
) : (
  <p className="mt-1 break-words text-[14px] font-semibold text-[var(--text-secondary)] sm:text-[15px]">
    Chưa có giá vốn
  </p>
)}
```

```tsx
// src/components/debts/DebtCustomerDrawer.tsx
<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
  ...
  <button
    type="button"
    onClick={() => setReminderOpen(true)}
    className="col-span-2 flex min-h-[48px] items-center justify-center gap-1.5 ... sm:col-span-1"
  >
```

## Tests Added or Updated

- `tests/unit/mobile-overflow-guards.test.ts::renders StatsPage empty cost-price KPI cleanly without oversized monospace text` — Đảm bảo thẻ `"Chưa có giá vốn"` không còn dùng `text-[20px]` monospace gây tràn cột mobile.
- `tests/unit/mobile-overflow-guards.test.ts::stacks or wraps cramped mobile grids in DebtCustomerDrawer, ReminderModal, and QuickItemModal` — Khóa các class responsive chống chèn ép ở 3 popup/drawer hẹp.
- `tests/unit/mobile-overflow-guards.test.ts::hardens ReceiptTemplate table layout and AppShell mobile navigation against text clipping` — Xác nhận `table-fixed`, `whitespace-nowrap`, `min-w-0`, `truncate`.
- `tests/unit/mobile-overflow-guards.test.ts::keeps iOS >= 16px input font-size rule intact in globals.css` — Bảo toàn quy tắc chống zoom tự động trên iOS.

## Local Verification

- Commands run:
  - `npm ci` → pass (`added 487 packages`, 0 vulnerabilities).
  - `npm run typecheck && npm run lint && npm test && npm run build` → pass (`tsc --noEmit` 0 lỗi, `eslint .` 0 lỗi, Vitest `5 passed (5)` / `21 passed (21)` gồm 4 test trong `tests/unit/mobile-overflow-guards.test.ts`, `next build` thành công 13/13 route).
  - Browser visual check `375×812` / `360×780` (`scrollWidth <= innerWidth`) → chưa chạy trong VM vì chưa có headless browser runtime cho app đã nối Supabase thật.
- Manual checks: Đã rà soát thủ công toàn bộ 20 component/page JSX bị chỉnh sửa về cặp thẻ đóng mở, `min-w-0`, `shrink-0`, `break-words`, `truncate`, tap target `>= 48px`, và quy tắc `DESIGN.md`.

## Deviations from Assessment

- Mở rộng chỉnh sửa nhẹ thêm 4 file cùng nhóm giao diện mobile (`src/app/(app)/settings/page.tsx`, `src/components/pos/ProductFormModal.tsx`, `src/components/pos/CustomerPicker.tsx`, `src/components/pos/ProductCatalog.tsx`) để đảm bảo đồng bộ chống tràn ở mọi modal và danh sách trên màn hình `375px`.
- Do môi trường test của repo dùng `vitest` (`environment: 'node'`, không cài Playwright/jsdom), test bổ sung kiểm tra các class invariant chống tràn ở tầng mã nguồn; phần đo `scrollWidth <= innerWidth` thực tế trên trình duyệt sẽ thực hiện ở bước `/speckit-bug-test` hoặc kiểm thử trên máy thật/DevTools.

## Follow-ups

- Chạy `npm ci && npm run typecheck && npm run lint && npm test && npm run build` sau khi có mạng registry / trên Vercel preview.
- Mở DevTools mobile `375×812` và `360×780` (hoặc trên iPhone thật) đi qua 5 tab + các modal (`DebtCustomerDrawer`, `ReminderModal`, `QuickItemModal`, `InvoicePreviewModal`) để nghiệm thu trực quan ở bước `/speckit-bug-test`.
