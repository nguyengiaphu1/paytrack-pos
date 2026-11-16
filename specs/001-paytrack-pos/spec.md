# Feature Specification: PayTrack POS (Ứng dụng Bán hàng & Sổ nợ Cloud cho Mẹ)

**Feature Branch**: `feat/001-paytrack-pos`  
**Created**: 2026-11-16  
**Status**: Draft  
**Input**: Web app bán hàng cho mẹ gồm bán hàng POS cơ bản, nhắc nhở thu nợ có notification trên iPhone/Windows, in hóa đơn điện tử (PDF/IMG), tạo & chia sẻ QR động thu đúng số tiền từng khách, thống kê bán hàng, đăng nhập tài khoản, lưu trữ cloud real-time sync không mất dữ liệu khi refresh, và responsive; triển khai với Supabase + Vercel.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tạo đơn bán hàng nhanh & đồng bộ Cloud real-time (Priority: P1)

Mẹ mở app trên iPhone hoặc máy tính Windows, chọn nhanh các sản phẩm/món hàng (hoặc nhập nhanh món tự do kèm giá), chọn khách hàng (hoặc khách lẻ), nhập số tiền khách trả ngay (trả đủ, trả một phần, hoặc ghi nợ toàn bộ) rồi bấm lưu đơn. Ngay lập tức đơn hàng được lưu lên Supabase và tự động hiển thị trên các thiết bị khác đang đăng nhập cùng tài khoản mà không cần tải lại trang.

**Why this priority**: Đây là luồng cốt lõi hằng ngày của một app bán hàng. Nếu bán hàng không nhanh và không lưu cloud bền vững (refresh mất dữ liệu), toàn bộ app không có giá trị sử dụng thực tế.

**Independent Test**: Mở 2 trình duyệt (1 cửa sổ mobile 375px và 1 cửa sổ desktop 1280px) đăng nhập cùng tài khoản. Tạo 1 đơn hàng trên mobile; xác nhận đơn xuất hiện ngay trên desktop không cần F5 và vẫn còn nguyên sau khi refresh cả hai trình duyệt.

**Acceptance Scenarios**:

1. **Given** mẹ đã đăng nhập và có danh mục sản phẩm, **When** mẹ chạm thêm sản phẩm vào giỏ, tăng/giảm số lượng, áp dụng giảm giá (nếu có) và bấm "Thanh toán đủ", **Then** hệ thống lưu đơn trạng thái `paid` lên Supabase, tự sinh mã đơn (`DH-YYYYMMDD-XXXX`), và cập nhật danh sách đơn real-time trên mọi thiết bị.
2. **Given** một khách quen mua hàng nhưng chưa trả đủ tiền, **When** mẹ chọn khách hàng, nhập số tiền trả trước (ví dụ 0đ hoặc 100.000đ trên tổng 350.000đ) và lưu đơn, **Then** đơn lưu trạng thái `unpaid` hoặc `partial`, phần còn lại (250.000đ) tự động cộng vào tổng công nợ của khách hàng đó.
3. **Given** mẹ đang bán một món chưa kịp thêm vào danh mục, **When** mẹ bấm "Thêm món nhanh" (nhập tên món + đơn giá + số lượng), **Then** món được tính vào đơn ngay lập tức và tùy chọn lưu luôn vào danh mục cho lần sau.
4. **Given** mẹ lỡ refresh trang (F5) hoặc tắt mở lại Safari/Chrome, **When** app tải lại, **Then** toàn bộ sản phẩm, đơn hàng, khách hàng và công nợ được khôi phục nguyên vẹn từ Supabase.

---

### User Story 2 - Quản lý công nợ & Nhắc thu tiền đa thiết bị iPhone / Windows (Priority: P1)

Mẹ xem danh sách khách hàng đang nợ, biết rõ từng khách nợ bao nhiêu, nợ từ những đơn nào, ngày hẹn thu tiền. Khi khách trả bớt hoặc trả hết nợ, mẹ ghi nhận khoản thu nợ để giảm trừ tự động. Hệ thống gửi thông báo đẩy (Push Notification) lên cả iPhone (PWA) và Windows khi đến ngày/giờ nhắc thu nợ hoặc khi có nhắc nhở quá hạn.

**Why this priority**: Thu hồi công nợ và không quên đòi tiền khách là pain point lớn nhất được yêu cầu kèm thông báo trên cả iPhone lẫn Windows.

**Independent Test**: Tạo một đơn ghi nợ cho "Cô Lan" với ngày hẹn thu là hôm nay; kích hoạt job/button kiểm tra nhắc nợ và xác nhận notification hiển thị trên Windows Chrome/Edge và iPhone Safari PWA (đã Add to Home Screen), đồng thời ghi nhận 1 lần trả nợ một phần làm số dư nợ giảm đúng bằng số tiền đã thu.

**Acceptance Scenarios**:

1. **Given** khách hàng đang có tổng dư nợ > 0, **When** mẹ mở tab "Sổ nợ", **Then** hệ thống hiển thị tổng công nợ toàn shop và danh sách từng khách sắp xếp theo mức nợ hoặc hạn nhắc thu gần nhất/quá hạn.
2. **Given** mẹ bấm "Thu nợ" cho một khách hàng và nhập số tiền khách trả, **When** mẹ xác nhận, **Then** hệ thống tạo bản ghi `debt_payments`, trừ số dư nợ theo thứ tự đơn cũ nhất trước (FIFO) hoặc theo đơn được chọn, và cập nhật trạng thái đơn sang `partial` / `paid`.
3. **Given** mẹ đặt lịch nhắc thu nợ (ví dụ: ngày 20/11 lúc 09:00) cho một khách hoặc một đơn, **When** đến thời điểm nhắc, **Then** hệ thống gửi Web Push Notification kèm tên khách và số tiền còn nợ đến tất cả thiết bị đã bật thông báo (Windows & iPhone PWA).
4. **Given** mẹ sử dụng iPhone chưa cài PWA ra màn hình chính, **When** mẹ mở mục bật thông báo, **Then** giao diện hướng dẫn trực quan từng bước bằng tiếng Việt (*"Chạm nút Chia sẻ → Thêm vào Màn hình chính (Add to Home Screen) → Mở từ icon ngoài màn hình để bật thông báo iPhone"*).

---

### User Story 3 - Tạo & chia sẻ QR động thu chính xác số tiền cho từng khách (Priority: P2)

Khi thu tiền đơn hàng mới hoặc thu nợ cũ, mẹ bấm "Tạo QR" để app tự sinh mã VietQR động chứa sẵn số tài khoản ngân hàng của mẹ, đúng số tiền cần thu (VD: `247.000đ`) và nội dung chuyển khoản định danh theo đơn/khách (VD: `PT DH1024 CO LAN`). Mẹ có thể đưa màn hình cho khách quét trực tiếp hoặc bấm chia sẻ ảnh thẻ QR qua Zalo/Messenger.

**Why this priority**: Giúp khách chuyển khoản đúng từng đồng, không phải nhập tay tránh sai số tiền và tránh nhầm lẫn ai đã chuyển khoản.

**Independent Test**: Cấu hình 1 tài khoản ngân hàng trong Cài đặt (BIN ngân hàng, số tài khoản, tên chủ TK). Tạo đơn hàng 185.000đ và bấm "Tạo QR" — quét mã QR bằng app ngân hàng Việt Nam (hoặc kiểm tra chuỗi EMVCo / VietQR) và xác nhận app ngân hàng tự điền đúng STK, số tiền `185000` và nội dung chuyển khoản; tải xuống được ảnh thẻ QR PNG sắc nét.

**Acceptance Scenarios**:

1. **Given** mẹ đã cấu hình thông tin ngân hàng trong Cài đặt shop, **When** mẹ bấm "Tạo QR" tại màn hình thanh toán đơn hoặc tại dòng công nợ của một khách, **Then** hệ thống sinh mã VietQR động đúng chuẩn Napas 247/EMVCo với số tiền mặc định bằng số tiền còn phải trả của đơn hoặc tổng nợ khách (cho phép mẹ sửa tay nếu khách trả một phần).
2. **Given** thẻ QR động đang hiển thị, **When** mẹ bấm "Chia sẻ / Tải ảnh QR", **Then** hệ thống xuất ảnh PNG rõ nét gồm tên shop, tên khách, số tiền, nội dung CK và mã QR, hỗ trợ `navigator.share` trên iPhone và tải file PNG trên Windows.
3. **Given** mẹ chưa cấu hình tài khoản ngân hàng, **When** bấm "Tạo QR", **Then** app điều hướng nhẹ nhàng tới form nhập ngân hàng trong Cài đặt thay vì báo lỗi khó hiểu.

---

### User Story 4 - Xuất & In hóa đơn điện tử (PDF & Hình ảnh PNG) (Priority: P2)

Sau khi lên đơn hoặc khi xem lại đơn hàng cũ, mẹ có thể xem trước hóa đơn điện tử gọn đẹp và chọn **Tải ảnh hóa đơn (PNG)** để gửi nhanh cho khách qua Zalo/Messenger, hoặc **In / Xuất PDF** cho máy in nhiệt 80mm / giấy A5 trên Windows và iPhone.

**Why this priority**: Khách quen thường muốn xem lại chi tiết các món đã mua và số dư nợ cũ/mới; xuất PNG gửi Zalo cực kỳ tiện trên điện thoại của mẹ.

**Independent Test**: Mở một đơn hàng bất kỳ gồm 3 sản phẩm và có phần ghi nợ; bấm "Xem hóa đơn" → bấm "Lưu ảnh PNG" nhận được file ảnh đầy đủ tiếng Việt không lỗi font; bấm "In / Xuất PDF" mở hộp thoại in chuẩn layout không bị cắt chữ.

**Acceptance Scenarios**:

1. **Given** một đơn hàng đã lưu, **When** mẹ chọn "Xuất hóa đơn", **Then** màn hình xem trước hiển thị đầy đủ: tên shop, SĐT, địa chỉ, mã đơn, ngày giờ, tên khách, bảng chi tiết món (tên, SL, đơn giá, thành tiền), giảm giá, tổng cộng, đã thanh toán, còn nợ, và mã VietQR (nếu còn nợ > 0).
2. **Given** màn hình xem trước hóa đơn, **When** mẹ bấm "Tải ảnh (PNG)" hoặc "Chia sẻ ảnh", **Then** ảnh hóa đơn độ phân giải cao (2x retina) được tạo không mất dấu tiếng Việt.
3. **Given** màn hình xem trước hóa đơn, **When** mẹ bấm "In / Lưu PDF", **Then** CSS `@media print` định dạng sạch sẽ (ẩn thanh điều hướng/nút bấm) để lưu PDF hoặc in trực tiếp.

---

### User Story 5 - Thống kê bán hàng & Đăng nhập tài khoản bảo mật (Priority: P3)

Mẹ đăng nhập tài khoản riêng để bảo vệ dữ liệu shop và xem báo cáo doanh thu, tiền thực thu, công nợ phát sinh, số đơn hàng, top sản phẩm bán chạy và top khách nợ theo ngày / tuần / tháng / khoảng ngày tùy chọn.

**Why this priority**: Hoàn thiện vòng quản lý kinh doanh hằng ngày và bảo mật dữ liệu riêng tư bằng Supabase Auth + RLS.

**Independent Test**: Đăng ký/đăng nhập tài khoản A và tài khoản B; dữ liệu của tài khoản A hoàn toàn tách biệt với B (kiểm tra RLS). Tạo 3 đơn (2 đã trả, 1 ghi nợ) trong hôm nay và kiểm tra tab Thống kê hiển thị khớp 100% tổng doanh thu, tiền thực thu và công nợ mới.

**Acceptance Scenarios**:

1. **Given** người dùng chưa đăng nhập, **When** truy cập app, **Then** được chuyển đến màn hình Đăng nhập / Tạo tài khoản gọn gàng (hỗ trợ giữ phiên đăng nhập lâu dài trên máy cá nhân của mẹ).
2. **Given** mẹ đã đăng nhập, **When** mở tab "Thống kê", **Then** hiển thị 4 chỉ số rõ ràng: Tổng doanh thu, Tiền thực thu, Công nợ chưa thu, Số đơn hàng; lọc được theo Hôm nay / 7 ngày / 30 ngày / Tháng này / Tùy chọn; kèm danh sách Top sản phẩm bán chạy và Top khách hàng còn nợ.
3. **Given** thiết bị có kích thước màn hình từ `375px` (iPhone SE/15) đến `1440px` (Windows desktop), **When** thao tác trên mọi tab, **Then** không bị tràn ngang (`overflow-x`), nút bấm dễ chạm và bảng số liệu đọc được rõ ràng.

---

### Edge Cases

- **Mất mạng tạm thời khi đang bán**: Khi mất Wi-Fi/4G, giao diện hiển thị trạng thái *"Mất kết nối — chưa lưu lên cloud"* và chặn thao tác ghi dữ liệu âm thầm gây hiểu nhầm đã lưu, hoặc cho phép thử lại ngay khi có mạng.
- **Chỉnh sửa hoặc hủy đơn đã ghi nợ**: Khi hủy đơn (`cancelled`) có liên quan đến công nợ, tổng dư nợ khách hàng phải tự động trừ lại phần nợ của đơn bị hủy và ghi nhận lịch sử rõ ràng.
- **Khách trả vượt số nợ hiện tại**: Nếu mẹ nhập số tiền thu nợ lớn hơn tổng nợ của đơn/khách, hệ thống cảnh báo rõ ràng và không cho lưu số dư âm ngoài ý muốn.
- **Thông báo trên iOS Safari**: iOS chỉ hỗ trợ Web Push khi app được mở từ icon PWA đã "Add to Home Screen" (iOS >= 16.4); app phải phát hiện môi trường `standalone` vs trình duyệt thường để hướng dẫn đúng cách.
- **Thông tin ngân hàng sai hoặc thiếu**: Kiểm tra định dạng BIN ngân hàng (6 số) và số tài khoản trước khi sinh QR động.
- **Đồng thời 2 thiết bị thao tác cùng lúc**: Nếu iPhone và Windows cùng cập nhật tồn nợ/đơn hàng, database constraint/RPC đảm bảo số dư nợ không bị ghi đè sai (race condition).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Xác thực & Đa thiết bị)**: Hệ thống PHẢI hỗ trợ đăng ký, đăng nhập, đăng xuất và duy trì phiên đăng nhập an toàn qua Supabase Auth; toàn bộ dữ liệu PHẢI áp dụng Row Level Security (RLS) theo tài khoản/cửa hàng (`user_id` / `shop_id`).
- **FR-002 (Quản lý sản phẩm & bán hàng POS)**: Hệ thống PHẢI cho phép thêm/sửa/ẩn sản phẩm (tên, đơn vị tính, giá bán VND, danh mục, mã SKU tùy chọn), tìm kiếm nhanh theo tên không dấu/có dấu, thêm món tự do vào giỏ, chỉnh số lượng, giảm giá, ghi chú đơn hàng.
- **FR-003 (Quản lý khách hàng & Sổ nợ)**: Hệ thống PHẢI cho phép quản lý danh bạ khách hàng (tên, SĐT, địa chỉ/ghi chú), xem tổng công nợ từng khách, danh sách đơn còn nợ, ghi nhận trả nợ từng phần hoặc toàn bộ (`debt_payments`), và lưu ngày hẹn thu tiền (`due_date` / `reminder_at`).
- **FR-004 (Nhắc nhở thu nợ & Push Notification iPhone/Windows)**: Hệ thống PHẢI lưu `push_subscriptions` (Web Push VAPID) theo thiết bị trong Supabase, cung cấp nút bật/tắt & test notification, và gửi thông báo tự động theo lịch nhắc thu nợ đến hạn/quá hạn cho cả Windows (Chrome/Edge) và iPhone (iOS PWA).
- **FR-005 (QR động VietQR)**: Hệ thống PHẢI cho phép lưu cấu hình ngân hàng nhận tiền của shop và tự động tạo mã QR động chuẩn VietQR (Napas 247 / EMVCo) với chính xác số tiền cần thu cho đơn hàng hoặc khoản nợ của từng khách hàng, hỗ trợ chia sẻ/tải ảnh QR PNG.
- **FR-006 (Hóa đơn điện tử PDF & IMG)**: Hệ thống PHẢI tạo được bản xem trước hóa đơn chi tiết tiếng Việt đầy đủ và xuất ra cả định dạng **PNG** (tải về / chia sẻ Zalo) lẫn **PDF / In trực tiếp** (`@media print` hoặc PDF generator).
- **FR-007 (Thống kê bán hàng)**: Hệ thống PHẢI cung cấp báo cáo theo bộ lọc thời gian (Hôm nay, 7 ngày, 30 ngày, Tháng này, Tùy chọn) gồm: Doanh thu, Thực thu, Công nợ phát sinh, Tổng nợ hiện tại, Số đơn, Top sản phẩm và Top khách nợ.
- **FR-008 (Lưu trữ Cloud & Real-Time Sync)**: Mọi dữ liệu PHẢI lưu trên Supabase PostgreSQL (không lưu cục bộ tạm thời rồi mất khi refresh) và đồng bộ real-time qua Supabase Realtime (`postgres_changes`) giữa các thiết bị đang mở.
- **FR-009 (Responsive & PWA)**: Giao diện PHẢI hoạt động mượt mà trên màn hình mobile (`375px+`, bottom tab bar, tap target ≥ 48px) và desktop (`1024px+`, split-pane POS), kèm `manifest.json` và Service Worker chuẩn PWA.
- **FR-010 (Thiết kế Anti-AI-Slop)**: Toàn bộ giao diện PHẢI tuân thủ `DESIGN.md` (bảng màu `#F8F9FA` + `#0E6B4E`, font `Be Vietnam Pro` + `JetBrains Mono`, không dùng gradient tím/indigo, không lặp bố cục SaaS AI mặc định).

### Key Entities

- **ShopProfile (`shop_profiles`)**: Thông tin cửa hàng gắn với `user_id` (tên shop, SĐT, địa chỉ, bank_bin, bank_name, bank_account_no, bank_account_name, reminder_default_hour).
- **Product (`products`)**: Mặt hàng kinh doanh (tên, tên chuẩn hóa không dấu để tìm nhanh, đơn vị tính, giá bán nguyên `bigint`, danh mục, trạng thái `is_active`).
- **Customer (`customers`)**: Khách hàng (tên, SĐT, ghi chú, tổng nợ hiện tại hoặc tính từ orders/payments).
- **Order (`orders`)**: Hóa đơn bán hàng (mã đơn `order_code`, `customer_id` nullable nếu khách lẻ, `subtotal`, `discount_amount`, `total_amount`, `paid_amount`, `payment_status`: `paid | partial | unpaid | cancelled`, `payment_method`, `debt_due_date`, `note`, `created_at`).
- **OrderItem (`order_items`)**: Chi tiết từng dòng hàng trong đơn (snapshot `product_name`, `unit_price`, `quantity`, `line_total` để giá cũ không bị sai nếu sau này mẹ đổi giá sản phẩm).
- **DebtPayment (`debt_payments`)**: Lịch sử thu nợ (liên kết `customer_id` và `order_id`, số tiền thu `amount`, phương thức `cash | transfer`, ghi chú, `paid_at`).
- **DebtReminder (`debt_reminders`) / PushSubscription (`push_subscriptions`)**: Lịch nhắc thu tiền (`scheduled_for`, `status`: `pending | sent | dismissed`) và token đăng ký Web Push của từng thiết bị iPhone/Windows.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Tốc độ lên đơn)**: Mẹ có thể tạo và lưu xong một đơn hàng 3 món (hoặc ghi nợ) trong **dưới 20 giây** trên điện thoại.
- **SC-002 (Độ bền & Sync Cloud)**: 100% đơn hàng và khoản thu nợ đã xác nhận không mất sau khi refresh trình duyệt; thay đổi trên iPhone hiển thị trên Windows trong **≤ 2 giây** qua Supabase Realtime.
- **SC-003 (Chính xác tài chính & QR)**: 100% phép tính tổng đơn, giảm giá, trả một phần, dư nợ và số tiền nhúng trong mã VietQR khớp chính xác đến từng `1đ` (số nguyên VND).
- **SC-004 (Tương thích Hóa đơn & QR)**: Ảnh hóa đơn PNG và thẻ VietQR xuất ra mở/gửi được trực tiếp trên iPhone (iOS Share Sheet) và Windows (tải file / in PDF) với 100% tiếng Việt hiển thị chuẩn, không vỡ layout.
- **SC-005 (Thông báo đa nền tảng)**: Push Notification nhắc thu nợ gửi thành công trên cả Windows (Chrome/Edge) và iPhone (iOS Safari PWA đã Add to Home Screen).
- **SC-006 (Responsive & Anti-AI-Slop Audit)**: Vượt qua kiểm tra hiển thị ở `375×812` và `1280×800` không tràn ngang, đồng thời đạt `0` lỗi P0 khi đối chiếu với `DESIGN.md`.

---

## Assumptions

- **Mô hình sử dụng**: 1 tài khoản chính của mẹ (có thể đăng nhập cùng lúc trên nhiều thiết bị của mẹ như iPhone và máy tính Windows ở quầy; có thể mở rộng thêm nhân viên ở các phiên bản sau).
- **Ngân hàng & VietQR**: Sử dụng chuẩn VietQR tĩnh/động EMVCo (Napas 247) không cần kết nối API trả phí của cổng thanh toán trung gian; mẹ xác nhận tiền về bằng thông báo ngân hàng trên điện thoại rồi bấm xác nhận đã thu (tự động đối soát biến động số dư qua webhook ngân hàng như SePay/Casso có thể mở rộng ở phase sau nếu cần).
- **Đơn vị tiền tệ**: Việt Nam Đồng (`VND`), lưu số nguyên không phần thập phân.
- **Hosting & Hạ tầng**: Next.js trên Vercel (Free/Pro tier) + Supabase (Free/Pro tier).
