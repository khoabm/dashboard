# Full export and global sorting — PR #34 / 2026-10-31

Branch `feature/gradebook-full-export-sort-20261031`, starting HEAD
`4d9539407cdb62ccd772abf1005d02c13947c734`, base `develop` at `2e6c173`.
Canonical owner requirements: [BRIEF GB-10](BRIEF.md#gb-10--full-export-and-table-sorting-owner-amendment-2026-10-31).
Source implementation and bounded synthetic hosted acceptance PASS on 2026-10-31.
Owner authorized migration/testing, confirmed all 31 existing records are synthetic,
and explicitly required preserving them. No student or score writes/deletes were run. Empty-class/header-only behavior remains
covered offline; no hosted data was removed to manufacture an empty test case.

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
| Hosted / real data | Approved synthetic hosted run PASS: migration applied, grades-admin v7 deployed and source-verified; real admin session, complete snapshot and four CSV/XLSX export flows; missing-JWT/direct-RPC401; row fingerprints unchanged. Real personal data, managed concurrency, real devices/Safari and public website deployment NOT RUN |

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
share lock. The existing 31 records were owner-confirmed synthetic; tests never changed/deleted them. All existing Gradebook mutations take the corresponding class write lock;
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
  part of Git or dist. This initial offline phase made zero hosted requests; the separately
  approved follow-up is accounted below.

## Approved hosted follow-up — 2026-10-31

Owner authorized migration and the necessary tests, confirmed the existing 31 records
are synthetic, then explicitly instructed not to delete data. No fixture was inserted,
updated or deleted; no score/publication/class-metadata mutation or Auth change was run.
Scope was fixed at one migration, one existing-function deployment, at most ten manual
SQL calls and 24 client API test requests; no retries, polling loops or load testing.
Normal Auth/bootstrap and Edge-internal Auth/profile/RPC work are distinguished from
client test requests below; no all-account traffic count is claimed.

- Existing project `vgciiqtwmxcdqppntgnt` ACTIVE_HEALTHY, PostgreSQL17.11;
  organization plan verified `free` / `tier_free`. No project/branch/resource upgrade.
- Reviewed source `20261031001500_gradebook_class_snapshot.sql` applied once via MCP
  as ledger version **20261031002916**, name `gradebook_class_snapshot`. No old migration
  replay, repair or reset. The repo file was renamed to
  `20261031002916_gradebook_class_snapshot.sql` to match that ledger; its bytes match
  reviewed source95d925a exactly. It was not reapplied. New RPC is invoker, fixed search_path/timeouts, service-only;
  anon/authenticated EXECUTE=false. Existing function fingerprint unchanged.
- Existing `grades-admin` **v6 → v7**, verify_jwt=true retained. Exact 19-file dependency
  graph read back and matched source 95d925a. Only admin/http and the new snapshot module
  differ from the previously deployed function. Bundle SHA256:
  `9453b5d5b86ad35ba7f3dcc9752ac847a217dd8b2bb8453b9b19bf9a782e69de`.
  `student-lookup`, keys and CORS configuration were not changed.
- First UI attempt was blocked locally by the default-disabled frontend flag (no backend
  call). Created ignored `.env.local` with VITE_GRADEBOOK_ENABLED=true for this approved
  test environment only. Quick Tunnel then correctly returned OPTIONS403 because its
  origin is not allowlisted; no POST followed and it was not retried. Used the already
  approved `http://localhost:4173` origin instead. Owner logged in there; no credentials,
  tokens or cookies were extracted/copied. Production build default remains disabled.
- Actual Chrome + hosted Auth/Edge/DB: 31 rows paginate 20/11; global name DESC changes
  the first page and preserves hidden CCCD; score workspace offers all 31 students and
  sorts original score values. Both CSV and XLSX actions for both tables complete through
  the real endpoint with no error or unsaved changes. Audit confirms **2 rank snapshots
  and 4 full export snapshots, each covering 31 records**, irrespective of the visible20.
  Score export includes both semesters/all 8 subjects (496 data rows + header by GB-10);
  byte-level formatting/precision is covered by the retained independent round-trips.
- Two finite native-fetch negative requests, no SDK or retry: missing admin JWT →401;
  direct RPC with publishable key only →401; neither returns private data. Runner stays
  ignored under tests/local, outside CI and application output.
- Four manual SQL inspection calls: preflight/version/count/function fingerprint;
  post-migration ACL/function fingerprint; pre-test data fingerprint; final fingerprint
  and class-level audit counts. Final: **31 students,62 scores; student data unchanged=true,
  score data unchanged=true, existing functions unchanged=true**. Only authorized
  class-level snapshot audit events were added. No rows were deleted or edited.
- Client test budget: at most21 Edge/Data API requests including preflights/negative
  requests, derived from the finite UI sequence (9 successful operations plus2 negatives).
  Bounded function logs observed OPTIONS204×9, OPTIONS403×1, POST200×8 and
  POST401×1; one successful client operation is absent from that provider trace, so it
  is not claimed as an exhaustive traffic ledger. All6 data snapshots are independently
  confirmed by DB audit. No operation was re-executed to fill a log gap. No 429,503 or
  hosted timeout was observed.
  SDK Edge paths are source-verified retry(false); direct negatives use fetch once.
  Provider-internal Auth/profile/RPC requests are normal per-operation work, not included
  in this client count; existing Auth/session bootstrap traffic was not independently
  measured. Five bounded log queries were used: source discovery, key-only schema inspection,
  exact denial diagnosis, end-of-run counts and one delayed trace reconciliation. No
  request was retried and no background polling was configured.
- Hosted screenshot `tests/local/export-sort/hosted-desktop.jpg` is ignored and cropped
  before individual student rows. Browser download-event limitations from the offline
  phase remain; owner already confirmed native XLSX receipt. No raw exported files,
  credentials or private payloads were added to Git/PR/artifacts.

## Release boundary

GB-10 source, offline tests, Chrome UI and this bounded synthetic hosted acceptance are
PASS. Keep the requested PR Draft; no merge/main change or public website deployment.
Real personal data, real-device/Safari, managed concurrency and the project's broader
operational/recovery gates are not established by this feature test. Localhost is the
working test URL; the Quick Tunnel origin remains intentionally unauthorized by CORS.

## XLSX presentation-only refinement — 2026-10-31

Owner supplied `mau-bang-diem.xlsx` solely as a visual reference: one sheet, emerald header, wide columns and frozen header/identity columns. The new export remains independent of this file; no template bytes, samples or personal data are included in the repository.

- XLSX roster: one named worksheet, readable main title and metadata line, header row 4, differentiated name/identifier/date/status columns, alternating pupil groups, sensitive-ID text preservation, explicit bounded widths, filters, frozen identity/header rows and print margins.
- XLSX scores: **exactly two worksheets, `HKI` and `HKII`**, each with the complete sorted student list and all catalog subjects for its semester. The redundant mixed-semester column is removed only in XLSX; existing CSV matrix and API/DB contracts remain unchanged. Blank/zero/raw decimal strings remain exact, including leading zeros in identities. No extra grade summary or invented average.
- Palette: emerald / muted mint, contrast-conscious white headings, minimal grid borders, restrained status color, 25-point data rows and landscape score printing. No formulas, macros, external links, persistent file storage or new runtime dependency.
- New focused pure regression reads generated spreadsheets independently by sheet name and checks full per-semester row order, all columns, blank scores, exact decimals, empty/header-only roster and structural style/freeze/width tags. This is a source-only refinement; it requires no hosted calls, mutation, migration or function redeployment.

This refinement changes **only** `src/utils/gradebook-export.js`, new `src/utils/gradebook-xlsx.js`, pure export tests and documentation. Existing administrative loader, sort behavior, authorization, CSV and original snapshot semantics are not modified.

### Synthetic workbook visual review (new XLSX formatting)

A one-time GitHub Actions specimen job generated two XLSX files by running the **same shipped `styledXlsxBytes` code** with two fictional pupil records, one inactive and deliberately exact sample values `8.12345`, `7.25`, `0`, and 9-digit IDs with leading zeros. No Supabase, browser, student records or other live services were accessed. A separate spreadsheet renderer imported both output workbooks and rendered HKI, HKII and roster: green title/header hierarchy, restrained alternating row groups, status highlighting and independently sized/frozen columns are legible. Independent XLSX structure/import also confirms exact data, identities, both semesters and blanks.

One rendering limitation was observed: the spreadsheet preview renderer visually suppressed leading zeros of numeric-looking identity **even though its own cell-value inspection returned the exact string with zeros**. To harden compatibility, all exported inline-string cell styles explicitly use Excel's built-in Text format `numFmtId=49`, with `quotePrefix=1`, and the pure tests assert this. A fresh specimen built after this change confirmed XML and parsed string values remained exact; the preview renderer still suppressed zeros. Do not infer actual Microsoft Excel display behavior from this preview tool. This is not a change in underlying file values or a claim of a completed native Excel UI test.

Temporary specimen and formatting workflows were removed after the test; synthetic preview artifacts live only in the ephemeral workflow outputs and are not bundled into the website or committed to source. The only production path changed is client-side XLSX encoding; the existing CSV implementation, API and database remain untouched.

## XLSX XML compatibility hotfix — 2026-10-31

An owner-reported XML repair/unreadable-data error after Excel export was investigated against the saved synthetic XLSX sample and writer source. All XLSX parts parsed as *well-formed* XML and lenient independent readers imported rows, but worksheet-level element sequence was invalid for SpreadsheetML `CT_Worksheet`: the writer placed `mergeCells` before `autoFilter`. That can cause strict Microsoft Excel validation/repair failures and data loss when opening the generated file. The fixed sequence is `sheetData`, `autoFilter`, `mergeCells`, `printOptions`, `pageMargins`, `pageSetup`, `headerFooter`.

Source fix is restricted to the pure browser XLSX generator, plus an explicit OOXML child-order regression for the **HKI**, **HKII** and student worksheets; existing per-cell text/identity/decimal round-trips remain in place. This is not a Supabase/API/DB/migration/CI policy change; no hosted queries or student data are needed to test it. The original sample predates the fix and should **not** be used for native-Excel acceptance. The original Excel repair dialog/log was not supplied, so the XML-order defect is a concrete proven writer defect and a likely cause, but native Excel open still needs separate verification.
