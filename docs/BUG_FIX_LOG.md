## 2026-10-31 — AI-IA01-F01 / P1 — General questions may be hijacked by Board retrieval

- **Observed in source:** live Worker always read published Board and ranked candidates using
  keyword/BGE even for general science questions. Broad follow-up regex could inherit
  unrelated Board context. Chat UI omitted source provenance note for live answers.
- **Fix:** `src/utils/assistant-intent.js` routes general/Board/hybrid before public
  retrieval; uncertain intent uses bounded Qwen classification; general skips
  Supabase/BGE, Board failures never silently turn into unsupported general facts,
  and the UI shows the response's actual knowledge boundary. Pure and specialist
  regression assets cover no-read general path, public-only source, topic switch,
  no-citation Board fallback, classification error and responsive labels.
- **Evidence:** GitHub Offline CI #41172224963 PASS (186 curated unit/build/format)
  at `a4d242a`. Specialist Worker runtime tests and new browser E2E **NOT RUN**;
  zero hosted requests/deploys. Branch `feature/ai-assistant-intent-aware-chat-20261031`, Draft PR #37;
  source implemented, complete E2E acceptance **PENDING**.

## 2026-10-31 — GB-XLSX-XML-001 / P1 — Excel rejects exported workbook XML

- **Observed:** Owner reported Excel XML error and spreadsheet data not loading after styled XLSX export. Reproduced a structural risk in generated `xl/worksheets/sheetN.xml`: `<mergeCells>` was emitted before `<autoFilter>`, violating SpreadsheetML `CT_Worksheet` child order. Relaxed XLSX readers and generic XML parsers accepted the XML, so prior round-trips did not catch strict Excel validation.
- **Fix:** `src/utils/gradebook-xlsx.js` emits `sheetData → autoFilter → mergeCells → printOptions → pageMargins → pageSetup → headerFooter`. Does not change input data, raw decimals, sheet separation, styling, CSV, API or database.
- **Regression:** `tests/gradebook-export-sort.test.js` asserts strict worksheet child sequence and independent workbook row round-trip for **both** HKI/HKII and roster. Compare before/after using synthetic-only fixtures. Full CI and actual Microsoft Excel open need separate evidence; do not confuse relaxed-reader PASS with native Excel acceptance.
- **Scope:** branch `feature/gradebook-full-export-sort-20261031`, PR #34; source-only, hosted requests 0, migrations/deployment 0, no student data accessed.

## 2026-10-31 — GB-EXPORT-SORT-001 / GB-DECIMAL-INPUT-001

Baseline `4d9539407cdb62ccd772abf1005d02c13947c734`, branch
`feature/gradebook-full-export-sort-20261031`, Draft PR #34.

- **GB-EXPORT-SORT-001:** previous work had two unwired modules; student pagination
  read20 rows and score sorting touched only that page. Added a class-locked service-only
  snapshot migration/Edge operation, explicit export confirmation and strict DTOs, shared
  accessible headers on both tables, full-snapshot sorting before local pagination and
  complete CSV/XLSX export. Empty classes emit headers; separate template UI/assets removed
  by owner request. Drafts remain across sorting/pages. No ordinary list/reveal/Auth grant
  widened. Files: both Gradebook components, table-controls/export/snapshot utilities,
  admin response/transport, snapshot/admin/http Edge modules, migration and Gradebook CSS.
- **GB-DECIMAL-INPUT-001:** Chrome typing7.12345 dropped the dot or cleared the input.
  `restrictNumericInput` used a double-escaped dot in a regex literal. Corrected `dom.js`
  and added a focused EventTarget regression for exact decimal text, invalid paste and
  leading-zero identifiers. Chrome confirms7.12345 survives sorting unchanged; invalid
  draft markers also survive the rerender.

Evidence: curated171/171, check, full format and build PASS; three network-denying
Web Crypto/Edge cases PASS; native PostgreSQL17.11 specialist PASS with rollback;
owner Chrome synthetic keyboard/profile/draft/error and iframe responsive QA PASS.
Native XLSX download owner-confirmed2026-10-31. Subsequent owner-approved follow-up
applied ledger 20261031002916 and grades-admin v7; exact source matched 95d925a. Real
localhost Auth/Edge/DB reads/global sorting and 4 full export snapshots PASS on owner-
confirmed synthetic data; missing-JWT/direct-RPC401. Four manual SQL calls verify
31 students / 62 scores unchanged, no deletions or score writes. No public website deploy
or real-data acceptance. Client test scope≤21 HTTP requests including preflights/negatives;
provider-internal/bootstrap traffic is distinguished in the linked evidence.
[Detailed attempts, limitations and acceptance](features/personal-gradebook/FULL_EXPORT_SORT.md).

# Nhật ký khắc phục lỗi

## 2026-10-30 — UI-IOS-INPUT-ZOOM-01: iPhone auto-zooms on text field focus

The shared search field, Board editor, Gradebook identity/date/score inputs and
assistant composer use 12–15px typography in existing component CSS. iOS WebKit
automatically zooms the visual viewport when a focused text-entry control has
computed type below 16px. Added a touch-pointer-only rule in `src/styles/main.css`
requiring `max(16px, 1em)` for text-like inputs, select and textarea. Excludes
checkboxes, radio, file, range, hidden, color and button-like inputs; preserves
existing viewport pinch zoom, desktop styling, field widths, labels and business
logic. `!important` is intentionally limited to touch-control font size to
override specialized component selectors without changing their visual states.
Regression scope: search, Board editor/login, Gradebook lookup/date picker/admin
score grid, assistant composer; 320/375/390/430px portrait + iPhone landscape.
Real iPhone Safari and installed-PWA focus/keyboard/zoom checks still require
device QA; CI does not claim to simulate WebKit. Test with browser text zoom at default settings. No DB/API/Auth changes.

## 2026-10-30 — UI-MOBILE-HEADER-01: mobile header title and account actions wrap awkwardly

Screenshot at approximately 395px: header brand limited to 105px in the legacy
`max-width: 600px` rule, combined with flex-wrap, causes the app name to break
into three lines and makes the action row visually detached. Added a narrowly
scoped mobile CSS Grid override in `src/styles/main.css`: brand on first row
with navigation, actions on a second row, search on a third row, balanced title
wrapping and full-width-safe text. No changes to HTML/JS, authentication,
routing, PWA, DB or API. Branch `feature/pwa-installable-app-shell`.
Browser device QA NOT RUN; verify 320/375/395/430px and tablet after CSS-only change. CI pending.

## 2026-10-30 — AI-LIVE-04: singular neuron quota errors classified as temporary errors

Final delivery based on develop27b9fb9. Match singular neuron as well as plural
neurons in provider error classification so daily neuron limit exhaustion produces
the quota-unavailable message. One fake-provider regression and all11 focused cases
PASS; no extra hosted inference required. No paid fallback, admission or message
limit change. Final Worker receipt d1bc8f31; full acceptance linked below.

## 2026-10-30 — AI-LIVE-03: topic change inherited unrelated Board citations

At integrated410c722, actual Board time/duration and natural follow-up PASS. General
sky-color question answered correctly but cited Lịch thi GK1, so general acceptance
FAILED. Retrieval always concatenated the previous question. Use current query for
new topics, retain prior query for referential follow-ups, filter weak semantic/
lexical candidates and explicitly instruct current-question citation only. This
filters sources, never blocks general knowledge. Added changed-topic regression;
real general retest at develop27b9fb9 PASS: useful sky-color explanation, general label, no Board citation. No date/number guard,
owner token, lifetime cap or permanent failure stop reintroduced.

## 2026-10-30 — AI-LIVE-02: Worker runtime rejects redirect:error on anonymous Board read

Final-develop real Board question initially returned a general abstention without
citation. Node public helper read7 posts successfully; Worker public health showed
TypeError. Actual local workerd Request constructor reproduced: redirect:error is
unsupported at the edge, while manual is accepted. Changed only outbound public
fetch to manual and kept non200 rejection. Added bounded, rate-limited public health
counts/errors (no model/body/private data), separated runtime ExecutionContext from
test dependency options, and regression for manual redirect/zero-model health.
Worker health now200/publicPosts7. Initial inference is not counted PASS. Correction
goes through scoped PR into develop; specific real Board time/duration and follow-up retests at develop410c722 PASS;
general-topic citation correction separately recorded above. No Pilot gate, paid upgrade or automatic inference retry introduced.

## 2026-10-29 — AI-LIVE-01: replace Pilot admission and permanent error lock in normal chat

Baselineedc5f31. Owner replaces Pilot requirements with continuous Free-only hybrid
chat. New live Worker/transport never call legacy reservation/stop or temporal/
numeric/revision guards. Real anonymous published Board projection and optional
citations, general knowledge, rolling history and3/10-second native spam limit.
Existing component retains design/source actions; temporary errors keep AI and
history available.8 focused offline contracts and actual Chrome offline recovery/
mobile PASS; actual AI/develop integration subsequently PASS in [live acceptance](features/board-assistant/LIVE_CHAT_ACCEPTANCE.md).
No private backend access, new framework, paid service or legacy ledger mutation.

## 2026-10-29 — AI-V2-UAT-FOLLOWUP-01 / P2: non-temporal facts rejected and503 model counter hidden

Baselinea893526, same feature branch. Owner preparation/audience question503 has
confirmed validation/revision receipt, two model calls and failureStop confirmed.
Raw completion unavailable. Offline supported answer reproduced rejection because
revision guard applied to every revised source, regardless of question/claim.
Scope revision acknowledgement to temporal questions/claims; keep date/number,
citations and cancellation checks. Controller forwards bounded failure headers;
preview displays unknown counters honestly instead of0 when absent.44 affected
offline cases PASS, including original negative guards. No hosted test/deploy,
reset or ledger mutation. Current55/60 blocked, owner2 consumed; READY withdrawn.
[Evidence and limits](features/board-assistant/V2_PILOT_ACCEPTANCE.md#owner-follow-up-failure--2026-10-29).

## 2026-10-29 — AI-V2-UAT-FLOW-01 / P2: occupied localhost could activate hosted before failing UI startup

Baseline30251bd, same V2 feature branch. Static review during owner-approved UAT
setup found hosted Start ran before Vite discovered an occupied4173, consuming
status/shutdown operations without a usable UI. Added an early loopback port
availability check in owner-preview-start; local occupied-port CLI regression
proves EADDRINUSE before ledger charge, no hosted probe. No port change/process kill.

New fixed UAT3 policy and profile separate the explicitly approved recovery from
blocked pilot state; setup uses exclusive creation, repeated Setup EEXIST preserves
ledger, and Start never initializes/resets.62 affected fake-binding cases and10
actual local workerd calls PASS. Real Chrome exact-question retest HTTP200 with
BGE1/Qwen1 and supported revised date, two citations; owner2 preserved, final
Worker disabled/access cleared/bearer403. [UAT acceptance](features/board-assistant/V2_PILOT_ACCEPTANCE.md#owner-authorized-uat-retest--2026-10-29).
Original incident remains ROOT CAUSE UNCONFIRMED, not retrospectively fixed by a
successful new completion. No automatic retry, merge, web deploy or paid resource.

## 2026-10-29 — AI-V2-OWNER-UAT-01 / P2: supported revision wording rejected; historical cause unconfirmed

Incident baseline `8ed8c1965424ca86805ad98958930e6cd2df9ed0`, branch
`feature/ai-learning-assistant-v2-e2e`. Owner committed in-progress correction as
`ddd2a798b8f0d4010acd5880bd4d3939fc275f28`; retained without reset. Remote follow-up through fb763e1 restored the
default-disabled Gradebook example and removed unrelated tunnel changes; preserved
by fast-forward. Documentation conflict reconciled with this fuller Desktop evidence.
Exact owner question returned503 with two model calls started. Local ledger did
not retain stage/reason/completion; ROOT CAUSE UNCONFIRMED for that real request.
Offline replay independently reproduced503 for a supported22/11/2026 answer
saying “lịch đã được điều chỉnh”. `public-temporal.js` now recognizes this
revision acknowledgement; date/number/citation/cancellation guards remain strict.
Source revision detection was not broadened to unrelated uses of “điều chỉnh”.

`assistant-diagnostics.js`, Worker and owner controller preserve allowlisted
stage/reason, reservation and confirmed/rejected/unconfirmed failure-stop fields.
Missing envelope, malformed JSON, invalid contract and unknown citation remain
rejected with distinct codes. Stop HTTP failure is no longer implied successful.
Future default receipts omit complete answers/source bodies; old evidence untouched.
19 focused UAT cases PASS; 91 other affected cases PASS; check/build/scoped format
and actual Chrome scripted QA recorded in [incident acceptance](features/board-assistant/V2_PILOT_ACCEPTANCE.md#owner-uat-incident--offline-correction--2026-10-29).
Cloudflare requests/deployments/inferences0. Ledger unchanged31/40, blocked=true;
real owner scenario remains FAILED, corrected hosted retest NOT RUN.

## 2026-10-29 — AI-V2-PILOT-01 / P2: self-disclosed DOB phrasing bypassed the cloud input guard

Baseline9bd7bf5, feature/ai-learning-assistant-v2-e2e. “Em sinh20/11/2010...”
lacked the old explicit ngày-sinh/sinh-ngày cues. Added a small first-person birth
cue, retaining event/month/year and biology questions; pure + zero-fetch transport
regression PASS, actual Chrome offline rejects before adding a turn. No real PII
or private backend access. [Pilot acceptance](features/board-assistant/V2_PILOT_ACCEPTANCE.md).

## 2026-10-29 — AI-V2-PILOT-02 / P2: Stop client deadline was shorter than hosted disable

Same baseline/branch. Original Stop used3s local timeout, while hosted shutdown
requires a control-plane deployment/readback. First local Stop caller timed out;
server continued and successfully disabled/revoked, no inference retry. Increased
deadline to60s; separate owner Start/Stop rehearsal PASS with same remaining
allowance, zero additional model calls. Stop acknowledges only after disabled
settings + old-bearer403; shutdown status errors do not skip disable. Local
failure/uncertain ledger latches prevent later silent continuation. Worker expiry
still fail-closes after a process crash; no global CI/Gradebook changes.

## 2026-10-29 — AI-V2-REV-01/02 / P2: legitimate public dates rejected by PII keyword allowlist

Baselineb5dc070, branch feature/ai-learning-assistant-v2-e2e. Validator rejected
full dates unless a narrow event keyword occurred, including ordinary phong-trào/
history/range questions. Removed topic-dependent allowlist; explicit personal DOB
values, emails/obvious contiguous or separated identifiers still reject before
fetch. Date spans do not become long numeric IDs. Utility/component copy + pure/
manual privacy regressions; no backend private fields or Auth/Gradebook access.
Correction PASS offline and Chrome date-query acceptance; regex is not a complete
PII classifier. [Evidence and hosted limits](features/board-assistant/GATE_C_DESKTOP.md).

## 2026-10-29 — AI-V2-REV-03 / P2: client clock could anchor hosted temporal conclusions

Same baseline/branch. Worker previously used browser-supplied grounding.clock for
prompt/fact validation. Core now overrides with server instant; transport rechecks
using X-Assistant-Clock, rejects missing clock. Frozen pure tests/local ranking
remain injectable; timezone Asia/Ho_Chi_Minh. Fake1999 clock cannot authorize an
upcoming2000 event; boundary/unknown-year/end-date tests PASS. Deployed disabled
behind short-lived owner admission and server fixture provenance; hosted inference
NOT RUN because old allowance is stopped. No schema/service/Auth/RLS change.

## 2026-10-29 — AI-V2-REV-04 / P2: fullscreen chat clips Send beside a classic scrollbar

Same baseline/branch; discovered on actual Chrome390×844. Mobile100vw panel
included scrollbar width (dialog390.4/client375), clipping the send control.
board-assistant.css now uses width/max-width100%; mobile sendRight363.2<client375,
landscape sendRight640<client652. Chrome desktop/mobile/landscape PASS with real
components/synthetic data. Physical devices/Safari NOT RUN; no new UI dependency.

## 2026-10-29 — AI-V2-006 / P2: public app-help questions were rejected as private grade requests

Baseline `1429789`, branch `feature/ai-learning-assistant-v2-e2e`. V2 profile exposed
only application names while the broad `bang diem` guard rejected ordinary questions such
as "Bảng điểm cá nhân dùng để làm gì?". The website's official name also was not
recognized as a website reference in intent routing. Extended deterministic public
application guidance with descriptions, documented routes and explicit authorization
boundaries; separated help/navigation intent from requests to inspect or modify private
grade/student data. No runtime answer or prompt offers the obsolete KHTN8 product name.
Pure and synthetic Chromium regression cases were added for app purpose, route help,
official-name paraphrases and private-data denial. **Automated runtime tests NOT RUN in
this connector-only update**; static diff verified. No Cloudflare/Supabase hosted calls,
deploy, Auth/Gradebook/schema change or new feature beyond V2 CP01–CP02 correction.


## 2026-10-29 — AI-MVP-001 / P2: canceled dialog close events could invalidate a new conversation

Baseline `develop` / `4f254961e9fa3604e8e843e3c5f63a15f2e9edc7`, new Board Assistant
implementation. Native close events are queued; the old dialog could abort a newly opened
conversation or steal focus from an opened source. `src/components/board-assistant.js` now
removes invalidated dialogs synchronously and checks dialog ownership before cleanup/focus.
Actual Chrome synthetic delayed-response cancellation, new-conversation-during-pending and
normal source modal focus PASS; transport cancellation specialist PASS. FIXED within local
synthetic scope; no Auth/backend/Gradebook behavior changed.

## 2026-10-29 — AI-MVP-002 / P2: Vietnamese accent folding produced unrelated keyword fallback

Same baseline/branch. `đẩy` and `đây` fold to the same token; a single incidental body hit
could add an irrelevant source for `lực đẩy`. `src/utils/board-assistant.js` now requires
at least half the maximum weighted token score for local fallback. Pure regression asserts
only the physics source; actual Chrome mobile result confirms one relevant source. FIXED;
not a claim of semantic search quality or a general Vietnamese linguistic benchmark.

## 2026-10-29 — AI-MVP-003 / P2: first hosted AI run returned 503; envelope handling hardened

Same baseline/branch. First approved synthetic Worker request returned503 and testing stopped
without retry; its exact failing stage was not retained, so root cause remains UNCONFIRMED.
Worker decoding now accepts JSON-mode object and string/choices envelopes while enforcing
source-only output/exact quotations. Added safe stage/call-count headers, AbortSignal and
40-second model deadline (45-second client); no raw model/user diagnostics. Finite offline
regressions PASS; separately approved hosted run2 first query HTTP200 with two model calls
and correct excerpt. Do not attribute run1 failure conclusively to envelope or latency.
Final finite-run accounting and remaining gates: [evidence](features/board-assistant/README.md).

Run2: two HTTP200 responses then one HTTP503 at `validation` with two model calls; stopped
immediately. Exact failing output was deliberately not logged. Final correction changes the
model contract to existing IDs only, derives excerpts from original text, and discards the
documented leading Qwen think wrapper without exposing it. Strict ID-only JSON, membership,
duplicates and exact returned source text remain enforced. This avoids model transcription;
it does not claim which validation subcase caused the old503. Offline8/8 Worker cases PASS;
run3 is separately authorized and recorded in the evidence document.

## 2026-10-29 — AI-MVP-004 / P2: chat composer fell below the desktop viewport

Same baseline/branch. Actual Chrome710px-height capture showed the submit row below an outer
dialog scrollbar. `src/styles/board-assistant.css` now uses a bounded flex modal with a
shrinking message scroller and fixed composer; short viewports retain outer-scroll recovery.
Final desktop/mobile measurements and browser recheck are recorded with assistant evidence.

## 2026-10-29 — AI-MVP-005 / P2: mobile assistant filter could keep an unrelated default column

Same baseline/branch. Mobile shows one section: selecting all for a physics keyword could
leave the first chemistry column visible. `src/main.js` now reveals the first actual
published match for the explicit assistant filter action, guarding orphaned sections. Board
search semantics are reused; no private posts or other search behavior changed. Final actual
Chrome mobile filter check is recorded with assistant evidence.

Bắt đầu 2026-10-24 theo yêu cầu chủ repo. Đây là trace thay đổi source, không phải logging hoạt động người dùng hoặc dịch vụ telemetry. Mỗi bug dùng một ID cố định; khi tái mở, bổ sung nguyên nhân và bằng chứng vào đúng entry. Commit chứa entry là mốc sửa, tra bằng `git log -- docs/BUG_FIX_LOG.md`; không đoán hoặc tự điền SHA của commit chưa tạo.

## 2026-10-28 — UI-QA-001 / P2: workspace fixture reports unsupported save success and a nonexistent next page

Baseline `c01f9a966506ea9048c3340574205db3ab50e0f5`, branch `feature/personal-gradebook-ui-e2e`, PR10 review. Synthetic class.patch consumed nonexistent body.patch and returned success without the intended update;20-row lists advertised another page although no rows remained. Removed that fake-success handler so unsupported writes fail explicitly; both roster/score cursors now null. Only tests/gradebook-workspace-fixture.js changed in executable source. Syntax/scoped-format/diff checks and static branch/fallthrough review cover this correction; no hosted calls or browser acceptance inferred. [Review matrix and limitations](features/personal-gradebook/UI_E2E_REVIEW.md#pr10-merge-review-correction--2026-10-28). FIXED offline; real pagination/mutations NOT RUN.

## 2026-10-28 — UI-LOAD-001 / P2: inconsistent pending feedback across Board and Gradebook

Baseline `cfcdaa1dd10465d982e3be0ffc90aa1ca3b8f907`, branch `feature/personal-gradebook-ui-e2e`. Lazy route transitions lacked visible feedback; logout feedback belonged to the hidden Board when launched from Gradebook; teacher operations shared generic page-only labels and local file/student reads used text-only loading. Modal inert content could conceal status from assistive technology.

Reused `components/pending.js` in app/header/admin/scores/student views, with atomic live status and shared wrapping styles. Header awaits the original logout Promise; modal status lives outside inert content. Operation/file/plot/route cleanup retains existing ownership/generation/abort fences and mutation payloads. Existing Board/editor/media/quota/Auth/section pulses retained. No services/Auth/RLS/API/database/capability change.

Offline evidence and exact limits: [L01–L19 report](features/personal-gradebook/LOADING_UX_REVIEW.md). Curated129/131 initially (two new DOM-stub failures), fixed affected6/6; static/build/scoped format PASS, direct full checkout format FAIL (CRLF); separate AST-equivalent birthday-expression format45f8ec4 and final LF-normalized116/116 PASS. Browser QA BLOCKED by native URL-policy detection before interactions; no complete visual/integration acceptance claim. Agent-issued hosted tests0; existing user tab background/HMR traffic unmeasured. PR10 stays Draft; no merge/deploy.

## 2026-10-28 — UI-E2E-001 / P2: teacher grid forces page-wide horizontal overflow

Baseline1378455, feature/personal-gradebook-ui-e2e. Cloud Chrome360px fixture reproduced393px grid children /407px body overflow; explicit minmax(0,1fr) tracks in gradebook.css restore343px content containment while retaining eight score columns. New tests/gradebook-workspace.html and fixture use production components, memory-only synthetic reads and real local parsers; unsupported writes fail. Focused component tests/static/format/build PASS. [Browser matrix, measurements and untested interactions](features/personal-gradebook/UI_E2E_REVIEW.md). Hosted calls0; broad UI acceptance remains pending.

## 2026-10-28 — GB-VERIFY-CLOCK-001 / P1: HTTP 200 rejected by client expiry ceiling (FIXED; owner retest pending)

Baseline `25d785b`, branch `feature/personal-gradebook`. Owner supplied only safe scalar diagnostics: valid capability syntax/integer expiry and 660721 ms remaining at response arrival. The client rejected anything above 600000 ms; debugger delay before capturing `now` masked that condition. This establishes the failing ceiling, consistent with client/server clock offset, without identifying which clock is inaccurate. Admin session and unpublished semesters are independent.

`src/utils/gradebook-responses.js` accepts at most 120 seconds of positive clock skew and projects an internal expiry capped at 600 seconds from client time (rounded down). Already expired, malformed, unsafe and beyond-tolerance expiries still fail closed. Raw capability is unchanged; server expiry/revocation/publication authorization remains authoritative on every read. No backend, Auth, CORS, timeout or migration change. Existing strict expiry test now rejects beyond the explicit tolerance instead of one second above nominal TTL.

Offline regression: controlled HTTP Response → real transport → service → DTO → lookup state verifies the observed 660721 ms case with both semesters unpublished and bounded local expiry; beyond-tolerance/expired cases reject, one synthetic fetch each. Focused 43/43 PASS, syntax/scoped scan/diff and default build/exclusions PASS. Browser DOM and owner hosted retest NOT RUN; no claim of hosted E2E completion. Hosted requests/writes/deployments 0. No real token or identity retained. G07 evidence unchanged; G08 BLOCKED.

## 2026-10-28 — G07-OWNER-REV-001/P2 và G07-OWNER-REV-002/P3 (DOCS PROPOSAL)

Owner report baseline0679367: native stderr warning terminated first keygen despite file creation; later owner-only ACL inspection and controlled handling passed. Propose scoped Continue around keygen, keep warnings, capture exit immediately, restore preference and require owner/ACL verification; corrected snippet Windows NOT RUN. Transcription initially malformed, corrected recipients PASS; temporary phone notes do not establish paper custody. Record owner local/Drive synthetic PASS separately from native technical evidence and remaining gates. Docs/static only; no CI/owner-device/Drive/production access.

## 2026-10-28 — G07-MANUAL-REV-001/P2 và G07-MANUAL-REV-002/P3 (DOCS FIXED)

Baseline9f923e4d, docs/g07-manual-backup-restore. Receipt snippet previously initialized LOCAL_AUTHENTICATION_PASS before its round-trip checks. Initialize CANDIDATE_UNVERIFIED before decrypt, promote only after complete local verification; distinguish remote/database fields, skipped steps never PASS. Replace ZIP hash placeholder with concrete path variable and add masked paper-entry UTF-8-no-BOM examples, linked from restore guide. Static documentation checks only; Windows/PowerShell NOT RUN, no CI/backend/Drive/keys/production changes. A–F unchanged; G07 Technical PASS, Operational/Overall PARTIAL, G08 BLOCKED.

## 2026-10-28 — GB-G07-RECOVERY / P2: false metadata/output assertions (FIXED)

Startingcc893edf, feature/cp01-c-g07-g08-recovery. Fixed raw ACL string/default representation comparison using canonical ACL sets without changing database grants. Stage diagnostics revealed failure after actual restore (run40623308305); subsequently fixed parent stdout-offset assertion introduced by stage lines (run40623466222). Added poison-diagnostic regression and valid-archive collision rollback proof. Final tested910ac0ae/run40623615581 SUCCESS: offline21, native recovery/roles/negative cases; artifacts0, cleanup PASS, hosted requests0. Production crypto/migrations/business code unchanged; operational G07 and G08 remain blocked.

## 2026-10-28 — GB-CP01-C-CLOUD-QA / P3: disposable harness integration (FIXED)

Starting9dd7da3, feature/personal-gradebook. New owner-approved cloud harness initially stopped at missing image POSTGRES_PASSWORD mapping, narrow DB-name regex, repeated fixture DB name, temporary-socket readiness, replacement-string SQL dollar quoting, wrong class.patch argument count and incomplete GoTrue JWT defaults. Correct only test/workflow integration; no application, migration, SQLSTATE/hash-guard or deployed Auth change. Native adapter now preserves fresh fixture DBs and cleans the B2 cluster-global negative grant; real Auth uses explicit synthetic audience/default role. Five failed cloud attempts retained honestly; no unchanged-SHA blind retry. Native52 groups/concurrency/limiter/technical retained-key restore PASS atafcb72f; isolated Auth/API signed-preview/session cases PASS at6269da1. Final reachability/exact restored-value assertions PASS in connections-only run ateb02ccc; unrelated accepted suites skipped. Self-review separated preview preflight409 from real SQL PT409: the final Auth-only run at7dbd000 explicitly observes one PostgREST PT409, structured HTTP409 and no mutation/audit. Earlier6269da1 PT409 log wording overclaimed its preview subset; source/log evidence is clarified rather than rewriting that run. [Exact evidence and remaining custody/real-data gates](features/personal-gradebook/CP06_OFFLINE_READINESS.md#cp01-c--cloud-only-security-verification--2026-10-28). Hosted requests0, Browser QA N/A; prior G02 PASS retained, G08 BLOCKED. No production defect was confirmed by these harness failures.

## 2026-10-28 — REV-C01 / P3: stale deployment labels (RESOLVED)

Baseline2435fcc, feature/personal-gradebook. DATA_AND_SECURITY still stated no schema/API deployed; ARCHITECTURE config row and unmarked historical utilities/SQL snapshots repeated undeployed/unimplemented states; config.toml comment said Draft only. Correct current header/code-map/comment and explicitly mark old snapshots historical. Four applied migrations, deployed v2 functions, synthetic-only PARTIAL acceptance and default-disabled production transport remain distinct. No executable configuration, migration, Auth or Edge implementation change. Documentation link/diff checks apply; no hosted retest attributed to this wording correction. New G01–G08 verification evidence is independently recorded in CP06 readiness. Earlier42702 was a verification-query ambiguity, corrected without product changes.

## 2026-10-28 — GB-CP01-C-LF / P2: checkout line endings change guarded SQL bodies (FIXED / ROLLOUT VERIFIED)

Baselinea8f055e, feature/personal-gradebook. C0A found B3 checkout613 CRLF/0 of8 expected old-body hashes versus8 of8 in reviewed LF Git source. `.gitattributes` pins migration SQL to LF. Only four previously unapplied SQL files were normalized to exact reviewed Git blobs and, with explicit owner approval, renamed to actual MCP versions; no SQL/guard or applied Board file/ledger rewrite. All four migrations succeeded once on hosted PostgreSQL17.11; strict guards passed and9/9 effective correction-body hashes match. Existing CON-004 static test passed before rollout; mapped-path regression is included in final focused validation. [Ledger mapping and acceptance boundaries](DATABASE.md#gradebook-migration-rollout-gate--gb-ops-rev-002). Native single-transaction ACL/precision/RPC rollback evidence does not prove multi-connection races or full CP01-C security acceptance.

## 2026-10-28 — GB-CP01-C-ORIGIN / P3: wildcard-looking environment entries accepted (FIXED / DEPLOYED v2)

`runtimeConfig()` rejected bare * but URL parsing accepted a literal wildcard hostname such as https://*.example.com. The handler never expanded that string into a pattern, so arbitrary-origin authorization was not demonstrated; nevertheless the owner requires an exact non-wildcard allowlist. Reject any non-string/star-containing entry before URL parsing. Existing specialist test covers bare/hostname wildcard rejection and environment-only origin replacement without keys/DB; CORS denial regression2/2 PASS, one post-deploy allowed-origin OPTIONS204 PASS. Both Edge Functions deployed v2, unchanged JWT settings. Only localhost4173 is configured for synthetic CP01-C; no production origin/secrets activation.

## 2026-10-28 — GB-CP01-C-COPY / P2: active lookup claims no information is sent (FIXED)

Actual enabled localhost4173 QA found the accepted offline form still said information was not sent to the system. `src/components/student-lookup.js` now describes verification/unavailable feedback without that false promise; privacy copy explicitly addresses browser persistence/route cleanup. No Auth, transport, endpoint, data retention or layout change. Browser verifies real verification/read/histogram with synthetic data; the final local build verifies revised copy. Production activation remains disabled by default.

## 2026-10-27 — GB-CP06-B-CATALOG / P2: teacher loader omits class scope (FIXED OFFLINE)

Baseline64b6e92, feature/personal-gradebook. GradebookScores previously called loadCatalog with only signal; accepted B4 catalog.read requires classId. It now passes currentClass.id through createTeacherCatalog/the shared teacher session transport. Pure strict V1 projection and specialist catalog scope/header tests PASS; actual Chrome score workspace loads all 8 subjects/7 columns through synthetic HTTP boundary. Server authorization/migrations unchanged; production transport disabled; hosted integration NOT RUN.

## 2026-10-27 — GB-CP06-B-EMPTY / P3: unavailable class renders false text (FIXED OFFLINE)

Actual app-route Chrome QA with disabled integration displayed literal false beneath the unavailable class message: GradebookAdmin passed classKnown && button directly into native body.append, which stringifies false. Replace the optional argument with an empty spread when unknown. Browser after correction shows only unavailable feedback and no false text/create-class action. No design/Board/Auth/backend behavior change; source at64b6e92 plus local diff, not deployed.

## 2026-10-27 — B4-FIX-CATALOG / P2: missing teacher catalog operation (FIXED IN UNDEPLOYED DRAFT)

Baseline `e8333ef`, feature/personal-gradebook. B4 had no teacher catalog allowlist/dispatcher operation while the frontend correctly remained catalog_unavailable. `_shared/admin.js` adds narrowly scoped catalog.read and calls trusted-actor/session gb_class_read before active-context lookup/class matching. `_shared/dto.js` adds opt-in strict V1 metadata projection (8/7 active, canonical names/order, unique codes/names/positions and four row fields); server rows/codes remain authoritative, not a fallback source. Existing student/internal projection behavior unchanged; no private metadata/PII/keys/epochs returned. Focused pure real-seed-code test and14 selected specialist offline cases PASS; no network or retry. Current STATUS records final gates. Production adapters still disabled, Functions undeployed, SQL untouched; hosted authorization/locking CP01-C NOT RUN. Commit containing this entry anchors the correction, not a deployment.

## 2026-10-27 — GB-CP06-A-ARIA / P2: ECharts overwrites keyboard-control semantics (FIXED OFFLINE)

Baseline4fc986e, feature/personal-gradebook. Actual local Chrome exposed role=img on the CP05 plot although StudentChart creates role=slider with one keyboard stop. ECharts6 lib/visual/aria.js automatically calls setAttribute(role,img) when generating its label; this also runs on rebuilt resize options. Disable only aria.label.enabled in the pure chart options, retaining the component's explicit label/role/valuetext and Arrow/Home/End/focus/disposal behavior. No visual, score, histogram, backend, Board or admin contract change. Pure option assertion added; browser observed slider before/after1440→360→390→768→1024→1440 on the same chart instance, normal Tab out and Escape focus return. Full screen-reader/native-device acceptance NOT RUN. This is a merged-source accessibility defect observed synthetically, not a hosted incident.

## 2026-10-27 — GB-CP06-A-QA / P3: synthetic correlation UUID requires secure context (FIXED IN TASK)

While integrating the new decoded-response projection into the local fixture, requestId initially used crypto.randomUUID directly. That API is unavailable on the Work HTTP preview origin, so verification failed before projection; unit Node crypto did not reproduce it. tests/student-gradeboard-fixture.js now reuses existing src/utils/id.js newId UUIDv4/getRandomValues fallback. Actual browser valid verification and each missing/bad-catalog/bad-publication case then reached the intended projection, with external/error counters0. Safe fixture rejection categories contain no payload or diagnostics. No B4/Auth weakening, real credential, dependency or hosted request; production services unchanged.

## 2026-10-27 — GB-CP05-UIV2-010 / Scrollbar after in-place responsive resize (SOURCE CORRECTION)

Baseline `dd3770e`, only `feature/personal-gradebook-ui-refinement`. Wide charts intentionally omit a scrollbar when every populated category fits. Found a genuine lifecycle issue: the resize handler could not add or remove an ECharts `dataZoom` component after initial render. Rebuild chart option at actual plot-width changes, show/hide guidance only when needed, stack cramped mobile insight cards. Pure regression covers 12 occupied levels at desktop/mobile and zero/one cases. Actual Chrome resize/mobile visual QA still required. No hosted queries/deployments.

## 2026-10-27 — GB-CP05-UIV2-009 / Sparse chart visualization (SOURCE CORRECTION)

Branch `feature/personal-gradebook-ui-refinement`, baseline `a8d055d`. Previous chart kept 101 zero-count categories visible in a width-limited window, making the few populated bars narrow and widely separated even after the earlier width refinement. The UI now derives occupied score levels solely for chart presentation, preserving the backend's validated 101 aggregate buckets unchanged; ECharts categories/tooltip/one-step keyboard index follow occupied levels, with a 64px cap and 36% positive gap. The empty case skips chart initialization; few levels get a compact centered plot without a redundant zoom slider, and many levels retain horizontal navigation. Regression pure cases cover sparse, dense and empty distributions with exact personal highlight. Check browser QA separately. No hosted requests, deployment or parent-branch edits.

## 2026-10-27 — GB-CP05-UIV2-006..008 / Focus, hover and chart width (SOURCE CORRECTION)

On `feature/personal-gradebook-ui-refinement`, baseline `2c75bd2`: (006) global blue `:focus-visible` coexisted with feature-specific border/focus rules for CCCD and chart/calendar selectors, producing an excessive focus double-ring; added scope-limited unified focus, hover and invalid-state styles in `gradebook.css` without touching global Board CSS. (007) chart series `emphasis.itemStyle.color='#276a4e'` overrode the orange personal bucket on hover; replaced generic emphasis with per-bucket stable colors and subtle personal outline. (008) fixed 20/40 visible levels + 24px bar cap produced thin bars on common viewports; derive 8–32 visible intervals from plot width and increase bar cap to 34px with positive category gap to prevent contact. Added pure option/window tests; real browser visual QA and exact-SHA CI still require separate evidence. No API/DB/Supabase/live requests or user data.

## 2026-10-27 — GB-CP05-UIV2-002..005 / screenshot and usability corrections (SOURCE FIX)

Branch `feature/personal-gradebook-ui-refinement`, baseline `71f7276`. P2 V2-01: chart was blank while dynamically importing ECharts; show preparation status before the import and preserve error fallback. P2 V2-02: `.birthday-field` hid the original invalid text-input border and nested focus outlines; render a single wrapper focus/error ring and accessible trigger focus. P3 V2-03: redundant range slider + return button duplicated ECharts' built-in scrolling; keep only ECharts visible scrollbar and move one-stop Arrow/Home/End accessibility to the plot. P3 V2-04: month dropdown allowed future months of the current year with no selectable days; disable future-month options and clamp the month after year changes. Screenshot-specific DATE-01: typed `29022000` could become `29/022000`; normalize all digit/slash partial input with cursor preservation in a pure helper, without changing Gregorian validation. Layout: widen and compact desktop chart dialog, do not hide overflow. Fixture QA labels untouched by user decision. Regression evidence and tests to be confirmed independently, no hosted services/real data.

## 2026-10-27 — GB-CP05-UIV2-001 / P2: calendar edit synchronization (FIXED IN V2 DRAFT)

On baseline75590c1, feature/personal-gradebook-ui-refinement, local QA of the newly introduced calendar found an uncommitted integration defect: a year edit followed immediately by month selection could be redrawn with the previous year; Enter in the year field could submit the enclosing verification form. The new BirthDatePicker now synchronizes bounded year input before redraw and handles Enter as calendar navigation. Static review also found its input listener ran before the existing digit-only slash formatter, leaving the open calendar one input event behind. StudentLookup registers normalization first; the single text field remains the selected DOB source, with no second selected-date store.

Actual synthetic Chrome checks: invalid31/02/2000 and29/02/1900 preserved/rejected; year2000/month2 exposes29, Enter stays in calendar, digit-only29022000 becomes29/02/2000 with the same selected grid date; Arrow/Home/End/PageUp/Escape work. Manual reset, expiry-in-chart and held401 restore empty enabled inputs and remove chart; calendar navigation state is explicitly cleared on reset/disposal. Existing pure date/Vietnam-day tests plus the V2 helper case cover the strict contract. No hosted request or production deployment; this was a development-candidate issue, not a confirmed production incident. Native-device/screen-reader/CP01-C acceptance remains NOT RUN.

## 2026-10-27 — GB-CP05-F01..F05 / focused reviewer corrections (FIXED OFFLINE)

Baseline a99569b, feature/personal-gradebook. **F01/P2:** createLookupState accepted capability without a usable context, hiding both form and board. Shared studentContext now projects required class/publication metadata and existing ordered catalog validation before retaining capability or emitting verified; malformed responses stay unavailable and permit recovery. Pure F01 cases and actual browser missing/bad-catalog/bad-publication→valid checks pass; no private read after invalid context.

**F02/P2:** text-only Y range lacked a visible numeric axis. histogramScale returns bounded integer ticks from0 to actual maximum (zero uses0–1); fixed Y-axis/grid share the180px plot with proportional bars and101 exact buckets. Pure zero/one/mixed/max-safe cases pass; browser0/1/23/1000 and0.0/8.3/10.0 highlight checks pass. **F03/P2:**101 tabindex0 buckets replaced by one roving entry, Arrow/Home/End bounded indices and scroll-to-focus, explicit footer close target. Pure index tests and browser Tab/Arrow/Home/End/Escape/focus restoration pass.

**F04/P2:** manual reset previously disposed the focused gradeboard without a form focus target. Lookup renderer now focuses the enabled identity input only when returning from an owned private view; expiry/401 use the same cleanup, while disposal never redirects focus into a removed view. Browser keyboard reset/expiry-in-modal/held401 and late-response disposal verified. **F05/P3:** README six-file inventory and ignored-only CP05 QA were not reproducible. Updated11-file curated inventory plus maintained development-only component fixture/data and precise local steps; no new runner/workflow/dependency. Final tests/build/exclusion evidence in STATUS. No SQL/Edge/production transport/security contract changes; hosted0, CP01-C/real-data/Safari/device gates NOT RUN.

## 2026-10-27 — GB-CP05-001 / P2: histogram denial must invalidate the visible semester (FIXED OFFLINE)

During CP05 self-review on baseline741ee3d, chart error handling initially cleared only the chart. A403 on histogram can indicate publication/access changed since the table was read. student-gradeboard.js now clears the owning semester scores/table immediately on denial, retains the capability for the other semester, and never retries automatically. Synthetic Chrome denial check observed table count0; switching back to an allowed semester succeeds.401 separately clears capability and all private DOM through CP02 state. Pure DTO/terminal-status tests and Browser QA are offline evidence only; backend publication/Auth enforcement remains CP01-C NOT RUN. No SQL/Edge or production deployment changed.

## 2026-10-27 — GB-CP04-001 / P2: structured422 previews lose actionable counts/errors (FIXED OFFLINE)

Baseline `60fd760`, feature/personal-gradebook. B4 deliberately returns422 for a preview plan with safe counts/errors; CP03's shared gate previously propagated every rejection as a generic operation failure, losing that structured plan for future integration. src/utils/gradebook-admin.js now projects only validated counts/source coordinates for roster.preview/scores.preview errors supplied as status422 + payload; discards diagnostics, internal state and tokens; mutations/other statuses still reject. CP04-T11 pure/component coverage and actual installed-Chrome synthetic422 unknown/DOB-conflict previews PASS, apply remains disabled. Production adapter still has no transport: authorized future transport must extract the422 body into error.payload; no SDK/HTTP/backend integration acceptance inferred.

## 2026-10-27 — GB-CP04-002 / P3: final CSV cell bypasses width guard (FIXED OFFLINE)

Same baseline/branch. Focused CP04-T06 exposed that csvRecords checked accumulated columns during scanning but did not bound the final cell pushed at end-of-row/file. Downstream roster validation already rejected invalid widths, but the extractor's declared maximum could be exceeded. src/utils/roster.js now checks each emitted cell with safe original row/column; default roster3-column cap remains, score mode explicitly allows10. T06 failed before the guard and affected rerun1/1 PASS; CP03 parser tests remain in final curated gate. No hosted requests, backend changes or raw-file persistence.

## 2026-10-26 — GB-CP03-001 / P2: route scope requires randomUUID (FIXED OFFLINE)

Baseline `1fcbf29f4d10f595a6f251f54627b8f699f7386d`, feature/personal-gradebook. Direct crypto.randomUUID in src/app.js could prevent routing where that API is unavailable. Route scope now uses existing src/utils/id.js newId fallback, no new identity/Auth mechanism. Pure CP03-T01 exercises missing randomUUID; installed Chrome QA disables the method before app bootstrap and verifies Board/lookup/admin navigation. Hosted requests0; no changes to B1–B4/migrations or CP01-C acceptance.

## 2026-10-26 — GB-CP03-002 / P2: duplicate import errors lack stable category (FIXED OFFLINE)

Same baseline/branch, during CP03 focused testing. rosterBatch detected duplicate identities but omitted error.code, making row/column errors indistinguishable from generic invalid fields. src/utils/roster.js now emits duplicate_identity without cell payload; pure T08 failed before the fix and passed after it. Actual Chrome CSV reports source row4/column1 and disables preview/apply. This is local parsing/UI evidence, not backend atomicity. The commit containing this entry anchors both fixes; CP03 data and screenshots are synthetic and ignored.

## 2026-10-26 — GB-CP03-003 / P2: unresolved confirmation outlives private route (FIXED OFFLINE)

CP03 self-review at the same baseline found component-owned dialogs were disposed but shared ConfirmDialog decisions were not owned. Browser Back/logout could leave a stale confirmation on the next route. primitives.js now accepts an optional AbortSignal (old Board callers unchanged); gradebook-admin.js aborts all pending decisions on route/session disposal. Installed headed Chrome supplemental component QA confirms Back/logout removes the dialog with zero student mutations/console errors, using synthetic session/admin adapters; no backend requests. This is not real Auth acceptance.

## 2026-10-26 — GB-CP03-004 / P3: failed page fetch advances cursor (FIXED OFFLINE)

Same CP03 self-review: pagination updated its cursor stack before the request without restoring it after failure. gradebook-admin.js restores the previous cursor on a failed page read; session cancellation still clears state. Supplemental actual Chrome fault injection confirms failed Next keeps20 rows/page1, subsequent explicit Next reaches page2 with1 row, then Previous returns page1. No automatic retry or hosted requests. Existing pure90-test gate was already green; after these two component changes only affected static/build/format and focused Chrome evidence were repeated, not the unchanged full local unit suite.

## 2026-10-26 — GB-CP02-REV-001 / P2: administrator entry races session restoration (FIXED OFFLINE)

Baseline `1874cbaf7da0bf0d351ac58a84df55cd07af9654`, branch `feature/personal-gradebook`. `app.js` awaited route rendering then clicked `.header-admin`, although Board bootstrap's async refreshAuth was still pending. Admin=false during restoration could open an unnecessary login dialog. `main.js` now shares the existing restoration promise and exports direct openBoardAdmin; the pure entry coordinator fences stale route/Auth generations, waits for pending work, denies failed/checking sessions and preserves anonymous login/admin notice/logout. Both headers use this entry; no new client or extra Auth verification to open it.

Focused pre-final CP02 units12/12 PASS; final curated gate79/79 includes anonymous/loading/failed/stale/admin entry. Installed headed Chrome155, isolated profile + actual localhost app with intercepted synthetic Auth/REST: anonymous login, delayed/already-admin entry without duplicate prompt/reverification and failed restoration PASS; logout PASS. Hosted requests0, no real credentials/data. See current STATUS; this is offline behavior evidence, not real Auth/CP01-C acceptance.

## 2026-10-26 — GB-CP02-REV-002 / P2: rejected popstate grows/replaces history (FIXED OFFLINE)

Same baseline/branch. Rejected draft persistence used pushState to repair the URL after Back, truncating Forward history and potentially creating duplicates on repeated traversal. `src/utils/app-navigation.js` stamps path-only scope/position metadata, restores tracked entries with history.go(delta), ignores compensation events and fences superseded guards. Unowned pre-upgrade entries use replaceState fallback without adding entries. `app.js` renders/disposes only accepted transitions; existing editor-owned prepareRouteExit is unchanged. Pure tests cover rejected Back/Forward/link exits, rapid traversal and preventing a stay-on-Board approval from authorizing a different exit.

Chrome QA used the actual editor with synthetic title and controlled localStorage draft failure: two Back attempts retained text, URL/visible Board and history length5; restoring persistence saved the draft, allowed Back and preserved Forward. Menu/lookup private-input disposal, desktop1440/mobile390 viewport and direct refresh PASS; zero console exceptions. Final check/unit79/79/build/format/diff PASS; Windows CRLF-only format failure corrected locally without unrelated source diff, only format repeated. Artifacts under ignored tests/local/cp02-final; no committed browser harness, hosted calls, backend/deploy/migration, real data or stress test. CP02 OFFLINE ACCEPTED; CP03 not started.

## 2026-10-26 — GB-B5-REV-001 / P1: PR conflict blocks CI (CONFIRMED / OPEN; reporting corrected)

Baseline `c9e18c173d70198bce8cc53d39a93271e395e181`, feature/personal-gradebook; develop307b6c6. Prior B5 response reported no Actions run but did not diagnose PR5's mergeable=false/mergeable_state=dirty. Confirmed REST evidence plus read-only Git three-tree diagnostic identifies docs/BUG_FIX_LOG.md: develop AUD-020 and feature Gradebook entries compete immediately after the introduction. docs/STATUS.md differs on both sides but has no diagnostic conflict markers. GitHub does not trigger pull_request workflows with merge conflicts; no waiting/retry/trigger bypass can supply that acceptance.

Correction in this task is the evidence/handoff, **not conflict resolution**. [Exact baseline/blobs and proposed separate reconciliation](features/personal-gradebook/B5_OFFLINE_REVIEW.md). Preserve all AUD-020/Gradebook entries in a later separately authorized normal merge into feature; no whole-file ours/theirs, rebase/force-push/develop edit/PR merge. No such action performed; P1 remains OPEN and exact-HEAD Actions is BLOCKED.

The temporary SQL approval was superseded before any commit: PGlite dependency/lock addition, SQL CI step and new ad-hoc runner removed. The one earlier13/13+7/7 PGlite run is retained only as historical evidence, not current CI. Revised explicit test:ci contains six component/pure-unit files; API/HTTP/Supabase/Edge/service/SQL/runtime integration and browser assets are excluded, with a pre-merge retention/removal inventory. No new test/probe file or integration rerun. One final curated gate66/66 PASS, check/build/format/diff PASS; no new security acceptance. GB-B5-REV-002/P2 boundary retained: no native17/hosted/security inference from PGlite. Production/tests/migrations unchanged, no hosted Supabase/Auth/migrations/deployments, real data or stress/load/soak/stretch. Commit containing this entry is the reporting/policy-tooling trace, not a resolved conflict or deployed repair.

## 2026-10-26 — GB-B5-001 / P2: Edge source omitted from syntax/format gates (FIXED IN DRAFT)

Baseline `8f2bcfbffbdac45fc8e0d16a2b7169ef084d9459`, feature/personal-gradebook. scripts/check.mjs checked only src JS and package format scope omitted supabase/functions; B4 .test.js discovery was already correct. Thus a passing prior CI did not check syntax/format of every Edge file. Formatter was an npx-only pin absent from local cache (ENOTCACHED), not an executed format result. This is a tooling coverage defect, not a deployed Gradebook failure.

Correction: include all13 Edge modules/entrypoints in syntax and pinned format gate; preserve frontend credential rules, use a separate Edge literal-secret/JWT guard that permits server env variable names; lock only prettier3.6.2 as devDependency and use local binary. Format only B4/checkpoint files, compare equivalent Babel AST for12 existing B4 code/test files. Add one actual-entrypoint Node adapter test with synthetic Deno/env, pinned SDK resolution and fetch denied; no production behavior changed.

One final-code run: npm run check PASS; npm test120/120 PASS; npm run build PASS; npm run format:check PASS; git diff --check PASS. Runtime adapter confirms204/401/400 without network. No full-suite repeats. [B5 report](features/personal-gradebook/B5_OFFLINE_REVIEW.md) retains separate gaps: PGlite addition rejected by automatic approval review, SQL execution CI not wired; native Deno/bundle absent/NOT RUN; exact-final-SHA Actions outcome reported after publication. B5 remains partial, not accepted as complete. No hosted Supabase/Auth/migrations/Edge deployments, real data or stress/load/soak/stretch tests. Commit containing this entry is the trace; NOT DEPLOYED.

## 2026-10-26 — GB-B4-REV-001 / P2: Supabase SDK CORS header compatibility (FIXED IN DRAFT)

Baseline `e036521e079c514a44b24ed1bf9b706fbddfa5e5`, feature/personal-gradebook. The shared handler's OPTIONS allowlist omitted `x-client-info`, which pinned SDK2.118.0 sends with JSON Functions invocations. Browser preflight could therefore prevent an otherwise authorized request; this is a source-confirmed compatibility defect, not an observed hosted incident. Node POST-only tests did not check the actual preflight header values.

Correction: add only `x-client-info` to `supabase/functions/_shared/handler.js` alongside authorization/apikey/content-type/x-gradebook-capability. Both entrypoints retain explicit allowed origins, POST/OPTIONS methods, no-store, existing headers and unchanged authentication. SDK source `supabase-js/src/lib/constants.ts`, `lib/fetch.ts` and `functions-js/src/FunctionsClient.ts` plus a mocked real-SDK invocation confirm the default JSON header set. Optional tracing headers require explicit opt-in (disabled by default); regional invocation adds x-region and a query parameter outside the existing no-query Gradebook contract. PostgREST x-retry-count is not a default Functions invoke header. No optional feature, wildcard header/origin or SDK-wide CORS defaults were added.

`node --test --test-name-pattern='CORS preflight|HTTP boundaries' tests/gradebook-edge.test.js`: **4/4 PASS**, one bounded offline run. Three new cases inspect actual OPTIONS response headers for both endpoints, dedicated student capability preflight and rejected origins; backend factory/Auth/RPC/limiter calls remain0. The existing HTTP-boundary test also passes. `node --check supabase/functions/_shared/handler.js`, `node --check tests/gradebook-edge.test.js`, `git diff --check`: PASS. No full suite, browser, SQL or hosted test. Formatting/CI remain NOT RUN for this task, prior ENOTCACHED remains B5-owned; crypto/retry acceptance evidence is unchanged, not rerun.

Status **FIXED IN DRAFT / NOT DEPLOYED**; commit containing this entry is the trace. Hosted Supabase/Auth requests0, migrations0, Edge deployments0; real dataNONE; stress/load/soak/stretchNONE. B4 READY FOR FINAL REVIEW only; B5 NOT STARTED; native17/hosted security/CP01-C/migration rollout/real-data gates remain NOT RUN. [Focused review and unchanged concern matrix](features/personal-gradebook/B4_INTEGRATION_REVIEW.md#gb-b4-rev-001--sdk-cors-correction-2026-10-26).

## 2026-10-26 — GB-B4-002 / P2: apply publication-race error category (FIXED before deployment)

Baseline29a7f2a, B4 draft static self-review. Existing B3 gradebook.plan checks publication before import_run compares the state hash. If publication changes after Edge preflight, that final apply may raise22023/published; the initial Edge draft's generic mapper would return403/422 rather than the promised stale-preview409. This is HTTP conflict classification, not evidence of partial writes or an authorization bypass.

Fix in `_shared/admin.js:executeAdmin`: scope the22023→409 preview_conflict mapping to the verified apply path, mirroring read-only preflight behavior; preserve42501 authorization and genuine40001/unexpected infrastructure503. No SQL edit or retry. `node --test --test-name-pattern='DB-dependent publication|stale preflight' tests/gradebook-edge.test.js` **2/2 PASS**: changed-publication preflight invokes no apply, final-apply conflict invokes it once, existing PT409 handling remains terminal. All traffic mocked, no hosted reproduction. FIXED IN DRAFT / NOT DEPLOYED; B5/CP01-C/real-data gates unchanged.

## 2026-10-26 — GB-B4-001 / P2: non-string operation coercion (FIXED before deployment)

B4 baseline `29a7f2a`, feature/personal-gradebook. Static self-review of the new draft found that Object.hasOwn(specs, body.op) coerces an array such as ['class.read'] into a matching property key. That could pass initial membership validation then fail dispatch with503/unnecessary Auth calls; the student branch could also dispatch an invalid non-string operation. No authorization bypass, data disclosure or deployed incident is asserted.

Fix: `_shared/admin.js:validateAdmin` and `_shared/student.js:validateStudent` require typeof op==='string' before membership lookup. Malformed enum values now return400 before backend clients are invoked. Focused offline regression `node --test --test-name-pattern='client actor|non-string student operation' tests/gradebook-edge.test.js` **2/2 PASS**; other B4 tests had already passed29/29 before this correction, not rerun wholesale. Later three additional focused keyring/claims/GET-retry tests PASS3/3. No existing SQL or Board source changed, no custom retryable business errors or automatic retry introduced.

Status FIXED IN DRAFT / NOT DEPLOYED. Hosted requests/Auth/migrations/deployments0; production secretsNO; real dataNONE; stress/load/soak/stretchNONE. [Five mandatory B4 concern confirmations and limitations](features/personal-gradebook/B4_INTEGRATION_REVIEW.md#cp01-b4-implementation--mandatory-concern-confirmations-2026-10-26). Prettier unavailable ENOTCACHED; exact-HEAD CI/Deno/runtime integration B5, native17 and hosted security CP01-C, real-data gate NOT RUN. The commit containing this entry is the correction/implementation trace, not proof of hosted repair.

## 2026-10-26 — GB-B4-INT-001 / P1: reveal dependency (FIXED IN DRAFT)

Baseline `0bbd0c3b179c564a0705af97dbdac6a6b9c1a7f6`, feature/personal-gradebook. Static B4 preflight confirms `gb_student_read(reveal=true)` in `20261026030000_gradebook_transactions.sql:172–184` returns ciphertext/nonce/encKid/algVersion but not stored identity_lookup or lookup_key_version; base DTO lacks them too. CP01-A §6 AES-GCM AAD includes the stored lookup hex, and reveal must recompute the generation-specific HMAC before disclosure. B4 cannot safely obtain this context through the accepted RPC surface. Root cause: B3's privileged reveal projection omits required authenticated identity context, not a crypto primitive failure or observed hosted incident.

Initial preflight status at76102e2 (historical): **OPEN — B4 blocked by B3 integration dependency**, not FIXED. [Review and minimal correction plan](features/personal-gradebook/B4_INTEGRATION_REVIEW.md): separately authorized additive replacement of only the exact reveal RPC, add stored lookup/key generation only to the server-only reveal projection; preserve authorization/audit/owner/ACL and ordinary DTO. B4 must strip all crypto/index fields from browser responses. No upstream SQL correction, Edge code or bypass was implemented in this task.

Evidence is repository static inspection, not runtime reproduction. TestsNONE; hosted requests0; migrations/deployments/secretsNO; no stress/load/soak/stretch. Future focused synthetic SQL+Web Crypto checks are specified in the review, NOT RUN. Native17, hosted security/CP01-C and real-data gate remain NOT RUN; B5 NOT STARTED. The commit containing this entry records the blocker/documentation only, not a defect fix or completed B4 implementation.

### GB-B4-INT-001 correction — CP01-B3-FIX-REVEAL / baseline76102e2

**FIXED IN DRAFT / NOT APPLIED / READY FOR REVIEW.** New `20261026060000_gradebook_reveal_identity_context.sql` changes only `public.gb_student_read(uuid,uuid,uuid,bigint,boolean)`: reveal=true retains its envelope and adds identityLookup from stored identity_lookup and lookupKeyVersion from stored row generation. Exact reviewed original/corrected hashes, signature/default/config/security/ACL guards and full pg_proc metadata comparison; safe replay, missing/drift rejection. Ordinary student_dto, list/read, owner, ACL, locking and class-scoped audit remain unchanged. Audit means an authorized DB reveal request, not successful Edge decryption/display. Accepted migrations unchanged; no new grants/API/table.

One focused run of `tests/gradebook-reveal-sql.mjs` on existing disposable PGlite0.5.11/PostgreSQL18.6: **7/7 groups PASS** (ordinary/default/list equality, stored generation7 vs class1, actual role/actor/session/scope denial, safe audit, full metadata/all-other-functions preservation, guard/replay, eight PT409 corrections unchanged). Synthetic-only fixtures; no real cryptographic keys or personal records. Static source hashes and node syntax/diff checks PASS; pinned offline Prettier unavailable ENOTCACHED, no registry request/dependency installation. Full app/B2/B3 suites/build/browser not run. Supabase CLI unavailable; new unique ordered filename created offline using the established convention.

Hosted requests/Auth0; migrations applied0; Edge deployments0; secretsNO; real dataNONE; stress/load/soak/stretchNONE. B4 implementation/crypto/DTO sanitization, native17/hosted integration/security, CP01-C and real-data gate NOT RUN; B5 NOT STARTED. [Detailed self-review and rollout chain](features/personal-gradebook/B4_INTEGRATION_REVIEW.md). The commit containing this follow-up is the correction trace; no hosted repair or B4 completion is claimed.

## 2026-10-26 — GB-DOC-003 / CP01-A accepted refinements

Branch `feature/personal-gradebook`, baseline `31f887bd`. GB-A-REV-001/P2: unpublish tăng epoch toàn lớp gây xác minh lại cả học kỳ còn công bố; GB-A-REV-002/P2: fingerprint chưa chốt đầy đủ absence/raw values; GB-A-REV-003/P3: DOB dùng tên múi giờ chưa phù hợp và thiếu hợp đồng date-only. Sửa [thiết kế CP01-A](features/personal-gradebook/CP01_TECHNICAL_DESIGN.md#143-accepted-refinement-disposition), DATA_AND_SECURITY/CHECKPOINTS và README/STATUS: publication kiểm từng học kỳ, fingerprint tồn tại/vắng mặt + raw NUMERIC với commitment có khóa, DOB calendar-only/Asia/Ho_Chi_Minh; B1–B5 và T05/T09/T19 có owner/evidence. **RESOLVED trong tài liệu**, BRIEF giữ nguyên; không phải runtime bug fix. Diff/links/requirements được kiểm tra trong lượt correction; DB/API/Auth/concurrency/browser/security **NOT RUN**, không truy vấn hay sửa Supabase. Commit chứa entry là mốc docs-only; không có code/migration/deploy/merge/push.

## 2026-10-26 — GB-DOC-002 / clarification sau review tài liệu

Branch `feature/personal-gradebook`, baseline `eba7c18e`. P2 documentation: mẫu danh sách học sinh chưa quy định rõ có thể bỏ hẳn cột `Họ tên`, và `STATUS.md` còn đặt snapshot cũ dưới nhan đề trạng thái hiện tại. Làm rõ CSV/XLSX hai cột tối thiểu hoặc ba cột có tên, giữ nguyên quy tắc UPSERT và giá trị tên đã có; bổ sung regression CP03/CP06; đưa HEAD/CI mới của `develop` và Security Advisor vào STATUS, chuyển snapshot AUD trước thành lịch sử; ghi CP00 docs PASS riêng khỏi implementation. **Docs-only**, không thay source/schema/PII, browser/backend/real security NOT RUN. Kiểm tra diff/links phải được xác nhận trên commit cuối cùng.

## 2026-10-26 — GB-DOC-001 / CP00 documentation correction

Branch `feature/personal-gradebook`, baseline `cc13962`, merge base `af43f51`; develop được đối chiếu ở `307b6c6`, không merge/rebase. Review GB-REV-001..008 nêu thiếu hợp đồng decimal/lịch sử/import/throttle/bridge/audit/gate. Sửa bộ tài liệu feature theo quyết định mới D01–D05, không áp máy móc đề xuất review: ≤5-place decimal strings, metadata năm học sửa được, UPSERT, inference deferred, limiter kỹ thuật đo được, RPC server-only/audit theo lớp và gate trước dữ liệu thật. README/OVERVIEW/DECISIONS/STATUS đồng bộ; [CHECKPOINTS](features/personal-gradebook/CHECKPOINTS.md#cp00-finding-dispositions) giữ disposition từng finding. Trạng thái: **documentation corrected; feature NOT IMPLEMENTED**, backend/security/browser tests NOT RUN trong lượt docs-only; chỉ kiểm diff, links và tính nhất quán tài liệu. Các mặc định kỹ thuật và real-data gate chưa được nghiệm thu; không sửa source/schema/config, không deploy.

## 2026-10-25 — dành chiều cao thẻ cho văn bản

**AUD-020 / P2 — FIXED offline/browser Codex.** Baseline `af43f51`, branch `develop`, có các thay đổi local khác giữ nguyên. Lần tăng chiều cao đầu tiên chỉ thêm margin trước `.card-meta` nên mô tả vẫn bị clamp 3 dòng, khoảng trống thêm không dùng để đọc. `src/styles/main.css` trả margin footer về 16px; bỏ clamp/ẩn overflow mô tả, đặt min-height bằng `3lh + 2cm` sau yêu cầu giảm 3cm từ mức cộng 5cm; cho mô tả dài nở tự nhiên. Tiêu đề/mô tả dùng overflow-wrap để chuỗi dài không tràn ngang. SPEC R05.2 cập nhật đúng yêu cầu được người dùng làm rõ; không đổi nội dung bài hoặc ảnh/media.

`npm run check`, `npm run build` (gồm gate loại test khỏi dist), format CSS **PASS**. Browser QA từng BLOCKED ở sandbox; chạy Vite trên loopback ngoài sandbox đã cho phép browser Codex/IAB truy cập, không dùng Chrome trên máy. Fixture offline ở `tests/local/card-height/` (Git ignore) so cùng DOM/CSS, baseline chỉ override min-height cũ 5cm. IAB iframe360/390/1024/1440 PASS: thẻ ngắn giảm 113,387–113,388 CSS px; chiều ngang không đổi, không tràn document; mô tả dài và chuỗi liền không bị clip/clamp (scroll/client dimensions), thẻ dài tự nở nên không bị ép giảm 3cm khi cần chỗ cho chữ. Bằng chứng local: `results.json`, `compare-2cm.png` trong thư mục fixture trên, không publish. Mọi dữ liệu giả lập; không gọi backend thật. Thiết bị/Safari thật **NOT RUN**. Không deploy/commit trong lượt này.

## 2026-10-25 — sửa CI PR #3 sau thay đổi thông báo

**AUD-019 / P1 CI blocker — FIXED offline.** Baseline `34b2ff0`, branch `enhancement/acceptance-refinements`. Run `40151354448` lỗi đúng hai assertion khớp message cũ trong `tests/drafts.test.js` và `tests/reliability.test.js` (39/41 PASS); build/format bị skip. Đã tái hiện local. Thay regex thông báo bằng kiểm rejection kiểu Error kèm bất biến: con trỏ khác UID không được đọc blob, snapshot text/blob cũ không đổi; cleanup bị cắt không xóa tệp, giữ queue và retry kiểm đủ tham chiếu thì giữ tệp đang dùng rồi xóa queue. Không đổi thông báo hoặc logic ứng dụng.

41/41 unit, check, production build và format PASS local, transport offline. Gate format phát hiện 5 file upstream còn sai format sau khi bỏ khác biệt EOL: `src/main.js`, `src/services/client.js`, `src/services/storage.js`, `src/utils/quota.js`, `tests/dom.test.js`; sửa bằng Prettier 3.6.2 trong commit format riêng `c1230c3` sau commit regression `bd6acb1`. Prettier debug-check và diff xác nhận phần format không đổi logic/message. Offline CI run [40152051421](https://github.com/khoabm/dashboard/actions/runs/40152051421) PASS trên `c1230c3`, đủ unit/build/format. Không chạy browser/backend thật vì không đổi hành vi UI/backend. Commit docs tiếp theo cần xác nhận CI riêng; không merge/đổi Draft/deploy.

## 2026-10-25 — đóng gói regression và ranh giới production

**AUD-018 / P2 — FIXED offline.** Baseline `6bf2069`, branch `enhancement/acceptance-refinements`. Commit trước thiếu regression Auth/điều hướng và fixture được docs tham chiếu; build chưa có gate ngăn đưa test nhầm vào website. Giữ test tái sử dụng trong `tests/`, output máy tại `tests/local/` được ignore. `vite.config.js` chặn test module trong graph production; `package.json` chạy `tests/check-production-build.mjs` kiểm allowlist dist sau build. DEPLOYMENT yêu cầu hosting chỉ phục vụ dist, kiểm URL test trước phát hành.

Bằng chứng: 38/38 offline unit PASS, syntax/credential/diff check PASS, production build PASS. Negative checks: dùng `tests/session.html` làm entry bị build từ chối; chép `dist/test/session.html` bị output gate từ chối và đã dọn file giả lập. Không gọi Supabase thật. Routing HTTP production **NOT RUN** vì chưa có hosting/deployment; không hứa 404 khi hosting có SPA fallback. Gate ngăn fixture được publish trong artifact build chuẩn, không thay việc cấu hình đúng document root.

## 2026-10-24 — khắc phục sau audit PR #1

Branch sửa: `fix/audit-reliability-20261024`, tạo từ `refactor/code-formatting-guidelines` tại `e5605d87ab5106f5b41d491b970aec68b744fc91`. Audit trước đó đọc `20772f1`; hai lỗi format đã được upstream sửa tại `e5605d8` trước khi tạo branch này. Không sửa refactor/develop/main, không apply migration hoặc deploy.

| ID / mức độ | Điều kiện lỗi và nguyên nhân | File / cách khắc phục | Xác minh / trạng thái |
| --- | --- | --- | --- |
| AUD-001 / P1 | Metadata vượt row cap Data API: SELECT một lần cắt attachments; save_post thay toàn bộ danh sách nên lần lưu sau có thể mất metadata. Export cũng bị cắt | `src/services/pagination.js`, `board.js`: phân trang 500 hàng, unique tie-breaker ID, tăng offset theo số hàng thực nhận; kiểm exact count, ID trùng và tiến độ, lỗi thì không trả snapshot/export dở. Đọc version posts trước attachments; gom attachment bằng Map | **FIXED**, offline 1.210 attachments / 121 posts, cap 200, ranh giới 1.000, trang rỗng/lỗi/count đổi/trùng ID đều được kiểm; QA-A01. Save vẫn được RPC expected_version bảo vệ |
| AUD-002 / P2 | Đăng xuất rồi refresh lỗi giữ snapshot private; request quản trị cũ có thể trả muộn và render lại dữ liệu riêng | `src/main.js`, `src/utils/request-gate.js`: xóa snapshot/dialog/admin UI đồng bộ khi SIGNED_OUT; thế hệ request chặn kết quả/lỗi cũ và không chặn lần tải public mới. Dời SDK read khỏi Auth callback | **FIXED**, unit race và browser giữ response quản trị → đăng xuất → public lỗi → trả response cũ; không còn private DOM. QA-A02 |
| AUD-003 / P2 | persist bắt lỗi localStorage/IndexedDB nhưng không báo thất bại; requestClose vẫn đóng editor và hứa giữ nháp | `src/components/post-editor.js`: persist trả boolean; chỉ đóng khi cả hai store lưu được. Lỗi giữ editor/nội dung, mở khóa và báo đúng; serial hóa autosave, đợi ghi đang chạy trước xóa nháp sau remote success | **FIXED** với nháp văn bản, browser fault riêng text store và IndexedDB giữ form; đóng/khôi phục text thành công; QA-A03/A04. Nhánh pending file được xác minh/sửa tiếp ở AUD-009 và QA-A10; File API/IndexedDB PASS, native filechooser chưa nghiệm thu |
| AUD-004 / P2 | CSS pointer-events không khóa keyboard; reference close cũ đã bị replace. Có thể sửa trong lúc save rồi nháp mới bị xóa | `src/components/post-editor.js`: inert form + aria-busy, khóa đúng close button; chờ kiểm chữ ký file, chụp danh sách upload sau khi sẵn sàng. Cleanup ngăn callback file đã hủy cập nhật editor | **FIXED** cho thao tác UI đã thử: browser giữ response save, Tab/x/Escape không đổi tiêu đề hoặc đóng dialog; payload mock đúng 1 link, nháp xóa sau success mock; lỗi save giữ nội dung và mở khóa. QA-A05. Pending file trong khi busy đã kiểm riêng bằng barrier ở QA-A10; xem AUD-009 |
| AUD-005 / P2 | Storage đã nhận file nhưng response mất: path chỉ được ghi sau await nên không có trong cleanup queue | `src/services/storage.js`: ghi nhận path trước upload; khi lỗi, đưa toàn bộ path đã thử vào cleanup/queue, kiểm tham chiếu trước xóa. Chia lookup 100 path và kiểm count để không xóa dựa trên kết quả bị cắt; giữ các candidate mới khi cập nhật queue | **FIXED**, offline partial failure + response lost, lookup fail → queue đủ 2 paths; retry không xóa file có tham chiếu; truncated lookup không xóa; queue 1.201 paths. QA-A06 |
| AUD-006 / P2 | access.sql tạo thêm admin active gây unique violation khi đã có admin; assertion Storage=0 sai sau upload thực | `supabase/tests/access.sql`: dùng active admin hiện có hoặc fixture UUID rollback nếu chưa có; JWT sub động, quota so với baseline. Dùng board/section riêng trong transaction thay việc reorder nội dung hiện có | **FIXED**, một batch SQL thành công trên project thật có admin; sau rollback active_admins=1, confirmed_active_admins=1, fixtures_remaining=0. QA-A07. Không phải login JWT hoặc upload bytes thật |
| AUD-007 / CI | Prettier fail vì dòng trắng thừa trong board.js/dom.js ở head audit | Upstream `e5605d8` đã sửa trước khi branch fix được tạo; không nhận là thay đổi mới của branch này | **FIXED UPSTREAM**; gate format toàn repo PASS cục bộ trên branch fix. CI branch fix tại bb30da0 PASS (run 40062401858); commit sau kiểm Checks riêng, không suy từ SHA cũ |
| AUD-008 / docs | STATUS/SECURITY/QA ghi chưa có Auth user/admin; trạng thái CI thiếu bằng chứng thực tế | `docs/STATUS.md`, `SECURITY.md`, `QA_REPORT.md`: sửa snapshot hiện tại; giữ kết quả cũ dưới ngày lịch sử, tách mock/live và gate còn thiếu; thêm trace bắt buộc vào AGENTS | **FIXED**, đối chiếu batch SQL QA-A07 và check cục bộ; không đưa UID/email thực vào tài liệu |
| AUD-009 / P2 | **Xác nhận lại trên baseline bb30da0:** change của file input đã bubble lên form và đánh dấu dirty; không tái hiện giả thuyết thiếu dirty trong thao tác thường. Lỗi thật: persist chụp attachments trước khi hàng đợi xác minh xong, rồi SIGNED_OUT/close cleanup hủy file đang chờ; callback kết quả trong busy cũng cần được ghi nhận | `src/services/drafts.js`: createDraftWriter chờ file rồi mới đọc trạng thái, serialize và báo lỗi hai store. `post-editor.js`: onPending/markDirty riêng, close/flush chờ file; hết phiên đóng UI ngay nhưng chỉ cleanup sau local flush, callback muộn không đổi dirty toàn cục. `main.js`: flush trước confirm/logout, chống logout trùng và bỏ luồng cũ khi Auth generation đổi | **FIXED** trong commit tiếp nối bb30da0. QA-A10a–g PASS trên Chrome với File API/barrier, PDF bytes và IndexedDB thật; transport/Auth giả lập, không Supabase. 18 unit PASS, gồm 4 regression writer mới. Filechooser OS/Safari/JWT/Storage thật vẫn chưa nghiệm thu |
| AUD-010 / P1 | Baseline 306958f: ConfirmDialog trả false khi SIGNED_OUT đóng câu hỏi khôi phục; nhánh else coi là từ chối và xóa text/blob dù chưa có quyết định bỏ nháp | `primitives.js`: DraftRecoveryDialog trả restore/discard/cancel, chỉ nút Bỏ bản nháp cho phép xóa. `post-editor.js`: kiểm editor/Auth sau câu hỏi; recovery chưa xong không được flush hoặc xóa do đóng ngoài ý muốn | **FIXED**, QA-A12a/d: baseline mất text và file; sau sửa SIGNED_OUT và X giữ textUnchanged=true, files=1; chủ động Bỏ bản nháp mới xóa cả hai store |
| AUD-011 / P1 | Baseline 306958f: lỗi get IndexedDB bị đổi thành danh sách rỗng; changed/autosave ghi đè file đã lưu khi write vẫn hoạt động | `drafts.js`: recoverAttachments đọc đủ thứ tự/metadata/blob hoặc throw. `post-editor.js`: recovery chỉ đọc cho đến khi toàn bộ file khôi phục thành công; chặn autosave/save/flush, có retry hoặc giữ nháp và đóng; không merge model dở | **FIXED**, 3 unit recovery + QA-A12b: fault chỉ-read, write khỏe; sau lỗi và sau tắt fault vẫn textUnchanged=true, files=1; retry khôi phục đúng PDF/header. Helper từ chối blob thiếu hoặc không thuộc thứ tự đã lưu |
| AUD-012 / P2 | Baseline 306958f: submit chờ signature rồi tiếp tục usage/upload/save sau SIGNED_OUT. Xác nhận lỗi vòng đời client, chưa chứng minh backend chấp nhận ghi sai quyền | `main.js` truyền owner/Auth generation; `post-editor.js` kiểm dialog + generation sau các await quan trọng. `storage.js` kiểm isCurrent giữa quota/verify/upload/reference/delete; thao tác hết hiệu lực chỉ queue path cục bộ, không bắt đầu bước remote tiếp theo | **FIXED**, QA-A12c: baseline usage/upload/save/remove = 1/1/1/1, sau sửa = 0/0/0/0 cho save chờ signature → SIGNED_OUT → release; File vẫn ở nháp. 4 unit guard kiểm trước quota, sau quota, sau upload đầu và sau reference lookup; save phiên hợp lệ vẫn PASS mock |
| AUD-013 / P1 | Baseline e98da62: writer ghi blob vào cùng key trước khi ghi text. Khi localStorage thất bại, metadata cũ còn nhưng blob cũ đã bị thay; đóng/hết phiên rồi restore không đọc đủ file | `drafts.js`: blob snapshot bất biến theo UID/post/UUID, publish `files_key` trong text sau khi transaction blob hoàn tất; đọc legacy vẫn được. Reuse snapshot khi tập ID file không đổi, không nhân bản blob khi chỉ sửa text/retry; explicit discard/remote success dọn toàn bộ version cùng draft | **FIXED**, hai regression mới FAIL trên module baseline và PASS sau sửa; giữ nguyên text/bytes snapshot cũ qua lỗi ghi một phần, retry publish snapshot mới. QA-A14a/d kiểm IndexedDB/restore/cleanup thật trong browser offline |
| AUD-014 / P2 | Baseline e98da62: save_post đang chờ rồi SIGNED_OUT; RPC có thể đã thay danh sách attachment, nhưng nhánh hủy chỉ queue uploaded.paths trước khi tính file cũ bị bỏ | `post-editor.js`: tính candidate cũ trước RPC, giữ sau response thành công trước cancellation exit; nếu response lỗi/không rõ kết quả cũng queue candidate. Nhánh hết phiên chỉ ghi queue cục bộ, không gọi remote cleanup; phiên admin sau vẫn phải kiểm tham chiếu | **FIXED**, QA-A14b/c: response success trả muộn giữ file cũ + mới trong queue, remove=0; response lỗi muộn giữ candidate cũ và không xóa file vẫn còn tham chiếu khi retry. Save hợp lệ vẫn dọn đúng file cũ; không kết luận JWT/RLS/Storage thật đã nghiệm thu |

Bằng chứng, bước tái hiện và phạm vi: [QA_REPORT — bổ sung audit](QA_REPORT.md#audit-2026-10-24). Quy trình chạy lại có kiểm soát quota: [TESTING](TESTING.md#kiểm-thử-sau-audit-không-hao-quota).

### Giới hạn còn lại

- Phân trang không biến nhiều REST request thành transaction snapshot. Exact count phát hiện thay đổi số hàng; expected_version bảo vệ chỉnh bài đồng thời. Khi cần backup nhất quán tại một thời điểm, dùng PostgreSQL backup trong [BACKUP](BACKUP.md) và tạm ngừng biên tập; metadata export không bao gồm bytes Storage.
- Cleanup queue phụ thuộc storage trên thiết bị. Tab bị đóng/crash giữa upload đang chạy hoặc browser từ chối localStorage vẫn cần kiểm tra orphan thủ công; không tuyên bố đã xử lý được mọi kiểu gián đoạn. Signed URL đang còn hạn và bytes đã tải không thể thu hồi khỏi máy người xem.
- Các lỗi đã có sửa source và regression trong phạm vi đã ghi; AUD-009 đã có regression File API/IndexedDB với barrier; browser filechooser/OS vẫn chưa nghiệm thu. Không suy PASS runtime/backend từ mock hoặc SQL role simulation; chưa đồng nghĩa đạt toàn bộ Definition of Done. E2E với phiên Auth thật, upload/private file thật, thiết bị/Safari và full restore vẫn cần nghiệm thu riêng.

### Theo dõi điều tra AUD-009 — 2026-10-24

- Baseline `bb30da0` giữ nguyên source `16e8663`: fixture tạo `File` PDF từ placeholder local và phát change bubbling, giữ `slice().arrayBuffer()` chờ nút release. beforeunload guarded=true ngay khi chọn: phần nhận định thiếu dirty trong luồng thường không đúng. Hết phiên trước release → sau release draft files=0: tái hiện được lỗi mất file.
- Sau sửa: cùng cơ chế barrier kiểm close, logout chủ động, forced SIGNED_OUT, save failure/success; đọc lại tên file và `%PDF-` từ blob trong IndexedDB, mở editor restore đúng danh sách. Không dùng kết quả filechooser timeout cũ làm PASS. Chi tiết [QA-A10](QA_REPORT.md#pending-files-2026-10-24).
- Giới hạn: khi browser đóng/crash trước khi local flush xong, hoặc storage thiết bị không ghi được, không thể bảo đảm giữ blob. Forced SIGNED_OUT ưu tiên xóa private UI ngay và cảnh báo nếu local flush thất bại; không giữ UI quản trị để chờ bộ nhớ hồi phục.

### Review khôi phục và hủy save — 2026-10-24

Baseline: `306958ff7d3df59bbc648af778ab79b2fa58f456`. Cả ba phản ánh có lỗi thực sự, đã tái hiện bằng fixture trước khi sửa production source. Chỉ AUD-012 có giới hạn kết luận: gọi dịch vụ muộn là có thật; không có bằng chứng RLS/JWT cho phép ghi trái quyền. Commit chứa cập nhật này tiếp nối baseline trên cùng branch fix, giữ nguyên develop/main/refactor.

Bằng chứng [QA-A12](QA_REPORT.md#draft-recovery-review-2026-10-24); 25 unit offline PASS. Không gọi Supabase thật, không thay schema/policy/Auth config. Request đã gửi trước khi phiên kết thúc có thể đã commit; guard chặn bước tiếp theo, không hứa thu hồi request hoặc rollback server. Path chưa xác minh được tham chiếu chờ lượt admin sau, không dọn remote bằng phiên đã hết hạn.

### Review ghi nháp một phần và response save muộn — 2026-10-24

Baseline được review: `e98da62bdf442d983f3dd7692588f3b9c1848606`; cả hai finding là lỗi thật, không bác bỏ finding nào. Sửa trên cùng branch `fix/audit-reliability-20261024`; commit chứa entry này là mốc sửa. AUD-010/011/012 giữ trạng thái FIXED, không mở lại các gate chưa nghiệm thu thành bug.

Bằng chứng [QA-A14](QA_REPORT.md#partial-draft-late-save-2026-10-24): 27 unit offline PASS, check/build/format PASS và browser Chrome dùng File/IndexedDB thật với Auth/transport mock. Không request Supabase thật, không đổi migration, server signup/anonymous, không merge/deploy.

Snapshot cũ và version chưa publish được giữ cho đến khi người dùng bỏ nháp hoặc save remote được xác nhận trong thao tác còn hiệu lực; thay tập file nhiều lần có thể tăng dung lượng IndexedDB cục bộ. Đây là đánh đổi giữ dữ liệu khi ghi một phần; text-only/retry không sao chép file lại. Không bảo đảm dữ liệu khi browser xóa/evict storage, đóng máy giữa ghi, hoặc localStorage không nhận được cleanup queue. Không tự dọn remote bằng phiên đã hết hạn.

## 2026-10-24 — hoàn thiện phản hồi thao tác (AUD-015)

Branch `enhancement/acceptance-refinements`, tạo từ `develop` tại `ad8c78c9a8e285d96465753ff65942b78b98ccba`. Tên branch dành cho các hạng mục hoàn thiện nghiệm thu tiếp nối; lượt này chỉ triển khai phản hồi đang chờ. Commit chứa entry là mốc sửa; không sửa develop/main hoặc branch audit cũ.

| ID / mức độ | Điều kiện / nguyên nhân | File / cách sửa | Xác minh / trạng thái |
| --- | --- | --- | --- |
| AUD-015 / P2 UX | Re-order/xóa/khôi phục/refresh sau lần đầu/export/cleanup không có pending feedback; save bài chỉ làm mờ form, chủ đề/login chỉ disable nút. Người dùng khó phân biệt đã gửi hay chưa. Trong QA, indicator ở đầu content còn có thể nằm ngoài viewport khi cuộn tới nút lưu | `pending.js` + `pending-task.js`: pulse/live label, gate một task, clear trong finally/reset. `main.js`: status tồn tại qua render, khóa controls và chặn read chen giữa write/refresh cuối. Post/section/auth đặt pulse trong sticky heading, autosave inline; media/quota có nhãn tải phù hợp; CSS reduced motion. Giữ các guard chống mất nháp/Auth cũ | **FIXED**, 30 unit PASS; 3 regression mới cho duplicate/failure/retry/reset + late completion. QA-A16 kiểm pulse giữ-response, lỗi mở khóa, CRUD, file validation, viewport 360–1440 và SIGNED_OUT bằng transport/Auth mock; File/IndexedDB thật, 0 Supabase live. Ảnh sticky header được chụp sau sửa vị trí |

Đồng bộ SPEC R14, ARCHITECTURE, STATUS, TESTING và QA_REPORT. Không thêm dependency, request/polling hay artificial minimum delay; không đổi schema/RLS/Auth server. Pulse phản ánh Promise đang chờ, không bảo đảm backend thành công; chỉ báo kết quả theo response như luồng hiện có. Các gate backend/Safari/thiết bị thật và reduced-motion ở OS vẫn chưa nghiệm thu riêng.

## 2026-10-24 — giữ phiên và kiểm tra quyền sau reload (AUD-016)

Baseline `b24acc19648badfbcfc641ce88555b2000d95678`, branch `enhancement/acceptance-refinements`; nguyên nhân đã có trên `develop` tại `ad8c78c`, không phát sinh từ pulse/loading. D07 từng chọn phiên memory; yêu cầu mới giữ đăng nhập qua F5 được ghi trong SPEC R08.1 và D09. Thay đổi source/docs nằm trên cùng branch; không sửa develop/main, không đổi Auth server/RLS/Storage hay deploy.

| ID / mức độ | Điều kiện / nguyên nhân | File / cách sửa | Regression / trạng thái |
| --- | --- | --- | --- |
| AUD-016 / P2 | Đăng nhập admin rồi F5 trở thành khách: client persistSession=false; bootstrap chỉ refresh board, không khôi phục và xác minh quyền. Bật persistence mặc định một mình vừa không sửa UI vừa lưu token vào localStorage | `auth-session.js` + `client.js`: SDK sessionStorage/key theo tab, memory fallback, không localStorage/BroadcastChannel chung giữa tab độc lập. `main.js`: bootstrap getSession → getUser server → active admin profile; khóa read/UI khi đang kiểm tra/lỗi, retry, generation chặn kết quả sau SIGNED_OUT. `components/auth.js`: thông báo phạm vi phiên/fallback. Audit fixture bổ sung getSession mock; fixture session mới dùng SDK/storage thật và transport giả | **FIXED trong source/offline**. 35/35 unit PASS (5 test mới gồm SDK restore/refresh-expired/logout/tab isolation và deny cases). QA-A18 browser PASS: form/login/reload/logout, pending verification/SIGNED_OUT/late response, revoked admin, failure/retry, blocked storage, tab độc lập và form iframe360. Auth/JWT/RLS/Storage thật **NOT RUN** |

Check/build PASS. Prettier nội dung toàn code PASS với EOL auto; gate nguyên bản FAIL ở 32 file không sửa do CRLF checkout Windows, không trộn format-only. Không có request Supabase thật, không thêm dependency hoặc dịch vụ trả phí. Giới hạn XSS, browser restore/duplicate, cross-tab logout và token expiry ghi tại SECURITY; không tuyên bố bảo mật backend đã nghiệm thu từ mock. Bằng chứng, ảnh và bước chạy lại: [QA-A18](QA_REPORT.md#auth-reload-2026-10-24), [TESTING](TESTING.md#phiên-qua-reload--aud-016).

## 2026-10-24–25 — điều hướng bảng nhiều chủ đề (AUD-017)

Baseline `ff8c5678c5a07c71456e38383294f7bdb1317c93`, branch `enhancement/acceptance-refinements`. Source triển khai 2026-10-24; tiếp tục phần tài liệu/kiểm chứng bị ngắt và chạy lại ngày 2026-10-25. Người dùng chấp nhận thiết kế với giới hạn: không “Đi đến”, giữ UI/màu hiện tại; gom test và ignore output local. Không đổi develop/main, schema/RLS/Auth server hoặc deploy.

| ID / mức độ | Điều kiện / nguyên nhân | File / cách sửa | Regression / trạng thái |
| --- | --- | --- | --- |
| AUD-017 / P2 UX | Board nhiều cột overflow nhưng scrollbar nằm sau cột dài; create chỉ refresh, không giữ anchor/đưa cột vừa tạo vào tầm nhìn. Focus reveal trước khi mở khóa còn bị inert pending chặn | `board-navigation.js`: native top scrollbar/step buttons sticky, sync có guard không ngắt smooth scroll, cleanup ResizeObserver/listener/frame, anchor theo ID+offset. `board.js` gắn section ID. `main.js` giữ anchor, snapshot create supersede read cũ, reveal/focus sau unlock. `section-editor.js` chuyển ID trả từ save và không che read failure bằng success toast. CSS giữ palette/button/layout. Test/fixture ở tests; tests/local được Git/Prettier ignore | **FIXED trong source/offline**; 38 unit/check/build PASS khi chạy lại. Ma trận nghiệm thu browser, format và giới hạn tại QA-A19. Backend/thiết bị thật NOT RUN |

Giữ các regression Auth có sẵn trong working tree, không đưa ảnh/log local vào Git hoặc xóa evidence đã tracked. Hợp đồng tại SPEC R05.2 / D10; bước chạy lại: [TESTING](TESTING.md#điều-hướng-nhiều-chủ-đề--aud-017), [QA-A19](QA_REPORT.md#board-navigation-2026-10-25). Không thêm dependency/dịch vụ trả phí, không dùng mock làm bằng chứng backend thật. Gate format giữ nguyên cấu hình; khác biệt CRLF checkout được ghi riêng trong QA_REPORT.

## 2026-10-26 — CP01-B1 implementation review

Branch `feature/personal-gradebook`, baseline `48ae91b`. No pre-existing production Gradebook bug is asserted: feature code did not exist at baseline. This entry traces defects caught and corrected before publishing B1, not backend acceptance.

| ID / severity | Condition / cause | Correction | Evidence / status |
| --- | --- | --- | --- |
| GB-B1-001 / P3 | Initial tuple draft used Array.map, which skips sparse elements and could collapse a missing scalar into an absent field | `canonical.js` rejects holes/undefined before framing; record prefix requires explicit key count and presence marker in §8.2 order | FIXED before commit; regression covers sparse tuple, null vs empty, malformed presence-vector keys. 37 B1 / 78 total offline tests PASS |

No change to existing board behavior or migrations, no Supabase request, key provisioning, UI, PR, merge or deployment. Full DB snapshot canonicalization/concurrency, JWT/RLS and crypto acceptance remain B3/B4/CP01-C NOT RUN. B2–B5 NOT STARTED; real-data gate NOT RUN.

## 2026-10-26 — B1 review corrections / positional imports

Baseline local/remote `f810f03ab8f101607553d73c19438c7fff14689a`, branch `feature/personal-gradebook`, clean before edits. The commit containing these entries is the fix trace. These were confirmed utility/spec issues, not observed production data corruption.

| ID / severity or decision | Original problem / root cause | Files / correction | Regression / actual evidence / status |
| --- | --- | --- | --- |
| GB-B1-REV-001 / P3 | Raw UTF-16 length checked before trim rejects valid padded names, and disagrees with PostgreSQL character length for supplementary Unicode | `imports.js`: bound raw input at 4096 UTF-16 units, reject malformed Unicode/NUL, trim, then count ≤200 Unicode code points. Empty/absent intent still preserves stored names. Design/DATA/checkpoints aligned | FIXED. Named regression: exactly 200 ASCII/supplementary characters, padded 200 accepted, 201 rejected, malformed/NUL/oversize/type denied; canonical trim equivalence and blank/absent preserved. Offline only |
| GB-B1-REV-002 / P3 | `row === index+2` incorrectly equates source positions with dense batch indexes | `imports.js`: safe integers ≥2 in strictly increasing order, original positions retained, no sort/placeholder allocation; same 2000-data-row cap. Cell errors attach original row/physical column. Future parser may skip wholly empty rows only | FIXED. Named regression: 2/3/4, 2/4/7, 2/100/101 and safe large gaps; duplicate/descending/row1/negative/fraction/string/unsafe values denied; row changes alter canonical input. Full parser behavior DEFERRED CP03/CP04 |
| GB-B1-REV-003 / user-approved contract change | Exact header equality and planned display-label score keys prevented custom/duplicate headings | `imports.js`: width 2/3 selects layout, positionalRosterRow maps dense cells to stable DTO keys; headers are bounded ordered text only. BRIEF V1.2, DATA, design, checkpoints, README, DECISIONS/STATUS align score array D–J and customizable headers. UI/catalog labels unchanged | B1 mapping + design FIXED; full CSV/XLSX/ten-column score importer/preview UI DEFERRED CP03/CP04. Regression proves custom/duplicate/blank labels, distinct width2/3, wrong widths/holes/extra/missing cells denied and canonical binding retained |

Baseline differential replay confirms f810f03 rejects padded valid names, source-row gaps and custom headers while corrected code accepts them (synthetic/offline). Verification after correction: `npm ci`, `npm run check`, `npm test` (**81/81 PASS: 40 B1 + 41 existing**), `npm run build`, `npm run format:check`, `git diff --check` PASS locally. No dependency change, no live Supabase calls or backend write, no UI/migration/Function/PR/merge/deploy. GitHub CI on the correction commit NOT RUN. B2–B5 NOT STARTED; CP01-C and real-data gate NOT RUN. Preview mapping warning is a future requirement, not UI evidence; semantically swapped valid score columns cannot always be detected.

## 2026-10-26 — B2 draft review and test corrections

Baseline `282bebc89f630fe773c016c0ec7bb94b7681143e`, `feature/personal-gradebook`; commit containing this entry is the draft trace. No existing production Gradebook bug is asserted.

| ID / type | Evidence / original issue | Correction / files | Verification / status |
| --- | --- | --- | --- |
| GB-B2-001 / design alignment | Earlier §3.4 scale(score) proposal rejected trailing-zero representations; newer B2 task requires DB meaningful precision and separate lexical validation | New migration uses unconstrained NUMERIC, range and scale(trim_scale(score))≤5; CP01 design/review explain 8.123450 may pass DB while B1/B3/B4 must reject its lexical input | RESOLVED in draft/design, not hosted fix. Disposable SQL accepts exact equivalents and rejects meaningful sixth-place/range/NaN/infinities; native17/API NOT RUN |
| GB-B2-002 / P3 test | Initial snapshot assertion counted new expected Gradebook FK bookkeeping on auth.users as modification of old triggers; SQLSTATE expectation assumed only 23503 although PG18 RESTRICT can return 23001 | `tests/gradebook-b2-sql.mjs` excludes only new Gradebook-owned FK bookkeeping, retains comparison of old objects/ACL/defaults/policies/functions/triggers; accepts both FK restriction states | FIXED before commit. Final standalone 18/18 groups PASS, including inherited-privilege transaction rollback and synthetic audit compatibility |
| GB-B2-003 / P3 draft | Plain PostgreSQL btrim in the first draft only removed ASCII spaces, leaving a mismatch with accepted B1 Unicode trim for student names | New migration full_name CHECK uses the explicit ECMAScript trim whitespace set and char_length; no silent normalization in DB | FIXED before commit. 200 supplementary characters accepted, 201 rejected, NBSP-surrounded name rejected by actual disposable SQL; B3/B4 still normalize before writing |

Actual evidence: local PGlite 0.5.11/PostgreSQL18.6 WASM, synthetic Auth/Storage + four real old migration files; 81 app offline tests/check/build/format/diff PASS, npm ci PASS. No application/dependency/old migration change. Native17/hosted Auth/JWT/RLS/API/Storage/advisors/concurrency NOT RUN. No hosted SQL or config operation; no migration apply, PR, deploy or merge. B3–B5 NOT STARTED, CP01-C/real-data gate NOT RUN. See [B2 review](features/personal-gradebook/B2_MIGRATION_REVIEW.md) for boundaries and CLI telemetry rejection; it was not retried/bypassed.

## 2026-10-26 — B3 draft corrections

Baseline `d86627f`, feature/personal-gradebook; commit containing this entry is trace. No production Gradebook bug asserted.

- **GB-B3-001 / P2 draft / FIXED:** planner ORDER BY key conflicted with PL/pgSQL key variable, and apply ON CONFLICT semester conflicted with parameter. Actual disposable SQL raised42702. New migration planner qualifies jsonb_each alias; score apply uses named composite PK constraint. Regression14/14 B3 groups includes score insert/update, stale/invalid batch and forced audit rollback. No accepted B2 file changed. Native17/concurrency NOT RUN.
- **GB-B3-002 / P3 draft / FIXED:** initial pair-check draft selected the active class implicitly despite approved class-scoped HMAC protocol. RPC now receives explicit cid and checks class/key/active state after shared lock. SQL regression checks neutral inactive/mismatch and context. B4 must supply verified/derived class context; no crypto authentication is claimed.

Verification: PGlite0.5.11/PostgreSQL18.6, synthetic bootstrap + actual migration chain, 14 B3 and18 B2 groups PASS; 81 app tests/check/build/format/diff PASS. B4/B5 NOT STARTED; real-data/hosted/native17/security/concurrency NOT RUN. No hosted changes or deploy/merge.

## 2026-10-26 — GB-OPS-001 / P1: PostgREST retry storm (hosted fix BLOCKED)

Baseline `95a9b8b`, feature/personal-gradebook. Live log sample at 03:39:35 UTC identifies PostgREST14.18, authenticator, public.reorder_posts, SQLSTATE40001, PID131961. Its session started 2026-10-24 14:39:53.446988 UTC. A targeted activity read confirmed that backend active. Do not assume a future PID131961 still denotes that session.

Root cause: existing board RPC uses retryable serialization_failure for an ordinary stale-version conflict. Supabase documents PostgREST14 infinite transaction retry for that code. Closing the caller/browser does not necessarily stop the in-flight backend. Prior explanation limited to stale frontend state was incomplete. save_post has the same misuse; unhosted B3 draft also contains application40001 and must not be applied without a follow-up correction. Source of the original initiating request was NOT established; backend process identity does not identify its client.

Prepared additive `20261026040000_stop_business_conflict_retries.sql`: replace only custom40001 with PT409 in the two exact board RPC signatures via CREATE OR REPLACE; preserve logic, ownership, grants, tables and data. All old migrations unchanged. No Gradebook schema/migration apply is included. Disposable `tests/business-conflict-sql.mjs` verifies both stale rejection paths produce PT409, no row mutation, original ACL and safe replay. PASS; no live reproducer/stress/API smoke performed. One malformed logs query and one forbidden wildcard query failed while discovering the logs schema; subsequent bounded log sample succeeded.

Status: FIX PREPARED / HOSTED BLOCKED. Automatic approval review rejected both the hosted migration and separately targeted termination of confirmed looping backend, citing earlier no-hosted-change restriction and missing explicit permission to terminate that process. Neither action executed. Need explicit user authorization for this board-only hotfix and guarded termination; no bypass via raw DDL/restart. Hosted outcome/traffic reduction NOT VERIFIED. Official reference: https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions

### GB-OPS-001 follow-up — APPLIED / 2026-10-26

After explicit authorization, terminated only the exact known backend131961/session-start pair; returned true and subsequent existence check false. Later user authorized fixing hosted with minimal backend testing. Applied only board hotfix via apply_migration, success=true; actual version20261026034549. Renamed draft migration to `20261026034549_stop_business_conflict_retries.sql` to match hosted ledger, unchanged SQL. Updated focused local test's file path.

Two bounded metadata reads after apply (first multi-statement result returned only its last SELECT) verify both signatures have no40001 and PT409 present; owner postgres, invoker/search_path and browser ACL as expected. No hosted business RPC invocation or stress testing. Previous local regression PASS covers stale reorder/save, zero writes, unchanged ACL and repeatability. No new runtime tests needed for filename/docs-only follow-up. Status FIXED for hosted board conflict-code defect; not evidence that all possible errors/traffic stopped. Original initiating client remains unknown. B3 draft analogous40001 risk still OPEN / must correct before Gradebook apply.

## 2026-10-26 — B3 non-retryable conflict correction

Baseline `13292a3c37c3a1c237c584fd0251db992596ba06`, branch feature/personal-gradebook; the commit containing this entry is the fix trace. No new hosted incident is asserted.

| Finding / severity | Root cause and affected paths | Correction / files | Evidence / status |
| --- | --- | --- | --- |
| GB-B3-REV-003 / P1 | Eight custom40001 RAISE paths incorrectly label business conflicts as transient serialization failures: gb_class_patch, gb_semester_set, gb_student_patch/status/delete, gb_score_put/delete, gradebook.import_run; original B3 lines111/125/192/219/233/248/265/366 | Additive20261026050000 migration, eight exact signatures and original/corrected source-body hash guards; PT409 only, unchanged locks/conditions/signatures/owner/ACL/rollback. Original B3 and applied migrations unchanged; stale test predicates corrected | FIXED in forward draft chain / NOT DEPLOYED. Focused SQL13/13 groups PASS; all paths return PT409 with state+audit unchanged, valid writes/no-op, metadata/effective ACL, guard rejection and replay verified. Hosted integration NOT RUN |
| GB-B3-REV-004 / P3 feedback | dom.errorMessage recognized only legacy40001, making PT409 fall through to generic feedback | src/utils/dom.js adds exact PT409 branch with fixed Vietnamese reload message; no diagnostics or retry/refresh. tests/dom.test.js retains unrelated/unknown/legacy behavior | FIXED local;4/4 focused DOM tests PASS. Browser/hosting deployment NOT RUN |
| GB-OPS-REV-002 / P2 rollout | Recorded board hotfix20261026034549 applied while earlier B2/B3 versions remain drafts; all-pending workflow could accidentally deploy them | DATABASE inventory and explicit authorized B2→B3→correction dependency plan, no traffic until correction/security gates; prohibit uncontrolled db push/reset/repair/apply. Correct stale board error-code/four-migration statements; update B3 review/STATUS/CHECKPOINTS | RESOLVED as documentation/process correction; actual rollout/ledger reconciliation NOT RUN and requires separate authorization/budget. No ledger repair or hosted request |
| GB-B3-REV-005 / P3 test compatibility | Broad B3 runner compared board snapshot before B3 against end-of-chain after intentional board hotfix | tests/gradebook-b3-sql.mjs compares immediately before/after original B3 only; later correction changes Gradebook bodies, not board. Tighten stale code predicates to PT409 | FIXED source; targeted syntax/format/static review only, full B3 runner NOT RUN. Focused runner proves corrected chain and unchanged board conflict definitions |

Testing policy GB-OPS-REV-003 already RESOLVED in13292a3, unchanged. One focused SQL run on existing PGlite0.5.11/PostgreSQL18.6 with synthetic fixture; one DOM test run. No new dependency/runtime, full suite/build, stress/load/soak/stretch, hosted RPC/log/metadata/DDL, deploy, merge/rebase or B4. Hosted requests0 / migration applyNO. Native17/multi-connection/hosted security and real-data gate NOT RUN. The original custom40001 text remains in immutable history; final corrected function bodies contain none. Exact behavior against PostgREST is not claimed from PGlite.

## 2026-10-29 — AI-UI-001–006 / F01–F06

Baseline ai-learning-assistant989ec35e552310f8131906782a6d3b70927a1366. AI-UI-001/P2:
preview captured a removed source button; Chromium returned BODY focus. Synchronous assistant
removal and launcher focus before callback correct the target; explicit modal boundary wrapping
fixes observed Tab escape. AI-UI-002/P2: always-expanded mobile controls pushed composer beyond
375px viewport; compact/collapsible CSS restores reachable composer and transcript scroll.
AI-UI-003/P2: meaningful secondary copy10–11px; scoped13px copy,44px actions and visible focus.
AI-UI-004/P2: captured disclosure survived cloud failure; live status and consent text now follow
availability. AI-UI-005/P1: lexical results passed raw query to substring search; validated public
source IDs now form a memory-only filter. AI-UI-006/P2: assistant state left stale persisted keys;
clear query/topic on temporary actions, ignore stale input debounce and retain manual persistence.
Files: component, stylesheet, main and assistant utils; pure tests updated. Chromium baseline/
after and eight viewport tests, synthetic main persistence, cloud failure/cancel/revocation and
offline131+19 checks PASS. Details/remaining gates: [execution record](features/board-assistant/UI_FIX_EXECPLAN.md).
No Worker/Gradebook/Supabase/schema changes; hosted requests0. Live AI and native mobile NOT RUN.

## 2026-10-29 — AI-V2-001 / P2: stale source context after same-ID content change

V2 baseline50ea1cb, feature checkpointbf99afb. Context IDs alone could remain valid after a body
change in the same open synthetic modal. Compare the full public projection against catalogAtOpen
before sending; invalidate the modal/context when changed. Main Board already invalidates on refresh.
Additional Chromium probe changed body with the same ID then submitted follow-up: dialog removed,
no follow-up transmitted (PASS). Source-action and post-response fingerprint checks retained.
Related correction: stale canceled-request catch must check ownership before clearing newer context.
No hosted calls; [V2 acceptance](features/board-assistant/V2_ACCEPTANCE.md).

## 2026-10-29 — AI-V2-002–006 / correction V2-F01–F05

Baseline cee8e1dffd8fccfe94d8f9b7becae34ee9226806, cùng nhánh V2; dữ liệu synthetic.

- AI-V2-002/P2: showResults luôn tạo filter với sources[]; component chỉ render sau source validation
  và khác rỗng, resolver cũng từ chối empty IDs. Browser metadata/insufficient/keyword-zero/invalid
  không có filter; source hợp lệ vẫn mở/lọc và trả focus (PASS).
- AI-V2-003/P2: routing bỏ sót website inventory và có thể nhầm câu hỏi nội dung. Nhóm tín hiệu
  website/inventory/listing/specific/follow-up, normalize dấu câu/space; bảng positive/negative
  và6 viewport câu hỏi tự nhiên PASS, không thêm classifier/model call.
- AI-V2-004/P3: profile dùng KHTN8 Board thay tên sản phẩm. websiteProfile.name dùng Vui học cùng
  cô Quỳnh; pure test đối chiếu index.html đã đúng, browser xác nhận; giữ technical IDs/lịch sử.
- AI-V2-005/P2: Worker gọi BGE rồi bỏ vectors ở follow-up. Context hợp lệ cấp candidates trực tiếp
  rồi chỉ Qwen; test model list/header/candidate scope xác nhận1 call, query mới2 calls.
- AI-V2-006/P2: cap4 V1 thiếu accounting dự phòng. Cap3 bảo thủ, count/stopped không migration/reset;
  state3/4/stopped/corrupt/null đều không mở allowance. Serialized last-slot/restart/failure/abort/
  deadline PASS;22 specialist bị tác động PASS sau lần siết corrupt-state cuối.

Cải tiến trực tiếp: API V2 xử lý metadata deterministic trước budget; transport xác minh lại profile
không phụ thuộc thứ tự JSON keys. Regression bắt lỗi key-order39/40 rồi được sửa; không bỏ assertion.
[Acceptance hiện tại](features/board-assistant/V2_ACCEPTANCE.md): final131+40 PASS, Chromium6 V2/8 V1,
actual-main persistence PASS; hosted0/40/BLOCKED, không Supabase/deploy/merge.

### AI-V2-004 — bổ sung chuẩn phạm vi web theo chỉ đạo chủ sở hữu

Không suy sản phẩm là web KHTN8 từ seed/brief cũ. websiteProfile giờ mô tả web quản lý lớp online,
đối tượng giáo viên/người quản lý lớp/học sinh và các ứng dụng thấy trong app.js/site-navigation/
Gradebook UI. Không sửa logic Gradebook/Auth; inventory chỉ đếm Board published, không private
counts. PRODUCT_PROFILE/README/OVERVIEW/SPEC chuẩn hóa cùng hợp đồng; evidence lịch sử giữ nguyên.
Regression purpose/audience/apps/privacy và browser identity kiểm chứng lại; current assistant41.

## 2026-10-29 — AI-V2-007–012 / Gate A/B public content grounding

Baseline01198f0b8e1b298101d1ee8405ec988b507db109, cùng nhánh V2. Tất cả evidence synthetic/offline.

- AI-V2-007/P2: corpus dùng preview1200 và cloud availability dựa cap24 nên không truy xuất đúng
  văn bản sâu/bài ngoài cap. Corpus full published + local chunks/coverage, wire V3 bounded và native
  citation mapping thay luồng này; U08/U09 quote7 đơn vị sau1200 và bài sau30 filler PASS. Consent/copy
  được cập nhật đúng selected public text + prior source context, không chỉ title/description.
- AI-V2-008/P2: app/inventory deterministic có thể nuốt câu hỏi nội dung hoặc “bao nhiêu” trong bài.
  Routing chỉ định guidance/count/listing rõ; câu hỏi arbitrary post/topic/quantities dùng retrieval.
  Gate A43/43 và routing regression PASS, không thêm topic whitelist.
- AI-V2-009/P2: lexical overlap ngẫu nhiên loại paraphrase trước semantic; keyword fallback lại đưa
  nguồn chỉ trùng âm tiết vào filter. Corpus nhỏ giữ semantic candidates, keyword yêu cầu match đủ
  tín hiệu; IDF/diversity hỗ trợ corpus lớn, no-anchor clarify. Browser assertion đúng filter deep ID
  được giữ và PASS sau sửa; không tuyên bố full semantic coverage.
- AI-V2-010/P2: marker “hủy” không có word boundary có thể khớp “chuyến”, làm lọt answer bỏ cảnh báo.
  Bổ sung exact boundary và typed date/numeric guards: missing-year, creation-vs-event, deadline-vs-event,
  cancellation/revision, unknown end/latest scope. T01–T10/integration PASS; không coi guard là entailment proof.
- AI-V2-011/P2: chunk UTF-16 có thể cắt surrogate pair, metadata cap có thể cắt im lặng. Giữ exact
  Unicode quotes/body codepoints và offsets, metadata oversized giữ local nguyên vẹn rồi báo partial;
  không prefix-index corpus quá bound. Unicode/oversized regressions PASS. Prompt bỏ duplicated body,
  có24KB byte cap và bounded temporal annotations, giữ raw passage; boundary regression PASS.
- AI-V2-012/P2: native Escape đóng modal trước queued close callback; embedding release có thể bắt
  đầu Qwen khi chưa abort. Abort đồng bộ trên native cancel và nút đóng; không preventDefault Escape.
  Browser release ngay sau Escape xác nhận1 embedding/0 Qwen, không resurrect DOM; callback ownership
  và preview return-focus giữ nguyên. Đây là regression cost/reliability đã được runtime tái hiện/sửa.

Gate A43/43 trước B; final95/95 focused,131/131 curated checkpoint, check/build/format/exclusion/diff
PASS; actual Chromium B6, V2 guidance6, V1 8 và actual-main Board persistence PASS. Các lần FAIL đều
được sửa và rerun affected tests, không bỏ assertion. Format test baseline được commit riêng9ed2082.
[Ma trận/evidence/limitations](features/board-assistant/GATE_AB_ACCEPTANCE.md). Hosted/DO/deploy/
Supabase0, allowance/run ID/PRODUCT_PROFILE/Auth/Gradebook/schema không đổi. Gate C/D chưa thực hiện.
