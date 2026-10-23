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

- Không tự render HTML người dùng; chống XSS cả post, filename, lỗi backend và draft phục hồi. Không log token/password. Không lưu secrets trong draft hoặc IndexedDB. Cơ chế session của SDK phải cấu hình/đánh giá riêng; không nhân bản refresh/access token vào state nháp và không báo localStorage tuyệt đối không chứa session nếu SDK đang dùng persistence mặc định.

- Client chỉ URL + publishable key (legacy anon khi thực sự cần). Database password/service_role/secret/refresh token không vào Git, source/ZIP/frontend/output. Kiểm tra cả bundle và lịch sử thay đổi trước phát hành; thu hồi credential đã lộ qua quy trình phù hợp thay vì chỉ xóa dòng.

- Tắt đăng ký tự do; tạo/chọn duy nhất tài khoản admin bằng luồng an toàn. Không yêu cầu người dùng gửi mật khẩu/OTP vào chat.

- Xóa bài là soft-delete theo R08; hành động phá hủy dữ liệu cần xác nhận đúng lúc. Không tự purge, xóa tài nguyên production hoặc cascade ngoài ý muốn.

Nghiệm thu phải gọi trực tiếp API dưới ba danh tính trên, không chỉ nhìn nút UI. Kiểm tra cả đọc bài/file chưa xuất bản, upload, INSERT/UPDATE/DELETE, sửa quyền và xử lý chuyển trạng thái. Kết quả còn thiếu phải ghi BLOCKED/NOT RUN.

## Implementation hiện tại

Quyền lookup admin nằm trong private.is_admin (SECURITY DEFINER chỉ đọc bảng nội bộ, search_path rỗng, EXECUTE tối thiểu); không dùng user_metadata/JWT claim tự sửa. Chỉ private.audit được quyền ghi audit qua trigger; actor lấy auth.uid, client không có INSERT audit. RPC public save_post/reorder_posts/app_usage đều SECURITY INVOKER, kiểm tra admin và dùng RLS, không có public SECURITY DEFINER. Client không có DELETE post: xóa mềm qua save_post.

Storage private, không cấp UPDATE/upsert; random paths bất biến. Khách chỉ lấy signed URL cho metadata gắn published. URL đã ký có thể còn dùng trong tối đa 60 giây sau khi ẩn/xóa; dữ liệu đã tải/cached không thể thu hồi khỏi máy người xem. Chưa có test file thật chứng minh toàn chuỗi. Bucket giới hạn MIME và 1.999.999 byte; frontend kiểm cả extension/MIME/magic bytes. OOXML kiểm ZIP container, không thay antivirus hoặc xác minh toàn XML; chỉ admin duy nhất tải, không thực thi file trong HTML.

Cleanup luôn SELECT tham chiếu trước xóa để tránh xóa file của transaction đã commit nhưng mất response. Queue local chỉ ghi path, không bí mật; lỗi mạng có thể để orphan cho admin kiểm tra. Không xóa nguyên bucket. SDK persistSession=false, tokens ở memory; nháp không chứa credentials. Chưa có Auth user và chưa xác minh server signup, đây là gate phát hành, không được suy từ việc UI không có signup.
