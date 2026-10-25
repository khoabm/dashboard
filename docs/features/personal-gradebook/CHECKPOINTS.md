# Execution plan and acceptance gates — Personal Gradebook

**Status: CP00–CP07 NOT STARTED; documentation-only preparation.** Use this file as the live checkpoint tracker once implementation is authorized. Add *dated SHA/evidence* on completion; never tick a box from intention or a prior unrelated CI run.

## Operating workflow for Codex

1. Verify current branch/HEAD and existing `develop` baseline; do not assume the branch still equals initial planning SHA. Read [README](README.md) → [BRIEF](BRIEF.md) and the specific part of [DATA_AND_SECURITY](DATA_AND_SECURITY.md). Open [root AGENTS](../../../AGENTS.md), code style and relevant target files before changes.
2. Implement **one checkpoint or tightly dependent slice at a time**. Announce scope, files, migration implications, regression risks, expected verification before editing. Keep changes diff-minimal and do not silently broaden UI labels or business logic.
3. Maintain conventional tests for new logic; use synthetic identities and fake responses. Test server policy with actual JWT/anon identities on a safe authorized environment where necessary; never describe mock-only result as “RLS verified”.
4. Migrations/secret provisioning/server deployments **require explicit authorization** per execution request; do not use this plan as automatic permission. Do not create a second Supabase project or a paid resource. Never edit/seed real student records while testing. Do not merge/deploy until requested.
5. Check no regression in resource board, admin sessions/loading/media and existing CI on exact SHA. Report FAIL/NOT RUN/BLOCKED honestly. Update related architecture/status/decisions and this tracker without duplicating full BRIEF.

## CP00 — Baseline and approved scope (NOT STARTED)

Deliverables: branch from current `develop` (planning branch already created), feature implementation plan informed by actual source/schema, new route/interface/module inventory, risk and test plan. No application/database changes for docs-only prep.

Acceptance:
- [ ] Confirm latest `develop`, branch and baseline SHA; validate existing CI/working state.
- [ ] Map GB-01..09 to target files and exact visible labels/order.
- [ ] Confirm no clashes with existing public board/auth/SQL and no paid service.
- [ ] Identify open engineering defaults vs user-approved requirements; no spec contradictions.
- [ ] Record plan and proof before implementation (docs-only current task does not count as implementation CP00 completion).

## CP01 — Data model and security (NOT STARTED)

Deliverables: reviewed additive migration(s), six-table model incl ordered catalogs, minimal secure Functions for identity and admin, unit/security checks, cost check; **do not apply without authorization**.

Acceptance:
- [ ] Correct student auto-ID; two mandatory fields; secure encrypted+blind-index identity; UNIQUE duplicates per class.
- [ ] Exact eight subject labels and seven column labels/order seeded; no scattered hard-coded copies, no separate semester table.
- [ ] Decimal `NUMERIC` stores raw values 8.24 / 8.25 / 8.26 unchanged; range 0–10; 0 vs absent and composite PK verified.
- [ ] Anon/direct Data API SELECT/INSERT/UPDATE/DELETE for grade/private records denied; existing board public reads unchanged.
- [ ] Teacher API verifies real admin profile + JWT before writes/reveal; unauthorized/non-admin/expired admin denied.
- [ ] Student API checks pair, throttles invalid/repeated/concurrent attempts, restricts responses and publication; no leaks into log/url/client storage.
- [ ] Reversible encryption keys protected, no secret in bundle; migration/rollback/backup notes and security advisors considered.
- [ ] Document exact test evidence (mock vs live, approved environment) and gate status.

## CP02 — Navigation and lookup UI (NOT STARTED)

- [ ] Hamburger at far left; Bảng học liệu/Bảng điểm cá nhân; keyboard/focus/close/menu responsive.
- [ ] Deep-link `/bang-diem` loads and refreshes on selected static host; existing public board unaffected.
- [ ] CMND/CCCD 9–12 ASCII digits, retain leading zeros; `DD/MM/YYYY` validated datepicker desktop/mobile.
- [ ] Invalid/unknown data reveals no user existence; loading/error/retry and no plaintext persistent storage.
- [ ] Return to verification on expiry/refresh; anonymous grade direct requests remain denied.

## CP03 — Class/student admin and INSERT-only roster import (NOT STARTED)

- [ ] Single active class name/year edit; archive history; no multiple-class management UI.
- [ ] Student create/list/edit/deactivate or safe delete, with both mandatory fields; optional name; no `HS001` key field.
- [ ] Mask identity in teacher list; explicit authorized reveal only.
- [ ] Excel + CSV roster templates/import with exact visible headers and preview, row/column errors, duplicate detection.
- [ ] INSERT-only: existing students are never mutated, all-or-nothing validation/transaction, no partial writes.
- [ ] Leading zero, Excel date, malformed/empty/duplicate file, mixed valid+invalid and retry tests.

## CP04 — Teacher point CRUD, import and publication (NOT STARTED)

- [ ] Two semester contexts with all eight subjects and seven score labels/order via catalogs; don't label any visible column `TX1`.
- [ ] Manually add/edit/remove scores with confirmations and pending feedback.
- [ ] Excel + CSV score import contains only CMND/CCCD, Ngày sinh, Môn and seven exact score headers; semester selected on UI.
- [ ] Match student via protected ID + DOB; unknown student, existing slot, file duplicate, bad raw decimal abort **whole file**.
- [ ] Blank score skipped, not written as 0; import INSERT-only, never silent overwrite or partial commit; manual editing is distinct.
- [ ] Preserve raw precision through storage/import/sorting; one-decimal display only, deterministic rounding tested.
- [ ] Publish/unpublish each semester independently; missing-data warning; block imports while published and warn on manual edits.

## CP05 — Student board and per-cell histogram modal (NOT STARTED)

- [ ] Verified student sees only own published grades and two **Học kỳ I / Học kỳ II** tabs, not two tables on one screen.
- [ ] Exact names/order everywhere; null/absent displays `—`; 0 remains 0; mobile table/card responsive.
- [ ] Clicking/tapping cell opens selected subject+score column modal; two dropdowns and progress/errors.
- [ ] X-axis point scale 0–10, Y-axis number of pupils; aggregate only, no other pupil identities/rows.
- [ ] Exact raw personal point retained; highlight **correct rounded-tenth bucket** and label grouping honestly. Empty score shows no highlight.
- [ ] One chart on demand, no all-56 prefetch; bottom-sheet/near-fullscreen mobile; keyboard/ESC/focus restore/scroll.
- [ ] Unpublished semester and insufficient privacy-safe cohort return no histogram, even with old lookup token.

## CP06 — Integration, regression, and QA (NOT STARTED)

- [ ] Existing public resource board, CRUD/reorder, drafts/file, admin Auth/session, nav and loading tests remain green.
- [ ] Exact label/order test for eight subjects/seven columns in UI, modal, CSV/Excel template and import parser.
- [ ] Duplicate and format validation, bad dates/identifiers, encrypted index, wrong DOB, throttle concurrency, admin denial, published/unpublished, token expiry.
- [ ] Raw 8.24/8.25/8.26 retained across input/DB/read/sort/import; deterministic display rounding, histogram matching bucket.
- [ ] Import all-or-nothing vs faulty/mixed file, replay, concurrent writes, no unauthorized update and blank skip.
- [ ] Browser QA Chrome at 360/390/768/1024/1440 with actual click/keyboard/dialog; real device/Safari if available, otherwise NOT RUN/BLOCKED.
- [ ] `npm ci`, `npm run check`, `npm test`, `npm run build`, `npm run format:check` and GitHub Offline CI on exact HEAD; separate real Auth/API/RLS checks where permitted.
- [ ] No secrets/PII/test fixture shipped in `dist`; file import data absent from Git/logs/storage.

## CP07 — Review, docs and eventual merge (NOT STARTED)

- [ ] Review final source and migration diff against BRIEF and existing board SPEC; no new framework or unexpected billable resource.
- [ ] Security and privacy review incl parent/child access risk, live authorization and group histogram disclosure limits.
- [ ] Check backup/restoration and key recovery plan; no missing sensitive-data safeguards.
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

**Current checkpoint state remains NOT STARTED.** Writing a plan and creating a branch is preparation, not functional acceptance.
