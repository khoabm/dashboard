## AI-IA01 branch-only enhancement (2026-10-31)

[Execution plan and test gates](INTENT_AWARE_EXECPLAN.md). Draft PR #37 changes
intent routing and response provenance without changing Worker production
deployment. GENERAL bypasses Board and embedding; BOARD/HYBRID require public
Board grounding; ambiguous questions may run a bounded classifier. Local
specialist/browser E2E remain NOT RUN; keep this separate from the actual
2026-10-30 hosted acceptance below.

---

# Live chatbot delivery

Baseline `edc5f31`, feature/ai-learning-assistant-v2-e2e. Owner authorizes anonymous
live Free-only AI, actual published Board reads, short spam cooldown, full ordered
merge21 ->16 ->develop and minimal real-data acceptance. This supersedes Pilot/UAT
admission and lifetime budgets for normal chat. Historical ledgers remain unchanged.

## Concern matrix and inventory

| Concern | Verification |
| --- | --- |
| Public data isolation | Worker fixed posts-only REST route, status=published, anonymous publishable key, exact selected fields; no Auth/Gradebook client credentials |
| General knowledge | No-match Board does not gate model; ids empty accepted and UI labelled general |
| Conversation | Rolling12 message context; source-linked revoked history omitted; repeated messages are unlimited |
| Spam | Native binding3/10 seconds per CF client IP;429/Retry-After10; automatic window recovery; approximate per Cloudflare location |
| Temporary errors/provider quota | Recoverable messages, no global disable or DO stop, manual next request allowed, no automatic retry |
| Ordinary dates/numbers | No output temporal/numeric/revision validation in live Worker or transport |
| Protocol | Bounded JSON/query/history/answer, role whitelist, source IDs mapped to current published native post IDs |
| Source changes | Fresh public read per request; stale source actions filtered against current frontend Board; existing snapshot invalidation retained |

Inventory: assistant-chat helper, live Worker entry, new live transport; small main,
public config and existing chat component integration; Wrangler entry/native rate
binding; focused manual tests and offline UI fault fixture; SPEC single contract,
architecture/profile/map/status/bug record and this acceptance. No framework,
dependency, Gradebook/Auth/RLS/storage or main-branch changes. Old Pilot code remains
historical and is absent from live admission; historical DO export/binding retained
for compatibility, never called by live chat.

Worker reads existing Supabase URL/public key already shipped in frontend, not a
service-role key. Explicit HS(...) lists, email/labelled identifiers are redacted
before model input; no complete personal-data classifier or private-record lookup.
Frontend sends only query/history, never catalog/session/backend state. Public
citations use exact original excerpts and native IDs, rendered as text, not HTML.

## Implementation checks

11 focused offline cases PASS: published/private-field isolation, general knowledge,
ordinary dates/large numbers,7 accepted messages, history forwarding/revocation,
short rate cooldown, transient503/quota recovery and one-shot transport. check/build
and production exclusions PASS; only changed executable files formatted. No legacy
Pilot matrix rerun, no deliberate quota exhaustion or hosted spam test.

Chrome offline fault fixture:503 ->same-conversation recovery, checkbox remains
enabled/checked, rate429 message10 seconds, next answer preserves history2;
390x844 clientWidth=scrollWidth390. Fault-injected UI is NOT hosted AI evidence.
Artifacts remain ignored under tests/local/chat-live.

## Deployment and ordered merges

PR21 merged `ecc7300a0cf9fe39ed796e2b9c0df71bd80ffe76`; PR16 merged
`6d30bafa1ff5ab6e242927eb3cdcf3e4a1cde85b`. PR16 conflict resolution changed docs only.
Latest develop synchronization also had only STATUS conflict; both histories retained.
PR22 merged `f15b0c9db0a52e85904f1b751ce2bccee6d7c84d` into develop.
Correction PR23 merged `410c7227e9f2fb2eccb481c9e00459d269b88690` and PR24 merged
`27b9fb9dab6f44423f0d718011cc013f4e3290db`. Mandatory CI passed before each merge.
Final delivery contains documentation and singular-neuron quota error recognition;
11 focused tests passed after that small error-classification change.
No bypass of protections, no main merge or production website deployment.
Existing Pages project verified: student-dashboard-bcy.pages.dev, production branch
main. CORS configured for this project and its branch previews plus localhost4173;
no owner-only bearer. Workers Free/native rate binding only, no paid resource.

## Final real-data acceptance — PASS, 2026-10-30

Actual Chrome, actual website component at http://127.0.0.1:4173/, direct Cloudflare
Worker, anonymous real published Board (7 posts), no scripted model or synthetic
fixture. Runtime acceptance refs: develop410c722 (Board/follow-up), develop27b9fb9
(general topic correction). Five deliberate UI submissions total: three scenarios
plus two specific failure retests, no automatic repeated inference.

| Scenario | Verified outcome |
| --- | --- |
| Published Board: Trong bài Lịch thi GK1, môn Văn kiểm tra lúc mấy giờ và kéo dài bao nhiêu phút? | 7g20,90 phút, valid Lịch thi GK1 citation; PASS after redirect correction |
| Same-conversation follow-up: Vậy học sinh được về lúc mấy giờ? | 11g10 with same valid citation; PASS |
| New general topic: Vì sao bầu trời có màu xanh? | Correct wavelength/scattering explanation, AI · Kiến thức chung, no Board citation; PASS after topic correction |
| Open cited source | Actual native detail modal displayed exact Lịch thi GK1 body; PASS |
| Mobile390x844 | Document clientWidth=scrollWidth375, send button right363.2; no horizontal overflow |
| More than5 messages,429 recovery,503/quota recovery, revoked sources | Bounded offline fault tests PASS, not forced hosted quota/error experiments |

The original Board response lacked relevant content because Workers rejected
redirect:error. Local actual workerd reproduced that runtime exception. Switching
to manual redirects preserves non200 rejection. Initial general response had an
irrelevant prior-topic citation; retrieval now distinguishes a new topic from a
referential follow-up. Neither initial failed result is counted PASS.

Real source ID `30000000-0000-4000-8000-000000000006`: Lịch thi GK1 explicitly says
26/10/2026, Văn7g20/90 phút, Toán9g20/60 phút, Anh10g25/45 phút, về11g10.
Answer facts were manually checked against those exact published lines. No Gradebook
or Auth record was queried. Board filtering logic is preserved; a new live filter
click was not required. Existing cancel/source revocation checks are reused;
scripted error/recovery evidence is labelled offline.

## Cloudflare deployment and cost

Account `78913564ee11ed7d2648d8b09852f88f`; existing Worker
`khtn8-board-assistant-mvp`. Dashboard verified Workers Free/current plan/$0 and
pre-acceptance usage59.41/10000 neurons today; official Workers AI Free daily ceiling
is10000 neurons. No paid billing/credits/fallback enabled. Supabase organization
plan read confirmed Free. Provider Free quota is the service ceiling; exhaustion
shows a recoverable message, never activates paid inference.

Endpoint: https://khtn8-board-assistant-mvp.joemckahn.workers.dev/chat

Successful Board/follow-up runtime version `bfc92860-ac03-4ff0-b01a-92963ba80b33`;
successful general runtime version `460d3859-bd0e-42af-a809-5bbeb3af8ab7`.
Final deployed version `d1bc8f31-5698-4186-bf08-06e76ed11a1b` adds only singular-neuron
quota error recognition, tested offline. Deployment receipt confirms AI_ENABLED=true,
AI binding, CHAT_RATE_LIMIT3/10s and historical BUDGET binding retained. Historical
DO storage/blocked ledgers unchanged and unused by live code. Existing24 incident
evidence files verified unchanged. No manual reservation or lifetime cap remains.

Native Cloudflare rate limit is approximate per location and shared IP, with
Retry-After10 seconds. No deliberate hosted traffic/quota exhaustion test. Exact
per-inference neuron charges are not claimed from aggregate dashboard usage.

## Owner handoff and limits

Normal usage needs no Owner Preview script/token/expiry/reset. Open the running
local website http://127.0.0.1:4173/, open assistant and ask; AI is on by default and
can be unchecked for local keyword search. Regular repository `npm run dev` uses
the public default endpoint; old local Pilot environment overrides must not be used.
Worker stays enabled for normal operation as explicitly requested. New website
production deployment/main merge was not performed; existing Pages production
branch remains main. Future web releases use the repository's normal workflow.

Evidence screenshots: ignored tests/local/chat-live/real-board.png,
real-followup.png,real-general.png,real-mobile.png.11 focused offline tests PASS;
integrated curated156 tests/check/build and required PR CI PASS. Production build
excludes specialist fixtures. No framework/dependency/Auth/Gradebook/RLS change.
The sampled real answers establish these cases, not universal AI factual accuracy
or a new backend security audit. Final delivery PR/SHA is reported in the handoff.
