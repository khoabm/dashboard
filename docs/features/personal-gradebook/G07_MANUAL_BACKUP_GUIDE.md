# G07 — Hướng dẫn sao lưu thủ công cho chủ sở hữu

Ngày 28/10/2026. Baseline83a0322; chính sách owner A–F đã chốt. [Khôi phục](G07_MANUAL_RESTORE_GUIDE.md) · [Trạng thái/quyết định](G07_OWNER_DECISIONS.md).

**Chỉ chạy phần synthetic ngay.** Work không truy cập máy chủ sở hữu, tài khoản Drive hay khóa production. Hướng dẫn tạo khóa thật dưới đây dành cho owner tự thực hiện trên môi trường riêng sau khi sẵn sàng; không gửi khóa/password/file credential vào ChatGPT hoặc GitHub. G08 vẫn BLOCKED trước mọi xử lý dữ liệu thật.

## 1. Hiểu đúng hai loại khóa

| Thành phần | Công dụng | Ai tạo/giữ |
| --- | --- | --- |
| Hai age private identities riêng: DB và key export | Mở hai file backup; public recipient tương ứng chỉ dùng mã hóa | Owner duy nhất; giữ bản giấy độc lập. Work chỉ tạo identities synthetic rồi hủy |
| Bốn keyring ứng dụng: identity, lookup, capability, preview | AES danh tính, HMAC tra cứu, capability và preview; mỗi ring có active/retained kids | Exporter production tương lai phải lấy qua quy trình được cấp quyền; nằm trong keyrings.json.age |
| Windows DPAPI | Có thể bảo vệ bản cục bộ | Tùy chọn; không thay thế giấy/age identity khi mất tài khoản hoặc máy |

Mất DB age identity thì không mở được dump; mất key-export identity thì không lấy được các keyring. Chỉ có DB hoặc chỉ có keyring đều chưa đủ recovery. Public recipient không giải mã được. Không sinh khóa mới để thay khóa đã mất của backup cũ.

## 2. Chuẩn bị Drive riêng tư và dung lượng

1. Owner tự đăng nhập đúng Google account cá nhân tại drive.google.com; ghi tên tài khoản và khả năng khôi phục Google account vào sổ riêng. Bật bảo vệ tài khoản phù hợp, giữ mã khôi phục tài khoản ngoài máy/Google nếu dùng. Không chia sẻ mã này với Work.
2. Tạo thư mục tên không chứa học sinh, ví dụ `Gradebook-Encrypted-Backups`; mở Chia sẻ/Share → General access/Quyền truy cập chung = Restricted/Bị hạn chế. Chỉ owner có quyền; không tạo link công khai.
3. Tại Storage/Bộ nhớ hoặc one.google.com/storage, đọc dung lượng đã dùng/còn lại của toàn tài khoản (Drive/Gmail/Photos dùng chung). Không nhấn mua gói/Google One. Ghi số byte còn trống và ngày kiểm tra; actual quota chưa được Work kiểm chứng.
4. Dự trù đủ cho bộ mới + bộ hiện tại + bộ trước trong lúc thay thế, thêm phần dự phòng và dung lượng đang dùng bởi mail/photos/trash. Nếu không đủ hoặc không xác minh được: STOP, không xóa bộ cuối cùng còn khôi phục được để nhường chỗ.
5. Tạo thư mục con theo snapshot ID ngẫu nhiên, ví dụ `20261028-<UUID>`; không trộn file giữa các snapshot. Không lưu private identities hoặc plaintext keyrings vào Drive, kể cả thư mục bị hạn chế.

## 3. Công cụ tin cậy, không tốn phí

Dùng Windows PowerShell5.1 hoặc PowerShell7; không bật Start-Transcript, screen sharing/ghi màn hình khi thao tác bí mật. Máy phải đáng tin, không malware; không chọn thư mục OneDrive/Google Drive sync để staging plaintext.

- age: chỉ lấy từ [dự án chính thức](https://github.com/FiloSottile/age), bản pin [v1.3.2](https://github.com/FiloSottile/age/releases/tag/v1.3.2). Windows x64: tải `age-v1.3.2-windows-amd64.zip`. SHA-256 đã đối chiếu release API ngày28/10/2026: `f48d8f8f9ebe903ab5027ed067652f2cc1db94bc206976430133b905dcd8e8c7`. Không áp hash này cho ARM64/Linux/macOS hay version khác.
- Ví dụ cụ thể bên dưới dùng thư mục Downloads mặc định. Nếu tải nơi khác, sửa **giá trị biến `$AgeZip`** thành đường dẫn thật trước khi chạy; không thay nội dung bằng một placeholder. File thiếu/hash sai → STOP. Đọc upstream release/provenance; digest từ cùng nguồn không thay thế mọi kiểm tra tin cậy.

```powershell
$AgeZip = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads\age-v1.3.2-windows-amd64.zip'
if (-not (Test-Path -LiteralPath $AgeZip -PathType Leaf)) { throw 'Khong tim thay ZIP tai duong dan da chon' }
$ExpectedAgeSha256 = 'f48d8f8f9ebe903ab5027ed067652f2cc1db94bc206976430133b905dcd8e8c7'
$ActualAgeSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $AgeZip -ErrorAction Stop).Hash.ToLowerInvariant()
if ($ActualAgeSha256 -ne $ExpectedAgeSha256) { throw 'ZIP checksum mismatch' }
```

- Giải nén vào thư mục công cụ riêng. Kiểm tra `age.exe --version` và `age-keygen.exe --help`; không chọn “latest” không kiểm chứng. Ví dụ dưới giả sử hai exe đã được đặt vào PATH tin cậy.
- PostgreSQL: chỉ cần khi được phép tạo/restore DB isolated. Lấy công cụ PG17 từ [trang chính thức](https://www.postgresql.org/download/windows/), chọn thành phần miễn phí, không add-on/trial. Kiểm chứng chữ ký/hash của nhà phát hành, chạy `pg_dump --version`, `pg_restore --version`, đọc `--help`; cặp công cụ phải phù hợp phiên bản server. Không cần mua/cài DB để đọc hướng dẫn này.
- Trên Linux/macOS dùng bản age đúng nền tảng cùng nguồn; quyền staging0700/credential0600. Binary stdin/stdout phải được giữ nguyên. Không dùng pipeline PowerShell5.1 để truyền dump/age binary.

## 4. Owner tạo hai identities và giữ giấy độc lập

Bước này owner tự làm; trước tiên tập bằng identities **synthetic** rồi hủy, không dùng test keys cho production.

```powershell
$ErrorActionPreference = 'Stop'
$Snapshot = 'synthetic-' + [guid]::NewGuid().ToString()
$Work = Join-Path $env:LOCALAPPDATA ('GradebookRecovery\' + $Snapshot)
New-Item -ItemType Directory -Path $Work | Out-Null
$Me = [Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls.exe $Work /inheritance:r /grant:r "${Me}:(OI)(CI)F" /q | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Khong thiet lap duoc quyen staging' }
Set-Location -LiteralPath $Work
age-keygen.exe -o db-identity.txt 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Keygen DB failed' }
age-keygen.exe -o keys-identity.txt 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Keygen key-export failed' }
$DbRecipient = (age-keygen.exe -y db-identity.txt 2>$null).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Recipient DB failed' }
$KeysRecipient = (age-keygen.exe -y keys-identity.txt 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $DbRecipient -eq $KeysRecipient) { throw 'Recipient khong doc lap' }
```

Không chạy lại vào thư mục đã có file. Nếu cmdlet/native tool báo lỗi: dừng, không bỏ qua rồi tiếp tục. ACL này giới hạn quyền thông thường, không chống admin/malware hoặc bảo đảm xóa an toàn trên SSD.

1. Owner mở từng identity bằng trình sửa văn bản offline, không dùng web editor. Chép tay chính xác dòng bắt đầu bằng prefix private-key vào hai tờ giấy riêng, ghi rõ “DB”/“KEY EXPORT”, public recipient, ngày tạo và version. Không chép vào chat, Git, email, clipboard đồng bộ hay ảnh chụp upload cloud.
2. Giữ giấy trong nơi khóa an toàn, khô ráo, tách khỏi máy; chỉ owner biết và có quyền. Không có emergency custodian; nếu owner mất khả năng tiếp cận cả giấy lẫn bản cục bộ thì có thể mất recovery vĩnh viễn. Đây là rủi ro đã chấp nhận, không ngầm đề cử người khác.
3. **Kiểm tra giấy:** với test set ở mục5 đã mã hóa, tạm cất bản identity test gốc ngoài thư mục làm việc; tự gõ từ giấy vào hai file mới trên staging riêng. File identity chỉ cần dòng private-key hợp lệ và newline; dùng UTF-8 không BOM. Chạy decrypt/đối chiếu như mục5 bằng hai file nhập lại; có thể `age-keygen -y` đối chiếu public recipient mà không in private key.
4. Chỉ ghi PASS nếu đúng cả hai file nhập lại. Work không chứng nhận thao tác giấy của owner. Giữ nguyên backup/khóa gốc cho đến khi rehearsal thành công; không thử bằng cách phá hủy bản production duy nhất.
5. Khi owner làm khóa production sau này: hai identities hoàn toàn mới, không dùng lại test keys. Không cần Work sinh hay nhận khóa. DPAPI cho bản local chỉ là lớp bổ sung; giấy phải đủ để tái tạo identities trên máy mới.

### 4.1. Nhập lại hai identity files từ giấy — UTF-8 không BOM

Dùng staging riêng đã hạn chế quyền ở mục4, không nằm trong thư mục sync. Hàm dưới **chỉ owner tự chạy**, nhập từng dòng trực tiếp từ giấy vào prompt che ký tự; không copy/paste, không gõ secret trực tiếp trong câu lệnh hay dùng clipboard đồng bộ. Không bật transcript, console debug, ghi màn hình hoặc gửi ảnh/file vào chat. Đầu vào không trở thành command-history literal. Hàm không echo private key và không ghi đè file có sẵn:

```powershell
function Write-PaperIdentity {
  param([string]$Path, [string]$Label)
  if (Test-Path -LiteralPath $Path) { throw 'Identity output da ton tai; dung staging moi' }
  $Secret = Read-Host -Prompt ('Tu go dong identity tren giay: ' + $Label) -AsSecureString
  $Pointer = [IntPtr]::Zero
  $Clear = $null
  try {
    $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
    $Clear = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)
    if ([string]::IsNullOrWhiteSpace($Clear) -or $Clear.Contains("`n") -or $Clear.Contains("`r")) { throw 'Can dung mot dong identity' }
    $NoBom = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($Path, ($Clear + [Environment]::NewLine), $NoBom)
  } finally {
    $Clear = $null
    if ($Pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer) }
    $Secret.Dispose()
  }
}
$DbRetypedPath = Join-Path $Work 'db-retyped.txt'
$KeysRetypedPath = Join-Path $Work 'keys-retyped.txt'
Write-PaperIdentity -Path $DbRetypedPath -Label 'DB'
Write-PaperIdentity -Path $KeysRetypedPath -Label 'KEY EXPORT'
$RetypedDbRecipient = (age-keygen.exe -y $DbRetypedPath 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $RetypedDbRecipient -ne $DbRecipient) { throw 'Identity DB nhap lai khong khop' }
$RetypedKeysRecipient = (age-keygen.exe -y $KeysRetypedPath 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $RetypedKeysRecipient -ne $KeysRecipient) { throw 'Identity KEY EXPORT nhap lai khong khop' }
```

Trong rehearsal mục5, thực hiện mục4.1 **sau** tạo ciphertext/receipt CANDIDATE để tập đường khôi phục độc lập; `$DbRecipient`/`$KeysRecipient` là public recipients đã ghi từ mục4. Trên máy thay thế, owner đối chiếu với public recipients trong sổ tin cậy; không dùng nhầm keygen tạo private identities mới. Sai key → dừng, dọn output nhập sai trong staging rồi nhập lại có chủ đích, không ép receipt thành PASS.

BSTR được giải phóng/zero, nhưng .NET có thể giữ bản sao chuỗi; không bảo đảm xóa toàn bộ secret khỏi RAM. File UTF-8 plaintext tạm vẫn là bí mật, phải nằm trong staging riêng và dọn sau rehearsal. Snippet này **chưa thực thi trên Windows/PowerShell5.1 hoặc7**; đây là ví dụ tài liệu đã review tĩnh, không phải kết quả Windows PASS.

## 5. Bài tập synthetic trên Windows — chạy được ngay, không có DB thật

Đây là **bài tập giữ khóa/mã hóa**, payload DB là file chữ giả, không phải archive PostgreSQL. Không đưa file chữ này vào pg_restore. Recovery DB thật đã có bằng chứng cloud tại run40623615581; không rerun CI để tập thao tác giấy.

Tạo hai payload test và manifest cùng snapshot. File UTF-8 không BOM; raw dump hash được nằm trong manifest sẽ được mã hóa. Chỉ dùng trong staging synthetic ở mục4:

```powershell
$Utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $Work 'database.dump'), ('SYNTHETIC TEXT ONLY ' + $Snapshot), $Utf8)
$DumpPath = Join-Path $Work 'database.dump'
$DumpHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $DumpPath).Hash.ToLowerInvariant()
$Demo = [ordered]@{format='manual-custody-demo-v1'; synthetic=$true; snapshotId=$Snapshot; dumpSha256=$DumpHash; note='Khong phai PostgreSQL dump hoac keyring production'}
[IO.File]::WriteAllText((Join-Path $Work 'keyrings.json'), ($Demo | ConvertTo-Json), $Utf8)
age.exe --encrypt -r $DbRecipient -o database.dump.age database.dump 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Encrypt DB failed' }
age.exe --encrypt -r $KeysRecipient -o keyrings.json.age keyrings.json 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Encrypt keys failed' }
```

Hai file `.age` phải có kích thước >0. **Bước5A — tạo receipt CANDIDATE trước khi nhập lại giấy/decrypt**. Tạo hash ciphertext chỉ chứng minh đầu vào đang có, chưa chứng minh decrypt/restore. Không bỏ qua bước này hoặc đặt sẵn PASS:

```powershell
$Files = @('database.dump.age','keyrings.json.age')
$Items = @($Files | ForEach-Object {
  $CipherPath = Join-Path $Work $_
  $File = Get-Item -LiteralPath $CipherPath
  if ($File.Length -le 0) { throw 'File rong' }
  [ordered]@{name=$File.Name; bytes=$File.Length; sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $CipherPath).Hash.ToLowerInvariant()}
})
$Receipt = [ordered]@{format='ciphertext-receipt-v1'; snapshotId=$Snapshot; backupUtc=[DateTime]::UtcNow.ToString('o'); files=$Items; verification='CANDIDATE_UNVERIFIED'; remoteVerification='NOT_RUN'; databaseRecoveryVerification='NOT_RUN'}
[IO.File]::WriteAllText((Join-Path $Work 'receipt.json'), ($Receipt | ConvertTo-Json -Depth 5), $Utf8)
```

**Bước5B — thực hiện mục4.1**, rồi giải mã cả hai file và đối chiếu. Không in nội dung identities. Nếu bỏ qua bất kỳ check nào, lỗi hoặc dừng giữa chừng, receipt vẫn `CANDIDATE_UNVERIFIED`; không chạy riêng dòng cập nhật PASS:

```powershell
age.exe --decrypt -i keys-retyped.txt -o recovered-keys.json keyrings.json.age 2>$null
if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath '.\recovered-keys.json' -ErrorAction SilentlyContinue; throw 'Decrypt keys failed' }
age.exe --decrypt -i db-retyped.txt -o recovered.dump database.dump.age 2>$null
if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath '.\recovered.dump' -ErrorAction SilentlyContinue; throw 'Decrypt DB failed' }
$Recovered = Get-Content -Raw -LiteralPath '.\recovered-keys.json' | ConvertFrom-Json
if ($Recovered.synthetic -ne $true -or $Recovered.snapshotId -ne $Snapshot) { throw 'Sai snapshot' }
$RecoveredDumpPath = Join-Path $Work 'recovered.dump'
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $RecoveredDumpPath).Hash.ToLowerInvariant() -ne $Recovered.dumpSha256) { throw 'Sai dump binding' }
if ($Recovered.format -ne 'manual-custody-demo-v1' -or $null -eq $Receipt -or $Receipt.verification -ne 'CANDIDATE_UNVERIFIED' -or $Receipt.snapshotId -ne $Recovered.snapshotId -or @($Receipt.files).Count -ne 2) { throw 'Receipt/format khong hop le' }
foreach ($Name in @('database.dump.age','keyrings.json.age')) {
  $CipherPath = Join-Path $Work $Name
  $Entry = @($Receipt.files | Where-Object { $_.name -eq $Name })
  if ($Entry.Count -ne 1) { throw 'Receipt thieu hoac trung file' }
  $Current = Get-Item -LiteralPath $CipherPath -ErrorAction Stop
  if ($Current.Length -ne $Entry[0].bytes -or (Get-FileHash -Algorithm SHA256 -LiteralPath $CipherPath).Hash.ToLowerInvariant() -ne $Entry[0].sha256) { throw 'Ciphertext da thay doi' }
}
# Promotion belongs to this complete successful sequence only.
$Receipt.verification = 'LOCAL_AUTHENTICATION_PASS'
$Receipt['localVerifiedUtc'] = [DateTime]::UtcNow.ToString('o')
[IO.File]::WriteAllText((Join-Path $Work 'receipt.json'), ($Receipt | ConvertTo-Json -Depth 5), $Utf8)
```

Thử sai identity: dùng keys-retyped cho database.dump.age với output **mới** `wrong.tmp`; phải exit khác0 và xóa file partial đó. Thử thiếu một ciphertext: đánh dấu bộ không đầy đủ, không decrypt/restore file còn lại. Không sửa manifest để ép khớp; không copy file từ snapshot khác. Sau bài tập, xóa toàn bộ payload/identities test trong đúng thư mục synthetic này, hủy giấy test; giấy production không thuộc bài xóa này. Không tuyên bố xóa file thông thường là secure erase.

## 6. Backup dữ liệu thật — hiện BLOCKED tại exporter/authorization

**Không có lệnh production export được cung cấp hoặc thực thi trong task.** `scripts/gradebook-backup.mjs` cố định project/format synthetic; không đổi cờ hay giả manifest synthetic để chạy trên dữ liệu thật. `tests/cloud/backup.mjs` là fixture disposable, không phải công cụ backup owner.

Sau khi G08 và scope production riêng được duyệt, operator được cấp quyền phải cung cấp đủ các đầu ra dưới đây. Nếu chưa có, owner STOP ở đây; không tự tìm/copy secret qua SQL, browser devtools hay chat.

1. Ghi snapshot ID/thời gian, original project ID/AAD identity, source SHA, applied migration-to-file mapping và checksum, PG/tool versions; dừng writes/rotation trong cửa sổ được duyệt để chốt DB/key export nhất quán.
2. Tạo custom-format dump bằng pg_dump phù hợp, bảo toàn schema/data/owners/ACL/functions/defaults/RLS; credentials qua luồng riêng an toàn, không URI/password trong argv/log. Backup một DB không tự chứa cluster roles hoặc bytes Storage.
3. Export **bốn** rings identity/lookup/capability/preview qua cơ chế server-secret được duyệt, gồm active và retained kids/generations cần cho mọi row/class và backup đang giữ. Không dựng thủ công JSON bằng chat, không thu thập token đang sống.
4. Manifest bảo mật phải chứa cùng snapshot ID, project/AAD identity, dump SHA-256, migration hashes, key-version inventory, thời gian/counters dùng đối chiếu. Kiểm tra mọi kid được DB tham chiếu đều có; không chỉ export active key.
5. Đóng băng rotation cho đến khi có cặp ciphertext được xác thực. Dùng hai recipients của owner để mã hóa theo cấu trúc mục5, nhưng chỉ với staging/exporter đã được phê duyệt. Không để keyring plaintext hoặc dump trong thư mục đồng bộ, source, artifact hay logs.
6. Một validator/exporter production tương thích cùng định dạng và bộ kiểm tra restore phải được review/triển khai riêng. Định dạng `manual-custody-demo-v1` ở mục5 không đáp ứng hợp đồng production.

## 7. Receipt tin cậy và upload ciphertext

Receipt không chứa private identities, keyring values, học sinh, token hay plaintext dump hash. Ghi snapshot ID, UTC backup time, project/version reference không nhạy cảm, hai tên file, byte count và SHA-256 **ciphertext**, kết quả kiểm tra, ngày verify/copy version ID sau này. Receipt được khởi tạo ở bước5A bằng `CANDIDATE_UNVERIFIED`; không có lệnh gán PASS trong phần khởi tạo. Bước5B chỉ cập nhật local PASS sau full decrypt, snapshot/format/binding và receipt ciphertext comparison thành công. Không chạy riêng dòng promotion.

| Trạng thái riêng | Chỉ ghi PASS khi | Nếu chưa chạy/bỏ qua/lỗi |
| --- | --- | --- |
| `verification=LOCAL_AUTHENTICATION_PASS` | Cả hai age decrypt exit0, đúng snapshot/format, inner dump hash và receipt ciphertext khớp (bước5B) | Giữ `CANDIDATE_UNVERIFIED`; ghi lỗi riêng, không promote |
| `remoteVerification=REMOTE_ROUNDTRIP_PASS` | Đã có scope transfer; tải lại đúng hai ciphertext, so receipt tin cậy và full authenticate/binding bản tải xuống | `NOT_RUN` hoặc `FAIL`; upload success không đủ |
| `databaseRecoveryVerification=ISOLATED_RECOVERY_VERIFIED` | Actual PostgreSQL isolated restore thành công và data/key/ACL/RLS checks có evidence | `NOT_RUN` hoặc `FAIL`; demo text ở mục5 luôn `NOT_RUN` |

Các trường độc lập: local PASS không tự nâng remote/database. Không có câu lệnh tự gán PASS cho hai trường còn lại; chỉ operator cập nhật trường tương ứng sau khi đủ evidence và scope. Bước bị bỏ qua không được coi PASS. Receipt demo vẫn phải giữ `databaseRecoveryVerification=NOT_RUN` dù decrypt thành công.

Chỉ ghi `LOCAL_AUTHENTICATION_PASS` sau khi thực sự decrypt/binding đã PASS; receipt này không phải REMOTE_PASS. Giữ hash của receipt/two ciphertext trong sổ giấy riêng hoặc bản ghi owner tin cậy ngoài Drive. Receipt cùng thư mục với file không tự chống thay cả bộ; cần mốc tin cậy độc lập.

**Quy trình Drive synthetic dự kiến — Work chưa được phép truyền:** owner chỉ định account/folder ID và đúng snapshot/two ciphertext filenames + hash + size; cấp phép tối đa2 upload,2 download, metadata/sharing read hữu hạn cần thiết (nêu rõ tool budget trước khi chạy), không retry và không share mutation. Receipt tin cậy giữ ngoài luồng upload. Nếu connector không đáp ứng đúng ngân sách/đích thì STOP xin scope mới, không tự mở rộng.

Owner tự thao tác: trong thư mục riêng đã kiểm quyền/quota, upload đúng `database.dump.age` và `keyrings.json.age`; đối chiếu chỉ hai file mã hóa, không identity/raw payload. Tải từng file một lần vào thư mục **download mới**, không ghi đè staging. Đối chiếu size/hash ciphertext với receipt tin cậy, rồi full decrypt cả hai và kiểm tra inner binding trên bản tải xuống. Khi có DB dump thật được duyệt, phải có restore isolated/role checks trước khi nhận bộ là RECOVERY_VERIFIED; hash download PASS không thay thế restore. Ghi file IDs/version, thời gian, operator và kết quả. File lỗi/quota thiếu/permission lạ → STOP, giữ bộ cũ, không auto retry.

## 8. Chỉ giữ hai bộ đã xác minh

Bộ mới bắt đầu CANDIDATE_UNVERIFIED; local authentication, remote round-trip và actual isolated DB recovery được ghi bằng ba trường riêng ở mục7. Chỉ nhận bộ vào retention verified sau khi có đủ các kiểm chứng áp dụng; demo text chỉ chứng minh custody/authentication, không thay thế bộ DB recovery verified. Không đổi tên thành “verified” chỉ từ upload success.

Khi bộ mới verify thành công, nó là CURRENT, CURRENT cũ thành PREVIOUS. Chỉ cân nhắc xóa bộ cũ hơn sau khi cả hai bộ còn lại đầy đủ/khôi phục được, xét G08/legal hold/trash/version retention. Không tự động xóa; không bao giờ xóa bộ cuối còn khôi phục được. Nếu bộ mới FAIL, CURRENT/PREVIOUS giữ nguyên. Giữ mọi application key và age identity còn cần bởi hai bộ. Không giữ một DB mới với keyrings của PREVIOUS.

Chỉ Google Drive cá nhân là đích DB; không USB/secondary. Một account, một custodian, manual-only, không RPO/RTO đảm bảo; mất account hoặc credentials có thể làm mất recovery, mất thay đổi kể từ backup verified cuối đã được owner chấp nhận.

## 9. Bằng chứng và giới hạn

- Cloud native17/age/roles/rollback PASS tại [40623615581](https://github.com/khoabm/dashboard/actions/runs/40623615581), tested910ac0ae; đã đọc lại SUCCESS, không rerun.
- Script hỗ trợ synthetic-only: bốn rings, paired files, independent process, full authentication và binding; không lưu bộ recovery để owner tải từ CI (artifacts0).
- Windows PowerShell/giấy owner: **NOT RUN**; snippet được review về binary IO và exit-code, không tuyên bố đã chạy trên máy Windows.
- Google Drive account/quota/sharing/round-trip: **NOT RUN**; cần scope cụ thể. Thực tế mất máy/khôi phục Google account/cross-cluster/production exporter: **BLOCKED/NOT VERIFIED**.

Nguồn chính thức kiểm ngày28/10/2026: [age](https://github.com/FiloSottile/age), [Google storage](https://support.google.com/drive/answer/9312312?hl=en), [pg_dump17](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore17](https://www.postgresql.org/docs/17/app-pgrestore.html). Chỉ diễn giải phạm vi kỹ thuật, không tự phê duyệt nghĩa vụ G08.
