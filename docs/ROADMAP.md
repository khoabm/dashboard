# Roadmap

Extension 2026-10-29: [Board Assistant MVP](features/board-assistant/README.md) có source và
E2E synthetic localhost/Worker được kiểm chứng; không chuyển website sang Phase6 hoặc cho
phép public release. AI public-production/index/real-content acceptance còn là gate riêng.

Nguồn đầy đủ: SPEC R24–28. Đã triển khai nền tảng Phase 1–4 trên develop; đang ở **gate Auth admin / kiểm thử đầy đủ Phase 2–5**, chưa đạt nghiệm thu sản phẩm. Xem STATUS và IMPLEMENTATION_PLAN cho phần đã có bằng chứng và blocker; Phase 6 chưa bắt đầu.

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

## Extension riêng — Personal Gradebook (offline implementation; backend gates pending)

Module Bảng điểm cá nhân có [implementation checkpoints CP00–CP07](features/personal-gradebook/CHECKPOINTS.md) và [brief nghiệp vụ](features/personal-gradebook/BRIEF.md). CP02–CP05 đã OFFLINE ACCEPTED; CP06-A chuẩn bị tích hợp bằng projection/QA offline. CP01 backend vẫn là draft chưa triển khai; CP01-C và real-data gate NOT RUN. Trạng thái extension không có nghĩa Phase 0–6 hiện tại đã hoàn tất hoặc thay đổi thứ tự roadmap học liệu. Mọi migration và thao tác dữ liệu thật cần ủy quyền riêng.
