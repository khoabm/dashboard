# Bằng chứng kiểm thử — 2026-10-23

Source: develop, baseline `f145d555759af98e311c22b91f1433cf8890cbe1`; HEAD của commit chứa báo cáo là implementation được kiểm tra. Node 24.19.0, Vite 8.3.5, Supabase JS 2.118.0, Supabase PostgreSQL 17.11.0.003. Browser: Chrome cloud qua Sites managed preview `terminal.local:4173`; không phải deployment công khai.

| Case / Rxx | Bước và kết quả quan sát | Kết quả |
| --- | --- | --- |
| Unit R08/10/12/14 | `npm test`: URL credential/protocol, YouTube hostname, MIME/byte signature/2MB/10 items, tìm kiếm tiếng Việt, thứ tự bất biến, retention, nháp allowlist và quota. 7 tests | PASS |
| Source/build | `npm run check`: JS syntax, quét secret/JWT trong client, git diff whitespace. `npm run build`: frontend static dist; JS ~249kB / gzip ~68kB | PASS |
| Database R09/10/11 | access.sql trên project thật; transaction fixtures admin/non-admin, SET LOCAL role/JWT sub; public không đọc draft/hidden/attachment và không ghi/upload; non-admin không ghi/tự cấp quyền; admin RPC publish, conflict 40001, audit, FK, quota và reorder | PASS (SQL role simulation, không phải login JWT thật) |
| REST R10 | `npm run test:api`: public SELECT chỉ published; POST/PATCH/DELETE/RPC bị 401; upload Storage bị RLS từ chối | PASS (anon thật) |
| Public R05/07/22 | Quan sát 1 board, 3 chủ đề, 6 bài có nhãn Placeholder từ Supabase thật; không lấy học liệu Padlet | PASS |
| Search R07 | Nhập chuỗi không có nội dung → empty; `hinh anh` → khớp nội dung tiếng Việt; xóa query → bảng đầy đủ | PASS |
| Media R07 | Click card ảnh → tải → phóng to dialog; PDF mẫu tạo iframe và link local; click video → player YouTube thật hiển thị; link example.org đúng HTTPS/noopener | PASS UI/fixture; playback đến hết video/download Office NOT RUN |
| Responsive R05/14/19 | tests/viewport.html tải app thật trong iframe 360/390/768/1024/1440px. Body scrollWidth = width tương ứng 345/375/753/1009/1425 (trừ thanh cuộn dọc 15px). Mobile một cột/dropdown, chọn chủ đề03 đúng. Tablet board tự cuộn ngang, body không tràn | PASS Chrome iframe viewports; không phải Safari/iPhone/Android thật |
| Editor R08.9/12 | tests/editor.html là fixture **anon**, không giả backend thành công. Nhập tiêu đề chứa `<img …>` → preview giữ văn bản; javascript URL bị chặn. Tệp PDF mẫu chọn bằng filechooser → IndexedDB, đổi thứ tự lên đầu, rời form được cảnh báo; mở lại phục hồi text/PDF và thứ tự, PDF blob mở được | PASS fixture |
| Save failure R08/10 | Lưu nháp với fixture anon bị backend từ chối, hiện lỗi quyền; editor/text/files vẫn giữ, không báo thành công | PASS |
| Auth R08.1 | Mở màn hình login, đúng labels/email/password, không có signup. Chưa nhập thông tin đăng nhập | PASS UI; login/logout thật BLOCKED |
| Advisors | Security Advisor không có lint; Performance sau tách write policies chỉ còn INFO unused sections_board_order; không còn WARN. INFO unused index không chứng minh lỗi ở dataset mới | PASS security; performance recorded separately |

Lỗi đã sửa qua kiểm chứng: Vite allowedHosts cho preview; crypto.randomUUID chỉ có trong secure context nên dùng fallback getRandomValues; bảo toàn thứ tự tệp khi restore; chặn tương tác khi đang phục hồi blob; tránh báo lỗi lưu do cleanup localStorage; sắp xếp bài nguyên tử khi có rank trùng.

Console có lỗi từ `chrome-extension://...content-script.bundle.js` gửi metadata, không phải source app. Lỗi randomUUID thuộc app đã được sửa và browser fixture mở được sau sửa. Không kiểm tra Network tab tổng quát bằng API không có sẵn.

## Chưa đủ bằng chứng nghiệm thu

- BLOCKED: chưa có Auth user/admin_profile; chưa xác minh/tắt server signup. Login/logout, CMS thực, upload thật/thumbnail/signed URLs published→hidden, non-admin JWT thật, hai context độc lập sync chưa chạy. Test anon/SQL không thay các bước này.
- NOT RUN: mất mạng lúc soạn/upload, session expiry thật, upload một phần fail + orphan cleanup thực, quota provider thực, project pause, Safari/iPhone/Android thật, full backup/restore và production smoke. Ngưỡng quota đã có unit test, không phải mô phỏng provider hết quota.
- Thiếu ảnh wireframe quản trị đã duyệt; UI bám mô tả chữ, cần visual acceptance.
- Chưa deploy hoặc tạo Site vì chưa đạt gate bảo mật/chi phí/audience. Không dùng preview URL làm URL public.

[Ảnh giao diện desktop](qa/board-desktop.jpg). Fixtures tests/*.html chỉ phục vụ dev server, không có trong dist.

Advisor INFO reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index . Không xóa index FK/order chỉ vì chưa có tải thực tế.
