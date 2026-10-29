# Gradebook Bulk Grid — implementation, QA and release record (2026-10-29)

## Scope and merge baseline

PR #19: `feature/gradebook-bulk-grid-20261029` → `develop`. The merge-from-develop commit `f3fd7d8b` resolved the only two overlapping files while retaining all 16 other Bulk Grid files unchanged. GitHub reports `mergeable: clean`; [Offline CI #40902826853](https://github.com/khoabm/dashboard/actions/runs/40902826853) PASS on that integrated commit.

- In the unpublished semester, the teacher can edit the existing paged grid (up to 20 students × 7 score columns). Pending changes remain in memory until explicit Save.
- Save submits the changed cells, requests a bounded preview with insert/update/unchanged counts, confirms, and applies one atomic batch.
- Published-semester score editing, explicit delete/acknowledgement behavior, CSV/XLSX import and student lookup remain separate.
- Server operations `scores.batch.preview`/`scores.batch.apply` use student ID and expected revision, with signed owner/session/class/semester/input/state preview binding. This feature does not transmit plaintext CCCD.

## Actual hosted deployment — independently checked, read-only

- Supabase migration ledger contains **`20261029095147_gradebook_grid_batch`**. The source migration file has been renamed to `supabase/migrations/20261029095147_gradebook_grid_batch.sql` to match the already-applied version. Do not create/reapply the obsolete source timestamp `20261029150000`. No database mutation was done during this documentation correction.
- `grades-admin` Edge Function is **ACTIVE v4**, `verify_jwt=true`, and includes `_shared/grid-batch.js`. The deployed bundle matches 17/18 source files on this branch. The one differing bundled dependency is `_shared/student.js`: the hosted grades-admin bundle includes an older student verification implementation, while develop contains the later failure-only limiter adaptation. This drift was not changed as part of this PR documentation/merge; review it during any future coordinated redeployment. No unverified claim of complete byte-level parity.
- SQL catalog confirms `public.gb_score_batch_preview`, `public.gb_score_batch_apply`, `gradebook.score_batch_plan` and `gradebook.score_batch_run` exist. Verified RPCs are `SECURITY INVOKER`, use an empty `search_path`, and grant EXECUTE to `service_role`, not `anon` or `authenticated`.
- Live migration record, function presence and ACL were inspected without importing scores, calling login, executing preview/apply, or invoking migrations.

## QA evidence and owner acceptance

- [GitHub CI #40902826853](https://github.com/khoabm/dashboard/actions/runs/40902826853): **PASS** for code syntax, curated unit tests, production build and Prettier on `f3fd7d8b`, including the conflict-preserving merge.
- Prior synthetic GRID-B02/B03 contract checks were recorded as 2/2 PASS in [specialist run #40850218563](https://github.com/khoabm/dashboard/actions/runs/40850218563). Other earlier CI success is history, not proof of hosted E2E.
- On **2026-10-29**, the owner explicitly confirmed that the Bulk Grid migration **had been applied and score-input testing had been completed**, and authorized updating documentation and merging PR #19. This is **owner-reported acceptance**; this documentation update did not independently replay browser input, publication, concurrent updates or hosted mutation tests. No fabricated screenshots or detailed test-case results are implied.
- Zero-cost scope maintained: no new hosted test traffic, Supabase writes or Edge deployments from this documentation/merge workflow.

## Guardrails and remaining limitations

- Draft state is per page/subject/semester and navigation requires discard confirmation.
- Blank pending grid input is invalid, **not** a bulk deletion. The published individual editor retains its explicit deletion semantics.
- Any stale score revision, publication change, class/session mismatch or invalid score must fail closed without partial mutation. SQL checks are designed for transactional apply; the owner's reported test is not a claim that every adversarial concurrency case has been independently reverified.
- Future releases should verify the precise migration ledger, both Edge bundles and any remaining student.js deployment drift before changing hosted services.
- The current integration to `develop` does not itself deploy Cloudflare Pages or execute a migration.

## Disposition

Owner approved integration after confirming migration and score-entry testing. GitHub conflict-resolution CI passed. PR #19 may be merged into `develop` once the documentation/migration-filename correction itself passes CI and GitHub reconfirms clean mergeability.
