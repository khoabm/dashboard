# Hosted reachability follow-up — 2026-10-28

**ENDPOINT REACHABILITY VERIFIED; AUTHENTICATED BROWSER E2E BLOCKED.** Application implementation remains at `eae719a60d2a8ea761cb2a890eb98b16987dee61`; this follow-up changes documentation only. PR5 remains open/Draft → develop. No backend defect was established and no runtime fix was made. The prior integration snapshot below remains historical evidence, not a claim that the new probe timed out.

## Diagnosis and bounded evidence

One additional non-mutating anonymous `POST /functions/v1/grades-admin`, public publishable key only, `Origin: http://localhost:4173`, synthetic zero class UUID, no Authorization header, no redirects/retries, maximum14 seconds. This is a command-line HTTP check, **not browser CORS or administrator authentication evidence**. Response content was discarded, and no request/response credential or sensitive diagnostic was recorded.

| Measurement | Actual result |
| --- | --- |
| UTC start/end |2026-10-28T06:31:11.447Z / 06:31:19.846Z (13:31:11–13:31:19 Vietnam) |
| curl exit / HTTP status |0 / **401**,139 response bytes; body not retained |
| DNS / TCP connect |0.000047s / 0.000466s, cumulative curl milestones |
| TLS completed / first response byte / total |7.751933s / 8.379330s / 8.379439s, cumulative milestones |
| Proxy CONNECT |200; no proxy address, credentials or network configuration inspected/changed |
| Function status |grades-admin ACTIVE v2 / verify_jwt=true; student-lookup ACTIVE v2 / verify_jwt=false |
| Runtime logs |grades-admin Boot26ms at06:31:19.788Z; timing correlates with this probe, but no request-ID join was available |

The endpoint returned an actual HTTP authorization rejection within the frontend14-second budget. This proves HTTP reachability from the Work executor now. It does not prove browser reachability, authenticated administration, response CORS, or successful business operations. Because the body was deliberately not decoded, the exact gateway-versus-handler rejection layer is unclassified.

**Previous8-second timeout:** exact original failing stage remains unproven. The new request required8.379s, with TLS completion at the cumulative7.752s milestone; an8-second deadline can therefore expire before the response on this path. This supports a transport/deadline explanation and gives no justification for modifying Edge logic or increasing the frontend timeout. It does not establish that the old request had the same timing. Current evidence excludes a complete current endpoint connectivity outage, not intermittent networking or unrelated backend faults.

Four finite read-only log queries were used adaptively: source counts; attribute-name discovery; a projection of status/path/runtime lifecycle fields; a post-probe function-specific projection. No raw headers, IP addresses, JWT fields, body/rows or free-form error messages were requested. The first window showed grades-admin Boot32ms at06:10:53.249Z and Shutdown/EarlyDrop at06:12:08.267Z. Neither is joined to the original request, so **arrival of the old probe at the handler is NOT CONFIRMED**. No function invocation status was present in the returned function-specific projection. Boot/EarlyDrop alone does not establish startup failure or server misconfiguration; no observed configuration503 or CORS403 supports either diagnosis. No log polling or further HTTP retry was performed.

## Origin and secure-session boundary

The Sites managed-preview contract requires the exact daemon URL `http://terminal.local:4173/`; it does not support substituting localhost or running a second server. The accepted last-recorded server origin is `http://localhost:4173`. Source validates exact configured origins, without wildcards. Consequently **no working Gradebook browser UAT origin in Work has been demonstrated**. Do not treat a command-line Origin header as browser-origin verification or use a proxy/header rewrite to circumvent this restriction.

No new Site/HTTPS host was created: a new origin would require reviewed hosting cost/audience and an exact server allowlist change, outside this diagnostic scope. No browser sign-in was attempted before origin feasibility was established. The cloud browser inventory contained only a blank tab; no existing application session was reused or extracted. Secure handoff is not the first blocker and asking the owner to sign into terminal.local would not resolve the origin mismatch. No alternate credential acquisition, new account or manufactured session is permitted.

Temporary opt-in was **not activated in this follow-up**, because browser-to-Edge reachability at an accepted origin could not be established. `.env.local` remains absent in this checkout and public/default transport remains disabled. Use the already authorized owner-operated localhost path below; this Work execution did not access the owner's device.

## Current minimum acceptance matrix

| Essential journey | Status / evidence |
| --- | --- |
| Anonymous teacher endpoint |**PASS for this one HTTP401 only**; application versus gateway layer unclassified, not a non-admin JWT test |
| Existing admin login; class/student create/read/update; roster preview/apply |**BLOCKED fresh E2E**: no accepted browser origin/session; synthetic fixture not inspected or established, zero writes |
| Score edit/import/exact decimals/atomic invalid batch; publish/unpublish |**BLOCKED fresh E2E**; accepted unchanged offline/native/earlier hosted evidence retained, not rerun |
| Student verification, own grades, semester switching, aggregate-only histogram |**BLOCKED fresh E2E**; no student endpoint requests sent in this follow-up |
| Neutral invalid pair; unpublished data; expired/revoked capability; non-admin teacher denial |**BLOCKED fresh E2E**; no production fault injection or limiter exhaustion; unchanged accepted security evidence retained |
| Existing Board |Prior zero-row HTTP200 and source compatibility evidence retained; new browser/session/CRUD/attachment smoke **NOT RUN** |

No new business defect is demonstrated; no critical unexecuted flow is labeled PASS or merely DEFERRED. Source compilation/offline tests alone are not functional completion. Extended browser/device/cosmetic testing and unaffected suites remain DEFERRED.

## Single smallest external action and owner reproduction

**Owner runs the existing app on the already authorized `http://localhost:4173` and signs into the existing admin using its normal UI.** This one owner-operated UAT session supplies the origin and secure-session prerequisites together, without new hosting or server settings. Never send credentials, JWTs, identifiers, private scores or browser network exports to chat.

1. Use `feature/personal-gradebook` at the latest documented HEAD. If the checkout has local changes, preserve them before switching/pulling; do not reset. Use the existing locked dependencies, or `npm ci` only when needed.
2. Edit the ignored `.env.local` to set only `VITE_GRADEBOOK_ENABLED=true`, preserving any existing public project configuration. Do not copy the placeholder values from `.env.example` or add private/server credentials. Start `npm run dev`; open exactly `http://localhost:4173` in the owner's browser. Do not use terminal.local or a public tunnel. This is an owner procedure, not an action performed by Work.
3. Sign in through the normal existing administrator login, open Gradebook, and perform only the initial read. Record safe HTTP status/stage and whether the catalog/class loads. If timeout/429/503 occurs, stop without retry. That read proves actual browser-to-Edge reachability only when its response arrives; a visible login screen alone does not.
4. Before any mutation, inspect the class/data state privately. Do not assume the active class is disposable. Continue the existing essential UAT steps below only if the owner explicitly identifies that scope as synthetic/disposable; otherwise report `SYNTHETIC_SCOPE_BLOCKED` and stop writes. No new real class or overwritten metadata is required merely for testing.
5. In that safe scope, run each essential teacher/student journey once, sequentially, as detailed in the retained UAT checklist. Use one valid import and one invalid atomic batch; stop on the first unexpected result rather than repeating until success. Reuse the accepted unchanged limiter/fault/security evidence where appropriate. Board mutations/attachments require their own disposable scope; otherwise report the smoke boundary honestly.
6. Report only categories: origin, source SHA, admin/class read PASS/FAIL/status, synthetic scope confirmed/blocked, import counts, publication/semester/histogram/privacy results, request/write totals if available, and NOT RUN items. Do not share passwords, token values, raw student rows, network exports or sensitive screenshots. Restore the previous ignored config/default-disabled state after the session.

If step3 fails, the next action is diagnosis of that precise status/stage, not an origin wildcard, Auth/RLS change or deployment. A new reviewed operational scope is required before any server setting/secret/function/migration change.

## Accounting and preserved gates

This follow-up: **5 Supabase connector reads** (one function-status call + four log queries), **1 direct hosted HTTP request**, **0 retries**, **0 database SQL queries**, **0 application data/key reads or writes**, **0 Auth login attempts**, **0 deployments/migrations/secret changes**, **0 new CI runs requested**, **0 owner-device operations**. Read-only log SQL executes in the logging service, not the application PostgreSQL database. Provider-internal events visible in logs are not actions by this execution. No services/resources/plans were created or upgraded; existing Free boundary retained. These counts exclude GitHub source/PR operations and GitHub's own automatic checks, if any.

Docs-only validation: relative links, evidence-state/credential-pattern review, changed-file scope and `git diff --check`. No unchanged source/unit/build/G07 suites were rerun. G07 Technical PASS, owner synthetic local/Drive PASS, Operational/Overall PARTIAL remain intact. Owner conditional project authorization is retained; no institutional/legal evidence was invented. G08 remains BLOCKED. PR5 stays Draft; no merge into develop or public deployment. **Current outcome remains INTEGRATED / HTTP REACHABLE / AUTHENTICATED BROWSER E2E BLOCKED**, not FUNCTIONALLY VERIFIED or PRODUCTION READY.

---

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
