# Bằng chứng kiểm thử

<a id="partial-draft-late-save-2026-10-24"></a>

## 2026-10-24 — review AUD-013/014 tại e98da62

Source: commit tiếp nối `e98da62bdf442d983f3dd7692588f3b9c1848606` trên `fix/audit-reliability-20261024`. Hai finding được xác nhận bằng source; AUD-013 còn tái hiện bằng hai test mới chạy riêng trên bản module baseline (đều FAIL vì không đọc đủ file cũ). Cùng tests PASS sau sửa. Không sửa hay mở lại AUD-010/011/012.

Chrome cloud desktop 1348×926, Sites preview nội bộ. File/DataTransfer và IndexedDB là thật; file lấy từ placeholder local, Auth event và RPC/Storage transport là mock trong `tests/audit.html`. Không dùng native picker, không token hoặc request Supabase thật. Fixture có CSP và không forward fetch ngoài origin; liveRequests=0 là invariant của fixture, không phải số đo Network tab.

| Case | Kết quả quan sát / assertion | Trạng thái |
| --- | --- | --- |
| QA-A14a / AUD-013 | Seed legacy recovery-qa.pdf, restore; bật lỗi text trước restore để chặn cả autosave, bỏ file cũ/thêm pending-qa.pdf và đổi tiêu đề. Blob write vẫn khỏe, text báo lỗi. Inspect còn tiêu đề cũ + recovery-qa.pdf/header %PDF-; SIGNED_OUT rồi mở lại/restore vẫn đúng file cũ. Unit so sánh nguyên văn metadata, bytes cũ; thêm ca snapshot versioned → bỏ hết file → text fail, retry không copy blob lại | PASS offline + IndexedDB thật; kiểm lại trên source cuối: textUnchanged=true, files=1, draftFileRecords=3 (gồm version chưa publish), mở lại recovery-qa.pdf. [Ảnh snapshot cũ còn nguyên](qa/audit-013-partial-write-20261024.jpg) |
| QA-A14b / AUD-014 | Gắn old-qa.pdf synthetic vào bài; thay bằng PDF mới, reset counters, giữ response RPC. Khi usage/upload/save/remove=1/1/1/0, phát SIGNED_OUT rồi trả success. Metadata mock chỉ tham chiếu file mới; queue có đủ old-qa.pdf và path mới, remove vẫn 0; không editor/private UI, beforeunloadGuarded=false | PASS client + transport mock; [ảnh queue sau response muộn](qa/audit-014-late-response-20261024.jpg) |
| QA-A14c / response lỗi | Giữ RPC và bật fail-save; bỏ file cũ rồi save, xác nhận save=1 trước SIGNED_OUT/release. Response 409 trả muộn: queue giữ old-qa.pdf, remove=0. Nạp lại admin và Dọn tệp thừa: queue hết sau reference check, removedPaths=[] và remotePaths vẫn có old-qa.pdf. Assertion trên JSON bằng chứng đều PASS | PASS mock; kiểm cả nhánh rejection, không giả thành server commit |
| QA-A14d / luồng hợp lệ | Explicit discard sau các snapshot legacy/staged/versioned: drafts=[], draftFileRecords=0. Save hợp lệ sau đó có 1 PDF/header %PDF-, 2 bản ghi file cục bộ trước save; sau success còn đúng 1 attachment mới, removedPaths chỉ old-qa.pdf, queue=[], drafts=[], draftFileRecords=0. Assertion PASS | PASS local persistence + mock save/cleanup |
| QA-A15 / checks | 27/27 unit PASS; npm run check, build, format:check PASS. Hai test mới bảo vệ snapshot legacy và versioned qua partial write, retry/recovery và từ chối pointer sang draft khác. Browser regression response muộn dùng handler editor/main thật và fixture release ngoài dialog. CI xem đúng HEAD PR sau commit | PASS offline cục bộ |

Không thêm dependency, không đổi schema/Auth/CI. Không có app error/warn trong 20 log gần nhất đã xem; các log này chỉ từ chrome-extension. Dist không bundle audit fixture. Bản ghi snapshot cũ/staged được giữ đến discard hoặc confirmed save, có thể tăng dung lượng IndexedDB nếu đổi tập file nhiều lần; text-only/retry reuse blob. Cleanup queue vẫn phụ thuộc localStorage thiết bị. Chưa nghiệm thu JWT/Storage thật, native picker, Safari/thiết bị, hai context, full backup/restore, server signup/anonymous; không coi các mục đó là lỗi mới hay đã PASS.

<a id="draft-recovery-review-2026-10-24"></a>

## 2026-10-24 — review AUD-010/011/012

Source: commit tiếp nối `306958ff7d3df59bbc648af778ab79b2fa58f456` trên `fix/audit-reliability-20261024`. Trước sửa production source, fixture được bổ sung seed PDF synthetic, fault chỉ-read IndexedDB và bộ đếm dịch vụ để tái hiện cả ba lỗi. Sau sửa dùng cùng các điều kiện để kiểm regression. Chrome cloud desktop 1348×926, File/IndexedDB thật, Auth event và transport SDK mock; không Supabase/API thật hoặc OS filechooser. Không thêm dependency hay sửa migration/CI/config Auth.

| Case | Baseline và kết quả sau sửa | Trạng thái |
| --- | --- | --- |
| QA-A12a / AUD-010 | Seed text + 1 PDF; mở câu hỏi restore rồi SIGNED_OUT. Baseline textExists=false, files=0. Sau sửa textExists=true, textUnchanged=true, files=1; UI riêng đã đóng. Bấm X ở câu hỏi trong phiên hợp lệ cũng giữ nguyên snapshot và file | PASS mock Auth + local persistence |
| QA-A12b / AUD-011 | Bật fault **chỉ get** IndexedDB, write vẫn khỏe; chọn restore. Baseline tiếp tục editor thiếu file và autosave đổi snapshot/files=0. Sau sửa form inert, không autosave; tắt fault rồi inspect vẫn snapshot nguyên văn và 1 File/header %PDF-. Retry thành công mới cho phép sửa và autosave đủ file | PASS read fault injection + IndexedDB; [ảnh](qa/audit-recovery-read-failure-20261024.jpg) |
| QA-A12c / AUD-012 | Reset bộ đếm sau khi nạp admin; chọn PDF giữ signature, save, SIGNED_OUT, release signature. Baseline usage/upload/save/remove=1/1/1/1. Sau sửa 0/0/0/0; nháp vẫn chứa File/header %PDF-, beforeunloadGuarded=false. Public refresh metadata vẫn được phép, không tính là bước save. Không suy việc gọi RPC baseline là bằng chứng ghi sai quyền | PASS client cancellation; không JWT/RLS E2E |
| QA-A12d / explicit discard | Restore đầy đủ PDF rồi đóng/confirm; mở lại và bấm đúng Bỏ bản nháp → textExists=false, files=0. Editor sạch hiển thị dữ liệu gốc. X/SIGNED_OUT được kiểm riêng ở QA-A12a, không coi là consent xóa | PASS synthetic disposable draft |
| QA-A12e / normal save | Trong phiên mới, restore PDF được giữ sau save bị hủy; save bình thường → mock nhận 1 attachment, board hiện 1 tài nguyên, draft của bài đã lưu được dọn, draft fixture khác vẫn giữ | PASS transport mock |
| QA-A13 / offline regression | 25/25 unit: thêm 3 recovery tests cho lỗi đọc/retry, blob thiếu hoặc không thuộc order, thứ tự metadata + blob; thêm 4 guard tests kiểm trước usage, sau usage, sau upload đầu và sau reference lookup. Không lặp remote cleanup sau cancellation | PASS offline |

Không có app error/warn trong 100 log gần nhất sau khi loại chrome-extension. Fixture chặn chuyển tiếp request ngoài origin và dùng CSP; liveRequests=0 là invariant của transport, không phải Network-tab measurement. Không chạy lại SQL/REST/Auth/Storage live hoặc đổi dữ liệu runtime. Check/build/format PASS cục bộ, dist không có QA fixture/fault injection. CI phải xem trên đúng HEAD PR; run 40064785504 SUCCESS thuộc baseline 306958f, không dùng thay kết quả mới.

Các giới hạn còn giữ: native picker/OS, Safari/thiết bị, server signup/anonymous, JWT/Storage/signed URL thật, sync hai context và full backup–restore chưa nghiệm thu. Guard không thể hoàn tác request đã gửi và có thể đã commit trước SIGNED_OUT; chỉ chặn bước remote kế tiếp và giữ candidate cleanup cục bộ để kiểm tham chiếu sau.

<a id="pending-files-2026-10-24"></a>

## 2026-10-24 — điều tra và khắc phục AUD-009

Source: commit tiếp nối `bb30da0120443ddefdb146a025c8880bc68b0853` trên `fix/audit-reliability-20261024`; code/test trong commit chứa mục này. Đã giữ các cập nhật tài liệu của bb30da0. Chrome cloud desktop 1348×926 qua Sites preview; không gọi API/Supabase thật, không đổi Auth/schema/migration, không merge/deploy, không thêm dependency.

Fixture `tests/audit.html` nay tạo **File PDF từ placeholder local**, gán qua DataTransfer và phát change bubbling vào input thực; giữ `File.slice().arrayBuffer()` bằng barrier có nút release. Đây là fault injection File API, **không phải thao tác native filechooser/OS**. Native File/IndexedDB và các handler editor/main là thật; transport SDK và Auth event là giả lập. “Đăng xuất có lưu nháp” gọi đúng handler logout của app; nút hết phiên phát SIGNED_OUT giả lập. Không đọc token hoặc tạo session thật.

| Case | Bước và kết quả quan sát | Trạng thái |
| --- | --- | --- |
| QA-A10a — baseline | Production source vẫn bb30da0 khi thêm fixture. Chỉ chọn PDF, chưa sửa text: beforeunload guarded=true, chứng minh change đã đánh dấu dirty. Hết phiên trước release rồi trả signature → bản nháp của bài chỉ có text, files=0. Root cause là flush/cleanup quá sớm, không phải mọi file selection đều thiếu dirty | FAIL tái hiện baseline; root cause được sửa |
| QA-A10b — close | Chọn PDF đang chờ → bấm đóng: form inert/close disabled, chưa hỏi xác nhận. Release → mới hỏi rời form. Xác nhận → đóng; inspect đọc được 1 File tên pending-qa.pdf, header %PDF-, attachment_order đúng | PASS File API + IndexedDB |
| QA-A10c — hết phiên | Chọn PDF đang chờ → SIGNED_OUT: editor/private card/toolbar biến mất ngay. Inspect lúc chờ: verificationPending=true, beforeunloadGuarded=false. Release → nháp có 1 File/header %PDF-, không bật lại dirty toàn cục; mở lại editor và restore có PDF | PASS Auth event mock; không chứng minh token expiry thật |
| QA-A10d — logout/local failure | Giữ signature, bật lỗi IndexedDB, gọi logout → chờ file; release → không gọi sign-out, editor vẫn mở và file còn trong form. Bấm close/xác nhận cũng bị chặn. Tắt lỗi, logout → flush thành công mới hiện xác nhận; Hủy giữ form. Thêm file thứ hai đang chờ, logout/release/xác nhận → đăng xuất, nháp có đủ 2 File, header và thứ tự | PASS fault injection; IndexedDB thật khi không bật fault |
| QA-A10e — save failure/restore | Restore 1 PDF; chọn thêm PDF đang chờ, save → busy. Release → RPC conflict giả lập 409/40001; editor mở khóa, báo conflict và giữ nháp. Đóng/mở lại restore đúng 2 PDF; đọc IndexedDB có hai header %PDF- và ID thứ tự tương ứng | PASS client failure branch; [ảnh khôi phục](qa/audit-009-pdf-restored-20261024.jpg) |
| QA-A10f — save success/cleanup | Restore 2 PDF, thêm file thứ ba đang chờ, save/release signature; giữ response save rồi trả → payload có 3 attachments, board fixture hiện 3 tài nguyên. Inspect không còn draft của bài đó sau success; các draft fixture khác vẫn giữ | PASS transport mock; không chứng minh upload/save backend thật |
| QA-A10g — Auth race | Bắt đầu logout đang chờ signature rồi phát SIGNED_OUT trước release. UI riêng xóa ngay; release → file vẫn được flush, dialogs=0, beforeunloadGuarded=false; luồng logout cũ không mở lại confirm sau khi generation đổi | PASS Auth event mock |
| QA-A11 — offline regression | 18/18 Node tests; check/build/format PASS cục bộ, dist không có fixture/barrier/QA identity. Gồm 4 test mới cho writer: đợi signature trước khi đọc dirty/blob; lỗi blob/text/validation không báo success và có thể retry; queue settled chặn cleanup vượt các write đang chờ | PASS offline |

CI lịch sử bb30da0: run 40062401858 SUCCESS đã được đối chiếu qua GitHub. Kết quả này không chứng minh commit sửa tiếp; xem Checks trên đúng HEAD PR #2. Lượt này không rerun backend SQL/REST/Auth/Storage. Fixture chặn chuyển tiếp request ngoài origin và có CSP; liveRequests=0 là invariant của fixture, không phải đo Network tab. Không có app error/warn trong 100 log gần nhất sau khi loại chrome-extension; không suy là toàn bộ browser không có lỗi.

QA-A10 đã PASS trong phạm vi File API/barrier và IndexedDB trên Chrome. QA-A08 native filechooser vẫn BLOCKED/NOT RUN cho revision mới; JWT/Storage thật, server signup/anonymous, sync hai ngữ cảnh, Safari/thiết bị thật và full restore vẫn chưa nghiệm thu. Nếu browser đóng/crash hoặc không ghi được local storage, không hứa giữ được blob đang chờ.

<a id="audit-2026-10-24"></a>

## 2026-10-24 — regression sau audit PR #1

Bằng chứng lịch sử tại 16e8663 và ghi nhận docs bb30da0; phần AUD-009/QA-A10 hiện hành xem mục điều tra phía trên.

Source: `fix/audit-reliability-20261024`, parent `e5605d87ab5106f5b41d491b970aec68b744fc91`; nội dung ứng dụng trong commit chứa phần báo cáo này. Đã đọc AGENTS, OVERVIEW, STATUS, ARCHITECTURE, CODE_STYLE, COMMENTING_GUIDELINES, SECURITY, DATABASE, TESTING và các mục SPEC R08/10–14/19 liên quan trước sửa. Node 24, Vite 8.3.5, Supabase JS 2.118.0; không thêm dependency. Sửa cụ thể và root cause: [BUG_FIX_LOG](BUG_FIX_LOG.md).

Browser: Chrome cloud desktop, ảnh 1348×926, Sites preview nội bộ. `tests/audit.html` nhập module app thật; fixture chỉ ở dev, thay transport/identity bằng dữ liệu giả lập rõ nhãn, không tạo token/password. Fetch ngoài origin không được forward tới mạng; CSP chỉ cho connect cùng origin. Con số liveRequests=0 là invariant của fixture, không phải phép đo Network tab hoặc bằng chứng backend. Các bài và danh tính QA đều synthetic.

| Case / Rxx | Bước / mong đợi → thực tế | Trạng thái |
| --- | --- | --- |
| QA-A01 / R08/21 | Unit tạo 121 posts/1.210 attachments, cap provider 200 dù yêu cầu 500, sort_order trùng. loadBoard đủ 10 tài nguyên/bài; export đủ attachments/audit_logs. Kiểm 1.000 hàng đúng page boundary, table rỗng; fault count thiếu/đổi, trang thiếu, ID trùng, lỗi page → reject, không trả snapshot dở | PASS offline |
| QA-A02 / R08.1/10/19 | Nạp quản trị giả lập có bài PRIVATE; giữ response posts khi refresh; bật lỗi public; Đăng xuất → toolbar/bài riêng/count xóa ngay. Trả response cũ → public ErrorState, không còn bài riêng. Unit bảo đảm finally cũ không giải phóng slot mới | PASS mock + unit; [ảnh](qa/audit-logout-network-failure-20261024.jpg) |
| QA-A03 / R08.9/12 | Bật lỗi text store; tạo tiêu đề, đóng và xác nhận rời form → editor vẫn mở, tiêu đề giữ đúng, có thông báo nháp chưa lưu được. Không báo đã lưu nháp | PASS fault injection; [ảnh](qa/audit-draft-storage-failure-20261024.jpg) |
| QA-A04 / R08.9/12 | Lặp riêng với IndexedDB không mở được → không đóng, báo lỗi đúng. Tắt lỗi ở ca riêng; soạn text → đóng/xác nhận → inspect có đúng tiêu đề; mở lại/xác nhận restore → đúng tiêu đề. Dùng IndexedDB thật của browser cho ca thành công, không cần API | PASS; [ảnh](qa/audit-indexeddb-failure-20261024.jpg) |
| QA-A05 / R08.4/19 | Giữ response save giả lập; soạn tiêu đề “Snapshot bất biến khi đang lưu”, thêm 1 link và save. Form biến mất khỏi accessibility tree khi inert, close disabled; Tab/x/Escape không đổi tiêu đề/đóng dialog. Trả response → payload đúng tiêu đề và 1 attachment; inspect drafts=[] sau success. Ca riêng RPC 503 → editor mở khóa, giữ tiêu đề và báo QA save failed + nháp local, không báo success | PASS mock UI; không chứng minh lưu Supabase thật |
| QA-A06 / R11/19 | Unit Storage response lost ở file thứ hai + reference lookup fail: queue chứa cả 2 path đã thử. Retry chỉ xóa path không tham chiếu; truncated lookup không xóa. Queue 1.201 paths chia nhóm vẫn bảo vệ mọi referenced path | PASS offline, không upload/xóa file thật |
| QA-A07 / R09–11/19 | Chạy access.sql một batch thành công trên `dashboard`: anon/non-admin visibility/write denial, admin publish/conflict/FK/quota/reorder/audit không raise lỗi. Dùng admin đang có, fixture board/section riêng, ROLLBACK. Query sau rollback: active_admins=1, confirmed_active_admins=1, fixtures_remaining=0 | PASS SQL role simulation; không phải login JWT/file bytes thật |
| QA-A08 / R08.6/12 | Thử chọn PDF qua filechooser của công cụ → timeout, runtime browser và preview bị dừng; phục hồi preview để hoàn tất các ca text/logout. Không retry filechooser liên tục; không có bằng chứng PDF đã được chọn/lưu/khôi phục trong revision này | BLOCKED công cụ; không ghi PASS từ bằng chứng cũ |
| QA-A09 / source | Tại commit audit đầu tiên `16e8663`: npm test 14 tests (7 cũ + 7 regression), check/build/format-check toàn source; dist không có fixture/identity QA. Không chuyển kết quả đó thành PASS cho các commit tiếp theo | PASS cục bộ ở `16e8663`; CI ở HEAD PR là nguồn kết quả sau khi sửa |
| QA-A10 / R08.9/12 | Tại bb30da0 chưa chạy browser pending-file; sau đó đã điều tra lại root cause và kiểm chứng có barrier theo QA-A10a–g phía trên | Lịch sử NOT RUN tại bb30da0; hiện PASS trong phạm vi File API, không native filechooser |

Ngân sách test: toàn bộ debug browser/unit ở trên không gọi Supabase thật. Hai lần gọi execute_sql: lần đầu lỗi connector `Invalid or expired requestState` không có kết quả SQL; kiểm tra project ACTIVE_HEALTHY rồi thử lại một lần, batch rollback PASS. Không chạy test:api, login loop, upload thật, polling, realtime hoặc provider fault trên project thật. Không thay schema/policy/migration, Auth settings, account, hosting hay dữ liệu runtime bền vững. SQL audit identity sequence có thể tăng dù transaction rollback; đây không phải artifact nội dung test còn lại.

Console quan sát có lỗi `chrome-extension://...content-script.bundle.js` gửi metadata; không phải source app. Không dùng kết quả mock làm bằng chứng RLS hoặc JWT thật. Không chạy lại matrix responsive/device hay full restore trong lượt này. Pagination nhiều REST request không phải transaction snapshot; dùng version check và hướng dẫn backup nhất quán riêng.

Auth snapshot hiện tại đã thay đổi so với báo cáo 2026-10-23 dưới đây: admin active có email confirmed đã tồn tại. Server signup/anonymous chưa xác minh bằng công cụ. E2E Auth thật vẫn chưa có bằng chứng mới; không cần tạo thêm admin.

## 2026-10-23 — bằng chứng lịch sử


Source: develop, baseline `f145d555759af98e311c22b91f1433cf8890cbe1`; HEAD của commit chứa báo cáo là implementation được kiểm tra. Node 24.19.0, Vite 8.3.5, Supabase JS 2.118.0, Supabase PostgreSQL 17.11.0.003. Browser: Chrome cloud qua Sites managed preview `terminal.local:4173`; không phải deployment công khai.

| Case / Rxx | Bước và kết quả quan sát | Kết quả |
| --- | --- | --- |
| Unit R08/10/12/14 | `npm test`: URL credential/protocol, YouTube hostname, MIME/byte signature/2MB/10 items, tìm kiếm tiếng Việt, thứ tự bất biến, retention, nháp allowlist và quota. 7 tests | PASS |
| Source/build | `npm run check`: JS syntax, quét secret/JWT trong client, git diff whitespace. `npm run build`: frontend static dist; JS ~249kB / gzip ~68kB | PASS |
| Database R09/10/11 | access.sql trên project thật; transaction fixtures admin/non-admin, SET LOCAL role/JWT sub; public không đọc draft/hidden/attachment và không ghi/upload; non-admin không ghi/tự cấp quyền; admin RPC publish, conflict 40001, audit, FK, quota và reorder | PASS (SQL role simulation, không phải login JWT thật) |
| REST R10 | `npm run test:api`: public SELECT chỉ published; POST/PATCH/DELETE/RPC bị 401; upload Storage bị RLS từ chối | PASS (anon thật) |
| Public R05/07/22 | Quan sát 1 board, 3 chủ đề, 6 bài có nhãn Placeholder từ Supabase thật; không lấy học liệu Padlet | PASS |
| Search R07 | Nhập chuỗi không có nội dung → empty; `hinh anh` → khớp nội dung tiếng Việt; xóa query → bảng đầy đủ | PASS |
| Media R07 | Click card ảnh → tải → phóng to dialog; PDF mẫu tạo iframe và link local; click video → player YouTube thật hiển thị; link example.org đúng HTTPS/noopener | PASS UI/fixture; playback đến hết video/download Office NOT RUN |
| Responsive R05/14/19 | tests/viewport.html tải app thật trong iframe 360/390/768/1024/1440px. Body scrollWidth = width tương ứng 345/375/753/1009/1425 (trừ thanh cuộn dọc 15px). Mobile một cột/dropdown, chọn chủ đề03 đúng. Tablet board tự cuộn ngang, body không tràn | PASS Chrome iframe viewports; không phải Safari/iPhone/Android thật |
| Editor R08.9/12 | tests/editor.html là fixture **anon**, không giả backend thành công. Nhập tiêu đề chứa `<img …>` → preview giữ văn bản; javascript URL bị chặn. Tệp PDF mẫu chọn bằng filechooser → IndexedDB, đổi thứ tự lên đầu, rời form được cảnh báo; mở lại phục hồi text/PDF và thứ tự, PDF blob mở được | PASS fixture |
| Save failure R08/10 | Lưu nháp với fixture anon bị backend từ chối, hiện lỗi quyền; editor/text/files vẫn giữ, không báo thành công | PASS |
| Auth R08.1 | Mở màn hình login, đúng labels/email/password, không có signup. Chưa nhập thông tin đăng nhập | PASS UI; login/logout thật BLOCKED |
| Advisors | Security Advisor không có lint; Performance sau tách write policies chỉ còn INFO unused sections_board_order; không còn WARN. INFO unused index không chứng minh lỗi ở dataset mới | PASS security; performance recorded separately |

Lỗi đã sửa qua kiểm chứng: Vite allowedHosts cho preview; crypto.randomUUID chỉ có trong secure context nên dùng fallback getRandomValues; bảo toàn thứ tự tệp khi restore; chặn tương tác khi đang phục hồi blob; tránh báo lỗi lưu do cleanup localStorage; sắp xếp bài nguyên tử khi có rank trùng.

Console có lỗi từ `chrome-extension://...content-script.bundle.js` gửi metadata, không phải source app. Lỗi randomUUID thuộc app đã được sửa và browser fixture mở được sau sửa. Không kiểm tra Network tab tổng quát bằng API không có sẵn.

## Chưa đủ bằng chứng nghiệm thu

- BLOCKED/NOT RUN: SQL 2026-10-24 đã xác nhận một admin active có email confirmed; không cần tạo thêm admin. Chưa xác minh server signup/anonymous; login/logout thực, CMS/upload thật/thumbnail/signed URLs published→hidden, non-admin JWT thật và hai context độc lập sync chưa chạy. Test anon, mock và SQL role simulation không thay các bước này.
- NOT RUN: native filechooser/OS cho pending file (File API/barrier đã PASS QA-A10); mất mạng lúc soạn/upload, session expiry thật, upload một phần fail + orphan cleanup thực, quota provider thực, project pause, Safari/iPhone/Android thật, full backup/restore và production smoke. Ngưỡng quota đã có unit test, không phải mô phỏng provider hết quota.
- Thiếu ảnh wireframe quản trị đã duyệt; UI bám mô tả chữ, cần visual acceptance.
- Chưa deploy hoặc tạo Site vì chưa đạt gate bảo mật/chi phí/audience. Không dùng preview URL làm URL public.

[Ảnh giao diện desktop](qa/board-desktop.jpg). Fixtures tests/*.html chỉ phục vụ dev server, không có trong dist.

Advisor INFO reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index . Không xóa index FK/order chỉ vì chưa có tải thực tế.
