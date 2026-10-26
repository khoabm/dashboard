# CP01-B3 — transaction draft review (2026-10-26)

Baseline/local/remote `d86627f897e970b2c7ccccf562948bf38b51590c`, branch `feature/personal-gradebook`, clean before B3. B2 is accepted and unapplied on hosted Supabase. B3 adds `20261026030000_gradebook_transactions.sql` after B2; all five prior migrations and BRIEF V1.2 are unchanged. Commit containing this document anchors evidence. **B3 READY FOR REVIEW, NOT APPLIED.** B4/B5 NOT STARTED; CP01-C/real-data gate NOT RUN.

## RPC inventory and trust boundary

22 public SECURITY INVOKER RPCs, all exact signatures explicitly revoke PUBLIC/anon/authenticated and grant only service_role. All helper functions are invoker with empty search_path and explicit ACL too. No new table, role, default privilege, board function/policy, secret or hosted configuration change. The existing B2 boolean helper is the only SECURITY DEFINER function. Audit prerequisite checks require existing server INSERT/sequence USAGE; the draft does not broaden old grants.

- Teacher: `gb_class_create/read/patch`, `gb_students_list`, `gb_student_create/read/patch/status/delete`, `gb_score_put/delete`, `gb_scores_read`, `gb_semester_set`.
- Import: `gb_roster_preview/apply`, `gb_scores_preview/apply`.
- Trusted B4 student path: `gb_lookup_context`, `gb_pair_check`, `gb_student_grades`, `gb_histogram`, `gb_limit`.
- `gb_student_read(reveal=true)` returns only that authorized record's encryption envelope to B4 and audits the class; ordinary DTOs exclude crypto. B4 alone decrypts and sanitizes the outgoing response. List/read IDs and revisions are strings; own scores are canonical strings. List responses are bounded arrays (100 default/200 maximum); B4 derives cursor from last immutable ID. Scores.read returns each student's bounded slots, no student histogram admin API.

Teacher actor/session must originate from verified B4 context. SQL rechecks admin_session_ok after class lock. Student IDs/epochs likewise must originate from B4 verified/decrypted capability; these functions do not authenticate unsigned claims. Anyone holding service_role can bypass RPCs using table privileges: no claim of defense against stolen privileged credentials. B4 must never forward arbitrary actor/session/ID/crypto from browser JSON.

## Server DTO and minor signature clarifications

SQL positional scalar argument names/signatures are authoritative in the migration; B4 must use these exact names, never guess from earlier proposed p_* examples.

- `cid UUID`, `sid BIGINT`, revisions/epochs typed BIGINT; B4 validates lexical IDs and sends JSON strings. Typed Postgres arguments alone do not validate original JSON spelling.
- Roster rows use `{row,lookup,lookupKeyVersion,birthDate,fullName?,ciphertext?,nonce?,encKid?}`. Lookup/nonce/ciphertext are lowercase hex from B4, not editable client fields. Creation requires the envelope; existing-name-only imports do not rewrite identity. Layout headers width2 forbids fullName, width3 permits absent/blank/nonblank. Headers retain arbitrary ordered labels. Strict ascending source rows allow gaps, ≤2000 rows, ≤4MiB JSON rows, bounded labels. PostgreSQL text is valid Unicode; B4/B1 enforce raw UTF16 limits before JSON parsing/transport.
- Score rows use `{row,lookup,lookupKeyVersion,birthDate,subjectName,scores:[seven string-or-null cells]}`; ten ordered header entries declare A–J. Catalog label values (C) remain exact. Empty string/null skip; numbers and sixth lexical digits fail. Scores use SQL regex/type/range checks before numeric cast. DOB is canonical text, strict DATE cast/calendar validation, one Vietnam day per batch.
- Pair check takes class UUID + lookup hex + DOB text + key version (text/hex transport rather than proposed DATE/BYTEA ensures strict API grammar). Null return is neutral missing/inactive/DOB mismatch; no browser exposure. Limiter uses fixed `reading BOOLEAN` rather than proposed kind text, optional HMAC hex. Neither accepts a custom budget or clock. These are narrow transport refinements, not business changes.

## Locks, mutations and audit

Every supported associated write takes class FOR UPDATE; preview/admin reads and student reads take FOR SHARE, followed by a fresh state query. Functions performing authorization/locking are VOLATILE. Locks persist through caller transaction. Native READ COMMITTED is required. Manual student/score rows are then locked; imports serialize on the class and resolve/update records under that lock. No arbitrary SQL or operation dispatcher. Class initial creation has no row to lock: one-active unique index arbitrates racing setup. No automatic class lifecycle/rotation maintenance RPC is invented; any later authorized maintenance must obey the same lock/epoch protocol.

Publication checks only selected semester. Semester mutation changes class revision/timestamp and audit, never global/student epochs or other semester. Manual published score put/delete require acknowledgement; import denies a published semester. Student status/identity/DOB changes bump capability version; name-only change does not. Metadata-only class edits leave scores and epochs intact. Student hard delete restricts existing scores. No-op manual changes do not audit; successful no-op imports record count=0 without rewriting records.

One shared planner validates/reads all rows before any apply DML. Preview returns projected counts/errors without writes/audit. Errors contain row/column/category only; no token hash for invalid batches. Apply recomputes state under class write lock, compares trusted expected hash before writes, then writes allowed fields and one allowlisted class-scoped audit count in the same transaction. A stale/error/audit/constraint failure aborts all mutations. Import errors are intentionally generic `invalid` categories to avoid leaking values; structural batch errors are controlled exceptions. PostgreSQL constraint exceptions may have internal DETAIL: **B4 must discard diagnostics and send safe allowlisted HTTP errors**, never forward DB error payloads.

Concurrency reasoning (reviewed, **multi-connection execution NOT RUN**): two missing-student/score previews can agree, but first apply changes EXISTS/MISSING state; second acquires class lock afterward and rejects hash mismatch. Manual score changes invalidate revision/raw-value state. Publication and import share class lock; a queued operation rechecks committed active/publication state after lock. Failure before audit leaves no rows committed. Unsupported privileged maintenance that ignores the class lock remains outside this guarantee.

All locking function entrypoints set 3s lock_timeout. A function-local statement_timeout cannot reliably establish the outer statement deadline: B4/approved database deployment must establish the 15s statement deadline before execution. Draft migration's SET LOCAL statement_timeout bounds DDL only. Real timeout/HTTP failure mapping and lock-wait tests remain CP01-C. No partial success is returned on errors.

## Fingerprint v1

`gradebook.plan` uses the same typed frame/tuple grammar as B1: N vs V<byte-length>:UTF8. Context fields, catalog fields, existing/missing students (including stored crypto and DOB-match bit), and nonblank existing/missing score coordinates follow CP01-A §8.2 order. Variable sections carry scalar counts: subjects, columns, students, scores. Catalog/student code sorting uses C collation; score sorting numeric student ID then code (semester fixed in scope). NUMERIC uses trim_scale; timestamps integer epoch microseconds; text unnormalized. SHA256 uses PostgreSQL built-in sha256(bytea), no extension/secret. Planner returns internal hash, never transcript; only service-role functions can execute. Proposed fresh encryption material is not DB state. Header/source row/input field intent binding remains B4's separate canonical input digest.

Executed cross-runtime parity includes UTF8 Vietnamese/emoji/null/empty and BIGINT-text tuple vectors plus an independently assembled complete missing-student context/catalog transcript hashed by Node crypto and compared with SQL internalStateHash. SQL tests also prove existing-vs-missing changes, raw-score change without revision, and 8.25/8.25000 equivalence. B4 keyed commitments/token signing/expiry/input/session binding are NOT implemented; expected hash is trusted server context, not browser authorization.

## Limiter and failures

Separate completed RPC transaction precedes sensitive pair/read operation. Per-document 5/15min; global verification60/min +300/15min; read120/min. DB statement clock, fixed windows, atomic conflict increments saturated limit+1, deterministic global→identity ordering. Unknown identities count the same; malformed syntax uses NULL identity with global charge. Global denial allocates no identity row. Ordinary denial returns allowed=false/retryAfter and commits; it does not raise. B4 must await completion, never wrap limiter and failing lookup inside one rollback transaction. Timeout/missing result/error means no sensitive call and safe503; ordinary deny maps429.

Expiry window end+30min, indexed deletion≤500 expired rows ordered with SKIP LOCKED to avoid cross-scope cleanup deadlock. Idle rows remain until traffic. No IP/Redis/Cron. Fixed-window boundary bursts and malicious shared quota/invocation exhaustion remain limitations; native concurrent boundary/timeout and actual school load NOT RUN.

## Evidence and follow-up matrix

Commands: `npm ci`, `npm run check`, `npm test` (81/81), `npm run build`, `npm run format:check`, `git diff --check`: PASS. B2 runner18/18 and B3 runner14/14 SQL groups PASS on fresh PGlite0.5.11/PostgreSQL18.6 with synthetic platform/bootstrap and actual migration chain. Reproduce B3 with the B2 runtime install and:

```bash
PGLITE_MODULE_PATH=/tmp/gradebook-b2-runtime/node_modules/@electric-sql/pglite/dist/index.js node tests/gradebook-b3-sql.mjs
```

Runner covers function effective ACL, actor denial, CRUD, exact decimal/calendar validation, positional widths, source gaps, roster/score no-ops, DOB/duplicate errors, stale states, forced audit failure rollback, publication/epochs, aggregate bins, denied limiter persistence/cleanup and cross-runtime framing/hash. B2 runner retains original board metadata/ACL regression; app suite retains 41 board tests. No dependency addition; SQL runner is explicit, not ordinary npm test/CI. B5 owns wiring.

**NOT RUN:** native PostgreSQL17 (binaries unavailable), multi-connection UPSERT/read-unpublish/two-apply/limiter/class lock barriers, real timeout failures, hosted JWT/API/RLS/Storage/advisors, browser, exact-HEAD GitHub CI. CP01-C must execute those cases using approved environments. Local role/fixture tests do not prove hosted Supabase security. Pre/post and data-safe forward-fix/rollback strategy extends B2 review: inventory/drop only new exact signatures in reverse dependency order on empty disposable DB, no broad CASCADE or old migration edit. With real data prefer forward fixes/disable access and separately rehearsed encrypted restoration. No rollback is executed here.
