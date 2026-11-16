# PayTrack POS

Ứng dụng web quản lý bán hàng, theo dõi công nợ và tạo mã thanh toán VietQR động dành cho cửa hàng gia đình — thiết kế ưu tiên sự rõ ràng, thao tác nhanh trên **iPhone** và **Windows**, đồng bộ dữ liệu **Cloud Real-time**.

---

## Mục tiêu & Tính năng chính

1. **Bán hàng POS cơ bản**: Quản lý sản phẩm/giá bán, tìm nhanh theo tên, thêm món vào giỏ, giảm giá, ghi nhận khách lẻ hoặc khách quen, tạo món nhanh ngay tại quầy.
2. **Sổ nợ & Nhắc thu tiền (Notification trên iPhone & Windows)**: Theo dõi khách hàng chưa trả / trả một phần, lịch sử trả nợ nhiều đợt, đặt lịch nhắc thu nợ và nhận thông báo **Web Push** trên Windows (Chrome/Edge) và iPhone (Safari PWA).
3. **In & Xuất hóa đơn điện tử (PDF & PNG)**: Xem trước hóa đơn gọn đẹp, tải ảnh **PNG** để gửi trực tiếp qua Zalo/Messenger hoặc **In / Lưu PDF** chuẩn khổ giấy A5/80mm.
4. **Tạo & Chia sẻ QR động (VietQR)**: Tự động nhúng đúng số tài khoản ngân hàng, **chính xác số tiền cần thu** và nội dung chuyển khoản định danh theo từng đơn / từng khách hàng; hỗ trợ chia sẻ 1 chạm.
5. **Thống kê bán hàng**: Tổng doanh thu, tiền thực thu, công nợ phát sinh, số đơn hàng, top sản phẩm bán chạy và top khách còn nợ theo ngày/tuần/tháng.
6. **Đăng nhập & Bảo mật**: Xác thực tài khoản qua Supabase Auth và bảo vệ dữ liệu riêng tư bằng Postgres Row Level Security (RLS).
7. **Lưu trữ Cloud & Real-time Sync**: Mọi dữ liệu lưu trên Supabase PostgreSQL — không mất dữ liệu khi refresh (F5), tự động đồng bộ tức thì giữa iPhone và Windows không cần tải lại trang.
8. **Responsive & PWA**: Giao diện thích ứng mượt mà từ màn hình điện thoại (`375px+`) tới máy tính (`1280px+`), có thể cài thành app ngoài màn hình chính.

---

## Kiến trúc & Công nghệ đề xuất

| Thành phần | Lựa chọn | Lý do chọn |
|---|---|---|
| **Frontend / App** | Next.js (App Router) + TypeScript + Tailwind CSS | Tích hợp hoàn hảo với Vercel, hỗ trợ PWA + API Routes + SSR |
| **Backend / Cloud DB** | **Supabase** (PostgreSQL + Auth + Realtime + Edge Functions) | Hợp hơn Firebase cho POS vì PostgreSQL xử lý chính xác giao dịch tiền/công nợ theo quan hệ (`orders`, `order_items`, `debt_payments`), có RLS chặt chẽ, Realtime sync tích hợp sẵn và dễ chạy cron gửi Push Notification |
| **Push Notifications** | Web Push API (VAPID) + Service Worker + Supabase Cron/Edge Function | Gửi thông báo nhắc nợ miễn phí không cần app store |
| **Hosting / Domain** | **Vercel** | Tự động deploy từ GitHub, có Preview URL cho mỗi branch PR và gắn custom domain dễ dàng |
| **Spec-Driven AI** | **GitHub Spec Kit (`specify`) + Antigravity** | Giữ spec, thiết kế, kế hoạch và code đồng bộ, tránh AI vibe-code lệch yêu cầu |

> **Lưu ý quan trọng về Notification trên iPhone (iOS)**:
> Apple chỉ cho phép Web Push Notification hoạt động trên iPhone (iOS 16.4+) khi người dùng mở trang web bằng Safari → bấm **Chia sẻ (Share)** → chọn **Thêm vào Màn hình chính (Add to Home Screen)**, sau đó mở app từ icon mới tạo và cấp quyền Thông báo. Trên Windows (Chrome/Edge), Web Push hoạt động trực tiếp trên trình duyệt hoặc khi cài PWA.

---

## GitHub Spec Kit + Antigravity Workflow

Dự án đã được khởi tạo sẵn với **GitHub Spec Kit** tích hợp cho **Antigravity** (`--integration agy`):

- Cấu hình Spec Kit: [`.specify/`](.specify/)
- Hiến pháp dự án (Project Constitution): [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
- Đặc tả tính năng nền tảng: [`specs/001-paytrack-pos/spec.md`](specs/001-paytrack-pos/spec.md)
- Quy chuẩn thiết kế chống AI-slop: [`DESIGN.md`](DESIGN.md)
- Skills cho Antigravity: [`.agents/skills/speckit-*`](.agents/skills/)

### Thứ tự chạy Spec Kit trong Antigravity

Khi vibe code với Antigravity, đi theo đúng pipeline sau (review từng file trước khi qua bước kế tiếp):

1. `/speckit-constitution` — Rà soát hoặc cập nhật nguyên tắc kiến trúc & design (đã khởi tạo sẵn)
2. `/speckit-specify` — Viết đặc tả cho tính năng mới (đã tạo baseline ở `specs/001-paytrack-pos/spec.md`)
3. `/speckit-clarify` *(khuyến nghị)* — Làm rõ các điểm còn mơ hồ trước khi thiết kế kỹ thuật
4. `/speckit-plan` — Thiết kế kiến trúc, schema Supabase, API/RLS, cấu trúc thư mục
5. `/speckit-tasks` — Chia nhỏ thành checklist task cụ thể
6. `/speckit-analyze` *(tùy chọn)* — Kiểm tra tính nhất quán giữa spec, plan và tasks
7. `/speckit-implement` — Triển khai code từng phần theo `tasks.md`
8. `/speckit-converge` — Đối chiếu code hiện tại với spec để rà phần còn thiếu

Nếu máy local bạn chưa đồng bộ hoặc muốn kiểm tra CLI:

```bash
uv tool install specify-cli
specify check
```

---

## Anti-AI-Slop: Các repo GitHub & Quy tắc tránh giao diện "nhìn là biết AI làm"

AI coding agents thường mặc định tạo ra giao diện na ná nhau ("AI slop") hoặc các mẫu "né AI" kiểu mới nhưng vẫn bị lặp lại. Dự án này tham khảo trực tiếp các repo mã nguồn mở nổi bật sau để khóa chuẩn UI trong [`DESIGN.md`](DESIGN.md):

| Repository | Điểm mạnh & Công cụ |
|---|---|
| [`pbakaus/impeccable`](https://github.com/pbakaus/impeccable) | Bộ từ vựng chỉ đạo thiết kế (24 lệnh như `critique`, `audit`, `polish`, `harden`) + bộ quét 62 lỗi AI slop (`npx impeccable detect`) |
| [`Leonxlnx/taste-skill`](https://github.com/Leonxlnx/taste-skill) | Kiểm soát art direction theo tham số (`DESIGN_VARIANCE`, `MOTION_INTENSITY`, `VISUAL_DENSITY`) và kiểm tra hiển thị trên trình duyệt thật |
| [`Nutlope/hallmark`](https://github.com/Nutlope/hallmark) | Chống trùng lặp bố cục (structural variety) và kiểm tra giữ nguyên luồng chức năng khi redesign (`sloplint`) |
| [`funboy322/avoid-ai-design`](https://github.com/funboy322/avoid-ai-design) | Catalog **67 dấu hiệu nhận biết UI do AI tạo** (cả lỗi thế hệ 1 lẫn thế hệ 2) + script kiểm tra `detect.mjs` |
| [`anthropics/skills` (`frontend-design`)](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Hướng dẫn chọn typography và bảng màu có chủ đích theo ngữ cảnh sản phẩm |
| [`bergside/awesome-design-skills`](https://github.com/bergside/awesome-design-skills) | Danh sách tổng hợp 67+ file `DESIGN.md` và `SKILL.md` cho AI coding agents |

### Những "AI Design Tells" bị cấm trong PayTrack POS

- **Màu sắc AI mặc định**: Gradient tím/indigo (`indigo-500` → `purple-600`), chữ tiêu đề dùng `bg-clip-text` gradient, hoặc dark mode neon xanh chuối không phù hợp môi trường bán hàng ban ngày.
- **Font chữ mặc định**: Dùng `Inter`, `Roboto`, `Space Grotesk`, hoặc `Geist` nguyên bản mà không tối ưu dấu tiếng Việt / số liệu tài chính → Thay bằng **`Be Vietnam Pro`** + **`JetBrains Mono`** (`tabular-nums`).
- **Thẻ & hiệu ứng thừa**: Lạm dụng `rounded-2xl shadow-lg` ở mọi khối, thẻ lồng trong thẻ, `backdrop-blur` kính mờ gây khó đọc chữ, chấm nhấp nháy vô nghĩa hoặc animation nảy (`bounce`).
- **Chi tiết trang trí sáo rỗng**: Nhãn tiếng Anh viết hoa giãn chữ (`tracking-widest uppercase`), đánh số giả `01 / 02 / 03`, nút luôn gắn icon mũi tên, hoặc icon lấp lánh AI (`sparkles`).

Chi tiết bảng màu, kích thước chữ, khoảng chạm mobile (`≥ 48px`) và bố cục POS được quy định tại [`DESIGN.md`](DESIGN.md).

---

## Quy trình Git Branch & Deploy Vercel

### Quy tắc Git (Bắt buộc)

Không commit trực tiếp lên `main` khi phát triển tính năng hoặc sửa lỗi. Mọi thay đổi đều tạo nhánh riêng:

```bash
# 1. Cập nhật main mới nhất
git checkout main
git pull origin main

# 2. Tạo nhánh mới cho thay đổi
git checkout -b feat/001-pos-core        # hoặc fix/..., chore/...

# 3. Commit rõ ràng & push nhánh
git add .
git commit -m "feat: implement POS cart and Supabase realtime sync"
git push -u origin feat/001-pos-core
```

Sau khi kiểm tra Vercel Preview URL và test ổn định trên iPhone/Windows, tạo Pull Request trên GitHub để merge vào `main`.

### Hướng dẫn chạy Local, Supabase Migration & Deploy Vercel

1. **Cài đặt và chạy local**:
   ```bash
   npm install
   cp .env.example .env.local
   npx web-push generate-vapid-keys   # Điền vào NEXT_PUBLIC_VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY
   npm run dev
   ```

2. **Thiết lập Supabase (Database, Auth, RLS, RPC & Cron)**:
   - Tạo project trên Supabase (khuyến nghị region `ap-southeast-1` Singapore).
   - Vào **Authentication → Providers**, bật **Email** và **Google**; thêm Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://<your-vercel-domain>/auth/callback`
   - Vào **Database → Extensions**, bật **`pg_cron`** và **`pg_net`**.
   - Vào **SQL Editor**, chạy lần lượt:
     1. [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql)
     2. [`supabase/migrations/0002_rpc_functions.sql`](supabase/migrations/0002_rpc_functions.sql)
     3. [`supabase/migrations/0003_reminder_cron.sql`](supabase/migrations/0003_reminder_cron.sql) *(nhớ thay `<YOUR_VERCEL_DOMAIN>` và `<YOUR_CRON_SECRET>` bằng domain Vercel và `CRON_SECRET` thật trước khi chạy)*.

3. **Biến môi trường trên Vercel** (`Project Settings → Environment Variables` và `.env.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=

   NEXT_PUBLIC_VAPID_PUBLIC_KEY=
   VAPID_PRIVATE_KEY=
   VAPID_SUBJECT=mailto:your-email@example.com

   CRON_SECRET=
   ```

4. **Deploy trên Vercel**:
   - Import repo `nguyengiaphu1/paytrack-pos` vào Vercel, thêm đầy đủ biến môi trường trên.
   - Mỗi nhánh feature đẩy lên GitHub sẽ tự có một Preview URL riêng để kiểm thử trên iPhone và Windows trước khi merge Pull Request vào `main`.