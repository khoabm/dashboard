# Bằng chứng kiểm thử

<a id="audit-2026-10-24"></a>

## 2026-10-24 — regression sau audit PR #1

Source: `fix/audit-reliability-20261024`, parent `e5605d87ab5106f5b41d491b970aec68b744fc91`; nội dung ứng dụng trong commit chứa phần báo cáo này. Đã đọc AGENTS, OVERVIEW, STATUS, ARCHITECTURE, CODE_STYLE, COMMENTING_GUIDELINES, SECURITY, DATABASE, TESTING và các mục SPEC R08/10–14/19 liên quan trước sửa. Node 24, Vite 8.3.5, Supabase JS 2.118.0; không thêm dependency. Sửa cụ thể và root cause: [BUG_FIX_LOG](BUG_FIX_LOG.md).

Browser: Chrome cloud desktop, ảnh 1348×926, Sites preview nội bộ. `tests/audit.html` nhập module app thật; fixture chỉ ở dev, thay transport/identity bằng dữ liệu giả lập rõ nhãn, không tạo token/password. Fetch ngoài origin không được forward tới mạng; CSP chỉ cho connect cùng origin. Con số liveRequests=0 là invariant của fixture, không phải phép đo Network tab hoặc bằng chứng backend. Các bài và danh tính QA đều synthetic.

| Case / Rxx | Bước / mong đợi → thực tế | Trạng thái |
| --- | --- | --- |
| QA-A01 / R08/21 | Unit tạo 121 posts/1.210 attachments, cap provider 200 dù yêu cầu 500, sort_order trùng. loadBoard đủ 10 tài nguyên/bài; export đủ attachments/audit_logs. Kiểm 1.000 hàng đúng page boundary, table rỗng; fault count thiếu/đổi, trang thiếu, ID trùng, lỗi page → reject, không trả snapshot dở | PASS offline |
| QA-A02 / R08.1/10/19 | Nạp quản trị giả lập có bài PRIVATE; giữ response posts khi refresh; bật lỗi public; Đăng xuất → toolbar/bài riêng/count xóa ngay. Trả response cũ → public ErrorState, không còn bài riêng. Unit bảo đảm finally cũ không giải phóng slot mới | PASS mock + unit; [ảnh](qa/audit-logout-network-failure-20261024.jpg) |
| QA-A03 / R08.9/12 | Bật lỗi text store; tạo tiêu đề, đóng và xác nhận rời form → editor vẫn mở, tiêu đề giữ đúng, có thông báo nháp chưa lưu được. Không báo đã lưu nháp | PASS fault injection; [ảnh](qa/audit-draft-storage-failure-20261024.jpg) |
| QA-A04 / R08.9/12 | Lặp riêng với IndexedDB không mở được → không đóng, báo lỗi đúng. Tắt lỗi ở ca riêng; soạn text → đóng/xác nhận → inspect có đúng tiêu đề; mở lại/xác nhận restore → đúng tiêu đề. Dùng IndexedDB thật của browser cho ca thành công, không cần API | PASS; [ảnh](qa/audit-indexeddb-failure-20261024.jpg) |
| QA-A05 / R08.4/19 | Giữ response save giả lập; soạn tiêu đề “Snapshot bất biến khi đang lưu”, thêm 1 link và save. Form biến mất khỏi accessibility tree khi inert, close disabled; Tab/x/Escape không đổi tiêu đề/đóng dialog. Trả response → payload đúng tiêu đề và 1 attachment; inspect drafts=[] sau success. Ca riêng RPC 503 → editor mở khóa, giữ tiêu đề và báo QA save failed + nháp local, không báo success | PASS mock UI; không chứng minh lưu Supabase thật |
| QA-A06 / R11/19 | Unit Storage response lost ở file thứ hai + reference lookup fail: queue chứa cả 2 path đã thử. Retry chỉ xóa path không tham chiếu; truncated lookup không xóa. Queue 1.201 paths chia nhóm vẫn bảo vệ mọi referenced path | PASS offline, không upload/xóa file thật |
| QA-A07 / R09–11/19 | Chạy access.sql một batch thành công trên `dashboard`: anon/non-admin visibility/write denial, admin publish/conflict/FK/quota/reorder/audit không raise lỗi. Dùng admin đang có, fixture board/section riêng, ROLLBACK. Query sau rollback: active_admins=1, confirmed_active_admins=1, fixtures_remaining=0 | PASS SQL role simulation; không phải login JWT/file bytes thật |
| QA-A08 / R08.6/12 | Thử chọn PDF qua filechooser của công cụ → timeout, runtime browser và preview bị dừng; phục hồi preview để hoàn tất các ca text/logout. Không retry filechooser liên tục; không có bằng chứng PDF đã được chọn/lưu/khôi phục trong revision này | BLOCKED công cụ; không ghi PASS từ bằng chứng cũ |
| QA-A09 / source | npm test: 14 tests (7 cũ + 7 regression mới). npm run check, npm run build, npm run format:check toàn code. dist chỉ có entry app/assets/placeholders; không có fixture hoặc QA identity/fault strings | PASS cục bộ; GitHub CI branch fix NOT RUN |

Ngân sách test: toàn bộ debug browser/unit ở trên không gọi Supabase thật. Hai lần gọi execute_sql: lần đầu lỗi connector `Invalid or expired requestState` không có kết quả SQL; kiểm tra project ACTIVE_HEALTHY rồi thử lại một lần, batch rollback PASS. Không chạy test:api, login loop, upload thật, polling, realtime hoặc provider fault trên project thật. Không thay schema/policy/migration, Auth settings, account, hosting hay dữ liệu runtime bền vững. SQL audit identity sequence có thể tăng dù transaction rollback; đây không phải artifact nội dung test còn lại.

Console quan sát có lỗi `chrome-extension://...content-script.bundle.js` gửi metadata; không phải source app. Không dùng kết quả mock làm bằng chứng RLS hoặc JWT thật. Không chạy lại matrix responsive/device hay full restore trong lượt này. Pagination nhiều REST request không phải transaction snapshot; dùng version check và hướng dẫn backup nhất quán riêng.

Auth snapshot hiện tại đã thay đổi so với báo cáo 2026-10-23 dưới đây: admin active có email confirmed đã tồn tại. Server signup/anonymous chưa xác minh bằng công cụ. E2E Auth thật vẫn chưa có bằng chứng mới; không cần tạo thêm admin.

## 2026-10-23 — bằng chứng lịch sử


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
