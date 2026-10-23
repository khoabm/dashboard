# Kiểm soát chuyển đổi brief

Nguồn: `Pasted text(1).txt`, SHA-256: `07e94d43bf69a8c21971908e8f4f825fb112df9ad69dd36502dd432e63b8aba5`.

Phạm vi: giữ các yêu cầu sản phẩm, giao diện, quản trị, schema, bảo mật, lưu trữ, đồng bộ, kiểm thử, hiệu năng, backup, roadmap và nghiệm thu; không coi phần văn xuôi “đã xác minh” trong bản dán là bằng chứng dịch vụ hiện tại.

Các chuyển đổi có chủ đích:

- Bỏ tên, gói, domain, plugin, Functions, Analytics và cơ chế triển khai riêng của nhà cung cấp hosting cũ.

- Giữ các yêu cầu triển khai độc lập nhà cung cấp: HTTPS, frontend tĩnh, kiểm tra biến công khai, bảo vệ secret, runtime/network, cấu hình tái tạo được.

- Chuyển workflow hosting sang Sites có điều kiện tương thích/0 USD; thay auto-deploy bằng phát hành theo yêu cầu. Không tự triển khai trong lượt tạo tài liệu.

- Dùng repository đã được chọn `khoabm/dashboard`; thêm nhánh `develop`. Không tạo repo mới hoặc đổi tên repo theo tên gợi ý cũ.

- Giữ đủ nội dung 28 mục trong SPEC; chỉ chuẩn hóa dấu escape, dòng, danh sách và cây thư mục. Các hướng dẫn bổ sung ghi riêng trong tài liệu vận hành, không giả làm yêu cầu đã được duyệt.

- Bỏ các favicon, trích dẫn hỏng “+1”, lời giới thiệu lặp và lời khẳng định đã kết nối/đã xác minh không có bằng chứng hiện tại.

- Số quota trong phần mở đầu brief được giữ dưới dạng dữ liệu lịch sử chưa xác minh ở ZERO_COST.md. Không xóa ràng buộc cảnh báo 70%, 85–90%, không trả phí và chấp nhận tạm dừng.

- Ba lưu ý vận hành cuối brief được giữ trong ZERO_COST.md / ARCHITECTURE.md: một admin vẫn có nhiều người đọc, Git chỉ chứa source, cập nhật nội dung không cần deploy, không bảo đảm Free 24/7.

Bản đồ REQUIREMENTS_MAP.md có 28 dòng tương ứng I–XXVIII. Đối chiếu văn bản không đồng nghĩa đã thực hiện yêu cầu hoặc kiểm chứng vận hành. Wireframe hình ảnh chưa có trong tệp đính kèm; không được báo đã đối chiếu pixel với wireframe đã duyệt.

## Kết quả kiểm tra bộ tài liệu

PASS ngày 2026-10-23: 28/28 mục SPEC và 28 dòng truy vết. Đối chiếu tự động 27 mục khớp văn bản sau đúng các thay thế hosting/repository đã khai báo và chuẩn hóa định dạng; mục XVI kiểm tra giữ đủ tên file/thư mục trong cây đã trình bày lại. Giữ 20 component, 20 yêu cầu bảo mật, 20 điều kiện Done. Kiểm tra 46 liên kết nội bộ thành công; không còn tên nhà cung cấp hosting đã yêu cầu loại bỏ trong các file. Tổng 17 file: Markdown và .gitignore.

Đây là kiểm tra tài liệu, không phải browser QA, xác minh quota, triển khai hay kiểm thử Supabase. Không chứng minh tối ưu token tuyệt đối; cách tiết kiệm là entry point ngắn, chỉ đọc phần liên quan và không sao chép SPEC vào các bản tổng hợp khác.
