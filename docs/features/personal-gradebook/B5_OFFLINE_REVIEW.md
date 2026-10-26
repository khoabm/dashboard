# CP01-B5 — offline CI/runtime handoff (2026-10-26)

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
