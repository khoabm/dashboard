# Dữ liệu, migration và backup

Nguồn đầy đủ: SPEC R09, R11–13, R21–22. **CP01-C 2026-10-28: đã đối chiếu ledger native PostgreSQL17.11; 5 migration Board giữ nguyên, 4 migration Gradebook đã apply theo mapping bên dưới.** Không apply lại; xem rollout gate bên dưới.

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

## Personal Gradebook — applied CP01-C / 2026-10-28

Six private-schema tables, ordered catalogs, RLS with no browser policies, restricted session helper and22 service-only invoker RPCs are now applied. B2/B3 review documents retain historical offline evidence; the current ledger mapping and native acceptance limits are below. No real student data is authorized. Board/Auth/Storage schema, policies and function definitions were preserved.

## Cảnh báo tái diễn GB-OPS-001 — SQLSTATE retryable cho xung đột nghiệp vụ

**Áp dụng cho mọi Board RPC, Gradebook RPC, Edge Function và API dùng PostgREST về sau.** Sự cố 2026-10-26: một RPC Board tự phát sinh SQLSTATE 40001 (serialization_failure) để báo stale-version, khiến PostgREST 14 retry transaction ở phía server. **Một request HTTP cũng có thể gây rất nhiều lần thực thi/lỗi PostgreSQL** dù frontend không retry. [Supabase KB về infinite transaction retries](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions). Lỗi cùng loại sẽ tái diễn nếu cách dùng này được sao chép ở RPC mới.

- **Cấm tự phát sinh mã 40001 hay SQLSTATE class 40 retryable cho xung đột nghiệp vụ dự kiến** như stale revision, optimistic conflict, preview mismatch hoặc record đã thay đổi. Dùng lỗi non-retryable phù hợp (ví dụ PT409 cho HTTP conflict). Không chuyển lỗi serialization thực do engine phát sinh thành PT409; giữ rollback/transaction atomicity.
- Review mã lỗi ở **effective function definitions sau chuỗi migration đầy đủ**, không kết luận từ định nghĩa lịch sử trước hotfix/correction. Board hotfix phiên bản 20261026034549 và Gradebook correction (reviewed draft20261026050000 → applied20261027173313) là bản sửa đã kiểm tra trên hosted PostgreSQL17.11.
- Ở Edge/SDK/frontend: kiểm tra retry semantics của cả client **và PostgREST server**, cấm vòng retry không giới hạn hoặc tự gửi lại mutation bị từ chối. Với 409, 429, 503, timeout, SQLSTATE bất thường hoặc traffic/error tăng mạnh: **STOP**, không tự retry để tái hiện; xử lý qua source/log hiện có và xin phép riêng nếu phải can thiệp hosted.
- Việc đóng request hoặc timeout ở client **không bảo đảm backend đang lặp đã dừng**; không tự terminate backend/restart project. Không stress/load/soak/stretch test để chứng minh cơ chế này. Tuân thủ [TESTING](TESTING.md#chính-sách-kiểm-thử-tiết-kiệm-quota--bắt-buộc).

**Giới hạn bằng chứng:** Board hotfix được ghi là APPLIED và đã kiểm tra metadata trong log trước đó. Ba lượt thử smoke test HTTP qua Work đều BLOCKED **trước khi đăng nhập/gửi RPC, 0 requests kiểm thử**, vì thiếu đường truyền phiên quản trị an toàn; HTTP409/PT409 runtime và không-retry nội bộ vẫn NOT RUN/INCONCLUSIVE. Không chạy lại workflow bị chặn chỉ để lấy PASS. B3 correction trước đây được chấp nhận qua static/offline review (13 nhóm PGlite/4 DOM test báo PASS); CP01-C hiện đã apply chuỗi Gradebook và kiểm tra9/9 effective function-body hashes, không còn application40001. Có thể triển khai code CP01-B4 **offline**; hosted runtime/security vẫn cần gate riêng trước khi mở traffic.
## Gradebook migration rollout gate — GB-OPS-REV-002

Current ledger was read before and after the authorized CP01-C rollout. The five applied Board entries (20261023150359,20261023151152,20261023151459,20261023152049,20261026034549) were neither replayed nor edited.

| Reviewed unapplied draft | Actual MCP version / current filename | Status |
| --- | --- | --- |
| 20261026014933_gradebook_foundation.sql | `20261027173228_gradebook_foundation.sql` | APPLIED |
| 20261026030000_gradebook_transactions.sql | `20261027173300_gradebook_transactions.sql` | APPLIED |
| 20261026050000_gradebook_nonretryable_conflicts.sql | `20261027173313_gradebook_nonretryable_conflicts.sql` | APPLIED |
| 20261026060000_gradebook_reveal_identity_context.sql | `20261027173327_gradebook_reveal_identity_context.sql` | APPLIED |

### CP01-C rollout inspection — 2026-10-28

Owner explicitly approved mapping only these four previously unapplied drafts to MCP-assigned timestamps, because apply_migration has no version argument. This is the narrow authorized exception to the earlier no-renumbering gate, not ledger repair. SQL payloads were immutable reviewed LF Git blobs from a8f055e; all four file contents/guards are byte-identical, only filenames/references changed. `.gitattributes` pins migration SQL to text/eol=lf. Do not edit these now-applied bodies or replay original draft versions.

Project is ACTIVE_HEALTHY / Free, native PostgreSQL17.11. Pre/post Board table/RLS/ACL/policy/function fingerprint is unchanged (`bcb4aae925f542e1f8a4bcc6f9b5d33d42013dba05e2a1389c3f68d27c04126c`). All6 Gradebook tables retain RLS, anon/authenticated have no schema/table privileges or RPC EXECUTE,22 public RPCs remain invoker/service-only,9/9 correction body hashes match and no effective application40001 exists. Catalog seed contains8/7 entries. REST anon schema/RPC denial passed once each (406/PGRST106,401/42501).

Two bounded native transactions passed and were rolled back: role SELECT/RPC denial, exact NUMERIC round-trips (including8.12345/8.24/8.25/8.26/0/10), invalid-scale/range/FK rejection; then actual roster/score preview→apply, optional-name NULL, stale absence/raw-value PT409, invalid mixed-batch zero mutations/audit, semester independence/unpublish denial and aggregate-only101 buckets. SQL used existing actor/session identifiers only inside server variables; no Auth rows or Board records were changed. This is native single-transaction evidence, not multi-connection race, gateway JWT or full backup/restore acceptance. Synthetic browser fixtures remain separate from rolled-back DB fixtures; current results/limits are in [CP06 readiness](features/personal-gradebook/CP06_OFFLINE_READINESS.md#cp01-c--bounded-hosted-acceptance--2026-10-28).

For any future rollout, the following safety rules still apply:

A **separately authorized deployment task** must:

1. Obtain authorization and a fixed budget for a read of the intended hosted ledger; reconcile exact versions and current dependencies with the repository. This document alone grants no live-read authority; the current CP01-C task was separately approved.
2. Review the exact pending set and the deployment tool's handling of older missing versions. Do not assume a generic pending-file workflow can safely skip Gradebook or silently handle out-of-order versions.
3. Approve the exact dependency order **B2 → B3 → PT409 correction → reveal correction** (use the actual mapped versions above). The board hotfix is already recorded applied and must not be replayed as a substitute for reconciliation. Use only a reviewed tool/procedure that selects that approved set/order; if it cannot, stop for a rollout decision.
4. Keep Gradebook Edge endpoints unavailable and privileged runtime workers from invoking Gradebook RPCs throughout rollout. Original B3 temporarily defines custom40001; no client/runtime traffic may exercise it before correction succeeds. Validate final definitions/ACL and complete separately authorized security gates before enabling traffic.
5. Treat a failed correction/definition hash check as a closed gate: preserve access denial and investigate; never run client tests or retry migration blindly. Hashes bind reviewed LF source bodies; unexpected source/EOL differences require review, not weakening the guard.

**No uncontrolled `db push`, `db reset`, `migration repair` or `apply_migration`.** Each requires an explicitly authorized deployment procedure; the current CP01-C MCP rollout used only the approved bounded set; never reset production or mark drafts applied merely to make the timestamps continuous. No ledger repair is currently justified by recorded evidence. Current CP01-C evidence above supersedes the former NOT RUN rollout snapshot; remaining security cases are not implied PASS.

The reveal correction targets only `public.gb_student_read(uuid,uuid,uuid,bigint,boolean)`, adding stored identity context to the server-only reveal branch. Its audit is an authorized DB request, not proof of Edge decryption/display; ordinary DTOs stay unchanged. [GB-B4-INT-001 evidence](features/personal-gradebook/B4_INTEGRATION_REVIEW.md): seven focused disposable SQL groups PASS; B4 crypto/hosted security NOT RUN. That historical correction review applied no migration; CP01-C later applied the exact reviewed SQL as recorded above.
