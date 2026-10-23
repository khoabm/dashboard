# Kế hoạch triển khai và gate hiện tại

Scope được người dùng giao ngày 2026-10-23: xây KHTN8 Board trong repo hiện có, trên develop, không dùng nhà cung cấp hosting cũ. Baseline docs: `f145d555759af98e311c22b91f1433cf8890cbe1`. Các mặc định kỹ thuật trong DECISIONS có thể đổi theo review, không được coi là wireframe đã được người dùng duyệt.

| Phase | Đã thực hiện / tiếp tục |
| --- | --- |
| 0 | Repo/quyền/ref; Supabase project đúng tên và Free; schema/Auth/Storage rỗng; docs/changelog và dependency/version/license; khả năng Sites preview tĩnh. Hosting/cost/audience chưa xác minh → tách blocker Phase 6 |
| 1 | UI board 3 cột/6 placeholder, ảnh/PDF/link/YouTube, tìm kiếm/empty/modal, 5 viewport Chrome. Bám mô tả chữ R05; thiếu ảnh wireframe gốc và duyệt visual |
| 2 | Apply migrations, seed, RLS/Storage, audit, optimistic save/reorder/quota; role regression + anon REST. Còn tạo admin và tắt signup, JWT thật non-admin/admin |
| 3 | Source CMS/login/upload/nháp/preview/sort/khôi phục. Fixture browser kiểm tra UI/nháp/lỗi quyền. Cần E2E admin thật trước nghiệm thu |
| 4 | Fetch chung, refresh sau ghi/active/manual; không polling/Realtime. Cần kiểm tra hai client độc lập với thao tác admin thật |
| 5 | Unit/security/check/build/UI QA đã có bằng chứng; cần real uploads/partial failure/session expiry/offline/backup-restore/Safari và thiết bị thật |
| 6 | Chưa đăng ký Site/hosting, chưa deploy, chưa merge main. Chỉ tiếp tục sau khi điều kiện chi phí/audience/bảo mật đã đạt |

Không dừng phần source để chờ hosting; không báo toàn bộ sản phẩm Done khi các gate phụ thuộc tài khoản còn BLOCKED. Bước có tác dụng tiếp theo: chủ tài khoản làm ADMIN_SETUP, sau đó chạy ma trận admin/upload/sync và xử lý lỗi thực tế.
