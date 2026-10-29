# ExecPlan hiện hành — correction và chuẩn hóa sản phẩm web

Chuẩn sản phẩm: [PRODUCT_PROFILE](../../PRODUCT_PROFILE.md). Phần “Đợt correction V2-F01–F05” và
“Điều chỉnh chuẩn sản phẩm theo chủ sở hữu” bên dưới áp dụng cho tác vụ hiện tại: cap3 reservations,
query mới2 model calls/follow-up1, web quản lý lớp online có các ứng dụng đính kèm. Các giả định
KHTN8/cap4/two-call-follow-up của kế hoạch ban đầu bên dưới chỉ còn là lịch sử thiết kế.
Kết quả hiện hành và ledger0/40 tại [V2_ACCEPTANCE](V2_ACCEPTANCE.md); không có quyền deploy/merge mới.

---

# Grounded Learning Assistant V2 — execution plan / 2026-10-29

Baseline50ea1cbf30b6fa603fce43f588aaa921f6ec54da; dedicated feature/ai-learning-assistant-v2-e2e.
Clean baseline fetched from ai-learning-assistant; develop divergence25 ahead/8 behind; do not merge.
Read AGENTS, overview/status, architecture/testing/style/comments, roadmap/zero-cost, R07.1 and
MVP/UI/F01–06 evidence. No UI/UX Pro Max skill available; retain approved tokens and dialog.

## Decisions and boundaries before implementation

V1 projects published title/body/topic text, lexical fallback, BGE hybrid ranking, Qwen ID selection,
exact excerpts and user-confirmed read-only actions. It cannot explain sources or contextualize follow-ups.
V2 adds a pure deterministic intent/profile layer, a strict generated-answer contract, and bounded
source-focused conversational context. Frontend -> public projection -> deterministic website/topic
answer (zero model calls) OR explicit consent -> transport -> existing Worker BGE -> candidate
selection -> Qwen grounded answer -> validation -> safe text DOM + validated source cards.
Never transmit files, attachment URLs, Gradebook, Auth or private records. Metadata overview explicitly
is not a complete document summary; full current published inventory drives exact counts, with bounded
listed items and explicit truncation. Cloud catalog>24 refuses inference rather than silently sampling.

Context holds at most the last source IDs and one validated prior question, in memory only, owned by
one open modal/snapshot. Follow-ups reuse those sources, not model-generated prose as trusted facts.
Reset/close/abort/snapshot/route exit clears it. Worker rechecks context IDs/shape and limits, then
embeds contextual query; no additional model call. No cross-session memory or persistent transcript.
Model JSON {status,answer,ids,coverage}; bounded answer1800 characters,<=3 allowed IDs, finite enum
statuses/coverage, exact keys, no tool/action output. Answered requires citations; insufficient always
renders a fixed abstention. Qwen sources are untrusted JSON data, system forbids following their
instructions/external facts. Citation validity is not factual correctness; synthetic fact evaluations
and production provenance remain distinct. No claim of complete hallucination/prompt-injection prevention.

Client catalog is NOT independent proof of publication. CORS is NOT authentication. Public endpoint
must stay disabled: production needs trusted content provenance and abuse admission beyond this task.
Existing globally serialized DO lifetime4 reservations permits at most16 standard operations, plus
failure-stop overhead within Activity A20; no new ID to replenish exhausted allowance. Deploy only
with verified account/Free/model entitlement/remaining quota, short expiry, synthetic-only access and
known unused global allowance. No such identity currently injected; inspect metadata only, no secrets.
No paid services/resources/new Supabase integration or migrations. No website release/merge.

## Checkpoints and concern/test matrix

| CP | Inventory and acceptance |
| --- | --- |
| 01 profile | new pure assistant-learning utility; exact counts/published topics/capabilities, empty/large/changed catalog, Vietnamese paraphrases; zero-fetch browser assertions |
| 02 intent | same utility + component; website/topic/list/search/summary/educational/follow-up/outside routes; ordinary lexical fallback and source validation unchanged |
| 03 generation | Worker/service + pure contract; strict envelope, malformed/oversize/unknown IDs, grounded prompt inspection, abstention, two calls maximum, existing V1 regressions |
| 04 conversation/UI | component; memory-only context, safe text answer labels/citations, clear on cancel/close/reset/snapshot, no implicit retries, existing focus/filter/keyboard |
| 05 safety | explicit specialist tests; input/context rejection, disabled/quota/abort/timeouts, DO fail closed, injection samples; no HTTP/Worker suites in test:ci |
| 06 acceptance | six viewport Chromium matrix plus short-height/reflow/reduced motion, generated mock turn/follow-up/overview/navigation/reset/late responses; check, curated, focused pure/specialist, build, format/diff; docs/evidence/commit/push/Draft PR |

Expected inventory: new pure helper/tests; existing assistant component/service/Worker/tests; maintained
synthetic browser fixture/driver; SPEC R07.1, architecture map, roadmap/status, assistant docs and bug log.
No dependency/lockfile/Gradebook/Auth/CI/global deployment config changes. Stable checkpoints committed.

## Hosted activities, accounting and rollback

Activity A only after final offline/browser gates: up to3 synthetic cases (grounded paraphrase,
unsupported, contextual follow-up/injection if justified). Each POST1+DO reservation1+BGE1+Qwen1=4;
three successful cases12 operations; reserve8 for at most2 preflights and failure-stop/uncertain overhead.
Hard global cap4 reservations; total requests including optional invalid probe must remain<=20.
Pre-request finite ledger reserves worst-case; no retries, polling or confirmatory calls. Stop on any
402/429/unexpected503/auth error/timeout/uncertain completion/usage or counter mismatch. Activity B
(max20, task40) only after confirmed integration defect, correction and offline revalidation; never to
retry transient failure or consume allowance. At most activation+disabled restoration deployments
per activity (task<=4). try/finally restore AI_ENABLED=false, empty PREVIEW_EXPIRES/no usable allowance;
verify read-only active config, stop critically if uncertain. Control-plane calls recorded separately.
Without credentials/quota/safe access evidence: hosted BLOCKED, zero calls, no activation/rollback needed.

Final gates distinguish PASS/FAIL/PARTIAL/BLOCKED/NOT RUN. Source scope locally reviewable even when
hosted and GitHub API access blocked. Use [CF-Pages-Skip], push without force, Draft target integration
only; exact compare URL if API Forbidden. No permission checkpoint needed for authorized work.

## Execution receipt

CP01–05 implemented and validated offline; CP06 synthetic Chromium/checks PASS, hosted BLOCKED.
[Final acceptance record](V2_ACCEPTANCE.md) includes commands, counts, quality limits, contrast,
artifacts, zero-usage ledger and owner trial. Final owner report records the final pushed SHA/PR.
No Cloudflare identity in environment_status or identity manifest, no CLI/connector: activation
not attempted. GitHub API remains unavailable; use verified Git push plus compare URL if needed.

## Đợt correction V2-F01–F05 — kế hoạch trước sửa / 2026-10-29

Baseline local/remote cee8e1dffd8fccfe94d8f9b7becae34ee9226806, nhánh V2 hiện tại sạch;
base vẫn50ea1cb. Không overwrite, merge hoặc đổi nhánh. Ledger V2 cũ0/40 được giữ nguyên.

| Finding | Nguyên nhân đã xác minh | Phương án / file / kiểm chứng |
| --- | --- | --- |
| F01/P2 | showResults luôn append filter dù sources rỗng | Chỉ render source action khi có nguồn hợp lệ trong catalog; deterministic/insufficient/zero-result không có filter. Component + browser assertions, V1 filter regression |
| F02/P2 | Regex bỏ sót câu hỏi có-những-gì và follow-up có từ xen giữa | Chuẩn hóa từ/ngữ cảnh hỏi; nhóm tín hiệu website/listing/follow-up rõ ràng, giữ truy vấn học liệu cụ thể ở search/educational; bảng paraphrase positives/negatives thuần + browser |
| F03/P3 | Profile hardcode KHTN8 Board trong khi index title đã đúng | Một websiteProfile tên chính thức trong helper; test đối chiếu index.html, không đổi identifier hay lịch sử |
| F04/P2 | BGE chạy trước nhánh candidates lấy từ context | Context hợp lệ lấy trực tiếp sources rồi chỉ Qwen; query mới BGE+Qwen. Worker specialist xác minh1vs2 calls, revoked context0 |
| F05/P2 | Cap4 V1 chưa dành chỗ cho stop/preflight/invalid | Giảm cap còn3 reservations bằng constant server-side; giữ nguyên storage count/stopped và tên DO. Không weighted migration, không reset allowance. Legacycount>=3 tiếp tục bị chặn; last-slot serialize/restart/stop/failure kiểm thử rõ |

Chọn cap3 bảo thủ thay weighted counters vì không đổi schema/trạng thái hay khôi phục allowance cũ.
Worst-case một accepted query mới: POST1+reserve1+BGE1+Qwen1+stop tối đa1=5; follow-up=4.
Cap3 => tối đa15 operations cho accepted inference chains. Activity A dành tối đa2 OPTIONS,
1 invalid POST,1 denied POST+reserve2 =>20. Đây là trần client ledger cho test hợp lệ, không phải
bảo đảm số request đối nghịch đến endpoint public. Deterministic trên trang0; API V2 deterministic
nếu hỗ trợ dùng cùng helper trước reserve, không inference. Không host khi admission/quota chưa rõ.
A dự kiến3 case: grounded new4, follow-up3, unsupported new4 =11 trước stop/preflight margins.
B chỉ sau lỗi tích hợp đã sửa, không replenishment run ID; tổng còn40, không cấp mới40.

Inventory: helper/profile, component, Worker/service nếu cần deterministic envelope; pure/Worker/browser
regressions; ExecPlan/acceptance/BUG_FIX_LOG/STATUS và kiến trúc nếu contract thực sự đổi. Không dependency,
CI, Auth/Gradebook/Supabase/migrations/global deployment edits. Giữ V1 wire contract; cap tightening
là thay đổi vận hành chủ ý, test cập nhật theo invariant mới và legacy-state không hồi sinh.

Thứ tự: regression cases trước -> sửa -> focused offline -> browser6 viewports gồm landscape,
nguồn/filter/reset/preview focus/context/abort/fallback -> final131 curated + explicit specialists/check/
build/format/diff một lượt khi ổn định -> commit/push/Draft PR. Chỉ rerun phần bị tác động khi sửa thêm.
Hosted hiện BLOCKED: environment metadata không có credential/identity, không có connector Cloudflare.
Không activation hay rollback nếu chưa đủ quyền/Free/quota. Nếu đủ: verify current Worker, expiry ngắn,
try/finally disabled+expiry rỗng/no allowance và verify read-only; dừng ngay lỗi/timeout/quota mơ hồ,
không retry. Native Safari/physical mobile/screen reader không suy từ Chromium. Tiêu chí offline:
5 finding sửa xong, tests thực chạy PASS, evidence synthetic, commitremote/link review; hosted tách riêng.

### Kết quả đợt correction

Đã thực thi cả5 finding; final131 curated +40 assistant PASS, browser6 V2 +8 V1 và actual-main
Board persistence PASS. Guard malformed/null allowance được siết sau final suite,22 Worker tests
bị tác động PASS khi rerun. Một lỗi validator so sánh thứ tự JSON keys đã được phát hiện/sửa bằng
regression. No-empty-filter cũng được enforce ở action resolver; service xác minh deterministic
envelope bằng dữ liệu tính cục bộ. [Acceptance hiện tại](V2_ACCEPTANCE.md) lưu evidence/ledger0/40.
Không hosted/deploy/merge; final Git receipt trong báo cáo bàn giao.

### Điều chỉnh chuẩn sản phẩm theo chủ sở hữu — cùng tác vụ correction

Chủ sở hữu yêu cầu chuẩn hóa web là sản phẩm quản lý lớp online có các ứng dụng đính kèm,
không suy mục đích/đối tượng toàn sản phẩm từ seed KHTN8. Đã đọc src/app.js (route lifecycle),
site-navigation.js (Bảng học liệu/Bảng điểm cá nhân/Quản lý bảng điểm), gradebook-ui.js (routes),
gradebook-admin.js (class/roster/score UI) và student-lookup.js (luồng xác minh cá nhân).
Cập nhật websiteProfile, deterministic answers và tài liệu hiện hành README/OVERVIEW/SPEC/profile/
acceptance/status theo chỉ đạo này. Chỉ mô tả ứng dụng tồn tại trong source; không suy thành quyền
truy cập dữ liệu riêng hoặc chứng nhận đã release. Inventory chỉ đếm Board published snapshot,
không suy số lớp/học sinh/điểm. Regression purpose/audience/apps/no-private-count và Chromium
identity/overview kiểm chứng lại. Không thay business logic Gradebook/Auth/Supabase hoặc UI redesign.
Tài liệu bằng chứng lịch sử giữ nguyên; thêm chuẩn sản phẩm hiện hành và giải thích scope cũ.

## CP01–CP02 scope correction — Website Knowledge & Navigation (2026-10-29)

Baseline `1429789`. Product-level requirement: KHTN8 remains documentation
history only; never add a chatbot intent/FAQ for that obsolete label.
Problem: runtime knows three app names but lacks useful descriptions/routes;
broad `bang diem` match rejects legitimate public guidance. Decision:
extend approved deterministic websiteProfile + public app guides, route
known general questions without model inference, keep private read/write
requests fail-closed and preserve existing generated-answer/Worker contracts.

Test matrix: pure intent/profile/route vs app routes/private denial; synthetic
Chromium app guidance/zero-cloud/empty source action; existing educational
routing/follow-ups must remain unchanged. This correction does not start CP03
hosted evaluation, change DO, migrate schema, deploy or merge. Browser/runtime
tests remain NOT RUN until a suitable worktree is available.

## Gate A/B — Universal Public Content Grounding / kế hoạch trước code

Baseline01198f0b8e1b298101d1ee8405ec988b507db109 đã fast-forward đúng nhánh V2 từ3 commit mới;
base50ea1cb, cây ban đầu sạch. Gate C/D ngoài scope: hosted/inference/deploy/allowance/run-ID0 thay đổi.
PRODUCT_PROFILE giữ nguyên. Các hướng dẫn sản phẩm mới phải được xác minh runtime Gate A trước.

Schema thật: posts.body<=20000, title<=200, created_at/updated_at có thật, KHÔNG có published_at hoặc
schema event/date/deadline. readAllRows đã phân trang exact count + unique id, chống missing/duplicate/
count-change; không phải transaction snapshot. loadBoard lấy đủ visible rows, có thể gồm private khi
admin: assistant bắt buộc lọc published và section hợp lệ. Snapshot hoàn chỉnh chỉ khi có evidence
loader; fixtures/unknown không được tự gọi là full website.

Thiết kế Gate B: giữ legacy wire V1/V2 và helper cũ; thêm corpus đầy đủ body + public timestamps/
attachment-presence (không URL/path/filename/private fields), index chunk1000/overlap160 trên toàn
corpus đủ điều kiện; lexical shortlist nội dung/IDF không theo tên topic hoặc vị trí. Mọi chunk được
xét, payload model vẫn bounded <=8 chunks/query (<=3 follow-up), Qwen top5/output3 citations như cũ.
V3 map chunk IDs/offset về native post IDs để open/filter/quote chính xác. Không tăng model calls:
query mới BGE+Qwen, follow-up Qwen, deterministic0. Không vector DB/service mới. Không có lexical
anchor trên corpus lớn => hỏi làm rõ thay vì tùy tiện chọn8 bài đầu; coverage phân biệt snapshot,
full lexical scan, semantic shortlist và đoạn trích được gửi. Corpus vượt local resource bound phải
báo partial/clarify, không âm thầm index prefix. Dates metadata không thay event dates.

Temporal là helper con CP03: clock injected, Asia/Ho_Chi_Minh; date ranges today/week/month/upcoming,
full-year validation, yearless không suy năm, date evidence có label event/registration/preparation/
unknown theo chính văn bản. created/updated riêng, publication unknown. Canceled/rescheduled/conflict
phải giữ evidence từng nguồn, không ghép do chung keyword/updated_at; model prompt nêu rõ giới hạn.
Không xây calendar/schema, không claim mock proof là Qwen quality.

Inventory: new public-retrieval/temporal helpers + focused fixtures/tests; component/service/Worker
V3 integration; loadBoard coverage marker; main giữ native actions; source projection legacy giữ
compatibility. Docs ExecPlan/acceptance/STATUS/BUG_FIX_LOG/ARCHITECTURE/ROADMAP. Không CI/dependency/
Auth/Gradebook/RLS/migration/PRODUCT_PROFILE change. UI giữ thiết kế, chỉ thêm coverage/format limit.

Matrix: Gate A pure + current6-viewport browser app-guidance/refusal/zero-model. Gate B U01–U20:
synthetic topics bất kỳ, article>24, fact>1200, long chunk, duplicates, multi-source compare/synthesis,
no match/private/revoked/file-only/partial; semantic paraphrase bằng fake vectors; answer assertions
đúng source/quote/fact và fail-closed schema. T01–T10: injected2026-11 clock, explicit full dates,
unknown/no year, post/event/deadline/preparation khác nhau, cancellation/conflict/different events.
Specialists Worker/transport/pagination và browser ở ngoài test:ci. Browser6 viewports source open/
filter/follow-up/reset/cancel/stale/large catalog/safe HTML, external HTTP blocked. Final curated/check/
build/format/diff khi ổn định; commit/push/Draft PR hoặc remote+compare nếu GraphQL Forbidden.

Rủi ro: candidate lexical mismatch với corpus lớn phải hiển thị partial/clarify; citations chỉ chứng
minh membership/exact excerpt, không đảm bảo mọi mệnh đề model. Chunk offsets/context mapping có
regression tests; snapshot ownership dùng full corpus fingerprint. Count paging không chứng minh
server provenance hay atomic consistency. Public release vẫn blocked theo gates riêng.

Gate A runtime receipt: baseline01198f0, explicit assistant suites43/43 PASS; current Chromium
six-viewports app-guidance/private refusal/source/focus/cancel suite PASS, outside-loopback HTTP0.
Tên, ba ứng dụng và hướng dẫn đường dẫn/quyền có runtime evidence; correction cũ NOT RUN được
supersede chỉ trong scope này. Gate A PASS; Gate B đang triển khai, không suy thành model-quality PASS.
