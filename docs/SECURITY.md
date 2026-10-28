# Bảo mật

Hợp đồng chi tiết: SPEC R08–12, R19. Đã apply schema/policies và có test anon/SQL roles; xem QA_REPORT. Checklist dưới không thay 20 điều kiện R10 hoặc E2E Auth/file thật còn BLOCKED.

| Đối tượng | Đọc | Ghi |
| --- | --- | --- |
| Khách không đăng nhập | Board/cột công khai và posts published cùng tài nguyên hợp lệ | Không |
| Authenticated không phải admin | Chỉ nội dung công khai | Không |
| Admin user ID active được chỉ định | Nội dung phục vụ quản trị | Theo RLS/policies cụ thể |

- Bật RLS mọi bảng ứng dụng trong schema exposed, grant Data API tối thiểu; có quyền SELECT không đồng nghĩa bỏ RLS. Authenticated không tự động là admin; không dựa user_metadata có thể tự sửa.

- Không cho client tự thêm admin_profiles/quyền hoặc giả actor audit. UPDATE cần SELECT phù hợp và USING/WITH CHECK; view/function đặc quyền phải được review riêng theo docs hiện hành.

- Draft/hidden/deleted và attachment metadata/file không được rò qua API, URL hoặc Realtime. Chọn mô hình Storage bảo vệ tệp nháp; public bucket không thể bảo vệ file chỉ nhờ RLS download. Nếu signed URL còn hiệu lực sau khi ẩn bài, ghi rõ thời hạn truy cập còn lại và giải pháp đã chọn, không hứa thu hồi tức thì.

- Upload/delete chỉ admin. Ràng buộc loại/kích thước phía provider khi hỗ trợ và kiểm tra phía client, không tin đuôi tên file. Ảnh JPG/PNG/WebP, tài liệu PDF/DOCX/PPTX/XLSX an toàn, mỗi file <2 MB, tối đa mặc định 10 file/bài; không raw video. Không trộn file draft vào vùng public.

- Upload → xác minh → lưu metadata → publish; lỗi giữa các bước cần rollback/dọn orphan, không giả transaction nguyên tử Storage + DB.

- Chỉ URL HTTPS đã validate; không javascript:/data: hoặc nhúng tùy ý. Mở ngoài an toàn; CSP phù hợp nguồn ảnh/SDK/Supabase/YouTube; API tự tạo không CORS quá rộng.

- Không tự render HTML người dùng; chống XSS cả post, filename, lỗi backend và draft phục hồi. Không log token/password. Không lưu secrets trong draft hoặc IndexedDB. Phiên SDK tuân theo SPEC R08.1 / D09; không nhân bản refresh/access token vào state nháp hoặc localStorage.

- Cấu hình client chỉ URL + publishable key (legacy anon khi thực sự cần). Không hardcode database password/service_role/secret/refresh token trong Git/source/ZIP/output; phiên runtime SDK là trường hợp riêng tại R08.1. Kiểm tra cả bundle và lịch sử thay đổi trước phát hành; thu hồi credential đã lộ qua quy trình phù hợp thay vì chỉ xóa dòng.

- Tắt đăng ký tự do; tạo/chọn duy nhất tài khoản admin bằng luồng an toàn. Không yêu cầu người dùng gửi mật khẩu/OTP vào chat.

- Xóa bài là soft-delete theo R08; hành động phá hủy dữ liệu cần xác nhận đúng lúc. Không tự purge, xóa tài nguyên production hoặc cascade ngoài ý muốn.

Nghiệm thu phải gọi trực tiếp API dưới ba danh tính trên, không chỉ nhìn nút UI. Kiểm tra cả đọc bài/file chưa xuất bản, upload, INSERT/UPDATE/DELETE, sửa quyền và xử lý chuyển trạng thái. Kết quả còn thiếu phải ghi BLOCKED/NOT RUN.

## Implementation hiện tại

Quyền lookup admin nằm trong private.is_admin (SECURITY DEFINER chỉ đọc bảng nội bộ, search_path rỗng, EXECUTE tối thiểu); không dùng user_metadata/JWT claim tự sửa. Chỉ private.audit được quyền ghi audit qua trigger; actor lấy auth.uid, client không có INSERT audit. RPC public save_post/reorder_posts/app_usage đều SECURITY INVOKER, kiểm tra admin và dùng RLS, không có public SECURITY DEFINER. Client không có DELETE post: xóa mềm qua save_post.

Storage private, không cấp UPDATE/upsert; random paths bất biến. Khách chỉ lấy signed URL cho metadata gắn published. URL đã ký có thể còn dùng trong tối đa 60 giây sau khi ẩn/xóa; dữ liệu đã tải/cached không thể thu hồi khỏi máy người xem. Chưa có test file thật chứng minh toàn chuỗi. Bucket giới hạn MIME và 1.999.999 byte; frontend kiểm cả extension/MIME/magic bytes. OOXML kiểm ZIP container, không thay antivirus hoặc xác minh toàn XML; chỉ admin duy nhất tải, không thực thi file trong HTML.

Cleanup ghi nhận cả path upload bị mất response, chia nhóm tối đa 100 path và kiểm exact count của SELECT tham chiếu trước xóa để tránh xóa file của transaction đã commit nhưng mất response. Queue local chỉ ghi path, không bí mật; lỗi mạng có thể để orphan cho admin kiểm tra. Không xóa nguyên bucket. Phiên SDK theo R08.1; nháp không chứa credentials. Đã xác nhận một active admin có email confirmed bằng SQL ngày 2026-10-24. Server signup/anonymous sign-ins chưa được xác minh bằng công cụ, đây vẫn là gate phát hành; không suy từ việc UI không có signup. SIGNED_OUT xóa snapshot/private DOM ngay và bỏ qua response của thế hệ Auth cũ, kể cả khi public refresh lỗi.

## Đánh giá phiên qua reload — AUD-016

Chọn sessionStorage thay vì persistence mặc định của SDK vào localStorage, theo yêu cầu F5 cùng tab và không thêm backend. `auth-session.js` cấp key SDK/kênh BroadcastChannel theo tab, kiểm khả năng storage trước khi tạo client; không dùng localStorage làm phương án dự phòng. SDK quản lý lưu/xóa/refresh, không tự sao chép token. Bootstrap dùng getSession chỉ để tìm phiên, getUser để xác minh qua Auth server, rồi SELECT profile theo user đã xác minh; user_metadata hoặc cờ admin local không cấp quyền.

sessionStorage không phải HttpOnly và không bảo vệ khỏi script độc hại cùng origin. Giữ CSP, render text an toàn và RLS/Storage policies; không tuyên bố lưu phía browser an toàn tuyệt đối. Key ngẫu nhiên chỉ tách tab, không mã hóa token. Tab có opener/duplicate và chức năng restore của browser có thể sao chép/giữ sessionStorage; dùng Đăng xuất trên máy chung. Không có cross-tab logout tức thời được bảo đảm; signOut giữ scope mặc định của SDK, token access đã phát có thể còn hiệu lực đến hạn. Không đổi thời hạn JWT hoặc cấu hình Auth server trong lượt này.

Nếu storage bị chặn ngay khi khởi tạo: memory và cảnh báo trên form. Nếu lỗi storage/network trong vòng đời sau đó: không hứa persistence thành công; lỗi xác minh giữ UI quản trị khóa, không bắt đầu board read, cho retry. Không xóa phiên vì lỗi mạng tạm thời. Bằng chứng offline/browser tại QA-A18 không thay nghiệm thu JWT/RLS/Storage thật. Nguồn đối chiếu: [SDK initialization](https://supabase.com/docs/reference/javascript/initializing), [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [signOut](https://supabase.com/docs/reference/javascript/auth-signout), [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).
