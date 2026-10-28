# CP07 finalization / G08 handoff — 2026-10-28

**CP07 SOURCE REVIEW PASS / READY FOR OWNER MERGE DECISION; G07/G08 AND DEPLOYMENT NOT ACCEPTED.** Baseline `6754e00f654721e8f1bbba2b405029ea1e7ce293`: PR #10 merged into `feature/personal-gradebook` with identical reviewed UI source tree; PR #5 is Ready for review → `develop`, not yet merged. Exact-baseline GitHub Actions [run 40683942523](https://github.com/khoabm/dashboard/actions/runs/40683942523) PASS: curated unit/component 131/131, static/syntax checks, production build/exclusion, Prettier. [Independent PR #5 CP07 code review](https://github.com/khoabm/dashboard/pull/5#pullrequestreview-5682738845) found no new confirmed P1/P2 in reviewed source. This **does not** establish fresh hosted browser E2E, full CP01-C security acceptance or permission to deploy real student data.

**Agreed continuation:** close source/docs regression inventory → owner-authorized PR #5 merge to `develop` (Gradebook default-disabled) → retain G07 operational backup/key custody/recovery gate → G08 authorized-data readiness and scoped owner-supplied dataset UAT → separately approved hosting/deployment/production smoke and real-data activation. The owner will supply the reference data **at G08, not during CP07**. Do not import real CCCD/DOB/scores into CI, GitHub, synthetic fixtures or chat. Verify purpose/processing scope, applicable data and custody approvals privately before any real-data write. G07 Operational PARTIAL; G08 institutional/real-data release evidence still BLOCKED per current [authorization record](G08_OWNER_AUTHORIZATION.md). No real-data writes, origin/CORS changes, Site deployment or main merge authorized by this note. Older dated snapshots below are historical.

---

# V1 hosted reachability — 2026-10-28

One authorized14-second anonymous probe returned HTTP401 in8.379s (TLS milestone7.752s); the old8-second timeout is not proof of an Edge defect. Both Functions ACTIVE v2; no request-ID correlation confirms old handler arrival. [Exact timing, bounded logs, matrix and minimal owner localhost UAT](V1_INTEGRATION_UAT.md). Managed terminal.local differs from the accepted localhost origin: authenticated browser E2E remains BLOCKED; no runtime correction justified. Five connector reads/one HTTP request/zero retries, data writes, DB SQL, Auth attempts, deploys or new CI requests. Source unchanged; default transport disabled. PR5 Draft. G07 Technical/local/Drive PASS retained, Operational/Overall PARTIAL; conditional owner project authorization retained, G08 institutional evidence BLOCKED. Earlier snapshots below are historical.

---

# G07 owner synthetic rehearsal — 2026-10-28

Owner-reported Windows local and manual Drive round-trip PASS (baseline0679367); [evidence and limitations](G07_OWNER_REHEARSAL_20261028.md). Receipts local/remote PASS, database recovery NOT_RUN. Phone notes are not physical paper custody; paper/replacement-device/owner native PostgreSQL restore NOT RUN; production exporter/validator and G08 BLOCKED. Technical PASS retained; Operational/Overall PARTIAL. New stderr/ACL correction is documentation only, Windows NOT RUN for corrected snippet. Work owner-device/Drive/Supabase/key/data access0, new CI0, no merge/deploy. Earlier entries below are historical.

---

# G07 manual operational readiness — 2026-10-28

Approved A–F replaces USB/emergency/daily/RPO proposals: personal private Drive only, sole owner, independent age identities/paper custody, manual triggers, latest+previous verified. [Policy/manual guide](G07_OWNER_DECISIONS.md). Technical PASS retained from910ac0ae/run40623615581, no rerun. Operational PARTIAL/BLOCKED: owner physical custody/Drive round-trip/production exporter and G08 not verified. No transfer/hosted/real data/owner-local execution or new CI. Older entries below are historical.

---

# G07 technical acceptance — 2026-10-28

G07 TECHNICAL PASS; operational BLOCKED—owner decisions; overall PARTIAL. G08 BLOCKED. Native run40623615581 at910ac0ae SUCCESS; all3 additional runs used. Same-cluster synthetic proof only; real-data/institution/custody gates remain closed. [Evidence and owner package](G07_BACKUP_RECOVERY.md). Older entries below retain their baseline context.

---

# Execution plan and acceptance gates — Personal Gradebook

**G07/G08 preparation (2026-10-28, baseline `beede038...`):** [age backup/custody/runbook and per-requirement evidence](G07_BACKUP_RECOVERY.md); [owner/institution decision package](G08_OWNER_AUTHORIZATION.md). New actual-age offline19-case verification PASS; native17 permission-restore workflow prepared but NOT RUN pending approved publication/execution. G07 remains PARTIAL/operational custody BLOCKED; G08 BLOCKED. No real data, hosted Supabase calls, Drive upload, owner-computer work, merge or deploy.

**Current status (2026-10-28): CP00/CP01-A accepted; CP01-B1–B5/offline source accepted; CP02–CP05 and CP06-B OFFLINE ACCEPTED. CP01-C remains PARTIAL: cloud-only G01/G03–G06 technical evidence PASS; G02 prior PASS retained; G07 synthetic recovery PASS/operational custody BLOCKED; G08 BLOCKED. Four hosted migrations/two deployed Edge Functions unchanged; no hosted operations in cloud verification. CP07 NOT STARTED.** [Current G01–G08 scope/SHA/run evidence](CP06_OFFLINE_READINESS.md#cp01-c--cloud-only-security-verification--2026-10-28); [prior CP01-C evidence/limits](CP06_OFFLINE_READINESS.md#cp01-c--bounded-hosted-acceptance--2026-10-28). Earlier dated B5/B4/NOT STARTED snapshots below are historical and do not override current source/deployment evidence. Acceptance boxes remain evidence-specific, never inferred from documentation or CI.

**2026-10-26 B5 superseding policy / baselinec9e18c1:** remove only newly staged PGlite/SQL CI/runner; retain accepted B5 and prior evidence. [One consolidated concern/test matrix and non-CI pre-merge inventory](B5_OFFLINE_REVIEW.md#current-policy-correction--baselinec9e18c1-supersedes-sql-ci-approval). Explicit test:ci covers six component/pure-unit files; specialists/SQL/browser excluded and retained separately pending review, no new probe/test file. Temporary20 SQL groups and earlier120 Node tests are historical only. PR5 Draft/dirty (BUG_FIX_LOG), no reconciliation; Actions/native17/Deno/CP01-C/real-data gates remain pending. Current curated gate66/66 PASS, syntax/static/build/format/diff PASS; no specialist/SQL rerun. No automatic CP01-C/CP02.

**2026-10-26 B5 / baseline8f2bcfb:** [gap matrix, actual commands and remaining gates](B5_OFFLINE_REVIEW.md).13 Edge files now checked/formatted; exact locked Prettier3.6.2 availability resolved, Node adapter checks actual entrypoints/pinned SDK graph offline. Final-code checks PASS, tests120/120 PASS, build/format/diff PASS. SQL execution CI still BLOCKED by unapproved PGlite dependency; no workaround. Native Deno/bundle NOT RUN; Actions exact-SHA outcome reported after publication. CON-001 native17 remains CP01-C; CON-002/004 offline tests PASS; CON-003 partial; CON-005 hosted0. No CP01-C/CP02/real-data gate started. Earlier B5 NOT STARTED entries are historical.

**2026-10-26 GB-B4-REV-001 / baselinee036521e:** added only x-client-info to shared OPTIONS header allowlist. [Actual SDK header evidence and concern preservation](B4_INTEGRATION_REVIEW.md#gb-b4-rev-001--sdk-cors-correction-2026-10-26). Focused preflight/HTTP regression4/4 PASS; syntax/diff PASS; no backend work during OPTIONS. Existing CON-002/004 evidence unchanged, no crypto/SQL/Auth/retry edits; CON-001 native17 NOT RUN / CP01-C, CON-003 format/CI NOT RUN / B5, CON-005 hosted0. B5 NOT STARTED; CP01-C and real-data gate NOT RUN. FIXED means draft source/offline regression, not hosted deployment.

**Historical 2026-10-26 FIX-REVEAL / baseline76102e2:** GB-B4-INT-001/P1 **FIXED IN DRAFT / READY FOR REVIEW**, migration20261026060000 adds stored identityLookup/lookupKeyVersion only to the existing server-only reveal RPC. [Evidence and boundaries](B4_INTEGRATION_REVIEW.md): one focused disposable SQL run7/7 groups PASS, preserved authorization/ACL/metadata/audit and eight PT409 branches; ordinary DTO unchanged. Hosted requests0, migration NOT APPLIED, B4 Web Crypto NOT RUN. The earlier preflight blocker is addressed in the draft chain; B4/B5 remain NOT STARTED and no integration/security gate is accepted.

CP01-A is a separately authorized **technical-design** slice: [design and original read-only evidence](CP01_TECHNICAL_DESIGN.md), baseline `f522266`; [accepted refinements GB-A-REV-001..003](CP01_TECHNICAL_DESIGN.md#143-accepted-refinement-disposition) reviewed from `31f887bd`, 2026-10-26. **DESIGN REFINED / READY**, documentation checks only. CP01-B1/B2 are ACCEPTED; CP01-B3 correction is ACCEPTED at static/offline review only; CP01-B4 READY FOR REVIEW; B5 NOT STARTED; CP01-C security acceptance and the real-data gate remain NOT RUN. Separate requests are required; no implementation acceptance box is checked by design alone.

**2026-10-26 B4 / baseline29a7f2a:** two Edge entrypoints, shared modules/config and synthetic tests implemented; [mandatory concern table and evidence](B4_INTEGRATION_REVIEW.md#cp01-b4-implementation--mandatory-concern-confirmations-2026-10-26). CON-002/004 PASS offline; CON-001 static PASS/native17 NOT RUN; CON-003 formatter NOT RUN ENOTCACHED; CON-005 hosted0 scope PASS. First29/29 plus affected2/2 and additional3/3 targeted tests PASS, not a repeated full34-test run. P2 GB-B4-001 corrected before deployment; GB-B4-002 publication-race mapping corrected with2/2 affected cases PASS. B4 READY FOR REVIEW only; B5/CP01-C/real-data gates unchanged. Earlier B4 NOT STARTED/crypto NOT RUN statements are historical and not deployed acceptance.

## Operating workflow for Codex

1. Verify current branch/HEAD and existing `develop` baseline; do not assume the branch still equals initial planning SHA. Read [README](README.md) → [BRIEF](BRIEF.md) and the specific part of [DATA_AND_SECURITY](DATA_AND_SECURITY.md). Open [root AGENTS](../../../AGENTS.md), code style and relevant target files before changes.
2. Implement **one checkpoint or tightly dependent slice at a time**. Announce scope, files, migration implications, regression risks, expected verification before editing. Keep changes diff-minimal and do not silently broaden UI labels or business logic.
3. Maintain conventional tests for new logic; use synthetic identities and fake responses. Test server policy with actual JWT/anon identities on a safe authorized environment where necessary; never describe mock-only result as “RLS verified”.
4. Migrations/secret provisioning/server deployments **require explicit authorization** per execution request; do not use this plan as automatic permission. Do not create a second Supabase project or a paid resource. Never edit/seed real student records while testing. Do not merge/deploy until requested.
5. Check no regression in resource board, admin sessions/loading/media and existing CI on exact SHA. Report FAIL/NOT RUN/BLOCKED honestly. Update related architecture/status/decisions and this tracker without duplicating full BRIEF.
6. The [real personal data gate](DATA_AND_SECURITY.md#h-real-personal-data-gate) is separate and **NOT RUN** until evidenced; require it before real entry/import in any checkpoint. Use synthetic records beforehand. Gate status is not waived by deployment/merge authorization.

## CP00 — Documentation readiness PASS; implementation/security acceptance NOT RUN

Deliverables: existing branch baseline/develop comparison, consistent GB-01..09 specification, proposed route/module inventory, findings disposition and test/dependency plan. Do not recreate/merge/rebase the branch to close a baseline gap. No application/database changes.

Documentation acceptance (reviewed with documentation evidence only):
- [x] Confirm feature baseline and newer `develop` SHA/CI at the documented review time; do not confuse this with CI for the feature HEAD.
- [x] Map GB-01..09 to proposed modules, tests and exact labels/order, without claiming those modules exist.
- [x] Review scope against current public board/Auth/SQL inventory and zero-cost constraint; actual integration checks remain CP01–CP06.
- [x] GB-REV-001..008 each resolved in documentation or explicitly Accepted/Deferred; distinguish user D01–D05 from technical defaults.
- [x] No current import prohibition on UPDATE; five-place decimal/API contract, editable year metadata, deferred histogram inference and measurable limiter design consistent across docs.
- [x] Docs-only links, literal labels/order and diff checks reported in the correction evidence below; further optional-column clarification added with targeted doc review.

**Unmet implementation gates (not CP00 docs blockers):** exact-feature-HEAD CI and browser QA, live security/API/RLS evidence, migrations, personal-data permission/backup gate. These remain NOT RUN until authorized and tested.

<a id="cp00-finding-dispositions"></a>

### CP00 finding dispositions

Documentation correction only, baseline `cc13962`, 2026-10-26. RESOLVED means the specification was corrected, **not** that backend/security tests passed. Latest user decisions override the earlier review's suggested remedies.

Docs-only evidence 2026-10-26 at `eba7c18e`: eight Markdown files, 54 relative links/anchors validated, literal 8/7 labels and 10 score-import headers unchanged, no stale active import/history/suppression rules, `git diff --check` PASS. The subsequent P2 clarification explicitly permits two-column-only roster files and aligns CP00 readiness wording; validate its diff separately rather than attributing it to the earlier check. Documentation is ready for requesting CP01 planning. Code/unit/browser/DB/Auth/migration/security acceptance **NOT RUN in this correction**; checkpoint checkboxes below still require their own evidence, including exact-HEAD CI when implementation begins. These checks do not certify all CP00 functional/integration conditions or the real-data gate.

| Finding | Documentation status | Resolution / verification owner |
| --- | --- | --- |
| GB-REV-001 | RESOLVED | BRIEF GB-06; DATA §A exact decimal-string/≤5-place contract; CP01/04/06 round-trip tests |
| GB-REV-002 | RESOLVED | BRIEF GB-01 mutable metadata and accepted label-history trade-off; DATA §A/B; CP03/06 no score mutation |
| GB-REV-003 | RESOLVED | BRIEF GB-07 UPSERT, same student/different subjects valid; DATA §E/F; CP03/04/06 atomicity and duplicates |
| GB-REV-004 | ACCEPTED / DEFERRED | BRIEF GB-08; DATA §D; CP05 keeps authorization/publication/aggregate-only, no suppression gate V1 |
| GB-REV-005 | RESOLVED | Approved behavior + proposed measurable defaults in DATA §D; CP01/02/06 verify concurrency/fail-closed, thresholds not yet verified |
| GB-REV-006 | RESOLVED | DATA §B/E server-role-only RPC bridge; CP01 verifies actual grants/transaction and no board regression |
| GB-REV-007 | RESOLVED | DATA §I class-scoped existing audit table proposal; CP01 verifies actor, compatibility and rollback |
| GB-REV-008 | RESOLVED | DATA §H gate before any real data; CP03/04 enforce, CP07 rechecks evidence; gate itself NOT RUN |

### Requirement / proposed module map (not files created)

| Requirements | Existing reuse / proposed additions | Acceptance |
| --- | --- | --- |
| GB-01, GB-09 | Shared `app-header.js`/`site-navigation.js`; route owner `src/app.js`; lazy Board `src/main.js`; disposable `student-lookup.js` with pure `gradebook-ui.js` state | CP02, CP06 |
| GB-02, GB-03 | Existing admin session; proposed lookup/admin service under `src/services/gradebook/`; two Functions and server RPCs per DATA_AND_SECURITY | CP01–CP03, CP06 |
| GB-04, GB-05 | Ordered seeded catalogs, shared table/dropdown/template mapping (labels remain canonical in BRIEF) | CP01, CP04–CP06 |
| GB-06, GB-07 | One score model, exact decimal/import helpers proposed under `src/utils/gradebook/`, bounded roster/score UI | CP01, CP03, CP04, CP06 |
| GB-08 | Student table and on-demand modal chart using existing dialog/pending; no teacher chart | CP05, CP06 |

Paths are planning candidates, not permission to create modules or abstractions. Frontend regression/fixtures stay in `tests/`; local outputs in ignored `tests/local/`. Server/migration tests use conventional feature subfolders, with exact commands chosen in CP01 and CI coverage added when implemented.

## CP01 — Data model and security (B1–B5 available; CP01-C PARTIAL)

Deliverables: reviewed additive migration(s), six-table model incl ordered catalogs, minimal secure Functions for identity and admin, unit/security checks, cost check; **do not apply without authorization**.

Dependency: corrected CP00 docs and explicit CP01 authorization. Review offline drafts first; separately authorize migration/deployment to an approved test environment before claiming live policy acceptance. No new paid project or real student data for testing.

Slice order: CP01-A → CP01-B → CP01-C. CP01-A must cover all [14 design sections](CP01_TECHNICAL_DESIGN.md) and pass documentation review; B follows the [implementation sequence](CP01_TECHNICAL_DESIGN.md#13-implementation-sequence-for-cp01-b), C owns the [live acceptance matrix](CP01_TECHNICAL_DESIGN.md#12-test-and-acceptance-matrix). CP02–CP07 and the real-data gate remain separate. Design/metadata inspection is not a mock/live security test.

Acceptance:
- [ ] Correct student auto-ID; two mandatory fields; secure encrypted+blind-index identity; UNIQUE duplicates per class.
- [ ] Exact eight subject labels and seven column labels/order seeded; no scattered hard-coded copies, no separate semester table.
- [ ] Scale-free NUMERIC + decimal-string API, ≤5 fractional digits, reject excess precision before write; exact cases from DATA_AND_SECURITY §A round-trip without rounding, including UPDATE; 0 vs absent and composite PK verified.
- [ ] §E server-only SECURITY INVOKER RPC bridge: atomic UPSERT, minimal grants, no exposed grade tables; existing board/private helpers unaffected. Verify effective privileges/defaults, not object names alone.
- [ ] Preview fingerprint follows CP01-A §8.2/T09.1–10: existing/missing identities and coordinates, canonical raw values plus revisions, class/catalog/key context, bound/expiring token with no exposed personal state, locked stale comparison and atomic audit. B1/B3/B4 offline evidence does not substitute for actual DB/API races in C.
- [ ] Anon/direct Data API SELECT/INSERT/UPDATE/DELETE for grade/private records denied; existing board public reads unchanged.
- [ ] Teacher API verifies real admin profile + JWT before writes/reveal; unauthorized/non-admin/expired admin denied.
- [ ] Student API checks pair, §D per-document/global budgets, malformed/unknown/changing IDs, exact boundaries and concurrent requests; denied counters persist; limiter error/timeout fails closed before sensitive reads. Thresholds/TTL remain technical defaults pending actual test evidence.
- [ ] Capability expiry/global class/student revocation and requested-semester publication checked on every read; unpublish does not invalidate the other semester's capability access. Same-token republish and locking/response boundary follow CP01-A T05.1–7; actual DB/API C evidence required. Aggregate-only histogram, inference deferred, no suppression gate.
- [ ] Date-only DOB contract and Asia/Ho_Chi_Minh future-date reference follow CP01-A §3.2/T19.1–5; B1 codecs/Excel contract and B3 RPC validation, actual DATE/API tests in C, no UTC/browser-zone shifts.
- [ ] Reversible encryption/HMAC keys versioned/protected; no secret in bundle; synthetic rotation/recovery, migration/rollback notes and security review. §H remains NOT RUN for real data until all required evidence exists.
- [ ] §I class-UUID audit with verified admin actor, allowlisted event/counts and no PII/score payload; mutation + audit rollback together; do not reuse board UUID-row trigger on BIGINT/composite keys.
- [ ] Document exact test evidence (mock vs live, approved environment) and gate status.

### CP01-B4 handoff — retry-safety rule

> Historical handoff status snapshot (2026-10-26). B4/B5 implementation labels below are superseded by the current status above; retry-safety and hosted-authorization rules still apply.

- Trước Edge/RPC development, đọc [GB-OPS-001 recurrence warning](../../DATABASE.md#cảnh-báo-tái-diễn-gb-ops-001--sqlstate-retryable-cho-xung-đột-nghiệp-vụ). **Không tự raise 40001/class-40 retryable cho business conflict**, không tự retry mutation/PT409/timeout/limiter denial. Phải review error mapping và behavior của client, Edge và PostgREST; genuine PostgreSQL serialization errors không được sửa thành business conflicts.
- Board hotfix APPLIED theo metadata đã ghi. Ba lượt live smoke test Board BLOCKED trước đăng nhập/RPC vì thiếu secure auth/transport; HTTP409/internal retry vẫn NOT RUN. **Không đòi chạy lại Board smoke test để bắt đầu soạn B4 offline**.
- B2/B3/correction đều **NOT APPLIED**. B4 chỉ được implement Edge handler/crypto/auth/capability/preview signing với synthetic fixtures và focused offline tests. Không tự deploy, cấp secrets, đăng nhập Auth thật, gọi hosted hay dùng dữ liệu học sinh thật.
- B5/CP01-C và real-data gate là bước nghiệm thu riêng, gồm kiểm tra rollout pending migrations theo [DATABASE](../../DATABASE.md#gradebook-migration-rollout-gate--gb-ops-rev-002) và security evidence khi có phê duyệt và budget.
- **Mandatory B4 reviewer confirmation:** [GB-B4-CON-001..005 register](B4_INTEGRATION_REVIEW.md#cp01-b4-reviewer-concerns--mandatory-confirmation-register-2026-10-26). Work must explicitly report PostgreSQL17 compatibility as a CP01-C gate, Edge AES/HMAC + strict browser DTO redaction as a B4 P1 gate, previous Prettier ENOTCACHED as a B5 CI gate, PostgREST retry safety as B4 P1, and hosted/real-data restrictions. Each is PASS/FAIL/NOT RUN/BLOCKED with evidence; no implied PASS.
## CP02 — Navigation and lookup UI (OFFLINE ACCEPTED)

Dependency: CP01 API contract; synthetic UI may use clearly labeled mocks before authorized live integration. Reuse one admin Auth state, clear student capability/private DOM on route exit/expiry, and fence responses after navigation/logout.

- [x] Hamburger at far left; Bảng học liệu/Bảng điểm cá nhân; keyboard/focus/Escape/outside dismissal; responsive menu.
- [x] `/personal-gradebook` direct navigation, Back/Forward and local Vite refresh; Board lazy-loaded with preserved snapshot/draft flush. Reserved `/personal-gradebook/admin` remains unavailable.
- [ ] Deployed static-host SPA rewrite/direct refresh (NOT RUN; no deployment).
- [x] CMND/CCCD string validation, leading zeros, `DD/MM/YYYY` text/native date input, Gregorian/future/Vietnam-day validation via B1. Native calendar popup/device-specific behavior and live DATE round-trip remain separate gates.
- [x] Offline synthetic invalid/neutral/loading/unavailable/expiry states; cancellation and late-response fencing; no private URL/storage/log output. Production adapter always returns unavailable and makes no lookup request.
- [x] Memory-only state/private DOM cleared on exit, sign-out, expiry and refresh; synthetic regression and browser observations.
- [x] GB-CP02-REV-001: direct shared administrator entry waits for existing restoration; anonymous/admin/loading/failed states verified with pure units and installed headed Chrome synthetic QA, no extra Auth verification or synthetic click.
- [x] GB-CP02-REV-002: rejected Back/Forward uses indexed compensation, no history growth/draft loss; actual editor persistence-failure and recovery/Forward tested in installed Chrome, plus pure race/guard cases.
- [ ] Hosted anonymous access/JWT/RLS/Edge/limiter integration (CP01-C NOT RUN).

CP02 final correction baseline `1874cba`, 2026-10-26: [current evidence and limitations](../../STATUS.md#cp02--offline-student-lookup-ui--2026-10-26). Final unit79/79/check/build/format PASS; seven installed headed Chrome155 scenario outcomes at viewport1440×960/390×844, no console exceptions,31 synthetic REST interceptions/hosted forwarded0. Not native mobile/Safari or hosted authorization acceptance. Artifacts stay in ignored tests/local/cp02-final; no browser harness in CI/production. No CP03–05 or CP01-C started; final-SHA Actions reported separately after push.

## CP03 — Class/student admin and UPSERT roster import (OFFLINE ACCEPTED)

Dependency: CP01 transactional/admin/identity contract and CP02 admin navigation. UI implemented from baseline `1fcbf29`; production adapter fail-closed, no Gradebook transport. Synthetic-only until separately authorized CP01-C integration and §H real-data gate. [Current evidence](../../STATUS.md#cp03--classstudent-administration-and-roster-import--2026-10-26); [T01–T10 matrix](../../TESTING.md#cp03-offline-concern-matrix). Boxes below distinguish completed offline UI from unverified backend guarantees.

- [x] Offline class UI: create only after confirmed missing class; edit name/year independently with expectedRevision. Synthetic evidence preserves IDs/relationships/score/publication; no rollover/history promise.
- [x] Offline student create/list/edit/deactivate/reactivate/safe delete UI, required identity/date, optional name, no teacher-entered ID; conflict reload guidance, confirmations and backend score-delete guard handling.
- [x] Ordinary DTO projection hides identity; explicit per-student reveal confirmation, temporary memory-only output and cleanup on close/session/route/page lifecycle. Real authorization remains CP01-C.
- [x] Excel + CSV roster accepts **both positional layouts** (custom/duplicate/blank headers): 2 or 3 physical columns, trailing blanks and original source coordinates. Mapping and INSERT/UPDATE/unchanged/error preview precede confirmation; worker parsing and duplicate detection verified offline.
- [x] B4 roster.preview/apply UI contract, no per-row writes: new identity, matching-DOB name update, conflict blocking, blank-name preservation and separate manual correction verified synthetically; no reactivation fields sent.
- [ ] One atomic batch; mixed valid/invalid rows change nothing, including existing records. Stale preview/concurrent CRUD refreshes preview before commit; no frontend per-row writes.
- [x] Pure T01–T10 tests plus ignored actual-Chrome CSV/XLSX two/three-column fixtures: blank names, zeros, Excel dates, malformed/duplicate/conflicting inputs, stale/failing apply and cancellation. Synthetic fixtures are never production sources or CI integration tests.

The unchecked atomic/concurrency item requires real CP01-C evidence; offline acceptance never checks it by inference. Installed-Chrome18 scenario/component groups plus local curated90/90/static/build/format evidence establish CP03 OFFLINE ACCEPTED only. No CP04 or CP01-C started.

## CP04 — Teacher point CRUD, import and publication (OFFLINE ACCEPTED)

Dependency: CP01 + CP03; verify publication/import locks and authorized preview semantics together. No real data before §H. [Current implementation/evidence](../../STATUS.md#cp04--teacher-score-management-import-and-publication--2026-10-27), [T01–T14 matrix](../../TESTING.md#cp04-offline-concern-matrix). Below, checked items are offline UI/contracts only; production adapter remains fail-closed.

- [x] Two semester tabs, ordered eight-subject/seven-column catalog workspace; no technical abbreviations. Teacher catalog supplied by isolated QA adapter only; B4 catalog.read is now implemented in an undeployed draft, production hook still fails locally.
- [x] Manual put/delete with decimal strings, null expected absence/string revisions, delete confirmation, published-edit acknowledgement, pending/conflict/unknown-outcome handling and private cleanup.
- [x] CSV/XLSX ten physical A–J columns, customizable headers, preserved source positions/trailing slots/calendar dates/text identities and numeric XML score lexemes; selected semester before file; downloadable header-only templates.
- [x] Local coordinate/subject/decimal validation; same student/different subject allowed; synthetic server ID/DOB match/conflict and whole-batch rejection; no silent duplicate overwrite.
- [x] Server-owned preview/apply request contract and safe422 projection; INSERT/UPDATE/unchanged/error/skipped counts by coordinate, explicit class/semester/input/token/expiry confirmation, stale/error invalidation; one batch apply, no per-row writes.
- [x] Offline decimal strings/form/CSV/XLSX/provisional adapter writes and B1 exact sorting/display preserve ≤5 places; sixth/exponent/binary tails reject. Blank skips, zero writes. Unknown sent-write outcome requires explicit reload; no retry.
- [x] Independent publish/unpublish UI with class revision/confirmation; conservative possible-missing warning/acknowledgement (B4 has no missing-count preflight DTO); import lock and published manual warning verified synthetically.
- [ ] CP01-C: real authorization/publication locks, atomic rollback and same-value timestamp preservation, NUMERIC API/DB precision round-trip, teacher catalog/preflight integration. Offline mocks never check these by inference.

## CP05 — Student board and per-cell histogram modal (OFFLINE ACCEPTED)

**UI refinement merged:** PR7 merged at4fc986e into `feature/personal-gradebook`, preserving CP05 OFFLINE ACCEPTED. Current chart displays only occupied levels from the validated101-bucket aggregate, with responsive dataZoom; date picker and focus changes are included. [CP06-A evidence](CP06_OFFLINE_READINESS.md) supersedes the older resize/browser-pending snapshot for the executed local cases only. This does not complete CP01-C.

2026-10-27 reviewer corrections F01–F05, baseline a99569b: validated verify context, visual integer Y-axis/grid, bounded roving keyboard navigation and reset/expiry focus; maintained synthetic fixture and reproduction steps in tests/README.md. Current evidence in root STATUS; no hosted/CP01-C acceptance inferred.

Dependency: CP01/02 and CP04 publication/data contract. Real-data access additionally requires §H; statistical suppression is outside V1.

- [x] Verified student sees only own published grades and two **Học kỳ I / Học kỳ II** tabs, not two tables on one screen.
- [x] Exact names/order everywhere; null/absent displays `—`; 0 remains 0; mobile table/card responsive.
- [x] Clicking/tapping cell opens selected subject+score column modal; two dropdowns and progress/errors.
- [x] X-axis point scale 0–10, Y-axis number of pupils; aggregate only, no other pupil identities/rows.
- [x] Exact raw personal point retained; highlight **correct rounded-tenth bucket** and label grouping honestly. Empty score shows no highlight.
- [x] One chart on demand, no all-56 prefetch; bottom-sheet/near-fullscreen mobile; keyboard/ESC/focus restore/scroll.
- [ ] CP01-C real backend acceptance: unpublished semester returns no histogram even with old token; no peer names/identities/DOB/raw scores reach client. Own raw score is separate from aggregate API data.
- [x] Inference risk recorded as Accepted/Deferred for V1; no minimum cohort, bucket suppression, extra table or privacy framework. Lack of suppression does not fail CP05.


2026-10-27, baseline `741ee3d`: implementation and synthetic-only evidence in root STATUS. Checked items mean offline UI/contracts, never hosted authorization. Production verify/private reads remain unavailable. Native device/Safari, deployed deep links, CP01-C and real-data gate NOT RUN.

## CP06 — Integration, regression, and QA (A/B implemented offline; full checkpoint OPEN)

**CP06-A PASS offline / accepted e8333ef:** [A1 contract matrix, A2 pure projections and A3 regression/browser QA](CP06_OFFLINE_READINESS.md). B4-FIX-CATALOG adds catalog.read in an undeployed draft; production adapters remain disabled and publication missing-count preflight is unchanged/unimplemented. Offline work does not tick the DB/API/concurrency/security rows below; CP06-B OFFLINE ACCEPTED after independent review: frontend adapters implemented, opt-in transport disabled by default; Chrome plus targeted Codex/IAB360/390/768/1024/1440 evidence in CP06_OFFLINE_READINESS. Feature-branch publication authorized; full CP06/DB/API security gates remain open. CP07 NOT STARTED; CP01-C and real-data gate NOT RUN. Current root STATUS records evidence. Historical B5 six-file counts/PR conflict/candidate notes are not current-state claims.

Dependency: CP01–CP05 integration. Keep separate evidence for offline units, browser Codex/IAB, approved live API/Auth/RLS, migration verification and §H data-governance acceptance; none substitutes for the others.

- [ ] Existing public resource board, CRUD/reorder, drafts/file, admin Auth/session, nav and loading tests remain green.
- [ ] Exact catalog label/order test for eight subjects/seven columns in UI, modal and default CSV/Excel templates; parser uses physical positions and validates C subject values, not header labels.
- [ ] Duplicate and format validation, bad dates/identifiers, encrypted index, wrong DOB, throttle concurrency, admin denial, published/unpublished, token expiry.
- [ ] §A decimal cases across form/Excel/CSV/API/DB: `8.12345` accepted, `8.123456` rejected without rounding, `8.24/8.25/8.26` raw sort retained; 0/10 and out-of-range; INSERT/UPDATE/unchanged numeric equality, display rounding and correct histogram bucket. No precision-recovery claim for Excel.
- [ ] Class name/year metadata edits with existing scores do not UPDATE/move those scores or create class/student copies; old label snapshot is not promised.
- [ ] Roster UPSERT new/existing/DOB conflict/blank name, CSV/XLSX **without a `Họ tên` column**, existing names preserved; score INSERT/UPDATE/unchanged/blanks; same student different subjects; in-file duplicate coordinates; sixth decimal; mixed-error rollback preserves both old and new records.
- [ ] Concurrent UPSERT/manual edit and publish/import, stale preview, lost response + retry: constraints prevent duplicates; no unnoticed newer-edit overwrite, partial mutations or out-of-transaction audit. Denied limiter attempts remain counted; random identities, boundary bursts, cleanup/backlog and fail-closed tested.
- [ ] Carry forward accepted refinements: [T05.1–7/T09.1–10/T19.1–5](CP01_TECHNICAL_DESIGN.md#121-accepted-refinement-regression-cases-all-not-run) with their evidence types. Include same-token other-semester/republish behavior, missing→existing races, raw-score change without revision bump, equivalent decimals, private token payload and Vietnam date-only validation. Browser late-response/timezone checks remain distinct from CP01-C DB/API evidence.
- [ ] Browser Codex/IAB at 360/390/768/1024/1440 with click/keyboard/dialog; do not use machine Chrome for QA. Real device/Safari if available, otherwise NOT RUN/BLOCKED; iframe is not a device test.
- [ ] `npm ci`, `npm run check`, `npm test`, `npm run build`, `npm run format:check` and GitHub Offline CI on exact HEAD; separate real Auth/API/RLS checks where permitted.
- [ ] No secrets/PII/test fixture shipped in `dist`; file import data absent from Git/logs/storage.
- [ ] CI covers implemented server Functions/helpers as well as existing frontend checks; no live credentials in CI. Mocks do not prove real grants, policies, key recovery or publication enforcement.

## CP07 — Review, docs and eventual merge (NOT STARTED)

- [ ] Review final source and migration diff against BRIEF and existing board SPEC; no new framework or unexpected billable resource.
- [ ] Security review: residual pair-knowledge impersonation + Accepted/Deferred inference risk distinguished from mandatory server authorization/aggregate-only rules; no new suppression prerequisite for V1.
- [ ] Recheck §H evidence predates any real data; backup/recovery/key custody and authorized retention/deletion were not deferred until this checkpoint. Block real data if incomplete; synthetic development remains possible.
- [ ] Update `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/STATUS.md`, `docs/DECISIONS.md` where actually affected; avoid stale counts.
- [ ] PR with proof, migration status, warnings and open gates; **merge to develop only after explicit request and acceptance**.
- [ ] No implicit main merge or production deployment. Note teacher histogram/multi-class/weighted grades remain out of scope.

## Required completion report format

```text
Personal Gradebook CPxx — PASS | CHANGES REQUIRED | BLOCKED | NOT RUN
Branch: feature/personal-gradebook
HEAD: <full sha>
Scope / GB requirements: ...
Files and migrations: ...
What was actually changed (or not): ...
Checks: <command or API test> — PASS/FAIL/BLOCKED with evidence
Privacy/security checks: ...
Regression on existing KHTN8 Board: ...
Remaining risks / next checkpoint: ...
No merge/deploy/production personal-data write unless separately authorized.
```

**CP00 docs PASS; CP01-A design ready; B1 offline implementation ready for review; remaining implementation NOT STARTED.** This status does not assert runtime/Auth/RLS/browser security acceptance, authorize applying migration or pass the real-data gate.

## CP01-B1 — Exact-value contracts (2026-10-26)

> Historical implementation snapshot. NOT STARTED/READY/B5 labels describe that baseline only; use current status above. Original evidence and NOT RUN limitations are retained.

**PASS — READY FOR REVIEW (offline only).** Baseline `48ae91bdb722467432498b06bf218e22acd26db6`, branch `feature/personal-gradebook`; the commit containing this entry is the implementation evidence anchor. No newer feature commits at start; no merge/rebase of develop (feature ahead 6/behind 1 at baseline).

- Implemented five pure modules under `src/utils/gradebook/`: safe contract errors/field allowlists/identity and BIGINT text; exact decimal normalization/comparison/half-up display; Gregorian UI/API and Excel calendar codecs; bounded roster normalization/name intent and score-cell skip/value; UTF-8 framing and deterministic input transcripts.
- `tests/gradebook-contracts.test.js`: **37 new tests**; complete suite **78/78 PASS**, including all 41 existing tests. Runtime timezone subprocesses cover UTC−12/UTC/UTC+14; these are Node codec checks, not browser/device QA.
- `npm ci`, `npm run check`, `npm test`, `npm run build`, `npm run format:check`, `git diff --check`: PASS locally. No new dependencies; production output guard PASS. New utilities are not wired into the UI and are not shipped in the current application bundle. Exact-commit GitHub CI NOT RUN in this task; no PR created.
- Covers B1 acceptance for lexical precision (sixth zero rejected), exact numeric ordering/JSON, identity leading zeros, Vietnam reference-day future checks, 1900/1904 serials including fictitious leap day and time rejection, absent/blank/nonblank name and skip/zero distinctions, unknown fields, fixed tuple ordering/UTF-8 lengths and EXISTS/MISSING vectors.
- Scope detail and API signatures: source JSDoc and [B1 contract boundary](CP01_TECHNICAL_DESIGN.md#15-b1-implemented-contract-boundary). No claim of a complete PostgreSQL state fingerprint or token commitment.

B2–B5 remain **NOT STARTED**; CP01-C and real-personal-data gate **NOT RUN**. No migration/RPC/Function/UI or real student data created, no Supabase requests, no server changes, merge or deployment. XLSX file parsing, score-batch/catalog matching and full API operation DTOs remain later responsibilities; the B1 Excel codec is not an XLSX parser. Main CP01 acceptance boxes above remain unchecked because they require integration evidence.

## B1 review corrections — 2026-10-26

> Historical implementation snapshot. NOT STARTED/READY/B5 labels describe that baseline only; use current status above. Original evidence and NOT RUN limitations are retained.

Baseline `f810f03ab8f101607553d73c19438c7fff14689a`, same feature branch/local/remote and clean working tree before editing. The commit containing this entry is the fix anchor. GB-B1-REV-001/002 FIXED; GB-B1-REV-003 B1 mapping and design FIXED, full file/score importer DEFERRED CP03/CP04. BRIEF V1.2 supersedes literal header matching, not catalog/UI labels or UPSERT rules.

- [x] Trim then ≤200 Unicode-code-point name check; bounded raw input, malformed Unicode/NUL rejection; absent/blank/value retained.
- [x] Safe increasing source row numbers ≥2 with gaps; no sorting/placeholders; 2,000-data-row cap unchanged; canonical input binds actual source positions.
- [x] Width-2/3 roster mapping via positionalRosterRow; custom/duplicate/blank header text retained only for canonical binding. Stable row DTO keys, not header-derived keys. Width mismatch/hole rejected.
- [x] Focused regression for Unicode boundary/trim, sparse rows/order/unsafe values, mapping/headers/canonical binding and original row/physical-column cell errors.
- Local offline: **40 B1 / 81 total tests PASS**; npm ci/check/test/build/format:check and diff whitespace PASS. Existing 41 board regressions retained. No live/backend/browser acceptance inferred; exact-commit GitHub CI NOT RUN.

Future CP03/CP04 acceptance: parser preserves exact physical width including trailing empty columns/XLSX positions; skips only entirely empty physical rows and reports partial/invalid rows at original row/column; preview clearly shows A–J/roster mapping before confirmation. Renamed headers must not alter meaning; swapped valid numeric columns may be undetectable. No full parser, score importer or preview UI implemented here. B2–B5 NOT STARTED; CP01-C and real-data gate NOT RUN.

## CP01-B2 — Migration draft ready for review (2026-10-26)

> Historical implementation snapshot. NOT STARTED/READY/B5 labels describe that baseline only; use current status above. Original evidence and NOT RUN limitations are retained.

Baseline local/remote `282bebc89f630fe773c016c0ec7bb94b7681143e`, clean; develop `307b6c6`, no merge/rebase. Commit containing this entry anchors the draft. [B2 review](B2_MIGRATION_REVIEW.md) lists migration/tests, constraints, least privileges, helper owner preflight, audit dependencies and pre/post/rollback plan.

**PASS — DRAFT READY FOR REVIEW, NOT APPLIED TO SUPABASE.** One additive SQL file, six tables, ordered catalogs, RLS/no client policies, explicit server ACL and narrow boolean session helper. 18/18 disposable SQL groups PASS on PGlite 0.5.11 / PostgreSQL 18.6 WASM with synthetic Auth/Storage and four actual old migrations. Native PostgreSQL 17 and hosted API/JWT/security/concurrency acceptance NOT RUN. npm ci/check/test/build/format:check and diff check PASS; 81/81 app offline tests. No runtime/CI/dependency/frontend change. B3–B5 and CP02–CP07 NOT STARTED; CP01-C and real-data gate NOT RUN; no PR/deploy/merge.

Main CP01 integration acceptance boxes stay unchecked. SQL helpers/tables passing local synthetic tests are not the completed Gradebook backend. The timestamped draft was generated by CLI before automatic approval blocked telemetry; no retry or further CLI operation performed.

## CP01-B3 — transaction draft (2026-10-26)

> Historical implementation snapshot. NOT STARTED/READY/B5 labels describe that baseline only; use current status above. Original evidence and NOT RUN limitations are retained.

B2 accepted baseline `d86627f`. New `20261026030000_gradebook_transactions.sql` adds 22 service-only invoker RPCs, private validation/planner/framing helpers, shared import preview/apply/state hash, class-scoped audit and atomic limiter. Five prior migrations unchanged, no tables added. [B3 inventory, DTO signatures, evidence and limits](B3_TRANSACTION_REVIEW.md). B3 READY FOR REVIEW; B4/B5 NOT STARTED, CP01-C and real-data gate NOT RUN. 14 B3/18 B2 disposable SQL groups and81 app tests PASS; native17, multi-connection locks, hosted API/security and browser NOT RUN. Draft not applied. Earlier B3 NOT STARTED entries are historical.

## B3 focused conflict correction — 2026-10-26

> Historical implementation snapshot. NOT STARTED/READY/B5 labels describe that baseline only; use current status above. Original evidence and NOT RUN limitations are retained.

At `13292a3` baseline, GB-B3-REV-003 P1 confirmed eight application40001 paths. Additive20261026050000 corrective draft replaces them with PT409; no B2/B3/history rewrite. Correction offline13/13 SQL groups +4/4 DOM tests PASS, one focused execution each. No hosted requests, broad suite, quota/load/stress or migration deployment. Board conflict guidance fixed; GB-OPS-REV-002 rollout plan in DATABASE, GB-OPS-REV-003 policy remains RESOLVED. B4/B5 NOT STARTED, CP01-C and real-data gate NOT RUN. [Detailed correction evidence](B3_TRANSACTION_REVIEW.md#gb-b3-rev-003-correction--2026-10-26). This entry supersedes earlier B3 draft-ready/blocker summaries for this specific error-code finding; it does not certify unrelated B3 security/runtime behavior.
