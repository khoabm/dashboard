# Gradebook grid batch — implementation and QA handoff (2026-10-29)

Branch: `feature/gradebook-bulk-grid-20261029`, based on develop `78f3c3208b21583545ff9ec0c58d875db2a688f4`.

## Scope
- Teacher unpublished semester grid now permits direct entry in existing class/subject/page (20 students × 7 columns). Edits are memory-only until explicit Save.
- Save sends only changed cells, calls a new preview, confirms insert/update/unchanged counts, then calls one atomic apply.
- Published semester keeps existing individual dialog, with explicit acknowledgement/delete semantics unchanged.
- CSV/XLSX import and student lookup remain unchanged.
- New Edge `scores.batch.preview`/`scores.batch.apply` operations use student ID + expected score revision, not plaintext identity. HMAC preview binds owner/session/class/semester/input/state. New additive migration provides per-batch RPCs; no hosted migration was applied.

## Non-negotiable gates
1. **Offline JS:** Existing `test:ci`, specialist gradebook edge tests, format check, production build. New grid batch contracts and preview/apply tests must pass.
2. **Native PG17 isolated SQL:** Verify migration applies transactionally after existing migrations; preview, mixed INSERT+UPDATE+unchanged, stale 409, duplicate, invalid decimal, published denial, no partial mutation and audit.
3. **Browser:** Teacher 1440/1024/768/390/360 widths; keyboard Tab, focus, score entry, unsaved yellow state, cancel navigation, subject/page switch, discard, save confirmation, failure state; published editor regression. Use synthetic-only setup.
4. **Deployment/hosted:** Explicit separate approval before apply/deploy or live Auth/API/RLS validation. Never enter real student data as a test.

## Known limitations
- New draft state is scoped to a single page/subject/semester; navigating away requires discard confirmation.
- Clearing an input is an invalid pending value, **not** score deletion. Published manual deletion is retained. A dedicated bulk-delete UI is out of scope.
- Directly modifying database or claiming a working hosted save before the additive migration is applied would be misleading.
- Backend/auth/RLS and browser results: **NOT RUN** as of this source-only checkpoint. Hosted operations: **0**.
- Production release and owner acceptance: **BLOCKED** pending the above evidence.

## Review priority
- Fail closed on stale score revision, new published semester, mismatched class/session, and late/ambiguous responses.
- Ensure grid draft cannot be silently replaced by pagination, subject change, semester change, reload, publication or import.
- Maintain exact decimal text and no unrelated Board feature regressions.
