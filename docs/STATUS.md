
## Planned feature — Bảng điểm cá nhân (chưa triển khai)

Branch tài liệu `feature/personal-gradebook` tạo từ `develop` `af43f51` sau khi PR #3 được merge. Tài liệu Codex: [entry](features/personal-gradebook/README.md), [yêu cầu](features/personal-gradebook/BRIEF.md), [schema/bảo mật](features/personal-gradebook/DATA_AND_SECURITY.md), [CP00–CP07](features/personal-gradebook/CHECKPOINTS.md). Trạng thái: tài liệu đã tạo; **toàn bộ checkpoint implementation NOT STARTED; không có source, migration, Edge Function, dữ liệu thực, test feature hoặc deployment được tạo từ branch này**. Dùng bằng chứng trên ref thực tế khi bắt đầu; phần STATUS phía dưới là nhật ký baseline của project học liệu và có thể đã cũ sau merge PR #3.

# Trạng thái hiện tại

Cập nhật 2026-10-25. Repo `khoabm/dashboard`, branch `enhancement/acceptance-refinements` từ `develop` tại `ad8c78c`; baseline lượt AUD-017 là `ff8c567`. Develop đã chứa các sửa AUD-001–014; branch này dành cho các hạng mục hoàn thiện nghiệm thu. **Đã có implementation, chưa đạt Definition of Done.**

| Thành phần | Bằng chứng hiện tại |
| --- | --- |
| Frontend | AUD-017: giữ UI hiện tại, thêm native scrollbar phía trên + trái/phải sticky khi tất cả chủ đề overflow; không có “Đi đến”. Giữ anchor qua refresh, reveal/focus cột mới sau snapshot xác nhận. Mobile giữ một cột/bộ chọn cũ. Stack/dependency không đổi; build static PASS |
| CI / Code style (2026-10-24) | Prettier 3.6.2 đã format toàn bộ 28 file thực thi/test tại `4058de8`; bước debug-check AST, unit, syntax, build và format-check hoàn tất trước commit của GitHub runner. CI chính kiểm tra toàn bộ code, không còn baseline. PR #1 tại `20772f1` đã fail format; upstream `e5605d8` sửa hai dòng trắng thừa và CI PR #1 tại upstream đã PASS (run `40054261324`). CI baseline 306958f PASS (run 40064785504). Bản hoàn thiện pulse có 30 unit; kiểm Checks của PR nhánh hiện tại tại đúng HEAD, không suy PASS từ SHA cũ. CI không gọi API/Supabase |
| Comment coverage (2026-10-24) | Đã áp dụng [COMMENTING_GUIDELINES](COMMENTING_GUIDELINES.md) cho các module thực thi, bổ sung quy tắc DOM container/cha–con/render lifecycle và callback side effect cùng good/bad case. Source được chú thích theo vai trò vùng UI (board shell, bộ lọc, board/admin regions, card, dialog/editor/media). Các sửa logic audit được ghi riêng trong [BUG_FIX_LOG](BUG_FIX_LOG.md), áp dụng cùng quy ước format/comment |
| Supabase | `dashboard` / `vgciiqtwmxcdqppntgnt`, PostgreSQL 17.11; tổ chức `qvosfzztldzaxxodxzlx` plan/tier Free theo plugin. 4 migrations đã apply; private bucket, RLS, audit, optimistic save/reorder và quota RPC |
| Auth / CMS | AUD-016: SDK giữ phiên trong sessionStorage theo tab; bootstrap xác minh Auth user + active admin profile trước khi bật quản trị; lỗi giữ UI khóa/retry, generation chặn kết quả sau SIGNED_OUT. 35 unit PASS; QA-A18 dùng SDK/storage thật + transport giả, 0 Supabase live. SQL cũ xác nhận một active admin; server signup/anonymous và E2E Auth/JWT thật vẫn chưa nghiệm thu |
| QA | 38 unit/check/build PASS khi chạy lại 2026-10-25. QA-A19 PASS các yêu cầu điều hướng đã chốt bằng IAB và iframe360/390/768/1024/1440, Auth/transport mock. Test/fixture frontend ở tests/; ảnh/check logs/scratch ở tests/local/ đã ignore. Các bằng chứng AUD-001–016 giữ tại [QA_REPORT](QA_REPORT.md); không suy mock thành JWT/Storage/thiết bị thật |
| Security | Security Advisor: 0 lint. Performance: còn INFO unused sections_board_order trên dữ liệu mới; không có WARN multiple policies sau migration cuối. Non-admin/admin JWT thật và file runtime access chưa test |
| Sync | Refresh sau ghi/active/manual, không polling hoặc Realtime. Chưa test hai context với admin thật |
| Quota / chi phí | Snapshot 2026-10-23: DB physical estimate ~11,55 MB, Storage runtime 0 byte; chưa đo lại usage, egress UNKNOWN. App cảnh báo 70%/critical 90%, chặn upload từ Storage 90% và khi không đọc được usage. Lượt sửa không bật dịch vụ trả phí/add-on/hosting. Lượt AUD-015 chỉ debug offline, 0 request Auth/REST/Storage tới Supabase thật. Lịch sử lượt audit trước: 1 batch SQL rollback thành công, 1 lần lỗi connector hết hạn không có kết quả SQL. Chưa xác minh phí hosting Sites |
| Sites / main | Chỉ preview nội bộ bằng Sites supervisor; không tạo Site, hosting manifest, version/deployment/public URL, không đổi audience hoặc merge main |
| Wireframe | Bám mô tả R05, có ảnh UI trong docs/qa; chưa có ảnh wireframe quản trị gốc để đối chiếu hoặc visual acceptance |

## Bước tiếp theo

AUD-019 (baseline `34b2ff0`): sửa hai assertion message cũ bằng bất biến nháp/cleanup tại `bd6acb1`, format riêng 5 file upstream tại `c1230c3`. 41/41 unit/check/build/format PASS local; Offline CI run `40152051421` PASS tại `c1230c3`, gồm đủ unit/build/format. Working tree sạch sau khôi phục EOL checkout; chưa merge/đổi Draft/deploy. Commit cập nhật docs sau đó cần kiểm CI riêng theo HEAD. Xem BUG_FIX_LOG.

AUD-018 (2026-10-25, baseline `6bf2069`): bổ sung regression/fixture còn thiếu vào Git, giữ tests/local được ignore. Build production có gate chặn test module và kiểm allowlist dist; 38 unit/check/build cùng hai negative checks PASS. Chỉ deploy dist; URL test production NOT RUN, chưa deploy. Chi tiết BUG_FIX_LOG và DEPLOYMENT.

Lượt AUD-017 tiếp tục trên cùng branch, baseline `ff8c567`, giữ phạm vi thiết kế đã được chấp nhận. Gate Prettier nguyên bản FAIL ở 27 file không sửa, đã xác nhận chỉ khác CRLF checkout so với blob LF tại HEAD; kiểm tra EOL auto toàn code PASS. Chi tiết QA-A19. Không format toàn repo, không thay dependency/schema/policy/Auth server hoặc deploy. Ảnh Auth QA-A18 đã chuyển từ docs/qa sang tests/local/artifacts theo yêu cầu gom output local, không đưa lên Git.

Admin đã tồn tại. Đối chiếu [ADMIN_SETUP](ADMIN_SETUP.md) để xác minh server signup/anonymous sign-ins đang tắt; không tạo thêm admin. Tiếp tục nghiệm thu login/logout/CMS/upload/private file/signed expiry/thumbnail/sync với phiên thật trong một lượt có mục tiêu. Không yêu cầu password/OTP/token qua chat.

Gate chưa xong: native filechooser/OS (QA-A10 File API đã PASS); real admin/non-admin JWT, upload/partial failure và file revoke thực, offline/session expiry, Safari/iPhone/Android thật, full backup/restore, xác minh hosting 0 USD và audience. Không báo hoàn thành sản phẩm hoặc public deployment khi thiếu gate này. [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) map Phase 0–6; [QA_REPORT](QA_REPORT.md) giữ chi tiết test thay vì nối log tại đây.
