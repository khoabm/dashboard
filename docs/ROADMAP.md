# Roadmap

Nguồn đầy đủ: SPEC R24–28. Hiện đang ở **khởi tạo tài liệu trước Phase 0**, chưa hoàn tất audit hoặc triển khai. Không có milestone sản phẩm đã PASS.

| Phase | Kết quả phải có | Gate chuyển tiếp |
| --- | --- | --- |
| 0 — Audit & Planning | Tool/quyền thực tế, stack/version, Free Plan/quota, architecture checklist, wireframe/source workflow | Ràng buộc liên quan đã kiểm chứng; blocker tách rõ, không tự trả phí |
| 1 — Frontend UI | 3 cột/6 bài placeholder; giao diện theo wireframe, responsive, modal/tìm kiếm | Browser QA frontend; chưa cần Supabase thật để thử UI; không báo full product Done |
| 2 — Supabase | Schema/migrations/seed, Auth, RLS và Storage policies | Test policies/API trực tiếp, kiểm tra secrets, đúng project Free |
| 3 — Admin CMS | Login, quản lý cột/bài, upload/link/video, draft/publish/sort | Luồng admin và bảo vệ dữ liệu đã test với backend thật |
| 4 — Đồng bộ | Fetch, refresh sau ghi/active/manual; realtime nếu quota cho phép; error handling | Client độc lập nhận published, nêu độ trễ/trade-off |
| 5 — Testing & Hardening | Toàn bộ functional/security/reliability/responsive/performance/quota/backup/restore | Lỗi trọng yếu đã xử lý, browser QA và R25 đủ bằng chứng; ngoại trừ điều kiện deploy ở Phase 6 |
| 6 — Deploy | Source GitHub đầy đủ, deploy miễn phí theo yêu cầu, URL, public/admin/mobile/access checks, bàn giao | Security trước production; mọi điều kiện Done còn lại và báo cáo giới hạn Free |

Giữ scope SPEC; không triển khai tính năng tương lai R23. Phase 0 chỉ chặn phần phụ thuộc điều kiện còn thiếu: không dùng thiếu project Supabase để trì hoãn một UI placeholder độc lập, cũng không dùng UI PASS để bỏ audit backend.

Trước Phase 1 cần đối chiếu wireframe mô tả R05. Ảnh wireframe đã duyệt hiện thiếu: tiến hành phần độc lập nếu được giao và ghi giới hạn; không tự tuyên bố bám chính xác một ảnh chưa thấy.

Sau mỗi phase cập nhật STATUS và bằng chứng; không chép roadmap thành log dài. Các gợi ý kỹ thuật chưa chốt ở STATUS không tự đổi tiêu chí SPEC.
