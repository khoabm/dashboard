# CP01-B5 — offline CI/runtime handoff (2026-10-26)

## Current policy correction / baselinec9e18c1 (supersedes SQL CI approval)

**CURATED CODE-QUALITY CI IMPLEMENTED; EXACT-HEAD ACTIONS BLOCKED BY PR CONFLICT.** Input local/remote feature HEAD `c9e18c173d70198bce8cc53d39a93271e395e181`, develop `307b6c611ca36d8d8e05a6cccf8dadd86d754a30`. Working tree initially contained11 staged files from the now-superseded SQL approval, not a new commit. Only PGlite/SQL CI dependency, command, workflow step and the new ad-hoc runner are removed. Accepted Edge syntax, Prettier3.6.2/lock, formatting, static build, B1–B4 code and prior evidence are preserved.

The latest instruction permits CI only for syntax/static checks, format, build and curated component/pure units. It prohibits API/HTTP endpoints, Supabase Auth/RPC/Storage/Edge integration **even with mocked transport**, all SQL/PGlite/PostgreSQL/migrations, browser E2E and stress/load. More cases are not a quality metric. AGENTS/TESTING and explicit package scripts now reflect this policy. No new test/probe/curl/runner file was created for this correction.

### Consolidated concern/test matrix — agreed before edits

| Concern | Minimal planned evidence / scope | Disposition |
| --- | --- | --- |
| Syntax/format/build | Retain frontend +13 Edge syntax/static, pinned formatter, static output gate | Run required code-quality gate once after final edits; actual result appended below |
| CI component/unit coverage | Six explicit stable unit files, no wildcard discovery or SDK/endpoint/SQL suite | test:ci is the maintained allowlist; npm test delegates to it; specialists have a separate manual command |
| Edge production integrity | No B1–B4 or SQL/config changes; retain previous crypto/DTO/retry evidence | Static diff verification; not new Auth/runtime/security acceptance |
| Board regression | Navigation geometry, draft data-loss boundaries, pending-task ownership, error mapping, validation | Keep component/pure-unit protections; exclude service/browser integration |
| Cost and cleanliness | One finite gate, no dependency downloads needed; remove superseded PGlite/runner | No full120-test repeat; inventory all non-CI assets before eventual merge |
| PR conflict / exact-HEAD CI | Inspect PR metadata and three-way conflict content without merge/rebase | GB-B5-REV-001/P1 OPEN; exact-HEAD Actions BLOCKED until separately authorized reconciliation |

### CI inclusion/exclusion audit

| Files | Classification | CI disposition / owner |
| --- | --- | --- |
| tests/gradebook-contracts.test.js | Pure B1 decimal/BIGINT/identity/date/Vietnam-day/import/framing codecs, including finite timezone subprocess vectors | INCLUDE; code-level contracts only, no DB/Auth/HTTP |
| tests/board-navigation.test.js | Component geometry/anchor calculations with synthetic layout | INCLUDE; no browser or service |
| tests/dom.test.js | Pure safe error-message mapping, including PT409 | INCLUDE; no HTTP execution |
| tests/drafts.test.js | Local draft serialization/recovery/atomicity with memory storage and synthetic File callbacks | INCLUDE; no Supabase/IndexedDB service integration |
| tests/pending-task.test.js | Pure pending-state ownership/duplicate suppression with controlled promises | INCLUDE; no request transport |
| tests/validation.test.js | Pure URL/file-signature/search/order/restore/quota arithmetic | INCLUDE; no upload or quota probing |
| tests/auth-session.test.js | Real SDK Auth/session with mocked transport | EXCLUDE; specialist Auth/security verification, separately scoped CP01-C/Board acceptance |
| tests/reliability.test.js | Board/Storage service and paging/fault-injection integration with mocks | EXCLUDE; specialist Board reliability acceptance, not lightweight CI |
| tests/gradebook-edge.test.js | Mixed crypto + handler HTTP/Auth/RPC/limiter/SDK integration | EXCLUDE whole file to avoid executing mixed endpoint tests; prior B4 evidence retained, CP01-C specialist owner |
| tests/gradebook-runtime.test.js | Entry-point/SDK graph through Node Deno adapter | EXCLUDE; specialist B5 runtime handoff, not native Deno evidence |
| tests/check-production-build.mjs | Static deployable output allowlist | INCLUDE via npm run build; not an endpoint test |

`test:ci` explicitly lists exactly the six approved .test.js files. `test:specialist` explicitly lists the four excluded .test.js files and is never called by CI. A manual command is not authorization to run it. No new test extraction or redundant crypto/SDK cases are added just to populate CI. Losing specialist coverage in CI is deliberate policy, not proof that integration is safe; retain historical evidence and its remaining gates.

### Non-production assets outside the eventual develop merge

These assets remain on the feature branch for now to avoid premature loss. **Do not treat their executable status as merge readiness.** Before eventual merge, review and retain them on a separate specialist/verification branch or another approved location outside the merge set, then remove them from the proposed develop diff in a separately authorized cleanup. No such deletion/move is performed here.

| Exact inventory not used by approved CI | Proposed disposition before merge / owner |
| --- | --- |
| tests/auth-session.test.js, tests/reliability.test.js, tests/gradebook-edge.test.js, tests/gradebook-runtime.test.js | Retain separately as specialist regression assets; B5 runtime / CP01-C / Board acceptance owners |
| tests/business-conflict-sql.mjs, tests/gradebook-b2-sql.mjs, tests/gradebook-b3-sql.mjs, tests/gradebook-conflicts-sql.mjs, tests/gradebook-reveal-sql.mjs | Retain separately for approved disposable/native SQL verification; never CI or automatic hosted execution |
| tests/gradebook/b2-bootstrap.sql, supabase/tests/access.sql | Retain separately with SQL verification assets and their role/fixture prerequisites; CP01-C/security owner |
| tests/audit.html, tests/audit-fixture.js, tests/session.html, tests/session-fixture.js, tests/viewport.html | Retain separately for authorized browser acceptance; never bootstrap hosted app by default |
| tests/api-smoke.mjs, tests/editor.html | Legacy live-capable probes: propose removal from eventual develop source after checking references/retention; no new replacement probe; explicit authorization required for any live use |

The new scripts/test-gradebook-sql.mjs had never been committed and was removed outright with its dependency/CI step. package-lock is byte-identical to c9e18c1. Existing tests/README.md is retained as documentation; tests/check-production-build.mjs and the six approved unit files are the only test code currently intended for CI/develop retention without further specialist review.

### PR conflict and minimal resolution plan — GB-B5-REV-001/P1

PR5 was verified Draft/open, merged=false, mergeable=false, mergeable_state=dirty at c9e18c1 against develop307b6c6. [GitHub event rule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request): pull_request workflows do not run while merge conflicts exist. Do not poll, change to pull_request_target, broaden triggers or claim an unrelated green run.

Read-only Git2.51.1 three-tree diagnostic used merge-base `af43f51c8df70b5e51ec4c574ab432ec0d944d30`, develop307b6c6 and featurec9e18c1, without touching index/working tree/refs. **Only docs/BUG_FIX_LOG.md contains conflict markers:** develop adds AUD-020 and feature adds Gradebook entries at the same introductory insertion point. docs/STATUS.md is also changed in both branches but has no conflict markers. Source blob evidence is recorded in the review correction log; diagnostics do not resolve a conflict or guarantee future branch state.

Minimal future plan, not executed: separately authorize a normal non-rebased develop-into-feature reconciliation; combine AUD-020 plus every Gradebook finding/history once in dated order, never whole-file ours/theirs. Review incoming develop CSS/SPEC and status changes, run affected checks, push normally, keep PR Draft, then capture actual exact-head PR CI. No merge/rebase, force-push, develop edit, PR merge or automatic next checkpoint occurs in this task. Final PR/head/Actions observations are reported after push.

### Retained evidence and limits — GB-B5-REV-002/P2

At c9e18c1: check/build/format PASS and120/120 Node tests PASS. Before the superseding instruction, the temporary PGlite runner executed once:13/13 conflict and7/7 reveal groups PASS in disposable memory. This historical result is retained truthfully; **PGlite wiring is withdrawn, not part of final CI or a new final-SHA result.** No additional SQL/specialist test is run after the policy change.

PGlite is supplementary WASM regression, not native PostgreSQL17, deployed Auth/JWT/RLS/Data API, real Edge runtime, multi-connection locking or internal PostgREST retry evidence. Native17, Deno/bundle, migration rollout reconciliation, CP01-C and real-personal-data gates remain NOT RUN. CON-001/002/004 prior static/offline evidence is preserved without a new integration PASS; CON-003 formatter/static checks remain valid but runtime/Actions pending; CON-005 hosted Supabase/Auth/migrations/deployments0, secretsNO, real dataNONE, stress/load/soak/stretchNONE.

### Current focused verification

One final-code gate on Linux/Node24.22.1/npm11.9.0, later documentation-only edits:

| Command / check | Actual result |
| --- | --- |
| npm run check | PASS, frontend +13 Edge syntax/static and scoped credential checks |
| npm run test:ci | PASS66/66,0 failures/skips,566.01ms; six explicit component/pure-unit files only |
| npm run build | PASS,71 modules,226ms Vite build; static output allowlist PASS |
| npm run format:check | PASS, real local Prettier3.6.2, no registry download |
| git diff --check | PASS, checked again only after documentation edits |
| Static unit import-closure audit | PASS,19 local test/source files, no SDK imports or fetch/createClient/rpc calls |
| Dependency/source preservation | PASS, package-lock byte-identical to c9e18c1, no PGlite package/runner, all B1–B4/SQL/tests unchanged |

No full120-test repetition, SQL, API, specialist integration, browser or hosted verification after the superseding policy. npm ci is not rerun locally because dependencies/lock returned to the accepted baseline. Exact-final-SHA Actions is a distinct BLOCKED gate while PR remains dirty, not an inferred PASS from these local results. Every tracked tests/ and supabase/tests/ asset is accounted for in the CI/retention inventory above.

---

## Historical initial B5 handoff / baseline8f2bcfb

**PARTIAL IMPLEMENTATION / BLOCKED — SQL execution CI dependency approval.** Repository khoabm/dashboard, feature/personal-gradebook; accepted input/local/remote HEAD `8f2bcfbffbdac45fc8e0d16a2b7169ef084d9459`, clean. No intervening commits. The commit containing this report anchors the final code; its exact GitHub Actions outcome is reported separately after publication, not inferred here. B4 accepted as draft; CP01-C/CP02 and real-data gate NOT RUN.

## Coverage audit and minimal changes

| Area | Baseline gap | B5 disposition |
| --- | --- | --- |
| Edge syntax | scripts/check.mjs traversed src only | Now checks all13 Edge JS files, including both entrypoints, in addition to frontend. |
| Secret scan | Existing frontend rule rejects the service-role env variable name | Frontend rule unchanged. Separate Edge scan rejects literal secret-key/JWT patterns, permits named server env references; it is a guard, not proof of absence of every secret format. |
| Format | Edge omitted; npx offline check failed ENOTCACHED | Exact prettier3.6.2 devDependency/lock, local npm binary, Edge glob added to existing format/check scripts. Existing scopes retained. |
| B1/B4/Board unit | Already tests/*.test.js | Discovery unchanged;120/120 tests now PASS, including the new runtime adapter. |
| B3 SQL | Separate .mjs scripts require PGLITE_MODULE_PATH, not unit discovery | Effective PT409 body-hash guard remains in the Node suite. Disposable SQL execution is **not wired into CI**; existing external PGlite harness/history retained. This gap prevents a complete B5 verdict. |
| Runtime graph | Node --check does not resolve npm: or execute entrypoints | New Node24 adapter imports actual two entrypoints, maps only exact npm:@supabase/supabase-js@2.118.0 to installed2.118.0, resolves shared/B1 graph and captures Deno.serve. Native Deno/bundle NOT RUN. |
| GitHub Actions | One offline workflow; no final-SHA run | Same commands/triggers/permissions, clearer step names. A user-authorized Draft PR may trigger it after verifying workflow inventory; never auto-merge. |

The attempted combined install of Prettier and @electric-sql/pglite was rejected by automatic approval review before mutation: only Prettier's new dependency was explicitly approved. No PGlite addition/download was performed and no alternative install route was used. A safer Prettier-only installation succeeded once. **A separately explicit approval is needed to add a pinned test-only PGlite dependency and lock entry before completing SQL CI wiring.** Existing test runtime is0.5.11/PG18.6 WASM, not native17. No product/security behavior was changed to work around this tooling gate.

## Exact source/tooling verification

Environment: Linux, Node24.22.1, npm11.9.0, SDK2.118.0, Prettier3.6.2. One successful authorized dependency installation:

```bash
npm install --save-dev --save-exact prettier@3.6.2 --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000
```

Lock diff adds only Prettier; all existing package entries/versions unchanged. Previous ENOTCACHED meant pinned npx package was missing from cache, not a syntax/format PASS. Formatter now actually runs from npm's local binary after locked dependency installation.

Only11 shared Edge modules, the existing Edge test and changed/new tooling test/check files needed formatting. Entrypoints were already formatted; no frontend/B1/SQL formatting. Formatting command:

```bash
node node_modules/prettier/bin/prettier.cjs --write 'supabase/functions/**/*.js' tests/gradebook-edge.test.js tests/gradebook-runtime.test.js scripts/check.mjs
```

An initial ad-hoc AST comparison flagged Prettier's equivalent quoted/unquoted Vary object key. After explicitly normalizing only noncomputed property keys plus locations/comments, Babel AST comparison PASS for all12 pre-existing B4 code/test files changed by formatting. No functional B4 changes. This was a diagnostic-normalization issue, not a failed product regression.

After the final executable-code/tooling edits, these commands ran **once on the same tree**; later edits are documentation only:

| Command | Actual result |
| --- | --- |
| npm run check | PASS: frontend +13 Edge modules, scoped credential scan, whitespace |
| npm test | PASS120/120,0 failures/skips,956.65ms; real Web Crypto and SDK with synthetic transports |
| npm run build | PASS,71 modules,355ms Vite build; output allowlist PASS |
| npm run format:check | PASS, local exact3.6.2; existing frontend/test/scripts plus Edge source |
| git diff --check | PASS; repeated only after documentation edits, no suite rerun |

The120-test run newly executes B1 exact decimal/calendar/Vietnam-midnight vectors, B4 Auth/admin rejection/capsule expiry/epochs/crypto/key generations/redaction/import conflicts/CORS/timeout/no-retry cases, and existing Board regressions. Prior SQL test results remain historical, **not rerun or relabeled**. No additional duplicate tests were added for these established boundaries.

## Runtime and production boundary

`tests/gradebook-runtime.test.js` loads the actual two index.js files through a Node module hook and a synthetic Deno.env/serve adapter; Web Crypto, Request/Response and AbortController execute under Node. OPTIONS returns204, missing teacher authorization401, unknown student operation400, and fetch attempts0. It starts no service, authenticates nobody and supplies only synthetic key material. **It cannot establish native Deno type checking, npm transitive resolution/lock reproducibility, Supabase CLI bundling or gateway behavior.**

Static TOML parsing confirms exact entrypoint paths, grades-admin verify_jwt=true and student-lookup verify_jwt=false. Supabase supports npm: imports; shared source resolves to the original B1 modules outside functions/. Packaging of those relative imports must still be exercised with an appropriate Deno/Supabase runtime before deployment. No Deno executable is installed; no runtime/framework was installed to obtain an artificial PASS. Native Deno/Edge bundle is **NOT RUN / remaining B5 runtime gate**. An eventual bounded cached graph check must forbid uncached downloads, not launch a service or contact a project.

Existing Vite production graph/output checks PASS. Static review finds no frontend imports of server modules; no server secret environment names or Edge modules appear in built JS. No server env is exposed via VITE variables. SQL/B1/frontend/config.toml and all accepted migrations remain byte-identical.

References reviewed: [Supabase dependencies](https://supabase.com/docs/guides/functions/dependencies), [Deno check](https://docs.deno.com/runtime/reference/cli/check/), [PGlite in-memory runtime](https://pglite.dev/docs/). Public documentation reads are not hosted project requests. No Deno configuration or production import protocol was changed.

## CI safety and unresolved coverage

At source inspection both feature and remote develop307b6c6 contain only .github/workflows/ci.yml: npm ci/check/test/build/format, Node24, contents:read, ten-minute timeout. No deploy/hosted/live-test step, Supabase credential, workflow call, browser startup or SQL remote connection. PR CI normally tests GitHub's synthetic merge ref; identify the run's head_sha as the exact final feature commit, and distinguish that from native source-only execution. Do not substitute another SHA or green Node CI for missing SQL/native runtime evidence.

The broad legacy B3 test includes60 sequential limiter calls and501 expired fixtures. It is **not executed or newly scheduled** in this quota-limited B5 slice. A later approved minimal SQL CI change should prioritize existing focused gradebook-conflicts-sql.mjs and gradebook-reveal-sql.mjs (synthetic in-memory DB only), without adding volume/stress cases or live credentials. Adding those checks requires dependency approval and one focused verification of the new wiring; no full Node suite repeat merely for PASS counts.

Local npm ci was not repeated after the one authorized install; GitHub's locked-install step must provide its own evidence at final SHA. No Actions outcome existed when this report was committed. The final user-facing report must give the actual PR/run result or NOT RUN, without rewriting this historical publication-time statement.

## Carried-forward concerns

| Concern | B5 disposition | Remaining owner |
| --- | --- | --- |
| GB-B4-CON-001 | Prior static assessment retained; SQL unchanged; native17 NOT RUN | CP01-C, strict guards unchanged |
| GB-B4-CON-002 | PASS offline;120-test run includes reveal/AES/HMAC/redaction cases | Hosted Auth/RLS/redaction, recovery and real-data gate remain CP01-C/separate authorization |
| GB-B4-CON-003 | Prettier PASS; Node entrypoint adapter PASS; native Deno NOT RUN; exact-SHA CI reported separately; SQL CI BLOCKED | B5 dependency/runtime/CI handoff remains incomplete |
| GB-B4-CON-004 | PASS static/offline, including PT409 terminal response and single failed-write call counts | Hosted/internal PostgREST retries NOT RUN; genuine engine40001 remains unavailable, no retry |
| GB-B4-CON-005 | Hosted Supabase/Auth/API/SQL/metadata/log requests0, migrations0, Edge deployments0, production secretsNO | Migration rollout reconciliation, CP01-C and real-data gate NOT RUN |

Synthetic data only. Stress/load/soak/stretchNONE. No PR merge, deployment, migration ledger edits or paid resource. **B5 is not declared complete while SQL CI wiring remains blocked; CP01-C/CP02 and real-personal-data acceptance do not start automatically.**
