# Feature Specification: Nâng cấp Trải nghiệm Trực quan, Màn hình Chờ & Chế độ Sáng/Tối (UX Polish & Theme)

**Feature Branch**: `feat/002-ux-polish-theme`  
**Created**: 2026-11-17  
**Status**: Draft  
**Input**: User description: "1. Màn hình loading và skeleton 2. Màn hình welcome 3. Chỉnh sửa lại giao diện trực quan hơn với người low-tech 4. Thêm toggle light dark mode và có chức năng follow device setting (lúc chuyển light <-> dark mode làm cho nó mượt chứ k phải giật cục) 5. Thêm một số animation giúp tăng trải nghiệm người dùng"

## Clarifications

### Session 2026-11-17

- Q: Bạn muốn "Màn hình welcome" xuất hiện ở đâu và phục vụ mục đích nào? → A: **Kết hợp cả 3 lớp**: (1) màn hình chào thân thiện trước khi đăng nhập (giới thiệu ngắn gọn lợi ích chính + nút lớn "Đăng nhập" / "Mở sổ bán hàng mới"), (2) hướng dẫn thiết lập nhanh 3 bước cho chủ tiệm mới vào lần đầu (tên tiệm, ngân hàng QR, món đầu tiên, có nút "Bỏ qua / Bán ngay" và mở lại được từ Cài đặt), và (3) lời chào mừng thân thiện mỗi khi đăng nhập vào trang chủ (kèm gợi ý nhanh gọn mà không che khuất danh mục bán hàng).
- Q: Phạm vi chỉnh sửa giao diện trực quan hơn cho người ít rành công nghệ (low-tech) nên áp dụng ở mức nào? → A: **Toàn bộ 5 màn hình chính (Bán hàng, Sổ nợ, Đơn hàng, Thống kê, Cài đặt) và màn hình Đăng nhập** — đồng bộ ngôn ngữ tiếng Việt bình dân, trạng thái trống có hướng dẫn bước tiếp theo, nhãn mô tả ngắn dễ hiểu và nút bấm chính to rõ.
- Q: Tùy chọn giao diện Sáng / Tối / Theo thiết bị được lưu riêng theo từng máy hay đồng bộ qua tài khoản? → A: **Lưu riêng theo từng thiết bị** (mặc định là **Theo thiết bị**), giúp điện thoại dùng ban đêm và máy tính quầy bán hàng ban ngày giữ chế độ độc lập và áp dụng tức thì không chớp nháy.
- Q: Màn hình chào trước khi đăng nhập và lời chào trang chủ hằng ngày hiển thị ra sao để không làm chậm thao tác bán hàng? → A: **Tích hợp gọn nhẹ**: trước khi đăng nhập hiển thị phần chào giới thiệu ngắn gọn ngay cùng biểu mẫu đăng nhập/mở sổ mới (không thêm bước bấm thừa); tại trang chủ Bán hàng hiển thị dải chào mừng mỏng theo buổi kèm gợi ý nhanh, có nút thu gọn 1 chạm và ghi nhớ trạng thái thu gọn trong ngày/phiên làm việc.
- Q: Tài khoản nào sẽ tự động thấy hướng dẫn thiết lập nhanh 3 bước khi đăng nhập? → A: **Tất cả tài khoản thấy một lần sau khi cập nhật** (bao gồm cả tiệm đang dùng), kèm nút **"Bỏ qua, vào bán hàng ngay"**, trạng thái hoàn tất/bỏ qua được lưu theo tài khoản để không hiện lại trên thiết bị khác và luôn mở lại được từ Cài đặt.
- Q: Nút chuyển giao diện Sáng / Tối / Theo thiết bị nên đặt ở đâu để dễ tìm và tiện đổi nhanh? → A: **Cài đặt + Nút đổi nhanh trên thanh tiêu đề/thanh bên (và màn hình Đăng nhập)** — trong Cài đặt có đầy đủ bộ chọn 3 chế độ (Sáng / Tối / Theo thiết bị), đồng thời có nút chuyển nhanh 1 chạm ngay ở đầu trang di động, chân thanh bên máy tính và góc màn hình Đăng nhập.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chuyển đổi Sáng / Tối / Theo thiết bị mượt mà (Priority: P1)

Chủ shop có thể chọn giao diện **Sáng** (dễ nhìn dưới ánh sáng ban ngày tại quầy), **Tối** (dịu mắt khi kiểm sổ buổi tối), hoặc **Theo thiết bị** (tự động đổi theo chế độ của iPhone hoặc Windows). Khi chuyển qua lại giữa chế độ Sáng và Tối, màu nền, chữ, viền và các thẻ thông tin chuyển đổi êm dịu, không bị nhấp nháy hay giật cục. Riêng hóa đơn in/xuất ảnh và thẻ mã VietQR luôn giữ nền sáng rõ nét để khách quét mã và máy in không bị lỗi tương phản.

**Why this priority**: Chủ shop dùng app từ sáng sớm ngoài quầy nắng đến tối muộn tổng kết sổ sách; chuyển chế độ Sáng/Tối mượt mà theo máy hoặc thủ công bảo vệ mắt và giữ cảm giác chuyên nghiệp, tin cậy của một sổ bán hàng.

**Independent Test**: Mở ứng dụng trên cả điện thoại và máy tính; thử cả 3 lựa chọn (Sáng / Tối / Theo thiết bị), bấm chuyển đổi trực tiếp để quan sát hiệu ứng chuyển màu mượt, sau đó tải lại trang để xác nhận chế độ đã chọn không bị chớp nháy sai màu lúc mới mở.

**Acceptance Scenarios**:

1. **Given** người dùng đang ở giao diện Sáng (trên bất kỳ màn hình chính nào hoặc ở màn hình Đăng nhập), **When** người dùng chọn chế độ **Tối** từ nút chuyển nhanh trên thanh tiêu đề/thanh bên hoặc bộ chọn 3 chế độ trong **Cài đặt**, **Then** toàn bộ nền, thẻ nội dung, chữ, đường viền và biểu đồ chuyển sang bảng màu Tối một cách êm dịu, liên tục (không nhấp nháy trắng/đen hay đổi đột ngột), và chữ vẫn đạt độ tương phản cao, dễ đọc.
2. **Given** người dùng chọn chế độ **Theo thiết bị**, **When** hệ điều hành trên iPhone hoặc Windows đổi từ Sáng sang Tối (hoặc ngược lại), **Then** giao diện ứng dụng tự động chuyển màu tương ứng ngay lập tức mà không cần tải lại trang.
3. **Given** người dùng đã chọn một chế độ giao diện bất kỳ, **When** người dùng tắt và mở lại ứng dụng hoặc làm mới trang, **Then** giao diện hiển thị đúng chế độ đã lưu ngay từ khung hình đầu tiên, không bị lóe sáng rồi mới đổi màu.
4. **Given** ứng dụng đang ở chế độ Tối, **When** người dùng mở xem trước hóa đơn hoặc thẻ mã QR chuyển khoản, **Then** phần hóa đơn và thẻ QR dùng để xuất ảnh/in vẫn giữ nền trắng, chữ đen sắc nét để quét mã và in ấn chính xác.

---

### User Story 2 - Màn hình Loading, Splash & Skeleton đúng ngữ cảnh (Priority: P1)

Khi mở ứng dụng lần đầu, chuyển qua lại giữa các mục chính (Bán hàng, Sổ nợ, Đơn hàng, Thống kê, Cài đặt), hoặc khi dữ liệu đang đồng bộ từ máy chủ, người dùng luôn thấy màn hình chờ có thương hiệu rõ ràng hoặc khung xương (skeleton) mô phỏng đúng bố cục trang sắp hiện ra thay vì màn hình trắng trơn hoặc hộp xám chung chung.

**Why this priority**: Người dùng phổ thông (low-tech) rất dễ nghĩ "máy bị đơ" hoặc bấm lặp nhiều lần nếu thấy màn hình trắng khi mạng chậm. Màn hình chờ và skeleton đúng ngữ cảnh tạo cảm giác ứng dụng phản hồi nhanh và đáng tin cậy.

**Independent Test**: Mô phỏng mạng chậm hoặc chuyển lần lượt qua cả 5 mục chính và mở lại ứng dụng; xác nhận màn hình chờ thương hiệu và các khối skeleton khớp với bố cục thật của từng trang, sau đó chuyển mượt sang dữ liệu thật khi tải xong.

**Acceptance Scenarios**:

1. **Given** người dùng mở ứng dụng (đặc biệt khi khởi chạy từ màn hình chính điện thoại), **When** phiên làm việc và dữ liệu ban đầu đang tải, **Then** hiển thị màn hình chờ có biểu tượng PayTrack POS, tên ứng dụng và thông báo ngắn thân thiện bằng tiếng Việt (ví dụ: *"Đang mở sổ bán hàng..."*).
2. **Given** người dùng chuyển đến bất kỳ trang nào trong 5 trang chính khi dữ liệu chưa sẵn sàng, **When** trang đang tải, **Then** hiển thị khung xương (skeleton) có hình dạng tương ứng với trang đó (ví dụ: lưới sản phẩm & giỏ hàng ở Bán hàng; thanh tổng nợ & danh sách khách ở Sổ nợ; thẻ biểu đồ ở Thống kê).
3. **Given** người dùng bấm một thao tác quan trọng (như lưu đơn, thu nợ, đăng nhập), **When** hệ thống đang xử lý, **Then** nút bấm hiển thị trạng thái đang xử lý rõ ràng và khóa bấm đúp để tránh tạo trùng đơn hàng.

---

### User Story 3 - Giao diện trực quan, dễ hiểu cho người dùng ít rành công nghệ (low-tech) (Priority: P1)

Giao diện được tinh chỉnh theo hướng "nhìn là hiểu ngay, bấm là đúng": ngôn ngữ tiếng Việt đời thường, nút bấm chính to rõ kèm nhãn mô tả hành động cụ thể, các trạng thái trống có hướng dẫn bước tiếp theo rõ ràng, và giảm bớt thuật ngữ hoặc ký hiệu khó hiểu.

**Why this priority**: Đối tượng sử dụng chính là chủ tiệm tạp hóa/bán lẻ có thể lớn tuổi hoặc ít quen phần mềm phức tạp. Nếu giao diện thiếu gợi ý hoặc chữ quá nhỏ/trừu tượng, người dùng sẽ ngại dùng hoặc thao tác nhầm.

**Independent Test**: Đưa cho một người chưa từng dùng ứng dụng thực hiện 3 tác vụ: (1) thêm món & thanh toán, (2) ghi nợ & thu nợ cho khách, (3) tạo mã QR thu tiền — mà không cần giải thích bằng lời.

**Acceptance Scenarios**:

1. **Given** người dùng mở một danh sách còn trống (chưa có sản phẩm, chưa có đơn hàng, hoặc chưa có khách nợ), **When** nhìn vào màn hình, **Then** hiển thị lời giải thích thân thiện bằng tiếng Việt và nút hành động chính nổi bật để bắt đầu ngay (ví dụ: *"Chưa có món nào — Bấm để thêm món đầu tiên"*).
2. **Given** người dùng thực hiện thanh toán đơn hàng hoặc thu nợ, **When** chọn hình thức trả tiền hoặc nhập số tiền khách đưa, **Then** màn hình hiển thị rõ ràng bằng tiếng Việt dễ hiểu số tiền khách trả, tiền thối lại hoặc số tiền còn ghi nợ trước khi bấm nút xác nhận to, dễ chạm.
3. **Given** người dùng thao tác trên bất kỳ màn hình nào trong 5 màn hình chính (Bán hàng, Sổ nợ, Đơn hàng, Thống kê, Cài đặt) hoặc màn hình Đăng nhập, **When** người dùng nhìn hoặc chạm vào các điều khiển, **Then** tất cả nút bấm chính đạt kích thước dễ chạm, các biểu tượng quan trọng luôn đi kèm chữ nhãn tiếng Việt rõ ràng (không chỉ có icon trơ trọi gây đoán mò), và các tùy chọn ít quen thuộc có dòng giải thích ngắn bên dưới.

---

### User Story 4 - Trải nghiệm Welcome 3 lớp thân thiện (trước đăng nhập, lần đầu mở sổ & mỗi lần vào trang chủ) (Priority: P2)

Người dùng luôn được chào đón rõ ràng và ấm áp ở đúng thời điểm: trước khi đăng nhập có màn hình chào giới thiệu công dụng chính; lần đầu mở sổ có hướng dẫn thiết lập nhanh 3 bước; và mỗi lần đăng nhập vào trang chủ có lời chào thân thiện theo tên tiệm kèm lối tắt hữu ích mà không làm vướng khu vực bán hàng.

**Why this priority**: Ấn tượng đầu tiên và cảm giác thân thuộc mỗi ngày giúp người ít rành công nghệ tự tin sử dụng ứng dụng đều đặn.

**Independent Test**: Kiểm tra cả 3 tình huống: (1) truy cập khi chưa đăng nhập, (2) đăng nhập lần đầu với tài khoản mới, và (3) đăng nhập lại vào trang chủ bán hàng hằng ngày.

**Acceptance Scenarios**:

1. **Given** người dùng chưa đăng nhập khi truy cập ứng dụng, **When** trang đăng nhập/chào mở ra, **Then** hiển thị phần chào thân thiện bằng tiếng Việt nêu ngắn gọn 3 lợi ích cốt lõi (tính tiền nhanh, nhớ sổ nợ, tạo mã QR thu tiền) ngay cùng khung chọn **"Đăng nhập"** hoặc **"Mở sổ bán hàng mới"** (không bắt bấm qua thêm màn hình trung gian).
2. **Given** chủ tiệm (kể cả tài khoản mới hoặc tài khoản cũ lần đầu vào bản cập nhật này) chưa hoàn tất hoặc chưa bỏ qua hướng dẫn chào mừng, **When** vào ứng dụng, **Then** hiển thị hướng dẫn thiết lập nhanh 3 bước đơn giản (đặt tên tiệm, nhập tài khoản ngân hàng tạo QR, thêm món đầu tiên — đánh dấu sẵn bước nào tiệm đã có) kèm nút **"Bỏ qua, vào bán hàng ngay"**; trạng thái hoàn tất/bỏ qua được lưu theo tài khoản để không lặp lại ở lần mở sau hoặc trên thiết bị khác, và vẫn mở lại được từ mục Cài đặt.
3. **Given** chủ tiệm đăng nhập vào trang chủ Bán hàng trong các phiên làm việc hằng ngày, **When** màn hình chính mở lên, **Then** hiển thị dải chào mừng mỏng gọn với tên tiệm, lời chúc theo buổi trong ngày và tóm tắt/lối tắt nhanh (ví dụ nhắc khách đến hạn thu nợ hôm nay nếu có), có thể thu gọn chỉ với 1 chạm và giữ trạng thái thu gọn suốt phiên/trong ngày để ưu tiên tối đa không gian chọn món.

---

### User Story 5 - Hiệu ứng chuyển động tinh tế tăng trải nghiệm (Priority: P2)

Các thao tác chạm nút, thêm món vào giỏ, mở/đóng hộp thoại hoặc ngăn kéo công nợ, và chuyển trạng thái dữ liệu có hiệu ứng chuyển động nhẹ nhàng, tức thì và tự nhiên (không rườm rà, không giật, không làm chậm thao tác bán hàng nhanh), đồng thời tự động giảm hoặc tắt hiệu ứng nếu thiết bị bật chế độ giảm chuyển động.

**Why this priority**: Hiệu ứng đúng chỗ giúp người dùng lớn tuổi nhận biết ngay thao tác của mình đã ăn (ví dụ món vừa được thêm vào giỏ, bảng chi tiết vừa mở ra), tạo cảm giác mượt mà hiện đại mà không gây rối mắt.

**Independent Test**: Thực hiện thêm/bớt món vào giỏ, mở/đóng hộp thoại thanh toán, mở ngăn kéo sổ nợ, chuyển tab và kiểm tra cả khi bật lẫn tắt tùy chọn giảm chuyển động trên thiết bị.

**Acceptance Scenarios**:

1. **Given** người dùng chạm vào một sản phẩm để thêm vào giỏ hoặc bấm nút tăng/giảm số lượng, **When** thao tác xảy ra, **Then** nút phản hồi nhấn nhẹ tức thì và thanh tóm tắt giỏ hàng / số lượng cập nhật có hiệu ứng nhấn mạnh nhẹ giúp mắt dễ nhận biết món vừa thay đổi.
2. **Given** người dùng mở hoặc đóng hộp thoại (modal), bảng thanh toán, hoặc ngăn kéo chi tiết khách nợ, **When** hộp thoại xuất hiện hoặc biến mất, **Then** có hiệu ứng trượt/hiện êm ái thay vì bật tắt đột ngột.
3. **Given** người dùng bật chế độ **"Giảm chuyển động" (Reduce Motion)** trên iPhone hoặc Windows, **When** sử dụng ứng dụng, **Then** các hiệu ứng dịch chuyển/phóng to thu nhỏ được giản lược tối đa, chỉ giữ chuyển đổi trạng thái tối thiểu dễ chịu cho mắt.

---

### Edge Cases

- Khi người dùng chọn chế độ **Theo thiết bị** và thiết bị không hỗ trợ phát hiện chế độ tối, hệ thống mặc định hiển thị chế độ **Sáng** an toàn.
- Khi mạng bị mất giữa lúc đang hiển thị skeleton hoặc lúc bấm lưu, hệ thống không treo vĩnh viễn ở màn hình skeleton mà hiển thị thông báo mất kết nối dễ hiểu kèm nút **"Thử lại"**.
- Khi chuyển nhanh qua lại liên tục giữa chế độ Sáng và Tối, hiệu ứng chuyển màu không bị kẹt nửa chừng hoặc làm lag thao tác chạm bán hàng.
- Khi người dùng đang nhập dở form trong hộp thoại mà đổi chế độ Sáng/Tối (hoặc thiết bị tự chuyển Dark Mode theo giờ hoàng hôn), dữ liệu đang nhập trong giỏ hàng hoặc biểu mẫu không bị mất hay reset.
- Khi người dùng lớn tuổi tăng cỡ chữ mặc định của hệ thống (Accessibility / Dynamic Type trên iPhone hoặc phóng to trình duyệt trên Windows), các nút bấm, nhãn chữ và thanh điều hướng không bị tràn chữ hay đè lên nhau.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cung cấp 3 chế độ hiển thị giao diện: **Sáng**, **Tối**, và **Theo thiết bị** (mặc định ban đầu là **Theo thiết bị**), đặt bộ chọn đầy đủ trong **Cài đặt** kèm nút chuyển nhanh ở thanh tiêu đề di động, thanh bên máy tính và màn hình Đăng nhập, và lưu riêng biệt trên từng thiết bị để điện thoại và máy tính chọn độc lập qua các lần mở lại ứng dụng.
- **FR-002**: Khi người dùng chuyển đổi giữa chế độ Sáng và Tối (hoặc khi chế độ **Theo thiết bị** tự động cập nhật theo hệ điều hành), toàn bộ các vùng giao diện (nền, thẻ, chữ, đường viền, biểu tượng) MUST chuyển đổi màu sắc mượt mà, đồng bộ, không nhấp nháy hay giật cục.
- **FR-003**: Hệ thống MUST áp dụng chế độ giao diện đã lưu ngay từ lúc khởi tạo trang để không xảy ra hiện tượng chớp sáng/tối sai chế độ khi tải lại trang.
- **FR-004**: Bảng màu ở chế độ Tối MUST đảm bảo độ tương phản dễ đọc (tối thiểu đạt chuẩn tương phản WCAG AA cho chữ và số tiền), giữ đúng bản sắc màu xanh ngọc bích chủ đạo và màu phân biệt trạng thái trả đủ / còn nợ / quá hạn; riêng khung xem trước in/xuất ảnh hóa đơn và thẻ mã VietQR MUST luôn giữ nền trắng mực đen để đảm bảo quét mã và in rõ nét.
- **FR-005**: Hệ thống MUST hiển thị màn hình chờ khởi động (loading/splash) có nhận diện PayTrack POS khi ứng dụng đang xác thực hoặc tải dữ liệu lần đầu, và hiển thị skeleton mô phỏng đúng bố cục từng trang cho cả 5 khu vực chính (Bán hàng, Sổ nợ, Đơn hàng, Thống kê, Cài đặt).
- **FR-006**: Hệ thống MUST hiển thị trạng thái đang xử lý trên các nút hành động chính (tạo đơn, thu nợ, đăng nhập, lưu cài đặt) và ngăn bấm trùng trong lúc chờ phản hồi.
- **FR-007**: Hệ thống MUST cung cấp trải nghiệm Welcome 3 lớp: (1) phần chào giới thiệu ngắn gọn giá trị ứng dụng tích hợp ngay cùng màn hình Đăng nhập / Tạo sổ mới (không thêm bước chặn), (2) hướng dẫn thiết lập nhanh 3 bước hiển thị một lần cho mỗi tài khoản sau khi cập nhật (đánh dấu sẵn các bước đã có dữ liệu, có nút bỏ qua, lưu trạng thái theo tài khoản và mở lại được từ Cài đặt), và (3) dải chào mừng mỏng gọn mỗi khi đăng nhập vào trang chủ Bán hàng (hiển thị tên tiệm, lời chúc theo buổi, lối tắt nhanh hữu ích, thu gọn 1 chạm và ghi nhớ trạng thái thu gọn trong phiên/ngày).
- **FR-008**: Hệ thống MUST tinh chỉnh giao diện trực quan hơn cho người ít rành công nghệ trên toàn bộ 5 màn hình chính (Bán hàng, Sổ nợ, Đơn hàng, Thống kê, Cài đặt) và màn hình Đăng nhập, bao gồm: ngôn ngữ tiếng Việt bình dân rõ nghĩa, trạng thái trống có hướng dẫn hành động tiếp theo, nhãn mô tả ngắn cho các tùy chọn dễ gây nhầm, nút hành động chính nổi bật dễ phân biệt với thao tác phụ, và thông tin tính toán tiền/nợ minh bạch trước khi xác nhận.
- **FR-009**: Hệ thống MUST bổ sung các chuyển động giao diện có mục đích (phản hồi chạm nút, cập nhật giỏ hàng, đóng/mở hộp thoại và ngăn kéo, chuyển trạng thái mượt mà) với thời lượng nhanh gọn không cản trở tốc độ bán hàng, và MUST tôn trọng cài đặt giảm chuyển động của thiết bị.
- **FR-010**: Mọi cải tiến giao diện, màu sắc, màn hình chờ và chuyển động MUST duy trì đầy đủ khả năng hiển thị ổn định trên cả màn hình điện thoại nhỏ (~375px) lẫn máy tính để bàn (>= 1024px) và không làm phát sinh thanh cuộn ngang ngoài ý muốn.

### Key Entities *(include if feature involves data)*

- **Tùy chọn Giao diện (Theme Preference)**: Giá trị người dùng chọn (Sáng, Tối, hoặc Theo thiết bị — mặc định Theo thiết bị), được lưu độc lập trên từng thiết bị để áp dụng tức thì ngay khi mở ứng dụng.
- **Trạng thái Chào mừng (Welcome / Onboarding State)**: Lưu theo tài khoản chủ cửa hàng việc đã hoàn thành hoặc bỏ qua hướng dẫn thiết lập nhanh 3 bước (để không lặp lại trên thiết bị khác), kèm trạng thái thu gọn dải chào trang chủ trong ngày/phiên và khả năng mở lại hướng dẫn từ Cài đặt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% người dùng thử nghiệm có thể tự tìm và chuyển đổi qua lại giữa 3 chế độ Sáng / Tối / Theo thiết bị trong dưới 10 giây, với quá trình chuyển màu hoàn tất mượt mà trong khoảng 200–350ms và không bị chớp sai màu khi tải lại trang.
- **SC-002**: 100% các trang chính và luồng khởi động ứng dụng đều có màn hình chờ hoặc skeleton khớp bố cục, không có thời điểm nào người dùng thấy màn hình trắng trống hoàn toàn trên 300ms khi mạng chậm.
- **SC-003**: Trong thử nghiệm với người dùng ít rành công nghệ (chưa từng dùng app trước đó), tối thiểu 90% hoàn thành chuỗi 3 tác vụ cốt lõi (bán 1 đơn, ghi/thu nợ 1 khách, tạo mã QR) ở lần thử đầu tiên mà không cần hướng dẫn miệng từ người khác.
- **SC-004**: Người dùng mới có thể hoàn thành bước chào mừng / thiết lập nhanh hoặc chọn bắt đầu bán hàng ngay trong dưới 60 giây.
- **SC-005**: Tất cả hiệu ứng chuyển động không làm tăng thời gian hoàn tất một đơn hàng thông thường (tạo đơn 3 món vẫn hoàn thành trong dưới 15 giây) và tự động thu gọn khi bật chế độ giảm chuyển động của thiết bị.

## Assumptions

- Ứng dụng giữ nguyên nền tảng nhận diện hiện tại (màu nhấn chính xanh ngọc bích, chữ tiếng Việt rõ nét và chữ số tiền thẳng hàng), chỉ mở rộng thêm bảng màu tối hài hòa, không sử dụng màu neon chói mắt hay hiệu ứng trang trí rườm rà.
- Tùy chọn chế độ Sáng / Tối / Theo thiết bị mặc định ban đầu là **Theo thiết bị** để tự động phù hợp với cài đặt sẵn có trên iPhone/Windows của người dùng, và có nút chuyển dễ thấy trong Cài đặt cũng như lối tắt nhanh trên thanh điều hướng/tiêu đề.
- Các nghiệp vụ bán hàng, tính toán tiền, sổ nợ FIFO, VietQR, in hóa đơn và thông báo đẩy hiện có không bị thay đổi logic tính toán hay làm mất dữ liệu khi nâng cấp giao diện.
