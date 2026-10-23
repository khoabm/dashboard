# Trạng thái hiện tại

Cập nhật: 2026-10-23. Repo `khoabm/dashboard`, nhánh làm việc `develop`. Đây là khởi tạo tài liệu, chưa bắt đầu implementation. Khi đọc qua plugin, dùng HEAD của nhánh thay vì dựa vào trí nhớ hoặc index tìm kiếm cũ.

| Thành phần | Trạng thái / bằng chứng |
| --- | --- |
| Repo / quyền | GitHub trả repo trống; không có branches trước khởi tạo. Tạo commit README trên main rồi tạo develop từ commit đó |
| Bộ tài liệu | Có entry point, SPEC đủ 28 mục, bản đồ yêu cầu, workflow, code conventions, roadmap, QA và giới hạn chi phí; kiểm tra đối chiếu văn bản + 46 link nội bộ PASS, xem ADAPTATION_AUDIT |
| Frontend / dependency / scripts | Chưa có code; chưa cài dependency; chưa có lệnh dev/build/test |
| Supabase | Chưa chọn project, chưa xác minh Free Plan/quota, chưa có schema/migration/seed/Auth/Storage/RLS; không thay đổi tài khoản |
| Sites | Chưa tạo Site, chưa có project_id, URL hoặc source mirror |
| Browser QA ứng dụng | NOT RUN — chưa có ứng dụng. Probe môi trường ở phiên trao đổi trước không phải QA sản phẩm hoặc bằng chứng môi trường của phiên mới |
| Bảo mật | Chưa có runtime để nghiệm thu; yêu cầu đã được ghi, chưa kiểm chứng policies |
| Chi phí | Lượt docs không kích hoạt dịch vụ trả phí; quota/khả năng hosting miễn phí chưa xác minh |
| Wireframe | Brief có mô tả chữ + link tham chiếu Padlet. Chưa có ảnh wireframe quản trị đã duyệt; chưa truy cập/crawl Padlet |

## Bước tiếp theo khi được giao triển khai

Phase 0: kiểm tra khả năng công cụ thực tế, Free Plan/quota theo nguồn chính thức, khả năng source mirror Sites, môi trường QA, và wireframe. Chỉ sau điều kiện liên quan mới Phase 1 placeholder; không cần đợi backend thật để thử UI.

## Điểm chưa chốt (không tự coi là đã duyệt)

- Ảnh wireframe quản trị gốc để đối chiếu; chưa có thì bám mô tả chữ và ghi giới hạn.

- Supabase project ID và admin user ID; cách tạo/đăng nhập tài khoản an toàn, không hỏi mật khẩu qua chat.

- Thời hạn khôi phục bài đã xóa; quy tắc xóa cột có bài, tránh cascade ngoài ý muốn.

- Giá trị byte chính xác của “<2 MB” để frontend/Storage thống nhất; thumbnail gắn với attachment nào; cách dùng version xử lý ghi đè giữa tab.

- Private bucket/signed URL và thay đổi quyền tệp khi published → hidden/deleted; ngưỡng/khả năng đo quota thực tế; lựa chọn realtime.

- Hosting Sites miễn phí có sẵn không; có hỗ trợ khách ẩn danh thực tế không; snapshot phát hành nào sẽ được người dùng cho phép. Không suy từ quyền public của GitHub thành quyền publish website.

## Quy tắc cập nhật

Thay các dòng trên bằng trạng thái mới có branch/commit, lệnh/test, kết quả và phạm vi đã kiểm tra. Giữ ngắn; không nối log mọi lượt. Chi tiết test nằm trong bằng chứng được trỏ tới. Không nhúng SHA của chính file đang được commit; dùng SHA baseline + ref/HEAD từ GitHub để tránh tham chiếu tự vòng.
