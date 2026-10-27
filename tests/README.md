# Kiểm thử

Giữ toàn bộ test và fixture frontend trong `tests/`; không đưa dữ liệu runtime hoặc credential thật vào đây.

- `npm run test:ci` (cũng là `npm test`): **11 file** trong allowlist `package.json`: board-navigation, dom, drafts, pending-task, validation, gradebook-contracts, gradebook-ui, gradebook-admin, roster, gradebook-scores, student-gradeboard (đuôi `.test.js`). Chỉ component/pure unit; không HTTP/SDK/Edge/SQL/browser integration hoặc discovery wildcard. `student-gradeboard-data.js` là dữ liệu catalog synthetic thuần được test import, không có credential.
- `npm run test:specialist`: Auth SDK, service reliability, Edge handler/HTTP/crypto integration và Node runtime adapter; tách ngoài CI. Lệnh tồn tại không tự cấp quyền kiểm thử. SQL/browser/live assets cũng không nằm trong CI.
- `audit.html` / `audit-fixture.js`: fixture browser dùng transport/Auth giả lập; `?scenario=navigation` có 8 chủ đề và bảng dài để kiểm cuộn. Không gọi Supabase thật.
- `session.html` / `session-fixture.js`: kiểm SDK/sessionStorage với transport giả lập.
- `viewport.html?fixture=audit&scenario=navigation`: iframe responsive của fixture điều hướng. Không mở default viewport nếu chỉ cần offline QA vì default dùng app thật.
- `api-smoke.mjs`, `editor.html`: công cụ cũ có thể gọi backend thật, chỉ chạy trong nhiệm vụ được giao riêng.
- `local/`: ảnh chụp, output, báo cáo máy và thử nghiệm dùng một lần; được `.gitignore` và `.prettierignore` loại khỏi source/format. Không đặt test regression cần CI trong thư mục này.

Tài liệu bằng chứng: `docs/TESTING.md`, `docs/QA_REPORT.md`, `docs/BUG_FIX_LOG.md`. Kết quả mock không thay nghiệm thu Auth/JWT/RLS/Storage hay thiết bị thật. Không upload artifact local lên Git; CI hiện tại không tự gọi API hoặc browser live.

Trước merge develop, [B5 inventory](../docs/features/personal-gradebook/B5_OFFLINE_REVIEW.md#non-production-assets-outside-the-eventual-develop-merge) đề xuất giữ riêng toàn bộ specialist/SQL/browser assets ngoài tập merge; chưa xóa assets có ích cho CP01-C. Không tạo probe/curl/ad-hoc runner mới để có thêm bằng chứng. scripts/test-gradebook-sql.mjs và PGlite vừa staged đã bị gỡ theo policy thay thế, chưa từng commit.

## Ranh giới production

Test được commit để chạy lại, nhưng không được publish. `npm run build` chặn module dưới `test/` hoặc `tests/` trong dependency graph production, rồi chạy `check-production-build.mjs` để kiểm output chỉ gồm index, asset bundle và placeholder công khai. File ngoài allowlist làm build thất bại; không thêm fixture vào allowlist để vượt gate.

Hosting chỉ phục vụ `dist/`, không phục vụ repo root hay Vite dev server. Không copy `tests/`, `src/`, docs, `.env` hoặc artifact local vào deployment. Các URL `/test`, `/test/session`, `/tests/session.html` không có fixture trong output; tùy hosting, URL không tồn tại có thể trả 404 hoặc SPA fallback về app. Xác minh các URL này khi nghiệm thu hosting; hiện chưa deploy.


## CP05 — Browser QA offline tái lập (F01–F05)

Fixture được duy trì: `student-gradeboard.html`, `student-gradeboard-fixture.js`, `student-gradeboard-data.js`. Đây là ngoại lệ browser asset được cho phép riêng trong task F05; giữ development-only dưới tests, ngoài CI và production. Không cần file trong tests/local hoặc phiên Work cũ. Fixture mount **StudentLookup/StudentGradeboard thật**, gọi adapter trong memory, không import production client/SDK/Auth/Board. CSP và fetch guard chặn hosted; capability QA được tạo ngẫu nhiên trong memory mỗi lần verify, không lưu/log/commit. Không nhập thông tin thật.

Từ checkout branch feature/personal-gradebook:

```sh
npm ci
node --test tests/student-gradeboard.test.js tests/gradebook-ui.test.js
npm run dev
```

Mở **http://localhost:4173/tests/student-gradeboard.html**, không mở `/` để thử offline (Board thật có thể gọi backend). Nếu dev server chọn host/port khác, dùng URL nó thông báo rồi thêm `/tests/student-gradeboard.html`. Work managed preview dùng đúng URL nội bộ từ Sites. Fixture ngoài có selector CSS px360/390/768/1024/1440; iframe không thay Safari/thiết bị thật.

1. Giữ Context=valid, Phản hồi=ready. Nhập **000000009**, **29/02/2000** (chỉ dữ liệu giả lập); Xác minh → bảng8×7, Toán có8.3/0.0/10.0, ô khác `—`. Đây là kết quả adapter QA, không xác thực thật. Chỉ xác minh tải semester đang chọn; mở một ô mới tải histogram.
2. Context=missing/bad-catalog/bad-publication trước khi verify → trạng thái chưa sẵn sàng, form enabled, không có private table/read. Chuyển valid rồi nhập lại phải phục hồi được.
3. Chọn Số học sinh cao nhất=0/1/23/1000 **trước khi mở modal**. Trục Y bắt đầu0, tick nguyên, grid khớp chiều cao; zero không có bar cao; raw8.25 highlight8.3. Dropdown Cột điểm chọn Thường xuyên2 →0.0; Thường xuyên3 →10.0; ô thiếu không highlight. Giữ101 bucket, cuộn ngang tại360/390, trục Y đứng yên.
4. Trong modal: Tab tới đúng một bucket, ArrowLeft/Right, Home/End → đổi focus/scroll; Tab tới Đóng biểu đồ, Shift+Tab quay lại; Escape đóng, focus về ô đã mở. Đổi dropdown/reopen vẫn chỉ một Tab entry. Không có101 Tab stops.
5. Xác minh lại bằng chuột hoặc Enter → form rỗng/enabled, focus ô CMND/CCCD, private view/modal bị xóa. Khi modal mở, nút **Hết phiên trong modal** ở toolbar ngoài → kết quả tương tự kèm thông báo hết phiên. Đây là clock injection, không làm hết hạn token thật.
6. Phản hồi=hold trước một read → loading. Toolbar ngoài **Thu hồi phiên (401)** trả lỗi401 cho request đang giữ → xóa phiên/private DOM và focus form. **Rời view**, rồi **Trả phản hồi đang giữ** → không hồi sinh dữ liệu. Mở lại fixture để quay về form, không phải browser router integration.
7. Phản hồi=empty/denied/429/503 trước khi chọn tab hoặc mở modal → empty/denied/limited/unavailable; chỉ Thử lại do người dùng bấm mới gửi thêm adapter call. Không auto retry. Với hold, đổi lựa chọn nhanh hoặc đóng modal rồi trả response → kết quả cũ bị bỏ qua.
8. Inspect chỉ hiện counts verify/read/external/errors và trạng thái DOM, không payload/token. external/errors phải0. Không có dữ liệu trong URL/browser storage. Các nút ở toolbar ngoài dùng message cùng origin để thao tác expiry/disposal khi native dialog làm toolbar trong iframe inert.

Lệnh kiểm code độc lập: `npm run check`, `npm run test:ci`, `npm run format:check`, `npm run build`, `git diff --check`. Build phải tiếp tục loại toàn bộ tests/fixtures; không copy test vào public/dist hoặc mở preview này như website production.

**Phân loại bằng chứng:** pure units thuộc CI; specialist SDK/Auth/Edge/SQL cần scope offline riêng và không chạy tự động; fixture browser trên đây là thao tác thủ công offline; mọi hosted Supabase SQL/Auth/API/RPC/Storage/metadata/log test cần phê duyệt/budget riêng (mặc định0). Không chạy `npm run test:api` cho QA này. CP03/CP04 ignored QA artifacts được ghi là bằng chứng lịch sử, không được ngầm coi là tái lập từ fixture CP05; không xóa chúng hoặc suy ra backend/security PASS. CP01-C và real-data gate vẫn NOT RUN.
