# Kiến trúc và cách code

Hợp đồng: SPEC R03, R06, R09, R12–17, R20. Thiết kế dưới đây là quy ước triển khai, chưa phải code đang tồn tại.

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

Chưa tạo các thư mục trên cho đến khi có code thực tế. Không buộc một file/component nếu ghép module nhỏ rõ nghĩa tiết kiệm hơn; vẫn đáp ứng đủ hành vi các component trong SPEC.

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

Hiện chỉ có README, AGENTS và docs; chưa có entrypoint, services, components, scripts hay migration. Khi triển khai, thay đoạn này bằng bảng module thực tế → đường dẫn → trách nhiệm → test liên quan. Không liệt kê mọi file hoặc chép code vào docs; chỉ map giúp phiên sau mở đúng chỗ.
