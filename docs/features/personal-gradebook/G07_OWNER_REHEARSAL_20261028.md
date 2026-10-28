# G07 — Owner synthetic acceptance report / 2026-10-28

**Nguồn:** báo cáo owner trong phiên, Windows PowerShell do owner vận hành và Google Drive transfer thủ công. Documentation baseline0679367408d4896327f9fc51a7b5b95e3a9e08fb, branch docs/g07-manual-backup-restore. Đây là owner-reported evidence, không phải Work trực tiếp quan sát hoặc tải/kiểm artifacts. Không có private keys, ciphertext, receipt gốc hay account ID được yêu cầu hoặc truy cập. Chi phí0 theo owner báo cáo.

## Kết quả được owner báo cáo

| Kiểm tra | Kết quả / phạm vi |
| --- | --- |
| age1.3.2 portable và ZIP checksum | PASS |
| Hai synthetic age identities độc lập | PASS |
| NTFS ACL inspection | PASS: owner báo cáo chỉ Windows user của mình được liệt kê Full Control; không suy ra audit mọi effective-access route |
| Nhập lại identities | PASS sau khi sửa lỗi malformed key ban đầu; cả hai public recipients khớp. Nguồn nhập là ghi chú tạm trên điện thoại, không phải giấy |
| Tạo ciphertext và local decrypt | PASS: snapshot/format/hash binding; local receipt persisted |
| Drive upload/download thủ công | PASS: đúng hai ciphertext; bytes và SHA-256 khớp trusted local receipt; remote full decrypt và snapshot/hash binding PASS |
| Wrong identity | PASS: bị từ chối |
| Missing ciphertext | PASS kiểm tra quy trình manual fail-closed: phát hiện thiếu và bỏ qua decrypt; không phải test mới của production engine |

Ciphertext sizes do owner báo cáo: database.dump.age266 bytes; keyrings.json.age496 bytes. Kích thước chỉ nhận diện fixture này, không phải expected size cho backup tương lai. Không suy hashes từ size; không có digest/file nào được Work tự kiểm trong lượt follow-up.

Receipt cuối: verification=LOCAL_AUTHENTICATION_PASS; remoteVerification=REMOTE_ROUNDTRIP_PASS; databaseRecoveryVerification=NOT_RUN. Hai PASS đầu không nâng database recovery. Payload demo không phải PostgreSQL archive/bốn keyrings production.

## Findings và correction

**G07-OWNER-REV-001 / P2 — native stderr/ACL compatibility:** lần keygen đầu dừng ở warning world-readable nhưng file tồn tại; owner tiếp tục thành công sau xử lý native stderr có kiểm soát, explicit LASTEXITCODE và ACL inspection. Quan sát này xác nhận vướng mắc của snippet baseline; không chứng minh identity file an toàn chỉ vì exit0 hoặc file tồn tại. [Guide mục4](G07_MANUAL_BACKUP_GUIDE.md) đề xuất scoped Continue cho invocation keygen, giữ warnings, khôi phục preference rồi bắt buộc exit/file/owner/ACL checks và kiểm tra owner. Không suppress mọi warning. Snippet sửa mới NOT RUN trên Windows; không tuyên bố đã nghiệm thu.

**G07-OWNER-REV-002 / P3 — transcription:** malformed key ban đầu được sửa, sau đó hai recipients hợp lệ. Mọi bản custody phải được nhập lại/validate trước khi phụ thuộc vào nó. Ghi chú điện thoại tạm không đáp ứng chính sách paper custody; owner chuyển sang giấy được bảo quản riêng và rehearsal độc lập trước khi đóng gate. Chỉ xử lý notes/test material synthetic của owner theo policy cá nhân; không gửi nội dung notes/keys lên Work.

## Gate cuối — không suy rộng evidence

| Gate | Trạng thái |
| --- | --- |
| G07 Technical | PASS giữ từ native PostgreSQL17 run40623615581, tested910ac0ae; không có CI mới |
| Owner Synthetic Local Rehearsal | PASS — owner reported |
| Owner Synthetic Drive Round-trip | PASS — owner reported |
| Physical paper custody | NOT RUN |
| Independent replacement-device recovery | NOT RUN |
| Actual PostgreSQL restore trong owner rehearsal | NOT RUN |
| Production exporter/validator | BLOCKED |
| Hosted Supabase/real student operations trong owner rehearsal | NOT RUN; không có quyền production suy ra |
| G07 Operational / Overall | PARTIAL / PARTIAL |
| G08 institutional/legal authorization | BLOCKED |

Work follow-up chỉ sửa docs và static checks; owner device/Drive/keys/Supabase/data access0, CI0, merge/deploy0. [Owner policy/actions](G07_OWNER_DECISIONS.md) giữ A–F đã duyệt; không hỏi lại lựa chọn Drive/custodian/manual retention. Remaining gates không đóng chỉ từ hai receipt PASS.
