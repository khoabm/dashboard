# KHTN8 Board

Bảng học liệu Khoa học tự nhiên lớp 8: HTML/CSS/Vanilla JavaScript ES Modules, Supabase Free, một admin được chỉ định, khách ẩn danh chỉ đọc published. Source chính: `khoabm/dashboard`, nhánh `develop`; chưa merge main hoặc deploy công khai.

Có giao diện 3 cột/6 bài placeholder từ database thật, tìm kiếm, ảnh/PDF/YouTube/link và source CMS. **Chưa nghiệm thu toàn sản phẩm:** cần tạo Auth admin, tắt signup, chạy E2E admin/upload/sync và backup/restore. Xem [STATUS](docs/STATUS.md), [QA_REPORT](docs/QA_REPORT.md), [ADMIN_SETUP](docs/ADMIN_SETUP.md).

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
npm run test:api
npm run build
```

`test:api` gọi project Supabase đã chọn bằng publishable key, kiểm tra public read và denial; không phải test login thật. `build` xuất `dist/` để phục vụ bằng bất kỳ static HTTPS host phù hợp; không cần Node backend khi vận hành. Vite dùng để bundle SDK, khóa dependency/lockfile và tách cấu hình; không dùng React/Next/Vue. Không có cấu hình deployment của nhà cung cấp cũ.

## CI và format code

`npm run format:check` kiểm tra Prettier cho file code mới/đã thay đổi so với baseline trước quy ước; `npm run format:check:all` kiểm tra toàn bộ source (legacy chưa format có thể FAIL); `npm run format` chỉ dùng khi chủ động làm một đợt format-only. Công cụ dùng Prettier 3.6.2 cố định qua `npx` (cần truy cập npm registry), không tự đổi logic.

GitHub Actions `.github/workflows/ci.yml` chạy khi PR/merge vào `develop` hoặc `main`, và hỗ trợ `workflow_dispatch` khi workflow có trên default branch `main`. CI chỉ `npm ci`, syntax/secret scan, unit tests, static build và format check; **không gọi** `npm run test:api` hay Supabase. Xem [CODE_STYLE](docs/CODE_STYLE.md) và [TESTING](docs/TESTING.md).

## Backend

Bốn migrations trong `supabase/migrations/` đã apply vào project `dashboard` (`vgciiqtwmxcdqppntgnt`). **Không apply lại vào project hiện tại.** Project mới an toàn: dùng migration theo thứ tự, rồi `supabase/seed.sql` nếu cần dữ liệu mẫu. Seed chạy lại không ghi đè bài đã chỉnh hoặc tạo trùng cùng ID. [DATABASE](docs/DATABASE.md) mô tả quyền, lịch sử và RPC.

Tạo tài khoản/cấp quyền theo [ADMIN_SETUP](docs/ADMIN_SETUP.md); không có signup trên website. Client session ở memory, refresh cần đăng nhập lại. Nháp localStorage/IndexedDB là bản cục bộ, không thay Supabase và không tự xuất bản. [BACKUP](docs/BACKUP.md) phân biệt DB, metadata export và bytes Storage.

## Bắt đầu một phiên ChatGPT Work

Đọc [AGENTS.md](AGENTS.md) → [OVERVIEW](docs/OVERVIEW.md) + [STATUS](docs/STATUS.md) → đúng mục SPEC theo task. Không đọc toàn repo mỗi lượt.

> Repo khoabm/dashboard, develop tại HEAD hiện tại. Đọc AGENTS, OVERVIEW và STATUS; chọn Rxx liên quan. Kiểm tra trạng thái đã có bằng chứng trước khi sửa, giữ stack và ngân sách 0 USD. Không merge main/deploy nếu chưa đủ gate. Sau việc cập nhật STATUS và code map; phân biệt PASS, BLOCKED, NOT RUN.

[Ảnh giao diện đã kiểm tra](docs/qa/board-desktop.jpg) · [Kế hoạch/gate](docs/IMPLEMENTATION_PLAN.md) · [Workflow](docs/WORKFLOW.md)
