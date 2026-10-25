# Kiến trúc và cách code

Hợp đồng: SPEC R03, R06, R09, R12–17, R20. Quy ước và code map dưới đây áp dụng cho implementation của branch đang đọc; nghiệm thu runtime xem STATUS/QA_REPORT.

## Ranh giới

- Frontend tĩnh render UI, xử lý tương tác, validate sớm, gọi Supabase SDK bằng publishable key.

- Supabase PostgreSQL là nguồn dữ liệu chính. Auth xác thực một admin; RLS và Storage policies quyết định quyền thực tế.

- localStorage giữ nháp văn bản/tùy chọn; IndexedDB có thể giữ blob tạm. Không coi dữ liệu cục bộ là đã đồng bộ hoặc thay nguồn chuẩn.

- Storage giữ học liệu runtime. GitHub chỉ giữ source, placeholder hợp pháp và migration/seed. Đăng/sửa bài trên Supabase không cần deploy frontend.

- Sites phục vụ quy trình phát triển/preview/QA/hosting có điều kiện, không là backend dữ liệu. Không thay Supabase bằng storage hay danh tính ChatGPT.

## Quy ước module

| Vị trí dự kiến | Trách nhiệm |
| --- | --- |
| src/main.js | Bootstrap, ghép dịch vụ và component; không nhồi toàn bộ ứng dụng |
| src/components/ | Render/interaction của 20 component tại SPEC R06; cleanup listeners khi unmount |
| src/services/ | Một Supabase client; truy vấn/Auth/Storage/sync, trả lỗi rõ ràng; không thao tác DOM |
| src/utils/ | Hàm thuần kiểm tra URL/file, format, debounce, thứ tự; test logic có rủi ro |
| src/config/ | Chỉ cấu hình public; kiểm tra thiếu cấu hình và hiện lỗi hữu ích |
| src/data/ | Placeholder có nhãn; tách rõ mode demo khỏi backend thật |
| src/styles/ | Tokens CSS, base, layout, component, responsive; không style inline lặp vô ích |
| supabase/migrations/, seed.sql | Schema/policy có version và seed chạy lại không trùng |
| tests/ | Regression, integration và bằng chứng QA tương ứng |

Các thư mục code trong bảng đã có implementation. Không buộc một file/component nếu ghép module nhỏ rõ nghĩa tiết kiệm hơn; vẫn đáp ứng đủ hành vi các component trong SPEC.

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
