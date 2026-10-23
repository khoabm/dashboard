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

## Lệnh hiện có

`npm test` chạy unit regression không gọi backend; `npm run check` kiểm tra syntax/credential scan/diff; `npm run build` bundle static. `npm run test:api` gọi API bằng publishable key, không lấy token admin. `supabase/tests/access.sql` chạy owner SQL Editor với fixtures rollback (SET LOCAL role và JWT sub), không phải phiên login thật. Xem QA_REPORT trước khi mở rộng ma trận; không chạy destructive test trên dữ liệu thật.
