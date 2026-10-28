# Cloudflare Pages release — 2026-10-28

User authorizes Cloudflare Free static hosting, Personal Gradebook activation and GitHub main automatic deployments. Supersedes the former Sites-only hosting restriction; Supabase remains the runtime backend. Merge requires explicit approval of the prepared release PR; this record does not merge main or accept remaining security gates.

## Source, configuration and cost

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

Total Supabase successful calls this release task:2 execute_sql (one read-only inventory, one cleanup transaction); first unapproved inventory attempt was rejected before execution, then separately approved. No retries. No additional verification query. Underlying statement count is not represented as2 queries: the cleanup call contains guarded reads/deletes and final result checks. No Auth login or function/API test requests issued by agent yet; user-open existing app traffic unmeasured. Drive0. Further hosted verification needs a finite target/data/request plan, including SDK/preflight/retries, with separate approval per TESTING.

## Pending completion evidence

Cloudflare GitHub App access approved for only khoabm/dashboard; GitHub sudo completed by owner. Git project configuration/deployment, exact origin update and browser acceptance still pending at this documentation commit. Do not claim Gradebook works end-to-end or production-ready from the enabled build alone. Do not re-request owner legal/organizational approval attestation.
