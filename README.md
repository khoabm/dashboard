# Vui học cùng cô Quỳnh

**Vui học cùng cô Quỳnh** là tên chính thức của website. Source hiện có nhiều ứng dụng
hỗ trợ học tập và quản lý lớp/điểm theo quyền; không mặc nhiên tuyên bố mọi luồng đã
nghiệm thu hoặc triển khai công khai.

- **Bảng học liệu** (`/`): xem, tìm và mở học liệu published; quản trị nội dung theo quyền.
  **KHTN8 Board** là tên lịch sử/kỹ thuật của ứng dụng này, không phải toàn website.
- **Bảng điểm cá nhân** (`/personal-gradebook`): tra cứu dữ liệu riêng sau xác minh.
- **Quản lý bảng điểm và lớp** (`/personal-gradebook/admin`): nghiệp vụ dành cho người có quyền.
- **Trợ lý học liệu**: giải thích phạm vi website và hỗ trợ văn bản học liệu công khai;
  AI hosted mặc định tắt, không có quyền truy cập Gradebook/Auth.

**Đọc trước:** [Mục đích và mô hình sản phẩm](docs/PRODUCT_PROFILE.md) ·
[OVERVIEW](docs/OVERVIEW.md) · [STATUS](docs/STATUS.md) ·
[Đặc tả Bảng học liệu](docs/SPEC.md) ·
[Gradebook](docs/features/personal-gradebook/README.md) ·
[Trợ lý](docs/features/board-assistant/README.md).

**Ràng buộc:** HTML/CSS/Vanilla JS, Vite, Supabase theo module và chi phí 0 USD.
Không suy quyền từ giao diện/URL, không tự dùng dữ liệu học sinh thật,
không tự kích hoạt AI hoặc triển khai website.

## Chạy độc lập

Cần Node.js 22.12+ (đã kiểm tra Node 24.19.0).

```bash
npm ci
npm run dev
```

Mở URL local do Vite in ra. Cấu hình public của project đã chọn nằm ở `src/config/public.js`; có thể override bằng `.env.local` theo `.env.example`. Chỉ dùng URL + publishable key. Không đưa service_role/secret hoặc mật khẩu vào frontend. Nếu chuyển project, sửa allowlist CSP trong index.html cho đúng origin Supabase.

```bash
npm test
npm run check
npm run build
```

**Không chạy hosted trong tác vụ correction.** `test:api` cần phê duyệt hoạt động/budget riêng; lệnh này gọi project Supabase đã chọn bằng publishable key, kiểm tra public read và denial; không phải test login thật. `build` xuất `dist/` để phục vụ bằng bất kỳ static HTTPS host phù hợp; không cần Node backend khi vận hành. Vite dùng để bundle SDK, khóa dependency/lockfile và tách cấu hình; không dùng React/Next/Vue. Không có cấu hình deployment của nhà cung cấp cũ.

## CI và format code

`npm run format:check` kiểm tra Prettier trên **toàn bộ JS/CSS/HTML thực thi và test scripts** (không còn baseline miễn trừ); `npm run format:check:all` là alias tương thích, `npm run format` chỉ dùng khi chủ động làm task format-only. Công cụ dùng Prettier 3.6.2 cố định qua `npx` (cần truy cập npm registry), không tự đổi logic.

GitHub Actions `.github/workflows/ci.yml` chạy khi PR/merge vào `develop` hoặc `main`, và hỗ trợ `workflow_dispatch` khi workflow có trên default branch `main`. CI chỉ `npm ci`, syntax/secret scan, unit tests, static build và format check; **không gọi** `npm run test:api` hay Supabase. Xem [CODE_STYLE](docs/CODE_STYLE.md) và [TESTING](docs/TESTING.md).

## Backend

Bốn migrations trong `supabase/migrations/` đã apply vào project `dashboard` (`vgciiqtwmxcdqppntgnt`). **Không apply lại vào project hiện tại.** Project mới an toàn: dùng migration theo thứ tự, rồi `supabase/seed.sql` nếu cần dữ liệu mẫu. Seed chạy lại không ghi đè bài đã chỉnh hoặc tạo trùng cùng ID. [DATABASE](docs/DATABASE.md) mô tả quyền, lịch sử và RPC.

Admin đang tồn tại; dùng [ADMIN_SETUP](docs/ADMIN_SETUP.md) để đối chiếu quyền và cài đặt server, chỉ tạo tài khoản nếu thực sự thiếu. Giao diện không cung cấp signup; trạng thái tắt signup phía server chưa được xác minh. Client session ở memory, refresh cần đăng nhập lại. Nháp localStorage/IndexedDB là bản cục bộ, không thay Supabase và không tự xuất bản. [BACKUP](docs/BACKUP.md) phân biệt DB, metadata export và bytes Storage.

## Bắt đầu một phiên ChatGPT Work

Đọc [AGENTS.md](AGENTS.md) → [OVERVIEW](docs/OVERVIEW.md) + [STATUS](docs/STATUS.md) → đúng mục SPEC theo task. Không đọc toàn repo mỗi lượt.

> Repo khoabm/dashboard, develop tại HEAD hiện tại. Đọc AGENTS, OVERVIEW và STATUS; chọn Rxx liên quan. Kiểm tra trạng thái đã có bằng chứng trước khi sửa, giữ stack và ngân sách 0 USD. Không merge main/deploy nếu chưa đủ gate. Sau việc cập nhật STATUS và code map; phân biệt PASS, BLOCKED, NOT RUN.

[Ảnh giao diện đã kiểm tra](docs/qa/board-desktop.jpg) · [Kế hoạch/gate](docs/IMPLEMENTATION_PLAN.md) · [Workflow](docs/WORKFLOW.md)
