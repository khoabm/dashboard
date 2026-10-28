# CP01-B2 — Foundation migration review / 2026-10-26

Baseline `282bebc89f630fe773c016c0ec7bb94b7681143e`, `feature/personal-gradebook`; local/remote matched and clean. Develop `307b6c611ca36d8d8e05a6cccf8dadd86d754a30`, not merged/rebased. The commit containing this report is the B2 draft anchor. **DRAFT READY FOR REVIEW; NOT APPLIED TO SUPABASE.** BRIEF V1.2 remains unchanged. B3–B5 NOT STARTED; CP01-C and real-data gate NOT RUN.

## Deliverables and boundaries

- `supabase/migrations/20261026014933_gradebook_foundation.sql`: one transactional, additive six-table foundation, exact catalogs, explicit RLS/ACL, boolean session helper. Four existing migrations unchanged.
- `tests/gradebook/b2-bootstrap.sql`: synthetic Auth/Storage/platform-role fixture used only inside an empty in-memory database. Deliberately broad object defaults test explicit revokes. This is not a Supabase Auth implementation and must never be executed on an existing database.
- `tests/gradebook-b2-sql.mjs`: standalone in-memory SQL runner. It accepts only a local PGlite module path, no connection URL; creates/closes its own disposable instances. Does not run in ordinary npm test or add a dependency/CI step. B5 owns later CI wiring.

The six new tables contain no plaintext document column, password/student account, secret, preview-token table or audit-history table. Seeds contain only 8 subjects/7 score columns, no class/student/auth rows. Internal codes and display order match BRIEF; editable file headers are not catalog keys. No public RPC, UI, limiter, UPSERT handler, signing/key management or session provisioning is implemented.

## Schema/security review

| Object | Enforced in B2 | Later responsibilities |
| --- | --- | --- |
| classes | UUID PK, bounded trimmed name/year, one-active partial unique index, independent publication timestamps, positive revision/access/key versions, timestamps | B3 class-first locks, metadata-only writes, revision increments, global revocation on actual lifecycle changes. No trigger changes epochs on publication |
| students | GENERATED ALWAYS BIGINT, class FK RESTRICT, nullable trimmed name ≤200 Unicode code points (B1 whitespace set), finite DATE 0001–9999, ciphertext 25–28/nonce12/lookup32 bytes, bounded key ID, algorithm=1, positive versions, class+lookup unique, class/active/ID index | B3 Vietnam current-day and class key-generation match, identity immutability/optimistic edits, revision/capability increments; B4 genuine AES-GCM/HMAC/known key IDs. Byte lengths do not prove cryptographic integrity |
| catalogs | Unique code/label/order, bounded code/trimmed label, active flag; exact deterministic seed | Controlled future migrations only; no server catalog writes granted. Physical score-import D–J maps approved positions, not edited headers |
| student_scores | Composite PK, all RESTRICT FKs, semester1/2, unconstrained NUMERIC with range/meaningful precision, positive revision, actor auth.users FK, timestamps, histogram/FK indexes | Actor FK only proves existence, not authorization. B3 verifies admin/session and raw JSON type/grammar before numeric cast; stamps/audit on real changes. Missing score is no row |
| lookup_attempts | Allowed scopes, scope-dependent empty/32-byte key, composite PK, finite window/expiry ordering, nonnegative integer counter, expiry index | B3 chooses DB-time window/retention and saturates counters/cleanup atomically. No attempt limits, windows, cleanup or fail-closed HTTP behavior implemented in B2 |

**Numeric clarification / approved newer task:** §3.4's old `scale(score) <= 5` is replaced by `scale(trim_scale(score)) <= 5`, plus 0–10 range. This checks meaningful stored precision without NUMERIC typmod rounding. `8.123450::numeric` is mathematically `8.12345` and may pass; B1 and future B3/B4 must still reject the six-place **lexical** string before casting. NaN/±Infinity/out-of-range and meaningful sixth-place values fail. A numeric column cannot establish original API spelling/exponent/JSON type. No precision-recovery claim.

All six tables enable RLS with no policies. PUBLIC/anon/authenticated get no schema/table/sequence/helper rights; postflight checks effective inherited privileges and aborts if the deny boundary fails. Service role gets schema USAGE; classes SELECT/INSERT/UPDATE only; catalogs SELECT only; students/scores/counters SELECT/INSERT/UPDATE/DELETE; identity sequence USAGE only. No CREATE/TRUNCATE, class DELETE or catalog writes. No changes to project-wide default privileges; **every future public.gb_* signature/overload must explicitly revoke PUBLIC/anon/authenticated EXECUTE in B3**. Schema invisibility is not the only protection; hosted exposed-schema configuration remains a CP01-C check.

`gradebook.admin_session_ok(uuid,uuid)` is the only new function: SQL STABLE SECURITY DEFINER, owner postgres, fixed empty search_path, qualified tables, boolean EXISTS only. It checks active admin profile and matching Auth session with null/future not_after. No JWT/unsigned caller claims are trusted by this helper: only service_role can execute; B4 must verify JWT/getUser first and B3 must pass verified actor/session. Migration preflight requires postgres, usable Auth/profile dependencies and service_role BYPASSRLS, otherwise fails closed. No broad SELECT grant on auth.sessions; no change to private.is_admin. Hosted ownership/session semantics still require CP01-C evidence.

B3 will insert one class-scoped audit event inside the mutation transaction. Existing audit target UUID accepts classes.id; actor UUID accepts verified teacher. Existing audit trigger is not attached to BIGINT/composite records. B2 grants nothing on existing audit/profile/Auth objects. Pre-apply must confirm service-role profile SELECT, audit INSERT and audit sequence USAGE; missing grants need a narrowly reviewed later change, not assumptions from synthetic fixture defaults. New FK to auth.users necessarily adds internal FK enforcement triggers there; existing board/Auth definitions/ACLs/user triggers are otherwise preserved.

## Execution and rollback plan (not authorization)

1. Before any separately authorized apply: verify intended project/Free plan, four migration versions, no gradebook/schema/function collision, postgres owner and auth.sessions(id,user_id,not_after)/admin_profiles shape, role inheritance/BYPASSRLS, audit grants and backup point. Verify gradebook is excluded from exposed schemas. Confirm actual PostgreSQL 17 compatibility and transaction wrapper support; do not blindly invoke db push, which could apply every pending file.
2. Apply only through an explicitly authorized migration workflow. The file has BEGIN/COMMIT and local 3-second lock/15-second statement bounds. All new ACL/RLS changes occur before commit. No existing data scan/update or board table ALTER is needed; FK references take normal catalog/relation locks, so schedule/observe the short migration. Collision/preflight/seed/ACL failure rolls back the entire transaction.
3. Post-apply (CP01-C): compare prior board schema/columns/constraints/policies/function definitions/ACLs/default privileges; expected additive Auth FK bookkeeping only. Inspect 6 RLS flags/zero client policies, exact catalogs, helper ownership/ACL/search_path, server grants and denied effective browser privileges. Use real anon/non-admin/admin JWT/API and zero-row direct-schema probes; local SQL roles are not JWT proof.
4. Seed blocks can be tested alone in an authorized disposable DB: matching existing values are no-ops; different labels/order/active/extra rows fail rather than overwrite. Whole schema migration is single-use; running it again fails at CREATE SCHEMA. Future catalog changes require a new controlled migration.
5. On an empty disposable DB, reverse only explicitly inventoried new objects in reverse dependency order after proving no data; no broad DROP CASCADE, public schema reset or old migration rewrite. No down migration is provided or executed. Once real grades exist, do not drop the schema to undo this: prefer forward fix/disable access, retain encrypted backups plus separately controlled identity keys, and rehearse restoration at an authorized safe destination. Audit is shared; never drop or purge it for rollback.

## Verification evidence and reproduction

**PASS: 18/18 standalone SQL groups** on **PGlite 0.5.11 / PostgreSQL 18.6 WASM**, fresh in-memory databases with synthetic platform dependencies and all four actual board migrations. Matching/divergent seed, constraints, identity generation, FK restrictions, browser role denial, test-only grants proving RLS, server least privileges, valid/expired/revoked/mismatched helper sessions, numeric exactness, independent publication, audit shape and inherited-privilege rollback verified. Snapshot compares old relations/schema ACLs/default privileges/functions/policies/triggers, excluding only new Gradebook FK bookkeeping. SQLSTATE 23001/23503 both accepted for RESTRICT across versions.

This is actual local SQL execution, **not** native PostgreSQL 17, full Supabase, Auth/JWT, network API/RLS, Storage or concurrency acceptance. Those are **NOT RUN**. Single-connection PGlite cannot prove concurrent lock behavior. No hosted query/DDL/DML or configuration operation was made. Public docs lookup is separate from project API usage.

Reproduce with an external temporary install (no change to project dependencies):

```bash
npm install --prefix /tmp/gradebook-b2-runtime --no-audit --no-fund @electric-sql/pglite@0.5.11
PGLITE_MODULE_PATH=/tmp/gradebook-b2-runtime/node_modules/@electric-sql/pglite/dist/index.js node tests/gradebook-b2-sql.mjs
```

Repository commands `npm ci`, `npm run check`, `npm test` (**81/81 existing offline tests**), `npm run build`, `npm run format:check`, `git diff --check`: PASS. Production output guard PASS; no application/dependency/old migration change. GitHub CI on B2 commit NOT RUN; no PR created. These checks do not automatically run the standalone SQL groups.

Supabase CLI 2.122.0 help/version were inspected. `migration new gradebook_foundation` produced the timestamped file, but automatic approval review then rejected the CLI action because of unapproved PostHog telemetry. No retry/workaround/remote CLI operation was performed; all SQL content/testing was completed independently. No need for further CLI execution to review this draft.

## CP01-C security matrix — all NOT RUN on native17/hosted

| Case | Required evidence |
| --- | --- |
| T01/T02 | Six tables/identity/constraints/catalogs, no exposed gradebook; real anon and authenticated non-admin deny SELECT/INSERT/UPDATE/DELETE, sequence and helper EXECUTE; no ciphertext/HMAC response |
| T03 | Owner/helper ACL, service cannot read Auth sessions directly; valid admin verified JWT succeeds through later B4/B3, expired/forged/revoked/non-admin/inactive denied; null/mismatched helper inputs false |
| T04/T05 | Global/student epoch rules enforced by later mutation RPCs, independent publication and locked read/unpublish races |
| T06/T19 | Native17 numeric value and raw API lexical checks, 0 vs absent, DATE bounds/real Vietnam future-day logic through later RPCs |
| T09/T10/T11 | Later complete fingerprint, atomic UPSERT/audit/limiter and real concurrent/fault tests; not supplied by B2 tables |
| T12/T15/T17 | Key validation/rotation/recovery, PII/log redaction, authorized real-data gate before any real entry/import |
| T13/T16/T18 | Metadata-only updates, existing board admin/public/storage behavior, exact old grants/policies, Free quotas and bounded runtime costs |
