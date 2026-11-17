# Bug Assessment: Lỗi responsive trên điện thoại bị tràn chữ

- **Slug**: mobile-text-overflow
- **Created**: 2026-11-17T09:07:00Z
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> 3. Lỗi responsive trên điện thoại bị tràn chữ

## Symptom

Trên màn hình điện thoại (chiều ngang hẹp `~360px–390px`, đặc biệt mốc kiểm thử `375px`), nhiều vị trí chữ bị tràn ra khỏi thẻ/khung chứa, bị cắt cụt bởi `overflow-x: clip`, hoặc ép nút bấm bị co/xuống dòng mất cân đối.

## Reproduction

1. Mở ứng dụng trên điện thoại hoặc DevTools mobile viewport `375×812`.
2. Đi qua từng màn hình & popup chính:
   - Mở **Thống kê (`/stats`)** khi chưa nhập giá vốn sản phẩm → ô KPI **"Lợi nhuận ước tính"** hiển thị `"Chưa có giá vốn"` ở cỡ chữ `20px` monospace trong lưới 2 cột (`~141px` chiều rộng chữ) → tràn khung.
   - Mở **Sổ nợ (`/debts`)** với khách hàng có tên dài / số tiền nợ lớn → chạm vào 1 khách để mở `DebtCustomerDrawer` → xem hàng 3 nút `Thu nợ / Tạo QR / Hẹn nhắc` (`grid-cols-3`) và danh sách đơn nợ/lịch nhắc.
   - Mở **Hẹn nhắc** (`ReminderModal`) trên iPhone → xem hàng ngày/giờ (`grid-cols-2` với `<input type="date">` và `<input type="time">`) và tiêu đề dài.
   - Mở **Xuất hóa đơn** (`InvoicePreviewModal` / `ReceiptTemplate`) hoặc **Thanh toán** (`CheckoutModal`) với tên món/tên khách dài hoặc số tiền hàng chục triệu.

## Suspected Code Paths

- `src/app/globals.css:20-27` — `html, body` đặt `overflow-x: clip;` nên mọi phần tử con rộng hơn `100vw` bị xén ngang thay vì lộ thanh cuộn, làm người dùng thấy chữ bị cụt/tràn mép thẻ.
- `src/app/(app)/stats/page.tsx:167-213` — Lưới KPI dùng `grid-cols-2 gap-3` trên mobile (`~141px` ruột mỗi thẻ ở `375px`):
  - Dòng 184–187: Chuỗi `"Chưa có giá vốn"` dùng `font-mono-tabular text-[20px] font-bold` (~180px), chắc chắn tràn ra ngoài thẻ 2 cột trên mobile.
  - Dòng 170, 176, 197, 203: Số tiền lớn (`10.000.000đ+`) ở `text-[20px]` monospace cũng vượt `141px` nếu không thu cỡ chữ responsive (`text-[16px] sm:text-[20px]`).
- `src/components/stats/DebtAgingCard.tsx:51-58` & `src/components/stats/PaymentBreakdownChart.tsx:51-65` — Flex row `justify-between` thiếu `gap-2 flex-wrap` / `min-w-0`.
- `src/components/debts/DebtCustomerDrawer.tsx`:
  - Dòng 175–203 (Header): Khối tên khách thiếu `flex-1` bên cạnh `min-w-0`, nút đóng `X` thiếu `shrink-0`.
  - Dòng 261–272 (Tổng công nợ): `flex items-baseline justify-between` thiếu `gap-2 flex-wrap`.
  - Dòng 282–312 (Thanh 3 nút): `grid grid-cols-3 gap-2` ép mỗi nút còn `~98px` trên màn `375px`; nhãn `Thu nợ`, `Tạo QR`, `Hẹn nhắc` kèm icon `16px` bị chật cứng, dễ xuống dòng/tràn nút.
  - Dòng 326–423 (Lịch nhắc, Đơn còn nợ, Lịch sử trả tiền): Các khối văn bản bên trái thiếu `min-w-0 flex-1` và `break-words`, phần số tiền/nút bên phải thiếu `shrink-0` (đặc biệt dòng 363–390 có cả mã đơn + ngày giờ + tổng + nợ còn + nút `Thu đơn` trên cùng 1 hàng ngang).
- `src/components/debts/ReminderModal.tsx:86-98, 108-129`:
  - Tiêu đề `Hẹn nhắc thu — {customer.name}` thiếu `min-w-0 flex-1` + `truncate` và nút đóng thiếu `shrink-0`.
  - `grid grid-cols-2 gap-2.5` chứa `<input type="date">` và `<input type="time">` với `font-size: 16px` (`globals.css:30-34`): trên iOS Safari, intrinsic min-width của input date/time thường lớn hơn nửa màn hình `375px`, dễ tràn ô lưới.
- `src/components/debts/CollectDebtModal.tsx:100-113, 159-168`:
  - Tiêu đề `Thu nợ — {customer.name}` thiếu `min-w-0 flex-1` + `truncate` và nút đóng thiếu `shrink-0`.
  - Dòng nhãn `"Số tiền khách trả (VND) *"` và nút `"Trả hết (...)"` thiếu `gap-2 flex-wrap`.
- `src/app/(app)/debts/page.tsx:197-254` — Dòng khách hàng thiếu `truncate`/`break-words` trên `cust.name` và `shrink-0` trên số tiền nợ; `flex-wrap` không đồng nhất khi tên/badge dài.
- `src/app/(app)/orders/page.tsx:246-286` — Header modal chi tiết đơn và từng dòng món (`selectedItems`) thiếu `min-w-0 flex-1` cho tên món và `shrink-0` cho thành tiền.
- `src/components/pos/CheckoutModal.tsx:235-322` & `src/components/pos/CartPanel.tsx:167-187` & `src/components/pos/QuickItemModal.tsx:151-185`:
  - Các nút chọn phương thức thanh toán 2 cột (`"Đủ — Chuyển khoản"`, `"Trả trước 1 phần"`), nút `"Thanh toán / Ghi nợ (..."` và lưới 3 cột `QuickItemModal` (`Số lượng / Đơn vị / Đơn giá *`) thiếu `min-w-0` trên các grid item hoặc cỡ chữ hơi lớn cho màn `375px`.
- `src/components/invoice/InvoicePreviewModal.tsx:113-128, 201-228` & `src/components/invoice/ReceiptTemplate.tsx:108-153` & `src/components/qr/VietQRModal.tsx:231-246, 354-403`:
  - Header modal thiếu `min-w-0 flex-1` / `shrink-0`; bảng hóa đơn `<table>` không dùng `table-fixed` / `break-words` và nút 3 cột ở footer `InvoicePreviewModal` chật trên màn `< 360px`.
- `src/components/shell/AppShell.tsx:104-114, 135-156, 162-187` — `SyncStatusPill` thiếu `shrink-0 whitespace-nowrap`; các tab trong thanh điều hướng dưới cùng (`grid-cols-5`) thiếu `min-w-0 w-full` nên `truncate` trên `<span>` không có tác dụng trong flex column.

## Root Cause Hypothesis

Các lỗi tràn chữ trên điện thoại xuất phát từ **4 mẫu lặp lại trong CSS/layout** (confidence: **high**):
1. Nhiều flex/grid child chứa chuỗi dài (tên khách, tên món, số tiền lớn, `"Chưa có giá vốn"`) thiếu `min-w-0 flex-1` kết hợp `break-words` / `truncate`, trong khi phần giá trị/nút hành động thiếu `shrink-0`.
2. Lưới 2–3 cột cố định trên mobile (`grid-cols-2` KPI ở `/stats`, `grid-cols-3` nút trong `DebtCustomerDrawer`, `grid-cols-3` trong `QuickItemModal` / `InvoicePreviewModal`, `grid-cols-2` date+time trong `ReminderModal`) ép các khối chữ `14px–20px` vào chiều rộng chỉ `~98px–141px`.
3. Input `type="date"` / `type="time"` với `font-size: 16px` trên iOS Safari có intrinsic width lớn nhưng không có `min-w-0` hoặc stack dọc `grid-cols-1 sm:grid-cols-2`.
4. `overflow-x: clip` ở `html, body` che giấu thanh cuộn ngang nhưng khiến phần nội dung tràn mép bị cắt ngang trực tiếp trên màn hình điện thoại.

## Proposed Remediation

**Preferred**:
1. **Rà soát và chuẩn hóa tất cả flex/grid containers theo quy tắc chống tràn mobile `375px`** (giữ nguyên `DESIGN.md`: tap target `>= 48px`, input `>= 16px`):
   - `StatsPage`: Thu cỡ chữ giá trị KPI trên mobile (`text-[17px] sm:text-[20px]`), với trạng thái `"Chưa có giá vốn"` dùng `text-[14px] sm:text-[16px] font-sans` thay vì `20px` monospace; cho phép `break-words` ở thẻ KPI.
   - `DebtCustomerDrawer`: Chuyển 3 nút hành động từ `grid-cols-3` sang `grid-cols-2 sm:grid-cols-3` (hoặc `flex-wrap` với `min-h-[48px]`) để nút không bị bóp còn 98px; thêm `min-w-0 flex-1` + `break-words` cho phần text và `shrink-0` cho số tiền/nút `X`/nút `Thu đơn`.
   - `ReminderModal` & `StatsPage` custom date: Đổi cặp `date` + `time` sang `grid-cols-1 sm:grid-cols-2` (hoặc thêm `min-w-0 w-full` + `appearance-none` an toàn cho iOS).
   - `QuickItemModal`: Đổi `grid-cols-3` thành `grid-cols-2 sm:grid-cols-3` (hoặc thêm `min-w-0` trên mọi ô input/label) để không chật chữ ở `375px`.
   - Toàn bộ Modal headers (`DebtCustomerDrawer`, `ReminderModal`, `CollectDebtModal`, `CheckoutModal`, `InvoicePreviewModal`, `VietQRModal`, `OrdersPage`) & list rows (`DebtsPage`, `OrdersPage`, `CartPanel`, `ReceiptTemplate`): chuẩn hóa `min-w-0 flex-1` cho tiêu đề/tên + `shrink-0` cho nút đóng/số tiền, và `table-fixed` + `break-words` trong `ReceiptTemplate`.
   - `AppShell`: Thêm `shrink-0 whitespace-nowrap` cho `SyncStatusPill` và `min-w-0 w-full` cho từng `<Link>` trong bottom nav 5 cột.

**Alternatives**:
- *Chỉ thêm `overflow-x: auto` vào từng thẻ/bảng*: Tránh cắt chữ nhưng làm trải nghiệm trên điện thoại phải kéo ngang từng ô nhỏ, không tự nhiên cho thao tác bán hàng nhanh của mẹ.

**Files likely to change**:
- `src/app/(app)/stats/page.tsx`
- `src/components/stats/DebtAgingCard.tsx`
- `src/components/stats/PaymentBreakdownChart.tsx`
- `src/components/debts/DebtCustomerDrawer.tsx`
- `src/components/debts/ReminderModal.tsx`
- `src/components/debts/CollectDebtModal.tsx`
- `src/app/(app)/debts/page.tsx`
- `src/app/(app)/orders/page.tsx`
- `src/app/(app)/page.tsx`
- `src/components/pos/CartPanel.tsx`
- `src/components/pos/CheckoutModal.tsx`
- `src/components/pos/QuickItemModal.tsx`
- `src/components/invoice/InvoicePreviewModal.tsx`
- `src/components/invoice/ReceiptTemplate.tsx`
- `src/components/qr/VietQRModal.tsx`
- `src/components/shell/AppShell.tsx`

**Tests to add or update**:
- Bổ sung kiểm tra responsive ở viewport `375×812` và `360×780` (đo `document.documentElement.scrollWidth <= window.innerWidth` và `el.scrollWidth <= el.clientWidth` trên các card/button/modal của 5 tab chính với tên dài & số tiền 9 chữ số).

## Risks & Considerations

- **Tuân thủ `DESIGN.md`**: Khi thu nhỏ cỡ chữ KPI hoặc đổi layout nút trên mobile, tuyệt đối giữ `input/select/textarea` ở mức tối thiểu `16px` (để iOS Safari không tự zoom) và chiều cao nút bấm chính `>= 48px` cho thao tác ngón tay.
- **In hóa đơn `80mm`**: Khi thêm `table-fixed` / `break-words` vào `ReceiptTemplate.tsx`, cần kiểm tra lại xem cột `SL` và `T.Tiền` vẫn thẳng hàng (`tabular-nums`) và không bị ngắt số tiền xuống 2 dòng.

## Open Questions

- [NEEDS CLARIFICATION: Bạn gặp lỗi tràn chữ cụ thể nhất ở màn hình/card/nút nào trên điện thoại (VD: trang Thống kê, Sổ nợ, Hóa đơn hay Bán hàng), và trên dòng máy/trình duyệt nào?]
