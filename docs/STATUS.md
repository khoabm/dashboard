# Learning Assistant V2 — local acceptance / 2026-10-29

Baseline50ea1cb (PR18 included), dedicated feature/ai-learning-assistant-v2-e2e. Implemented
deterministic website facts/inventory, generated-answer contract, bounded follow-up source context,
state ownership/privacy validation and readable answer rendering. Curated131/131 + assistant33/33,
check/build/exclusions/format PASS; actual Chromium6 V2 +8 V1 viewport regressions and synthetic
actual-main filter persistence PASS. [Acceptance/evidence](features/board-assistant/V2_ACCEPTANCE.md).
Overall PARTIAL: live Cloudflare access/quota/model quality BLOCKED, all hosted counters0; no
Worker/website deployment, Supabase call or Gradebook/Auth/schema change. Public provenance/abuse
gates remain blocked; GitHub API Forbidden may prevent Draft PR. Historical records follow.

---

# Board Assistant F01–F06 corrective QA — 2026-10-29

Source989ec35; task fix/board-assistant-ui-e2e-20261029. Focus, short-height layout,
readability, cloud disclosure, source-ID filters and persistence corrected.
Offline131 curated +19 assistant PASS; actual Chromium synthetic viewport/interaction and
main.js filter persistence PASS. [Evidence and limitations](features/board-assistant/UI_FIX_EXECPLAN.md).
Cloudflare pilot BLOCKED (quota/cap prerequisites); hosted Cloudflare/Supabase requests0.
No Worker/Gradebook changes or deploy. Native zoom/mobile/Safari NOT RUN. GitHub API Forbidden;
Draft PR creation depends on access. Overall PARTIAL, not full E2E acceptance. Older results below
remain historical and do not establish current hosted acceptance.

---

# Board Assistant MVP — synthetic E2E accepted / 2026-10-29

Delivery branch `ai-learning-assistant`, baseline `develop` / `4f254961e9fa3604e8e843e3c5f63a15f2e9edc7`.
Owner authorized commit/push to this branch only after E2E; publication SHA/remote receipt belongs
to the delivery report. Commit prefix `[CF-Pages-Skip]` prevents Pages deployment; no merge/main change.
Chat UI, hybrid BGE-M3 retrieval, Qwen source-ID selection with server-derived
excerpts and explicit read-only Board actions implemented. Final approved hosted run3 **4/4
HTTP200**; prior run1/run2 failures and per-activity budgets retained in [evidence](features/board-assistant/README.md).
Offline pure/Worker/transport latest results18/18; actual local workerd/SQLite allowance PASS;
curated131/131, syntax/scoped format/build/exclusions PASS. Chrome desktop/mobile synthetic QA
PASS within recorded scope; physical devices/Safari, broad retrieval benchmark and real-content
acceptance NOT RUN. Worker final disabled version `2fe4ac69-1355-452d-906b-9c1ebec9e0c8`;
frontend AI default off. No website deployment, main/AGENTS change, paid plan/card/trial/credits,
Supabase test calls or Gradebook changes. Existing owner tabs/background traffic not measured.
Prior project/Gradebook release gates remain unchanged. Earlier records below are historical.

---

# G07-3 — Synthetic offline tooling accepted / 2026-10-28

`develop` starting HEAD `8cbe298` (PR #5 merged at `6a0daf3`). Staged production exporter/authenticator/verifier implemented: actual age1.3.2 + local PG17.11 source snapshot/archive decode, 36 core cases +4 final focused cases PASS; actual restore NOT RUN. [Contract, exact commands, failed attempts, limits and finite G07-4 handoff](features/personal-gradebook/G07_PRODUCTION_TOOLING.md). Build/exclusion PASS; no runtime/frontend/migration/dependency/CI-policy changes. **G07 Technical PASS retained; G07 Operational/Overall PARTIAL; G07-4 NOT STARTED; G08 BLOCKED; deployment NOT RUN.** A–F and accepted owner Drive PASS retained, no repeated Drive/UI/recovery suite. Production secure key acquisition, paper/replacement-device custody, independently authorized isolated restore and managed-service evidence remain open. Hosted Supabase/Drive requests0; no production keys/PII/rotation/main merge/deploy. The dated records below are historical.

---

# CP07 code finalization and G08 data handoff — 2026-10-28

**CODE REVIEW PASS / MERGE DECISION PENDING / PRODUCTION NOT APPROVED.** PR #10 UI E2E/loader merged intact as `6754e00f654721e8f1bbba2b405029ea1e7ce293`; PR #5 is Ready for review → `develop`, not merged. Exact-source GitHub Actions [run 40683942523](https://github.com/khoabm/dashboard/actions/runs/40683942523) PASS: 131/131 curated tests, check/build/Prettier and production exclusions. [Independent CP07 review](https://github.com/khoabm/dashboard/pull/5#pullrequestreview-5682738845) found no new confirmed P1/P2 within source scope. Final Chrome UI/hosted Auth E2E remains PARTIAL/BLOCKED; CP01-C overall PARTIAL; G07 Operational PARTIAL and G08 institutional/release evidence BLOCKED. This code outcome does not approve real-data use.

**Next sequence:** complete CP07 docs/review → explicit PR #5 merge into develop with feature disabled by default → satisfy G07 operational prerequisites → at G08 obtain owner-supplied reference dataset via approved private workflow and test authorized data scope → deployment and production smoke after separate release checks. **No dataset is requested now.** Older records below are retained as historical snapshots and do not override this status.

---

# Unified loading UX — 2026-10-28

**PR10 integration review:** user authorized merge into `feature/personal-gradebook` only. Exact base1378455/headc01f9a9: all23 files reviewed, base ancestor, no conflicts/base-code loss; UI-QA-001 corrects two existing synthetic fixture review findings. [Review, minimal verification and retained limits](features/personal-gradebook/UI_E2E_REVIEW.md#pr10-merge-review-correction--2026-10-28). No source business/Auth/API/migration change. GitHub Actions/status absent at reviewed head (feature-base workflow filters); previous offline evidence retained. Merge result must be verified through GitHub after integration; the no-merge/Draft statements below describe earlier execution. No deploy; PR5 unchanged; UI/hosted acceptance remains partial.

**IMPLEMENTED / UI ACCEPTANCE PARTIAL.** Branch `feature/personal-gradebook-ui-e2e`, baseline `cfcdaa1`. L01–L14 reuse PulseIndicator for route/header/logout/admin/teacher/import/student/chart stages; L15–L19 preserve existing Board/media/quota/editor/Auth/section feedback. [Concern matrix, exact checks and limits](features/personal-gradebook/LOADING_UX_REVIEW.md). Existing cancellation/session/mutation contracts retained; no services/backend/dependency change. Curated129/131 initially; two new DOM-stub failures corrected, affected6/6 PASS; static/build/scoped format PASS. Separate format-only prerequisite45f8ec4 fixes existing birthday-expression formatting with semantic AST equality; canonical LF source116/116 format PASS. Direct full CLI check remains FAIL due to untouched CRLF checkout files. User Chrome QA BLOCKED by native URL-policy detection; budgeted20-request read-only sequence NOT STARTED. Agent-issued hosted tests0; existing tab background/HMR total unmeasured. PR10 Draft, no merge/deploy. Prior backend/real-data gates unchanged.

---

# Gradebook verification clock correction — 2026-10-28

Owner diagnostics identified the verification expiry ceiling rejecting HTTP 200 with 660721 ms remaining. Client-only bounded clock tolerance now caps local capability retention at 10 minutes; server authorization is unchanged. Offline full transport-to-state regression with unpublished semesters PASS; focused43/43, check and build/exclusions PASS. Owner browser/hosted retest pending; no functional E2E completion claim. Hosted calls/writes/deployments0. [Root cause and evidence](BUG_FIX_LOG.md#2026-10-28--gb-verify-clock-001--p1-http-200-rejected-by-client-expiry-ceiling-fixed-owner-retest-pending). G07 distinctions unchanged, G08 BLOCKED; PR5 remains Draft.

---

# V1 hosted reachability — 2026-10-28

One authorized14-second anonymous probe returned HTTP401 in8.379s (TLS milestone7.752s); the old8-second timeout is not proof of an Edge defect. Both Functions ACTIVE v2; no request-ID correlation confirms old handler arrival. [Exact timing, bounded logs, matrix and minimal owner localhost UAT](features/personal-gradebook/V1_INTEGRATION_UAT.md). Managed terminal.local differs from the accepted localhost origin: authenticated browser E2E remains BLOCKED; no runtime correction justified. Five connector reads/one HTTP request/zero retries, data writes, DB SQL, Auth attempts, deploys or new CI requests. Source unchanged; default transport disabled. PR5 Draft. G07 Technical/local/Drive PASS retained, Operational/Overall PARTIAL; conditional owner project authorization retained, G08 institutional evidence BLOCKED. Earlier snapshots below are historical.

---

# G07 owner synthetic rehearsal — 2026-10-28

Owner-reported Windows local and manual Drive round-trip PASS (baseline0679367); [evidence and limitations](features/personal-gradebook/G07_OWNER_REHEARSAL_20261028.md). Receipts local/remote PASS, database recovery NOT_RUN. Phone notes are not physical paper custody; paper/replacement-device/owner native PostgreSQL restore NOT RUN; production exporter/validator and G08 BLOCKED. Technical PASS retained; Operational/Overall PARTIAL. New stderr/ACL correction is documentation only, Windows NOT RUN for corrected snippet. Work owner-device/Drive/Supabase/key/data access0, new CI0, no merge/deploy. Earlier entries below are historical.

---

# G07 manual operational readiness — 2026-10-28

Approved A–F replaces USB/emergency/daily/RPO proposals: personal private Drive only, sole owner, independent age identities/paper custody, manual triggers, latest+previous verified. [Policy/manual guide](features/personal-gradebook/G07_OWNER_DECISIONS.md). Technical PASS retained from910ac0ae/run40623615581, no rerun. Operational PARTIAL/BLOCKED: owner physical custody/Drive round-trip/production exporter and G08 not verified. No transfer/hosted/real data/owner-local execution or new CI. Older entries below are historical.

---

# G07 recovery completion — 2026-10-28

G07 TECHNICAL PASS at910ac0ae, native17/age/ACL/RLS/negative recovery run40623615581 SUCCESS; operational BLOCKED—owner decisions, overall PARTIAL; G08 BLOCKED. Three authorized additional runs used; first two harness failures retained. Hosted Supabase/production-data/Drive operations0; artifacts0; cleanup PASS; no merge/deploy. [Evidence and owner package](features/personal-gradebook/G07_BACKUP_RECOVERY.md). Older entries below retain their baseline context.

---

# CP01-C G07/G08 — Recovery preparation / 2026-10-28

**G07 PARTIAL; operational custody BLOCKED. G08 BLOCKED / NOT APPROVED.** Baseline `beede03884c0e44995d25746bf5390e7bb4a6952`; cloud-only working branch `feature/cp01-c-g07-g08-recovery`. [Assessment, policy differences, custody, runbook, acceptance matrix and exact prior runs](features/personal-gradebook/G07_BACKUP_RECOVERY.md). New bounded synthetic-only age helper, offline failure/dry-run checks and a dedicated public standard Ubuntu/ephemeral PostgreSQL17 workflow are prepared. Actual checksum-pinned age1.3.2 offline execution PASS19 finite cases; no real dump/keyring or owner computer accessed. New age/native restore/ACL workflow **NOT RUN: GitHub push/execution approval pending**; prior Linux technical recovery evidence retained, never relabeled as new age evidence. [Owner/institution authorization package](features/personal-gradebook/G08_OWNER_AUTHORIZATION.md) covers all ten requested governance areas; no legal basis, retention, Drive destination or emergency custodian is self-approved.

Production code/encryption/migrations/dependencies and curated CI unchanged. Hosted Supabase requests0; real data/production-secret operations0; Drive writes/uploads0; GitHub writes/new Actions runs0 at preparation. Local cloud branch/commit only, no merge/deploy/activation. New run/log/artifact readback and operational independent custody remain open. Older dated entries below retain evidence for their recorded baselines.

---

# CP01-C — Cloud-only security verification / 2026-10-28

**Cloud technical scope PASS; full CP01-C PARTIAL; real data BLOCKED.** Starting9dd7da3, feature/personal-gradebook. Public standard Ubuntu24.04/$0 guard verified; disposable PostgreSQL17.6 B2/B3/PT409/reveal52 groups, four multi-connection races, limiter last-slot/fail-closed and fresh-process synthetic DB+four-keyring recovery PASS atafcb72f. Real disposable GoTrue/PostgREST+B4 HTTP non-admin/expired/forged/revoked session and signed-preview409 cases PASS at6269da1, with independent actual PostgREST PT409/zero-write proof added at7dbd000;47 runner-local HTTP calls in the final Auth run including startup/SDK traffic. [Exact runs, SHA boundaries, failed harness attempts and G01–G08 dispositions](features/personal-gradebook/CP06_OFFLINE_READINESS.md#cp01-c--cloud-only-security-verification--2026-10-28). Connections/recovery-only run ateb02ccc confirms actual-limiter-call/exact-restored-score assertions; final source7dbd000 Offline CI128/128/static/format/build SUCCESS. Final documentation-SHA CI is checked after publication.

G01/G03–G06 PASS within documented synthetic/native scope; G02 prior PASS retained. G07 technical recovery PASS, owner-controlled operational key/DB custody and permission-restoration acceptance BLOCKED; G08 BLOCKED/NOT APPROVED. No hosted Supabase requests, production secrets, owner installs, cache/artifact uploads, application/migration changes, deploy, merge or frontend activation. Browser QA N/A (no UI change); earlier accepted Chrome/G02 evidence retained. Dedicated owner-approved cloud specialist workflow is separate from unchanged curated test:ci; existing Offline CI npm cache upload disabled. Native Deno/deployed gateway not newly tested. PR5 Draft; CP07 NOT STARTED. Older entries below are historical evidence for their baselines.

---

# CP01-C — Final remaining-gate execution / 2026-10-28

**PARTIAL; real-data NOT APPROVED.** Baseline2435fcc, feature/personal-gradebook. Corrected test-SQL42702 assertion now PASS on native17 in rollback; application unchanged.13/13 bounded live capability/JWT-forgery cases PASS, including own-student isolation, signed expiry/tamper, semester continuity/republish, student and class epoch revocation. Real Chrome stale class.patch409 refused mutation and disabled replay; DB confirmed unchanged year/audit. Existing specialist fault/preview/timeout cases6/6 PASS offline. [G01–G08 dispositions, exact scope/accounting and missing prerequisites](features/personal-gradebook/CP06_OFFLINE_READINESS.md#cp01-c--final-security-gates--2026-10-28).

No new migration, Edge deployment, key rotation or production activation. REV-C01 corrected deployment/historical wording only. Native disposable17/concurrency/recovery, isolated real Auth contexts, live signed-preview cases and independent-connection authorization races remain BLOCKED/unverified; independent key+DB custody and real-data approvals remain open. Same2 synthetic students/5 scores, both semesters hidden; class epoch2/B epoch3/revision12, no Board/Auth data changed.9 SQL calls,13 direct Edge calls,1 log query;19 observed function HTTP events including browser preflights, not total upstream traffic. Source/test/CI policy unchanged; original default-disabled owner preview restored. PR5 Draft; CP07 NOT STARTED. Prior accepted evidence below is historical for its recorded baseline.

---

# CP01-C — bounded hosted integration / 2026-10-28

**PARTIAL — integration works with synthetic data; full security/real-data acceptance remains open.** Baselinea8f055e, feature/personal-gradebook. Free projectvgciiqtwmxcdqppntgnt / PostgreSQL17.11: four exact LF Gradebook migrations applied once under owner-approved MCP versions20261027173228/173300/173313/173327; five Board ledger entries preserved.9/9 effective correction hashes,22 service-only invoker RPCs and unchanged Board metadata fingerprint verified. Both Edge Functions ACTIVE v2 after narrow wildcard-config rejection; four synthetic test keyrings and environment origin localhost:4173 only, local DPAPI backup. No public frontend activation or real-data authorization.

Native role/precision/transaction cases PASS in2 rollback transactions; supplemental limiter/revocation assertion FAILED42702 in test SQL, no retry, INCONCLUSIVE. Real existing-Chrome4173 admin → class/student/reveal/catalog/score → CSV roster → XLSX score preview/apply → independent publish/unpublish and synthetic student verify/own grade/histogram PASS; responsive1440/768/390 no page overflow. Final state2 synthetic students/5 scores/both semesters hidden; no Board content mutation. Default-disabled build restored on localhost; revised lookup copy checked and returned to Board. [Case evidence, exact request accounting and remaining gates](features/personal-gradebook/CP06_OFFLINE_READINESS.md#cp01-c--bounded-hosted-acceptance--2026-10-28).

Focused static hash1/1 and CORS/config2/2 PASS; static/scoped scan, changed-code formatting, default build/exclusion PASS. Native local Deno/disposable17 unavailable; hosted bundling/native SQL are separate evidence. API deny/CORS cases PASS; peer/session-expiry/limiter-failure/concurrency/rotation-independent recovery remain NOT RUN/INCONCLUSIVE, real-data gate NOT RUN. Prior CP02–CP05/CP06-B offline acceptance preserved. CP07 NOT STARTED; PR5 remains Draft, no merge/public deployment. Exact-SHA CI outcome is checked after the feature-branch commit/push.

---

# CP06-B — OFFLINE ACCEPTED / 2026-10-27

Baseline `64b6e9248d2be7332a5378e54bc408364d10e549`, feature/personal-gradebook; independently reviewed and OFFLINE ACCEPTED; user approved feature-branch commit/push. Publication SHA and exact-SHA GitHub CI belong to the delivery report, not historical CI evidence. Shared opt-in transport plus teacher/admin/catalog and student verify/grades/histogram services are implemented. App reuses cached verified Board session; catalog gets current classId; private student projection gets verified context. Production activation remains absent/disabled, no successful synthetic fallback. [Contracts, focused evidence, Chrome QA and limits](features/personal-gradebook/CP06_OFFLINE_READINESS.md#cp06-b--frontend-integration--2026-10-27).

Focused16/16 PASS. Actual installed-Chrome synthetic component+service and app-route/Board draft regression performed; external/errors0,1440/768/390 layouts, expiry/401/403/logout/late responses checked. Native file chooser blocked by existing extension permission; import parser/preview/apply tested using a synthetic File at that boundary. Final source gate (one run): npm run check PASS (13 Edge modules), npm run test:ci128/128 PASS, npm run format:check PASS, npm run build PASS4.05s plus production test/source exclusion; git diff --check PASS. Format used byte-verified temporary LF normalization of78 unchanged tracked code files, restored to their exact original checkout bytes afterward; no unrelated content diff. The existing large-chart bundle warning remains; no threshold or CI bypass. Native17/Deno remain BLOCKED; CP01-C and real-data gate NOT RUN. No hosted requests, migration/deploy, production activation or CP07. Prior C0A notes below remain intact. Independent review: JWT concern PASS with source unchanged; ticker pause does not prevent SDK getSession demand refresh on return to Board. Existing targeted Auth/transport checks4/4 PASS. Codex/IAB supplement at360/390/768/1024/1440 verified teacher catalog/dialog, student histogram/keyboard/Escape/403/cleanup and no page overflow; external/errors0. Full pending diff and all3 new files matched the review bundle before documentation finalization. No repeated full suite. Next existing roadmap task: CP01-C, requiring separately budgeted authorization for each hosted/API/DB activity; native17/Deno blockers remain open.

---

# CP01-C0A Phase 2 — Offline preflight / 2026-10-27

**PARTIAL — native PostgreSQL17 and Deno gates BLOCKED.** Baseline `64b6e9248d2be7332a5378e54bc408364d10e549`, `feature/personal-gradebook`; working tree clean before this task. No PostgreSQL17/Deno executable found on PATH or checked standard installation paths; PostgreSQL13/15 directories contain only data directories, not an available17 runtime. No runtime/dependency installation or download attempted.

Reused specialist Node runtime adapter:1/1 PASS (1746.47ms), actual two Edge entrypoints/pinned SDK/B1 graph, synthetic configuration, captured Deno.serve and fetch-denial with0 requests. Reused CON-004 static chain test:1/1 PASS (313.14ms), against immutable LF Git-blob SQL copies in ignored `tests/local/cp01-c0a/`; eight conflict old/new hashes match, plus separate static reveal old/new hash comparison PASS. Working-tree B3 contains613 CRLF and matches0/8 old hashes versus8/8 from Git LF blobs: execute reviewed LF bytes in a future disposable test, never weaken guards or rewrite migrations. This is a source-input portability limitation, not executed PostgreSQL migration evidence.

Source review confirms B2 prerequisite/deny boundaries and B3/corrective guard intent. Native17 migration-chain execution, pg_proc metadata/default/ACL behavior, RLS enforcement, replay/drift/missing-target rollback and multi-connection behavior remain BLOCKED, not PASS. Native Deno/npm cache/import graph remains BLOCKED; the Node adapter is not a substitute. No SQL engine or migration was executed. [Evidence and remaining gates](features/personal-gradebook/CP06_OFFLINE_READINESS.md#cp01-c0a-phase-2--offline-preflight--2026-10-27).

Only documentation and ignored evidence changed; no new permanent harness. Hosted Supabase requests/queries0, migrations0, deployments0; no real data/secrets, commit/push or CP01-C0B. Browser QA N/A (no UI change). CP01-C security acceptance and real-data gate NOT RUN; production adapters stay disabled. CP06-B/CP07 NOT STARTED.

---

# B4-FIX-CATALOG — Authenticated teacher catalog draft / 2026-10-27

Baseline `e8333ef95c330379e2ee4fbb4844f90a25d66b2c`, feature/personal-gradebook. `grades-admin` now accepts only `{op:'catalog.read',classId:<UUID>}`. Existing JWT/getUser/active-admin pipeline supplies actor/session; `gb_class_read(actor,session,cid)` performs B3 class-lock/session authorization before `gb_lookup_context` is checked against the requested active class. Only strict V1 catalog metadata is returned, with the shared handler's requestId; no class/student/crypto envelope. No new SQL, grants, dependencies or transport. [G-CATALOG disposition and contract](features/personal-gradebook/CP06_OFFLINE_READINESS.md#b4-fix-catalog-disposition--2026-10-27).

Focused pure actual-B2-code compatibility1/1 PASS; selected specialist offline Edge/HTTP regressions14/14 PASS (synthetic backend, global network denial): success/ordered projection, forbidden fields, JWT/profile/session/class denial, malformed catalog, existing teacher operations/student verify/read and terminal PT409. Shared DTO strict V1 mode is opt-in only for catalog.read; existing callers retain their projection. Additional student-catalog equality assertion rerun1/1 PASS. Final source gate: check PASS, curated126/126 PASS, format PASS; build initially failed because local node_modules lacked baseline ECharts6.0.0. Workspace npm ci was blocked by an in-use Rolldown native binding; restored exact locked dependencies from an ignored isolated npm ci --ignore-scripts installation (36 packages), retaining hash-identical in-use bindings, with no process termination/package/lock change. Only build was repeated: PASS4.13s plus production exclusion; known chart-size warning retained. No full unit/format repeat. Checkout-only CRLF normalization was byte-verified and restored with no unrelated content diff. Specialist file remains outside test:ci; allowlist/policy unchanged. CHECKPOINTS obsolete B5/slice snapshots now explicitly historical.

All production adapters remain byte-unchanged and fail-closed; no Board/student UI/Auth or publication acknowledgement/preflight change. CP06-A PASS offline; CP06-B/CP07 NOT STARTED. Hosted Supabase requests/migrations/deployments0; real data/secrets NONE. Browser QA NOT RUN (no UI change); native Deno/PostgreSQL/real JWT-session-RLS-concurrency acceptance, CP01-C and real-data gate NOT RUN. Recommended next CP01-C0 requires separate authorization, not started. Exact-HEAD CI/PR5 Draft status verified after push.

---

# CP06-A — Offline integration readiness / 2026-10-27

Baseline `4fc986e7e6d74c1a95452825838acb2822efa4b4`, `feature/personal-gradebook`; CP05 refinements merged via PR7, prior exact-HEAD Offline CI SUCCESS120/120 retained. **CP06-A1–A3 implemented offline / ready for review, subject to final gates below. Full CP06 OPEN; CP06-B/CP07 NOT STARTED.** [A1 operation matrix, backend proposals and CP01-C authorization scope](features/personal-gradebook/CP06_OFFLINE_READINESS.md). New pure gradebook-responses maps decoded B4 verification to the existing memory-only kind/context owner; requestId is validated/removed, expiry/publication/catalogs strict, own decimal strings and aggregate-only101 scopes preserved, no diagnostics. Finite additions to existing curated tests only; no HTTP/SDK/SQL/browser CI expansion or new dependency. The student fixture uses the helper with generated opaque memory-only capability and B4-shaped synthetic bodies. All four production adapter modules remain byte-unchanged and disabled; no application transport enabled.

Browser Work Chrome/local: same ECharts instance at CSS1440→360→390→768→1024→1440, scroller/guidance appears at narrow widths and disappears when occupied levels fit; no page overflow. Actual role overwrite by ECharts was found/fixed (GB-CP06-A-ARIA/P2); role slider persists after resize, Home/End/Arrow/Tab/Escape/focus pass. Sparse12/dense101/empty0 and1000/zero, dropdown changes, malformed verification metadata, invalid/continuous/leap-date/calendar sync and future month controls verified. SemesterII403 does not revoke semesterI;429/503 terminal, pending close/selection/route responses ignored; expiry/held401 clear inputs/private DOM and restore focus. Student fixture counts: external0/errors0/capabilityInDom=false/storageEntries[0,0]. A local-HTTP fixture UUID issue was corrected by reusing newId (GB-CP06-A-QA/P3); no production Auth workaround.

Existing audit fixture (separate Board QA): eight-column scroll+refresh retained offset367, synthetic local draft saved on close and restored on reopening;11 intercepted synthetic calls, liveRequests0/save0/upload0/remove0. No Board source/design change. This is component/column-navigation evidence, not a full browser Back/Forward route test or hosted Auth. Focused pure run34/34 PASS159.69ms before ARIA fix; final curated gate includes its assertion. Screenshots remain ignored under tests/local/cp06. Physical device/Safari/screen-reader and full app-route browser QA remain NOT RUN, with pure route/history/draft guards retained.

Final source gate (one run): npm run check PASS (13 Edge modules/static), npm run test:ci125/125 PASS619.67ms, npm run format:check PASS, npm run build PASS676 modules/565ms plus production exclusion, git diff --check PASS. Lazy chart530.59kB/gzip177.87kB retains the known >500kB warning; no CI threshold/config workaround. Locked install `npm ci --ignore-scripts` succeeded once (38 packages,10s); no dependency/lock changes. Exact final-SHA Actions checked after push; PR5 stays Draft → develop, no merge.

Backend dependencies: teacher catalog operation absent, publication has no missing-count preflight (current conservative warning/acknowledgement retained), decoded response transport wiring pending. B2/B3/PT409/reveal migrations remain NOT APPLIED; B4 Functions NOT DEPLOYED. Native17/strict migration guards, Deno runtime/bundle, real JWT/session/RLS/Edge/API, concurrency/audit/limiter/precision round-trip, rollout/key recovery/CP01-C and real-data gate NOT RUN. Hosted Supabase/Auth/SQL/API/Storage/metadata/log requests0; migrations/deployments0; secretsNO; real dataNONE; stress/load/soak/stretchNONE. No CP06-B/CP07 or backend rollout started.

**Older sections below are historical evidence snapshots, not current branch/PR/deployment assertions.**

---

# CP05 responsive scrollbar lifecycle — 2026-10-27

On `feature/personal-gradebook-ui-refinement` (base `dd3770e41d259e3fafb6af897787796016e952cc`), omit scroller when all occupied levels fit desktop. Corrected a resize regression: chart instance previously could not add/remove `dataZoom` after responsive width changes because it used dispatchAction only. ResizeObserver now rebuilds the ECharts options on genuine chart-width changes, preserving the keyboard-selected score; the footer hint is visible only while zoom is needed. <=420px summaries stack for legibility. Focused pure tests cover width-dependent zoom, but browser/device QA is still pending. No Board/admin/API/production/fixture/parent-branch changes. [Details](features/personal-gradebook/CP05_UI_REFINEMENT.md#responsive-scrollbar-behavior--2026-10-27).

---

# CP05 occupied-only histogram display — 2026-10-27

Branch `feature/personal-gradebook-ui-refinement` (parent `feature/personal-gradebook` untouched), based on `a8d055da65fcaae07584d7e2a9956882c3d80cee`. User-requested visual projection: retain validated 101 aggregate levels but plot only levels with `studentCount > 0`, preserving numeric order and explicit “only occupied levels” explanation. Sparse data renders centered, wider 64px-capped bars without empty categories; dense data retains slider/zoom and one-stop keyboard traversal over occupied levels; all-zero data shows an empty message, not an all-zero chart. Zero/count/hover/zoom tests updated. Main Board, admin, Supabase and fixture UI untouched. **Offline/browser QA and user visual acceptance are separate gates; never assume PASS from source edits.** [Design record](features/personal-gradebook/CP05_UI_REFINEMENT.md#chỉ-vẽ-các-mức-điểm-có-học-sinh--2026-10-27).

---

# CP05 focus, hover and chart-density polish — 2026-10-27

On `feature/personal-gradebook-ui-refinement` (parent `feature/personal-gradebook` untouched): user screenshot-driven refinement gives the student CCCD field, histogram subject/type selects and DOB calendar month/year controls a consistent scoped green focus ring and red CCCD error treatment. ECharts personal bucket hover now remains orange instead of inheriting series-wide green; default chart window is responsive (8–32 intervals) with increased 34px bar maximum and 45% spacing. All 101 aggregate levels, exact half-up, one keyboard stop and dataZoom remain intact. Added pure tests and updated [UI refinement notes](features/personal-gradebook/CP05_UI_REFINEMENT.md#focus-and-bar-hover-correction--2026-10-27). CI, browser QA and user visual acceptance must be evidenced separately; no hosted requests/production deploy authorized.

---

# CP05 UI screenshot corrections — 2026-10-27

Branch `feature/personal-gradebook-ui-refinement`, baseline `71f72766ded4d22cec80da29ced43daec55d4ef7`. User approved focused V2-01..V2-04 fixes plus screenshot-driven DOB focus, continuous DD/MM/YYYY typing and a compact wider desktop chart. Redundant chart exploration range/return controls removed; one keyboard-accessible chart surface and ECharts horizontal scrollbar remain. Invalid DOB now visually highlights the complete field; calendar disallows future months in the current year; lazy import displays a preparation state. Synthetic QA fixture and its developer labels remain unchanged. [Correction matrix](features/personal-gradebook/CP05_UI_REFINEMENT.md#screenshot-based-correction--2026-10-27).

**Status:** Source correction implemented; independent browser/user visual acceptance not inferred. Source changed only on UI refinement branch. CP01-C/hosted/Auth/RLS/real-personal-data remain NOT RUN.

---

# CP05 UI Refinement V2 — chart and birthday calendar / 2026-10-27

Branch `feature/personal-gradebook-ui-refinement`, baseline `75590c16a3d5a4ccdcfc6377106f93e23e66c4b2`, Draft PR7 → `feature/personal-gradebook`. **IMPLEMENTED CANDIDATE — USER VISUAL APPROVAL PENDING.** ECharts6.0.0 locally bundled with modular SVG/axes/tooltip/DataZoom, lazy-loaded only for an opened chart; all101 exact aggregates retained, personal raw score separate, one-stop native keyboard range and return-to-personal action. Resize/close/replacement/expiry/route cleanup disposes the chart and observer. Feature-local Gregorian DOB calendar replaces the narrow native date control, supports manual DD/MM/YYYY, direct month/year selection, day/week/month/year keys and mobile sheet; strict B1/Vietnam-day validation and memory-only cleanup retained. No Board/shared header/nav/admin/backend/SQL/Edge/production adapter or CI-policy changes. Library/license decisions and concern matrix: [CP05_UI_REFINEMENT](features/personal-gradebook/CP05_UI_REFINEMENT.md); GB-CP05-UIV2-001 records a local candidate synchronization correction.

Focused Node cases26/26 PASS (357.57ms). Actual local Chrome synthetic fixture: CSS widths360/390/768/1024/1440, no page overflow; chart0/1/23/1000 counts/axes, personal8.3/zero/missing, selector replacement, Home/End/Arrow/Tab/Escape and return action; loading/late selection/close/503/403/expiry/held401 cleanup, manual reset and empty enabled input focus. DOB invalid/future rejection, leap-year choice, no today auto-selection, direct year/month, digit-only manual synchronization, keyboard month boundary and Escape verified. External/error counters0. Calendar360px day width44.44px and height44px. Screenshots ignored under tests/local/cp05; browser extension metadata errors were observed separately from the fixture (application exception counters0), not treated as an application PASS/FAIL. Full-page capture was intermittently unavailable, viewport screenshots saved. Not physical touch/device/Safari or screen-reader/OS reduced-motion acceptance. Final Node24.22.1 gate: curated117/117 PASS (1684.85ms), build PASS (676 modules,2.14s; production fixture/source exclusion PASS). ECharts is a separate530.47kB chunk (gzip177.82kB), reached only by dynamic import on an opened chart and absent from initial HTML modulepreloads. Vite reports the >500kB chunk warning; this is an explicit on-demand bundle trade-off, not hidden by raising limits. Initial check/diff failed on two new Markdown trailing-space lines; format found one pre-existing fixture line wrap. Corrected only those; affected check/format/diff rerun PASS. No repeat of unchanged unit/build suites. No new CI policy or workflow.

Hosted Supabase/Auth/API/SQL/metadata/log requests0; migrations/deployments0; secretsNO; real dataNONE; stress/load/soak/stretchNONE. Native17/Deno/hosted Auth/RLS/API/publication/limiter, CP01-C and real-data gates NOT RUN. PR7 stays Draft; exact-SHA Actions state is read after push. No merge, deployment or next checkpoint.

---

# CP05 student-facing wording refinement / 2026-10-27

On `feature/personal-gradebook-ui-refinement`, replaced technical/debug UI vocabulary in Gradeboard/lookup/chart with student-friendly Vietnamese, including rounded score explanation and neutral error/expiry copy. QA-only synthetic controls now have readable Vietnamese choices while internal test values remain unchanged. UI terms documented in [CP05_UI_REFINEMENT](features/personal-gradebook/CP05_UI_REFINEMENT.md) and manual labels in [tests/README.md](../tests/README.md). No changes to B1 score precision, 101 buckets, student capability, Gradebook backend, Board main page, shared nav or admin. Awaiting explicit UI acceptance and separate verification evidence.

---

# CP05 UI visual refinement — isolated review branch / 2026-10-27

Branch `feature/personal-gradebook-ui-refinement` forked from accepted offline CP05 `09de67787621d64527073ca0f1f16b13dea8d6ee`. Student Gradeboard + Analytics Drawer visual composition: class/year context heading, integrated semester switcher and legible sticky-first-column table; contextual histogram controls, exact raw-score/same-bucket aggregate summary cards, quiet plot/grid and responsive mobile sheet. The 101 half-up buckets, on-demand only, roving focus, modal Escape/close, request cancellation and fail-closed production remain unchanged. All styling is scoped to CP05 component/dialog; Board main page, shared navigation and CP03/CP04 admin intentionally untouched.

**Status: IMPLEMENTED AS DESIGN CANDIDATE — NOT YET VISUALLY ACCEPTED.** Current task does not confer visual approval; see [CP05_UI_REFINEMENT](features/personal-gradebook/CP05_UI_REFINEMENT.md) for wireframe, library decision and manual acceptance matrix. No new dependency/package lock/CDN/API/SQL/Edge/deployment changes. Do not treat GitHub source commit alone as browser/device evidence. CI/browser result must be reported separately; CP01-C, hosted Auth/RLS/API, native17 and real-data gate remain NOT RUN.

---

# CP05 F01–F05 corrections / 2026-10-27

Baseline `a99569b956861e00d7a21c679ffa52bb890c67a7`, feature/personal-gradebook. F01 context/publication/catalog projection now precedes capability retention; invalid context remains unavailable. F02 visible integer Y-axis/grid, F03 one roving chart entry with arrows/Home/End/scroll and normal Tab out, F04 reset/expiry/401 focus recovery. F05 maintained synthetic component fixture under tests and [exact local reproduction steps](../tests/README.md#cp05--browser-qa-offline-tái-lập-f01f05). No ignored file or prior Work session needed. Production verify/private reads remain fail-closed; CP03/CP04, SQL/Edge, dependency/lock/workflow/deploy config unchanged.

Focused tests24/24 PASS (173ms). Browser local Chrome: context missing/bad-catalog/bad-publication never shows board, valid recovery works; axis0/1/23/1000 and personal bucket0.0/8.3/10.0; one Tab entry, Arrow/Home/End/scroll, Tab to footer close, Escape to trigger; reset Enter and expiry-in-modal return focus to empty enabled identity input; held401 and leave/release clear private DOM. Actual iframe CSS widths360/390/768/1024/1440 have no page overflow, fixed64px axis and101 internally scrollable buckets. Not physical mobile/Safari. Screenshots stay ignored in tests/local; `npm run check`, `npm run test:ci`115/115 (414ms), `npm run format:check`, `npm run build` (95 modules,201ms; production fixture exclusion) and `git diff --check` all PASS, one final-code gate execution. Exact-SHA Actions result is read after push. Prior CP05/CP03/CP04 evidence below remains historical.

Hosted Supabase/Auth/SQL/API/metadata/log requests0; migrations/deployments0; secretsNO; real dataNONE; stress/load/retryNONE. Native17/Deno/hosted Auth/RLS/publication/limiter/CP01-C and real-data gate NOT RUN. No CP06/CP07 or merge.

---

# CP05 — Student gradeboard and histogram / 2026-10-27

Baseline `741ee3ddf8f19483621a23a8bb8ff0cf0e947bae`, feature/personal-gradebook. **CP05 OFFLINE ACCEPTED — ready for review.** Eight catalog-ordered subjects/seven columns, two semester tabs, B1 one-place display with raw strings preserved and null/zero distinction. One on-demand101-bucket aggregate chart with exact half-up highlight, raw personal score, two dropdowns, accessible native dialog/Escape/focus restore and mobile fullscreen layout. No average/ranking, teacher chart, new dependency, backend or migration change.

CP02 retains capability/context in closure, exposing only bounded internal read/context methods; no token in UI snapshots/DOM/URL/storage/logs. Read channels cancel/fence old selections, modal close, route/logout/expiry;15s deadline, no retries/polling.401 clears the session;403 clears the visible semester while preserving other-semester capability. GB-CP05-001 trace in BUG_FIX_LOG. Production verify remains unavailable and new private-read adapter fails503 locally with **zero network**, not a synthetic fallback. Future transport maps B4 verify metadata into internal context and passes capability only in its dedicated header; operation bodies are grades(semester) and histogram(semester,subjectCode,columnCode), never student IDs.

Focused initial Node tests20/20 PASS (CP02+CP05). Final source: syntax/static and format PASS. Curated run107 tests PASS with roster module blocked by missing already-locked fflate; initial build also blocked by missing read-excel-file. One npm ci --ignore-scripts installed34 locked packages (12s), no lock/dependency change. Only affected roster rerun5/5 PASS (120ms) and build PASS (95 modules,193ms; production exclusion PASS); full unchanged suite not repeated. New CP05 pre-cancelled-read case passed in the curated run; eight CP05 tests total. git diff --check PASS. Exact-SHA GitHub CI is reported after push. Browser: local Chrome, labeled synthetic adapter only; iframe CSS widths360/390/768/1024/1440, not physical devices. Observed table/order/zero/missing; modal/dropdowns/raw bucket/scroll; unavailable semester then allowed other semester; empty,403,429/503,401; close/selection/route late results and sign-out cleanup; Board return and Back→empty lookup. No app errors/private storage/external fetch observed.360px overflow was QA Inspect's unbroken output, fixed only in ignored fixture; production table stays contained. Artifacts tests/local/cp05 are ignored, not committed or bundled. CP03/CP04 unchanged; prior acceptance is retained, not rerun as integration.

Hosted Supabase/Auth/SQL/metadata/log requests0; migrations/deployments0; secretsNO; real dataNONE; stress/loadNONE. CP01-C/native17/Deno/hosted JWT/RLS/API/limiter/publication enforcement, deployed-host refresh and real-personal-data gates NOT RUN. Existing teacher catalog and missing-score preflight integration gaps remain separate. No CP06/CP07 implementation or merge/deploy.

---

# CP04 — Teacher score management, import and publication / 2026-10-27

Baseline `60fd76050bbe3e8f8ec3e285f96ff0b05922704d`, feature/personal-gradebook. **CP04 OFFLINE ACCEPTED.** Admin now has a separate score workspace: two semester tabs, ordered catalog/subject/student selection, twenty-student pages and exact raw-score sorting; per-cell put/delete with string revisions/null absence, five-place decimal strings and B1 one-place display. Published edits require acknowledgement; publish/unpublish are independent, confirmed class-revision mutations. No averages/teacher chart/CP05. CP02/CP03 preserved; accepted B1–B4/migrations unchanged, no dependency added.

CSV/XLSX score import uses existing bounded parser/worker with ten physical A–J columns, original source coordinates, text identifiers, calendar dates and raw XML numeric score strings. Binary tails/exponents/excess precision reject rather than round. Blank slots skip; duplicate nonblank slots reject; preview/apply bind class/semester/input/token/expiry and use one server-owned operation. Structured422 preview counts/errors are safely projected for both roster and scores. Header-only downloadable CSV/XLSX templates are production-allowlisted by exact source-byte comparison; no private data. Canceling an already-sent write clears the old snapshot and requires explicit reload; cancellation never claims server rollback.

Installed headed Chrome155.0.8059.85, temporary isolated profile/CDP loopback and localhost: **11 recorded QA groups PASS**, spanning required CP04 scenarios, 1440/768/390 viewports, internal horizontal scroll, keyboard/focus, pending request cancellation/logout/route disposal, real CSV/XLSX and template downloads. Includes synthetic unknown/mismatched students, structured422, decimal/formula/duplicate errors, stale/failed apply, independent publication and existing Board/CP02/CP03 representative regression. No console exceptions. **34 synthetic REST interceptions, hosted forwarded0.** Artifacts/fixtures/runners remain ignored in tests/local/cp04; screenshots hide score/pupil table rows and contain no document numbers/raw scores. Synthetic local atomicity is not database atomicity.

Focused pure/component checks: CP03 helper/parser regression11/11 PASS; initial CP04 missing helper export corrected, then13/14 PASS; terminal-column guard fixed and T06 rerun1/1 PASS; expanded expiry T10 rerun1/1 PASS. Final Node24 code gate executed once on stable source: check PASS, curated104/104 PASS, build PASS (93 modules,615ms; separate66.70kB XLSX worker; initial22.86kB entry), format PASS and production asset exclusion PASS. CSV/XLSX header-only template order/content verified offline. Checkout-only CRLF normalization was verified against HEAD before the format gate; original EOL restored afterward with no unrelated source diff. [Current matrix/inventory](TESTING.md#cp04-offline-concern-matrix). Production request adapter still has no transport or synthetic fallback. **Integration gaps:** B4 exposes no teacher catalog operation; loadTeacherCatalog fails locally. Publication provides no missing-count preflight DTO; UI conservatively warns and explicitly acknowledges possible missing scores without inventing a count. Real authorization, transaction/DB round-trip, missing-count integration, CP01-C and real-data gate NOT RUN. No hosted Gradebook, real credentials/data, migration, deployment or merge; CP05 NOT STARTED. Final-SHA Actions and PR state are verified after push, separately from local evidence.

---

# CP03 — Class/student administration and roster import / 2026-10-26

Baseline `1fcbf29f4d10f595a6f251f54627b8f699f7386d`, `feature/personal-gradebook`. **CP03 OFFLINE ACCEPTED.** UI implemented at `/personal-gradebook/admin`: shared verified Board Auth, conditional menu, independent class metadata/revisions, cursor-paged student CRUD/status/safe deletion, masked identity with explicit temporary reveal, CSV/XLSX positional import/mapping/server preview/confirmation. Production adapter fails locally with zero Gradebook requests; it never selects synthetic data. Accepted B1–B4/migrations and production student lookup adapter unchanged. Route scopes use existing `newId()` fallback.

Installed headed Chrome155.0.8059.85, isolated temporary profile/CDP loopback, localhost with intercepted synthetic Auth/REST/admin adapter: 15 primary scenario groups plus3 supplemental component checks PASS. Supplemental checks use a synthetic Board session and cover failed-page cursor recovery and unresolved-confirmation disposal on Back/logout. Includes anonymous/failed/delayed Auth; class create and independent name/year changes; student create/edit/identity correction/status/delete guards; reveal DOM disposal; CSV/XLSX two/three-column mapping, blank-name preservation, leading zeros, leap/1904 Excel dates, duplicate source coordinates, numeric identity/formula rejection, identity conflict, stale/failing apply, file-change invalidation, pending-result logout/route cleanup, actual Back guard, Board/lookup regression and keyboard/focus. Viewports1440/768/390 PASS, no page overflow or console exceptions. Evidence/screenshots remain ignored under `tests/local/cp03/`; fixture/runner never committed or bundled. Simulated rollback is not real database atomicity. 35 synthetic REST interceptions; hosted forwarded requests0; real identities NONE. Native mobile/Safari, CP01-C, hosted authorization/transactions and real-data gate NOT RUN.

Focused pure tests: initial10/11 PASS; duplicate error-category defect fixed and affected T08 rerun1/1 PASS. Safe ambiguous-failure message assertion T02 rerun1/1 PASS. Local quality gate Node24: check/unit90/90/build/format PASS. Two final component hardening changes then received focused Chrome checks and affected check/build/format PASS; unchanged full local unit suite was not repeated. Latest build90 modules; XLSX worker66.70kB and parser chunks separate from initial entry22.68kB; production exclusion guard PASS. No HTTP/SDK/SQL/browser integration added to CI. Checkout-only CRLF normalization used byte-equivalence checks, no unrelated content diff. [Current concern matrix and merge inventory](TESTING.md#cp03-offline-concern-matrix). CP04/CP05 NOT STARTED; no backend rollout, migration, merge or deployment. Final-SHA Actions/PR status must be verified after push, separately from local evidence.

---

# CP02 — Offline student lookup UI / 2026-10-26

**CP02 OFFLINE ACCEPTED — final correction baseline `1874cba`, feature/personal-gradebook.** GB-CP02-REV-001: shared in-flight Board Auth restoration + direct administrator entry, no synthetic click/new client/reverification. GB-CP02-REV-002: indexed same-document history compensates rejected Back/Forward without pushState; draft guard/route disposal preserved. Six pure regression cases added to the existing CP02 test file; CI scope unchanged. Final check/unit79/79/build/format PASS; focused pre-final units12/12 PASS. Initial local format check failed only on75 unchanged CRLF files; normalized checkout EOL after verifying content against HEAD, reran format only, no unrelated source diff/full-suite repeat.

Installed Chrome155.0.8059.85, headed, isolated ignored profile, CDP loopback: anonymous/admin/delayed/failed restoration, two blocked Back attempts (history length remains5; actual editor text retained), successful persistence + Back/Forward, logout, menu/keyboard, route disposal/direct refresh and viewport1440×960/390×844 PASS. Seven scenario outcomes, zero console exceptions;31 synthetic REST interceptions, **hosted forwarded requests0**, production lookup requests0. Evidence/screenshots stay in ignored `tests/local/cp02-final/`. Viewport QA is not Safari/native-device acceptance. CP01-C/real-data/static-host deployment gates remain NOT RUN; no CP03 started. Final-SHA GitHub CI/PR state is reported after push, not inferred from local gates.

**Initial CP02 evidence below (baseline `7b7656b`, historical):**

Baseline `7b7656b`, branch `feature/personal-gradebook`. English routes `/`, `/personal-gradebook`, reserved `/personal-gradebook/admin`. Shared hamburger/branding/admin controls; lazy Board graph, route suspension, draft persistence before exit; accessible Vietnamese form reuses B1 string identity/date-only/Vietnam-day validation. Memory-only lookup state, abort/generation fences, 15s deadline and expiry; clears controls/private DOM on navigation/sign-out/refresh. Production verification is deliberately unavailable with **zero lookup requests** until CP01-C is authorized; no fabricated grades or frontend-only authentication.

Focused units: `node --test tests/gradebook-ui.test.js tests/board-navigation.test.js tests/drafts.test.js` **20/20 PASS**, one execution. Final code gate, Node24.22.1: `npm run check` PASS; `npm run test:ci` **73/73 PASS** (416ms); `npm run build` PASS (80 modules,152ms, test-module exclusion PASS); `npm run format:check` PASS; `git diff --check` PASS. One final gate execution; pinned dependencies unchanged. No specialist/SQL/HTTP integration added to CI; no dependencies added. Accepted B1–B4, migrations and existing verification assets untouched.

Production build Vite preview: direct `/personal-gradebook` and browser refresh PASS; valid synthetic input returns unavailable and clears all three controls; only the18.55kB entry script loaded, no Board module preload. This proves local SPA fallback, not deployed-host rewrite.

Browser QA: local Chrome with explicitly labeled, ignored synthetic adapters; desktop plus actual iframe CSS widths1440/768/390 (not native tablet/mobile). Observed menu mouse/Arrow/Escape/focus/outside dismissal, Board↔student/Back/Forward, leading-zero preservation, impossible-date validation, native date-value→DD/MM/YYYY synchronization, unavailable/neutral/loading/expiry, route exit during held result, sign-out and refresh clearing. Board returned with synthetic published content; no lookup-triggered Board reads, no horizontal overflow or application errors/private storage observed. Native OS calendar popup could not be independently observed through this browser surface; native date-value interaction passed, device/Safari popup acceptance remains NOT RUN. Existing draft unit evidence covers persistence; hosted admin/editor acceptance is NOT RUN. QA artifacts under ignored `tests/local/cp02/screenshots/`; fixture code is not committed/bundled.

Hosted Supabase/Auth requests **0**, migrations/deployments **0**, secrets NO, real student data NONE, stress/load NONE. Static-host rewrite/deployed refresh, hosted integration, native PostgreSQL17, CP01-C and real-personal-data gate **NOT RUN**. No CP03–05 started. Historical snapshots below retain their original evidence; PR conflict status at this baseline is now Draft/open, mergeable=true/clean (GitHub read), superseding older blocked snapshots.

---

# CP01-B5 — CURATED CODE-QUALITY CI; PR CONFLICT / ACTIONS BLOCKED / 2026-10-26

Baseline `c9e18c1`, feature/personal-gradebook. Latest policy supersedes SQL CI approval: newly staged PGlite dependency/SQL step/ad-hoc runner removed, lock restored exactly; accepted B1–B4/Edge/Prettier/build preserved. CI uses explicit test:ci with six component/pure-unit files; no API/HTTP/Supabase integration, SQL/runtime or browser suites. [Consolidated concern matrix, inclusion/exclusion and pre-merge asset inventory](features/personal-gradebook/B5_OFFLINE_REVIEW.md#current-policy-correction--baselinec9e18c1-supersedes-sql-ci-approval). Prior120/120 Node and temporary20 SQL-group results remain historical; no new integration acceptance. Final curated gate: test:ci66/66 PASS (566ms), check/build/format/diff PASS; no specialist/SQL repetition.

**GB-B5-REV-001/P1 CONFIRMED / OPEN:** PR5 Draft, mergeable=false/dirty against develop307b6c6. Read-only three-tree diagnostic identifies docs/BUG_FIX_LOG.md (competing Gradebook/AUD-020 insertions); docs/STATUS.md changes on both sides without conflict markers. No merge/rebase/conflict resolution/force-push/develop edit performed. GitHub pull_request CI is blocked until a separately authorized reconciliation; no exact-HEAD Actions PASS. GB-B5-REV-002/P2 boundary preserved: PGlite is supplementary regression, not native17 or hosted/security acceptance.

Hosted Supabase/Auth/migrations/deployments0; secretsNO; real dataNONE; stress/load/soak/stretchNONE. Deno/native17/CP01-C/real-data gate NOT RUN, CP02 NOT STARTED. Specialist assets retained pending separate pre-merge cleanup; no premature deletion. Earlier dependency blocker and B5 snapshots below are historical.

---

# CP01-B5 — PARTIAL IMPLEMENTATION / SQL CI BLOCKED / 2026-10-26

Baseline `8f2bcfb`, feature/personal-gradebook. B4 accepted as draft. [B5 coverage/evidence/handoff](features/personal-gradebook/B5_OFFLINE_REVIEW.md): syntax covers13 Edge files; exact Prettier3.6.2 installed/locked, Edge format scope added, B4 files formatting-only; Node adapter loads both actual entrypoints with pinned SDK and zero network. One final-code run: check PASS, tests120/120 PASS, build PASS, format PASS, diff PASS. No accepted SQL/B1/frontend behavior changed.

**Remaining B5 blocker:** automatic approval review rejected adding PGlite alongside Prettier; no dependency workaround. Separate approval is required for a pinned test-only SQL runtime before wiring existing focused disposable SQL tests into CI. Their prior results remain historical, not new CI evidence. Native Deno/bundle NOT RUN (runtime absent); exact-final-SHA Actions outcome reported after publication. Prettier's earlier ENOTCACHED is now resolved locally; no inferred hosted acceptance.

Hosted Supabase/Auth/migrations/deployments0; secretsNO, real dataNONE, stress/load/soak/stretchNONE. CP01-C/native17/rollout/real-data gates NOT RUN; CP02 NOT STARTED. No automatic continuation or merge. Earlier snapshots below are historical.

---

# GB-B4-REV-001 — FIXED IN DRAFT; CP01-B4 READY FOR FINAL REVIEW / 2026-10-26

Baseline `e036521e`, feature/personal-gradebook. Shared OPTIONS allowlist now includes pinned SDK2.118.0's `x-client-info`; explicit origins, POST/OPTIONS, capability header, no-store and authentication unchanged. [Focused review/concern preservation](features/personal-gradebook/B4_INTEGRATION_REVIEW.md#gb-b4-rev-001--sdk-cors-correction-2026-10-26), [bug trace](BUG_FIX_LOG.md#2026-10-26--gb-b4-rev-001--p2-supabase-sdk-cors-header-compatibility-fixed-in-draft). One focused offline run `node --test --test-name-pattern='CORS preflight|HTTP boundaries' tests/gradebook-edge.test.js` **4/4 PASS**; syntax/diff checks PASS. Actual SDK headers captured with synthetic transport; OPTIONS performs no backend work. No full-suite rerun or new crypto/retry acceptance claim.

Hosted Supabase requests/Auth/migrations/deployments0; real dataNONE; stress/load/soak/stretchNONE. Formatting/CI NOT RUN (previous ENOTCACHED), B5 NOT STARTED; native17/hosted JWT/RLS/API/CP01-C/rollout/real-data gates NOT RUN. No deployment or automatic next checkpoint. Earlier snapshots below remain historical.

---

# CP01-B4 — READY FOR REVIEW / 2026-10-26

Baseline `29a7f2a`, feature/personal-gradebook. Implemented draft `grades-admin` and `student-lookup`,13 JS modules plus function config, isolated pinned SDK2.118.0 clients, verified JWT/profile/server actor binding, AES-GCM/HMAC keyrings and secure reveal redaction, encrypted capabilities, B1-bound preview commitments, B3 preflight/atomic apply and committed limiter integration. SQL/B1/Board/frontend/dependencies unchanged. [Five mandatory concern confirmations and HTTP/crypto contracts](features/personal-gradebook/B4_INTEGRATION_REVIEW.md#cp01-b4-implementation--mandatory-concern-confirmations-2026-10-26).

**CON-002 and CON-004 PASS offline.** First focused Node/Web Crypto/SDK-with-mocked-fetch run29/29 PASS; self-review fixed GB-B4-001/P2 enum type coercion with2/2 targeted PASS; three additional keyring/claims/GET503 tests3/3 PASS; publication-race mapping GB-B4-002/P2 fixed with2/2 affected cases PASS; Retry-After CORS/limiter check1/1 PASS. No repeat full suite; current34-test source has no claimed final full34/34 run. Syntax/static/diff checks PASS. **CON-001 static assessment PASS; native17 NOT RUN. CON-003 formatting NOT RUN (offline ENOTCACHED), CI/Deno execution NOT RUN. CON-005 scope PASS.**

Hosted project requests/Auth/migrations/deployments0; production secretsNO; real dataNONE; stress/load/soak/stretchNONE. B4 is ready for review, not deployed or security-accepted. B5 NOT STARTED; CP01-C, migration rollout reconciliation, native17, real-data/key-recovery gates NOT RUN. No automatic B5/deploy. Earlier states below are historical.

---

# CP01-B4 reviewer concerns recorded — 2026-10-26

**Independent static/offline review accepted** `GB-B4-INT-001` reveal correction at `feb256a`; no new test/deploy. Before and during B4 implementation Work must explicitly confirm [five carry-forward concerns](features/personal-gradebook/B4_INTEGRATION_REVIEW.md#cp01-b4-reviewer-concerns--mandatory-confirmation-register-2026-10-26): PostgreSQL17 cross-version assumptions **NOT RUN / CP01-C**, full AES-GCM/HMAC verification and Edge DTO redaction **B4 hard gate**, Prettier previously **ENOTCACHED / B5 CI**, prevention of 40001/PostgREST retry storm **B4 hard gate**, and hosted/real-data prohibitions. Work must return a status/evidence/owner for each; neither PG17 nor Edge crypto/CI is claimed PASS here. B4 remains NOT STARTED until implemented. 0 hosted Supabase requests, migrations applied0, deployments0 for this docs-only handoff.

---
# CP01-B3-FIX-REVEAL — READY FOR REVIEW / 2026-10-26

Baseline `76102e2`, feature/personal-gradebook. **GB-B4-INT-001/P1 FIXED IN DRAFT / NOT APPLIED**: additive `20261026060000_gradebook_reveal_identity_context.sql` adds stored `identityLookup` and row `lookupKeyVersion` only to `gb_student_read(reveal=true)`. Exact body hashes and full metadata preservation guards; ordinary DTO, authorization, class locking, audit and ACL unchanged. [Correction/self-review](features/personal-gradebook/B4_INTEGRATION_REVIEW.md).

One focused disposable PGlite SQL run **7/7 groups PASS**; syntax/source-hash/diff checks PASS. No app/B2/B3 full suite, build or browser test. Prettier offline unavailable (ENOTCACHED), manual formatting review only. Hosted requests/Auth0, migrations applied0, Edge deployments0, secretsNO, real dataNONE, stress/load/soak/stretchNONE. B4/B5 **NOT STARTED**; B4 cryptography/native17/hosted security/CP01-C/real-data gate **NOT RUN**. Prior B4 blocker below is historical, superseded only for this corrected SQL dependency. No automatic B4 continuation.

---

# CP01-B4 preflight BLOCKED — 2026-10-26

Baseline `0bbd0c3`, feature/personal-gradebook. **GB-B4-INT-001 / P1 OPEN:** B3 `gb_student_read(reveal=true)` omits the stored blind index and lookup-key generation needed for the approved AES-GCM AAD and HMAC verification. No current RPC provides that selected record's missing context. [Evidence and minimal upstream correction plan](features/personal-gradebook/B4_INTEGRATION_REVIEW.md). B4 cannot complete secure reveal without a separately reviewed additive B3 correction; accepted migrations are unchanged. No incomplete Edge implementation created.

This turn is documentation/static review only: testsNONE, hosted requests0, migrationsNO, Edge deploymentNO, secrets provisionedNO, stress/load/soak/stretchNONE. B4 **BLOCKED at integration preflight**; B5 NOT STARTED; CP01-C and real-data gate NOT RUN. No hosted failure or new retry incident is asserted. Earlier snapshots below are historical.

---

# CP01-B3 accepted offline / CP01-B4 handoff — 2026-10-26

**B3 correction ACCEPTED at static/offline review** (baseline 778600d); eight custom 40001 business conflicts corrected to PT409 in draft migration. Focused PGlite SQL 13/13 and DOM 4/4 PASS as reported, not independently rerun. **Not hosted integration acceptance.** Board hotfix applied per previously recorded metadata. Three attempted Work smoke-test workflows BLOCKED before authentication/RPC (0 test requests), so observed HTTP409 and lack of PostgREST internal retries remain NOT RUN/INCONCLUSIVE. See [recurrence warning](DATABASE.md#cảnh-báo-tái-diễn-gb-ops-001--sqlstate-retryable-cho-xung-đột-nghiệp-vụ).

**B4 is next for offline code implementation; NOT STARTED.** B5 NOT STARTED; CP01-C and real-personal-data gate NOT RUN. B2/B3/correction NOT APPLIED on hosted, no new secret deployment or hosted testing approved. Continue with [quota policy](TESTING.md#chính-sách-kiểm-thử-tiết-kiệm-quota--bắt-buộc).

---
# CP01-B3 focused correction — 2026-10-26

Baseline `13292a3`, feature/personal-gradebook; **B3 CORRECTION READY FOR REVIEW / NOT DEPLOYED**. GB-B3-REV-003 P1 corrected in additive `20261026050000_gradebook_nonretryable_conflicts.sql`: eight exact business-conflict definitions become PT409 with body/metadata guards. Old migrations unchanged. Board PT409 feedback is now localized safely. [Correction evidence](features/personal-gradebook/B3_TRANSACTION_REVIEW.md#gb-b3-rev-003-correction--2026-10-26), [rollout gate](DATABASE.md#gradebook-migration-rollout-gate--gb-ops-rev-002).

One focused SQL execution13/13 groups PASS (disposable PGlite18.6), DOM tests4/4 PASS; targeted syntax/format/diff only. Full B3/app suites, build, browser, native17, concurrency and hosted integration NOT RUN. **Hosted requests0; hosted migration executionNO; stress/load/soak/stretchNONE.** Board hotfix remains applied according to existing recorded evidence; B2/B3/correction remain drafts. B4/B5 NOT STARTED, CP01-C/real-data gate NOT RUN. No ledger repair/deploy/merge/rebase.

GB-OPS-REV-002 handled by documented dependency/pending-version review and a no-Gradebook-traffic rollout gate, not by altering applied history. GB-OPS-REV-003 quota policy remains RESOLVED. Earlier snapshots below are historical.

---

# GB-OPS-001 — hosted board retry fix applied, 2026-10-26

**Board hotfix APPLIED / metadata verified.** Explicit user authorization followed the initial approval rejection. Supabase migration `20261026034549_stop_business_conflict_retries` replaces business-conflict40001 with PT409 in only `public.reorder_posts(uuid[],integer[])` and `public.save_post(jsonb,jsonb,integer)`. Local filename reconciled to actual hosted migration version; SQL content unchanged.

Verified: both functions contain PT409/no40001, owner postgres, SECURITY INVOKER, empty search_path, anon EXECUTE false/authenticated true. Previously identified looping backend131961 was terminated with explicit permission; exact session absent afterward. No business data mutation, RLS/Auth setting change, project restart or Gradebook apply. No hosted RPC reproducer/load test. Backend work in apply turn: one migration + two bounded metadata reads (first returned only final statement, requiring combined result query).

B3 draft still contains custom40001 and requires correction before apply; B4/B5 not started, CP01-C/real-data gate NOT RUN. Earlier incident snapshots below are historical and superseded by this entry.

---

# Incident GB-OPS-001 — hosted retry storm, 2026-10-26

**P1 / fix prepared, hosted execution BLOCKED by automatic approval review.** PostgREST14.18 repeatedly retries existing board reorder_posts business conflicts raised as40001. Bounded logs/activity confirmed backend131961 with known session start. Prepared additive board-only PT409 hotfix and focused disposable regression PASS. Migration apply and exact-session termination were rejected and did not execute. No live load test. [Finding/evidence](BUG_FIX_LOG.md#2026-10-26--gb-ops-001--p1-postgrest-retry-storm-hosted-fix-blocked).

B3's unhosted custom40001 paths share this risk: **B3 requires correction before hosted apply**, superseding earlier draft-ready status below. No Gradebook migration applied. Earlier B3 implementation evidence remains historical; no B4 work started.

---

# CP01-B3 — transactional RPC draft, 2026-10-26

Branch `feature/personal-gradebook`, baseline `d86627f` matched remote/clean. B1/B2 ACCEPTED; **B3 READY FOR REVIEW, draft only**. 22 service-only invoker RPCs, class-first serialization, shared preview/apply planner + complete private state hash, atomic audit and separate atomic limiter. [B3 review/evidence/boundaries](features/personal-gradebook/B3_TRANSACTION_REVIEW.md).

PGlite18.6: B3 14/14 groups, B2 18/18 groups PASS; app81/81 and npm ci/check/build/format/diff PASS. Native17/multi-connection/hosted/browser/CI NOT RUN. B4/B5 NOT STARTED; CP01-C/real-data gate NOT RUN. No hosted migration/query/config, deployment, merge/rebase or frontend change.

The B2 and older snapshots below are historical.

---

# CP01-B2 — schema/security migration draft, 2026-10-26

Branch `feature/personal-gradebook`, baseline local/remote `282bebc89f630fe773c016c0ec7bb94b7681143e`, clean; develop `307b6c6`, not merged/rebased. **B1 ACCEPTED; B2 DRAFT READY FOR REVIEW / NOT APPLIED TO SUPABASE.** Six isolated tables, exact catalogs, RLS/ACL and narrow boolean session helper. Migration file exists in Git; no hosted changes, public RPCs, Functions, UI or new project dependency.

Local **18/18 SQL groups PASS** on disposable in-memory PGlite 0.5.11 / PostgreSQL18.6 with synthetic platform dependencies + four old migrations. **81/81 offline app tests**, npm ci/check/build/format/diff PASS. Native PostgreSQL17/hosted JWT/API/security acceptance and GitHub CI on B2 commit NOT RUN. [B2 review/evidence and safe rollout/rollback](features/personal-gradebook/B2_MIGRATION_REVIEW.md). Existing B1 findings remain fixed.

B3–B5 and CP02–CP07 NOT STARTED; CP01-C and real-personal-data gate NOT RUN. No migration apply/PR/merge/rebase/deploy. CLI generated the filename, then automatic approval blocked telemetry; no retry, no further CLI operation. Remaining work follows the review's separate acceptance matrix.

The older snapshot below is historical and does not override the B1/B2 status above.

---

# Trạng thái dự án — baseline kiểm chứng 2026-10-26

**Repo:** `khoabm/dashboard`. **Source tích hợp:** `develop` tại `307b6c611ca36d8d8e05a6cccf8dadd86d754a30`; GitHub Offline CI **PASS** cho push tại chính SHA này (đọc GitHub ngày 2026-10-26). **Branch feature docs:** `feature/personal-gradebook`, correction CP00 baseline `eba7c18e`, CP01-A refinement reviewed baseline `31f887bd`. Branch feature xuất phát từ `develop` `af43f51`, đang thiếu một commit branding/UI/preview của develop tại thời điểm đối chiếu; chưa merge/rebase. Không suy kết quả CI của develop sang feature HEAD.

| Luồng | Trạng thái được xác minh / việc còn thiếu |
| --- | --- |
| Bảng học liệu | Đã có frontend static Vite, admin Auth/session, CMS, Storage/RLS và regression offline. **Chưa đạt Definition of Done**: real admin/non-admin JWT, upload/thu hồi file, Safari/thiết bị thật, backup/restore và production smoke còn cần bằng chứng; xem [TESTING](TESTING.md) và [QA_REPORT](QA_REPORT.md). |
| Bảng điểm cá nhân | [Brief V1.1](features/personal-gradebook/BRIEF.md), [Data/security](features/personal-gradebook/DATA_AND_SECURITY.md), [CP00–CP07](features/personal-gradebook/CHECKPOINTS.md). **CP00 docs PASS; CP01-A REFINED / READY (docs-only); CP01-B và CP02–CP07 implementation NOT STARTED; CP01-C security acceptance NOT RUN**. [GB-A-REV-001..003](features/personal-gradebook/CP01_TECHNICAL_DESIGN.md#143-accepted-refinement-disposition) sửa phạm vi epoch, fingerprint UPSERT và DOB date-only; BRIEF không đổi. Chưa có source/migration/Function/dữ liệu học sinh được tạo. |
| Database hiện có | 6 bảng `public` cho học liệu, 4 migration học liệu đã apply theo tài liệu baseline. Gradebook gồm 6 bảng **chỉ là đề xuất**, chưa apply; không được tạo tài khoản học sinh thật để test. |
| Security Advisor (kiểm tra 2026-10-26) | Supabase hiện trả **1 WARN**: `auth_leaked_password_protection` (Leaked Password Protection Disabled). Xem [remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Đây là advisory cấu hình Auth, **không phải bằng chứng lỗi Gradebook**; không tự bật gói trả phí. |
| Quy trình an toàn | [Real personal data gate](features/personal-gradebook/DATA_AND_SECURITY.md#h-real-personal-data-gate) **NOT RUN**. Không xử lý dữ liệu học sinh thật trước khi có bằng chứng cần thiết; triển khai/test synthetic có thể chuẩn bị theo checkpoint được phép. Không có deployment/merge thuộc lượt docs này. |

**Bằng chứng CP00 docs:** correction `eba7c18e` đối chiếu [GB-REV-001..008](features/personal-gradebook/CHECKPOINTS.md#cp00-finding-dispositions); lượt sau làm rõ file Excel/CSV học sinh chỉ gồm `CMND/CCCD` và `Ngày sinh` cũng hợp lệ, bổ sung regression checklist. Các kết quả kiểm tra Markdown là **docs-only**; unit/browser/backend Gradebook, grants/RLS và migration thật **NOT RUN**. Mọi thao tác tiếp theo cần kiểm tra ref/HEAD mới thay vì dùng snapshot này như sự thật vĩnh viễn.

**CP01-A refinement / 2026-10-26:** local/remote `31f887bd`, working tree sạch trước sửa; develop `307b6c6`, feature ahead 5/behind 1, không có commit remote mới, không merge/rebase. Ba finding được sửa trong thiết kế, acceptance và B1–B5; không đổi BRIEF, không truy vấn lại Supabase, không chạy runtime/security/browser tests. Xem disposition và commit chứa dòng này cho diff docs-only; real-data gate **NOT RUN**.

**Thiết kế CP01-A ban đầu / 2026-10-26 (snapshot):** input HEAD local/remote `f522266`; develop `307b6c6`, ahead 4/behind 1 trước lượt đó. Read-only Supabase xác nhận dashboard/Free/PG17.11, 4 migration khớp repo, 6 bảng học liệu RLS, chưa có schema gradebook/Edge Functions; Data API zero-row public 200/private 406. Default grants public còn rộng và service_role không đọc auth.sessions: thiết kế yêu cầu revoke RPC và helper session chỉ đọc, không đổi quyền thật. Audit server INSERT đã có. Metadata này không phải nghiệm thu backend.

---

## Snapshot lịch sử — ghi nhận ngày 2026-10-25 (không phải baseline hiện tại)

Nội dung dưới đây giữ nguyên bối cảnh và bằng chứng AUD-015–019 tại thời điểm lập; mọi câu mô tả branch đang làm, chưa merge, số lượng test và kết quả Security Advisor là thông tin lịch sử, **không đại diện trạng thái hiện tại của `develop`**. Xem phần đầu trang để lấy baseline mới.

Cập nhật 2026-10-25. Repo `khoabm/dashboard`, branch `enhancement/acceptance-refinements` từ `develop` tại `ad8c78c`; baseline lượt AUD-017 là `ff8c567`. Develop đã chứa các sửa AUD-001–014; branch này dành cho các hạng mục hoàn thiện nghiệm thu. **Đã có implementation, chưa đạt Definition of Done.**

| Thành phần | Bằng chứng hiện tại |
| --- | --- |
| Frontend | AUD-017: giữ UI hiện tại, thêm native scrollbar phía trên + trái/phải sticky khi tất cả chủ đề overflow; không có “Đi đến”. Giữ anchor qua refresh, reveal/focus cột mới sau snapshot xác nhận. Mobile giữ một cột/bộ chọn cũ. Stack/dependency không đổi; build static PASS |
| CI / Code style (2026-10-24) | Prettier 3.6.2 đã format toàn bộ 28 file thực thi/test tại `4058de8`; bước debug-check AST, unit, syntax, build và format-check hoàn tất trước commit của GitHub runner. CI chính kiểm tra toàn bộ code, không còn baseline. PR #1 tại `20772f1` đã fail format; upstream `e5605d8` sửa hai dòng trắng thừa và CI PR #1 tại upstream đã PASS (run `40054261324`). CI baseline 306958f PASS (run 40064785504). Bản hoàn thiện pulse có 30 unit; kiểm Checks của PR nhánh hiện tại tại đúng HEAD, không suy PASS từ SHA cũ. CI không gọi API/Supabase |
| Comment coverage (2026-10-24) | Đã áp dụng [COMMENTING_GUIDELINES](COMMENTING_GUIDELINES.md) cho các module thực thi, bổ sung quy tắc DOM container/cha–con/render lifecycle và callback side effect cùng good/bad case. Source được chú thích theo vai trò vùng UI (board shell, bộ lọc, board/admin regions, card, dialog/editor/media). Các sửa logic audit được ghi riêng trong [BUG_FIX_LOG](BUG_FIX_LOG.md), áp dụng cùng quy ước format/comment |
| Supabase | `dashboard` / `vgciiqtwmxcdqppntgnt`, PostgreSQL 17.11; tổ chức `qvosfzztldzaxxodxzlx` plan/tier Free theo plugin. 4 migrations đã apply; private bucket, RLS, audit, optimistic save/reorder và quota RPC |
| Auth / CMS | AUD-016: SDK giữ phiên trong sessionStorage theo tab; bootstrap xác minh Auth user + active admin profile trước khi bật quản trị; lỗi giữ UI khóa/retry, generation chặn kết quả sau SIGNED_OUT. 35 unit PASS; QA-A18 dùng SDK/storage thật + transport giả, 0 Supabase live. SQL cũ xác nhận một active admin; server signup/anonymous và E2E Auth/JWT thật vẫn chưa nghiệm thu |
| QA | 38 unit/check/build PASS khi chạy lại 2026-10-25. QA-A19 PASS các yêu cầu điều hướng đã chốt bằng IAB và iframe360/390/768/1024/1440, Auth/transport mock. Test/fixture frontend ở tests/; ảnh/check logs/scratch ở tests/local/ đã ignore. Các bằng chứng AUD-001–016 giữ tại [QA_REPORT](QA_REPORT.md); không suy mock thành JWT/Storage/thiết bị thật |
| Security | Security Advisor: 0 lint. Performance: còn INFO unused sections_board_order trên dữ liệu mới; không có WARN multiple policies sau migration cuối. Non-admin/admin JWT thật và file runtime access chưa test |
| Sync | Refresh sau ghi/active/manual, không polling hoặc Realtime. Chưa test hai context với admin thật |
| Quota / chi phí | Snapshot 2026-10-23: DB physical estimate ~11,55 MB, Storage runtime 0 byte; chưa đo lại usage, egress UNKNOWN. App cảnh báo 70%/critical 90%, chặn upload từ Storage 90% và khi không đọc được usage. Lượt sửa không bật dịch vụ trả phí/add-on/hosting. Lượt AUD-015 chỉ debug offline, 0 request Auth/REST/Storage tới Supabase thật. Lịch sử lượt audit trước: 1 batch SQL rollback thành công, 1 lần lỗi connector hết hạn không có kết quả SQL. Chưa xác minh phí hosting Sites |
| Sites / main | Chỉ preview nội bộ bằng Sites supervisor; không tạo Site, hosting manifest, version/deployment/public URL, không đổi audience hoặc merge main |
| Wireframe | Bám mô tả R05, có ảnh UI trong docs/qa; chưa có ảnh wireframe quản trị gốc để đối chiếu hoặc visual acceptance |

### Kế hoạch đã ghi tại snapshot 2026-10-25 (tham khảo lịch sử)

Trên `develop` baseline `af43f51`, vùng mô tả tối thiểu 3 dòng + 2 cm CSS (giảm 3 cm so với lượt trước), không clamp và cho chuỗi dài xuống dòng; footer giữ khoảng cách cũ. Browser Codex/IAB đã truy cập được Vite chạy loopback ngoài sandbox: QA iframe 360/390/1024/1440 PASS, thẻ ngắn giảm ~113,4 CSS px; mô tả dài/chuỗi liền hiển thị đầy đủ, không tràn ngang. Check/build/format CSS PASS. Xem AUD-020; giữ nguyên thay đổi local khác. Thiết bị thật NOT RUN.

AUD-019 (baseline `34b2ff0`): sửa hai assertion message cũ bằng bất biến nháp/cleanup tại `bd6acb1`, format riêng 5 file upstream tại `c1230c3`. 41/41 unit/check/build/format PASS local; Offline CI run `40152051421` PASS tại `c1230c3`, gồm đủ unit/build/format. Working tree sạch sau khôi phục EOL checkout; chưa merge/đổi Draft/deploy. Commit cập nhật docs sau đó cần kiểm CI riêng theo HEAD. Xem BUG_FIX_LOG.

AUD-018 (2026-10-25, baseline `6bf2069`): bổ sung regression/fixture còn thiếu vào Git, giữ tests/local được ignore. Build production có gate chặn test module và kiểm allowlist dist; 38 unit/check/build cùng hai negative checks PASS. Chỉ deploy dist; URL test production NOT RUN, chưa deploy. Chi tiết BUG_FIX_LOG và DEPLOYMENT.

Lượt AUD-017 tiếp tục trên cùng branch, baseline `ff8c567`, giữ phạm vi thiết kế đã được chấp nhận. Gate Prettier nguyên bản FAIL ở 27 file không sửa, đã xác nhận chỉ khác CRLF checkout so với blob LF tại HEAD; kiểm tra EOL auto toàn code PASS. Chi tiết QA-A19. Không format toàn repo, không thay dependency/schema/policy/Auth server hoặc deploy. Ảnh Auth QA-A18 đã chuyển từ docs/qa sang tests/local/artifacts theo yêu cầu gom output local, không đưa lên Git.

Admin đã tồn tại. Đối chiếu [ADMIN_SETUP](ADMIN_SETUP.md) để xác minh server signup/anonymous sign-ins đang tắt; không tạo thêm admin. Tiếp tục nghiệm thu login/logout/CMS/upload/private file/signed expiry/thumbnail/sync với phiên thật trong một lượt có mục tiêu. Không yêu cầu password/OTP/token qua chat.

Gate chưa xong: native filechooser/OS (QA-A10 File API đã PASS); real admin/non-admin JWT, upload/partial failure và file revoke thực, offline/session expiry, Safari/iPhone/Android thật, full backup/restore, xác minh hosting 0 USD và audience. Không báo hoàn thành sản phẩm hoặc public deployment khi thiếu gate này. [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) map Phase 0–6; [QA_REPORT](QA_REPORT.md) giữ chi tiết test thay vì nối log tại đây.
