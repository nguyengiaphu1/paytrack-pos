# Feature Specification: PayTrack POS (Ứng dụng Bán hàng & Sổ nợ Cloud cho Mẹ)

**Feature Branch**: `feat/001-paytrack-pos-mvp`  
**Created**: 2026-11-16  
**Status**: Draft  
**Input**: Web app bán hàng cho mẹ gồm bán hàng POS cơ bản, nhắc nhở thu nợ có notification trên iPhone/Windows, in hóa đơn điện tử (PDF/IMG), tạo & chia sẻ QR động thu đúng số tiền từng khách, thống kê bán hàng, đăng nhập tài khoản, lưu trữ cloud real-time sync không mất dữ liệu khi refresh, và responsive; triển khai với Supabase + Vercel.

---

## Clarifications

### Session 2026-11-16

- Q: Khi xuất hóa đơn điện tử (PDF/PNG), bạn muốn hóa đơn hiển thị phần công nợ và định dạng xuất như thế nào? → A: Hỗ trợ cả **Ảnh PNG / PDF A5** lẫn **khổ nhiệt 80mm**, đồng thời có **tùy chọn tick bật/tắt** ngay trên màn hình xem trước hóa đơn (và mặc định trong Cài đặt) để chọn giữa *Hiển thị công nợ lũy kế (Nợ cũ + Đơn này − Đã trả = Tổng nợ còn lại)* hoặc *Chỉ hiển thị thông tin đơn hàng cơ bản như hóa đơn thông thường*.
- Q: Hệ thống nên gửi thông báo nhắc thu nợ (Push Notification) lên iPhone và Windows theo cơ chế nào? → A: **Tổng hợp đầu ngày + Hẹn giờ riêng** — gửi 1 thông báo tóm tắt mỗi sáng (giờ mặc định cấu hình được, VD `08:30`) cho các khoản đến hạn/quá hạn hôm nay, cộng thêm thông báo riêng đúng ngày/giờ mẹ đặt cho từng khách; chạm vào thông báo mở thẳng thẻ công nợ & nút tạo QR của khách đó.
- Q: Khi tạo mã QR động thu nợ cho khách hàng đang nợ nhiều đơn cùng lúc, hệ thống nên mặc định tạo QR theo số tiền nào? → A: **Mặc định Tổng nợ khách + chọn đơn lẻ / sửa số tiền** — tạo QR mặc định bằng tổng dư nợ của khách (khi xác nhận thu sẽ trừ tự động đơn cũ nhất trước theo FIFO), cho phép chuyển sang từng đơn lẻ hoặc nhập số tiền trả bớt, kèm nút copy sẵn mẫu tin nhắn nhắc nợ gửi Zalo.
- Q: Trong phần Thống kê chi tiết trực quan, bạn có muốn theo dõi thêm giá vốn / tiền lời (lợi nhuận gộp) ngoài doanh thu và công nợ không? → A: **Có tiền lời (giá vốn tùy chọn) + Biểu đồ trực quan** — giá vốn là trường không bắt buộc khi tạo/bán món; món nào có giá vốn sẽ tự tính thêm *Lợi nhuận gộp ước tính*, kèm biểu đồ cột *Doanh thu vs Thực thu* theo ngày, tỷ trọng *Tiền mặt / Chuyển khoản / Ghi nợ*, phân nhóm tuổi nợ và Top sản phẩm/khách nợ.
- Q: Bạn muốn mẹ đăng nhập vào tài khoản trên iPhone và Windows bằng hình thức nào? → A: **Email + Mật khẩu & Đăng nhập Google** — hỗ trợ cả đăng nhập 1 chạm qua Google OAuth lẫn Email/Mật khẩu (kèm quên mật khẩu) và tự giữ phiên đăng nhập lâu dài trên iPhone/Windows.

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
3. **Given** mẹ bật chế độ nhắc đầu ngày (mặc định `08:30`, chỉnh được trong Cài đặt) và/hoặc đặt lịch hẹn giờ riêng cho một khách hàng/đơn hàng, **When** đến giờ tổng hợp sáng hoặc đúng giờ hẹn riêng, **Then** hệ thống gửi Web Push Notification đến tất cả thiết bị đã bật thông báo (Windows & iPhone PWA); khi mẹ chạm vào thông báo, app mở thẳng trang Sổ nợ (hoặc thẻ công nợ & nút tạo QR của khách hàng đó).
4. **Given** mẹ sử dụng iPhone chưa cài PWA ra màn hình chính, **When** mẹ mở mục bật thông báo, **Then** giao diện hướng dẫn trực quan từng bước bằng tiếng Việt (*"Chạm nút Chia sẻ → Thêm vào Màn hình chính (Add to Home Screen) → Mở từ icon ngoài màn hình để bật thông báo iPhone"*).

---

### User Story 3 - Tạo & chia sẻ QR động thu chính xác số tiền cho từng khách (Priority: P2)

Khi thu tiền đơn hàng mới hoặc thu nợ cũ, mẹ bấm "Tạo QR" để app tự sinh mã VietQR động chứa sẵn số tài khoản ngân hàng của mẹ, đúng số tiền cần thu (VD: `247.000đ`) và nội dung chuyển khoản định danh theo đơn/khách (VD: `PT DH1024 CO LAN`). Mẹ có thể đưa màn hình cho khách quét trực tiếp hoặc bấm chia sẻ ảnh thẻ QR qua Zalo/Messenger.

**Why this priority**: Giúp khách chuyển khoản đúng từng đồng, không phải nhập tay tránh sai số tiền và tránh nhầm lẫn ai đã chuyển khoản.

**Independent Test**: Cấu hình 1 tài khoản ngân hàng trong Cài đặt (BIN ngân hàng, số tài khoản, tên chủ TK). Tạo đơn hàng 185.000đ và bấm "Tạo QR" — quét mã QR bằng app ngân hàng Việt Nam (hoặc kiểm tra chuỗi EMVCo / VietQR) và xác nhận app ngân hàng tự điền đúng STK, số tiền `185000` và nội dung chuyển khoản; tải xuống được ảnh thẻ QR PNG sắc nét.

**Acceptance Scenarios**:

1. **Given** mẹ đã cấu hình thông tin ngân hàng trong Cài đặt shop, **When** mẹ bấm "Tạo QR" tại màn hình thanh toán đơn (lấy đúng số tiền còn thiếu của đơn) hoặc tại Sổ nợ của một khách (mặc định lấy **Tổng dư nợ** của khách đó), **Then** hệ thống sinh mã VietQR động đúng chuẩn Napas 247/EMVCo với nội dung chuyển khoản định danh (`PT DHxxxx` hoặc `PT NO TENKHACH`), đồng thời cho phép mẹ chuyển nhanh sang **từng đơn lẻ** hoặc **sửa tay số tiền** nếu khách trả bớt.
2. **Given** thẻ QR động đang hiển thị, **When** mẹ bấm "Chia sẻ / Tải ảnh QR" hoặc "Copy lời nhắc Zalo", **Then** hệ thống xuất ảnh PNG rõ nét gồm tên shop, tên khách, số tiền, nội dung CK và mã QR (hỗ trợ `navigator.share` trên iPhone và tải file PNG trên Windows), hoặc copy sẵn đoạn tin nhắn lịch sự kèm số tiền & danh sách đơn nợ để dán gửi Zalo/SMS.
3. **Given** mẹ chưa cấu hình tài khoản ngân hàng, **When** bấm "Tạo QR", **Then** app điều hướng nhẹ nhàng tới form nhập ngân hàng trong Cài đặt thay vì báo lỗi khó hiểu.

---

### User Story 4 - Xuất & In hóa đơn điện tử tùy biến (PDF & Hình ảnh PNG) (Priority: P2)

Sau khi lên đơn hoặc khi xem lại đơn hàng cũ, mẹ có thể xem trước hóa đơn điện tử gọn đẹp, **tick tùy chọn bật/tắt** các mục trên hóa đơn (như mục *Công nợ lũy kế: Nợ cũ + Đơn này − Đã trả = Tổng nợ còn lại* hoặc *Chỉ thông tin đơn cơ bản*, kèm *mã VietQR*), chọn khổ **A5 / 80mm**, rồi **Tải ảnh PNG** gửi Zalo/Messenger hoặc **In / Xuất PDF**.

**Why this priority**: Khách quen thường muốn xem lại chi tiết các món đã mua và tổng dư nợ, nhưng với khách mua lẻ hoặc lúc cần hóa đơn gọn, mẹ cần tick ẩn phần nợ cũ để hóa đơn trông như hóa đơn bán lẻ thông thường.

**Independent Test**: Mở một đơn hàng của khách có nợ cũ; tick bật "Hiện công nợ lũy kế" thấy đủ 3 dòng *Nợ cũ / Đơn này / Tổng nợ còn lại*; bỏ tick thì hóa đơn chỉ còn thông tin đơn hàng cơ bản; lưu được ảnh PNG tiếng Việt chuẩn và in/PDF sạch cho cả A5 lẫn 80mm.

**Acceptance Scenarios**:

1. **Given** một đơn hàng đã lưu, **When** mẹ chọn "Xuất hóa đơn", **Then** màn hình xem trước hiển thị đầy đủ: tên shop, SĐT, địa chỉ, mã đơn, ngày giờ, tên khách, bảng chi tiết món (tên, SL, đơn giá, thành tiền), giảm giá, tổng cộng, đã thanh toán, còn lại.
2. **Given** màn hình xem trước hóa đơn, **When** mẹ tick bật/tắt tùy chọn *"Hiện công nợ lũy kế"*, *"Hiện mã VietQR"* hoặc đổi khổ giấy (`A5 / PNG` ↔ `Nhiệt 80mm`), **Then** bản xem trước cập nhật tức thì (và ghi nhớ lựa chọn mặc định trong Cài đặt shop nếu muốn).
3. **Given** bản xem trước hóa đơn đã ưng ý, **When** mẹ bấm "Tải ảnh (PNG)" hoặc "Chia sẻ ảnh", **Then** ảnh hóa đơn độ phân giải cao (2x retina) được tạo không mất dấu tiếng Việt; khi bấm "In / Lưu PDF", CSS `@media print` định dạng chuẩn khổ đã chọn (ẩn nút bấm điều hướng).

---

### User Story 5 - Thống kê chi tiết trực quan & Đăng nhập tài khoản bảo mật (Priority: P3)

Mẹ đăng nhập tài khoản riêng để bảo vệ dữ liệu shop và xem báo cáo trực quan: doanh thu, tiền thực thu, lợi nhuận gộp ước tính (cho các món có nhập giá vốn tùy chọn), công nợ phát sinh, số đơn hàng, biểu đồ so sánh ngày/tuần/tháng, phân nhóm tuổi nợ và top sản phẩm / top khách nợ.

**Why this priority**: Hoàn thiện vòng quản lý kinh doanh hằng ngày và bảo mật dữ liệu riêng tư bằng Supabase Auth + RLS.

**Independent Test**: Đăng ký/đăng nhập tài khoản A và tài khoản B; dữ liệu của tài khoản A hoàn toàn tách biệt với B (kiểm tra RLS). Tạo 3 đơn (có 2 món nhập giá vốn và 1 món bỏ trống giá vốn, 2 đơn đã trả, 1 đơn ghi nợ) trong hôm nay và kiểm tra tab Thống kê hiển thị khớp 100% tổng doanh thu, tiền thực thu, tiền lời ước tính và công nợ mới cùng biểu đồ trực quan.

**Acceptance Scenarios**:

1. **Given** người dùng chưa đăng nhập, **When** truy cập app, **Then** được chuyển đến màn hình Đăng nhập / Tạo tài khoản gọn gàng hỗ trợ cả **Google OAuth (1 chạm)** và **Email + Mật khẩu** (kèm Quên mật khẩu), tự giữ phiên đăng nhập lâu dài trên máy cá nhân của mẹ.
2. **Given** mẹ đã đăng nhập, **When** mở tab "Thống kê", **Then** hiển thị bộ chỉ số tổng hợp (Doanh thu, Tiền thực thu, Lợi nhuận ước tính nếu có giá vốn, Công nợ chưa thu, Số đơn hàng) lọc theo Hôm nay / 7 ngày / 30 ngày / Tháng này / Tùy chọn; kèm **biểu đồ cột Doanh thu vs Thực thu**, **tỷ trọng Tiền mặt / Chuyển khoản / Ghi nợ**, **phân nhóm tuổi nợ (Trong hạn / Quá hạn)** và bảng Top sản phẩm bán chạy / Top khách hàng còn nợ.
3. **Given** thiết bị có kích thước màn hình từ `375px` (iPhone SE/15) đến `1440px` (Windows desktop), **When** thao tác trên mọi tab, **Then** không bị tràn ngang (`overflow-x`), nút bấm dễ chạm và bảng số liệu/biểu đồ đọc được rõ ràng.

---

### Edge Cases

- **Mất mạng tạm thời khi đang bán**: Khi mất Wi-Fi/4G, giao diện hiển thị trạng thái *"Mất kết nối — chưa lưu lên cloud"* và chặn thao tác ghi dữ liệu âm thầm gây hiểu nhầm đã lưu, hoặc cho phép thử lại ngay khi có mạng.
- **Chỉnh sửa hoặc hủy đơn đã ghi nợ**: Khi hủy đơn (`cancelled`), hệ thống tự động trừ đúng phần nợ chưa thu (`remaining_amount`) khỏi `customers.total_debt` và hủy lịch nhắc liên quan; nếu đơn đã có tiền thực thu (`paid_amount > 0`), UI cảnh báo xác nhận rõ trước khi hủy và giữ nguyên nhật ký tiền đã thu (không tự tạo số dư âm).
- **Số lượng thập phân (kg/lít)**: Khi bán theo số lượng lẻ (ví dụ `0.5 kg` hoặc `1.25 kg`), `line_total` được làm tròn theo số nguyên VND gần nhất (`Math.round(quantity * unit_price)` / `ROUND(...)::bigint`) để giữ chính xác tuyệt đối tiền nguyên VND.
- **Lần đầu đăng nhập (Empty state)**: Khi tài khoản mới chưa có sản phẩm/khách hàng/cấu hình ngân hàng, tự động tạo `shop_profiles` mặc định và hiển thị thẻ hướng dẫn gọn gàng thay vì bảng trống.
- **Khách trả vượt số nợ hiện tại**: Nếu mẹ nhập số tiền thu nợ lớn hơn tổng nợ của đơn/khách, hệ thống cảnh báo rõ ràng và không cho lưu số dư âm ngoài ý muốn.
- **Thông báo trên iOS Safari**: iOS chỉ hỗ trợ Web Push khi app được mở từ icon PWA đã "Add to Home Screen" (iOS >= 16.4); app phải phát hiện môi trường `standalone` vs trình duyệt thường để hướng dẫn đúng cách.
- **Thông tin ngân hàng sai hoặc thiếu**: Kiểm tra định dạng BIN ngân hàng (6 số) và số tài khoản trước khi sinh QR động.
- **Đồng thời 2 thiết bị thao tác cùng lúc**: Nếu iPhone và Windows cùng cập nhật tồn nợ/đơn hàng, database constraint/RPC đảm bảo số dư nợ không bị ghi đè sai (race condition).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Xác thực & Đa thiết bị)**: Hệ thống PHẢI hỗ trợ đăng ký, đăng nhập qua **Google OAuth (1 chạm)** và **Email + Mật khẩu** (kèm Quên mật khẩu), đăng xuất và duy trì phiên đăng nhập an toàn qua Supabase Auth; toàn bộ dữ liệu PHẢI áp dụng Row Level Security (RLS) theo tài khoản/cửa hàng (`user_id` / `shop_id`).
- **FR-002 (Quản lý sản phẩm & bán hàng POS)**: Hệ thống PHẢI cho phép thêm/sửa/ẩn sản phẩm (tên, đơn vị tính, giá bán VND, danh mục, mã SKU tùy chọn), tìm kiếm nhanh theo tên không dấu/có dấu, thêm món tự do vào giỏ, chỉnh số lượng, giảm giá, ghi chú đơn hàng.
- **FR-003 (Quản lý khách hàng & Sổ nợ)**: Hệ thống PHẢI cho phép quản lý danh bạ khách hàng (tên, SĐT, địa chỉ/ghi chú), xem tổng công nợ từng khách, danh sách đơn còn nợ, ghi nhận trả nợ từng phần hoặc toàn bộ (`debt_payments`), và lưu ngày hẹn thu tiền (`due_date` / `reminder_at`).
- **FR-004 (Nhắc nhở thu nợ & Push Notification iPhone/Windows)**: Hệ thống PHẢI lưu `push_subscriptions` (Web Push VAPID) theo thiết bị trong Supabase, cung cấp nút bật/tắt & test notification, và gửi thông báo theo **2 cơ chế**: (1) **Tổng hợp đầu ngày** vào giờ cấu hình (mặc định `08:30`) cho các khoản đến hạn/quá hạn trong ngày, và (2) **Hẹn giờ riêng** cho từng khách/đơn; khi chạm thông báo trên Windows (Chrome/Edge) hoặc iPhone (iOS PWA), hệ thống mở thẳng màn hình Sổ nợ / thẻ công nợ kèm nút tạo QR của khách đó.
- **FR-005 (QR động VietQR)**: Hệ thống PHẢI cho phép lưu cấu hình ngân hàng nhận tiền của shop và tự động tạo mã QR động chuẩn VietQR (Napas 247 / EMVCo) với chính xác số tiền cần thu (mặc định **Tổng dư nợ của khách** khi tạo từ Sổ nợ — trừ FIFO đơn cũ trước khi xác nhận đã thu, hoặc số tiền còn thiếu của đơn khi tạo từ đơn hàng; cho phép chuyển sang từng đơn lẻ hoặc sửa tay số tiền), hỗ trợ chia sẻ/tải ảnh QR PNG và copy mẫu tin nhắn nhắc nợ gửi Zalo/SMS.
- **FR-006 (Hóa đơn điện tử PDF & IMG tùy biến)**: Hệ thống PHẢI tạo được bản xem trước hóa đơn chi tiết tiếng Việt đầy đủ, hỗ trợ **tùy chọn tick bật/tắt** hiển thị *Công nợ lũy kế* (Nợ cũ + Đơn này − Đã trả = Tổng nợ còn lại) so với *chỉ thông tin đơn hàng cơ bản* và bật/tắt *mã VietQR*; hỗ trợ chuyển đổi khổ **A5 / PNG** (tải về / chia sẻ Zalo) và **khổ nhiệt 80mm** (in trực tiếp / lưu PDF).
- **FR-007 (Thống kê bán hàng trực quan)**: Hệ thống PHẢI cung cấp báo cáo theo bộ lọc thời gian (Hôm nay, 7 ngày, 30 ngày, Tháng này, Tùy chọn) gồm: Doanh thu, Thực thu, Lợi nhuận gộp ước tính (tính cho các món có nhập giá vốn tùy chọn `cost_price`), Công nợ phát sinh, Tổng nợ hiện tại, Số đơn; kèm **biểu đồ cột Doanh thu vs Thực thu theo ngày**, **tỷ trọng Tiền mặt / Chuyển khoản / Ghi nợ**, **phân nhóm tuổi nợ (Trong hạn / Quá hạn)**, Top sản phẩm và Top khách nợ.
- **FR-008 (Lưu trữ Cloud & Real-Time Sync)**: Mọi dữ liệu PHẢI lưu trên Supabase PostgreSQL (không lưu cục bộ tạm thời rồi mất khi refresh) và đồng bộ real-time qua Supabase Realtime (`postgres_changes`) giữa các thiết bị đang mở.
- **FR-009 (Responsive & PWA)**: Giao diện PHẢI hoạt động mượt mà trên màn hình mobile (`375px+`, bottom tab bar, tap target ≥ 48px) và desktop (`1024px+`, split-pane POS), kèm `manifest.json` và Service Worker chuẩn PWA.
- **FR-010 (Thiết kế Anti-AI-Slop)**: Toàn bộ giao diện PHẢI tuân thủ `DESIGN.md` (bảng màu `#F8F9FA` + `#0E6B4E`, font `Be Vietnam Pro` + `JetBrains Mono`, không dùng gradient tím/indigo, không lặp bố cục SaaS AI mặc định).

### Key Entities

- **ShopProfile (`shop_profiles`)**: Thông tin cửa hàng gắn với `user_id` (tên shop, SĐT, địa chỉ, bank_bin, bank_name, bank_account_no, bank_account_name, `reminder_digest_enabled`, `reminder_default_hour` mặc định `08:30`, `default_invoice_format`: `a5 | 80mm`, `default_show_cumulative_debt`: `boolean`, `default_show_qr_on_invoice`: `boolean`).
- **Product (`products`)**: Mặt hàng kinh doanh (tên, tên chuẩn hóa không dấu để tìm nhanh, đơn vị tính, giá bán nguyên `bigint`, giá vốn tùy chọn `cost_price` nullable `bigint`, danh mục, trạng thái `is_active`).
- **Customer (`customers`)**: Khách hàng (tên, SĐT, ghi chú, tổng nợ hiện tại hoặc tính từ orders/payments).
- **Order (`orders`)**: Hóa đơn bán hàng (mã đơn `order_code`, `customer_id` nullable nếu khách lẻ, `subtotal`, `discount_amount`, `total_amount`, `paid_amount`, `payment_status`: `paid | partial | unpaid | cancelled`, `payment_method`, `debt_due_date`, `note`, `created_at`).
- **OrderItem (`order_items`)**: Chi tiết từng dòng hàng trong đơn (snapshot `product_name`, `unit_price`, `cost_price` nullable `bigint`, `quantity`, `line_total` để giá cũ & tiền lời không bị sai nếu sau này mẹ đổi giá sản phẩm).
- **DebtPayment (`debt_payments`)**: Lịch sử thu nợ (liên kết `customer_id` và `order_id`, số tiền thu `amount`, phương thức `cash | transfer`, ghi chú, `paid_at`).
- **DebtReminder (`debt_reminders`) / PushSubscription (`push_subscriptions`)**: Lịch nhắc thu tiền (`customer_id`, `order_id` nullable, `reminder_type`: `digest | custom`, `scheduled_for`, `target_url`, `status`: `pending | sent | dismissed`) và token đăng ký Web Push của từng thiết bị iPhone/Windows.

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
