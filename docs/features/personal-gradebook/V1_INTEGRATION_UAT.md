# Personal Gradebook V1 — integrated source and UAT handoff

2026-10-28. **IMPLEMENTATION INTEGRATED; FRESH HOSTED E2E BLOCKED — not a functional-completion or production-ready claim.** PR5 remains Draft → develop. This is the current evidence summary; older implementation/NOT IMPLEMENTED snapshots in BRIEF/readiness are historical, not missing-feature assertions.

## Integration and functional inventory

GitHub verified feature/personal-gradebook atbeede038 and G07 reviewed ebc3b6b: ancestor confirmed, exactly8 commits ahead, no divergence. Fast-forward applied to feature/personal-gradebook, preserving all19 G07 changed files and approved workflows. No merge into develop/main. G07 Technical PASS; owner-reported local and Drive PASS; Operational/Overall PARTIAL; G08 institutional evidence remains BLOCKED.

No missing business implementation was found in the reviewed boundary: src/app.js already wires createGradebookAdmin to the existing Board verified-session owner, teacher catalog to that admin transport, roster/score readers and student verify/read to the actual Edge transport. CP06-B already implemented these; no duplicate adapter, new framework or success mock fallback was added. Exact decimal strings, positional imports, independent semesters, aggregate-only student chart and memory-only capability behavior are preserved. Production transport stays explicit opt-in; `.env.example` now documents VITE_GRADEBOOK_ENABLED=false and how authorized synthetic UAT opts in. No production default or server security contract is weakened.

## Current environment and request accounting

Existing project vgciiqtwmxcdqppntgnt only. Four bounded metadata reads: list_projects; get_organization (free/tier_free); list_edge_functions (grades-admin/student-lookup ACTIVE v2, verify_jwt true/false respectively); one read-only SQL returning PG17.11, nine migration ledger versions,6 Gradebook tables/all RLS true. Ledger: Board20261023150359/151152/151459/152049 and20261026034549; Gradebook20261027173228/173300/173313/173327. No new migration, deployment, RLS/Auth setting or secret operation.

Two direct HTTP attempts with public configuration only, explicit8-second deadline and no retry: public Board select=id&limit=0 returned200/empty array; anonymous grades-admin POST with last-recorded approved localhost4173 Origin timed out. Timeout is inconclusive, not an authorization deny PASS. Hosted HTTP checks stopped at that boundary: planned invalid-pair student request NOT SENT. No role/password/JWT/private key acquisition, owner session extraction or student rows read. No hosted writes. Counts do not include independent GitHub checks/CI or public package documentation reads. No automatic retry, stress/load/limiter exhaustion.

## Actual verification this execution

| Check | Result and boundary |
| --- | --- |
| Four frontend/teacher/roster/score/student pure suites |47/47 PASS, one invocation; privacy projections, exact decimals/invalid batch, import confirmation/late-response/catalog cases; not actual DB transactions |
| Existing transport specialist |8/8 PASS, one invocation: actual adapter code with synthetic HTTP Responses and network denial; operation families, session fencing, terminal errors/422, student capability metadata and privacy. Not hosted/API proof |
| npm run check |PASS:13 Edge modules syntax, scoped credential scan, diff whitespace |
| npm run format:check |PASS, pinned3.6.2, no whole-repo reformat |
| npm run build |PASS default-disabled after removing temporary ignored opt-in env;679 modules and production test/source exclusion PASS; known lazy chart530.59kB warning retained |
| Cloud Chrome direct route |Actual http://terminal.local:4173/personal-gradebook rendered existing form; invalid abc/empty DOB submit showed both local field errors and kept focus on identifier. No valid-pair submit or hosted data claim |
| Preview |Initial missing vite due dependency placement repaired using exact already-installed dependencies (no package/lock change); daemon preview started, stopped after QA. No new Site, hosting, public URL or deployment |
| Source/production contract |Application/runtime/migration/lock/workflow source unchanged from accepted integration; only opt-in example and docs updated |

No physical device/Safari/cosmetic matrix, broad benchmark, unaffected historical suite, G07 drill or native SQL replay was repeated. These are DEFERRED, not PASS.

## Flow acceptance — distinguish prior evidence from current execution

| Flow | Current fresh acceptance | Retained accepted evidence / remaining check |
| --- | --- | --- |
| Teacher login/class/student/roster CSV-XLSX/UPSERT |BLOCKED for fresh hosted E2E |Prior actual CP01-C owner Chrome/admin synthetic journey and offline CP06-B retained; current metadata/adapters/55 offline checks do not prove a new authenticated journey |
| Scores/edit/delete/import/atomic validation/publish |BLOCKED for fresh hosted E2E |Prior native transaction/precision/invalid-batch rollback and actual import/publication evidence retained; no hosted mutation or live batch in this round |
| Student verify/own grades/semester/histogram |BLOCKED for fresh hosted E2E |Current cloud form/local validation PASS only. Prior actual G02 capability/own/aggregate/publication/epoch checks retained; new verify/read not sent after timeout |
| Board compatibility |PASS for bounded public zero-row read; BLOCKED for fresh auth/CRUD/attachment smoke |Board source byte-unchanged; prior Board/nav/draft/session evidence retained. No production Board content edited |

Critical authorization/integrity: prior G01/G03–G06 native/disposable Auth/API evidence in CP06_OFFLINE_READINESS and prior hosted G02 remain applicable to unchanged runtime. This round does not claim new anon/non-admin deny, limiter failure, cross-student isolation, unpublished/expired/revoked denial or database atomicity from mocks. Those critical fresh checks remain BLOCKED/NOT RUN where the current hosted/admin boundary prevents execution; they are not downgraded to noncritical DEFERRED.

## Reproducible owner UAT — approved synthetic scope only

1. Use current feature source on an authorized environment with the last-recorded exact origin http://localhost:4173; confirm current GB_ALLOWED_ORIGINS from an authorized operator without exposing secret values. Cloud preview terminal.local is not demonstrated approved by the server. Changing origins/secret configuration or deploying a new environment requires its reviewed authorized scope; no such change was made here.
2. In ignored `.env.local` set only VITE_GRADEBOOK_ENABLED=true and, if needed, verified project URL/public publishable key. Do not copy placeholder project/key into a working config; do not add tokens/keyrings. Restart Vite/rebuild. Keep public/release default disabled. No public frontend deployment authorized.
3. Owner signs into the existing admin through the normal secure UI; never send password/JWT to chat. Open Gradebook admin. Use only an explicitly marked authorized synthetic class/roster. If the active class contains real students, stop before writes and obtain exact synthetic isolation/fixture scope. Do not overwrite real class/year/student/score rows for QA.
4. In that synthetic scope, verify class/year edit, student create/list/edit/deactivate; two-column document+DOB CSV and XLSX roster preview→confirm. Confirm INSERT/UPDATE/unchanged/errors, no duplicate coordinates, invalid DOB/conflicting pair prevents apply. Record safe counts/categories only; no screenshots/raw identifiers/scores in public artifacts.
5. Select semester, verify8/7 catalog order; put8.12345, reject sixth digit without rounding, edit/delete with correct revisions/confirmation. Import score CSV/XLSX using physical A–J, blank skip and proper decimal-string handling. An invalid row must make the whole batch zero-write. Publish/unpublish each semester independently; capture safe counts/metadata evidence with authorized verifier, not raw records.
6. In a separate anonymous context, use authorized synthetic pair only: verify, own grades, semester switch and selected histogram/subject/column. Confirm aggregate-only buckets and personal highlight. Unpublish must deny that semester; invalid pair remains neutral. Verify revoked/expired capability and peer substitution only using bounded approved fixtures; do not load/stress the shared limiter to test it.
7. Verify current real admin/non-admin/anonymous teacher access and invalid-batch rollback via actual permitted API/DB evidence, not hidden controls. Limiter outage/fault injection belongs in disposable tests, never break the live project. Reuse unchanged accepted fault evidence; any newly required hosted operation must have finite case/request/write scope.
8. Board smoke under separate authorized test scope: public published read, existing session/nav/direct refresh, one disposable draft CRUD/attachment cycle only if exact file/content/cleanup permissions are approved. Do not edit production Board content merely to close this checklist.
9. For any unexpected401/403,429,503,timeout or traffic anomaly: stop that hosted activity; do not retry mutation or bypass checks. Record stage/status/request counts privately; leave real-data use and cutover closed if evidence is missing. Restore default-disabled local config after QA.

## Owner authorization and release gates

Owner's current statement is recorded as project authorization: real-information use requirements approved conditional on the agreed design, and Work may implement/integrate/synthetically verify V1. This is not fabricated institution/legal sign-off or evidence that G08 documentary/operational requirements were completed. Missing evidence affects real-data operations and release only, not independent implementation/synthetic tasks. No new business requirement/OTP/password/suppression/weighted grading/teacher histogram is introduced.

Smallest remaining prerequisites: stable authorized Edge path and verified UAT origin; a secure existing-admin sign-in/session in the chosen QA environment; bounded synthetic fixture/write scope; actual fresh critical flow evidence; institution/G08 and production custody/exporter evidence for real data. These are not requests to repeat approved A–F design decisions. Optional Drive metadata P3, Safari/devices/extra viewport polish/broad regression remain DEFERRED. PR5 stays Draft; no merge/deploy/public activation.
