# V2 pilot — explicit allowance / 2026-10-29

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
