# Implementation Brief — Bảng điểm cá nhân

**Version:** V1.0 approved requirements consolidated 2026-10-25, with precision/extensibility/import refinements. **State:** SPECIFIED, NOT IMPLEMENTED. **Owner:** existing single teacher/admin. The IDs `GB-xx` below are stable acceptance references, not API or database keys.

This feature is additional to, not a rewrite of, the current KHTN8 Board. Exact approved labels/order below take precedence over abbreviated examples in earlier discussions. See [DATA_AND_SECURITY](DATA_AND_SECURITY.md) for candidate storage/API architecture and [CHECKPOINTS](CHECKPOINTS.md) for work items.

## GB-01 — Navigation, permissions and scope

- Add a hamburger menu at the **far left of the existing header**, with exactly the new primary navigation choice **Bảng điểm cá nhân** alongside **Bảng học liệu** in V1. Keep existing header identity, responsive behavior, keyboard access, focus and dismiss behavior.
- Suggested paths: `/` board, `/bang-diem` student lookup/results, `/quan-ly-diem` teacher administration. Path names are a proposal; static hosting deep-link refresh **must work**. No large SPA framework or new standalone Node backend.
- One **active** class (e.g., `6A8`) for V1, with editable class name and school year (e.g. `2026–2027`). Preserve historical school-year data; do not build simultaneous multi-class management.
- Reuse the existing single admin account and existing loading/pulse patterns. Viewer of public board remains anonymous; grades are **never public via direct table SELECT**.

## GB-02 — Student identity and retrieval

- Student-facing form requires **CMND/CCCD**, 9–12 characters consisting of digits only, and birth date via an accessible, visually polished datepicker displayed `DD/MM/YYYY`. Text entry never converts ID to numeric, trims significant leading zeroes or allows letters; server revalidates. Reject impossible dates.
- The chosen 9–12 input policy is project-specific; do not imply all lengths are legally issued CCCDs. UI label is **CMND/CCCD**, not “CCCD 12 số bắt buộc”.
- No extra password, OTP, teacher-issued code or student login account in V1. The user has explicitly accepted this tradeoff.
- The two fields must match on server before releasing student-specific data. On mismatch, rate-limit or error, show a neutral message without revealing whether the ID or birth date exists. Credentials must not appear in query strings, browser storage or logs.
- A successful lookup may issue a short-lived **memory-only** capability for follow-on histogram requests; refresh/expiry requires re-verification. Technical TTL is subject to security review.
- **Explicit residual risk:** anyone who knows both identifiers may impersonate that student. Encryption at rest does NOT remedy this authentication weakness; do not claim otherwise.

## GB-03 — Student records and administration

- Teacher may create, list, view, edit and deactivate/delete student records in an admin-only UI; deliberate, confirmed destructive operations must preserve integrity and avoid accidental point loss.
- **Both CMND/CCCD and birth date are mandatory** for manual creation **and Excel/CSV student import**. Name is optional per approved scope (recommend displaying it when present).
- Do not ask teacher to type `HS001`, `student_id` or any dedicated import identifier. Database creates an internal primary key; chosen baseline: auto-increment identity for students, invisible in input UI.
- Duplicate identities in a class must be detected by secure lookup (not plaintext key). Conflicting birth dates must be reported rather than silently updating a student.

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
- Score range **0–10**. **Store the exact entered decimal without rounding** (no `NUMERIC(3,1)`, no `parseFloat(...).toFixed(1)` before write, no silent truncation of imported decimals). Format to **one decimal place only when showing on screen**. Sorting, comparison, import duplicate detection, future aggregation and calculations use raw numeric value. `0` is a real score; absent entry displays `—` and is distinct from 0.
- Example: raw `8.24`, `8.25`, `8.26` retain their values and sort in that order even if display yields `8.2`, `8.3`, `8.3`. Define and test one consistent decimal rounding mode; avoid floating-point tie errors. A reasonable input length/precision safety bound may be validated **without changing saved value**; never use DB scale coercion.

## GB-07 — Manual entry and INSERT-only Excel/CSV import

Teacher can manually enter/edit/delete scores and student info, **plus** import both `.xlsx` and `.csv`. Import is explicitly **INSERT only**, never UPDATE/UPSERT. Editing existing records is through manual CRUD.

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

Teacher selects **semester before import** (not repeated in file). Match an existing active student by secure CMND/CCCD lookup **AND birth date**; the class context is implicit. “Môn” uses exact GB-04 names. The UI template must contain no student ID, `HS001` or hidden required key column.
- Blank score cell = skip without inserting, changing or deleting anything. A previously stored point is never overwritten by import.
- Duplicate student within file, duplicate exact score slot, missing student, invalid identity/date, malformed headers or non-decimal/out-of-range score => **reject whole file** and show errors by row/column; teacher corrects source before retry.
- Preview parse results and errors before any write. Commit **all-or-nothing** using a server-side transaction/batch validation; don't loop browser INSERTs producing partial success. No silent “skip duplicate then success”.
- Do not upload raw sensitive Excel/CSV files to Storage by default, cache them persistently or log them. Use user-approved data transport and size limits.
- Student import and score import are separate flows; download templates from admin UI. CSV UTF-8/BOM and Excel date cells need explicit parsing tests.

## GB-08 — Student grade view and chart

- After successful verification, display one semester at a time with **eight subjects × seven ordered columns**, responsive. On desktop use a table; on narrow screens support horizontal scrolling with readable subject anchor or appropriate cards without hiding fields.
- **Click/tap a score cell** (example: Toán → 1 tiết) to open a chart modal, defaulting to exactly its current semester, subject and column. A blank cell may open chart with a “Chưa có điểm” explanation and no highlight.
- Modal has two accessible **dropdowns** (subject, column) for changing histogram without closing; close/Escape/focus restoration, loading/empty/error handling. Desktop modal; mobile near-fullscreen dialog/bottom sheet with touch-friendly controls.
- **Bar chart**, horizontal axis = numeric score scale 0–10, vertical = number of students in active class at a score/bucket. Only backend-issued aggregate counts may reach student client; no lists of other students' grades, names or identities.
- Histogram may bucket by displayed tenth for legibility, but must declare this grouping. **Highlight the bucket containing the student's exact raw score**, and show their exact score separately if visual value is rounded. Never claim every score in a grouped bucket is identical; don't falsely mark a neighboring bucket.
- Avoid 56 simultaneous charts or loading all histograms at page load; fetch a selected histogram on modal open/change. Long x axis must remain usable on 360/390px mobile.
- Histograms may create small-group inference risk: define suppression/minimum group policy and include privacy regression before enabling for students.
- **Teacher charts are expressly deferred** outside V1.

## GB-09 — Restraint, compatibility and excluded work

- Keep HTML5/CSS3/Vanilla JS modules, Vite static `dist/`, Supabase Free, one administrator and 0 USD cost requirement. No React/Next/Vue, separate Express API, student Auth user accounts, multi-class UI, automatic score weighted averages/classification, or teacher histogram V1.
- **Avoid over-hardcoding:** render subjects and score columns from seeded, ordered catalog data and common components; use one score storage model across semesters; centralize validation/format/import mapping. Catalog data may be administered through migrations, **not** through a new catalog-management UI for V1.
- Keep existing public board, admin Auth, posts, attachments, uploads, migrations, RLS and QA fixtures behavior unchanged. Any database change must be an additive migration, reviewed/tested separately. Feature route must not expose private data via fetch, deep link, preload, browser cache or error messages.
- No deployment, branch merge, source code implementation, personal-data insertion or actual DB migration is authorized by the request that created these documents. Each step needs checkpoint-specific authorization and measured evidence.

## Traceability

`GB-01..09` → [CHECKPOINTS](CHECKPOINTS.md). Schema/backend choices → [DATA_AND_SECURITY](DATA_AND_SECURITY.md). Any changes to confirmed names, ordering, precision, import behavior, identity factors, semester publication or chart access require explicit new user decision and a versioned amendment here.
