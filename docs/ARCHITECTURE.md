# Kiến trúc và cách code

Hợp đồng: SPEC R03, R06, R09, R12–17, R20. Quy ước và code map dưới đây phản ánh implementation trên develop; nghiệm thu runtime xem STATUS/QA_REPORT.

## Ranh giới

- Frontend tĩnh render UI, xử lý tương tác, validate sớm, gọi Supabase SDK bằng publishable key.

- Supabase PostgreSQL là nguồn dữ liệu chính. Auth xác thực một admin; RLS và Storage policies quyết định quyền thực tế.

- localStorage giữ nháp văn bản/tùy chọn; IndexedDB có thể giữ blob tạm. Không coi dữ liệu cục bộ là đã đồng bộ hoặc thay nguồn chuẩn.

- Storage giữ học liệu runtime. GitHub chỉ giữ source, placeholder hợp pháp và migration/seed. Đăng/sửa bài trên Supabase không cần deploy frontend.

- Sites phục vụ quy trình phát triển/preview/QA/hosting có điều kiện, không là backend dữ liệu. Không thay Supabase bằng storage hay danh tính ChatGPT.

## Quy ước module

| Vị trí dự kiến | Trách nhiệm |
| --- | --- |
| src/main.js | Bootstrap, ghép dịch vụ và component; không nhồi toàn bộ ứng dụng |
| src/components/ | Render/interaction của 20 component tại SPEC R06; cleanup listeners khi unmount |
| src/services/ | Một Supabase client; truy vấn/Auth/Storage/sync, trả lỗi rõ ràng; không thao tác DOM |
| src/utils/ | Hàm thuần kiểm tra URL/file, format, debounce, thứ tự; test logic có rủi ro |
| src/config/ | Chỉ cấu hình public; kiểm tra thiếu cấu hình và hiện lỗi hữu ích |
| src/data/ | Placeholder có nhãn; tách rõ mode demo khỏi backend thật |
| src/styles/ | Tokens CSS, base, layout, component, responsive; không style inline lặp vô ích |
| supabase/migrations/, seed.sql | Schema/policy có version và seed chạy lại không trùng |
| tests/ | Regression, integration và bằng chứng QA tương ứng |

Các thư mục code trong bảng đã có implementation. Không buộc một file/component nếu ghép module nhỏ rõ nghĩa tiết kiệm hơn; vẫn đáp ứng đủ hành vi các component trong SPEC.

## Cách viết

- ES Modules, tên rõ nghĩa, một nguồn xử lý cho một quy tắc; không global state tùy tiện, không abstraction trước nhu cầu. Ghi chú giải thích lý do, tránh comment lặp lại code.

- UI gọi service qua hàm có đầu vào/đầu ra rõ. Chỉ báo lưu thành công sau khi backend xác nhận; giữ editor/nháp khi lỗi, không xóa nội dung trước khi lưu xong.

- Trạng thái loading/empty/error/disabled/dirty/sync là tường minh. Unsubscribe/remove listeners khi không dùng. Chống submit trùng và cập nhật UI sau thao tác bị hủy.

- Render văn bản bằng API an toàn như textContent; HTML tùy ý không nằm trong phạm vi. URL/nhúng qua allowlist và parser; không dựa chỉ vào thuộc tính input.

- Desktop board cuộn ngang trong vùng board; mobile chọn một cột, không tràn toàn trang. Semantic HTML, label, focus, keyboard/dialog, alt/title, reduced motion theo SPEC.

- Dùng server constraints và policies cho ràng buộc có thể cưỡng chế; validation frontend chỉ hỗ trợ trải nghiệm. Ghi rõ thao tác Storage/DB nhiều bước, rollback/dọn orphan và lỗi một phần.

- Không fetch blob khi chỉ cần metadata. Lazy-load, thumbnail, debounce; tránh N+1, listener dư, high-frequency polling. Fetch sau lưu/active/refresh; realtime chỉ sau kiểm chứng quota/phân quyền.

- Thư viện tùy chọn theo R15; chọn tối thiểu, kiểm tra docs/license/version, pin version và lockfile nếu dùng npm. CDN không dùng latest; không tự đổi sang framework khi Sites đề xuất starter server.

## Code map thực tế

| Module thực tế | Đường dẫn / trách nhiệm | Test |
| --- | --- | --- |
| Bootstrap / refresh / hành động | src/main.js | QA_REPORT public + editor fixture |
| Header/Search/AdminToolbar/Board/Column/Card/Preview | src/components/board.js | public UI + viewport |
| Gallery/Document/Video | src/components/media.js | ảnh/PDF/YouTube UI |
| PostEditorDrawer/AttachmentUploader | src/components/post-editor.js | editor fixture + drafts/validation unit |
| Login / SectionEditor | src/components/auth.js, section-editor.js | login UI; E2E thật BLOCKED |
| Confirm/Toast/Loading/Empty/Error/Sync | src/components/primitives.js | browser search/modal/error |
| QuotaStatus | src/components/quota.js | quota unit + SQL RPC |
| Supabase client/query/Auth/export | src/services/client.js, board.js | anon API + SQL role regression |
| File upload/sign/cleanup | src/services/storage.js | file validation unit; authenticated upload BLOCKED |
| Text / Blob nháp | src/services/drafts.js | tests/drafts.test.js + browser IndexedDB |
| URL/file/search/order/retention/quota/ID/DOM | src/utils/ | tests/*.test.js; preview UUID fallback verified |
| Public config / placeholder fixtures | src/config/public.js, src/data/placeholders.js, public/placeholders/ | public board/media |
| Schema/RLS/atomic RPC | supabase/migrations/, seed.sql | supabase/tests/access.sql |

Vite chỉ bundle SDK và cấu hình public, output static dist. Không có server app hoặc framework SPA. Session Supabase ở memory (không persistence), còn text draft localStorage và File draft IndexedDB có key theo UID/post. Private Storage dùng signed URL 60 giây; thumbnail được ký theo batch metadata, không fetch tất cả file bytes. Refresh sau ghi/active/manual, không đăng ký Realtime. Chi tiết quyết định ở SPEC/DECISIONS, không nhân bản cấu hình ở nhiều file.
