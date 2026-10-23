# Dữ liệu, migration và backup

Nguồn đầy đủ: SPEC R09, R11–13, R21–22. **Đã apply 4 migrations vào project dashboard/vgciiqtwmxcdqppntgnt.** Không apply lại; kiểm tra history trước thay đổi tiếp.

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
- save_post nhận post + attachment metadata + expected_version; transaction nguyên tử, UPDATE tăng version; stale save trả 40001. Upload bytes diễn ra trước, không giả Storage và DB là một transaction.
- reorder_posts khóa các bài trong cột theo ID, kiểm danh sách/phiên bản đầy đủ, cập nhật rank trong một transaction. app_usage chỉ admin, đo bucket storage metadata và database physical estimate; egress null.
- Tên migration ban đầu được CLI migration new sinh; sau apply MCP đã đối chiếu/đổi prefix theo **version thực trả từ schema_migrations** để không push lại cùng migration. File SQL khớp payload đã apply: 20261023150359_initial_board, 20261023151152_quota_observability, 20261023151459_atomic_post_reorder, 20261023152049_split_write_policies.
- seed.sql có stable IDs và ON CONFLICT DO NOTHING, không ghi đè bài đã chỉnh khi chạy lại. access.sql tạo user/rows test trong transaction rồi ROLLBACK, không giữ credential/tài khoản thử.
