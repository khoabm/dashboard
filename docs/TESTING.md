# Kiểm thử và browser QA

Nguồn tiêu chí đầy đủ: SPEC R05–08, R10–14, R19–22, R25. Không thay danh sách test của SPEC bằng bản rút gọn này. **Đã có ứng dụng và bằng chứng tại [QA_REPORT](QA_REPORT.md); các gate chưa chạy vẫn NOT RUN/BLOCKED, không được coi là Done.**

## Quy tắc bằng chứng

Mỗi case ghi: ID hoặc Rxx/tiểu mục, commit/config, môi trường/browser/viewport/danh tính, bước thực hiện, mong đợi/thực tế, trạng thái và bằng chứng. PASS chỉ khi thực sự chạy và quan sát; FAIL có tái hiện; BLOCKED có nguyên nhân; NOT RUN chưa chạy. Không in secret/PII hoặc token trong log/screenshot.

Docs-only kiểm tra tính đầy đủ, link, trạng thái, diff; không cần browser test tài liệu Markdown. Logic mới/được sửa về lưu dữ liệu, phân quyền, upload, sắp xếp, nháp phải có regression có ý nghĩa. Có thể dùng unit/integration miễn phí phù hợp; không test chỉ phản chiếu code. Chỉ cài dependency test khi thực sự cần.

## Ma trận nghiệm thu

| Nhóm | Phạm vi bắt buộc | Bằng chứng |
| --- | --- | --- |
| UI Phase 1 | 1 bảng / 3 cột / 6 bài có nhãn, tìm kiếm, modal, ảnh/PDF/link/YouTube, empty/loading/error | Browser thao tác thật + ảnh trạng thái quan trọng |
| Admin | Login/logout; CRUD cột/bài; draft/publish/hide/soft-delete/restore; chuyển cột/thứ tự; preview; nháp và cảnh báo rời form | Browser và reload kiểm tra persisted data |
| Upload | Nhiều ảnh, preview/thay/xóa/đổi thứ tự, tài liệu hợp lệ; dưới/ngang/trên ngưỡng 2 MB; mặc định 10 file, quá số bị từ chối; partial failure/orphan | Browser + metadata/storage/policy evidence |
| Security | Khách và non-admin không INSERT/UPDATE/DELETE/upload; không đọc draft/hidden/deleted/file; admin ghi đúng quyền; URL/XSS/CSP/secrets | API trực tiếp dưới đúng danh tính + UI |
| Sync | Ghi thành công rồi client khác nhận bản mới; active/manual refresh; ngắt realtime và lỗi kết nối; không dùng localStorage làm nguồn chuẩn | Hai ngữ cảnh độc lập; ghi độ trễ và trade-off |
| Reliability | Offline khi soạn/upload; refresh có nháp; session hết hạn; file mất; provider pause; quota gần giới hạn; board rỗng | Ca tái hiện hoặc fault injection minh bạch |
| Responsive / a11y | 360, 390, 768, 1024, 1440px; Android/iPhone/desktop/tablet theo khả năng; focus/keyboard/dialog/labels/alt/title/contrast/reduced motion | Browser/viewport thật đã chạy, không suy rộng |
| Performance | Lazy-load/thumbnail, không tải tất cả attachment bytes, debounce, N+1/index, listeners/subscriptions | Check có mục tiêu + phạm vi đã đo |
| Backup/restore | Export DB/metadata + Storage, restore và quyền truy cập đúng | Thử trên đích an toàn, đối chiếu dữ liệu |
| Production | URL/HTTPS/audience/public read/admin/config đúng snapshot | Native deploy status + smoke thực tế tách riêng |

Nếu chỉ có một browser/context, không dùng hai tab chung session giả thành hai danh tính độc lập. Nếu công cụ không đổi viewport được thì ghi kích thước chưa test, không ghi PASS mobile từ ảnh desktop. Test kích thước viewport không thay test trình duyệt/thiết bị iPhone thật. Không hứa Safari QA từ Chrome.

Khi không thể mô phỏng offline, hết quota, pause hoặc expired session bằng công cụ hiện có: ghi BLOCKED/NOT RUN, không tác động production để gây lỗi. Mock được ghi là mock, không chứng minh backend thật. Test dữ liệu trên đích test được phép; không tự xóa/purge dữ liệu production.

## Browser QA trong Work

Theo WORKFLOW và reference preview của skill Sites. Kiểm tra browser/preview thực tế; tương tác nhập/click/keyboard rồi quan sát state, ảnh và log phù hợp. Phân biệt lỗi app với extension của môi trường, không giấu lỗi có ảnh hưởng. Không tuyên bố đã kiểm tra request/network nếu công cụ không hỗ trợ quan sát tương ứng.

Môi trường browser không có resize/network độc lập; đã kiểm tra responsive bằng iframe viewport thật tại tests/viewport.html. Cách này không thay kiểm thử thiết bị. Quyền đăng nhập đi qua cơ chế browser authentication được hỗ trợ, không nhập credential bằng script không an toàn.

## Gate hoàn tất

Phase UI cần browser QA các luồng/viewport liên quan. Done sản phẩm cần toàn R25 (20 điều kiện), tests R19, bảo mật R10/Storage và backend thật. Nếu thiếu điều kiện, bàn giao rõ trạng thái tạm thời; không gọi hoàn tất. Chỉ chạy lại/bổ sung test khi thay đổi mới, lỗi hoặc nghi ngờ chưa giải quyết cần kiểm chứng, tránh chạy lặp toàn bộ không có lý do.

## CI offline (GitHub Actions)

Workflow `.github/workflows/ci.yml`: `workflow_dispatch`, PR hướng tới `develop/main`, push (gồm merge) vào `develop/main`. Một job trên Ubuntu + Node 24, checkout full history, quyền `contents: read`, không token/secret của Supabase.

| Check CI | Phạm vi | Trạng thái chứng minh |
| --- | --- | --- |
| `npm ci` | Cài dependency từ lockfile | Chỉ đánh giá khi workflow chạy |
| `npm run check` | Syntax JS, scan secret/JWT hardcode, git diff whitespace | Offline |
| `npm test` | Toàn bộ unit regression dưới `tests/*.test.js` | Offline; chạy tất cả test hiện tại |
| `npm run build` | Static bundling Vite | Offline, không deploy |
| `npm run format:check` | Prettier 3.6.2; kiểm tra toàn bộ code JS/CSS/HTML thực thi và tests | Không còn baseline miễn trừ; đầy đủ file trong phạm vi script |

Theo yêu cầu tránh quota: **không đưa** `npm run test:api`, `supabase/tests/access.sql`, test Auth/RLS/Storage live hay browser E2E vào CI. Chúng vẫn thuộc ma trận nghiệm thu thủ công khi được giao riêng; một CI PASS không tương đương backend/browser PASS. `npm run format:check:all` là alias của gate format hiện tại; source code thực thi đã được format trong commit `4058de8`, không có baseline miễn trừ.

GitHub yêu cầu workflow có trên default branch (`main`) trước khi nút **Run workflow**/`workflow_dispatch` hoạt động. Trước đó có thể dùng PR checks; không merge vào main chỉ để kích hoạt manual.

## Lệnh hiện có

`npm test` chạy unit regression không gọi backend; `npm run check` kiểm tra syntax/credential scan/diff; `npm run build` bundle static. `npm run test:api` gọi API bằng publishable key, không lấy token admin. `supabase/tests/access.sql` chạy owner SQL Editor với fixtures rollback (SET LOCAL role và JWT sub), không phải phiên login thật. Xem QA_REPORT trước khi mở rộng ma trận; không chạy destructive test trên dữ liệu thật.

## Kiểm thử sau audit không hao quota

- Bắt đầu bằng `npm test` (25 tests), `npm run check`, `npm run build`, `npm run format:check`. Service regression nhận client fixture riêng; mọi fetch thật trong test file bị chặn. Không thêm API/SQL live vào CI.
- Browser mở `/tests/audit.html` trên preview local: dữ liệu synthetic và nhãn QA rõ ràng, transport/CSP chặn kết nối ngoài origin. Có fault text store, IndexedDB, save chờ/lỗi, public refresh lỗi và response quản trị trả muộn. Dùng các nút/fields thật để tái hiện QA-A02–A05 trong QA_REPORT.
- QA-A10/AUD-009 dùng fixture barrier để không phụ thuộc tốc độ filechooser: nạp quản trị giả lập, sửa bài, bấm **QA: chọn PDF và giữ xác minh**. Đây là File/DataTransfer/change bubbling từ placeholder local, không phải native picker. Bấm close/logout/save trong lúc file chờ; chỉ dùng **QA: hoàn tất xác minh** để cho phép đi tiếp. Kiểm nháp qua nút fixture: tên File, header %PDF-, số lượng/thứ tự; mở lại và restore. Các nhánh close, logout, SIGNED_OUT, IndexedDB fail, RPC conflict/success và Auth race đã PASS trong QA_REPORT.
- Để kiểm forced SIGNED_OUT, bấm **QA: hết phiên giả lập** khi signature còn chờ: UI riêng phải xóa ngay. Dùng **Trả kết quả xác minh file** ở ngoài editor rồi inspect; không mở lại dirty/confirm của phiên cũ. Hàng đợi phải flush trước cleanup. Native filechooser/OS vẫn cần ca riêng; ghi NOT RUN/BLOCKED nếu không chọn được, không suy PASS picker từ File API. Không mở tests/editor.html hoặc viewport.html cũ để debug lặp vì chúng gọi Supabase thật.
- Sau khi diff và regression offline ổn mới gom backend tests thành batch có mục tiêu. `supabase/tests/access.sql` chọn admin active hiện có hoặc fixture rollback khi chưa có, dùng board/section riêng, quota so với baseline, ROLLBACK. Không cần seed; không deactivate admin thật hoặc reorder cột nội dung thật. Nếu lỗi SQL: đọc/điều tra trước, không retry nguyên batch liên tục. Nếu lỗi connector: xác minh kết nối rồi chỉ thử lại có giới hạn.
- Mock PASS chứng minh nhánh xử lý client; SQL role PASS chứng minh assertions dưới SET LOCAL role/sub. Cả hai không thay login JWT, upload/private file thật hoặc full restore. Case thiếu môi trường ghi BLOCKED/NOT RUN. Filechooser timeout trong QA-A08 không được suy thành blob recovery PASS.
- Mỗi bug mới/bug tái mở phải có trace trong [BUG_FIX_LOG](BUG_FIX_LOG.md); QA_REPORT giữ evidence và STATUS chỉ giữ snapshot ngắn. Không đưa PII, token, file runtime hoặc backup vào log/Git.

### Regression khôi phục và save hết hiệu lực

Dùng tests/audit.html và chỉ dữ liệu synthetic của UID audit-fixture. Nút **Tạo nháp PDF để kiểm tra khôi phục** tạo đúng text + blob cho bài PRIVATE QA, ghi snapshot để inspect so sánh byte-for-byte metadata. Không seed hoặc xóa nháp tài khoản thật.

- QA-A12a/d: mở câu hỏi restore; phát SIGNED_OUT bằng nút QA trong dialog hoặc bấm X → snapshot/file phải giữ nguyên. Chỉ **Bỏ bản nháp** mới cho phép xóa. **Khôi phục** chỉ mở editor đầy đủ sau khi đọc đủ file.
- QA-A12b: bật **Chỉ lỗi đọc IndexedDB**, restore → form phải inert, có retry/giữ nháp. Tắt fault bằng nút QA trong editor rồi inspect trước retry: textUnchanged=true và files=1. Retry thành công mới cho phép ghi. Fault chỉ-read giữ write khỏe để phát hiện autosave ghi đè; không dùng lỗi toàn store che khuất lỗi này.
- QA-A12c: **QA: đặt lại bộ đếm dịch vụ**, chọn PDF đang chờ, save → SIGNED_OUT → release file ngoài editor → inspect. usage/upload/save/remove phải đều 0 và File vẫn ở nháp. Các read public sau logout là luồng riêng, được phép. Unit guard còn kiểm cancellation khi quota/upload/reference lookup đã bắt đầu.
- Request đã gửi trước khi cancel không thể được coi là đã hoàn tác; không thử gây expiry thật hay lặp upload debug trên Supabase để chứng minh điều đó. Native File API/mock không thay native picker, JWT hoặc RLS thật.
