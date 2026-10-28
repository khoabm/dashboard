# G07 — Khôi phục thủ công trên máy cũ hoặc máy thay thế

28/10/2026. [Hướng dẫn backup](G07_MANUAL_BACKUP_GUIDE.md) · [Chính sách owner](G07_OWNER_DECISIONS.md).

**Không cần DPAPI để mở bản disaster recovery** nếu có đủ hai age private identities độc lập và cặp ciphertext. Hai identities không phải bốn keyrings ứng dụng. G08 vẫn BLOCKED; thực hiện với dữ liệu thật/đích production phải được cấp scope riêng. Work chưa thực hiện trên máy owner, không yêu cầu owner gửi secret vào chat.

## 1. Chuẩn bị theo tình huống

| Bước | Máy Windows gốc còn dùng được | Mất hoàn toàn máy/tài khoản Windows |
| --- | --- | --- |
| Môi trường tin cậy | Kiểm tra máy không bị compromise; nếu nghi bị lộ, dùng máy sạch khác | Chuẩn bị máy sạch được phép; cài công cụ từ nguồn/hashes như guide backup |
| Lấy ciphertext | Dùng bản local đã verified hoặc tải đúng CURRENT/PREVIOUS từ Drive sau khi kiểm account/quota/quyền | Tự khôi phục Google account bằng cơ chế owner đã giữ độc lập, rồi lấy cặp ciphertext. Không có secondary DB copy; mất quyền Google là blocker thật |
| Credentials age | Có thể dùng bản local được bảo vệ, nhưng vẫn tập đường giấy | Nhập lại hai dòng private identity từ giấy vào staging riêng; không dựa DPAPI/Windows profile cũ |
| Chọn bộ | Cùng snapshot ID, đúng receipt và hai file | Giống máy gốc; không tự sinh identity thay thế, không ghép hai snapshot |

Nếu mất quyền Google account và không có bản ciphertext local còn dùng được: **STOP — thiếu dữ liệu backup**. Nếu thiếu một private identity: **STOP — thiếu credential**, dù vẫn có public recipient. Không có emergency custodian đã được owner chấp nhận; Work không thể phục hồi bí mật bị mất.

## 2. Thu hồi file và kiểm receipt

1. Owner chọn bộ CURRENT; nếu bị hỏng/không đầy đủ thì dùng PREVIOUS nguyên bộ, không đổi chéo file. Ghi snapshot/date/source SHA/original project ID và lý do chọn. Không xóa bộ lỗi để “dọn” trước điều tra.
2. Tải chỉ `database.dump.age` và `keyrings.json.age` vào staging mới ngoài thư mục sync. Dùng quyền riêng như mục4 guide backup; kiểm receipt độc lập owner đã giữ. Không gửi file vào ChatGPT/GitHub.
3. So số file (đủ2), tên, size>0, SHA-256 ciphertext và snapshot ID trong receipt. Nếu mismatch hoặc receipt không đáng tin → STOP; không chỉnh hash mới cho khớp file đang có.
4. Nhập lại hai identities từ giấy, UTF-8 không BOM, mỗi file đúng private-key dòng và newline; không in nội dung ra terminal/log. Với `age-keygen -y`, đối chiếu public recipients với sổ owner; recipient khác hoặc hai recipient giống nhau → STOP.
5. Nhớ source dump có thể chứa SQL thực thi. Chỉ restore từ snapshot tin cậy và reviewed source; hash hợp lệ với receipt giả không làm SQL an toàn.

## 3. Full authentication trước khi chạy bất cứ restored SQL nào

Trong staging mới, giả sử hai identity files là `db-retyped.txt`/`keys-retyped.txt`. Với máy gốc cũng dùng cùng quy trình. Hai output phải chưa tồn tại:

```powershell
$ErrorActionPreference = 'Stop'
if ((Test-Path -LiteralPath '.\authenticated.dump') -or (Test-Path -LiteralPath '.\authenticated-keys.json')) { throw 'Dung staging moi' }
age.exe --decrypt -i keys-retyped.txt -o authenticated-keys.json keyrings.json.age 2>$null
if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath '.\authenticated-keys.json' -ErrorAction SilentlyContinue; throw 'Key export authentication failed' }
age.exe --decrypt -i db-retyped.txt -o authenticated.dump database.dump.age 2>$null
if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath '.\authenticated.dump' -ErrorAction SilentlyContinue; throw 'DB authentication failed' }
```

Nếu lệnh thứ hai fail, cũng dọn plaintext key export còn lại trong staging khi kết thúc lỗi; không tiếp tục. File output partial có thể tồn tại sau lỗi/đứt điện, vì vậy **sự tồn tại của file không chứng minh authentication PASS**. Không pipe plaintext từng phần từ age vào psql/pg_restore. Chỉ dùng output sau exit0 của cả hai lần decrypt và các kiểm tra manifest sau.

- Với demo `manual-custody-demo-v1`: dùng `ConvertFrom-Json`, kiểm `synthetic=true`, snapshot ID và SHA-256 authenticated.dump bằng `dumpSha256` như guide backup. So nội dung test/hash; **STOP ở đây, không pg_restore file chữ demo**.
- Với accepted cloud harness: `openBackup` kiểm fixed synthetic format/project, đủ4 rings/active/required kids, source/migration hashes và dump binding; native harness chỉ chạy trên Actions disposable. Bằng chứng đã PASS, không chạy lên project thật.
- Với bộ production tương lai: cần validator/exporter đã được duyệt riêng. Operator phải kiểm manifest version, inner snapshot ID đúng receipt, original project/AAD identity, dump SHA-256, applied migration mapping/source checksums, tất cả ring/kid/generation và counters. Thiếu validator hay contract tương thích → **BLOCKED**, không dùng script synthetic để bỏ qua gate. Không xem/echo toàn bộ plaintext key export để “debug”.

## 4. Chuẩn bị PostgreSQL isolated được cấp quyền

Đây là hướng dẫn cho operator sau authorization đích và tooling, không phải lệnh gọi hosted được phép chạy trong task này.

1. Chuẩn bị PostgreSQL17 trong môi trường riêng, không liên quan production, xác minh miễn phí/quota. Nếu không có môi trường phù hợp, STOP; không mở trial/add-on/paid project. Đảm bảo không có DB/volume dữ liệu hiện hữu cần giữ.
2. Xác minh binary PG17/dump compatibility và công cụ age đúng phiên bản. Dùng kết nối explicit tới **loopback/đích isolated đã duyệt**, tên DB mới và credential qua password prompt/secret facility an toàn; không password trong URI, args, history hoặc logs.
3. Chuẩn bị/mapping cluster roles được review: owner, anon/authenticated/service_role và các helpers cần thiết. Dump một DB không tạo global roles. Không nhập `pg_dumpall --globals-only` kèm role passwords như shortcut. Trên máy/cluster mới không giả định quyền/bypassrls/role memberships hay managed Supabase objects đã tồn tại đúng.
4. Chọn chiến lược restore schema từ archive, không apply lại migrations rồi restore full schema lên đó. Chỉ tạo **DB mới rỗng**, không `--clean`, `--create` vào DB đang dùng, không reset production. Schema collisions phải làm restore dừng.
5. Sau khi cả hai age files và inner binding đã PASS, operator có thể dùng mẫu dưới, **chỉ sau khi tự thay đường công cụ/port/user và xác minh scope isolated**. Tên ví dụ không trỏ hosted; không chạy nếu cổng không phải cluster mới được cấp quyền:

```powershell
# Template isolated ONLY; prerequisites/roles/credentials must already be approved.
createdb.exe --host=127.0.0.1 --port=15432 --username=postgres --template=template0 gb_owner_restore_review
if ($LASTEXITCODE -ne 0) { throw 'Target creation refused' }
pg_restore.exe --host=127.0.0.1 --port=15432 --username=postgres --dbname=gb_owner_restore_review --exit-on-error --single-transaction -- authenticated.dump
if ($LASTEXITCODE -ne 0) { throw 'Restore failed; keep target isolated' }
```

Đây là template sau approval, **chưa chạy trên Windows**, không provision cơ sở hạ tầng và không đủ để tạo một project Supabase mới. Không sửa `--no-owner/--no-privileges` chỉ để lấy exit0; nếu phải map owner cho đích mới thì review mapping và test lại quyền. Không auto retry sau timeout, lỗi SQL hoặc unknown outcome. Target lỗi giữ isolated; operator xác minh rollback/metadata trước mọi hành động dọn có tính phá hủy.

## 5. Khôi phục bốn keyrings và kiểm tra dữ liệu/quyền

1. Từ export đã authenticated, kiểm đủ purpose: `GB_ID_ENC_KEYS` ↔ identity, `GB_LOOKUP_KEYS` ↔ lookup, `GB_CAP_KEYS` ↔ capability, `GB_PREVIEW_KEYS` ↔ preview; đúng active và retained kids. Không tự thay bằng fresh random keys hoặc chỉ giữ active.
2. Đặt cấu hình vào môi trường server test bằng luồng bảo mật đã được duyệt; không VITE/browser/SQL arguments/Git/Actions secrets cho key thật. Việc provision/deploy secret thật cần scope riêng, không được thực hiện bởi task này. `GB_ALLOWED_ORIGINS` là config riêng, không phải keyring thứ5.
3. Original project ID và class/blind-index/AAD bindings phải được giữ tương thích. Đổi Supabase project ID không chỉ là sửa URL; cần kế hoạch re-encryption/migration đã được duyệt. Nếu chưa có → STOP, không rewrite ciphertext/epochs tùy ý.
4. Trong synthetic test, exact expected là2 students,1 score raw `8.12345`,8 subjects,7 score columns. Với dữ liệu thật chỉ operator được phép đối chiếu expected counts trong manifest và kiểm mẫu được phép, không in identifiers/grades vào log. So date-only DOB, null/zero và raw decimal semantics.
5. Dùng verifier đã được duyệt để decrypt identifiers, HMAC match đúng class/generation, retained/new active keys, capability/preview cryptographic contract và expiry/epoch/session. Không replay tokens/sessions cũ để phục hồi truy cập. Không có verifier production → BLOCKED, không tự đánh dấu recovery đủ.
6. So owner, schema/table/sequence ACL, function EXECUTE/definer/invoker/search_path, default grants, RLS flags và policies với baseline. Chuẩn hóa ACL theo tập quyền, không so thứ tự chuỗi ACL. Test dưới **anon/authenticated/service_role thực**, không chỉ PostgreSQL superuser: denied private SELECT/write/RPC cho client, allowed read/authorized RPC cho service-role. Giữ log category/count, không rows/params.
7. Auth users/admin UID/delegation/session revocation, Storage bytes/path/private policies và Edge origins/config/secrets/deployment có quy trình riêng. Cùng-cluster PG17 PASS không chứng minh các phần managed này đã phục hồi. Không public endpoint hoặc bật frontend vì pg_restore exit0.

## 6. Kết thúc và ghi nhận

- Ghi riêng: snapshot ID/time, ngày giờ restore, operator, source/target reference, ciphertext hashes/bytes, tool versions, số lượng/precision và kết quả decrypt/HMAC/role/rollback checks, loss interval thực, thời gian recovery đo được, blockers và reviewer/authorization reference. Không PII/token/private key/secret paths trong báo cáo public.
- Sau snapshot, replay deletion/restriction ledger đã được duyệt để không “hồi sinh” dữ liệu đã xóa/hạn chế. Vẫn giữ G08/production cutover đóng cho đến khi có authorization riêng.
- Nếu restore PASS isolated: chỉ đánh dấu **ISOLATED_RECOVERY_VERIFIED**, không tự ghi PRODUCTION_READY. Giữ CURRENT/PREVIOUS và hai identities phù hợp cho đến khi cutover/retention được cấp quyền.
- Dọn đúng staging đã ghi nhận: plaintext dump, plaintext key export, identities nhập tạm và output partial; không dùng wildcard ở thư mục hệ thống/Drive. Giữ bản giấy gốc và ciphertext đã verified. Xóa file thông thường không bảo đảm secure erase trên SSD/cloud sync; quy trình staging/media còn cần review production.
- Nếu thất bại: ghi stage/category, giữ private evidence được phép; không gửi stderr, keyring hay dump vào chat. Không xóa bản verified cuối, không auto retry/đổi key để ép thành công.

## 7. Acceptance thực tế

Technical cloud PASS được giữ từ [40623615581](https://github.com/khoabm/dashboard/actions/runs/40623615581), tested910ac0ae: real PG17 restore sau xóa source, decrypt/HMAC/data/roles và rollback. Manual paper/Windows/Google-account-loss/cross-cluster/Drive round-trip chưa được chứng minh. Owner tự nhập giấy và restore trên máy thay thế là gate vận hành riêng. Không có RPO/RTO bảo đảm; chỉ backup manual sau thay đổi quan trọng theo chính sách đã chốt.
