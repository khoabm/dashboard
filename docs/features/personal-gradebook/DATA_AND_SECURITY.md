# Data and security design — Bảng điểm cá nhân

**Status:** architectural proposal supporting [approved BRIEF](BRIEF.md); no schema/API deployed. Read [existing DATABASE](../../DATABASE.md), [SECURITY](../../SECURITY.md), and current Supabase docs before implementing. The current application's six `public` tables (`boards`, `sections`, `posts`, `attachments`, `admin_profiles`, `audit_logs`) must retain their semantics/policies.

## A. Minimal extensible data model (six small tables)

Avoid 8×7 columns, separate semester tables, multiple score tables per subject, generic EAV metadata or a full permissions framework. Use one row per recorded score and **two small seeded catalogs** for future extensibility. Example shape; actual SQL migration must be reviewed before any apply.

| Table | Minimum columns and constraints | Purpose |
| --- | --- | --- |
| `classes` | `id UUID PK` or consistent generated surrogate; `name TEXT NOT NULL`; `school_year TEXT NOT NULL`; `is_active BOOLEAN`; `semester_1_published_at TIMESTAMPTZ NULL`; `semester_2_published_at TIMESTAMPTZ NULL`; timestamps; partial unique active class | One active class UI; retain archived school years |
| `students` | `id BIGINT GENERATED ALWAYS AS IDENTITY PK`; `class_id FK`; `full_name TEXT NULL`; `birth_date DATE NOT NULL`; `identity_ciphertext BYTEA/TEXT NOT NULL`; `identity_lookup TEXT NOT NULL`; `active BOOLEAN`; timestamps; `UNIQUE(class_id,identity_lookup)` | Teacher CRUD with two mandatory identification fields, DB-generated internal ID |
| `subjects` | `code TEXT PK`, `display_name TEXT`, `sort_order SMALLINT UNIQUE`, `active BOOLEAN` | One central ordered subject vocabulary, V1 seeded with exactly eight names from BRIEF |
| `score_columns` | `code TEXT PK`, `display_name TEXT`, `sort_order SMALLINT UNIQUE`, `active BOOLEAN` | One central ordered score vocabulary, V1 seeded with exactly seven names from BRIEF |
| `student_scores` | `student_id BIGINT FK`, `semester SMALLINT CHECK IN (1,2)`, `subject_code TEXT FK`, `score_column_code TEXT FK`, `score NUMERIC NOT NULL CHECK (score BETWEEN 0 AND 10)`, `created_at`, `updated_at`, `updated_by UUID FK to auth.users`; composite PK of (student, semester, subject, score column) | Preserves exact decimals; 0 != no row; supports one-transaction insert-only import |
| `lookup_attempts` | HMAC-scoped lookup key, attempt counter, `blocked_until` and timestamp/expiry index | Atomic server-side throttle with cleanup; no raw identifiers or IP persisted |

`classes.id` choice should follow existing project conventions without altering user-visible behavior. `students.id` specifically is **auto-increment**, per latest requirement; identifiers stay internal, never required import fields. Generate stable catalog `code` values, e.g. descriptive English machine codes, but NEVER use them as UI headings. Seed **exact names/orders** from GB-04 and GB-05; avoid CHECK(enum) lists duplicated through JS/SQL.

For nonempty `student_scores`, a student belongs to one `class_id` and that class has a year. All student queries derive class/year from the owning record; never accept an arbitrary client-chosen student_id for read authorization. Restrict class delete when students exist; default to deactivate rather than cascade-delete student points. Maintain admin audit within existing approach without allowing clients to spoof actor. Do not copy teacher ownership model from unrelated product.

**Score precision:** PostgreSQL `NUMERIC` with no declared scale and a 0–10 CHECK. Do not use `NUMERIC(3,1)`; explicitly parse/validate decimal strings (finite decimal, no scientific notation if avoiding ambiguity) and reject values outside range. Test raw 8.24, 8.25, 8.26, 0 and 10 round-trip unchanged through CSV, Excel, JSON, SQL, edits and sorting. Do not rely on binary float for authoritative point arithmetic. One-decimal format is display-only; decide and document tie-breaking consistently (recommended half-up for nonnegative scores, implemented on decimal representation). The histogram grouping follows a documented decimal bucket function separate from raw point value.

## B. Scope and migration safety

- New grade data tables should live in a **non-exposed schema** (e.g. `private` where allowed); allow access only through carefully reviewed server-owned entrypoints. Database `REVOKE` and RLS (where applicable) are defense in depth. Avoid exposing a SECURITY DEFINER RPC callable with elevated rights directly to `anon`.
- Existing `public` board tables/RLS and existing single-admin `admin_profiles` are untouched. No Supabase Auth accounts per student.
- Write an **additive versioned migration**, transactionally applied after schema/security review on an approved environment, with indexes, grants, FK restrictions, constraints and idempotent catalog seed. Confirm no collision with preexisting private schema/routines.
- Migration/rollback notes must explain how to restore without deleting grades or touching board data. Do not apply to live project in a docs-only pass; never add real PII to seed/test.
- Preserve one active class invariant; `school_year` retained for historical data. V1 teacher UI does not offer multi-class management.
- When catalog names/order change in a future version, use a dedicated migration and preserve existing score FK codes.

## C. Identity handling and lookup

1. Teacher entry / file import: validate 9–12 ASCII digits and real date, preserve leading zeros. HTTPS transport only. **Never treat CMND/CCCD as DB PK or a numeric column.**
2. A server-only Supabase Edge Function computes an HMAC-SHA256 **blind index** (private pepper) for exact matching and uniqueness; encrypts original document number with an authenticated reversible cipher (AES-GCM, random nonce per record). Store nonce/algorithm version with ciphertext, never in plaintext fields. **Separate keys** for HMAC and encryption, provisioned through function secrets. Re-key rotation must be possible without losing IDs.
3. Admin may decrypt only in an explicitly authorized workflow (prefer masked display; do not return entire cleartext identifier lists by default).
4. Student supplies document number + date via a **POST body** to a server-controlled lookup; server computes HMAC and checks date + active student + publication. Generic denial must not disclose which part matched. Neither inputs nor raw identifiers may be logged/placed in URLs, analytics, service traces, client persistent storage, backups in Git or test artifacts.
5. Lookup issues a short-lived **memory-only** opaque or signed capability limited to one student (and current class), validated server-side for each subsequent grade/histogram read; never use a client-supplied student id to choose records. Expiry and unpublish/deactivation revoke access on each server-side read.
6. This is **knowledge-based identity verification, not strong authentication**. Attacker who knows the pair may see grades. The decision explicitly omits OTP/student Auth; record residual risk, privacy requirements and fail closed if adequate throttling/privacy cannot be provided.

## D. Rate-limit and privacy design

- Implement **server-side atomic** rate limiting; not a frontend debounce and not simply trusting spoofable `X-Forwarded-For`. At least protect per document blind-index and a separate reliable abuse signal where available; also throttle invalid/unknown identifiers. Use fixed attempts/window and lockout expiry defined/tested in CP01; choose limits to balance pupils on shared school networks and abuse. Document operational ability on Supabase Free; do not assume Edge Functions provide durable per-instance memory or free turnkey WAF.
- Return no PII when credential mismatch/expired/blocked. No direct anon table reads. Teachers write only after verifying live Supabase Auth user and `active admin_profiles` via server; never trust `user_metadata` or frontend flags. An Edge Function using a privileged secret key bypasses RLS, so enforce authorization and specific payload validation on every operation.
- Restrict CORS origins as practical for deployed site and controlled QA; CORS is not authorization. No secrets/PII in static Vite bundle. `Content-Security-Policy`, safe text rendering, no persistent credential cache, response `Cache-Control: no-store` for private grade APIs.
- Histograms: server returns only `{score_bucket, student_count}` aggregates for the **selected published semester + subject + column** in the active class. Student sees only their own raw score; no peer rows/identities. Keep the no-student-chart policy for unpublished semesters, even when a cached client capability exists. For very small cohorts/minority score cells, suppress counts/charts according to an agreed privacy threshold (proposed: at least ten eligible scored students for any histogram); flag as safety decision to validate before release rather than promising perfect anonymity.
- Distinguish chart **bucket** from raw score. Group by display tenth via a deterministic decimal half-up rule. Highlight the matching bucket and show exact personal raw score separately; do not falsely claim grouped students have identical scores. On an unavailable score, show neutral empty state/no highlight.
- Audit high-impact admin actions (import, delete, publish/unpublish) without writing raw identifiers or full row payloads. Determine legally appropriate retention and backup controls for children's information before real data import.

## E. Minimal Edge API contract

Two functions (no standalone server), separated responsibilities:

| Function | Allowed caller | Operations |
| --- | --- | --- |
| `grades-admin` | Existing authenticated verified active admin only | class metadata; student CRUD/secure reveal when necessary; student INSERT-only import; manual score CRUD; score INSERT-only import; semester publish/unpublish |
| `student-lookup` | Anonymous user with pair verification or valid short-lived lookup capability | verify pair and return limited own published grades; one selected aggregate histogram when requested |

Callers' Supabase `publishable` key does not confer admin rights. Authenticate `grades-admin` using verified JWT/user/profile **before privileged DB access**, including import and reveal. Differentiate invalid/expired/revoked user. For public lookup, use narrowly scoped endpoint; if platform's function-level JWT verification is disabled for access by anonymous students, this does **not** bypass application-level validation, server throttling or grade publication checks. Keep privileged secret confined to server environment.

**Atomic insert-only imports:** parse/untrusted file in a safe bounded parser (client preview allowed; server revalidates), build prepared rows with resolved student ID, refuse duplicate file rows / existing PK conflicts, and insert in **one PostgreSQL transaction** (e.g. reviewed private RPC invoked only by privileged server). If any invalid record, do not write any. No client-side per-row commit, no `onConflict: ...` upsert, no silent skip. If the provider doesn't offer a straightforward transaction call, add a narrow server-only transactional DB function and test permissions; avoid inventing a general import framework.

## F. Excel/CSV contract and controls

**Students — ordered visible headers:** `Họ tên` (optional field), `CMND/CCCD` (required), `Ngày sinh` (required).

**Scores — ordered visible headers:** `CMND/CCCD`, `Ngày sinh`, `Môn`, `Thường xuyên 1`, `Thường xuyên 2`, `Thường xuyên 3`, `Thường xuyên 4`, `1 tiết`, `Giữa kì`, `Cuối kì`. Semester chosen in teacher UI before upload. `Môn` cell matches one of eight literal GB-04 labels. No teacher-entered ID/key. Prevent PII-bearing imports from being uploaded to Storage or included in repository artifacts.

Validate file type/size/row cap/encoding, header mapping, duplicate student IDs/score coordinates, dates, precise decimal values, unknown student, existing score conflict and class/semester permission. Import preview gives row/column errors and a count of new records; **any error blocks entire import**. Blank score = skip, never delete/update. Excel numeric cells that lost leading zero cannot be inferred safely; require text formatting and surface correction steps. Prevent CSV formula injection when generating templates/exports containing user strings (treat input as text rather than spreadsheet formula). Teacher manual edits remain separate.

**Data transaction outcomes:** success inserts all intended records, or failure inserts none. No “partial imported” success UI; idempotent retry cannot duplicate thanks to DB uniqueness and all-or-nothing checks. Avoid an implicit UPDATE on import even if all imported points have different values.

## G. Unresolved implementation defaults (not blockers for docs, must validate before deployment)

- Rate-limit ceilings, expiry and unlock workflow; histogram privacy threshold/suppression; student capability lifetime; full legal retention and authorized data export/delete; grade publication details when admin edits a visible semester.
- Choose a small, auditable `.xlsx` parser with acceptable licensing/weight only when needed; CSV support should not require heavy dependencies. No overbuilt generic parser infrastructure.
- Decide how new client routes share existing admin state without forcing student login; confirm host deep-link fallback and CSP for Supabase Functions, not Cloudflare Quick Tunnel's ephemeral host.
- Backup/restore plan must include encryption keys in a controlled secret-backup procedure; losing keys loses access to reversible identifiers. Do not store them in Git.

Do not silently interpret these *proposed* details as additional user-approved features. Implement the smallest secure variant and report tradeoffs. Real data import, auth config changes, DB migration and public deploy remain separate approval/review gates.
