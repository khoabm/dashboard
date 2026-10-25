# Tổng quan nhanh

**Sản phẩm:** KHTN8 Board — học liệu Khoa học tự nhiên lớp 8 theo bảng cột Padlet. Người dùng kiểm soát source và dữ liệu; website phải chạy độc lập ngoài ChatGPT.

**Đối tượng:** một admin Supabase Auth được chỉ định bằng user ID; người xem công khai không đăng nhập, chỉ đọc published.

**Stack:** HTML5/CSS3/Vanilla JavaScript ES Modules; Supabase Free cho PostgreSQL/Auth/Storage, Realtime theo quota; GitHub Free (`khoabm/dashboard`). ChatGPT Work + Sites hỗ trợ code, preview, QA và hosting có điều kiện. Không thêm framework/backend riêng nếu chưa có lý do theo SPEC. Không phụ thuộc Sites khi chạy sản phẩm.

**Ràng buộc đầu tiên:** chi phí phát sinh 0 USD. Không trả phí, không trial/thẻ, không domain riêng, không AI API tính phí. Dịch vụ miễn phí có thể pause/hết quota, không cam kết 24/7. Các giới hạn thực tế phải xác minh lúc triển khai.

**MVP đầy đủ:** 1 bảng, 3 cột placeholder, 6 bài mẫu; desktop cột ngang, mobile một cột theo tabs/dropdown. Public tìm kiếm/mở tài nguyên; admin CRUD cột/bài, sắp xếp/chuyển cột, draft/published/hidden/deleted, khôi phục, nhiều ảnh/tệp, liên kết/YouTube, nháp cục bộ và đồng bộ thiết bị. Tệp/ảnh <2 MB; tối đa mặc định 10 file/bài; không upload video gốc. Đọc chi tiết R05–13 trước khi code.

**Chưa làm:** bình luận, like, đăng bài ẩn danh, học sinh đăng nhập/upload, chat, AI, thanh toán, đa admin/đa bảng. Chỉ dự trù mở rộng, không xây trước.

**Nguồn chuẩn:** SPEC gồm 28 nhóm; REQUIREMENTS_MAP giúp tìm mục. STATUS phản ánh những gì thực sự có. ROADMAP gồm Phase 0–6. ARCHITECTURE quy định cách code và map file thực tế. WORKFLOW hướng dẫn Work/Sites và mẫu bàn giao.

Không dùng overview này để thay tiêu chí chi tiết hoặc tuyên bố tính năng đã tồn tại.

**Feature được lên kế hoạch (chưa implement):** [Bảng điểm cá nhân](features/personal-gradebook/README.md) — một lớp, hai học kỳ, xác minh CMND/CCCD và ngày sinh, quản lý học sinh/điểm, import UPSERT Excel/CSV, biểu đồ cột trên modal. Chi tiết và điều kiện nghiệm thu thuộc brief riêng; không hiểu dòng này là đã có UI hoặc dữ liệu runtime.
