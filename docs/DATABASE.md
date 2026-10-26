# Dữ liệu, migration và backup

Nguồn đầy đủ: SPEC R09, R11–13, R21–22. **Bằng chứng hosted đã ghi nhận: 4 migration board gốc + hotfix `20261026034549`; chưa kiểm tra live lại trong lượt này.** Không apply lại; xem rollout gate bên dưới.

## Thiết kế cần giữ

Sáu bảng và mọi trường đề xuất giữ tại SPEC R09: boards → sections → posts → attachments; admin_profiles chỉ định admin active; audit_logs ghi tác nhân/hành động/đích/thời gian. Không lược bỏ version, deleted_at hoặc metadata file. PK/FK/index và constraints được thiết kế cùng truy vấn/policies; không lạm dụng JSONB.

State bài: draft/published/hidden/deleted; khách chỉ đọc published, kể cả attachment và file liên quan. Schema có thể tinh chỉnh nhưng phải giữ ý nghĩa và ghi quyết định. Admin profile không được tự cấp/sửa quyền từ client; audit log không được để client giả danh actor hay sửa lịch sử. Implementation mặc định chặn xóa cột có bài bằng FK restrict, khôi phục deleted về draft trong 30 ngày, không tự purge.

## Quy trình thay đổi

1. Chọn project đúng, xác minh Free Plan/quyền; đọc skill Supabase hiện hành, changelog và docs liên quan.

2. Đọc schema/migration hiện tại; xác định baseline và dữ liệu có sẵn. DDL/grants/RLS/storage policies phải tái tạo được qua migration version control.

3. Chọn thao tác MCP/CLI theo skill và khả năng môi trường thật; không đoán tên lệnh/ID. Nếu dùng CLI, xem --help trước; không tạo migration filename theo trí nhớ. Không thử schema trực tiếp trên production có dữ liệu như môi trường dùng một lần.

4. Review constraint, grant, RLS và quan hệ; chạy query/policy tests/advisors phù hợp rồi mới xác nhận kết quả. Lưu migration cuối cùng tương ứng schema đã kiểm chứng; không đánh dấu applied khi chỉ có file SQL.

5. Seed đúng một bảng, ba cột, sáu bài có nhãn placeholder và chạy lại không trùng. Không crawl Padlet hoặc tự tạo học liệu trông như chính thức.

## Backup/restore phải hoàn thiện trước Done

- Metadata export từ ứng dụng; hướng dẫn export PostgreSQL bằng công cụ miễn phí và snapshot migrations/version cần để phục hồi.

- Backup file Storage riêng, giữ mapping storage_path và metadata, kiểm tra số lượng/kích thước để phát hiện thiếu file. Không giả định DB backup bao gồm bytes Storage.

- Không ghi credential/backup dữ liệu nhạy cảm vào repo public hoặc ZIP source. Chọn nơi lưu backup do chủ tài khoản kiểm soát.

- Kiểm thử restore trong đích thử an toàn, kiểm tra quan hệ, số bài/file, trạng thái draft/public và RLS/Storage policies; không ghi đè production để thử.

- Tài liệu nêu rõ thời điểm snapshot, dữ liệu có thể mất từ lần backup gần nhất, giới hạn quota khi backup/restore. Không giả định automatic backup trả phí hoặc thêm automation nếu chưa đo được quota.

Hướng dẫn hiện tại: [ADMIN_SETUP](ADMIN_SETUP.md), [BACKUP](BACKUP.md). Chưa kiểm thử full backup/restore; ghi NOT RUN, không dùng SQL rollback làm bằng chứng restore.

## Schema/RPC hiện tại

- 6 bảng đúng R09, thêm posts.thumbnail_id và placeholder_kind (placeholder trình bày local đến khi admin chỉnh bài). Không đặt học liệu thực tế vào source; 6 fixture có nhãn rõ và có thể sửa/xóa qua CMS khi admin được tạo.
- PK/FK restrict, index query/order, check trạng thái/deleted_at, độ dài/title/color/URL, <2 MB và tối đa 10 attachment bằng trigger khóa parent. Unique một admin active, không tự bootstrap user.
- save_post nhận post + attachment metadata + expected_version; transaction nguyên tử, UPDATE tăng version; stale save hiện trả PT409 / HTTP409 sau hotfix; 40001 trong migration gốc là lịch sử. Upload bytes diễn ra trước, không giả Storage và DB là một transaction.
- reorder_posts khóa các bài trong cột theo ID, kiểm danh sách/phiên bản đầy đủ, cập nhật rank trong một transaction. app_usage chỉ admin, đo bucket storage metadata và database physical estimate; egress null.
- Tên migration ban đầu được CLI migration new sinh; sau apply MCP đã đối chiếu/đổi prefix theo **version thực trả từ schema_migrations** để không push lại cùng migration. File SQL khớp payload đã apply: 20261023150359_initial_board, 20261023151152_quota_observability, 20261023151459_atomic_post_reorder, 20261023152049_split_write_policies.
- seed.sql có stable IDs và ON CONFLICT DO NOTHING, không ghi đè bài đã chỉnh khi chạy lại. access.sql tạo user/rows test trong transaction rồi ROLLBACK, không giữ credential/tài khoản thử.

## Personal Gradebook B2 — unapplied draft

`supabase/migrations/20261026014933_gradebook_foundation.sql` adds six non-exposed Gradebook tables plus catalog seed/RLS/ACL and one restricted boolean session helper. **Not applied to Supabase; recorded hosted baseline is four board migrations plus the board hotfix20261026034549.** No class/student/auth data is seeded. [B2 review](features/personal-gradebook/B2_MIGRATION_REVIEW.md) records constraints vs future RPC/Edge guarantees, native17/hosted gates and safe pre/post/rollback planning; do not automatically apply all pending files. Existing board migrations/policies/functions are unchanged.

## CP01-B3 — transaction draft (2026-10-26)

B2 accepted baseline `d86627f`. New `20261026030000_gradebook_transactions.sql` adds 22 service-only invoker RPCs, private validation/planner/framing helpers, shared import preview/apply/state hash, class-scoped audit and atomic limiter. Five prior migrations unchanged, no tables added. [B3 inventory, DTO signatures, evidence and limits](features/personal-gradebook/B3_TRANSACTION_REVIEW.md). B3 READY FOR REVIEW; B4/B5 NOT STARTED, CP01-C and real-data gate NOT RUN. 14 B3/18 B2 disposable SQL groups and81 app tests PASS; native17, multi-connection locks, hosted API/security and browser NOT RUN. Draft not applied. Earlier B3 NOT STARTED entries are historical.

## Cảnh báo tái diễn GB-OPS-001 — SQLSTATE retryable cho xung đột nghiệp vụ

**Áp dụng cho mọi Board RPC, Gradebook RPC, Edge Function và API dùng PostgREST về sau.** Sự cố 2026-10-26: một RPC Board tự phát sinh SQLSTATE 40001 (serialization_failure) để báo stale-version, khiến PostgREST 14 retry transaction ở phía server. **Một request HTTP cũng có thể gây rất nhiều lần thực thi/lỗi PostgreSQL** dù frontend không retry. [Supabase KB về infinite transaction retries](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions). Lỗi cùng loại sẽ tái diễn nếu cách dùng này được sao chép ở RPC mới.

- **Cấm tự phát sinh mã 40001 hay SQLSTATE class 40 retryable cho xung đột nghiệp vụ dự kiến** như stale revision, optimistic conflict, preview mismatch hoặc record đã thay đổi. Dùng lỗi non-retryable phù hợp (ví dụ PT409 cho HTTP conflict). Không chuyển lỗi serialization thực do engine phát sinh thành PT409; giữ rollback/transaction atomicity.
- Review mã lỗi ở **effective function definitions sau chuỗi migration đầy đủ**, không kết luận từ định nghĩa lịch sử trước hotfix/correction. Board hotfix phiên bản 20261026034549 và Gradebook correction 20261026050000 là các bản sửa đã được review ở source; Gradebook vẫn chưa apply hosted.
- Ở Edge/SDK/frontend: kiểm tra retry semantics của cả client **và PostgREST server**, cấm vòng retry không giới hạn hoặc tự gửi lại mutation bị từ chối. Với 409, 429, 503, timeout, SQLSTATE bất thường hoặc traffic/error tăng mạnh: **STOP**, không tự retry để tái hiện; xử lý qua source/log hiện có và xin phép riêng nếu phải can thiệp hosted.
- Việc đóng request hoặc timeout ở client **không bảo đảm backend đang lặp đã dừng**; không tự terminate backend/restart project. Không stress/load/soak/stretch test để chứng minh cơ chế này. Tuân thủ [TESTING](TESTING.md#chính-sách-kiểm-thử-tiết-kiệm-quota--bắt-buộc).

**Giới hạn bằng chứng:** Board hotfix được ghi là APPLIED và đã kiểm tra metadata trong log trước đó. Ba lượt thử smoke test HTTP qua Work đều BLOCKED **trước khi đăng nhập/gửi RPC, 0 requests kiểm thử**, vì thiếu đường truyền phiên quản trị an toàn; HTTP409/PT409 runtime và không-retry nội bộ vẫn NOT RUN/INCONCLUSIVE. Không chạy lại workflow bị chặn chỉ để lấy PASS. B3 correction được chấp nhận qua static/offline review (13 nhóm PGlite/4 DOM test báo PASS), nhưng B2/B3/correction đều NOT APPLIED. Có thể triển khai code CP01-B4 **offline**; hosted runtime/security vẫn cần gate riêng trước khi mở traffic.
## Gradebook migration rollout gate — GB-OPS-REV-002

Inventory below is based on recorded evidence, not a new hosted query:

| Version / file suffix | Recorded status |
| --- | --- |
| 20261023150359_initial_board | Applied |
| 20261023151152_quota_observability | Applied |
| 20261023151459_atomic_post_reorder | Applied |
| 20261023152049_split_write_policies | Applied |
| 20261026014933_gradebook_foundation | B2 draft / NOT APPLIED |
| 20261026030000_gradebook_transactions | B3 draft / NOT APPLIED |
| 20261026034549_stop_business_conflict_retries | Board hotfix applied per GB-OPS-001 |
| 20261026050000_gradebook_nonretryable_conflicts | Corrective draft / NOT APPLIED |

The board hotfix was applied while the earlier Gradebook versions remained drafts. Matching filenames/versions are already reconciled; this gap alone does not justify ledger repair, fake applied entries, hotfix replay or timestamp renumbering.

A **separately authorized deployment task** must:

1. Obtain authorization and a fixed budget for a read of the intended hosted ledger; reconcile exact versions and current dependencies with the repository. No live read is authorized by this document or the correction task.
2. Review the exact pending set and the deployment tool's handling of older missing versions. Do not assume a generic pending-file workflow can safely skip Gradebook or silently handle out-of-order versions.
3. Approve the exact dependency order **B2 → B3 → 20261026050000 correction**. The board hotfix is already recorded applied and must not be replayed as a substitute for reconciliation. Use only a reviewed tool/procedure that selects that approved set/order; if it cannot, stop for a rollout decision.
4. Keep Gradebook Edge endpoints unavailable and privileged runtime workers from invoking Gradebook RPCs throughout rollout. Original B3 temporarily defines custom40001; no client/runtime traffic may exercise it before correction succeeds. Validate final definitions/ACL and complete separately authorized security gates before enabling traffic.
5. Treat a failed correction/definition hash check as a closed gate: preserve access denial and investigate; never run client tests or retry migration blindly. Hashes bind reviewed LF source bodies; unexpected source/EOL differences require review, not weakening the guard.

**No uncontrolled `db push`, `db reset`, `migration repair` or `apply_migration`.** Each is outside this correction task and requires a separate authorized deployment procedure; never reset production or mark drafts applied merely to make the timestamps continuous. No ledger repair is currently justified by recorded evidence. Real hosted reconciliation/security checks remain NOT RUN — quota policy / pending approval.
