# Kiểm thử và browser QA

Nguồn tiêu chí đầy đủ: SPEC R05–08, R10–14, R19–22, R25. Không thay danh sách test của SPEC bằng bản rút gọn này. **Đã có ứng dụng và bằng chứng tại [QA_REPORT](QA_REPORT.md); các gate chưa chạy vẫn NOT RUN/BLOCKED, không được coi là Done.**

## Quy tắc bằng chứng

Mỗi case ghi: ID hoặc Rxx/tiểu mục, commit/config, môi trường/browser/viewport/danh tính, bước thực hiện, mong đợi/thực tế, trạng thái và bằng chứng. PASS chỉ khi thực sự chạy và quan sát; FAIL có tái hiện; BLOCKED có nguyên nhân; NOT RUN chưa chạy. Không in secret/PII hoặc token trong log/screenshot.

## CP01-C bounded hosted evidence — 2026-10-28

Owner-authorized synthetic-only acceptance is PARTIAL; [actual cases, finite query/request accounting and open gates](features/personal-gradebook/CP06_OFFLINE_READINESS.md#cp01-c--bounded-hosted-acceptance--2026-10-28). Native SQL/Edge/browser tests remain specialist and outside CI. Do not rerun the failed supplemental SQL transaction or infer limiter/concurrency PASS. The CP06-A matrix below is its historical offline baseline, not current deployment status; curated CI policy/allowlist is unchanged.

## CP06-A current offline concern matrix

Baseline4fc986e, feature/personal-gradebook. CP05 refinement is merged; [A1–A3 matrix and actual evidence](features/personal-gradebook/CP06_OFFLINE_READINESS.md). Eleven explicit pure/component test files remain the current curated allowlist. New decoded B4 payload projections are tested as plain data/functions/state; no HTTP/SDK/Edge/SQL/browser cases enter CI. Production services remain fail-closed. Historical counts and branch-specific QA snapshots below do not supersede this boundary.

| Concern | Focused evidence / gate |
| --- | --- |
| Verification envelope/requestId/expiry/context/catalog and strict private-field rejection | student-gradeboard.test.js; finite pure cases, generic errors, detached presentation metadata |
| Decimal strings,101 aggregates/occupied rendering, terminal401/403/409/422/429/503 and ownership | New projection/state tests plus retained CP03/CP04/CP05 pure cases; no network |
| Resize/ARIA/calendar/cancellation/private cleanup | Actual Work Chrome synthetic student fixture at360/390/768/1024/1440; iframe is not physical mobile/Safari |
| Board/nav/draft | Existing audit fixture column-navigation/refresh and text draft restoration with zero live requests; pure route/history/draft regression, no Board redesign |
| Server/runtime/deployment/security | Native17/Deno/hosted JWT/RLS/API/transactions/limiter/key recovery/CP01-C and real-data gate NOT RUN; no hosted request authorized |

## CP04 offline concern matrix

Baseline60fd760, feature/personal-gradebook. Current test:ci explicitly lists ten pure/component files, adding gradebook-scores.test.js; earlier nine/six-file snapshots are historical. No HTTP/API/SDK/Edge/SQL/browser integration enters CI. Production adapter remains unavailable; local Chrome intercepts Board/Auth and injects an isolated teacher adapter/catalog.

| Groups | Focused evidence |
| --- | --- |
| CP04-T01–T05 | Ordered catalogs, null/string revision writes, lexical precision/zero/absence, exact display/sort and publication acknowledgement; pure/component tests plus actual teacher UI |
| CP04-T06–T09 | Physical A–J/custom headers/trailing blanks/source coordinates, XML numeric precision/date/text identity, duplicates versus different subjects, invalid/unknown/mismatched records; pure extraction contracts plus actual CSV/XLSX Chrome files |
| CP04-T10–T13 | Per-coordinate/skipped counts, semester/input/token/expiry binding, structured422 versus409, no retry, publication independence/missing warning, cancellation/late-result disposal; pure ownership contracts plus synthetic Chrome operations |
| CP04-T14 | Existing curated tests; representative actual Board content, CP02 lookup disposal/unavailability and CP03 controls/two-column XLSX parser regression, without repeating their complete historical QA |

Merge inventory: gradebook-scores component/helper, no-transport catalog boundary, small admin/app integration, shared preview422/semester binding and roster parser extensions, score CSS, header-only public CSV/XLSX templates/exact build allowlist, one curated test file/package script, essential overview/status/code map/checkpoint/index/bug log/testing updates. B1–B4, migrations, dependencies/lock and specialist assets remain unchanged. Fixture adapters, raw synthetic test files, screenshots/downloads/logs/runners stay ignored under tests/local/cp04 and never enter application/CI bundles. Screenshots redact score-table rows; no raw identifiers/scores in logs.

Browser QA uses installed headed Chrome, isolated temporary profile, loopback CDP and finite synthetic fault injection. Real DB/Auth/RLS/transaction/precision round-trip, teacher catalog integration, publication missing-count preflight, CP01-C and real-data security gates remain NOT RUN; viewport checks do not establish native-device/Safari acceptance. Cancellation of a sent write is an unknown outcome until explicit reload, not proof of rollback.

## CP03 offline concern matrix

Baseline `1fcbf29`, feature/personal-gradebook. Curated CI now explicitly lists **nine** component/pure-unit files in package.json (seven existing plus gradebook-admin.test.js and roster.test.js). Earlier six-file B5 inventories below are historical. No HTTP, SDK, Edge, SQL or browser integration enters CI.

| Group | Pure coverage / installed-Chrome evidence |
| --- | --- |
| CP03-T01 | Auth-state gate and UUID fallback; direct admin/anonymous/failed/delayed routes and shared login |
| CP03-T02 | Independent metadata patch/string revision/no-op; class create/edit and conflict rejection |
| CP03-T03 | Student fields/confirmation/string IDs; real UI create/edit/status/delete guards |
| CP03-T04 | Ordinary DTO excludes identity/crypto; explicit reveal and retained-DOM/private-storage cleanup |
| CP03-T05 | Two-column positional records; actual BOM CSV and blank-header XLSX selection/preview/apply |
| CP03-T06 | Three-column names/trailing blanks; actual CSV/XLSX preview and preserving existing names |
| CP03-T07 | Quotes/commas/UTF-8/leading zeros/calendar/typed Excel dates, finite ZIP boundaries; actual numeric-ID/formula rejection and 1900/1904 files |
| CP03-T08 | Duplicate identity/original row+column; row4 error and mismatched-DOB server preview |
| CP03-T09 | Class/batch/token/expiry ownership; changed-file, stale/conflicting/failing apply, no automatic write retry |
| CP03-T10 | Cancellation/changed owner/late results; logout, route exit during pending work and real Back draft guard |

Merge inventory: CP03 component, production no-transport adapter, pure helpers, lazy file/worker parser, routing/Auth/menu/CSS integration; optional confirmation AbortSignal in existing primitives; two pinned parser dependencies/lock and MIT browser notices; two pure test files and exact notice allowlist in production guard; essential OVERVIEW/STATUS/CHECKPOINTS/README/code map/bug log/testing updates. Accepted B1–B4 and migrations/specialist assets are retained unchanged. Fixtures, raw files, screenshots, logs and Chrome tooling stay ignored under tests/local/cp03, never imported by application/CI. Browser adapter is injected only by local interception, never a production fallback. Supplemental Chrome component checks cover failed-page cursor recovery and pending confirmation disposal on Back/logout; their Board session is synthetic, distinct from the main shared-Auth QA.

read-excel-file9.3.12 (MIT) owns XLSX value/shared-string decoding; direct fflate0.8.3 (MIT) bounds actual ZIP output before reading. No custom general XLSX parser or paid service. Library is loaded on file selection in an abortable worker; build verifies separate chunks and static notices. Offline build/curated tests do not prove hosted transaction, authorization, encryption/recovery or real-data gates; these remain NOT RUN. Viewport QA is not native-device/Safari acceptance.

Docs-only kiểm tra tính đầy đủ, link, trạng thái, diff; không cần browser test tài liệu Markdown. Logic mới/được sửa về lưu dữ liệu, phân quyền, upload, sắp xếp, nháp phải có regression có ý nghĩa. Có thể dùng unit/integration miễn phí phù hợp; không test chỉ phản chiếu code. Chỉ cài dependency test khi thực sự cần.

## Chính sách kiểm thử tiết kiệm quota — bắt buộc

**Hiệu lực từ 2026-10-26, áp dụng cho toàn repository và mọi Work/Codex/agent, không chỉ Gradebook.** Đây là giới hạn thực thi bắt buộc của người dùng. Bảng ma trận nghiệm thu ở dưới mô tả *bằng chứng cần có khi được phép chạy*, không tự cấp phép phát sinh request hay chạy thêm bài test.

### Chọn bài test theo mức chi phí và mức độ cần thiết

1. **Trước khi chạy:** kiểm tra ref/HEAD và diff; xác định rủi ro thực, test nào đã có bằng chứng đủ và tập ca nhỏ nhất có khả năng bắt lỗi. Không “test toàn bộ cho chắc”, không chạy lặp chỉ để tăng số PASS. Với docs-only: kiểm tra nội dung, link và diff; **không** chạy unit/build/browser/backend.
2. **Mặc định offline:** code/static review → unit hoặc focused regression không có network → disposable in-memory/local SQL với fixture synthetic **chỉ nếu có lỗi database cần kiểm tra và chi phí tài nguyên nhỏ**. Full-suite offline chỉ chạy khi có phạm vi ảnh hưởng rộng, chính sách CI hiện hữu yêu cầu, hoặc đã sửa code sau lần chạy trước; tối đa một lượt cho cùng ref/trạng thái không đổi. Không cần cài bộ công cụ nặng hoặc dựng dịch vụ mới chỉ để có PASS.
3. **Từ chối stress/load/soak/stretch, benchmark request, test ngưỡng quota bằng khối lượng lớn, polling liên tục và test đồng thời quy mô lớn.** Không đưa các mục này vào kịch bản Work, CI hay checklist yêu cầu người dùng cấp phép. Nếu cần đánh giá contention/race, ưu tiên phân tích logic hoặc 2–3 giao dịch synthetic offline có kiểm soát; không lấy lưu lượng làm bằng chứng bắt buộc.
4. **Hosted/production/API/DB:** mặc định **không được gọi để kiểm thử**, kể cả metadata/SELECT, smoke, Auth, Storage, RLS, SQL Editor, RPC hoặc mở trang web có request thật. Chỉ thực hiện sau khi người dùng cho phép riêng hoạt động đó, ghi rõ môi trường và endpoint, mục đích, loại thao tác (read/write), giới hạn tổng requests/queries, fixture/rollback, retry policy và điểm dừng. Phê duyệt một lần không có hiệu lực cho các lần sau. Chạy test live **không được suy ra** từ quyền tạo/push code, tạo migration hoặc đọc tài liệu.
5. **Fail-safe:** không tự động retry sau lỗi/timeout/429/503 hoặc khi SQLSTATE 40001/transaction retry gây lặp; phải dừng và tra cứu tĩnh. Trước một test live đã duyệt, kiểm tra cấu hình SDK/proxy/DB có retry nội bộ và ngăn retry không giới hạn. Nếu cần chẩn đoán sự cố, ưu tiên log/bằng chứng có sẵn; không tạo sự cố hay mô phỏng tải trên hosted.
6. **Ngân sách kiểm thử:** trước mọi ngoại lệ live đã được duyệt, trình bày và tuân thủ giới hạn cố định do người dùng chấp thuận; hết giới hạn hoặc có bất thường phải dừng ngay. Không tự tăng budget, tự quay vòng nhiều ID/phiên hay chia batch để lách giới hạn. Chưa có mức được duyệt nghĩa là **0 request live**.
7. **Báo cáo:** phân biệt static review, mock, disposable DB, native DB và hosted; ghi lệnh/ca đã chạy, PASS/FAIL/NOT RUN/BLOCKED, số lượt, mức tiêu thụ request/query hosted (0 nếu không gọi) và các kiểm thử hoãn vì chính sách quota. Không ghi dữ liệu nhạy cảm. Khi test thật cần cho nghiệm thu nhưng chưa được cho phép, ghi **NOT RUN — quota policy / pending approval**, không tự hạ tiêu chí chức năng hoặc tuyên bố nghiệm thu tích hợp.

Quy tắc này **không xóa** các yêu cầu kiểm thử an toàn/bảo mật của SPEC hay CP01-C. Chúng là các gate phải được lên kế hoạch xin phép riêng, không phải lệnh chạy ngay. Xem thêm [AGENTS](../AGENTS.md#chính-sách-kiểm-thử-tiết-kiệm-quota--bắt-buộc).

### Chặn lặp sự cố PostgREST retry storm (GB-OPS-001)

**Một POST cũng có thể phát sinh rất nhiều truy vấn PostgreSQL** nếu function tự phát sinh SQLSTATE retryable như 40001 cho business conflict và PostgREST server retry. Trước khi viết/test Edge hoặc RPC mới: phân biệt conflict dự kiến với serialization error thực; dùng mã non-retryable (chẳng hạn PT409), rà soát effective function definitions sau toàn bộ migration, kiểm tra SDK/Edge/PostgREST retry và đặt điều kiện dừng. [Cảnh báo và bằng chứng](DATABASE.md#cảnh-báo-tái-diễn-gb-ops-001--sqlstate-retryable-cho-xung-đột-nghiệp-vụ).

Ba lượt Work thử Board HTTP smoke test trước đó đều BLOCKED trước Auth/RPC do thiếu secure admin-session transport; không được báo PASS, tự nới budget hoặc lặp prompt y hệt. Chỉ kiểm thử live khi có cách xác thực an toàn, budget và phê duyệt riêng. Lỗi lặp/timeout/429/503: dừng ngay, không retry. Đây là quy tắc chung cho mọi milestone.
## Ma trận nghiệm thu

| Nhóm | Phạm vi bắt buộc | Bằng chứng |
| --- | --- | --- |
| UI Phase 1 | 1 bảng / 3 cột / 6 bài có nhãn, tìm kiếm, modal, ảnh/PDF/link/YouTube, empty/loading/error | Browser thao tác thật + ảnh trạng thái quan trọng |
| Admin | Login/logout; CRUD cột/bài; draft/publish/hide/soft-delete/restore; chuyển cột/thứ tự; preview; nháp và cảnh báo rời form | Browser và reload kiểm tra persisted data |
| Upload | Nhiều ảnh, preview/thay/xóa/đổi thứ tự, tài liệu hợp lệ; dưới/ngang/trên ngưỡng 2 MB; mặc định 10 file, quá số bị từ chối; partial failure/orphan | Browser + metadata/storage/policy evidence |
| Security | Khách và non-admin không INSERT/UPDATE/DELETE/upload; không đọc draft/hidden/deleted/file; admin ghi đúng quyền; URL/XSS/CSP/secrets | API trực tiếp dưới đúng danh tính + UI |
| Sync | Ghi thành công rồi client khác nhận bản mới; active/manual refresh; ngắt realtime và lỗi kết nối; không dùng localStorage làm nguồn chuẩn | Hai ngữ cảnh độc lập; ghi độ trễ và trade-off |
| Reliability | Offline khi soạn/upload; refresh có nháp; session hết hạn; file mất; provider pause; quota gần giới hạn; board rỗng | Ca tái hiện hoặc fault injection minh bạch |
| Responsive / a11y | 360, 390, 768, 1024, 1440px; Android/iPhone/desktop/tablet theo khả năng; focus/keyboard/dialog/labels/alt/title/contrast/reduced motion | Browser/viewport thật đã chạy, không suy rộng |
| Performance | Lazy-load/thumbnail, không tải tất cả attachment bytes, debounce, N+1/index, listeners/subscriptions | Check có mục tiêu + phạm vi đã đo |
| Backup/restore | Export DB/metadata + Storage, restore và quyền truy cập đúng | Thử trên đích an toàn, đối chiếu dữ liệu |
| Production | URL/HTTPS/audience/public read/admin/config đúng snapshot | Native deploy status + smoke thực tế tách riêng |

Nếu chỉ có một browser/context, không dùng hai tab chung session giả thành hai danh tính độc lập. Nếu công cụ không đổi viewport được thì ghi kích thước chưa test, không ghi PASS mobile từ ảnh desktop. Test kích thước viewport không thay test trình duyệt/thiết bị iPhone thật. Không hứa Safari QA từ Chrome.

Khi không thể mô phỏng offline, hết quota, pause hoặc expired session bằng công cụ hiện có: ghi BLOCKED/NOT RUN, không tác động production để gây lỗi. Mock được ghi là mock, không chứng minh backend thật. Test dữ liệu trên đích test được phép; không tự xóa/purge dữ liệu production.

## Browser QA trong Work

Theo WORKFLOW và reference preview của skill Sites. Kiểm tra browser/preview thực tế; tương tác nhập/click/keyboard rồi quan sát state, ảnh và log phù hợp. Phân biệt lỗi app với extension của môi trường, không giấu lỗi có ảnh hưởng. Không tuyên bố đã kiểm tra request/network nếu công cụ không hỗ trợ quan sát tương ứng.

Môi trường browser không có resize/network độc lập; đã kiểm tra responsive bằng iframe viewport thật tại tests/viewport.html. Cách này không thay kiểm thử thiết bị. Quyền đăng nhập đi qua cơ chế browser authentication được hỗ trợ, không nhập credential bằng script không an toàn.

## Gate hoàn tất

Phase UI cần browser QA các luồng/viewport liên quan. Done sản phẩm cần toàn R25 (20 điều kiện), tests R19, bảo mật R10/Storage và backend thật. Nếu thiếu điều kiện, bàn giao rõ trạng thái tạm thời; không gọi hoàn tất. Chỉ chạy lại/bổ sung test khi thay đổi mới, lỗi hoặc nghi ngờ chưa giải quyết cần kiểm chứng, tránh chạy lặp toàn bộ không có lý do.

## CI offline (GitHub Actions)

Workflow `.github/workflows/ci.yml`: `workflow_dispatch`, PR hướng tới `develop/main`, push (gồm merge) vào `develop/main`. Một job trên Ubuntu + Node 24, checkout full history, quyền `contents: read`, không token/secret của Supabase.

| Check CI | Phạm vi | Trạng thái chứng minh |
| --- | --- | --- |
| `npm ci` | Cài dependency từ lockfile | Chỉ đánh giá khi workflow chạy |
| `npm run check` | Syntax frontend +13 Edge JS; frontend secret rules unchanged, server env references allowed but literal key/JWT patterns denied; git diff whitespace | Offline |
| `npm run test:ci` | Explicit ten-file component/pure-unit allowlist; npm test delegates to it | No wildcard discovery, SDK/API/Edge/service/SQL/browser integration |
| `npm run build` | Static bundling Vite | Offline, không deploy |
| `npm run format:check` | Prettier exact3.6.2 local devDependency/lock; frontend/test/scripts và supabase/functions JS | Không còn baseline miễn trừ; đầy đủ file trong phạm vi script |

**Superseding B5 policy:** CI chỉ syntax/static/format/build và curated component/pure units, cấm API/HTTP endpoint hoặc Supabase Auth/RPC/Storage/Edge integration kể cả mocked transport, SQL/PGlite/PostgreSQL/migrations, runtime integration, browser E2E và stress/load. Không thêm PGlite dependency/runner; approval cũ đã bị thay thế. [B5 matrix và inventory](features/personal-gradebook/B5_OFFLINE_REVIEW.md#current-policy-correction--baselinec9e18c1-supersedes-sql-ci-approval) liệt kê six-file allowlist và toàn bộ specialist assets không dự kiến merge develop nếu chưa có quyết định riêng. test:specialist là lệnh thủ công tách riêng, không tự cấp quyền chạy. Các hướng dẫn full-suite cũ bên dưới không ghi đè policy này; lịch sử120 Node/20 SQL nhóm không phải gate hiện hành.

Theo yêu cầu tránh quota: **không đưa** `npm run test:api`, `supabase/tests/access.sql`, test Auth/RLS/Storage live hay browser E2E vào CI. Chúng vẫn thuộc ma trận nghiệm thu thủ công khi được giao riêng; một CI PASS không tương đương backend/browser PASS. `npm run format:check:all` là alias của gate format hiện tại; source code thực thi đã được format trong commit `4058de8`, không có baseline miễn trừ.

GitHub yêu cầu workflow có trên default branch (`main`) trước khi nút **Run workflow**/`workflow_dispatch` hoạt động. Trước đó có thể dùng PR checks; không merge vào main chỉ để kích hoạt manual.

## Lệnh hiện có

`npm test` chạy unit regression không gọi backend; `npm run check` kiểm tra syntax/credential scan/diff; `npm run build` bundle static. `npm run test:api` gọi API bằng publishable key, không lấy token admin. `supabase/tests/access.sql` chạy owner SQL Editor với fixtures rollback (SET LOCAL role và JWT sub), không phải phiên login thật. Xem QA_REPORT trước khi mở rộng ma trận; không chạy destructive test trên dữ liệu thật.

## Kiểm thử sau audit không hao quota

- Bắt đầu bằng `npm test` (38 tests sau AUD-017), `npm run check`, `npm run build`, `npm run format:check`. Service regression nhận client fixture riêng; mọi fetch thật trong test file bị chặn. Không thêm API/SQL live vào CI.
- Browser mở `/tests/audit.html` trên preview local: dữ liệu synthetic và nhãn QA rõ ràng, transport/CSP chặn kết nối ngoài origin. Có fault text store, IndexedDB, save chờ/lỗi, public refresh lỗi và response quản trị trả muộn. Dùng các nút/fields thật để tái hiện QA-A02–A05 trong QA_REPORT.
- QA-A10/AUD-009 dùng fixture barrier để không phụ thuộc tốc độ filechooser: nạp quản trị giả lập, sửa bài, bấm **QA: chọn PDF và giữ xác minh**. Đây là File/DataTransfer/change bubbling từ placeholder local, không phải native picker. Bấm close/logout/save trong lúc file chờ; chỉ dùng **QA: hoàn tất xác minh** để cho phép đi tiếp. Kiểm nháp qua nút fixture: tên File, header %PDF-, số lượng/thứ tự; mở lại và restore. Các nhánh close, logout, SIGNED_OUT, IndexedDB fail, RPC conflict/success và Auth race đã PASS trong QA_REPORT.
- Để kiểm forced SIGNED_OUT, bấm **QA: hết phiên giả lập** khi signature còn chờ: UI riêng phải xóa ngay. Dùng **Trả kết quả xác minh file** ở ngoài editor rồi inspect; không mở lại dirty/confirm của phiên cũ. Hàng đợi phải flush trước cleanup. Native filechooser/OS vẫn cần ca riêng; ghi NOT RUN/BLOCKED nếu không chọn được, không suy PASS picker từ File API. Không mở tests/editor.html hoặc viewport.html cũ để debug lặp vì chúng gọi Supabase thật.
- Sau khi diff và regression offline ổn mới gom backend tests thành batch có mục tiêu. `supabase/tests/access.sql` chọn admin active hiện có hoặc fixture rollback khi chưa có, dùng board/section riêng, quota so với baseline, ROLLBACK. Không cần seed; không deactivate admin thật hoặc reorder cột nội dung thật. Nếu lỗi SQL: đọc/điều tra trước, không retry nguyên batch liên tục. Nếu lỗi connector: xác minh kết nối rồi chỉ thử lại có giới hạn.
- Mock PASS chứng minh nhánh xử lý client; SQL role PASS chứng minh assertions dưới SET LOCAL role/sub. Cả hai không thay login JWT, upload/private file thật hoặc full restore. Case thiếu môi trường ghi BLOCKED/NOT RUN. Filechooser timeout trong QA-A08 không được suy thành blob recovery PASS.
- Mỗi bug mới/bug tái mở phải có trace trong [BUG_FIX_LOG](BUG_FIX_LOG.md); QA_REPORT giữ evidence và STATUS chỉ giữ snapshot ngắn. Không đưa PII, token, file runtime hoặc backup vào log/Git.

### Regression khôi phục và save hết hiệu lực

Dùng tests/audit.html và chỉ dữ liệu synthetic của UID audit-fixture. Nút **Tạo nháp PDF để kiểm tra khôi phục** tạo đúng text + blob cho bài PRIVATE QA, ghi snapshot để inspect so sánh byte-for-byte metadata. Không seed hoặc xóa nháp tài khoản thật.

- QA-A12a/d: mở câu hỏi restore; phát SIGNED_OUT bằng nút QA trong dialog hoặc bấm X → snapshot/file phải giữ nguyên. Chỉ **Bỏ bản nháp** mới cho phép xóa. **Khôi phục** chỉ mở editor đầy đủ sau khi đọc đủ file.
- QA-A12b: bật **Chỉ lỗi đọc IndexedDB**, restore → form phải inert, có retry/giữ nháp. Tắt fault bằng nút QA trong editor rồi inspect trước retry: textUnchanged=true và files=1. Retry thành công mới cho phép ghi. Fault chỉ-read giữ write khỏe để phát hiện autosave ghi đè; không dùng lỗi toàn store che khuất lỗi này.
- QA-A12c: **QA: đặt lại bộ đếm dịch vụ**, chọn PDF đang chờ, save → SIGNED_OUT → release file ngoài editor → inspect. usage/upload/save/remove phải đều 0 và File vẫn ở nháp. Các read public sau logout là luồng riêng, được phép. Unit guard còn kiểm cancellation khi quota/upload/reference lookup đã bắt đầu.
- Request đã gửi trước khi cancel không thể được coi là đã hoàn tác; không thử gây expiry thật hay lặp upload debug trên Supabase để chứng minh điều đó. Native File API/mock không thay native picker, JWT hoặc RLS thật.

### Regression AUD-013/014 — ghi một phần và response muộn

Chạy offline trước; không lặp API/Supabase để debug. Bằng chứng [QA-A14](QA_REPORT.md#partial-draft-late-save-2026-10-24). `npm test` chứa hai test snapshot mới; browser dùng `tests/audit.html` với transport/Auth mock và IndexedDB thật.

- AUD-013: seed PDF, bật **Lỗi lưu nháp văn bản** trước restore để chặn cả autosave, rồi đổi tập file/tiêu đề. Bỏ file cũ, chọn PDF synthetic, release signature; inspect phải giữ title/file/header cũ dù ghi blob vẫn hoạt động. SIGNED_OUT → tắt fault → nạp admin → mở/restore phải đủ file cũ. Khi fault bật trước restore, seedState.textUnchanged phải true. Nếu bật sau một restore khỏe, autosave có thể đã đổi saved_at nên không dùng snapshot seed làm mốc byte-for-byte. Unit so sánh byte-for-byte metadata và bytes qua lỗi ghi một phần, sau retry phải đọc đúng snapshot mới.
- AUD-014 success: gắn file Storage cũ giả lập, mở editor và discard draft thử nghiệm nếu có; thay file cũ bằng PDF mới, bật **Giữ response lưu bài**, reset counters, save. Inspect xác nhận save=1 rồi SIGNED_OUT; dùng **Trả response lưu bài sau hết phiên** ngoài editor. Queue phải có file cũ + mới, metadata mock chỉ giữ file mới, remove=0. Không coi chờ signature là chờ RPC; đây là hai race khác nhau.
- AUD-014 rejection: lặp với **Lỗi lưu bài giả lập**; response lỗi sau hết phiên vẫn giữ candidate cũ. Phiên admin mock tiếp theo Dọn tệp thừa phải giữ file vẫn được metadata tham chiếu; removedPaths không có file đó. Chạy một save hợp lệ để kiểm dọn đúng file cũ và xóa toàn bộ version local: drafts=[], draftFileRecords=0.
- Chỉ thao tác dữ liệu synthetic. inspect chỉ đọc/count record thuộc UID audit-fixture; removedPaths là đường dẫn transport mock, không phải bằng chứng xóa Storage thật. File picker, Safari, JWT/Storage thật và hai context vẫn cần lượt nghiệm thu riêng.

### Pulse feedback / AUD-015

Dùng audit fixture, không test live để xem animation. Chọn loại thao tác, bật Giữ phản hồi thao tác, thực hiện đúng UI action; inspect có operationCalls/heldOperations. Kiểm pulse + mô tả đúng công việc, inert/disabled và keyboard trong lúc chờ. Release bằng nút ngoài app hoặc nút QA trong dialog; status phải hết và thao tác mở khóa khi success/failure. Có fault theo loại; tắt lỗi rồi retry một lần. GET 503 có retry hữu hạn của SDK nên chờ kết quả cuối, không thêm click/retry liên tục.

- Re-order và CRUD post/section: kiểm đúng kết quả sau response, không chỉ pulse xuất hiện. Bấm lặp không thêm request. Post upload: barrier file để kiểm pulse chờ xác minh, rồi save/publish; mock lỗi giữ nháp và mở khóa. Scroll tới footer và assert status vẫn ở `.dialog-heading` trong viewport. Autosave pulse nằm inline tại draft-status, không làm form nhảy phía trên.
- Refresh, export, cleanup, quota: chọn target tương ứng; cleanup cần Tạo candidate cleanup giả lập trước. Gallery ảnh dùng mock signed URL và SVG local. Mô phỏng đăng nhập không credential chỉ kiểm loading/error của form rỗng qua adapter mock, không chứng minh login hợp lệ; không nhập credential thật.
- SIGNED_OUT khi response còn chờ phải xóa pulse cũ/private UI; response muộn không clear status mới hoặc hồi sinh dữ liệu riêng. File pending giữ các assertion QA-A12c/A16g, reset counters sau admin/quota read trước kiểm request ghi.
- Responsive offline: `/tests/viewport.html?fixture=audit` chọn trước iframe src nên không mở live entry trung gian. Các width360/390/768/1024/1440 và dialog390 chỉ chứng minh Chrome iframe. Default viewport fixture vẫn gọi app thật, tránh mở nhầm khi debug. CSS reduced motion phải giữ label/dot; OS preference, Safari/device thật vẫn cần lượt riêng.

Bằng chứng và các giới hạn: [QA-A16/A17](QA_REPORT.md#pulse-feedback-2026-10-24). Không thêm minimum loading delay, polling, hoặc backend request chỉ để chạy pulse.

### Phiên qua reload / AUD-016

Theo SPEC R08.1, xem [QA-A18](QA_REPORT.md#auth-reload-2026-10-24). `tests/auth-session.test.js` dùng SDK thật với adapter tab trong memory và transport synthetic; chặn global fetch/localStorage. Kiểm restore, refresh phiên hết hạn, tab độc lập, logout rồi tạo lại client, storage bị chặn, user không khớp và profile inactive/non-admin/lỗi. Không in token.

Browser mở `/tests/session.html` trên Vite localhost, không mở `/` để thử Auth thật. CSP chặn kết nối Supabase; fixture chỉ forward fetch cùng origin, Auth/REST bên ngoài được giả lập. SDK và sessionStorage thật, credential synthetic `qa@example.invalid` / `synthetic` chỉ có nghĩa trong fixture; không nhập tài khoản thật. Style inline được phép riêng ở fixture cho CSS do Vite inject, không thay CSP production.

- Đăng nhập QA hoặc dùng form thật với credential synthetic → reload → Quản trị viên và PRIVATE QA xuất hiện; Inspect có storedSessions=1, authInLocalStorage=false. Tab mới độc lập vẫn là khách.
- Giữ xác minh quyền → reload → boardReads=0/privateVisible=false, chưa có toolbar. Phát SIGNED_OUT → Trả xác minh cũ → chỉ PUBLIC QA, storedSessions=0. Đăng xuất bằng toolbar rồi reload cũng không khôi phục admin.
- Đăng nhập lại → Thu hồi admin giả lập → reload: không có toolbar/private. Bỏ toggle, bật Lỗi xác minh user → reload: boardReads=0, hiện Thử lại; tắt lỗi và retry mới khôi phục quản trị. Tắt toggle trước ca kế tiếp vì chúng tồn tại qua reload.
- `/tests/session.html?blocked=1`: form báo không giữ phiên, login memory vẫn dùng được, reload trở lại khách và không dùng localStorage. Ca này chỉ mô phỏng storage bị chặn ngay khi khởi tạo.
- Form ở iframe 360px dùng `/tests/viewport.html?fixture=audit`; không mở mặc định vì default gọi app thật. Đây là IAB/iframe, không thay Safari/iPhone/Android hoặc chứng minh Auth/JWT/RLS thật.

Checkout Windows có thể đổi LF trong Git thành CRLF. Lượt AUD-016: gate `npm run format:check` nguyên bản FAIL ở 32 file không sửa; check cùng scope với `--end-of-line auto` PASS. Không format toàn repo để che khác biệt môi trường; CI vẫn giữ cấu hình LF gốc, cần xem kết quả ở đúng commit khi đẩy lên GitHub.

### Điều hướng nhiều chủ đề / AUD-017

Theo SPEC R05.2, bằng chứng [QA-A19](QA_REPORT.md#board-navigation-2026-10-25). Test frontend và fixture tập trung trong `tests/`, xem [tests/README](../tests/README.md). `tests/local/` chứa ảnh/scratch/check logs chỉ dùng máy hiện tại, được Git và Prettier ignore; không chuyển test regression cần chạy lại vào vùng ignore.

Unit `board-navigation.test.js` kiểm anchor bị cắt một phần, refresh, chèn/đổi thứ tự trước anchor, tính lại theo độ rộng mới, xóa anchor và clamp khi không overflow. Không thêm dependency DOM test. Browser dùng `/tests/audit.html?scenario=navigation`: 8 cột, bảng dài, Auth/transport mock, không forward request Supabase. Fixture inspect đọc DOM thật; observer giữ tối đa 8 toast đã hiển thị để không mất evidence khi client chậm.

- Cuộn trái/phải từng cột; kéo native scrollbar phía trên và dùng keyboard → offset hai chiều khớp, nút biên disabled. Cuộn dọc giữa bảng → nav top=0 trong workspace, không theo footer. Lọc một chủ đề hoặc không overflow → nav ẩn. Không có “Đi đến”.
- Cuộn ngang rồi Làm mới → giữ anchor/offset. Tạo chủ đề, hold write → chưa có cột mới; release thành công → đúng ID/tiêu đề có “Vừa thêm”, focus sau pending unlock, giữ tab Tất cả trên desktop. Kiểm vị trí đầu/cuối theo giá trị Vị trí.
- Write fail → giữ form/nội dung, không thêm cột giả; tắt fault/retry mới reveal. Write thành công + read fail → giữ snapshot và toast chưa đồng bộ, không che bằng success toast. Tạo khi search không ra kết quả → bỏ tìm kiếm che cột sau snapshot xác nhận. SIGNED_OUT khi create đang chờ → release không hồi sinh toolbar, highlight hoặc focus cũ.
- `/tests/viewport.html?fixture=audit&scenario=navigation` kiểm iframe360/390/768/1024/1440; mobile giữ một cột và chọn đúng chủ đề mới sau save. Kiểm DOM root clientWidth=scrollWidth, nav chỉ hiện desktop overflow. Không suy iframe thành Safari/iPhone/Android thật. Reduced-motion đã có nhánh source; OS preference thật chưa nghiệm thu.

Logs/ảnh local tại `tests/local/`, không đưa vào Git/ZIP nguồn. CI không đổi cấu hình, không tự chạy backend và cần kiểm ở đúng commit khi push. Backend save/RLS/JWT thật vẫn thuộc lượt nghiệm thu riêng; không dùng kết quả mock để báo đã lưu vào project thật.

## CP05 offline concern matrix

Baseline741ee3d; `tests/student-gradeboard.test.js` is an explicit curated pure-unit addition, with no HTTP/SDK/SQL/browser integration. DTO projection/catalog ordering, exact B1 half-up bucketing, zero/absence, scope mismatch/peer-field rejection, terminal errors, latest-generation ownership, capability revocation/disposal and pre-cancelled reads are finite offline cases. Existing CP02 tests remain in CI. Actual Chrome UI QA uses ignored tests/local/cp05 adapters; never a production synthetic fallback.

Browser evidence: same-origin iframe CSS widths360/390/768/1024/1440; table horizontal containment,101-bucket chart, selected raw score/highlight, dropdowns, Escape/focus, unavailable semester/other-semester continuity, empty/429/503, held-response selection/close/route cancellation, server401 and sign-out cleanup. Browser fixtures block external fetch and mock Board client; no real credentials or student information. Physical devices/Safari, real Auth/RLS/DB/Edge/limiter/publication and CP01-C NOT RUN. No specialist assets removed or additional dependencies.
