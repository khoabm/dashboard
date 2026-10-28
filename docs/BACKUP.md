# Sao lưu và khôi phục

Gradebook G07/G08: [assessment, proposed age/Drive/offline custody, disaster recovery runbook and evidence](features/personal-gradebook/G07_BACKUP_RECOVERY.md); [owner/institution approval checklist](features/personal-gradebook/G08_OWNER_AUTHORIZATION.md). Synthetic age offline checks PASS; new native restore/permission workflow awaits publication/run approval. Drive uploads and operational key custody are not approved; G08 remains BLOCKED. The Board procedure below remains separate from Gradebook encrypted key recovery and Storage-byte recovery.

Metadata và bytes Storage là hai phần riêng. Phiên bản hiện tại có nút **Xuất metadata** cho admin, trả JSON gồm boards/sections/posts/attachments/audit_logs và thời điểm snapshot. Không chứa password/token/admin credential; không bao gồm bytes file, cấu hình Auth hoặc tài khoản Auth. Không đưa bản sao nội dung thật vào repo public.

## Sao lưu miễn phí

- Export metadata trong giao diện admin, lưu ở nơi riêng do chủ tài khoản kiểm soát. Đây là snapshot để đối chiếu, không phải bản dump SQL đầy đủ.
- Dùng công cụ PostgreSQL `pg_dump`/`pg_restore` phù hợp phiên bản server (Postgres 17 hiện tại), hoặc Supabase CLI `db dump`. Xem `--help` của phiên bản đã cài, lấy chuỗi kết nối an toàn trong Dashboard. Không đặt password trên command line hoặc gửi qua chat; dùng prompt/password store của công cụ. Backup schemas ứng dụng, dữ liệu và grants/RLS/functions theo hướng dẫn chính thức; tài khoản Auth cần quy trình riêng của Supabase. Tài liệu: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- Backup file qua Storage Dashboard/công cụ được cấp quyền: giữ đầy đủ đường dẫn tương đối trong bucket `learning-resources`, tên gốc/MIME/size trong metadata; tải bytes thật, không sao lưu signed URL sẽ hết hạn. Object chưa có metadata có thể là orphan; đối chiếu danh sách riêng. Không xóa nguồn sau tải.
- Ghi thời điểm snapshot và đếm số dòng/file, kích thước/checksum. Trong lúc sao lưu tạm ngừng biên tập để tránh DB và file lệch nhau. Backup/download tiêu thụ egress; không chạy định kỳ dày.

## Restore an toàn

1. Chọn đích thử riêng được phép, xác minh còn Free quota trước khi tạo. Không ghi đè project đang dùng hoặc tự tạo project/branch trả phí.
2. Tạo schema từ migrations đúng phiên bản; phục hồi dữ liệu theo quan hệ boards → sections → posts → attachments. Không chạy seed lên dữ liệu thật nếu không cần placeholder. Với dump đầy đủ, tránh apply schema hai lần; chọn một chiến lược phù hợp công cụ.
3. Tạo tài khoản Auth quản trị an toàn trên đích, map UID đúng trong admin_profiles; không giả rằng User UID cũ có hiệu lực trên project mới. Upload bytes Storage đúng path và MIME; áp lại bucket private và policies. Không INSERT bytes qua SQL/storage.objects metadata.
4. Đối chiếu số lượng/dung lượng/checksum, trạng thái draft/hidden/deleted/published, thumbnail và liên kết; thử mở file dưới admin/anon. Chạy security regression phù hợp đích thử. Test SQL `access.sql` hiện tham chiếu bộ seed mặc định, phải điều chỉnh fixtures nếu khôi phục dữ liệu khác.
5. Chỉ chuyển cấu hình frontend sau khi test đọc/ghi/ẩn danh đã đạt. Giữ bản sao cũ cho đến khi đối chiếu hoàn tất.

**Chưa test restore đầy đủ:** chưa có Auth admin hoặc file runtime thật; không tạo thêm hạ tầng chỉ để ghi PASS. Transaction rollback trong access.sql đã xác nhận dữ liệu fixture không tồn tại sau test, nhưng không được tính là backup/restore sản phẩm.

Có thể mất thay đổi từ snapshot cuối và file chưa sao lưu; Free không có SLA/automatic backup được giả định. Không bảo đảm phục hồi nếu thiếu một trong DB, Auth mapping hoặc bytes Storage.
