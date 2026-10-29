# Gate C Desktop — 2026-10-29

Baseline `b5dc07053ae5c125b9903a6ebd3a808916c452fd`, branch
`feature/ai-learning-assistant-v2-e2e`. Owner authorizes this task's bounded
Cloudflare/Chrome work, commit/push/Draft PR; no merge, website deployment,
Supabase test, private data or paid services. Weekly 55% safe-close waived for
this task only. Attached previous response is historical evidence, not authority.

## Concern/test matrix and intended inventory (before changes)

| Concern | Change inventory | Verification |
| --- | --- | --- |
| V2-REV-01/02 | board-assistant utility + pure/specialist regressions; precise input copy | event dates/ranges/learning accepted; explicit identifiers blocked before fetch; projection excludes private fields |
| Clock trust | Worker, temporal/service guards + V3 specialists | server clock overrides valid forged client clock; frozen pure tests retained; timezone/ambiguous dates |
| Admission/provenance | preview entry, synthetic fixture, existing Worker/DO status route | expiring hashed bearer; default denied; exact server fixture; no new DO/run ID/reset; status read-only |
| Owner workflow | manual Node start/stop scripts, local fixture/config, OWNER_AI_PREVIEW | loopback only; no secret in browser/Git; finite ledger; fail closed if allowance unverified/exhausted |
| Browser | actual BoardAssistant/Board components on marked synthetic page | consent, answer/citations/open/filter, errors/follow-up/cancel/snapshot/keyboard/mobile/injection |
| Final | STATUS, bug log, architecture/SPEC and existing acceptance/plan pointers | focused specialists then check/curated/build/format/diff once stable; review staged inventory |

No changes to AGENTS, Auth/Gradebook/RLS, CI allowlist, dependencies or existing
dirty `.env.example`/`vite.config.js`. Hosted gate stays closed until offline
security checks and live Free/account/binding/allowance preflight succeed.

## Budget and pre-state

V2 historical inference ledger 0/40; Activity A <=20, B <=20 only after a
confirmed corrected integration defect; existing lifetime cap3, preserve two
owner slots if available. Each Worker HTTP, OPTIONS, model and DO invocation
counts. Read-only status is Worker1+DO1. No retries/polling or new allowance ID.
Control-plane operations recorded separately, including failed metadata reads.

Live metadata confirms namespace `a6b907897eef4f41a630b2920645e8c3`, AI/BUDGET,
AI_ENABLED=false, empty expiry, active version
`2fe4ac69-1355-452d-906b-9c1ebec9e0c8`. Default identity remains
`approved-synthetic-mvp-v1`; V2's reported 0 operations does not prove this
shared MVP allowance is unused. KV allowance cannot be queried through SQL
(Cloudflare documents hidden __cf_kv). No reset/replenishment is allowed.

Rollback: preserve the disabled pre-version; deploy reviewed default-disabled
code first; activation only after verified remaining>=3, Free plan and admission.
Always restore disabled + cleared access expiry, then verify active settings.
If activation is blocked, finish independent offline/browser/workflow work and
report PARTIAL/BLOCKED rather than consume owner quota or claim hosted PASS.

## Kết quả: PARTIAL — correction PASS; hosted/owner live BLOCKED

V2-REV-01/02: bỏ keyword allowlist cho ngày có năm. Ngày sự kiện, khoảng ngày,
ngày trong bài học và ISO dates được nhận; DOB cá nhân kèm giá trị, email và
chuỗi định danh rõ ràng bị từ chối trước fetch. Chuỗi ngày đứng một mình không
được tự quy thành private access. Đây là guard bảo thủ, không phải PII classifier
hoàn chỉnh. Projection chỉ lấy public DTO; admission deployed chỉ chấp nhận
corpus synthetic nằm trong Worker. Không truy vấn Auth/Gradebook/Supabase.

Temporal: pure helpers vẫn nhận frozen clock; client clock dùng local shortlist.
Worker thay clock payload bằng server instant trước prompt/fact validation; response
header X-Assistant-Clock cho transport recheck bằng cùng mốc. CORS expose header
đúng tên; thiếu clock bị reject. Không thêm schema/service hoặc suy event từ edit.
Regression giả clock1999 để gọi event2000 là sắp tới bị chặn; timezone boundary
16:59:59Z/17:00Z, thiếu năm, start không chứng minh end và frozen tests PASS.

### Cloudflare preflight, deployment và ledger thật

- Account `78913564ee11ed7d2648d8b09852f88f`, đúng Worker/subdomain
  `khtn8-board-assistant-mvp.joemckahn.workers.dev`; không sửa Pages student-dashboard.
- Chrome dashboard Workers plans: Free/$0/Current plan; Workers AI10,000 neurons/day,
  SQLite DO Free quotas hiện có. Không upgrade, thêm thẻ/trial/resource. Model catalog
  trả đúng `@cf/baai/bge-m3` và `@cf/qwen/qwen3-30b-a3b-fp8`. Catalog không chứng minh
  một inference sẽ thành công; entitlement thực thi/model quality NOT RUN.
- API settings xác nhận AI/BUDGET trên namespace cũ;5 deployments lịch sử,13 requests
  hiển thị trước task,0 requests hôm nay trên dashboard lúc preflight. Không dùng
  các số này để suy private billing hoặc traffic tuyệt đối của toàn tài khoản.
- OAuth Billing Read không có: subscriptions metadata trả403, không xin thêm scope.
  DO list limit10 trả400 dù OpenAPI ghi min10; không lặp probe này. Allowance KV
  được đọc qua code status thay vì SQL/hidden KV. Initial Wrangler trong sandbox
  không refresh được token do network; chạy lại ngoài sandbox với quyền task đã
  thành công. Không có model/Worker test phát sinh từ lỗi CLI control-plane này.

| Deploy thành công trong task | Version | State |
| --- | --- | --- |
| Read-only allowance inspection |2128a38e-8586-4486-99d5-13b5a9631c7a|AI=false, bearer hash/expiry20 phút; chỉ status |
| Thu hồi access |c67c6d35-2b3a-4735-9c0c-73584f14e2f7|AI=false, expiry/hash rỗng |
| Đồng bộ validator cuối |2f91bc6a-f686-4398-aa2c-54a8dd898928|AI=false, cả hai expiry/hash rỗng; namespace/identity giữ nguyên |

Không lần nào AI_ENABLED=true.3 deploy trong trần4; không tạo DO/resource mới.
Pre-state version2fe4ac69 có thể dùng rollback; ưu tiên default-disabled version
mới vì có admission. Raw bearer chỉ ở ignored local session, đã ghi đè sau revoke;
digest/expiry đã xóa live. Không lưu token, raw prompts hoặc internal reasoning.

| UTC / operation thực hiện | Worker HTTP | DO | BGE | Qwen | Combined |
| --- | ---: | ---: | ---: | ---: | ---: |
|2026-10-29T12:44:45.236Z GET /preview/status, authenticated |1|1 read status|0|0|2|
|2026-10-29T12:49:40.843Z GET /preview/status, old bearer after revoke =>403 |1|0|0|0|1|
| Tổng lượt Desktop này / V2 lifetime mới |2|1|0|0|3/40|

Activity A3/20, Activity B0/20, OPTIONS0, accepted inference reservations mới0,
reserve/stop calls0, no retry. Trước0/40; sau3/40.37 operations chưa dùng **không**
cấp thêm reservations. Status200 trả nguyên public accounting:

```json
{"budget":{"count":1,"stopped":true,"limit":3,"remaining":0},"enabled":false,"limit":3}
```

Đây là state MVP đã stopped, không phải V2 sử dụng một inference mới. Không reset,
đổi ID hoặc vòng sang v2/v3 khác. Vì vậy model rubric relevance/grounding/citations/
completeness/Vietnamese/abstention/temporal đều **NOT RUN — allowance BLOCKED**.
Không thể giữ hai lượt owner và không báo READY FOR OWNER TEST.

Post-state đọc lại settings live: AI=false, PREVIEW_EXPIRES/access expiry/hash
rỗng, AI/BUDGET namespace không đổi. Old bearer403 chứng minh access bị thu hồi
trước DO/model. Final deploy tiếp tục các giá trị disabled này; verify settings
và version sau deploy, không gọi thêm endpoint test.

Control-plane tách riêng:13 connector API operations tính cả final verification
(kể cả một403 và một400);3 Wrangler deploy thành công,1 lần CLI sandbox auth/network
failure. Số HTTP nội bộ của Wrangler/browser dashboard không được instrument,
không báo tổng control-plane request tuyệt đối. Không tính chúng thành model calls.

### Kiểm thử offline và lỗi phát hiện

Node25.2.1 Windows, dependencies hiện có. Final focused103/103 PASS gồm pure,
transport/Worker V1/V2/V3, retrieval/temporal/paging/privacy/admission. Ma trận
U01–20/T01–10 giữ nguyên acceptance cũ; thêm7 specialist admission/clock/privacy
và1 pure date case. No HTTP/Worker specialist được thêm vào curated CI.

```powershell
node --test tests/assistant-learning.test.js tests/assistant-learning-worker.test.js tests/board-assistant.test.js tests/board-assistant-transport.test.js tests/board-assistant-worker.test.js tests/public-grounding.test.js tests/public-grounding-worker.test.js tests/public-loading.test.js tests/assistant-preview.test.js
npm run check
npm run test:ci
npm run build
npm run format:check
git diff --check
```

- Focused history: lần đầu7 pure PASS nhưng2 files không load do patch return/const
  nhầm nhánh; sửa ngay,20 affected PASS. Sau đó102 combined PASS; sau date-chain
  edge case13 affected PASS; thêm forged-clock case7 PASS; final103 PASS. Không
  giấu lỗi harness/syntax hoặc coi failed invocation là suite PASS.
- check1 PASS; curated CI2 lần131/131 PASS; build2 PASS (giữ warning student-chart
  chunk>500KB cũ). Lặp curated/build cuối vì command gộp ban đầu không giữ exit code
  từng bước và output bị truncate; lượt cuối lưu exit code/raw log riêng. Không
  chạy lại sau đó. Production exclusion PASS, không bundle fixture/test sources.
- format:check chuẩn1 **FAIL do CRLF checkout130 file**, core.autocrlf=true,
  indexLF/worktreeCRLF đã xác minh. Diagnostic `npm run format:check -- --end-of-line auto`
  1 PASS cho toàn scope. Strict scoped Prettier15 changed code/config files PASS.
  Không format toàn repo, không sửa config baseline hay hai dirty file của owner.
- git diff --check PASS. CI GitHub chính thức/physical mobile/Safari/screen reader,
  real-content provenance/security/production acceptance NOT RUN.

Chrome phát hiện thêm lỗi thực AI-V2-REV-04:100vw mobile bao gồm scrollbar, nút
Gửi bị cắt. Đổi width/max-width100% trong media query, không redesign. Before
dialog390.4/client375; after dialog375.2 (fractional CSS rounding), sendRight363.2,
document scrollWidth375/client375, không cắt nút. Landscape sendRight640/client652.

Fixture mới có hai lỗi integration offline được sửa: browser strips Origin trên
constructed Request, và URL /offline-scripted không khớp /chat. Sample HTML alert(1)
bị numeric fact guard chặn đúng; đổi sample sang alert('x') để kiểm DOM literal.
Không hạ guard để làm test xanh, không ảnh hưởng hosted ledger.

### Chrome Desktop E2E mới — scripted, không hosted quality

Actual Chrome installed desktop, localhost4173, `tests/owner-ai-preview.html`,
2026-10-29 khoảng19:46–19:56 Việt Nam. Component BoardAssistant, BoardContainer,
PostPreviewModal, real transport và Worker core dùng fake model/DO trong browser.
Banner DỮ LIỆU GIẢ · SCRIPTED OFFLINE luôn nêu mode, không truy cập backend thật.

PASS observed: identity/introduction/explicit consent; two-source answer/citations;
open exact lesson; filter native lesson/fold IDs và reset; follow-up same sources;
insufficient không source action;503 scripted khóa AI, explicit keyword submit
vẫn hoạt động; Dừng giải phóng form; Escape pending/return focus; snapshot revoke
khi pending đóng panel, nguồn biến mất, reopen context trống, model-call counter1
(embedding fake, Qwen không bắt đầu); HTML literal img không tạo DOM node;
20/11/2026 query được nhận, hiện original/update notices. No unapproved hosted
request từ scripted transport (không gọi fetch); đây không phải network audit của
toàn Chrome/user background tabs. Supabase QA requests/queries0.

Viewports: desktop default1536×720 (client1521);390×844 (client375);
667×375 (client652). Temporary viewport reset. Desktop dialog520×696,
sendRight1484<dialogRight1500.8, input focused. Mobile/landscape no dialog vertical
overflow, composer visible. Không suy thành physical mobile/200% zoom/assistive tech.

Local artifacts (ignored, không Git): `tests/local/owner-ai/desktop.png`,
`mobile-390.png`, `landscape-667.png`, geometry JSON, status/revoked receipts,
`focused-final.txt`, `curated-final.txt`, `build-final.txt`, deployment logs.
Các screenshots mới không được dùng để claim Qwen thật.

Start/Stop workflow đã được chạy thực: Stop trả200, server process kết thúc và
one-shot loopback read bị connection refused. Không để local QA server chạy nền.

### Owner workflow, Git và production gates

[OWNER_AI_PREVIEW](OWNER_AI_PREVIEW.md) có Start/Stop chính xác, URL, câu hỏi,
expected sources, phân biệt mock/keyword/live, troubleshooting và disable checks.
Start local/Stop đã chạy thật; --hosted fail closed trước network. Không cron,
service hoặc secret trong frontend/Git; local server hết hạn30 phút.

Commit/push/Draft PR target ai-learning-assistant theo owner authority, dùng
[CF-Pages-Skip]; không merge/main/develop/web deployment. Publication SHA/PR được
ghi trong final delivery; không tự nhận CI chạy trên remote. Hai dirty file
`.env.example`/`vite.config.js` giữ nguyên ngoài commit, AGENTS không đổi.

Remaining gates: quyết định allowance/budget mới trước hosted; một real BGE+Qwen
case và rubric; owner two-turn live; trustworthy real-content corpus/privacy;
public auth/abuse/rate/cost protections và production release review riêng.
Correction/code ready for review; **NOT READY FOR OWNER LIVE TEST**.
