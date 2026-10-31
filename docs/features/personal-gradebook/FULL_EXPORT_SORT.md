# Full export and global sorting — PR #34 / 2026-10-31

Branch `feature/gradebook-full-export-sort-20261031`, starting HEAD
`4d9539407cdb62ccd772abf1005d02c13947c734`, base `develop` at `2e6c173`.
Canonical owner requirements: [BRIEF GB-10](BRIEF.md#gb-10--full-export-and-table-sorting-owner-amendment-2026-10-31).
Source/offline implementation; deployment and hosted acceptance NOT RUN.

## Concern matrix and merge inventory

The initial scope was fixed before edits: shared sorting/export controls, both teacher
tables, strict decoded DTO and transport boundary, admin Edge handler plus an additive
service-only snapshot RPC, focused pure/specialist tests and essential docs. During
Chrome QA, decimal input was found to reject dots; `dom.js` and its focused regression
were added to preserve GB-06 precision. Owner follow-up removes public template files
and replaces their build/test references with header-only export coverage.

| Concern | Verification and boundary |
| --- | --- |
| Complete class ordering | 43 synthetic students across three UI pages; shared header, default hierarchy, all four roster headers and all eight score-table headers toggled both directions with Enter/focus/aria-sort, plus exact raw score ASC/DESC; stable BIGINT IDs; absent scores last |
| CSV/XLSX | Independent CSV token decoding and actual read-excel-file9.3.12 XLSX reader: 44 roster rows / 689 score rows, both semesters, inactive student, leading zeroes and exact8.12345; empty files contain only headers; formula injection neutralized in CSV, XLSX inline strings never formulas |
| Identity/authorization | Three focused manual Edge tests with real Web Crypto and network-denying Auth/RPC substitutes; confirmed export only, forged actor/non-admin denial, AAD/HMAC tamper failure, no crypto material in response, no retry |
| Database | New migration compiled after the complete existing chain on disposable native PostgreSQL17.11; `tests/gradebook-snapshot.sql` PASS once, transaction rolled back; ACL/invoker, empty/full snapshots, semesters/decimal strings, ordinary-list isolation, class audit, wrong-class/revoked-session/anonymous denial |
| Drafts/keyboard/responsive | Chrome on owner's computer, synthetic `/tests/gradebook-workspace.html`; Enter sort and restored header focus; decimal7.12345 and draft retention; existing “Xem” information/hidden CCCD/Escape close preserved; real iframe sizes360/390/768/1024/1440, no page overflow, table-only horizontal scroll |
| Errors/loading/lifecycle | Existing page pulse/inert state observed during delayed export; finite fixture fault injection, no automatic retries; existing gate cancellation tests; browser-specific evidence recorded below |
| CI | One `test:ci` execution:171/171 PASS; syntax/credential/diff check PASS; production build/exclusion PASS; complete Prettier PASS. New pure file is explicit in CI; Edge/SQL/browser remain manual-only |
| Hosted/real data | NOT RUN: new RPC/function deployment, actual gateway/Auth/RLS integration, managed concurrency, production data/export, real mobile devices/Safari. Supabase hosted requests/queries0; no real student data, merge, paid resources or deployment |

Inventory: `gradebook-admin.js`, `gradebook-scores.js`, shared `gradebook-table-controls.js`,
`gradebook-export.js`, `gradebook-snapshot.js`, decoded admin responses, bounded transport,
Gradebook CSS, decimal-input utility; Edge admin/snapshot/http modules; one new migration;
pure export/sort and input tests, three manual Edge cases, manual SQL, synthetic browser
workspace, production-output guard/package CI allowlist; removal of the two public score
template assets; BRIEF, this evidence, root STATUS/TESTING/ARCHITECTURE/SECURITY/DATABASE/
BUG_FIX_LOG and requirements index. No dependency versions, existing migrations, Auth,
student lookup, “Xem” dialogs or Board business logic changed.
Pre-existing lockfile and local tunnel/Vite changes are excluded from the feature commit.

## Snapshot security and operating limits

`class.snapshot` accepts only classId, purpose (`sort` or `export`) and optional confirmed.
Export requires confirmed=true. Normal JWT verification/getUser/active-admin check runs
before the RPC, which independently checks the actor/session under the common class
share lock. All existing Gradebook mutations take the corresponding class write lock;
one snapshot contains roster and both semesters without cross-request page joins.
No new table/schema/client grant or `SECURITY DEFINER` is added.

The server-only RPC returns the existing encrypted identity envelope/AAD/HMAC context.
Edge decrypts in request memory, derives binary text CCCD ranks, then explicitly projects
the response: rank-only reads omit document numbers; only confirmed exports include them.
`students.list`, `scores.read`, reveal and student lookup contracts remain unchanged.
The browser rejects crypto/plaintext fields in rank-only decoded DTOs. Both modes audit
only actor/class/purpose/count, not names, identity, DOB, student IDs or scores. Audit
records authorized snapshot access, not successful local download. All responses remain
no-store; existing session-generation, abort and deadline fences precede downloads.

Technical safety ceiling:2000 students,32MiB snapshot response,15s Edge/SQL deadline;
larger/expired/failed snapshots fail closed, never produce a truncated export. XLSX has
at most32001 rows for the V1 eight-subject/two-semester class. These are bounded technical
limits, not a claim that arbitrary class sizes have been performance-tested. No load,
stress, quota exhaustion or retry tests were run. CSV bytes preserve identifiers as text;
spreadsheet software may infer types on CSV open, so use XLSX for typed text preservation.
Exports contain extra metadata/both semesters and are not GB-07 import templates.

## Commands, attempts and evidence

- Pure suite initially exposed test-harness assumptions (import CSV parser only allows
  roster/score widths; installed XLSX9 reader returns sheet objects). Corrected independent
  reader tests; focused6/6 PASS. No runtime rounding or parser broadening was introduced. A later XML control-character hardening change was checked by the focused six-case suite again; PASS. The existing 140-cell save bound remains enforced with a specific message when drafts span pages.
- `node --test --test-name-pattern=snapshot: tests/gradebook-edge.test.js`: first run found
  a fixture helper-name typo, corrected;3/3 PASS. Synthetic only, no fetch reaches a service.
- Native initdb in sandbox stalled; stopped. Existing native17.11 binaries initialized a
  new ignored cluster with the required process permissions. Bootstrap first failed due
  Windows CRLF changing historical migration hash guards; a new DB with canonical LF
  source fixed it. A role-already-exists fixture setup was corrected without changing
  migrations. Full chain then applied; specialist SQL passed once. Cluster stopped.
- `npm run test:ci`:171/171 PASS, one complete run. `npm run check`:PASS once.
- `npm run build`: first failed on the empty public/templates directory after asset
  removal; removed the empty directory, next build/exclusion PASS. Existing chart chunk
  size warning retained; no new chart dependency was introduced.
- `npm run format:check`: first failed on150 unchanged CRLF checkout files. Converted
  only files whose normalized bytes exactly matched HEAD to canonical LF in working copy;
  zero source diff for those files. Next full format gate PASS. No repo-wide formatting.
- Native Chrome keyboard, sorting, export confirmations, empty state and error-state QA
  use43 synthetic rows and the existing components. Native viewport override did not
  change measured layout width, so responsive QA uses actual same-origin iframe sizes;
  viewport override was reset. Device/Safari behavior is not inferred.
- Browser XLSX download is owner-confirmed (2026-10-31): supported download
  event timed out; `chrome://downloads` was blocked by browser URL policy and was not
  bypassed. Owner confirmed receiving lop-hoc-students-2026-10-31.xlsx. File-byte round-trips PASS independently; distinguish owner confirmation from tool event evidence.
- Ignored local screenshots: `tests/local/export-sort/mobile-score.jpg` and
  `desktop-score.jpg`. Raw synthetic downloads, temporary DB and screenshots are not
  part of Git or dist. Hosted requests0.

## Remaining release gates

Native Chrome XLSX download is owner-confirmed. Deploy/apply
the exact source only after a separate owner authorization, then approve an explicit
finite synthetic hosted acceptance activity (target, request cap, stop conditions) before
checking new RPC/API/real Auth boundaries. Existing project real-data gates remain separate.
PR stays Draft; no merge or production-complete claim.
