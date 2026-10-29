# Tổng quan nhanh

**Sản phẩm:** **Vui học cùng cô Quỳnh** — web quản lý lớp online với các ứng dụng đính kèm.
[Chuẩn sản phẩm hiện hành](PRODUCT_PROFILE.md) được chủ sở hữu chốt; không suy phạm vi toàn web từ
nội dung mẫu Khoa học tự nhiên lớp8. Người dùng kiểm soát source/dữ liệu; web độc lập ngoài ChatGPT.

**Ứng dụng có trong source:** Bảng học liệu; Bảng điểm cá nhân; Quản lý bảng điểm và lớp.
Trợ lý học liệu là chức năng hỗ trợ nguồn công khai, không phải toàn bộ web. Route lifecycle và menu
trong app.js/site-navigation.js cho thấy các ứng dụng tách biệt.

**Đối tượng và quyền:** giáo viên/người quản lý lớp và học sinh. Khách đọc Board published;
tra cứu điểm cá nhân cần xác minh, quản lý lớp/bảng điểm cần quyền riêng. Một admin Board không
đồng nghĩa mọi người dùng web có quyền quản trị; trợ lý không đọc dữ liệu lớp, điểm hay Auth.

**Stack:** HTML5/CSS3/Vanilla JavaScript ES Modules; Supabase Free cho PostgreSQL/Auth/Storage, Realtime theo quota; GitHub Free (`khoabm/dashboard`). ChatGPT Work + Sites hỗ trợ code, preview, QA và hosting có điều kiện. Không thêm framework/backend riêng nếu chưa có lý do theo SPEC. Không phụ thuộc Sites khi chạy sản phẩm.

**Ràng buộc đầu tiên:** chi phí phát sinh 0 USD. Không trả phí, không trial/thẻ, không domain riêng, không AI API tính phí. Dịch vụ miễn phí có thể pause/hết quota, không cam kết 24/7. Các giới hạn thực tế phải xác minh lúc triển khai.

**Phạm vi ứng dụng Bảng học liệu (MVP lịch sử):** 1 bảng, 3 cột placeholder, 6 bài mẫu; desktop cột ngang, mobile một cột theo tabs/dropdown. Public tìm kiếm/mở tài nguyên; admin CRUD cột/bài, sắp xếp/chuyển cột, draft/published/hidden/deleted, khôi phục, nhiều ảnh/tệp, liên kết/YouTube, nháp cục bộ và đồng bộ thiết bị. Tệp/ảnh <2 MB; tối đa mặc định 10 file/bài; không upload video gốc. Đọc chi tiết R05–13 trước khi code.

**Ngoài phạm vi Bảng học liệu hiện tại:** bình luận, like, đăng bài ẩn danh, học sinh đăng nhập/upload, thanh toán, đa admin/đa bảng. Chat/AI chỉ trong extension [Board Assistant MVP](features/board-assistant/README.md) đang phát triển, chưa nghiệm thu; không xây các mở rộng khác trước.

**Nguồn chuẩn:** SPEC gồm 28 nhóm; REQUIREMENTS_MAP giúp tìm mục. STATUS phản ánh những gì thực sự có. ROADMAP gồm Phase 0–6. ARCHITECTURE quy định cách code và map file thực tế. WORKFLOW hướng dẫn Work/Sites và mẫu bàn giao.

Không dùng overview này để thay tiêu chí chi tiết hoặc tuyên bố tính năng đã tồn tại.

**Feature đang phát triển:** [Bảng điểm cá nhân](features/personal-gradebook/README.md) — CP02–CP05 và CP06-B OFFLINE ACCEPTED. CP01-C đã apply4 migration Gradebook/deploy2 Edge Functions và có bằng chứng tích hợp PARTIAL bằng dữ liệu giả trên localhost:4173; chưa đạt nghiệm thu bảo mật đầy đủ hoặc real-data gate. Frontend production mặc định tắt; không public deploy. [STATUS](STATUS.md) và [CP06 readiness](features/personal-gradebook/CP06_OFFLINE_READINESS.md) ghi bằng chứng/giới hạn hiện tại.
