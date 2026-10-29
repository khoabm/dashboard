# Tổng quan nhanh

**Tên website:** **Vui học cùng cô Quỳnh** — không phải KHTN8 Board.
Mô hình source là website tích hợp các ứng dụng phục vụ việc tiếp cận học liệu và
quản lý lớp/điểm theo quyền. [PRODUCT_PROFILE](PRODUCT_PROFILE.md) là tài liệu chuẩn
cho **mục đích, ý nghĩa, công dụng và phạm vi từng ứng dụng**; không dùng mô tả này
để tuyên bố toàn sản phẩm đã production PASS.

**Ứng dụng:** Bảng học liệu (`/`, tên lịch sử KHTN8 Board); Bảng điểm cá nhân
(`/personal-gradebook`); Quản lý bảng điểm và lớp (`/personal-gradebook/admin`).
Trợ lý học liệu là tính năng trong Board, chỉ xử lý profile và học liệu công khai.
Khách xem bài published; học sinh tra cứu điểm riêng qua xác minh; người quản trị
có công cụ theo quyền. Tên route/menu không cấp quyền.

**Tài liệu nguồn:** [SPEC](SPEC.md) chủ yếu cho Bảng học liệu và hạ tầng;
[Gradebook BRIEF](features/personal-gradebook/BRIEF.md) cho nghiệp vụ lớp/điểm;
[Assistant](features/board-assistant/README.md) cho AI;
[STATUS](STATUS.md) cho bằng chứng và gate còn thiếu; [DECISIONS](DECISIONS.md)
cho quyết định đã xác nhận và mô tả source.

**Stack:** HTML5/CSS3/Vanilla JavaScript ES Modules; Supabase Free cho PostgreSQL/Auth/Storage, Realtime theo quota; GitHub Free (`khoabm/dashboard`). ChatGPT Work + Sites hỗ trợ code, preview, QA và hosting có điều kiện. Không thêm framework/backend riêng nếu chưa có lý do theo SPEC. Không phụ thuộc Sites khi chạy sản phẩm.

**Ràng buộc đầu tiên:** chi phí phát sinh 0 USD. Không trả phí, không trial/thẻ, không domain riêng, không AI API tính phí. Dịch vụ miễn phí có thể pause/hết quota, không cam kết 24/7. Các giới hạn thực tế phải xác minh lúc triển khai.

**Phạm vi ứng dụng Bảng học liệu (MVP lịch sử):** 1 bảng, 3 cột placeholder, 6 bài mẫu; desktop cột ngang, mobile một cột theo tabs/dropdown. Public tìm kiếm/mở tài nguyên; admin CRUD cột/bài, sắp xếp/chuyển cột, draft/published/hidden/deleted, khôi phục, nhiều ảnh/tệp, liên kết/YouTube, nháp cục bộ và đồng bộ thiết bị. Tệp/ảnh <2 MB; tối đa mặc định 10 file/bài; không upload video gốc. Đọc chi tiết R05–13 trước khi code.

**Ngoài phạm vi Bảng học liệu hiện tại:** bình luận, like, đăng bài ẩn danh, học sinh đăng nhập/upload, thanh toán, đa admin/đa bảng. Chat/AI chỉ trong extension [Board Assistant MVP](features/board-assistant/README.md) đang phát triển, chưa nghiệm thu; không xây các mở rộng khác trước.

**Nguồn chuẩn:** SPEC gồm 28 nhóm; REQUIREMENTS_MAP giúp tìm mục. STATUS phản ánh những gì thực sự có. ROADMAP gồm Phase 0–6. ARCHITECTURE quy định cách code và map file thực tế. WORKFLOW hướng dẫn Work/Sites và mẫu bàn giao.

Không dùng overview này để thay tiêu chí chi tiết hoặc tuyên bố tính năng đã tồn tại.

**Feature đang phát triển:** [Bảng điểm cá nhân](features/personal-gradebook/README.md) — CP02–CP05 và CP06-B OFFLINE ACCEPTED. CP01-C đã apply4 migration Gradebook/deploy2 Edge Functions và có bằng chứng tích hợp PARTIAL bằng dữ liệu giả trên localhost:4173; chưa đạt nghiệm thu bảo mật đầy đủ hoặc real-data gate. Frontend production mặc định tắt; không public deploy. [STATUS](STATUS.md) và [CP06 readiness](features/personal-gradebook/CP06_OFFLINE_READINESS.md) ghi bằng chứng/giới hạn hiện tại.

**Extension AI đang thiết kế:** [AI Learning Assistant V1](features/ai-learning-assistant/README.md) — chatbot tìm học liệu theo ngữ nghĩa và điều khiển bộ lọc bằng hội thoại có giới hạn; chỉ dùng học liệu published, không chạm Bảng điểm cá nhân. **DESIGN ONLY; AI-P01 chưa chạy; AI-P02 chưa bắt đầu**. Không có model, dependency, AI API hay UI chatbot được triển khai ở baseline này.
