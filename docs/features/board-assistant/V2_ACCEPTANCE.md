# Scoped Grounded Learning Assistant V2 — acceptance / 2026-10-29

**PARTIAL — local implementation reviewable; hosted quality/public release BLOCKED.**
Baseline ai-learning-assistant50ea1cbf30b6fa603fce43f588aaa921f6ec54da (PR18 included).
Task feature/ai-learning-assistant-v2-e2e. Feature checkpoint bf99afb; final source adds same-ID
snapshot invalidation before send and normal synthetic screenshots. Final commit/remote/PR receipt
is in the owner delivery report. [Architecture/plan](V2_EXECPLAN.md). No merge or website deployment.

## Implemented checkpoints

| CP | Result | Evidence and limits |
| --- | --- | --- |
| 01 Website knowledge | PASS offline | fixed verified site purpose/audience/capabilities; current published topic/resource counts; bounded named lists with truncation notice, empty/changed catalogs; no model for profile |
| 02 Intent/retrieval | PASS scoped | Vietnamese normalized rules distinguish website/audience/inventory/topic/overview/educational/follow-up/search/sensitive unsupported. Ambiguous outside questions rely on model abstention; not a general intent classifier |
| 03 Generated response | PASS mock / BLOCKED hosted | existing BGE ranking + Qwen JSON status/answer/IDs/coverage; <=1800chars/3 citations, no extra keys; answered requires allowed source IDs; insufficient text replaced with fixed refusal |
| 04 Conversation/UI | PASS synthetic | one prior validated question + <=3 source IDs, memory-only; follow-up restricted to prior sources; current snapshot checked before send/after response/action; close/reset/cancel clears ownership; natural answer uses text DOM |
| 05 Security/cost | PASS bounded contracts / BLOCKED production | shared public wire validator rejects private fields before fetch; no tools/writes/Auth/Gradebook; no retries;40s Worker/45s transport deadlines; existing global lifetime4 reservation/stop guard and disabled config retained |
| 06 Acceptance | PARTIAL | final offline and actual Chromium gates PASS; Cloudflare identity/quota absent, no hosted pilot; API prevents Draft PR; remote receipt in owner handoff |

The source model is public title/body/topic text, not file bytes. Counts include only topics represented
by published posts, explicitly labelled. Lists show<=20 topics and<=10 titles, never a silent complete
summary claim. AI catalogs>24 are disabled rather than sampled. Context retains one prior question,
not model-generated prose, bounded by400chars and current source IDs. The UI transcript is bounded
by9 message rows. Neither context nor answers are written to storage/logs/analytics.

## Commands and outcomes

Node24.19.0, Vite8.3.5, existing locked dependencies retained (no dependency declaration/lock change).

| Command | Outcome |
| --- | --- |
| npm run check | PASS frontend/13 Edge module syntax, scoped credential literals, diff whitespace |
| npm run test:ci | PASS131/131; policy unchanged, includes Gradebook pure regressions |
| node --test tests/assistant-learning.test.js tests/assistant-learning-worker.test.js tests/board-assistant.test.js tests/board-assistant-transport.test.js tests/board-assistant-worker.test.js | PASS33/33: V2 pure5/specialist9, V1 pure6/transport5/Worker8 |
| npm run build | PASS production exclusion; existing nonfatal chunk-size warning |
| npm run format:check; git diff --check | PASS |
| PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/assistant-learning-browser.cjs | PASS6 viewports; generated mock responses, exact profile counts/zero requests even opted-in, follow-up context, citation navigation/focus, close/reset, quota/no retry, safe markup text and reduced motion |
| PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/board-assistant-browser.cjs | PASS8 viewport V1 regressions, keyboard preview focus, suggestion no-send/new, stop/close delayed responses, cloud failure/reopen |
| Explicit existing audit fixture actual-main driver (tests/local/assistant-e2e/assistant-board.cjs) | PASS manual persistence, source filter, refresh, reset, topic handoff/manual selection; zero hosted calls |
| Additional bounded accessibility probe (tests/local/assistant-v2) | PASS720x450 reflow proxy, changed-snapshot context invalidation before request and measured text contrast |

Focused tests ran during implementation; full final suite ran after stable implementation. Only affected
browser/check/build/format checks were rerun after the observed same-ID snapshot ownership correction;
unchanged curated suites were not rerun merely to accumulate PASS. Source test behavior is preserved
by final docs/evidence commits. Official GitHub Actions NOT RUN for integration-target branch; triggers
remain develop/main. No tests/HTTP/Worker/browser specialists added to test:ci.

## Browser evidence

Actual /usr/bin/chromium with environment Playwright core, Vite in same cloud machine.
360×640,390×844,667×375,768×1024,1024×768,1440×900; V1 also1024×375 and720×450.
[Geometry](evidence/v2-20261029/geometry.json), [contrast](evidence/v2-20261029/accessibility.json),
[desktop](evidence/v2-20261029/desktop.png), [mobile](evidence/v2-20261029/mobile.png),
[landscape](evidence/v2-20261029/landscape.png). Remaining screenshots/finite drivers under ignored
 tests/local/assistant-v2 and tests/local/assistant-e2e. Requests blocked outside loopback; actual
external HTTP0. Contrast: answer10.61:1, disclosure5.49:1, consent7.07:1. These measurements do not
constitute an exhaustive accessibility audit. Native200% zoom, screen-reader runtime, physical
mobile keyboard/iOS/Safari NOT RUN. Half-size viewport is a reflow proxy, not native zoom evidence.

## Synthetic model evaluation (not live Qwen)

| Input / evidence | Expected | Actual scripted-binding result |
| --- | --- | --- |
| Web này làm gì? / Tôi có thể làm gì trên website? | deterministic purpose, zero inference | verified KHTN8 purpose/capabilities, calls0 |
| Có bao nhiêu học liệu? / topic listing | exact public inventory | pure fixture2 resources/2 represented topics; browser1/1; draft excluded |
| Giải thích bọt khí; source says reaction creates gas/bubbles | supported explanation with p citation | “Phản ứng tạo khí làm xuất hiện bọt khí.”, p valid |
| Giải thích dễ hiểu hơn | same source scope; bounded prior question | same p only; prior question transmitted; candidate q rejected |
| Unsupported question/output | insufficient; no invented external facts | fixed refusal replaces scripted “Invented capital”; no sources |
| Injected instructions / extra tools / unknown IDs | data, no privileged instructions/actions | system marks data untrusted; extra keys/unknown IDs fail closed, allowance stopped |
| <img ...> generated text | literal text, no executable HTML | browser descendant img0, no external fetch |
| Late embedding/deadline/aborted request | no additional Qwen or stale turn | fake timer40s deadline stops allowance; late result does not launch Qwen; pre-aborted models0 |

Mock answers demonstrate plumbing/validation only. Actual Qwen accuracy, Vietnamese quality and resistance
to semantic prompt injection are BLOCKED pending the authorized hosted gate. Valid source IDs cannot
prove factual entailment. No claim of complete hallucination prevention.

## Hosted ledger and final operations

| Activity | Worker requests | OPTIONS | BGE | Qwen | DO reserve/stop | Combined / remaining | Deployments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A BLOCKED | 0 | 0 | 0 | 0 | 0/0 | 0/20;20 unused | 0/2 |
| B NOT RUN (conditional prerequisite unmet) | 0 | 0 | 0 | 0 | 0/0 | 0/20;20 unused | 0/2 |
| Lifetime | 0 | 0 | 0 | 0 | 0/0 | 0/40;40 unused | 0/4 |

Cloudflare control-plane calls0. Environment metadata has no identity/secret/runtime bindings;
identity manifest connections[]; Cloudflare CLI/connector unavailable. Correct account, active Free
plan/model entitlement/current quota/live config cannot be verified. Historical dashboard is not current
quota. Therefore no activation, hosted request, deployment or rollback attempted. Checked-in
AI_ENABLED=false/PREVIEW_EXPIRES="" unchanged; live state/deployed version NOT independently verified.
No Supabase hosted calls, production content, billing change or new resource. Existing V1 budget allows
4 global reservations (each successful V2 chat4 counted operations), not a generic public allowance.

## Release blockers and owner trial

P1: browser-supplied catalog is not independently proven published; CORS is not authentication.
Before public release, trusted content provenance plus admission/abuse control and renewed cost/privacy
review are required. This task does not create a Supabase service, schema or public inference endpoint.
P1: live Qwen integration/rollback verification blocked by missing Cloudflare access; stay disabled.
P2: heuristic intent routing and citation checks do not guarantee language understanding or claim truth.
P2: native zoom/devices/screen reader remain unverified. UI/UX Pro Max unavailable; existing design used.
GitHub API Forbidden blocks Draft PR creation; Git HTTPS access can still push the reviewed branch.

Owner trial: run npm run dev, open /tests/board-assistant-ui.html on loopback. Use synthetic data only.
“Web này làm gì?” and “Có bao nhiêu học liệu?” work without inference. Automated browser driver injects
scripted AI answers and exercises follow-ups; this fixture does not call live Cloudflare. Do not enable
AI against real Board data or open a public preview. Review source/screenshots first; hosted review
requires the existing Worker account/Free/quota/access prerequisites, not a token pasted into chat.
Do not approve production release or infer real-content/model acceptance from this local result.
