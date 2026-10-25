# Implementation Brief — Bảng điểm cá nhân

**Version:** V1.1, user decisions D01–D05 consolidated 2026-10-26; supersedes conflicting V1.0 import/history/privacy defaults. **State:** SPECIFIED, NOT IMPLEMENTED. **Owner:** existing single teacher/admin. The IDs `GB-xx` below are stable acceptance references, not API or database keys. Decision history: [Gradebook decisions](../../DECISIONS.md#personal-gradebook-2026-10-26).

This feature is additional to, not a rewrite of, the current KHTN8 Board. Exact approved labels/order below take precedence over abbreviated examples in earlier discussions. See [DATA_AND_SECURITY](DATA_AND_SECURITY.md) for candidate storage/API architecture and [CHECKPOINTS](CHECKPOINTS.md) for work items.

## GB-01 — Navigation, permissions and scope

- Add a hamburger menu at the **far left of the existing header**, with exactly the new primary navigation choice **Bảng điểm cá nhân** alongside **Bảng học liệu** in V1. Keep existing header identity, responsive behavior, keyboard access, focus and dismiss behavior.
- Suggested paths: `/` board, `/bang-diem` student lookup/results, `/quan-ly-diem` teacher administration. Path names are a proposal; static hosting deep-link refresh **must work**. No large SPA framework or new standalone Node backend.
- One **active** class (e.g., `6A8`) for V1. Teacher can edit class name and school year as ordinary metadata, even after scores exist. This changes neither student/score relationships nor score rows, and creates no new class/student copies or rollover workflow. **Accepted trade-off:** the previous school-year label of the same class is not preserved as an independent historical snapshot. No year lock, history table or simultaneous multi-class management in V1.
- Reuse the existing single admin account and existing loading/pulse patterns. Viewer of public board remains anonymous; grades are **never public via direct table SELECT**.

## GB-02 — Student identity and retrieval

- Student-facing form requires **CMND/CCCD**, 9–12 characters consisting of digits only, and birth date via an accessible, visually polished datepicker displayed `DD/MM/YYYY`. Text entry never converts ID to numeric, trims significant leading zeroes or allows letters; server revalidates. Reject impossible dates.
- The chosen 9–12 input policy is project-specific; do not imply all lengths are legally issued CCCDs. UI label is **CMND/CCCD**, not “CCCD 12 số bắt buộc”.
- No extra password, OTP, teacher-issued code or student login account in V1. The user has explicitly accepted this tradeoff.
- The two fields must match on server before releasing student-specific data. On mismatch, rate-limit or error, show a neutral message without revealing whether the ID or birth date exists. Credentials must not appear in query strings, browser storage or logs.
- Server-side rate limiting is approved: bound attempts per identity and across changing identities, handle concurrency atomically, distrust spoofable IP headers, and fail closed when the limit state cannot be checked. Specific V1 thresholds remain technical defaults pending verification in [DATA_AND_SECURITY §D](DATA_AND_SECURITY.md#d-rate-limit-and-privacy-design).
- A successful lookup may issue a short-lived **memory-only** capability for follow-on histogram requests; refresh/expiry requires re-verification. Technical TTL is subject to security review.
- **Explicit residual risk:** anyone who knows both identifiers may impersonate that student. Encryption at rest does NOT remedy this authentication weakness; do not claim otherwise.

## GB-03 — Student records and administration

- Teacher may create, list, view, edit and deactivate/delete student records in an admin-only UI; deliberate, confirmed destructive operations must preserve integrity and avoid accidental point loss.
- **Both CMND/CCCD and birth date are mandatory** for manual creation **and Excel/CSV student import**. Name is optional per approved scope (recommend displaying it when present).
- Do not ask teacher to type `HS001`, `student_id` or any dedicated import identifier. Database creates an internal primary key; chosen baseline: auto-increment identity for students, invisible in input UI.
- Resolve identities within the selected class by secure lookup, not plaintext key. Existing identity + matching birth date may be updated by roster import under GB-07; conflicting birth dates must produce an error. Manual authorized CRUD handles changes to an existing document number or birth date.

## GB-04 — Subjects: visible names and immutable order for V1

Render these **exact UI labels in this exact order** everywhere: student/teacher tables, dropdowns, import templates, previews and docs.

| Order | Display name |
| --- | --- |
| 1 | Toán |
| 2 | Văn |
| 3 | Anh |
| 4 | KHTN |
| 5 | LS / ĐL |
| 6 | Công Nghệ |
| 7 | Tin Học |
| 8 | GDCD |

Don't silently replace them with “Ngữ văn”, “Tiếng Anh”, “Lịch sử & Địa lí”, “Công nghệ”, “Tin học” or other editorial names; user chose literal presentation. Stable internal codes may differ and must map to a centrally managed catalog, never reappear as labels.

## GB-05 — Score columns: exact visible names and order

Exactly **seven** columns per subject per semester, in **this** order:

| Order | Display name |
| --- | --- |
| 1 | Thường xuyên 1 |
| 2 | Thường xuyên 2 |
| 3 | Thường xuyên 3 |
| 4 | Thường xuyên 4 |
| 5 | 1 tiết |
| 6 | Giữa kì |
| 7 | Cuối kì |

**Do NOT display `TX1` / `TX2` / `GK` / `CK` or any new abbreviations** in table headers, buttons, chart dropdowns or import files. “1 tiết” is its own seventh-system slot, separate from four “Thường xuyên” slots, regardless of differing general academic conventions. Do not add weighting/averages from legislation without a separate requirement.

## GB-06 — Semesters, publication and raw score precision

- Two separate UI tabs **Học kỳ I** and **Học kỳ II**; do not render two full tables at once. Data scoped by academic year/class, semester, subject and score column.
- Admin can publish or unpublish **each semester independently**. Before publication, no student may fetch that semester's scores **or** distribution; check on every backend request. Provide confirmation and warning for missing entries before publishing.
- Teacher can manually add/edit/remove scores. For a published semester, warn that edits immediately affect student views; batch import is disallowed until temporarily unpublished.
- Score range **0–10**, with **at most five fractional digits**. Valid: `8`, `8.1`, `8.12345`, `10.00000`; invalid: `8.123456`, `10.00001`, `-1`. Reject excess precision before writing, never round it into an accepted value. Database uses scale-free `NUMERIC`, not `NUMERIC(3,1)` or fixed-scale coercion as validation.
- Scores cross write/read API boundaries as **decimal strings**; JavaScript Number is not the authoritative write value. Form, CSV and Excel follow the same validation. Do not promise recovery of precision already lost by Excel. Numeric value must be exact; insignificant trailing zero formatting need not survive.
- Format to **one decimal place only when showing on screen**. Sorting, comparison and calculations use the original value; `0` is a real score and absent entry displays `—`. Raw `8.24`, `8.25`, `8.26` stay distinct and sort in that order. A common deterministic rounding rule is specified as a technical choice in DATA_AND_SECURITY; chart grouping may use displayed tenths without modifying stored values.

## GB-07 — Manual entry and atomic UPSERT Excel/CSV import

Teacher can manually enter/edit/delete scores and student info, **plus** import both `.xlsx` and `.csv` using **INSERT/UPDATE via UPSERT**. Existing records are not errors merely because they exist. All file validation and writes must be atomic on the server; manual CRUD remains available.

**Student import visible column sequence:** `Họ tên` (optional), `CMND/CCCD` (required), `Ngày sinh` (required). No ID/key column. Numeric-looking identifiers MUST be preserved as text including leading zeros. An Excel cell that has already lost its leading zeros cannot be reconstructed; reject/call attention to it.

**Score import visible column sequence, exact strings:**

1. CMND/CCCD
2. Ngày sinh
3. Môn
4. Thường xuyên 1
5. Thường xuyên 2
6. Thường xuyên 3
7. Thường xuyên 4
8. 1 tiết
9. Giữa kì
10. Cuối kì

**Roster UPSERT:** absent CMND/CCCD in the class inserts a student; existing CMND/CCCD + matching birth date can update allowed fields such as name. A different birth date is an identity conflict and must not be silently corrected. Blank name must not erase an existing name. Changing an existing document number or birth date requires authorized manual CRUD. The minimal technical field allowlist/duplicate handling is defined in DATA_AND_SECURITY, not a new catalog or identity-management feature.

**Score UPSERT:** teacher selects **semester before import** (not repeated in file). Resolve an existing active student by secure CMND/CCCD **AND birth date** within the class. “Môn” uses exact GB-04 names. No student ID, `HS001` or hidden required key column.
- A nonblank score inserts a missing coordinate (student + semester + subject + column), updates an existing one, or is unchanged when its raw numeric value is equal. Blank score = skip; never delete an existing score or write 0.
- Multiple rows for the same student in **different subjects are valid**. Repeated score coordinates inside the file must be detected, even if values agree; no silent last-write-wins. Roster duplicates are a separate rule.
- Missing student for score import, mismatched birth date, invalid identity/date, malformed headers, duplicate coordinates or invalid range/precision => **reject whole file** with row/column errors.
- Preview separately counts records to **INSERT**, **UPDATE**, **leave unchanged**, and **errors** (and skipped blanks explicitly). Roster counts refer to students; score counts refer to individual nonblank score slots. No partial write while errors remain. Server revalidates the preview against current data and commits all changes in one transaction; never issue independent frontend writes. Keep the unpublished-semester import restriction from GB-06.
- Do not upload raw sensitive Excel/CSV files to Storage by default, cache them persistently or log them. Use user-approved data transport and size limits.
- Student import and score import are separate flows; download templates from admin UI. CSV UTF-8/BOM and Excel date cells need explicit parsing tests.

## GB-08 — Student grade view and chart

- After successful verification, display one semester at a time with **eight subjects × seven ordered columns**, responsive. On desktop use a table; on narrow screens support horizontal scrolling with readable subject anchor or appropriate cards without hiding fields.
- **Click/tap a score cell** (example: Toán → 1 tiết) to open a chart modal, defaulting to exactly its current semester, subject and column. A blank cell may open chart with a “Chưa có điểm” explanation and no highlight.
- Modal has two accessible **dropdowns** (subject, column) for changing histogram without closing; close/Escape/focus restoration, loading/empty/error handling. Desktop modal; mobile near-fullscreen dialog/bottom sheet with touch-friendly controls.
- **Bar chart**, horizontal axis = numeric score scale 0–10, vertical = number of students in active class at a score/bucket. Only backend-issued aggregate counts may reach student client; no lists of other students' grades, names or identities.
- Histogram may bucket by displayed tenth for legibility, but must declare this grouping. **Highlight the bucket containing the student's exact raw score**, and show their exact score separately if visual value is rounded. Never claim every score in a grouped bucket is identical; don't falsely mark a neighboring bucket.
- Avoid 56 simultaneous charts or loading all histograms at page load; fetch a selected histogram on modal open/change. Long x axis must remain usable on 360/390px mobile.
- **Accepted / Deferred for V1:** statistical inference risk, including small groups/buckets. No minimum-ten-students rule, bucket suppression, privacy engine or extra table/logic is required; missing suppression is not a CP05 blocker. Aggregate-only responses, verified access and publication checks remain mandatory. Do not claim inference risk is eliminated; revisit only in a separate milestone.
- **Teacher charts are expressly deferred** outside V1.

## GB-09 — Restraint, compatibility and excluded work

- Keep HTML5/CSS3/Vanilla JS modules, Vite static `dist/`, Supabase Free, one administrator and 0 USD cost requirement. No React/Next/Vue, separate Express API, student Auth user accounts, multi-class UI, automatic score weighted averages/classification, or teacher histogram V1.
- **Avoid over-hardcoding:** render subjects and score columns from seeded, ordered catalog data and common components; use one score storage model across semesters; centralize validation/format/import mapping. Catalog data may be administered through migrations, **not** through a new catalog-management UI for V1.
- Keep existing public board, admin Auth, posts, attachments, uploads, migrations, RLS and QA fixtures behavior unchanged. Any database change must be an additive migration, reviewed/tested separately. Feature route must not expose private data via fetch, deep link, preload, browser cache or error messages.
- **Before any real student data**, complete the separate security/data-governance gate in [DATA_AND_SECURITY §H](DATA_AND_SECURITY.md#h-real-personal-data-gate). Synthetic implementation/tests can proceed before that gate; neither CP03 nor deployment timing waives it.
- No deployment, branch merge, source code implementation, personal-data insertion or actual DB migration is authorized by the request that created these documents. Each step needs checkpoint-specific authorization and measured evidence.

## Traceability

`GB-01..09` → [CHECKPOINTS](CHECKPOINTS.md). Schema/backend choices → [DATA_AND_SECURITY](DATA_AND_SECURITY.md). Any changes to confirmed names, ordering, precision, import behavior, identity factors, semester publication or chart access require explicit new user decision and a versioned amendment here.
