# UI E2E review — 2026-10-28

Baseline: `1378455b0096f688cbf91a1f7ab5a9f0e8fd57be`. Branch: `feature/personal-gradebook-ui-e2e`.

## Verified finding and correction

UI-E2E-001 / P2: teacher score panel's implicit grid track used the long pupil selector's min-content width. At a 360×800 iframe viewport (343px content excluding scrollbar), the panel's children were 393px wide and body scrollWidth was 407px. Semester status and pupil selector were clipped; the whole page scrolled horizontally. Set the existing score-panel and admin-body grid tracks to `minmax(0, 1fr)` in gradebook.css. After: body clientWidth=scrollWidth=343; table retains all eight columns and its own horizontal scroll region. No data hidden, business/API/session/clock logic changed.

No confirmed P1 or additional P3 finding in the exercised scope. This is a bounded correction, not full E2E acceptance.

## Actual Cloud Chrome browser observations

Local-only Sites preview `http://terminal.local:4173`. Maintained student fixture and new Gradebook workspace fixture render production components through memory-only synthetic adapters. These are iframe CSS viewport measurements, not physical devices or browser viewport emulation. Fixture CSP blocks external connections; no hosted transport imported.

| CSS viewport | Roster containment | Teacher score containment, 8 columns | Student gradeboard containment |
| --- | --- | --- | --- |
| 1440×900 | PASS | PASS | PASS |
| 1024×768 | PASS | PASS | PASS |
| 768×1024 | PASS | PASS | PASS |
| 390×844 | PASS | PASS | PASS |
| 360×800 | PASS | PASS | PASS |
| 1024×480 | Student form scroll inspected | PASS | NOT RUN |

Score editor opens with exact 8.12345 input; Escape closes and returns focus to original score cell. Publication confirmation opens, acknowledgement unchecked and submit disabled. Student form opens on short viewport with internal scrolling and visible close control. Roster search unmatched result displays the existing empty-page message. Roster import dialog opens with preview/apply disabled before file selection. Student synthetic verification succeeds; histogram renders at 360px with 8.25 raw / 8.3 group, personal orange bar and aggregate count23; Escape returns to invoking cell. Before/after overflow screenshots and short-dialog/chart screenshots were inspected in the browser tool, but standalone exported screenshot artifacts are NOT PROVIDED.

## Limits and owner review

Full create/edit/deactivate success, identity reveal, pagination interactions, CSV/XLSX preview/apply, publication mutations, histogram selector/keyboard matrix, calendar matrix, reduced-motion emulation, Board browser regression and hosted/Auth E2E: NOT RUN in this execution. Synthetic fixture deliberately rejects unsupported mutations with503 rather than inventing successful saves. It uses real roster/score parsers, but file upload/preview was not exercised. No hosted requests, writes, migrations, deployment or real credentials. No login necessary for these isolated fixtures. G07 and G08 evidence unchanged.

Focused existing gradebook-admin, gradebook-scores, gradebook-ui and student-gradeboard suites PASS. `check`, full `format:check`, default `build`/production exclusions and diff whitespace PASS. Existing large chart chunk warning retained. Source business modules and Board styles unchanged. No CI manually triggered.

Run `npm run dev`, open `/tests/gradebook-workspace.html`, select viewport and Admin/teacher or Student scene. For Student use only synthetic000000009 and29/02/2000. Review teacher long-label controls at360px, horizontal table access, short-height student form and score editor focus restoration. Finish outstanding interactions before claiming comprehensive E2E UI READY FOR OWNER REVIEW.
