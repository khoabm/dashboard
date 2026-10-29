# V2 pilot — explicit allowance / 2026-10-29

## Owner-authorized UAT retest — 2026-10-29

**Hosted retest PASS on the exact owner question; READY FOR OWNER LIVE TEST only
within fresh Free proof/available allowance.** Original failed completion remains
ROOT CAUSE UNCONFIRMED; previous incident below is preserved, not rewritten.

### Authorization, baseline and concern matrix

Baseline30251bd, feature/ai-learning-assistant-v2-e2e/PR21. Owner explicitly approved
`approved-synthetic-v2-owner-uat-v1`, lifetime3 reservations (Codex1/owner2), total
combined operations60 including34 already spent. No additional60 budget. Old pilot
and legacy storage must not reset; same Worker/namespace/class, no new service.

| Concern | Evidence |
| --- | --- |
| Old allowance unusable | Authenticated status confirmed pilot count3/5, stopped=true, remaining0; old ledger remains blocked31/40 |
| Fixed UAT3 and isolation | Same existing DO default3 path, new explicitly approved fixed identity; finite fake-binding and10 actual local workerd/SQLite calls |
| No replenishment | Exclusive Setup EEXIST preserves ledger; Start only reads, role QA1/owner2 persists across restart; unknown identities rejected |
| Lifecycle/cost | Fresh Free proof, server bearer/expiry, local40/60 profiles, precharge/failure latch, disable/readback/revoked403; no retry |
| Busy localhost | Early port check before any hosted activation; occupied-port CLI regression leaves ledger untouched |
| Exact UAT quality | One actual Chrome request, BGE1 +Qwen1, correct revised/original dates and two source citations |
| Privacy/provenance/clock | Existing affected offline admission, synthetic-only windows, authoritative clock, PII and revocation specialists PASS |

Inventory: fixed budget-policy whitelist, preview policy routing, owner controller
fixed profiles, one-time owner-uat-setup, Start/Stop --uat plus early port check;
owner-flow tests/captured completion regression; current owner guide, architecture,
STATUS, BUG_FIX_LOG and acceptance/plan cross-references. No changes to DO class,
storage schema/migrations, retrieval architecture, Auth/Gradebook/RLS, dependencies,
AGENTS, CI scope, merge or website deployment.

### Free preflight and deployment

Cloudflare connector used first. OAuth cannot read subscriptions (403, no Billing
scope); no new billing permission requested. Dashboard Chrome confirmed Workers
**Free/$0/Current plan**, Workers AI **33.13/10k neurons today** at preflight.
Official [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
states Free allocation10k/day and Paid required beyond Free. Conservative headroom
9900 stored locally, receipt30min. No upgrade, credits, card, AI Gateway or paid API.
Dashboard telemetry is account-level, not exact per-question attribution.

Before any inference, live settings confirmed AI=false/access empty, AI/BUDGET
bindings and namespace `a6b907897eef4f41a630b2920645e8c3`. Temporary authenticated
status access kept AI=false, read old pilot once and restored original settings;
bearer403 verified. Immutable old-ledger SHA256 unchanged:
`d416ba759f74953cde3f2dfc92c39d2a3a1cc35bebe86e8e44275f8a9f080d1b`.

UAT uses same Worker `khtn8-board-assistant-mvp`, same namespace/class/migration,
fixed UAT identity, exact server synthetic corpus, memory-only raw bearer, hashed
server access and<=15min expiry. No unrestricted endpoint, no Supabase/private data.
Deploy receipts: disabled/status `3945f99a-8439-4d7e-a8a9-ab485327befa`, enabled QA
`51441f67-056a-4c8a-a196-8edc1ea52552`, final disabled
`05fe5539-13fa-411a-bd26-503474ac4980`. Disable/readback succeeded; expiry/hash/access
cleared, old bearer403. New diagnostics are deployed with this version.

### Actual Qwen result and quality

Question, sent exactly once via real BoardAssistant consent/transport in installed
Chrome at localhost4173: “Xưởng mô hình giấy diễn ra khi nào? Có thay đổi lịch không?”

Actual response: “Xưởng mô hình giấy được điều chỉnh diễn ra vào ngày 22/11/2026 tại
sân mô phỏng. Trước đó, hoạt động dự kiến diễn ra ngày 20/11/2026. Vật dụng cần mang
vẫn là giấy tái chế và bút màu.” Citations: update and original notice, validated
wire IDs mapped to native Board posts. No invented historical completion/reasoning.

| Rubric | Observed disposition |
| --- | --- |
| Relevance/completeness | Answers when and whether changed; extra preparation detail supported |
| Factual grounding | New22/11, old20/11, sân mô phỏng, paper/color pens match supplied sources |
| Citations | Both update and original notice present, native opening update verified |
| Temporal correctness | Explicitly marks old date as prior plan; no metadata/event confusion or invented year |
| Vietnamese clarity | Natural, concise and understandable |
| Abstention | NOT TESTED live in this one case; offline rejection/abstention retained |

HTTP200 is accompanied by a useful fact-checked answer, not alone a quality PASS.
Newly captured completion was additionally replayed offline against baseline8ed8c19
temporal guard: rejects `revision`; corrected guard passes. This establishes the
fix's relevance to the NEW completion, not the missing historical503 response.

### Raw combined-operation ledger (UTC)

| Time | Activity | Worker | DO | BGE | Qwen | Delta | Cumulative |
| --- | --- | --- | --- | --- | --- | --- | --- |
| carry | immutable incident | — | — | — | — |31|31|
|15:53:49 start|old pilot status200:3/stopped/remaining0|1|1|0|0|2|33|
|same preflight|revoked bearer403 after restore|1|0|0|0|1|34|
|16:01 QA start|UAT status200:0/3, stopped=false|1|1|0|0|2|36|
|16:02:23.598|exact question HTTP200|1|1 reserve|1|1|4|40|
|16:04:01.918|final UAT status200:1/3, remaining2|1|1|0|0|2|42|
|16:04:26.750|revoked bearer403 after disable|1|0|0|0|1|43|

This task delta12 =Worker6 +DO4 +BGE1 +Qwen1; OPTIONS0, model retries0.
UAT QA1/owner0 used; real DO count1, stopped=false, remaining2 verified. Remaining
operations17/60. One owner Start +2 fresh questions +Stop costs<=13 => total<=56;
do not consume margin on zero-inference Start/Stop rehearsals or model screenshots.
Old pilot ledger is NOT changed to43: current combined ledger is separate
`tests/local/owner-ai-uat/ledger.json`, carrying old31 +preflight3 exactly once.

Control plane separate from this combined data-plane contract: connector batch4
attempted reads (subscriptions403; other three results lost when batch rejected),
one subsequent settingsGET200 and one independent final settingsGET200;
authenticated local preflight4 REST actions
(GET/PATCH/PATCH/GET); controller3 settingsGET and3 Wrangler deploy actions.
Internal Wrangler/dashboard HTTP is not fully instrumented, so no exact total
control-plane HTTP count is claimed. No subscription/billing mutation occurred.

### Tests, browser and delivery limits

62 affected offline fake-binding cases PASS in one batch; captured-completion
addition made final UAT suite20/20 (63 unique affected cases across runs).10 finite
local workerd/SQLite calls PASS.2 actual local CLI guards PASS: occupied port and
exclusive repeated Setup. Initial sandbox workerd EACCES was a local environment
failure; rerun with loopback permission passed, no hosted retry. check/build,
production exclusions, scoped Prettier and diff checks PASS; no broad CRLF format,
curated CI/stress/load rerun. Source changes after the hosted test are test/docs only.

Actual Chrome desktop1536×720: hosted banner, consent, one send, answer/two citations,
opening exact update source and query focus PASS.390×844: client/scroll widths375,
no horizontal clipping; viewport reset. No extra model call for screenshots/open.
Filter/cancel/error/revocation remain earlier scripted regressions, not re-run using
owner quota. Opening a source clears panel context; no second QA question to recover
it. Evidence new under ignored `tests/local/uat-retest/`: live-answer.png,
live-mobile.png, free-plan.png, usage-before.png, status-receipt.json, offline.txt,
captured-tests.txt, captured-replay.mjs; controller deploy logs/new ledger under
owner-ai-uat. Raw prompts/model reasoning/bearers never written to Git/default logs.

Automatic approval review rejected the first Stop lacking --uat; no command ran.
Explicit --uat Stop was approved and completed disable/readback/revoked403. Normal
Stop dispatches to the existing UAT session; recover also selects UAT explicitly.
No remaining blocker from that rejection.

[Owner commands](OWNER_AI_PREVIEW.md): Start `--hosted --uat`, Stop `--uat`,
emergency disable `--recover --uat`. No owner inference or additional hosted
Start/Stop rehearsal was performed, preserving two owner slots and enough operations.
The common Start/Stop lifecycle is validated live by QA; owner role caps offline.
Final state is disabled. READY is time-bound by Free receipt30min and unchanged
allowance; expired/blocked/missing receipt must fail closed. No merge, no public
website deployment. Real published-content provenance/privacy, broader AI quality,
public admission/abuse/cost and production release remain separate gates.

---

## Owner UAT incident — offline correction / 2026-10-29

**Correction PASS offline; overall PARTIAL; failed owner hosted scenario FAILED;
ROOT CAUSE UNCONFIRMED; NOT READY FOR OWNER LIVE TEST.** Historical two-sample
hosted acceptance below does not include or override this incident.

### Facts and limits of historical attribution

Question supplied by owner: “Xưởng mô hình giấy diễn ra khi nào? Có thay đổi lịch không?”
Reviewed baseline `8ed8c1965424ca86805ad98958930e6cd2df9ed0`. Owner subsequently
committed in-progress source/tests as `ddd2a798b8f0d4010acd5880bd4d3939fc275f28`;
reconciled without resetting or overwriting that commit. Subsequently fast-forwarded
remote commits through `fb763e114003928a82a744096595b91f9d4ab2b3`, preserving the
reviewer's exclusion of unrelated env/Vite changes. STATUS conflict and duplicate
bug entry were reconciled into the current Desktop evidence, stable AI-V2-OWNER-UAT-01.

Existing local ledger, timestamps UTC (not response-duration measurements):

| Request started | Existing receipt | Combined operations |
| --- | --- | --- |
| 14:33:12.604 | status200; count2/5, stopped=false, remaining3, enabled=false | 2 |
| 14:34:26.492 | chat503; model calls2, BGE1/Qwen1, Worker1/DO2 accounting | 5 |
| 14:34:48.466 | revoked bearer status403, preview_access | 1 |

Cumulative31/40, qaReservations2, ownerReservations1, blocked=true; nine operations
are unspent, not authorization to bypass the stop. DO2 in the error receipt is the
old controller's conservative reserve+stop estimate, not evidence that stop succeeded.
Two model-call counters mean calls started, not that Qwen completed successfully.
No exact model completion, error stage or validation reason was retained. Controller
read X-Assistant-Stage for accounting and discarded it; CLI log has zero occurrences
of that header or unsupported_date/unsupported_number markers. The Node chat fetch
did not go through Wrangler logging. No historical Qwen response was reconstructed.

| Possible failure | What existing evidence establishes |
| --- | --- |
| Qwen failure/timeout | Qwen call started; completion/timeout unknown |
| JSON/envelope/contract failure | Consistent with503, no saved response to distinguish |
| Unsupported citation | Not historically distinguishable |
| Unsupported date/number | Not historically distinguishable |
| Revision/cancellation guard | One revision false rejection reproduced offline only |
| Client/Worker clock | Baseline overwrites client clock server-side; no demonstrated mismatch or historical proof of cause |
| Other runtime exception | Cannot exclude from generic503 |

Immutable ledger SHA256:
`d416ba759f74953cde3f2dfc92c39d2a3a1cc35bebe86e8e44275f8a9f080d1b`.
An ignored manifest fingerprints original local evidence; no incident artifacts or
allowance data were overwritten. Remote DO count/stopped/remaining and current live
Worker settings were NOT re-read. Historical revoked bearer403 does not prove a
current Worker configuration. No deployment/re-enable/reset/identity change occurred.

### Concern/test matrix and change inventory

Inventory: public-temporal acknowledgement, assistant-learning citation error code,
Worker safe diagnostics, shared assistant-diagnostics helper, controller receipt
projection, finite assistant-owner-uat tests, offline owner fixture scenario;
architecture map, this acceptance, STATUS, BUG_FIX_LOG and owner instructions.
No retrieval redesign, quota change, Auth/Gradebook/RLS, AGENTS, dependency or CI change.

| Concern | Controlled replay / expected result | Actual |
| --- | --- | --- |
| Exact question, new22/11 and superseded20/11 | đổi lịch, dời lịch, chuyển sang, đã được điều chỉnh; valid cited facts200 | PASS |
| Natural acknowledgement alone | “diễn ra ngày22/11/2026; lịch đã được điều chỉnh” | Baseline503; corrected200 |
| Necessary supporting citation absent | Original notice only cannot support22/11 | 503 unsupported_date |
| Update-only citation | Update itself explicitly supports both dates/replacement; do not arbitrarily demand two sources | 200 |
| Invented date or quantity |25/11 or99 sheets absent from sources |503 unsupported_date/unsupported_number |
| Revision omitted |22/11 asserted with no change acknowledgement |503 revision |
| JSON/envelope/contract/citation | Corrupt JSON, missing response, invalid shape, invented ID |503 distinct safe codes |
| Qwen exception or timeout | Two calls started; one stop; no retry |503 generation_failure/inference_timeout |
| Stop rejected or throws | Distinguish rejected/unconfirmed from confirmed |PASS; no retry |
| Unsafe diagnostics | Unrecognized/raw header values discarded |PASS |
| Clock, privacy, universal topics, cancellation/revocation | Existing affected offline specialists |PASS |

Correction adds only `dieu chinh` to answer revision acknowledgement, leaving source
revision detection and date-kind/year/number/citation/cancellation checks intact.
This does not prove semantic entailment or prevent every stale-answer formulation.
Diagnostics are bounded stage/reason, reserved boolean and failureStop enum;
model-call counts already existed. HTTP errors remain generic. Worker checks stop
response status; unknown storage outcome stays unconfirmed. Controller persists only
allowlisted chat diagnostics/counts/status, no complete answer/source bodies by
default; prior saved synthetic success evidence remains unchanged. Diagnostics take
effect in hosted use only after a separately scoped deployment; none was performed.

### Actual offline execution and Chrome evidence

Before patch:14 exact-question replay cases,13 PASS/1 reproduced false rejection.
After patch:14/14; after diagnostic assertions/additions, affected batch108/108
(17 UAT +91 existing). Final UAT suite19/19 after two extra contract/storage cases;
110 unique passing cases across these runs, not110 newly repeated full suites.
Final wording assertions additionally isolate each revision phrase (no shared
“thay thế” phrase masking the acknowledgement check).

```powershell
node --test tests/assistant-owner-uat.test.js tests/public-grounding-worker.test.js tests/assistant-learning-worker.test.js tests/assistant-pilot.test.js tests/assistant-preview.test.js tests/public-grounding.test.js tests/assistant-learning.test.js tests/board-assistant-transport.test.js
node --test tests/assistant-owner-uat.test.js
npm run check
npm run build
```

Check/build PASS; existing chunk-size advisory remains. Scoped Prettier covers only
seven changed executable files; git diff --check covers delivery. No broad CRLF
reformat, curated CI rerun, stress/load, remote test or local DO migration required.
Bindings are in-process synthetic equivalents, NOT real Qwen, BGE or hosted DO.

Actual Chrome at `http://127.0.0.1:4173/tests/owner-ai-preview.html`, labelled
SCRIPTED OFFLINE. New screenshots in ignored `tests/local/owner-uat-forensics/`:
chrome-temporal.png, chrome-mobile.png, chrome-error.png, chrome-revocation.png.
Desktop1536×720: consent, exact UAT answer200 with two fake model calls, notice/update
citations, opening update source and filtering Board to two cited posts PASS.
Viewport390×844: clientWidth=scrollWidth375, focus assistant-query, no horizontal
overflow; temporary viewport reset. Error503 fake disables AI with generic message.
Dừng tìm cancels a pending fake request and restores query focus; by click time
both fake model calls had started, no claim that cancellation prevented Qwen start.
Revocation invalidates/closes panel, hides revoked post, no stale answer, fake calls1.
One sandbox localhost launch and one interrupted revocation observation failed;
after loopback access fix/page refresh, bounded revocation check completed. These
are tooling interruptions, not hosted errors. No screenshots reused from old pilot.

### Budget, retest and owner handoff

This investigation: Cloudflare data-plane0, control-plane0, BGE0, Qwen0, DO0,
deployments0; Supabase/private backend0. Original ledger31/40, blocked=true and its
SHA256 remain unchanged. No live state verification is claimed. Current hosted
acceptance and owner-ready stay BLOCKED; earlier two hosted successes remain history.

Owner can run [scripted offline replay](OWNER_AI_PREVIEW.md) without modifying source.
Owner later allowed real models if useful; no new hosted request was made because
the incident latch/DO stop and current Free/remaining allowance are unresolved.
A bounded real retest would be useful after a concrete incident-recovery plan,
verified $0/remaining allowance and authorized deployment with these diagnostics.
It would validate a new completion, not recover the lost historical root cause.
Do not erase the blocked ledger, reset storage, mint identities or silently
replenish reservations to achieve it. No merge or website production deployment.

---

## Historical pilot acceptance (before owner UAT)

Baseline9bd7bf5, branch feature/ai-learning-assistant-v2-e2e, existing Draft PR21.
Owner explicitly authorizes one independent identity `approved-synthetic-v2-pilot-v1`,
lifetime5 reservations (Codex<=3, prefer owner2). Legacy approved-synthetic-mvp-v1
count1/stopped is preserved. Same namespace/class/migration; no reset or generated IDs.
Combined V2 budget remains40, carried usage3; control plane recorded separately.

## Concern/test matrix and expected inventory before changes

| Concern | Files | Verification |
| --- | --- | --- |
| Natural dates/self-disclosed DOB | board-assistant utility, focused tests | event/month/year accepted; 'Em sinh...' blocked before cloud; private grade request remains unsupported |
| Independent finite pilot | Worker core/preview/config + small budget-policy module/tests | explicit identity5 vs legacy3; same storage untouched; final-slot serialization/restart/stop/corrupt state; actual local workerd if available |
| Owner hosted workflow | existing start/stop + shared manual controller, fixture mode banner | default offline; short-lived bearer server-only; status before enable; persistent conservative ledger incl3; Stop/expiry disabled; no new allowance on Start |
| Real model acceptance | Chrome actual Board/chat + finite receipt | minimal single-source and multi-source questions; fresh BGE+Qwen calls, facts/citations manual rubric; no retry; no deterministic model usage |
| Delivery | Gate C/owner/status/bug/architecture/SPEC/PR21 | scoped checks; no merge/web deploy/Auth/Gradebook/Supabase/AGENTS/dependency edits; retain dirty env/Vite |

Preflight live settings: correct account/Worker, AI=false, access/expiry empty,
AI/BUDGET existing namespacea6b907897eef4f41a630b2920645e8c3. Chrome Free/$0/current
plan confirmed; Workers AI daily headline0/10000 (24h historical chart15.4 neurons,
not today's total). Official Free pricing rechecked. No inference so far.

Plan: deploy disabled admission with temporary access, read pilot status once,
enable short preview only if fresh Free proof/usage/allowance/caps pass; up to3
Codex queries (prefer2 meaningful cases), then status and disable/proof. Reserve
operations for owner start status2, two new questions<=8, status/disable proof3.
No retry after inference/auth/quota/timeout/503 failure; no second identity.
Owner start uses fresh bounded preflight receipt plus live settings/status;
expired Free evidence fails closed and requires revalidation, never billing scope
expansion or a paid fallback. Crash leaves absolute Worker expiry fail-closed.

## Acceptance result

**Correction PASS. Hosted Pilot PASS theo hai mẫu nhỏ. Owner workflow PASS.**
**READY FOR OWNER LIVE TEST trong cửa sổ Free receipt30 phút còn hiệu lực**;
ngoài cửa sổ cần reverify, không tự mở hosted bằng receipt cũ. Final Worker disabled.
Không bảo đảm mọi câu tương lai, temporal/follow-up/abstention model quality hoặc
production-ready. No website deploy/merge, Supabase/Auth/Gradebook/RLS/real students0.

### Correction và offline evidence

Environment: Windows/Node25.2.1, installed Chrome desktop; existing dependencies,
Wrangler4.154.0/Miniflare5/workerd, không cài thêm package hoặc extension.

```powershell
node --test tests/board-assistant.test.js tests/assistant-preview.test.js tests/assistant-pilot.test.js tests/board-assistant-worker.test.js tests/assistant-learning-worker.test.js tests/public-grounding-worker.test.js
node --test tests/assistant-pilot.test.js tests/assistant-preview.test.js
node --test tests/assistant-pilot.test.js
node --test --test-name-pattern 'localhost gate' tests/assistant-pilot.test.js
```

Theo thứ tự54,12,6,1 PASS sau các thay đổi được giải thích bên dưới; không cộng
chúng thành số case độc lập. Specialist assets/manual, không CI.

- Nhỏ gọn: thêm first-person birth cue cho “Em/Tôi/Mình/... sinh [ngày]...”.
  Event date/month/year và câu sinh học vẫn được nhận; ngày sinh cá nhân/email/
  định danh rõ ràng không fetch. Private grade query giữ unsupported. Worker time
  authoritative/Asia/Ho_Chi_Minh và frozen tests giữ nguyên, không rebuild retrieval.
- 54 focused tests (pure/privacy/Worker/V3 contracts/legacy compatibility) PASS.
  Sau thêm local preflight latch/role/budget guard,12 affected tests PASS; localhost
  privacy/provenance gate6 affected PASS (valid follow-up recheck1 PASS); tổng56
  unique cases, không gọi lại toàn Gate A/B hoặc curated CI không bị ảnh hưởng.
- Actual local workerd/SQLite11 finite invocations PASS: pilot5 last-slot serialize,
  legacy1/stopped isolated. Hai setup attempts trước đó FAIL vì Miniflare5 schema
  và library exports vào Worker entry; đã sửa harness bằng V4 converter + chỉ
  export DO/handler. Không model/hosted traffic từ harness, không load/stress.
- npm run check1 PASS, build1/production exclusion PASS (warning student-chart
  chunk cũ). Changed-code scoped Prettier PASS, git diff --check PASS. Whole-checkout
  CRLF format issue trước đây vẫn là baseline; không format lan repo hoặc rerun
  full check để tạo PASS. New manual tests không vào test:ci.
- Owner controller có ledger persistent carry3, precharge trước HTTP, unknown
  completion giữ charge; failure latch cấm silent Start. Missing/corrupt ledger,
  paid/unknown/expired Free proof, quota/role exhausted => BLOCKED trước network.
  Raw bearer memory-only, CLI token chỉ dùng control plane, không log/Git/frontend.
  Localhost cũng validate query/context và exact synthetic windows trước khi gửi
  bytes lên Cloudflare; arbitrary private fields/forged body bị chặn cục bộ.

### Free/cost and live deployment evidence

Chrome Free/$0/Current plan, usage trước0/10k today; Last24h chart BGE1.32 +Qwen14.08
neurons là historical, không cộng thành today's usage. Receipt lấy remaining9980
bảo thủ, yêu cầu>=2000 trước hosted. Pricing/model access sources:
[Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/),
[Qwen3](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/),
[BGE-M3](https://developers.cloudflare.com/workers-ai/models/bge-m3/).
Hai real200 chứng minh entitlement thực tế trên Free cho hai model; không Paid,
card/trial/prepaid/credit/AI Gateway billing/resource mới. Quota telemetry có độ trễ,
không suy dashboard rounding thành neuron counter chính xác của từng call.

Same namespacea6b907897eef4f41a630b2920645e8c3/classAssistantBudget/migrationv1.
Fixed policy legacy3 vs pilot5 theo internal paths; không đổi storage legacy,
không reset/replenish/generate identity. Enabled preview chỉ bearer256-bit có hạn,
SHA-256 server validation, allowed loopback + exact server synthetic windows.
Không tin arbitrary client published claims. Không có token trong UI/VITE/source.

| Deployment | Version | Result |
| --- | --- | --- |
|QA disabled access/status|1abcba6b-7150-420d-ae65-3cc87831188a|pilot0/5 +legacy1/stopped verified |
|QA enabled15min|6d350645-9da0-4fd3-8e3a-247db1926915|2 actual questions200 |
|QA disabled/revoke|fbdc67b5-5438-4f5e-a4b0-9fa47472d49b|readback disabled +old bearer403 |
|Owner rehearsal disabled access|901bfe73-4c14-4f01-9266-f7de4f38c49d|same pilot2/5 remaining3 |
|Owner enabled15min|b9a799f3-cb31-4a5d-9e47-956e6d15b0ba|Chrome hosted UI, no inference |
|FINAL disabled/revoke|43f75f32-3805-4f14-884f-d1e48a84f5ce|AI=false, both expiry/hash empty, old bearer403 |

Controller live settings before/after activation +disable checks AI/BUDGET/exact
namespace, identity and flags. Connector final read confirms same values. Rollback
pre-state version2f91bc6a is recorded; default-disabled new config preferred so pilot
policy stays explicit. Stop --recover never resets state. Crash expires<=15min.

### Actual Qwen3 results and rubric

**A / 2026-10-29T13:51:01.618Z (20:51 Việt Nam)**
Question: “Trong bài Lực đẩy trong nước, lực tác dụng lên vật theo hướng nào?”
Qwen: “Lực tác dụng lên vật trong nước theo hướng từ dưới lên.”
Citationc0 maps to native lesson; exact source quote contains the same direction.
Worker200, BGE1/Qwen1, reserve1. Relevance, grounding, citation support,
completeness and Vietnamese clarity PASS for this question. No invented numbers,
dates/places. Abstention/temporal NOT TESTED here.

**B / 2026-10-29T13:52:04.595Z (20:52 Việt Nam)**
Question: “So sánh nội dung bài Lực đẩy trong nước và bài Nếp gấp sao giấy:
mỗi bài giúp em hiểu hoặc thực hiện điều gì?”
Answer:

> Bài 'Nếp gấp sao giấy' giúp em hiểu cách gấp sao giấy theo đường chéo và sử dụng
> giấy tái chế. Bài 'Lực đẩy trong nước' giúp em hiểu về lực đẩy hướng từ dưới lên
> trong nước, giải thích hiện tượng vật nổi. Cả hai bài đều liên quan đến thực hành
> và ứng dụng kiến thức thực tế.

c0=>fold, c1=>lesson, both exact source quotes checked; Worker200/BGE1/Qwen1/reserve1.
Relevant, clear Vietnamese, correct distinct source attribution and core facts.
Completeness partial: does not repeat “miết phẳng”; final commonality sentence is
a mild interpretation beyond explicit source wording. No severe hallucination in
tested facts, no invented number/date/location/person. Grounding/citation support
PASS for core facts with these limitations, not proof of semantic entailment.
No third test spent: keep remaining allowance. C temporal/follow-up/abstention
model quality NOT RUN; offline contracts are separate evidence.

### Raw ledger — cumulative23/40, no retries

| UTC start | Operation | Worker | DO status/reserve/stop | BGE | Qwen | Combined |
| --- | --- | ---: | --- | ---: | ---: | ---: |
|carry previous task|status/revoke|2|1/0/0|0|0|3|
|13:49:42.956|QA pilot status disabled|1|1/0/0|0|0|2|
|13:49:45.784|legacy status readonly|1|1/0/0|0|0|2|
|13:51:01.618|A POST200|1|0/1/0|1|1|4|
|13:52:04.595|B POST200|1|0/1/0|1|1|4|
|13:54:22.775|QA final status:2/5 stopped=false remaining3|1|1/0/0|0|0|2|
|13:54:46.146|QA revoked bearer403|1|0/0/0|0|0|1|
|13:55:51.828|owner Start status: same2/5|1|1/0/0|0|0|2|
|13:58:04.573|owner Stop status: same2/5|1|1/0/0|0|0|2|
|13:58:30.436|owner revoked bearer403|1|0/0/0|0|0|1|
|TOTAL|including carry3|11|6/2/0|2|2|23|

This task:20 operations (Worker9 +DO7 +BGE2 +Qwen2). OPTIONS0; accepted reservations2;
owner inference0; no retry/second identity/reset. Remaining17 operations, pilot3
reservations; owner workflow caps2 and reserves shutdown margin. One owner Start+
2 new questions+Stop costs<=13 => cumulative<=36/40. Spare reservation not auto-used.
Control plane separate:6 deploy actions; controller6 settings reads (QA pre/post/
disable3 +owner pre/post/disable3). Connector3 reads (2 Worker settings,1 account
settings) trong task này. Recover không chạy. Không dùng inference làm probe.
Internal Wrangler/browser HTTP
counts are not instrumented; do not claim an exact combined control-plane HTTP total.

### Chrome and owner workflow

Actual installed Chrome localhost4173, actual BoardAssistant/Board/PostPreviewModal,
real frontend transport -> local memory-auth controller -> Worker -> real AI binding.
Consent checked once per conversation, A answer/source opened exact lesson; B answer
two citations, filter leaves lesson/fold, notices absent. Mobile390×844 using same
real answer (no extra inference): client375/scrollWidth375/sendRight363.2; no clipping.
Temporary viewport reset. No private data, source text synthetic, no automatic retry.
Cancel/races were already accepted offline; no real cancellation spends owner quota.

Owner Start --hosted successfully re-enabled same allowance and Chrome showed
Cloudflare mode. No model calls in rehearsal. Corrected Stop waited for deploy,
readback and old-bearer403; final connector flags disabled. Initial Stop client3s
timeout was local while server shutdown succeeded; no failed model/retry. Fixed
to60s and rehearsed successfully. Offline fallback Start/Stop also PASS; Chrome
rejects “Em sinh20/11/2010...” before a turn, accepts month11/2026 keyword query.

Ignored local artifacts: tests/local/owner-ai-pilot/{ledger.json,free-preflight.json,
free-plan.png,usage-before.png,live-single.png,live-multi-desktop.png,
live-multi-mobile.png,workerd.txt,check.txt,build.txt,deploy-*.txt}. No raw bearer,
OAuth token, internal model reasoning or private prompts in Git/evidence. CLI log
checked for token JSON: absent. No screenshots reused from prior task.

### Delivery limits

[Owner Start/Stop guide](OWNER_AI_PREVIEW.md). Fresh Free proof required at each
Start, age<=30min; owner-ready is time-bounded. Expired proof => BLOCKED hosted,
offline still available; renew only after actual Free/usage revalidation. Ledger
missing/uncertain/failure latch => no silent restart or replacement identity.
Final Git SHA/PR21 receipt recorded in delivery. No merge/main/develop push or
website deployment; CF-Pages-Skip. Existing dirty env/Vite and AGENTS unchanged.
Production needs real-content provenance/privacy, public admission/abuse/cost,
broader quality including temporal/abstention/follow-up and physical device/Safari
acceptance. This pilot does not replace these gates.

## Final handoff receipt

Source/tests/docs checkpoint `0c08325c5349e393a4dbc88e92b734a1e1e1d278` đã push,
remote khớp local; giữ [Draft PR21](https://github.com/khoabm/dashboard/pull/21)
target ai-learning-assistant, không merge. Biên nhận cuối này docs-only, không
đổi source, test/model calls hoặc ledger. Env/Vite dirty có sẵn giữ ngoài commit.

Fresh Chrome read sau QA: Free/$0/Current plan; **16.72/10k neurons hôm nay**.
Không quy chính xác telemetry account thành mức tiêu thụ của từng câu.
Local preflight refreshed2026-10-29T14:21:15.049Z, conservative remaining9000,
valid đến2026-10-29T14:51:15.049Z (**21:51:15 Việt Nam,29/10/2026**).
Không bật lại AI trong bước renew; final Worker43f75f32 vẫn disabled, ledger23/40,
pilot còn3/5. Ngoài cửa sổ này hosted Start phải BLOCKED đến khi reverify Free/usage.
