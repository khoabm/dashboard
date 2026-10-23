# Dữ liệu, migration và backup

Nguồn đầy đủ: SPEC R09, R11–13, R21–22. **Chưa có database/migration thực tế.** Không chạy SQL hoặc chọn project chỉ vì đang đọc tài liệu này.

## Thiết kế cần giữ

Sáu bảng và mọi trường đề xuất giữ tại SPEC R09: boards → sections → posts → attachments; admin_profiles chỉ định admin active; audit_logs ghi tác nhân/hành động/đích/thời gian. Không lược bỏ version, deleted_at hoặc metadata file. PK/FK/index và constraints được thiết kế cùng truy vấn/policies; không lạm dụng JSONB.

State bài: draft/published/hidden/deleted; khách chỉ đọc published, kể cả attachment và file liên quan. Schema có thể tinh chỉnh nhưng phải giữ ý nghĩa và ghi quyết định. Admin profile không được tự cấp/sửa quyền từ client; audit log không được để client giả danh actor hay sửa lịch sử. Xử lý xóa cột có bài và hạn khôi phục là điểm cần chốt, không tự đặt cascade destructive.

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

Hiện chưa có lệnh backup/restore được kiểm chứng; ghi NOT RUN trong bàn giao, không điền lệnh giả cho đủ tài liệu.
