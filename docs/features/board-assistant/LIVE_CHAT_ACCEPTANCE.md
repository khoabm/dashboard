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

8 focused offline cases PASS: published/private-field isolation, general knowledge,
ordinary dates/large numbers,7 accepted messages, history forwarding/revocation,
short rate cooldown, transient503/quota recovery and one-shot transport. check/build
and production exclusions PASS; only changed executable files formatted. No legacy
Pilot matrix rerun, no deliberate quota exhaustion or hosted spam test.

Chrome offline fault fixture:503 ->same-conversation recovery, checkbox remains
enabled/checked, rate429 message10 seconds, next answer preserves history2;
390x844 clientWidth=scrollWidth390. Fault-injected UI is NOT hosted AI evidence.
Artifacts remain ignored under tests/local/chat-live.

## Deployment and ordered merges

Pending: Free/current usage check, deploy live Worker, PR21 ->ai-learning-assistant,
PR16 ->feature/ai-learning-assistant, integration PR ->develop with applicable checks.
No bypass of protections, no main merge or production website deployment.
Existing Pages project verified: student-dashboard-bcy.pages.dev, production branch
main. CORS configured for this project and its branch previews plus localhost4173;
no owner-only bearer. Workers Free/native rate binding only, no paid resource.

## Final real-data acceptance

Pending on final integrated develop: actual Lịch thi GK1 question (time/duration +
citation), natural follow-up, general question with no Board citations; source-open,
mobile UI. >5 messages/rate/quota/error cases use bounded offline fault injection,
not redundant live inference. Final deployment/config, merge receipts and exact
develop SHA will replace pending entries with actual evidence.
