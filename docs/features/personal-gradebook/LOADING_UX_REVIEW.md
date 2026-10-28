# Unified loading UX — L01–L19

Baseline: `cfcdaa1dd10465d982e3be0ffc90aa1ca3b8f907`, branch `feature/personal-gradebook-ui-e2e`, 2026-10-28.

## Concern / test matrix (before edits)

| Concern | Verification |
| --- | --- |
| L01 route lazy imports, stale completions | generation ownership review; existing route pure tests |
| L02 Board/Gradebook logout header feedback | shared header pending lifecycle; offline component test; browser when safe |
| L03–L09 admin/class/student/page/score/edit/reveal/publication | operation-specific labels; dialog status outside inert content; existing ownership/CRUD/publication tests |
| L10–L11 local CSV/XLSX, preview/apply | pulse per stage; serial guard and abort cleanup review; existing parser/preview pure tests |
| L12–L14 verify/own grades/histogram/lazy chart | existing channel fencing; pulse only while pending; existing state tests |
| L15–L19 Board refresh/quota/media/editor/Auth/sections | retain existing pulse/progress and mutations; static review, shared indicator accessibility test |
| Format/static/build | one final curated offline suite, check, full format check, build/exclusion; no suite repetition without changes |
| Browser | user Chrome; synthetic fixtures first; hosted requires separate bounded approval |

## Expected merge inventory

`src/app.js`, `src/main.js`, `src/components/{app-header,pending,gradebook-admin,gradebook-scores,student-lookup,student-gradeboard}.js`, `src/styles/main.css`, existing `tests/pending-task.test.js`, this report, `docs/{STATUS,ARCHITECTURE,BUG_FIX_LOG}.md`. One format-only prerequisite commit also touches `src/utils/birth-calendar.js` (one Number expression, semantic AST equality). No dependency, service, API, Auth, database or CI changes. Existing Board loader consumers retained when already consistent.

## Evidence

### Implementation

- L01: one route-owned pulse during lazy imports, cleared in finally only by the current generation; existing route/history/focus behavior retained.
- L02: shared header awaits the existing logout Promise, locks duplicate logout clicks and clears on resolved/cancelled/failed outcomes. Status sits outside the inert action region; Board avoids duplicating its logout indicator. Header status is positioned below its own header without consuming search/account width.
- L03–L09: class, paginated roster, profile reads/CRUD/reveal, teacher catalog/score page, exact-cell edits and semester publication use operation-specific messages without private values. Modal pulse lives beside the title, outside inert controls; cancel/finally/close clears it. Initial class/score copy is neutral while loading instead of reporting failure prematurely.
- L10–L11: both real local CSV/XLSX readers show the shared pulse; serial-guarded finally clears only the current file's status. Changed file/close retains existing abort/preview invalidation. Preview/apply use modal stage messages; payloads, confirmations, revisions, atomicity and no-retry behavior are untouched.
- L12–L14: verification, own-grade loading, histogram reads and lazy chart preparation use PulseIndicator. Lazy chart busy state ends on success/failure; existing plot generation/disposal checks remain.
- L15–L19: existing initial Board LoadingState versus refresh label, quota read, per-resource media, post upload counters/draft/save/publish, Auth and section editor pulses retained. Shared atomic live-region semantics and wrapping apply consistently; reduced motion already disables animation while retaining text. No artificial loading for synchronous search/select/calendar operations.

### Executed offline checks

Windows / Node25.2.1, installed locked dependencies; no installs, no API/SQL/specialist tests.

- One curated `npm run test:ci`: 131 tests, 129 PASS / 2 FAIL in the newly added DOM test stub (classList.add did not update className). Fixed the stub; affected `node --test tests/pending-task.test.js`: 6/6 PASS. The other 125 tests passed in the first run. No repeated full suite.
- `npm run check`: PASS (frontend plus13 Edge modules/static/diff). `npm run build`: PASS, production assets only; existing530.59kB lazy chart warning retained. After the final header placement/auth busy follow-up, check and build repeated once: PASS (build4.56s). Header/pending focused6/6 repeated once for the changed header markup: PASS. No full-suite repeat.
- `npm run format:check`: FAIL on76 checkout files, including untouched source. Read-only in-memory LF normalization of116 tracked code files shows75 are CRLF-only; `src/utils/birth-calendar.js` additionally has a pre-existing formatting difference. A separate format-only prerequisite commit `45f8ec4` corrects that single pre-existing Number expression; semantic AST equality PASS (initial comparison also included trailing-comma position metadata and failed; excluded presentation metadata for the semantic check). Final read-only LF-normalized check116/116 PASS. Other unrelated checkout files were neither normalized nor reformatted. Explicit changed-code Prettier check PASS. Direct full CLI check on CRLF checkout remains FAIL; this is distinct from canonical LF source formatting.
- New component checks exercise shared pulse literal text/atomic/idempotent cleanup, held/repeated logout, failure and cancelled logout cleanup. Existing pure route, session, mutation/publication/preview/parser/draft/channel fencing regressions retained.

### Browser, quota and limitations

User requested the existing logged-in Chrome at localhost:4173 and separately approved read-only QA with a20-request Supabase maximum; no mutations/import/publication/reveal/logout and stop on timeout/429/503. Existing tab inventory/initial AX snapshot read successfully. Before any test navigation/refresh/click, the native browser tool stopped the turn because it could not determine the Windows browser URL confidently enough to enforce policy. Browser loading/visual QA therefore **BLOCKED**, no QA PASS or complete UI acceptance claim.

Agent-issued hosted test/API/SQL requests:0; budgeted live test sequence NOT STARTED. Existing user dev-tab background/HMR traffic was not instrumented and its total is UNKNOWN; do not infer a total of0 from the absence of agent API calls. Hosted security/RLS, physical devices, screen readers/reduced-motion visual behavior and actual browser mutation/cancellation remain unproven. No backend/service/CI/dependency changes, deployment or merge. PR10 Draft verified before push.

Skill: installed UI UX Pro Max loading-feedback guidance used; historical `/mnt/data/SKILL.md` attachment unavailable on this Windows checkout. No external recommendation research needed because implementation reused existing design and pending primitives.
