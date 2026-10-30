# Cloudflare Pages release — 2026-10-28

## Confirmed deployment and remaining acceptance

**DEPLOYED; GRADEBOOK CONFIGURED; FULL UAT PARTIAL.** Owner explicitly approved [release PR #13](https://github.com/khoabm/dashboard/pull/13), merged into main as `cda0ad8cdcbd6bfc3b9803ed25f082f9c270c8bc`. [Post-merge Offline CI40719153983](https://github.com/khoabm/dashboard/actions/runs/40719153983) SUCCESS (read back after deployment). Cloudflare UI confirmed the same commit and successful production deployment `48628e34-c994-46b2-94d7-284669bd0ab7`.

- Project: `student-dashboard`; production URL: https://student-dashboard-bcy.pages.dev.
- GitHub App installation authorized for only khoabm/dashboard. Git production branch main, automatic production deployments ON; preview branches None/OFF, saved then reopened to verify.
- Build `npm run build`, output `dist`, preset None, Node24, VITE_GRADEBOOK_ENABLED=true. No secret keys in frontend build variables. First future merge-triggered update is not separately tested; initial setup deployed already-merged main.
- Owner requested removing khtn8 from the name. Cloudflare assigned the suffix-bcy; exact plain student-dashboard.pages.dev was not available in this flow. Owner-approved deletion removed both temporary projects khtn8-dashboard and khtn8-co-quynh. Cloudflare inventory showed only student-dashboard afterward.
- One approved Dashboard replacement updated only GB_ALLOWED_ORIGINS to `["http://localhost:4173","https://student-dashboard-bcy.pages.dev"]`. The previous public origin-list digest matched localhost-only before replacement; the new digest matched the intended two-item list afterward. Four keyring digests/timestamps unchanged; no plaintext keyring/credential read, regeneration, migration or Edge code deployment.
- Authorized synthetic cleanup receipt below remains valid. Do not re-import stale fixtures merely to exercise the live site.

### Finite hosted smoke and limits

Owner approved two separately bounded activities. First terminal activity stopped immediately on its first OPTIONS attempt with no HTTP response (transport/timeout classification); no retry or remaining3 calls. Server receipt of that attempt UNKNOWN. After reporting the stop, owner explicitly approved a new run outside the network sandbox, same four-request maximum and stop rules. The second run completed4/4, timeout15s per request, redirects rejected, no retry:

| Endpoint | Method/input | Observed result |
| --- | --- | --- |
| grades-admin | OPTIONS, exact production Origin | 204, exact allow-origin, no-store |
| student-lookup | OPTIONS, exact production Origin | 204, exact allow-origin, no-store |
| grades-admin | POST class.read, no JWT | 401, exact allow-origin, no-store |
| student-lookup | POST verify, missing identity pair | 400, exact allow-origin, no-store |

This establishes CORS/unauthenticated denial and handler reachability for these cases. The student invalid-pair path invokes at most1 gb_limit RPC by source contract; no independent SQL/log count was requested. The limiter may update security counters; no class/student/score mutation was sent. It does not establish valid admin login, authorized CRUD/import/publication, own-student grade retrieval or charts on production.

Owner then approved browser QA for only /personal-gradebook (one load + one reload, static requests only, no submitted fields). Automatic browser approval review rejected navigation before execution because its review usage limit was exhausted. The initial browser/deep-link attempt was BLOCKED before execution; no workaround was used. After the stated review-limit reset time had passed (current time verified23:45 Asia/Bangkok), the same authorized browser action was retried successfully. **Production student-route/deep-link QA PASS:** one initial load and one reload of /personal-gradebook; CMND/CCCD and DOB form, calendar control, verification button and menu displayed; menu opened/closed. No form input, verification submit, login, Board/admin navigation or additional Supabase call. Static asset request totals were not independently captured; authorized ceiling42, source route loads only static assets and no backend until submit. Chrome desktop only; no mobile/Safari claim. Ignored screenshot: tests/local/cloudflare-release-29c1402/student-gradebook-route-live.png. Full authenticated admin/student UAT remains NOT RUN. No blanket product-done, real-data acceptance, full security or full managed recovery claim.

### Accounting and handoff

2 successful execute_sql calls (inventory + guarded cleanup transaction);1 rejected SQL attempt before its subsequent explicit approval.1 Dashboard origin replacement; control-plane UI request totals UNKNOWN. API smoke:1 stopped/no-response attempt plus4 completed HTTP requests in the separately reauthorized activity; no automatic retry. Initial browser QA blocked before navigation; after review-limit reset, one authorized initial load plus one reload and menu open/close PASS. No backend input submitted. Existing owner browser traffic unmeasured. Drive0; real student import0; paid service/add-on/card0; no further migration/Edge deploy/key rotation. Hosted SQL statements within the2 calls are not described as only2 database queries.

Local screenshot evidence is ignored under tests/local/cloudflare-release-29c1402/: student-dashboard-deployed.png and main-only-auto-deploy.png; public repo contains no screenshots with private dashboard data. Local develop4f25496 and pre-existing .env.example/vite.config.js edits preserved. This final evidence update changes only this guide and STATUS, with documentation/diff review, no runtime suites repeated. Publication via a separate docs PR does not change deployed main or cause another production deployment.

## Historical preparation — source, configuration and cost

Release source baseline29c1402130c4cd28441f16c0b7f7f9091c46b468 (descendant of develop78f3c32 and PR12 documentation); mainae5000e currently contains only README.md. Initial Git project setup must not be mistaken for successful application deployment while main lacks source.

Target Cloudflare Pages Git integration: repository khoabm/dashboard, production branch main, preview branch deployments disabled, preset None, root repository root, build `npm run build`, output `dist`, NODE_VERSION=24, VITE_GRADEBOOK_ENABLED=true. Public Supabase URL/publishable key use reviewed src/config/public.js defaults (or matching public build variables); no service key/keyring/Auth token in Cloudflare frontend settings. No Pages Functions, Workers code, D1/R2, paid plan, domain purchase or card. Do not publish the checkout, source.zip, tests or private files. Direct Upload trial project khtn8-co-quynh was created and20 production assets uploaded but Deploy site was NOT clicked; abandoned when user requested Git synchronization. It is not a Git-integrated deployment.

[Official pricing](https://developers.cloudflare.com/pages/functions/pricing/) states static asset requests are free/unlimited. [Free limits](https://developers.cloudflare.com/pages/platform/limits/):500 monthly builds,20,000 files and25MiB per asset. Local candidate20 files/1,072,306 bytes/largest530,596 bytes fits file limits; actual account plan billing not exhaustively audited. Default [SPA fallback](https://developers.cloudflare.com/pages/configuration/serving-pages/) supports /personal-gradebook and /personal-gradebook/admin refresh when no top-level404.html. [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/) and [branch controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/) define main auto deploy; no automatic preview calls into Supabase.

## Concern/check matrix and change inventory

This release follow-up changes only docs/DEPLOYMENT.md, this guide and STATUS. Existing source/migrations/CI unchanged. Local build candidate enables Gradebook by environment, not an unconditional source bypass. Existing CI29c1402 [40715121413](https://github.com/khoabm/dashboard/actions/runs/40715121413) SUCCESS retained. First local build failed because archived checkout lived under tests/local and the production guard correctly detected tests/ in its absolute paths; no guard bypass. Moved extraction to ignored dist/cloudflare-source-29c1402; one corrected build PASS and production-output check PASS. Existing chart chunk warning retained. No full suite rerun.

| Concern | Gate |
| --- | --- |
| Release provenance | Main must contain reviewed application source; capture Cloudflare deployed commit SHA and compare to merged main before completion |
| Gradebook activation | Production VITE_GRADEBOOK_ENABLED=true at build time; frontend no successful synthetic fallback |
| Backend origin | Add exact final HTTPS production origin to GB_ALLOWED_ORIGINS, preserve accepted localhost entry, no wildcard; public config only, no crypto-key rotation |
| Authorization and privacy | RLS/admin-session/student-capability controls unchanged; fresh hosted critical UAT remains NOT RUN; prior synthetic/native evidence is not fresh production acceptance |
| Routes/test exclusion | Build output allowlist PASS; production route refresh and test URL behavior NOT RUN |
| Recovery | G07-4 engine-only synthetic PASS; full managed Auth/Storage/Edge/key recovery remains DEFERRED/unverified |
| Automatic deploy | main only; preview branches off; first config/save is not proof of a successful future merge-triggered deployment |

## Authorized synthetic cleanup receipt

Owner explicitly selected only Gradebook synthetic; keep learning resources and Auth/admin. One approved read-only execute_sql call (5s timeout, no retry) found one test-marked class,2 students/5 score cells, semesterI published (differs from older hidden-state evidence). Stopped, reported discrepancy and obtained explicit confirmation that this exact class remains disposable synthetic plus approval for one guarded transaction.

One approved execute_sql transaction then locked the exact class/student scope, required test marker and2/5 counts, deleted5 scores →2 students →1 class, asserted row counts, and committed. Result target_class_removed=true and target_students_removed=true. Catalogs, audit, limiter, Board/Auth/admin and keyrings were not targeted. No TRUNCATE, schema reset, migration, key rotation or blanket student delete. No real student data was read/exported/imported. Public receipt omits row IDs and names.

Cleanup-stage accounting (superseded by the full release accounting above):2 successful execute_sql (one read-only inventory, one cleanup transaction); first unapproved inventory attempt was rejected before execution, then separately approved. No retries. No additional verification query. Underlying statement count is not represented as2 queries: the cleanup call contains guarded reads/deletes and final result checks. No Auth login or function/API test requests issued by agent yet; user-open existing app traffic unmeasured. Drive0. Further hosted verification needs a finite target/data/request plan, including SDK/preflight/retries, with separate approval per TESTING.

## Historical pre-deployment pending evidence

Cloudflare GitHub App access approved for only khoabm/dashboard; GitHub sudo completed by owner. Git project configuration/deployment, exact origin update and browser acceptance still pending at this documentation commit. Do not claim Gradebook works end-to-end or production-ready from the enabled build alone. Do not re-request owner legal/organizational approval attestation.
