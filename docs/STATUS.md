# Trạng thái hiện tại

Cập nhật 2026-10-23. Repo `khoabm/dashboard`, `develop`. Baseline docs `f145d555759af98e311c22b91f1433cf8890cbe1`; lấy HEAD develop từ GitHub khi bắt đầu phiên mới. **Đã có implementation, chưa đạt Definition of Done.**

| Thành phần | Bằng chứng hiện tại |
| --- | --- |
| Frontend | HTML/CSS/Vanilla JS + Vite 8.3.5 / Supabase JS 2.118.0; npm lockfile; build dist thành công. 1 board/3 cột/6 bài placeholder đọc Supabase thật, search/modal/media/responsive |
| CI / Code style (2026-10-24) | Prettier 3.6.2 đã format toàn bộ 28 file thực thi/test tại `4058de8`; bước debug-check AST, unit, syntax, build và format-check hoàn tất trước commit của GitHub runner. CI chính kiểm tra toàn bộ code, không còn baseline; CI chính chưa chạy qua PR/merge. Không kiểm tra API/Supabase |
| Supabase | `dashboard` / `vgciiqtwmxcdqppntgnt`, PostgreSQL 17.11; tổ chức `qvosfzztldzaxxodxzlx` plan/tier Free theo plugin. 4 migrations đã apply; private bucket, RLS, audit, optimistic save/reorder và quota RPC |
| Auth / CMS | Source login/CRUD/status/upload/thumbnail/nháp/sort/soft-delete/restore/export. Auth users=0, admin_profiles=0; chưa tạo credential, chưa cấp admin, chưa xác minh/tắt server signup. E2E admin thật BLOCKED |
| QA | 7 unit PASS; check/build PASS; SQL transaction role regression PASS; anon REST write/RPC/upload denied PASS. Chrome public UI + 5 iframe viewport PASS, editor fixture nháp/PDF/XSS/lỗi quyền PASS. Xem QA_REPORT |
| Security | Security Advisor: 0 lint. Performance: còn INFO unused sections_board_order trên dữ liệu mới; không có WARN multiple policies sau migration cuối. Non-admin/admin JWT thật và file runtime access chưa test |
| Sync | Refresh sau ghi/active/manual, không polling hoặc Realtime. Chưa test hai context với admin thật |
| Quota / chi phí | DB physical estimate ~11,55 MB, Storage runtime 0 byte; egress UNKNOWN. App cảnh báo 70%/critical 90%, chặn upload từ Storage 90% và khi không đọc được usage. Không kích hoạt gói trả phí/add-on/CI/hosting; chưa xác minh phí hosting Sites |
| Sites / main | Chỉ preview nội bộ bằng Sites supervisor; không tạo Site, hosting manifest, version/deployment/public URL, không đổi audience hoặc merge main |
| Wireframe | Bám mô tả R05, có ảnh UI trong docs/qa; chưa có ảnh wireframe quản trị gốc để đối chiếu hoặc visual acceptance |

## Bước tiếp theo

Chủ tài khoản làm [ADMIN_SETUP](ADMIN_SETUP.md): tạo một Auth user và tắt signup; cấp admin theo UID. Sau đó test login/logout/CMS/upload/private file/signed expiry/thumbnail/sync với phiên thật, cập nhật QA và sửa lỗi tái hiện. Không yêu cầu password/OTP/token qua chat.

Gate chưa xong: real admin/non-admin JWT, upload/partial failure và file revoke thực, offline/session expiry, Safari/iPhone/Android thật, full backup/restore, xác minh hosting 0 USD và audience. Không báo hoàn thành sản phẩm hoặc public deployment khi thiếu gate này. [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) map Phase 0–6; [QA_REPORT](QA_REPORT.md) giữ chi tiết test thay vì nối log tại đây.
