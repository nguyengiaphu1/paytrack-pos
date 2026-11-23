# Feature Specification: Sổ Bán Hàng 12 Trường, Thao Tác POS Nhanh & Đại Tu Giao Diện Floating Glass Dock

**Feature Branch**: `feat/003-mom-ledger-glass-dock`
**Created**: 2026-11-23
**Status**: Approved
**Input**: Nâng cấp PayTrack POS thành sổ bán hàng 12 trường thực tế cho chủ tiệm (họ tên, địa chỉ, SĐT, ngày mua, món hàng, giá vốn, giá bán, lãi, trạng thái TT, 9 tên TK thanh toán + Khác, ngày TT), tối ưu nhập liệu 1 tay (đơn vị nghìn đồng `K`/`.000 đ` chống nhập nhầm 1000x, nút `-`/`+` số lượng, khối khách hàng lộ thẳng ngoài màn hình POS), tối giản trang Cài đặt, dọn sạch chữ thừa AI-slop, bổ sung icon & màn hình splash PWA, và đại tu giao diện sang Floating Glass Dock theo hệ màu 60–30–10.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sổ Bán Hàng Đủ 12 Trường, Tính Lãi & Lọc 9 Tên TK Thanh Toán (Priority: P1)

Chủ tiệm mở mục **Sổ bán** (`Orders`) để xem đầy đủ 12 trường ghi chép thực tế cho từng đơn hàng: (1) STT động, (2) Họ tên người mua, (3) Địa chỉ, (4) SĐT, (5) Ngày mua hàng, (6) Món hàng tóm tắt, (7) Giá vốn, (8) Giá bán, (9) Lãi, (10) Trạng thái thanh toán, (11) Tên TK thanh toán (gồm đúng 9 lựa chọn cố định: `Thanh`, `Phú`, `Trang`, `Trang Lê`, `Thuỳ Trang`, `Thuỷ`, `Kiều Thương`, `Vận chuyển`, `Khác` kèm ghi chú `Khác: ...`), và (12) Ngày thanh toán. Chủ tiệm có thể lọc theo Tên TK, trạng thái, từ khóa, xem thanh tổng hợp (Tổng giá bán, Tổng giá vốn, Tổng lãi không tính đơn đã hủy), chỉnh sửa tay các thông tin sổ (ngày mua, ngày TT, Tên TK, địa chỉ, SĐT, giá vốn), thu nợ trực tiếp từ dòng đơn nợ, và xuất sổ ra tệp CSV chuẩn Excel tiếng Việt.

**Why this priority**: Đây là lõi nghiệp vụ kế toán hằng ngày giúp chủ tiệm bỏ sổ giấy mà vẫn đối chiếu được tiền vào từng tài khoản và tiền lãi thật.

**Independent Test**: Tạo đơn mới có địa chỉ, SĐT, giá vốn, ngày mua tùy chỉnh và Tên TK thanh toán (`Thanh` hoặc `Khác: Momo`); mở trang Sổ bán xác nhận đủ 12 trường, tổng Giá bán / Giá vốn / Lãi chính xác, lọc theo Tên TK trả về đúng đơn, chỉnh sửa tay ngày mua/ngày thanh toán/giá vốn lưu thành công, và xuất CSV mở được đủ 12 cột tiếng Việt có dấu.

**Acceptance Scenarios**:

1. **Given** chủ tiệm đã tạo đơn hàng có giá bán `250.000đ`, giá vốn `180.000đ`, Tên TK `Thuỳ Trang`, đã trả đủ, **When** mở Sổ bán, **Then** dòng đơn hiển thị đủ 12 trường với STT `1`, Lãi `70.000đ`, Tên TK `Thuỳ Trang`, và Ngày thanh toán tự động điền theo ngày mua/ngày thanh toán.
2. **Given** đơn hàng được thanh toán qua lựa chọn `Khác` với ghi chú `Tiền mặt cô Ba`, **When** lọc theo Tên TK `Khác`, **Then** đơn hiển thị `Khác: Tiền mặt cô Ba` và thanh tổng kết chỉ tính tổng Giá bán, Giá vốn, Lãi của các đơn khớp bộ lọc (loại trừ đơn `cancelled`).
3. **Given** một đơn cũ chưa nhập giá vốn từng món, **When** xem Sổ bán, **Then** hệ thống hiển thị nhãn nhắc `Chưa nhập vốn` và cho phép bấm vào đơn để bổ sung giá vốn, tự cập nhật lại Tổng giá vốn và Lãi của đơn.
4. **Given** một đơn đang ở trạng thái `unpaid` hoặc `partial`, **When** chủ tiệm bấm **Thu tiền** ngay trên dòng sổ (hoặc ở Sổ nợ) và trả hết nợ với Tên TK `Phú` cùng ngày thanh toán tùy chọn, **Then** trạng thái đơn chuyển sang `paid`, `paid_at` được ghi nhận, công nợ khách giảm chính xác và Tên TK thanh toán hiển thị nhất quán.

---

### User Story 2 - Nhập Tiền Nhanh Theo Nghìn Đồng (`K` / `.000 đ`), Stepper `-`/`+` & Lộ Khách Hàng Ngoài POS (Priority: P1)

Khi đứng bán ở quầy bằng một tay trên điện thoại (`375px`) hoặc máy tính (`1280px`), chủ tiệm nhìn thấy ngay **Thanh Khách Hàng** ở đầu màn hình Bán hàng (không cần mở Giỏ hàng), bấm 1 chạm để chọn hoặc thêm khách mới (có tách riêng ô Địa chỉ và SĐT). Khi chạm món hàng, thẻ món sáng lên và hiện cụm `- [SL] +` để tăng/giảm số lượng tức thì. Khi gõ giá bán, giá vốn, giảm giá, tiền khách đưa hay tiền thu nợ, chủ tiệm chỉ cần gõ số nghìn đồng (VD: `50` -> `50.000đ`, `12,5` hoặc `12.5` -> `12.500đ`) trong khi hệ thống vẫn lưu đồng VND chính xác (`50000`, `12500`) vào cơ sở dữ liệu và VietQR.

**Why this priority**: Giảm 50% số lần bấm phím và tránh lỗi bỏ quên khách hàng khi bán nhanh trên iPhone.

**Independent Test**: Trên viewport `375px`, chọn khách quen ngay đầu màn hình POS (không mở Giỏ hàng), thêm món bằng bấm thẻ rồi tăng/giảm bằng `-`/`+`, mở Bán món lẻ nhập giá `35` và giá vốn `22,5`, thanh toán và xác nhận DB lưu đúng `35000đ`, `22500đ`, đúng tên/SĐT/địa chỉ khách đã chọn.

**Acceptance Scenarios**:

1. **Given** chủ tiệm mở màn hình Bán hàng trên iPhone (`375px`), **When** chưa thêm món nào vào giỏ, **Then** khối Khách hàng vẫn hiển thị ngay đầu màn hình, hiển thị `Khách lẻ` hoặc tên + SĐT + địa chỉ + nợ cũ của khách đang chọn và cho phép đổi/thêm khách chỉ với 1 chạm.
2. **Given** món hàng `Gạo ST25` có trong danh sách POS, **When** chủ tiệm chạm vào thẻ lần 1, **Then** số lượng vào giỏ là `1` và cụm stepper `- 1 +` (nút cao `>= 44px`) hiện ngay trên thẻ để tăng/giảm tức thì hoặc chạm vào số để gõ tay.
3. **Given** chủ tiệm nhập giá trong các form tiền tệ (`VndKInput`), **When** gõ `50` hoặc `12,5`, **Then** ô nhập hiển thị hậu tố `.000 đ` cố định và quy đổi chính xác sang `50000` / `12500` VND; khi mở lại để sửa giá `125000` sẽ tự hiển thị `125`.
4. **Given** chủ tiệm lỡ quen tay gõ `50000` vào ô nghìn đồng (thành `50.000.000đ`), **When** số gõ `>= 10000` và chia hết cho `1000`, **Then** hiển thị cảnh báo gọn có nút 1 chạm đổi lại thành `50` (`50.000đ`) để tránh sai lệch 1000 lần.

---

### User Story 3 - Đại Tu Giao Diện Floating Glass Dock, Hệ Màu 60–30–10, PWA Icon/Splash & Tối Giản Copy/Settings (Priority: P2)

Chủ tiệm sử dụng ứng dụng trên cả iPhone PWA và máy tính Windows với thanh điều hướng **Floating Glass Dock** mờ kính thời gian thực nổi gọn ở đáy màn hình (giải phóng toàn bộ chiều ngang desktop cho bảng Sổ 12 cột). Hệ màu tuân thủ 60% nền dịu mắt – 30% bề mặt/kính phân tầng – 10% điểm nhấn thương hiệu Jade `#0E6B4E` và trạng thái nợ Amber/Crimson. Mọi chữ thừa, lời chào rườm rà và cấu hình kỹ thuật dài dòng ở trang Cài đặt được dọn sạch. Khi cài app ra màn hình chính điện thoại hoặc mở trên tab PC, biểu tượng PayTrack POS sắc nét cùng màn hình khởi động (Boot Splash) hiện nhanh, không nháy trắng ở Dark Mode.

**Why this priority**: Tăng rõ rệt sự gọn gàng, độ đọc bảng 12 cột trên desktop và cảm giác chuyên nghiệp, dễ dùng hằng ngày trên iPhone.

**Independent Test**: Kiểm tra cả 5 trang ở `375px` và `1280px` trên Light & Dark Mode: Floating Glass Dock không che nội dung/nút bấm, không tràn ngang, Settings gọn còn 4 khối, không còn chữ giải thích thừa/AI-slop, hóa đơn & VietQR vẫn giữ nền giấy trắng `.print-surface-light`, manifest & icon đầy đủ cho iOS/Android/Desktop.

**Acceptance Scenarios**:

1. **Given** người dùng mở ứng dụng ở `1280px` và `375px`, **When** chuyển đổi qua 5 trang (`Bán hàng`, `Sổ nợ`, `Sổ bán`, `Thống kê`, `Cài đặt`), **Then** Floating Glass Dock hiển thị hiệu ứng blur nền rõ nét, không còn left rail `228px`, và phần đệm cuối trang đảm bảo không nội dung hay nút nào bị Dock che.
2. **Given** người dùng mở trang Cài đặt, **When** cuộn xem toàn bộ trang, **Then** chỉ có 4 khối thiết yếu (Cửa hàng & VietQR, Giao diện, Nhắc nợ, Tài khoản); phần chẩn đoán kỹ thuật thông báo nằm gọn trong mục đóng/mở *"Kiểm tra kết nối"* mà không mất chức năng nhắc nợ hiện tại.
3. **Given** người dùng mở ứng dụng ở chế độ Tối (Dark Mode), **When** tải lại trang hoặc xem Hóa đơn / VietQR, **Then** màn hình Splash vào app khớp nền tối không chớp sáng (`zero-flash`), và khung Hóa đơn / mã VietQR luôn giữ nền giấy trắng chữ đen (`.print-surface-light`).

---

### Edge Cases

- **Nhập giá đơn vị `K` với dấu phẩy/chấm/rỗng/lẻ**: `""` -> `null` hoặc `0` tùy ô bắt buộc; `"12,5"` và `"12.5"` -> `12500`; `"0.5"` -> `500`; `"0"` -> `0`; `"125.000"` nếu user gõ nhầm dấu chấm ngăn cách hàng nghìn hay `"50000"` được phát hiện bằng gợi ý chuyển đổi an toàn.
- **Đơn hủy (`cancelled`)**: Không bao giờ cộng vào Tổng giá bán, Tổng giá vốn, Tổng lãi ở cả Sổ bán (`Orders`) và Thống kê (`Stats`).
- **Đơn cũ trước migration `0005`**: Tự động backfill `purchased_at = created_at`, `customer_phone_snapshot` từ `customers.phone`, `paid_at = updated_at/created_at` cho đơn đang `paid`, `order_items.cost_price` từ `products.cost_price` (nếu có), và `orders.total_cost` từ tổng `order_items`.
- **Trả nợ nhiều lần trên cùng 1 đơn**: `debt_payments` lưu lịch sử từng lần với `payment_account`, `payment_account_note`, `paid_at`; `orders.paid_at` chỉ điền khi đơn được tất toán 100% (`paid`).
- **Địa chỉ dài / Ghi chú `Khác: ...` dài / Số tiền hàng trăm triệu**: Không gây tràn ngang trên `375px`, các cột số luôn dùng `tabular-nums`, cột chữ tự xuống dòng hoặc rút gọn có xem chi tiết.
- **`prefers-reduced-motion` & `prefers-reduced-transparency`**: Giảm/tắt hiệu ứng chuyển động trên Splash và tăng độ đục nền cho `.glass-dock` / `.glass-surface` để giữ tương phản WCAG AA.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống PHẢI lưu trữ và hiển thị đầy đủ 12 trường Sổ bán hàng (STT động, Họ tên, Địa chỉ, SĐT, Ngày mua hàng, Món hàng, Giá vốn, Giá bán, Lãi, Trạng thái thanh toán, Tên TK thanh toán, Ngày thanh toán) với toàn bộ số tiền VND lưu kiểu số nguyên `bigint` chuẩn và tuân thủ tuyệt đối RLS `user_id = auth.uid()`.
- **FR-002**: Hệ thống PHẢI cung cấp đúng 9 lựa chọn Tên TK thanh toán dùng chung: `Thanh`, `Phú`, `Trang`, `Trang Lê`, `Thuỳ Trang`, `Thuỷ`, `Kiều Thương`, `Vận chuyển`, `Khác`. Khi chọn `Khác`, hiển thị ô nhập ghi chú lưu vào `payment_account_note`.
- **FR-003**: Hệ thống PHẢI hỗ trợ lọc Sổ bán theo Tên TK thanh toán, trạng thái thanh toán, khoảng thời gian và tìm kiếm không dấu (mã đơn, tên khách, SĐT, địa chỉ, tên món, ghi chú TK), đồng thời cập nhật thanh tổng kết (Tổng giá bán, Tổng giá vốn, Tổng lãi — bỏ đơn hủy) khớp 100% bộ lọc.
- **FR-004**: Hệ thống PHẢI cho phép chỉnh sửa tay `purchased_at`, `paid_at`, `payment_account`, `payment_account_note`, địa chỉ, SĐT, ghi chú và giá vốn của đơn hàng sau khi tạo thông qua thao tác an toàn không làm sai lệch công nợ khách hàng.
- **FR-005**: Hệ thống PHẢI hỗ trợ ghi nhận thu nợ (`record_debt_payment`) kèm Tên TK thanh toán (`payment_account`, `payment_account_note`) và ngày thanh toán (`paid_at`), có thể thao tác từ cả Sổ nợ (`Debts`) và trực tiếp trên dòng đơn còn nợ ở Sổ bán (`Orders`).
- **FR-006**: Hệ thống PHẢI cho phép xuất danh sách Sổ bán đang lọc ra tệp CSV chuẩn UTF-8 BOM gồm đúng 12 cột để mở trực tiếp trên Microsoft Excel không lỗi dấu tiếng Việt.
- **FR-007**: Hệ thống PHẢI cung cấp bộ nhập tiền theo đơn vị nghìn đồng (`K` / `.000 đ`) cho tất cả ô tiền bán hàng, giá vốn, giảm giá, thanh toán và thu nợ, luôn quy đổi chính xác sang số nguyên VND (`bigint`) khi lưu và có cảnh báo 1 chạm chống nhập nhầm thừa 3 số `0`.
- **FR-008**: Hệ thống PHẢI hiển thị khối chọn/tìm/thêm nhanh Khách hàng (Họ tên, SĐT, Địa chỉ) trực tiếp ở đầu màn hình POS trên cả `375px` và `1280px`, không giấu trong Giỏ hàng, đồng thời hỗ trợ sửa nhanh thông tin giao nhận lúc thanh toán.
- **FR-009**: Hệ thống PHẢI cung cấp cụm nút tăng/giảm số lượng (`-`/`+`, chạm `>= 44px`) trực tiếp trên thẻ sản phẩm POS khi đã thêm vào giỏ, trong giỏ hàng và trong `QuickItemModal`.
- **FR-010**: Hệ thống PHẢI cập nhật `get_analytics_summary` để tính doanh thu, tổng giá vốn, lợi nhuận theo `purchased_at` và hỗ trợ lọc theo `payment_account`.
- **FR-011**: Hệ thống PHẢI thay thế thanh điều hướng cũ (desktop left rail + mobile bottom bar) bằng Floating Glass Dock sử dụng `.glass-dock` / `.glass-surface` theo tỷ lệ màu 60–30–10, giữ nguyên màu nhận diện Jade `#0E6B4E` / Debt `#B45309` / Overdue `#B91C1C` đạt tương phản WCAG AA trên cả Light và Dark Mode.
- **FR-012**: Hệ thống PHẢI cung cấp đầy đủ bộ icon PWA sắc nét (iOS `180x180`, Android `192/512` + `maskable`, Desktop `favicon.svg` + `favicon.ico`), `theme-color` khớp Light/Dark, và màn hình khởi động (`AppBootSplash`) không chớp sáng và tôn trọng `prefers-reduced-motion`.
- **FR-013**: Hệ thống PHẢI tối giản trang Cài đặt thành 4 khối thiết yếu, giữ nguyên tính năng thông báo đẩy nhắc nợ (ẩn phần kỹ thuật vào mục đóng/mở), và dọn sạch toàn bộ chữ giải thích thừa / văn phong AI-slop trên cả 5 trang và các modal.
- **FR-014**: Hệ thống PHẢI bảo toàn tuyệt đối `.print-surface-light` trên Hóa đơn & VietQR, cỡ chữ `>= 16px` cho mọi ô nhập liệu, vùng chạm `>= 44px`, và lệnh cấm token AI-slop (`indigo-`, `purple-`, `bg-clip-text`, `Sparkles`, `animate-bounce`, `tracking-widest`).

### Key Entities

- **Customer**: Bổ sung `address` (tách khỏi `note`), đồng bộ `search_text` gồm cả tên, SĐT và địa chỉ.
- **Order**: Bổ sung `customer_address_snapshot`, `customer_phone_snapshot`, `purchased_at`, `total_cost`, `payment_account`, `payment_account_note`, `paid_at`.
- **OrderItem**: Giữ `cost_price` snapshot từng món tại thời điểm bán (cho phép bổ sung sau nếu thiếu).
- **DebtPayment**: Bổ sung `payment_account`, `payment_account_note` cùng `paid_at` tùy chỉnh.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% đơn hàng mới và cũ đều hiển thị đầy đủ 12 trường trên Sổ bán (`Orders`) với độ lệch tính toán `0đ` giữa tổng chi tiết món, tổng giá vốn, tổng lãi và tổng công nợ.
- **SC-002**: Bộ chuyển đổi đơn vị nghìn đồng (`K <-> VND`) đạt độ chính xác 100% qua unit test cho số nguyên, số thập phân dấu `.` và `,`, giá trị `0`, rỗng, round-trip và phát hiện nhập nhầm hệ số 1000x.
- **SC-003**: Trên màn hình di động `375px`, chủ tiệm chọn khách, chỉnh số lượng món bằng `-`/`+` và lên đơn hoàn tất không cần mở giỏ hàng để tìm mục Khách hàng và không xuất hiện thanh cuộn ngang.
- **SC-004**: Trên màn hình máy tính `1280px`, bảng Sổ 12 cột tận dụng toàn bộ chiều rộng cửa sổ (không bị cột sidebar 228px chiếm chỗ), Floating Glass Dock không che bất kỳ nút thao tác nào.
- **SC-005**: Trang Cài đặt giảm xuống còn 4 khối gọn gàng không đánh số thừa, đọc hiểu nhanh trong một lần cuộn mà không làm gián đoạn luồng gửi thông báo nhắc nợ tự động.
- **SC-006**: 100% kiểm tra tự động (`typecheck`, `lint`, `test`, `build`) vượt qua sạch lỗi, bao gồm test mới cho Sổ 12 trường, bộ chuyển đổi `K <-> VND`, và bộ kiểm tra bảo vệ UX/Anti-AI-Slop.

## Assumptions

- Danh sách 9 Tên TK thanh toán (`Thanh`, `Phú`, `Trang`, `Trang Lê`, `Thuỳ Trang`, `Thuỷ`, `Kiều Thương`, `Vận chuyển`, `Khác`) là hằng số dùng chung cố định theo nghiệp vụ thực tế của cửa hàng; giá trị mới ngoài danh sách được nhập qua `Khác` + `payment_account_note`.
- Đơn vị tiền tệ mặc định khi nhập liệu là nghìn đồng (`K` / `.000 đ`), còn mọi giá trị lưu DB, hiển thị hóa đơn, VietQR và file xuất CSV là đồng VND đầy đủ.
- Migration `0005_mom_ledger_fields.sql` sẽ được người dùng áp dụng lên Supabase production (`mezuxaqvbtjbbtugsohm`) trước khi đưa nhánh `feat/003-mom-ledger-glass-dock` vào `main`.
