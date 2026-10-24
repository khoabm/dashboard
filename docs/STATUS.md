# Trạng thái hiện tại

Cập nhật 2026-10-24. Repo `khoabm/dashboard`, branch `enhancement/acceptance-refinements` từ `develop` tại `ad8c78c`. Develop đã chứa các sửa AUD-001–014; branch mới dành cho các hạng mục hoàn thiện nghiệm thu. Lấy HEAD branch được giao từ GitHub khi bắt đầu phiên mới. **Đã có implementation, chưa đạt Definition of Done.**

| Thành phần | Bằng chứng hiện tại |
| --- | --- |
| Frontend | HTML/CSS/Vanilla JS + Vite 8.3.5 / Supabase JS 2.118.0; npm lockfile; build dist thành công. 1 board/3 cột/6 bài placeholder đọc Supabase thật, search/modal/media/responsive |
| CI / Code style (2026-10-24) | Prettier 3.6.2 đã format toàn bộ 28 file thực thi/test tại `4058de8`; bước debug-check AST, unit, syntax, build và format-check hoàn tất trước commit của GitHub runner. CI chính kiểm tra toàn bộ code, không còn baseline. PR #1 tại `20772f1` đã fail format; upstream `e5605d8` sửa hai dòng trắng thừa và CI PR #1 tại upstream đã PASS (run `40054261324`). CI baseline 306958f PASS (run 40064785504). Bản hoàn thiện pulse có 30 unit; kiểm Checks của PR nhánh hiện tại tại đúng HEAD, không suy PASS từ SHA cũ. CI không gọi API/Supabase |
| Comment coverage (2026-10-24) | Đã áp dụng [COMMENTING_GUIDELINES](COMMENTING_GUIDELINES.md) cho các module thực thi, bổ sung quy tắc DOM container/cha–con/render lifecycle và callback side effect cùng good/bad case. Source được chú thích theo vai trò vùng UI (board shell, bộ lọc, board/admin regions, card, dialog/editor/media). Các sửa logic audit được ghi riêng trong [BUG_FIX_LOG](BUG_FIX_LOG.md), áp dụng cùng quy ước format/comment |
| Supabase | `dashboard` / `vgciiqtwmxcdqppntgnt`, PostgreSQL 17.11; tổ chức `qvosfzztldzaxxodxzlx` plan/tier Free theo plugin. 4 migrations đã apply; private bucket, RLS, audit, optimistic save/reorder và quota RPC |
| Auth / CMS | Source login/CRUD/status/upload/thumbnail/nháp/sort/soft-delete/restore/export. SQL 2026-10-24 xác nhận một active admin có email đã xác nhận; không ghi UID/email vào repo. Trạng thái server signup/anonymous chưa được xác minh bằng công cụ. E2E Auth thật chưa chạy lại trong lượt sửa này |
| QA | AUD-015: pulse cho pending operations, sticky heading, khóa gửi lặp + finally/reset. 30 unit PASS; QA-A16 Chrome kiểm CRUD/re-order/file pending/read/export/cleanup/quota/media/Auth UI và response muộn, viewport iframe 360–1440. File/IndexedDB thật, transport/Auth mock, 0 request Supabase live. Chi tiết [QA_REPORT](QA_REPORT.md); các fix AUD-001–014 được giữ, không suy thành JWT/Storage/thiết bị thật |
| Security | Security Advisor: 0 lint. Performance: còn INFO unused sections_board_order trên dữ liệu mới; không có WARN multiple policies sau migration cuối. Non-admin/admin JWT thật và file runtime access chưa test |
| Sync | Refresh sau ghi/active/manual, không polling hoặc Realtime. Chưa test hai context với admin thật |
| Quota / chi phí | Snapshot 2026-10-23: DB physical estimate ~11,55 MB, Storage runtime 0 byte; chưa đo lại usage, egress UNKNOWN. App cảnh báo 70%/critical 90%, chặn upload từ Storage 90% và khi không đọc được usage. Lượt sửa không bật dịch vụ trả phí/add-on/hosting. Lượt AUD-015 chỉ debug offline, 0 request Auth/REST/Storage tới Supabase thật. Lịch sử lượt audit trước: 1 batch SQL rollback thành công, 1 lần lỗi connector hết hạn không có kết quả SQL. Chưa xác minh phí hosting Sites |
| Sites / main | Chỉ preview nội bộ bằng Sites supervisor; không tạo Site, hosting manifest, version/deployment/public URL, không đổi audience hoặc merge main |
| Wireframe | Bám mô tả R05, có ảnh UI trong docs/qa; chưa có ảnh wireframe quản trị gốc để đối chiếu hoặc visual acceptance |

## Bước tiếp theo

Admin đã tồn tại. Đối chiếu [ADMIN_SETUP](ADMIN_SETUP.md) để xác minh server signup/anonymous sign-ins đang tắt; không tạo thêm admin. Tiếp tục nghiệm thu login/logout/CMS/upload/private file/signed expiry/thumbnail/sync với phiên thật trong một lượt có mục tiêu. Không yêu cầu password/OTP/token qua chat.

Gate chưa xong: native filechooser/OS (QA-A10 File API đã PASS); real admin/non-admin JWT, upload/partial failure và file revoke thực, offline/session expiry, Safari/iPhone/Android thật, full backup/restore, xác minh hosting 0 USD và audience. Không báo hoàn thành sản phẩm hoặc public deployment khi thiếu gate này. [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) map Phase 0–6; [QA_REPORT](QA_REPORT.md) giữ chi tiết test thay vì nối log tại đây.
