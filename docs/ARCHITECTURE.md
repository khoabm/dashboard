# Kiến trúc và cách code

Hợp đồng: SPEC R03, R06, R09, R12–17, R20. Quy ước và code map dưới đây áp dụng cho implementation của branch đang đọc; nghiệm thu runtime xem STATUS/QA_REPORT.

## Sơ đồ mô hình sản phẩm

**Vui học cùng cô Quỳnh** là website tổng thể. **KHTN8 Board** chỉ là tên lịch sử của
ứng dụng Bảng học liệu, không phải giới hạn môn/lớp của toàn website.
[Mô hình, đối tượng và công dụng](PRODUCT_PROFILE.md).

`src/app.js` và `src/components/site-navigation.js` điều hướng giữa Bảng học liệu
(`/`), Bảng điểm cá nhân (`/personal-gradebook`) và Quản lý bảng điểm/lớp
(`/personal-gradebook/admin`). Trợ lý học liệu được tích hợp trong Bảng học liệu,
không phải một route quản trị.

Bảng học liệu và Gradebook có nguồn dữ liệu, quyền và gate nghiệm thu riêng.
Không coi menu/route là authorization. Catalog trợ lý được chiếu từ bài published
phía client, **chưa thay thế xác minh provenance từ server**; Worker/AI mặc định tắt.
SPEC R01–R28 gốc chủ yếu mô tả Board/hạ tầng; nghiệp vụ Gradebook xem brief riêng.

## Ranh giới

- Frontend tĩnh render UI, xử lý tương tác, validate sớm, gọi Supabase SDK bằng publishable key.

- Supabase PostgreSQL là nguồn dữ liệu chính. Auth xác thực một admin; RLS và Storage policies quyết định quyền thực tế.

- localStorage giữ nháp văn bản/tùy chọn; IndexedDB có thể giữ blob tạm. Không coi dữ liệu cục bộ là đã đồng bộ hoặc thay nguồn chuẩn.

- Storage giữ học liệu runtime. GitHub chỉ giữ source, placeholder hợp pháp và migration/seed. Đăng/sửa bài trên Supabase không cần deploy frontend.

- Sites phục vụ quy trình phát triển/preview/QA/hosting có điều kiện, không là backend dữ liệu. Không thay Supabase bằng storage hay danh tính ChatGPT.

## Quy ước module

| Vị trí dự kiến | Trách nhiệm |
| --- | --- |
| src/app.js | Generation-owned route pulse; path-only History routing; lazy Board/SDK graph; shared navigation; disposes student state on exit/sign-out/page lifecycle |
| src/utils/app-navigation.js | Pure indexed history/compensation and pending administrator-entry coordinator; no SDK/DOM/network; rejected traversals never push an entry |
| src/main.js | Board bootstrap/render/Auth; shared restoration promise + direct openBoardAdmin for both headers; suspend route refresh; flush editor-owned drafts before route exit |
| src/utils/public-retrieval.js | Full public corpus projection/index,1000/160 chunks, IDF/diverse shortlist, V3 offsets/native source mapping, local bounds/coverage and24KB prompt; no storage/network |
| src/utils/public-temporal.js | Injected Asia/Ho_Chi_Minh clock, civil ranges, typed date evidence, conservative date/number/uncertainty guards; no event schema or publication inference |
| src/utils/assistant-learning.js | V2 deterministic intent/site profile and exact published inventory, one-question/three-source context validation and strict generated status/answer/IDs/coverage contract; no network/storage |
| src/utils/assistant-diagnostics.js | Fixed failure-stage/reason identifiers and sanitized receipt projection shared by Worker/controller; no raw prompts, model responses, credentials or network |
| src/utils/assistant-chat.js; workers/board-assistant/live.js | Normal ongoing chat protocol, fresh anonymous published Board read, BGE/Qwen hybrid/general answers, short native rate limit and recoverable errors; no Pilot admission/DO calls |
| src/components/board-assistant.js; src/styles/board-assistant.css | Native modal, memory-only bounded conversation, opt-in cloud disclosure, pending/cancel/error and explicit read-only action buttons; invalidated by Board refresh/route exit |
| src/utils/board-assistant.js; src/services/board-assistant.js | Published-only public text projection, keyword fallback, exact-quote validation and action allowlist; disabled-by-default bounded no-retry transport, no Auth/Gradebook/history persistence |
| workers/board-assistant/index.js; wrangler.jsonc | Separate BGE-M3/Qwen V1 excerpt/V2 grounded-answer preview Worker and SQLite Durable Object allowance/stop flag; loopback CORS, expiry and finite inference budget; no Supabase/D1/R2/content storage |
| workers/board-assistant/preview.js; preview-fixture.js | Deployed admission entry: expiring hashed owner bearer, server-approved synthetic windows, fixed owner-approved DO identity, read-only status. Core inference uses Worker clock; client clock only ranks local candidates |
| workers/board-assistant/budget-policy.js | Fixed legacy3, V2 pilot5 and separately owner-approved UAT3 identities/prefixes; same DO namespace/class, no reset or generated identities |
| scripts/owner-preview-start.mjs; owner-preview-stop.mjs; owner-ai-hosted.mjs; tests/owner-ai-preview.* | Loopback synthetic owner demo and optional real hosted session; fresh Free receipt/live settings/status gates, memory-only bearer, fixed pilot40/UAT60 cumulative ledger profiles, expiry and verified disable/revoke. No new dependency/service installation |
| scripts/owner-uat-setup.mjs; tests/assistant-owner-uat-flow.test.js | Exclusive one-time UAT ledger setup carrying34/60, immutable incident hash, QA1/owner2 and same-namespace UAT3 admission; --uat Start never initializes/replenishes allowance |
| tests/board-assistant*.test.js | Pure projection/action tests and explicitly manual Worker/transport specialists, outside unchanged curated CI; V2 pure/specialist tests and explicit assistant-learning-browser.cjs/board-assistant-ui.html fixture; generated artifacts remain ignored under tests/local |
| src/components/app-header.js, site-navigation.js | Shared branding/admin controls; accessible Board/lookup menu plus verified-admin entry; header-owned pulse awaits existing logout Promise |
| src/components/gradebook-admin.js | Class/student dialogs, full-snapshot local pagination/filter/sort, confirmed export, reveal/import ownership and route/session disposal |
| src/components/gradebook-scores.js | Teacher semester/subject workspace, full-snapshot sorting/local pages, draft-preserving sorting, confirmed both-semester export; existing CRUD/publication/import and cancellation |
| src/components/gradebook-table-controls.js | Shared keyboard sortable headers/aria-sort, export format controls, complete-list comparator and stable identity hierarchy |
| src/utils/gradebook-export.js, gradebook-xlsx.js, gradebook-snapshot.js | CSV serializer and standalone styled OOXML workbook generator (roster one sheet; scores HKI/HKII); full snapshot semester joins using existing pure DTO validation. Inline text cells preserve identifiers/raw points, no formulas or persistence. |
| supabase/functions/_shared/snapshot.js; new gb_class_snapshot migration | Admin/session/class-locked snapshot; server-memory identity decryption, rank-only ordinary responses, separately confirmed full export and class/count audit; grades-admin v7 and ledger20261031002916 deployed after owner approval; bounded synthetic hosted acceptance |
| src/utils/gradebook-scores.js | Pure ordered catalog projection, B1 decimal comparison/input, score-page DTOs, mutation/publication preconditions and A–J batch validation |
| src/services/gradebook-catalog.js | Scoped catalog.read through the same verified teacher request; current classId required, strict teacher catalog projection |
| src/utils/gradebook-admin.js, roster.js | Pure input/DTO projection, cancellable operation/preview ownership and bounded positional CSV/roster validation; reuse B1 |
| src/services/gradebook-admin.js | CP06-B teacher service with injected cached Board session; operation DTO validation, safe structured422 and terminal errors |
| src/services/gradebook-transport.js | Explicit opt-in Edge HTTP boundary, publishable config/headers, abort+deadline and bounded JSON; disabled by default, no retries/fallback |
| src/utils/gradebook-admin-responses.js | Pure teacher request allowlist and strict response projection; no HTTP/SDK/credentials/storage |
| src/services/roster-file.js, roster-worker.js, src/utils/roster-archive.js | Shared roster/score memory-only parsing; bounded ZIP/layout inspection, lazy read-excel-file9.3.12 worker/fflate0.8.3; original rows/calendar dates and lexical XML numeric scores retained |
| public/templates/score-template.csv, score-template.xlsx; tests/gradebook-scores.test.js | Header-only default score templates and CP04 curated pure/component contracts; no student data, HTTP/SDK/SQL/browser integration in CI |
| tests/gradebook-admin.test.js, roster.test.js | CP03 curated pure T01–T10 contracts; actual installed-Chrome fixtures/evidence stay ignored under tests/local/cp03, outside CI/production |
| src/utils/gradebook-learning-insights.js, src/components/gradebook-learning-insights.js | Read-only per-semester local descriptive score trends with B1 decimal validation and synthetic pure tests; no peer data, prediction, network/storage or new production dependency |
| src/components/student-gradeboard.js, src/utils/student-gradeboard.js | CP05 own-grade table, semester tabs and on-demand aggregate-only histogram; localized private-view visual shell/analytics dialog (UI review branch), DTO projection, exact B1 bucket grouping and cancellable read channels |
| src/components/student-chart.js, src/utils/student-chart.js | CP05 V2 lazy modular ECharts6 SVG/aggregate axes/zoom; one-stop occupied-level keyboard plot, resize/disposal; pure presentation options separate from chart runtime |
| src/components/birth-date-picker.js, src/utils/birth-calendar.js | CP05 V2 feature-local nonmodal DOB calendar, month/year/day keyboard navigation; manual field remains source of truth, strict B1 Gregorian/Vietnam-day validation, memory-only cleanup |
| src/components/student-lookup.js, src/utils/gradebook-ui.js | Date-only lookup form; pure validation/generation/cancellation/expiry; capability/input memory only |
| src/utils/gradebook-responses.js | CP06-A pure decoded B4 verification/read envelope validation, detached context, terminal error categories; strips requestId, preserves decimal strings and aggregate-only DTOs; no transport/storage/SDK and no production enablement |
| src/services/student-lookup.js | CP06-B verify/grades/histogram adapter using CP06-A projections; memory owner supplies capability/context; transport default disabled |
| src/styles/gradebook.css | Responsive student page/menu; existing Board design tokens |
| tests/gradebook-ui.test.js | Curated pure unit validation/route/disposal/late-response plus pending admin entry and blocked-history regression; no API or SDK |
| src/components/ | Render/interaction của 20 component tại SPEC R06; cleanup listeners khi unmount |
| src/services/ | Một Supabase client; truy vấn/Auth/Storage/sync, trả lỗi rõ ràng; không thao tác DOM |
| src/utils/image-compression.js | Browser-local JPEG/PNG/WebP optimization using Canvas, size-benefit threshold, pixel/resource bounds and original-file fallback. No SDK, network, provider or schema changes | 
| src/utils/ | Hàm thuần kiểm tra URL/file, format, debounce, thứ tự; test logic có rủi ro |
| src/config/ | Chỉ cấu hình public; kiểm tra thiếu cấu hình và hiện lỗi hữu ích |
| src/data/ | Placeholder có nhãn; tách rõ mode demo khỏi backend thật |
| src/styles/ | Tokens CSS, base, layout, component, responsive; không style inline lặp vô ích |
| supabase/migrations/, seed.sql | Schema/policy có version và seed chạy lại không trùng |
| tests/ | Regression, integration và bằng chứng QA tương ứng |
| scripts/gradebook-recovery-diagnostics.mjs | Fixed-stage/allowlisted-category projection and exact child-output filtering; poison regression; no messages/stacks/parameters |
| scripts/gradebook-backup.mjs | Bounded synthetic-only age encryption, authenticated paired restore input and quota-checked upload dry-run; no DB/service/upload client and no production export CLI |
| scripts/gradebook-backup-production.mjs, scripts/gradebook-backup-cli.mjs | Staged gb-recovery-v1 exporter/authenticator and data/crypto verifier: independent source/key inventory, full native age/PG17 archive decoding, bounded private local IO; no DB connection/upload/SQL restore or automatic recovery PASS |
| scripts/gradebook-backup-snapshot.sql | Operator-run read-only six-table/string-value + normalized security extraction inside an authorized exported snapshot; private staging only, no connection/provisioning |
| tests/gradebook-backup-production.mjs | Finite manual specialist: generated synthetic keys, disposable local PG17 source snapshot/archive, actual age/PG parser/CLI failures; outside curated CI, no actual restore or hosted/Drive calls |
| tests/gradebook-backup.mjs | Manual/specialist actual-age finite failure and transfer-plan checks; outside curated test:ci |
| tests/cloud/backup.mjs, .github/workflows/gradebook-backup-recovery.yml | Dedicated G07 public standard-runner synthetic PG17/age candidate; fresh-process recovery with owner/ACL/RLS/role checks, no production credentials/artifacts/caches; publication/run awaits approval |
| supabase/functions/grades-admin/index.js, student-lookup/index.js | B4 Edge entrypoints, SDK2.118.0 pin; CP01-C deployed v2 for synthetic/local-only acceptance, public frontend transport remains disabled |
| supabase/functions/_shared/{handler,http,backend,auth}.js | Bounded HTTP/CORS/cancellation, separate Auth/server clients, verified JWT/profile context, no retries |
| supabase/functions/_shared/{crypto,contracts,imports,dto}.js | Web Crypto keyrings/envelopes/tokens; reuse pure B1 via relative imports; complete score-input framing; explicit response projections |
| supabase/functions/_shared/{admin,student,runtime}.js | Allowlisted teacher/student operations, actual B3 RPC arguments, completed limiter before sensitive reads, server-only configuration |
| supabase/config.toml | Entry points/gateway flags matching deployed v2 functions; synthetic-only CP01-C, frontend default disabled; config alone grants no deployment authority |
| tests/gradebook-edge.test.js | Specialist Web Crypto/real-SDK/HTTP handler regression, explicitly excluded from curated CI; prior offline evidence retained; hosted acceptance separate |
| tests/gradebook-runtime.test.js | Specialist Node24 adapter loads actual Edge entrypoints/pinned SDK/shared+B1 graph without service/network; excluded from curated CI; native Deno/bundle NOT RUN |

Các thư mục code trong bảng đã có implementation. Không buộc một file/component nếu ghép module nhỏ rõ nghĩa tiết kiệm hơn; vẫn đáp ứng đủ hành vi các component trong SPEC.

B4 Functions are isolated from the Vite entry graph; they import only the accepted pure B1 modules from src/utils/gradebook, never frontend config/session/UI. No server secret is exported into VITE variables or browser assets. [B4 concern confirmations and actual transport contracts](features/personal-gradebook/B4_INTEGRATION_REVIEW.md#cp01-b4-implementation--mandatory-concern-confirmations-2026-10-26). Hosted import graph bundled successfully in CP01-C; native local Deno remains unavailable. Actual deployment/security evidence is recorded in STATUS/readiness; this code map alone does not establish acceptance.

## Cách viết

Khi tạo/chỉnh sửa source, tuân theo [CODE_STYLE](CODE_STYLE.md) về format JS/CSS/HTML/JSON, và [COMMENTING_GUIDELINES](COMMENTING_GUIDELINES.md) về comment tiếng Anh cho file/function/component/state. Source thực thi đã được format bằng Prettier ở branch refactor và comment convention đã được áp dụng ở các module liên quan. Giữ format-only/comment-only tách biệt với sửa hành vi.

- ES Modules, tên rõ nghĩa, một nguồn xử lý cho một quy tắc; không global state tùy tiện, không abstraction trước nhu cầu. Ghi chú giải thích lý do, tránh comment lặp lại code.

- UI gọi service qua hàm có đầu vào/đầu ra rõ. Chỉ báo lưu thành công sau khi backend xác nhận; giữ editor/nháp khi lỗi, không xóa nội dung trước khi lưu xong.

- Trạng thái loading/empty/error/disabled/dirty/sync là tường minh. Unsubscribe/remove listeners khi không dùng. Chống submit trùng và cập nhật UI sau thao tác bị hủy.

- Render văn bản bằng API an toàn như textContent; HTML tùy ý không nằm trong phạm vi. URL/nhúng qua allowlist và parser; không dựa chỉ vào thuộc tính input.

- Desktop board cuộn ngang trong vùng board; mobile chọn một cột, không tràn toàn trang. Semantic HTML, label, focus, keyboard/dialog, alt/title, reduced motion theo SPEC.

- Dùng server constraints và policies cho ràng buộc có thể cưỡng chế; validation frontend chỉ hỗ trợ trải nghiệm. Ghi rõ thao tác Storage/DB nhiều bước, rollback/dọn orphan và lỗi một phần.

- Không fetch blob khi chỉ cần metadata. Lazy-load, thumbnail, debounce; tránh N+1, listener dư, high-frequency polling. Fetch sau lưu/active/refresh; realtime chỉ sau kiểm chứng quota/phân quyền.

- Thư viện tùy chọn theo R15; chọn tối thiểu, kiểm tra docs/license/version, pin version và lockfile nếu dùng npm. CDN không dùng latest; không tự đổi sang framework khi Sites đề xuất starter server.

## Bản đồ DOM ở giao diện board

Các vùng dưới đây được lắp trong `src/main.js` bằng helper `el(...)`; component trong `src/components/` cung cấp nội dung cho từng vùng. Tên CSS class mô tả cách style, còn vai trò và vòng đời render được ghi rõ tại code dựng UI.

| Vùng DOM | Được tạo/cập nhật ở đâu | Vai trò |
| --- | --- | --- |
| `#app` | `index.html` → `src/main.js` | Root chứa header, hero giới thiệu và `board-shell` |
| `.app-header` | `AppHeader` | Logo/home, SearchBar, refresh và login/admin entry |
| `.hero` / `.hero-copy` | `src/main.js` | Tiêu đề, mô tả, số chủ đề/bài công khai; ảnh orbit trang trí |
| `.board-shell` / `shell` | `src/main.js` | Container căn giữa, bao adminRegion → workspace → footer |
| `.board-workspace` / `workspace` | `src/main.js` | Bao controls → BoardNavigation → boardRegion, giới hạn vùng sticky để không đi theo footer |
| `.board-navigation` / thanh cuộn phía trên | `src/components/board-navigation.js` | Chỉ hiện khi tất cả chủ đề overflow ngang trên desktop; native scrollbar + nút theo cột, dùng lại token/kiểu nút hiện tại |
| `adminRegion` (div không class) | `render()` | Trống với khách; admin có toolbar, dọn tệp và trạng thái quota |
| `.board-controls` / `controls` | `renderControls()` | Tab desktop, bộ chọn chủ đề mobile, nhãn bảng và thời điểm đồng bộ |
| `boardRegion` (div không class) | `renderBoard()`, `refresh()` | Vùng nội dung được thay bằng `BoardContainer`, loading hoặc error |
| `#board` / `.section-column` / `.post-card` | `BoardContainer`, `SectionColumn`, `PostCard` | Bảng chính → cột chủ đề → thẻ học liệu và action quản trị tùy quyền |
| `dialog` / `.dialog-content` | `openDialog()` và các editor/preview | Tiêu đề/đóng dialog, vùng form hoặc preview được caller thêm vào |
| `#toast` | `index.html` → `ToastNotification` | Live region thông báo độc lập với `#board` |

## Code map thực tế

| Module thực tế | Đường dẫn / trách nhiệm | Test |
| --- | --- | --- |
| Pulse / tác vụ đang chờ | `src/components/pending.js` dựng live status + pulse; `src/utils/pending-task.js` một task mỗi generation, finally/reset dọn trạng thái và chặn completion cũ xóa status mới | `tests/pending-task.test.js`; QA-A16, audit fixture, viewport `?fixture=audit` |
| Bootstrap / refresh / hành động | src/main.js | QA_REPORT public + editor fixture |
| Điều hướng ngang / anchor / reveal | `src/components/board-navigation.js`: đồng bộ native scroll hai chiều với guard chống feedback; ResizeObserver/scroll listener/frame được reset khi thay board/Auth. Anchor theo data-section-id + offset. `main.js` chỉ reveal snapshot xác nhận sau khi mở khóa; `section-editor.js` chuyển ID trả từ save | `tests/board-navigation.test.js`; `tests/audit.html?scenario=navigation`, QA-A19 |
| Header/Search/AdminToolbar/Board/Column/Card/Preview | src/components/board.js | public UI + viewport |
| Gallery/Document/Video | src/components/media.js | ảnh/PDF/YouTube UI |
| PostEditorDrawer/AttachmentUploader | src/components/post-editor.js | tests/audit.html: draft faults, inert busy form, pending-file barrier/close/logout/expired event/restore, save failure; drafts/validation unit |
| Login / SectionEditor | src/components/auth.js, section-editor.js | login UI; E2E thật BLOCKED |
| DraftRecovery/Confirm/Toast/Loading/Empty/Error/Sync | src/components/primitives.js | browser search/modal/error |
| QuotaStatus | src/components/quota.js | quota unit + SQL RPC |
| Supabase client/query/Auth/export/pagination | src/services/client.js, board.js, pagination.js | tests/reliability.test.js: complete pages/count/failure; anon API + SQL role regression |
| Phiên theo tab / xác minh bootstrap | `src/services/auth-session.js`: chọn sessionStorage/key riêng, fallback memory; getSession → getUser server → admin_profiles. `main.js` khóa read/UI khi kiểm tra, retry khi lỗi và fence SIGNED_OUT | `tests/auth-session.test.js`; `tests/session.html` / `session-fixture.js` dùng SDK/storage thật + transport giả; QA-A18 |
| Session request generation | src/utils/request-gate.js; src/main.js xóa snapshot khi SIGNED_OUT | unit late-response race + tests/audit.html logout/failure |
| File upload/sign/cleanup | src/services/storage.js | offline uncertain upload + guarded/batched cleanup; upload bytes thật chưa chạy |
| Text / Blob nháp / flush queue | src/services/drafts.js: createDraftWriter chờ file, ghi snapshot blob bất biến rồi publish files_key trong text; reuse blob cho cùng tập ID file; đọc legacy, recover đủ order/blob hoặc báo lỗi; serialize write/fence cleanup, discard/confirmed save xóa các version cùng draft | tests/drafts.test.js (pending/write failure/serial) + QA-A10 File API/IndexedDB |
| URL/file/search/order/retention/quota/ID/DOM | src/utils/ | tests/*.test.js; preview UUID fallback verified |
| Public config / placeholder fixtures | src/config/public.js, src/data/placeholders.js, public/placeholders/ | public board/media |
| Schema/RLS/atomic RPC | supabase/migrations/, seed.sql | supabase/tests/access.sql |

Vite chỉ bundle SDK và cấu hình public, output static dist. Không có server app hoặc framework SPA. Session Supabase theo SPEC R08.1 / D09, còn text draft localStorage và File draft IndexedDB có key theo UID/post. Private Storage dùng signed URL 60 giây; thumbnail được ký theo batch metadata, không fetch tất cả file bytes. Refresh sau ghi/active/manual, không đăng ký Realtime. Chi tiết quyết định ở SPEC/DECISIONS, không nhân bản cấu hình ở nhiều file.

Bootstrap gọi `refreshAuth()` ngoài callback SDK, không phụ thuộc thứ tự `INITIAL_SESSION`. `clearSession()` hủy generation trước kiểm tra; chỉ kết quả Auth cùng generation mới bật admin và bắt đầu tải board. Header/manual/online/active refresh nhường bước xác minh; sau lỗi sẽ retry Auth thay vì đọc bằng JWT chưa xác minh. Listener SIGNED_OUT xóa private UI đồng bộ và dời public read bằng timer để tránh lock SDK. Login trong app vẫn đi qua callback thành công đã kiểm quyền; không xử lý lại mọi SIGNED_IN/TOKEN_REFRESHED bằng cách đóng editor hoặc xóa nháp. Key SDK có hậu tố UUID theo tab để tránh BroadcastChannel mặc định đưa session sang tab độc lập; duplicate/restore tab vẫn theo giới hạn browser tại R08.1.

Editor phân biệt file selection/result với input khi busy: markDirty vẫn nhận kết quả đã xếp hàng, nhưng không cập nhật dirty toàn cục sau khi dialog đóng. Close và preserveDraft chờ signature trước flush; logout flush trước confirm, hủy luồng cũ nếu Auth generation đổi. SIGNED_OUT xóa UI ngay, để local flush hoàn tất trước uploader cleanup; không chờ network hoặc giữ UI quản trị mở.

DraftRecoveryDialog tách restore/discard/cancel; dismissal không cho phép xóa. Editor khóa mọi ghi khi recovery chưa hoàn tất, giữ model cũ cho đến khi đọc đủ blobs và cho phép retry. main truyền owner/Auth generation; canContinue kiểm cả dialog và generation qua các await của submit. Storage nhận isCurrent để dừng bước quota/upload/delete kế tiếp; queueCleanup chỉ ghi path cục bộ khi thao tác đã hết hiệu lực, không cam kết rollback request đã gửi.

Nháp publish bằng localStorage sau khi IndexedDB transaction hoàn tất, không ghi đè blob của snapshot đã commit. Nếu text fail thì metadata cũ tiếp tục trỏ tới blob cũ; snapshot chưa publish vẫn giữ đến explicit discard/confirmed save. Storage snapshot key bị giới hạn cùng namespace UID/post. Các version thay tập file có thể tăng dung lượng cục bộ; chỉ sửa text/retry không sao chép blob lại. Đây chưa phải bằng chứng đồng bộ hai context độc lập.

Editor tính candidate file cũ bị thay trước save RPC, queue sau response trước mọi cancellation exit; response lỗi/không rõ commit cũng giữ candidate để phiên admin sau kiểm tham chiếu. SIGNED_OUT không bắt đầu remote cleanup. Chi tiết điều tra AUD-013/014 trong BUG_FIX_LOG, không thay điều kiện RLS/JWT.

Phản hồi đang chờ theo R14: main giữ pulse cố định trong viewport cho re-order, xóa/khôi phục, refresh, export, cleanup và logout. Controls khóa bằng inert trong thời gian thao tác/đọc bảng; background refresh nhường task đang ghi, task sở hữu gọi refresh cuối sau RPC. SIGNED_OUT reset task/generation và UI; completion cũ không mở khóa hoặc thay status của tác vụ mới.

Dialog đặt pulse trong `.dialog-heading` sticky, bên ngoài form inert; post có nhãn riêng cho xác minh file, upload, save/publish, recovery và hoàn tất. Autosave dùng vùng draft-status inline để không đẩy form khi đang nhập. Section/login khóa submit, đóng và Escape khi chờ. Media tách chờ ký URL, load ảnh và iframe load/error; iframe load không chứng minh playback/PDF render thành công. Quota có pulse riêng. CSS dùng dot + vòng pulse, nhãn chữ/live status và media query reduced motion đã có; không thêm timer kéo dài loading hoặc request/polling.

Điều hướng theo SPEC R05.2 không thay AppHeader/card/bố cục lọc. Sticky chỉ áp dụng row điều hướng mới, top=0 vì AppHeader hiện không sticky. Create ưu tiên snapshot mới hơn background read; lookup ID chỉ chạy sau khi ticket Auth còn hiệu lực. `renderBoard()` chụp anchor trước replaceChildren rồi attach DOM mới; lọc chủ đề chủ động reset vị trí. Focus reveal đặt sau pending unlock để tránh gọi focus vào board inert. Không có “Đi đến”, kéo thả nội dung hay scroll wheel hijack.

Tổ chức kiểm thử: mọi file frontend test/fixture nằm trong `tests/` (xem tests/README.md); chỉ `tests/local/` là vùng artifact/scratch được .gitignore và .prettierignore bỏ qua. Unit và fixture regression cần chạy lại vẫn giữ trong Git, không gộp vào vùng ignore. Vite build chặn test module; `tests/check-production-build.mjs` kiểm allowlist output sau build. Hosting chỉ phục vụ `dist/`, xem DEPLOYMENT.

## Personal Gradebook B1 utilities

> Historical implementation snapshot at the referenced baseline. Current applied versions/deployed functions are recorded in DATABASE/STATUS; old unimplemented/unapplied labels below are not current state.

`src/utils/gradebook/{contracts,decimal,dates,imports,canonical}.js` contains pure B1 contracts, with no client/network/DOM or persistent-storage dependency. `tests/gradebook-contracts.test.js` covers exact values, calendar/Excel conversion, normalization and protocol vectors offline. The roster helper maps physical width/positions to stable DTO keys, accepts increasing source-row gaps and validates trimmed names by Unicode code points; editable header text is not a mapping key. They are not imported by the application entry point yet. See [B1 boundary](features/personal-gradebook/CP01_TECHNICAL_DESIGN.md#15-b1-implemented-contract-boundary); routes, full DB fingerprint, RPC and Functions are not implemented.

## Personal Gradebook B2 SQL draft

> Historical implementation snapshot at the referenced baseline. Current applied versions/deployed functions are recorded in DATABASE/STATUS; old unimplemented/unapplied labels below are not current state.

`supabase/migrations/20261026014933_gradebook_foundation.sql` is an unapplied six-table foundation; the narrow private boolean session helper is the only new function. `tests/gradebook-b2-sql.mjs` creates fresh in-memory PGlite databases using `tests/gradebook/b2-bootstrap.sql` and four actual board migrations; no DB URL is accepted, no dependency added to the app. [B2 review](features/personal-gradebook/B2_MIGRATION_REVIEW.md) separates local SQL evidence from PostgreSQL17/Supabase/JWT/concurrency gates. RPCs, runtime epochs/stamping, limiter, crypto and UI remain unimplemented.

## CP01-B3 — transaction draft (2026-10-26)

> Historical implementation snapshot at the referenced baseline. Current applied versions/deployed functions are recorded in DATABASE/STATUS; old unimplemented/unapplied labels below are not current state.

B2 accepted baseline `d86627f`. New `20261026030000_gradebook_transactions.sql` adds 22 service-only invoker RPCs, private validation/planner/framing helpers, shared import preview/apply/state hash, class-scoped audit and atomic limiter. Five prior migrations unchanged, no tables added. [B3 inventory, DTO signatures, evidence and limits](features/personal-gradebook/B3_TRANSACTION_REVIEW.md). B3 READY FOR REVIEW; B4/B5 NOT STARTED, CP01-C and real-data gate NOT RUN. 14 B3/18 B2 disposable SQL groups and81 app tests PASS; native17, multi-connection locks, hosted API/security and browser NOT RUN. Draft not applied. Earlier B3 NOT STARTED entries are historical.

## Correction V2 — routing, identity và chi phí / 2026-10-29

websiteProfile trong assistant-learning.js giữ tên sản phẩm chính thức; regression so với index.html,
không đổi technical identifiers. Intent routing nhóm tín hiệu website/inventory/follow-up, giữ
content-specific query ở search/educational; fallback không giả metadata. Source actions chỉ có khi
nguồn được validate và khác rỗng, resolver cũng từ chối IDs[].

V2 Worker dùng cùng deterministic helper trước budget. Envelope deterministic được service tính
lại và so sánh fields, không tin model hay thứ tự JSON keys. Query mới dùng BGE+Qwen; context
follow-up hợp lệ chỉ Qwen. Output AI vẫn contract status/answer/IDs/coverage cũ. DO giữ nguyên
count/stopped, cap3 bảo thủ; chỉ storage record undefined mới khởi tạo, corruption fail closed.
Accounting/legacy-state evidence và giới hạn public admission tại [V2 acceptance](features/board-assistant/V2_ACCEPTANCE.md).

## Chuẩn web và các ứng dụng đính kèm — cập nhật chủ sở hữu

[PRODUCT_PROFILE](PRODUCT_PROFILE.md) chuẩn hóa web quản lý lớp online. app.js sở hữu route
lifecycle giữa Board, tra cứu cá nhân và quản lý bảng điểm/lớp; không đồng nhất website với Board
hay chatbot. websiteProfile chỉ mô tả chức năng tồn tại trong source và đối tượng sản phẩm.
Inventory trợ lý chỉ dùng published Board snapshot; không suy tổng lớp/học sinh hay gọi Gradebook.
Không thay business logic/quyền của các ứng dụng; trạng thái nghiệm thu từng module vẫn riêng.

## V2 CP02–CP03 — universal public text grounding

loadBoard/readAllRows chứng minh paging bằng count/id rồi gắn publicCoverage (non-transactional).
Assistant không dùng preview1200 làm corpus: publicAssistantCorpus giữ full published body và safe
metadata; index mọi passage trong2M local bound. Unknown/invalid/oversized => explicit coverage/clarify,
không âm thầm lấy prefix. Không giới hạn topic names hay loại bài đăng bằng enum nghiệp vụ.

Local rank -><=8 wire chunks ->BGE/Qwen<=5 (JSON<=24KB),<=3 refs ->native IDs/quotes checked against
current full corpus. Follow-up prior source IDs -><=3 windows/Qwen only. V1/V2 contract giữ tương thích.
Citation cards có thể hiển thị nhiều đoạn cùng post; native open/filter vẫn main Board sở hữu.
Fingerprint full text/metadata/coverage, cancel/reset/route/revocation invalidate ownership; native
cancel abort ngay trước queued close. Không đổi CSS/layout; copy/disclosure đúng selected text/context.

Temporal evidence giữ creation/edit riêng, publication unknown, event/deadline/preparation riêng;
không tự thêm năm hoặc coi start là end. Numeric/date guards chỉ chặn obvious unsupported claims,
không phải semantic entailment proof. Metadata/topic/body source untrusted, không model tools/writes.
[Bounds, schema, tests và limitations](features/board-assistant/GATE_AB_ACCEPTANCE.md). Không thay
DO allowance/run ID hoặc hosted config trong Gate A/B.

## PWA app shell (2026-10-30)

PWA is independent of the Board/Auth/Gradebook data flow: `public/manifest.webmanifest` contains install metadata, `public/icons/` holds branded PNG icons, `public/offline.html` is the only pre-cached response, and `public/sw.js` handles **same-origin navigation only** using network-first fallback on connection failure. `src/utils/pwa.js` registers without forcing an update or reloading a page. `src/app.js` keeps ownership of all three routes. No app HTML, JS, API response, authenticated data, tokens or drafts are cached in the service worker. See [PWA guide](PWA.md) for limits and checks.
