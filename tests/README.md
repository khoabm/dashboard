# Kiểm thử

Giữ toàn bộ test và fixture frontend trong `tests/`; không đưa dữ liệu runtime hoặc credential thật vào đây.

- `*.test.js`: regression tự động, chạy bằng `npm test`, giữ trong Git để CI/chats sau có thể chạy lại.
- `audit.html` / `audit-fixture.js`: fixture browser dùng transport/Auth giả lập; `?scenario=navigation` có 8 chủ đề và bảng dài để kiểm cuộn. Không gọi Supabase thật.
- `session.html` / `session-fixture.js`: kiểm SDK/sessionStorage với transport giả lập.
- `viewport.html?fixture=audit&scenario=navigation`: iframe responsive của fixture điều hướng. Không mở default viewport nếu chỉ cần offline QA vì default dùng app thật.
- `api-smoke.mjs`, `editor.html`: công cụ cũ có thể gọi backend thật, chỉ chạy trong nhiệm vụ được giao riêng.
- `local/`: ảnh chụp, output, báo cáo máy và thử nghiệm dùng một lần; được `.gitignore` và `.prettierignore` loại khỏi source/format. Không đặt test regression cần CI trong thư mục này.

Tài liệu bằng chứng: `docs/TESTING.md`, `docs/QA_REPORT.md`, `docs/BUG_FIX_LOG.md`. Kết quả mock không thay nghiệm thu Auth/JWT/RLS/Storage hay thiết bị thật. Không upload artifact local lên Git; CI hiện tại không tự gọi API hoặc browser live.

## Ranh giới production

Test được commit để chạy lại, nhưng không được publish. `npm run build` chặn module dưới `test/` hoặc `tests/` trong dependency graph production, rồi chạy `check-production-build.mjs` để kiểm output chỉ gồm index, asset bundle và placeholder công khai. File ngoài allowlist làm build thất bại; không thêm fixture vào allowlist để vượt gate.

Hosting chỉ phục vụ `dist/`, không phục vụ repo root hay Vite dev server. Không copy `tests/`, `src/`, docs, `.env` hoặc artifact local vào deployment. Các URL `/test`, `/test/session`, `/tests/session.html` không có fixture trong output; tùy hosting, URL không tồn tại có thể trả 404 hoặc SPA fallback về app. Xác minh các URL này khi nghiệm thu hosting; hiện chưa deploy.
