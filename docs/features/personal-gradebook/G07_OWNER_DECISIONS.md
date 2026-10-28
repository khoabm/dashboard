# G07 — Chính sách thủ công đã chốt và việc owner cần làm

28/10/2026. Thay thế đề xuất USB, daily/24h RPO, nhiều thế hệ lưu và emergency custodian ở snapshot83a0322. **G07 Technical PASS; Operational PARTIAL/BLOCKED — chưa xác minh custody/Drive và chưa có production exporter/authorization. Overall PARTIAL. G08 BLOCKED.**

## A–F đã được owner quyết định — không hỏi lại

| Mục | Quyết định đã chốt | Rủi ro/giới hạn |
| --- | --- | --- |
| A — Primary | Google Drive Free, account cá nhân owner, private restricted folder, không mua Google One | Institution/provider approval cho dữ liệu thật thuộc G08; một account có thể mất quyền hoặc hết dung lượng |
| B — Secondary | Không USB/external backup drive, không đích DB thứ hai | Owner chấp nhận giảm redundancy; DPAPI local tùy chọn, không được là recovery mechanism duy nhất |
| C — Custody | Owner duy nhất, không emergency custodian; hai age identities độc lập và phải recover ngoài Windows/Google dependency | Mất cả giấy/credential hoặc owner không tiếp cận được thì không có người khác thay thế. Không Work-generated production identities |
| D — Schedule | Manual-only; khuyến nghị sau import/cập nhật lớn, publish học kỳ và trước maintenance | Không cron/auto-export/scheduled Actions; mất thay đổi kể từ backup verified cuối được chấp nhận; không RPO/RTO bảo đảm |
| E — Retention | Latest verified + một previous verified, mỗi bộ có matched DB/key export; trong actual quota | Candidate không thay bộ verified; không auto-delete bộ cuối recoverable; legal retention/deletion thuộc G08 |
| F — Authority | Database owner là operator dự kiến; restore isolated được phép trước; production overwrite/cutover cần authorization riêng | Same-cluster proof không bao hàm managed Supabase/roles/Auth/Storage/Edge hoặc project-AAD migration |

## Chỉ còn hành động cụ thể — không phải hỏi lại lựa chọn kiến trúc

1. **Owner account/folder/quota:** tự tạo restricted folder, kiểm dung lượng thực và recovery Google account, ghi account/folder ID riêng. Nếu muốn Work làm synthetic round-trip: chỉ định đích và đúng2 file ciphertext synthetic cùng hashes/size; cấp scope transfer hữu hạn như guide. Hiện chưa cấp, NOT RUN. Không gửi passwords hoặc account recovery codes.
2. **Owner paper custody:** tự tạo hai production identities sau khi chuẩn bị môi trường, chép giấy riêng ngoài máy; test trước bằng identities/payload synthetic và nhập lại từ giấy trên staging mới. Ghi kết quả không chứa khóa; hủy test keys, không dùng chúng cho production. Work không sinh/nhận/store/upload production identities. Thao tác vật lý và mất máy thực: NOT RUN.
3. **Institution và tooling thật:** hoàn tất G08 về quyền xử lý trẻ em/CCCD/DOB, provider/cross-border, retention/rights; phê duyệt scope exporter/validator production, kết nối/egress và provisioning secrets. Công cụ hiện tại synthetic-only, production workflow còn BLOCKED.
4. **Authorized isolated rehearsal:** sau các điều kiện trên, owner chỉ định đích riêng, role/AAD mapping, verifier và ghi measured loss/recovery duration. Cutover production/overwrite phải có quyết định riêng, không suy từ hướng dẫn.

Hai hướng dẫn [backup](G07_MANUAL_BACKUP_GUIDE.md) và [restore](G07_MANUAL_RESTORE_GUIDE.md) có từng bước Windows và ranh giới synthetic/production. Không có lịch tự động hoặc truyền Drive nào được tạo. [G08](G08_OWNER_AUTHORIZATION.md) vẫn là hồ sơ review BLOCKED; approved policy không tự thiết lập legal/institutional authorization.
