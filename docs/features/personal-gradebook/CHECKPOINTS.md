# Execution plan and acceptance gates — Personal Gradebook

**Status: CP00 documentation readiness PASS (docs-only); CP01–CP07 implementation NOT STARTED.** This plan follows BRIEF V1.1 / user D01–D05 (2026-10-26). Documentation checks do not prove a schema, API, security control or feature works. Add dated SHA/evidence at acceptance; never tick implementation boxes from a plan or unrelated CI.

CP01-A is a separately authorized **technical-design** slice: [design and original read-only evidence](CP01_TECHNICAL_DESIGN.md), baseline `f522266`; [accepted refinements GB-A-REV-001..003](CP01_TECHNICAL_DESIGN.md#143-accepted-refinement-disposition) reviewed from `31f887bd`, 2026-10-26. **DESIGN REFINED / READY**, documentation checks only. CP01-B implementation remains NOT STARTED; CP01-C security acceptance and the real-data gate remain NOT RUN. Separate requests are required; no implementation acceptance box is checked by design alone.

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
| GB-01, GB-09 | Header/menu in `src/components/board.js`; small route lifecycle in `src/main.js`; existing CSS/dialog/pending/request gates; feature UI under `src/components/gradebook/` | CP02, CP06 |
| GB-02, GB-03 | Existing admin session; proposed lookup/admin service under `src/services/gradebook/`; two Functions and server RPCs per DATA_AND_SECURITY | CP01–CP03, CP06 |
| GB-04, GB-05 | Ordered seeded catalogs, shared table/dropdown/template mapping (labels remain canonical in BRIEF) | CP01, CP04–CP06 |
| GB-06, GB-07 | One score model, exact decimal/import helpers proposed under `src/utils/gradebook/`, bounded roster/score UI | CP01, CP03, CP04, CP06 |
| GB-08 | Student table and on-demand modal chart using existing dialog/pending; no teacher chart | CP05, CP06 |

Paths are planning candidates, not permission to create modules or abstractions. Frontend regression/fixtures stay in `tests/`; local outputs in ignored `tests/local/`. Server/migration tests use conventional feature subfolders, with exact commands chosen in CP01 and CI coverage added when implemented.

## CP01 — Data model and security (NOT STARTED)

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

## CP02 — Navigation and lookup UI (NOT STARTED)

Dependency: CP01 API contract; synthetic UI may use clearly labeled mocks before authorized live integration. Reuse one admin Auth state, clear student capability/private DOM on route exit/expiry, and fence responses after navigation/logout.

- [ ] Hamburger at far left; Bảng học liệu/Bảng điểm cá nhân; keyboard/focus/close/menu responsive.
- [ ] Deep-link `/bang-diem` loads and refreshes on selected static host; existing public board unaffected.
- [ ] CMND/CCCD 9–12 ASCII digits, retain leading zeros; `DD/MM/YYYY` validated datepicker desktop/mobile, date-only API/storage contract and cross-timezone/midnight cases T19.
- [ ] Invalid/unknown, rate-limited and unavailable-limit-state responses reveal no student existence; loading/error/retry, no plaintext persistent storage or URL credentials; do not call sensitive reads after denial.
- [ ] Return to verification on expiry/refresh; anonymous grade direct requests remain denied.

## CP03 — Class/student admin and UPSERT roster import (NOT STARTED)

Dependency: CP01 transactional/admin/identity contract and CP02 admin navigation. Synthetic-only until §H real-data gate is evidenced, even if UI works.

- [ ] Single active class: edit name/year independently even with scores; IDs/relationships/score values/publication remain unchanged. No new class/rollover or old year-label snapshot promise.
- [ ] Student create/list/edit/deactivate or safe delete, with both mandatory fields; optional name; no `HS001` key field.
- [ ] Mask identity in teacher list; explicit authorized reveal only.
- [ ] Excel + CSV roster accepts **both** header layouts: `CMND/CCCD`, `Ngày sinh` alone, or `Họ tên`, `CMND/CCCD`, `Ngày sinh`; optional header may be entirely absent. Preview INSERT/UPDATE/unchanged/error counts; row/column errors and in-file duplicate identities detected.
- [ ] New document INSERTs; existing document + same DOB permits name UPDATE; different DOB blocks entire batch. Blank name preserves existing name; no imported identity/DOB/class/active-status edits or silent reactivation under §F technical allowlist. Authorized manual identity correction remains separate.
- [ ] One atomic batch; mixed valid/invalid rows change nothing, including existing records. Stale preview/concurrent CRUD refreshes preview before commit; no frontend per-row writes.
- [ ] CSV and XLSX fixtures for **two-column-only import**, three columns with blank/missing names, and UPSERT that preserves existing names; leading zero, Excel date, malformed/empty/duplicate file, mixed valid+invalid and retry tests.

## CP04 — Teacher point CRUD, import and publication (NOT STARTED)

Dependency: CP01 + CP03; verify publication/import locks and authorized preview semantics together. No real data before §H.

- [ ] Two semester contexts with all eight subjects and seven score labels/order via catalogs; don't label any visible column `TX1`.
- [ ] Manually add/edit/remove scores with confirmations and pending feedback.
- [ ] Excel + CSV score import contains only CMND/CCCD, Ngày sinh, Môn and seven exact score headers; semester selected on UI.
- [ ] Match student via protected ID + DOB; multiple rows of the same student in different subjects valid. Unknown/mismatched student, repeated nonblank score coordinate or invalid decimal blocks whole file, never last-write-wins.
- [ ] Preview INSERT/UPDATE/unchanged/error by score coordinate and skipped blanks. Missing slot INSERTs, changed raw value UPDATEs, equal value unchanged. Blank never clears/writes 0. Transaction preserves all previous values on failure; same-value rows do not rewrite timestamps.
- [ ] Raw decimal-string values with ≤5 fractional digits survive form/Excel/CSV/API/DB writes and sorting. Excess precision rejects instead of rounding; only display/grouping rounds to one decimal. Reconfirm stale previews after concurrent edits.
- [ ] Publish/unpublish each semester independently; missing-data warning; block imports while published and warn on manual edits.

## CP05 — Student board and per-cell histogram modal (NOT STARTED)

Dependency: CP01/02 and CP04 publication/data contract. Real-data access additionally requires §H; statistical suppression is outside V1.

- [ ] Verified student sees only own published grades and two **Học kỳ I / Học kỳ II** tabs, not two tables on one screen.
- [ ] Exact names/order everywhere; null/absent displays `—`; 0 remains 0; mobile table/card responsive.
- [ ] Clicking/tapping cell opens selected subject+score column modal; two dropdowns and progress/errors.
- [ ] X-axis point scale 0–10, Y-axis number of pupils; aggregate only, no other pupil identities/rows.
- [ ] Exact raw personal point retained; highlight **correct rounded-tenth bucket** and label grouping honestly. Empty score shows no highlight.
- [ ] One chart on demand, no all-56 prefetch; bottom-sheet/near-fullscreen mobile; keyboard/ESC/focus restore/scroll.
- [ ] Unpublished semester returns no histogram even with old token; no peer names/identities/DOB/raw scores reach client. Own raw score is separate from aggregate API data.
- [ ] Inference risk recorded as Accepted/Deferred for V1; no minimum cohort, bucket suppression, extra table or privacy framework. Lack of suppression does not fail CP05.

## CP06 — Integration, regression, and QA (NOT STARTED)

Dependency: CP01–CP05 integration. Keep separate evidence for offline units, browser Codex/IAB, approved live API/Auth/RLS, migration verification and §H data-governance acceptance; none substitutes for the others.

- [ ] Existing public resource board, CRUD/reorder, drafts/file, admin Auth/session, nav and loading tests remain green.
- [ ] Exact label/order test for eight subjects/seven columns in UI, modal, CSV/Excel template and import parser.
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

**CP00 documentation readiness PASS; CP01–CP07 remain NOT STARTED.** This status does not assert runtime/Auth/RLS/browser security acceptance, authorize applying migration or pass the real-data gate.
