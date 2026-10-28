# G07-3 — Staged production backup tooling / synthetic offline acceptance

2026-10-28, `develop`, starting local HEAD `8cbe2984f14d7709ee15085182b8f03cc8471810`. Remote HEAD was read before edits: `6a0daf3906e147a3882d6c7f27a712967480e8de`; the local audit commit is its descendant. **G07-3 OFFLINE PASS; G07 Operational/Overall PARTIAL. G07-4 NOT STARTED; G08 BLOCKED; deployment NOT RUN.** No production-secret acquisition, hosted access, rotation, Drive transfer or restored database was performed.

## Implemented boundary and review

This is a **staged exporter**, not an automatic Supabase secret/DB extractor. An authorized operator supplies an actual PG17 custom archive and a private state extraction from the **same exported database snapshot**, plus the existing keyrings obtained through the separately approved secret-management route. The tool never connects to a database, discovers credentials, uploads, deletes verified backups or executes restored SQL. It accepts arbitrary reviewed project IDs, unlike the unchanged synthetic-only helper. The snapshot ID/evidence and key-freeze assertions are validated for shape and correspondence, not independently authenticated against a running source server. Operator capture evidence remains mandatory.

Implementation: [production contract](../../../scripts/gradebook-backup-production.mjs), [local CLI](../../../scripts/gradebook-backup-cli.mjs), [read-only snapshot extraction](../../../scripts/gradebook-backup-snapshot.sql), [finite specialist checks](../../../tests/gradebook-backup-production.mjs). `sha256`, paired filenames and the actual application `createCrypto` contract are reused; the old synthetic format/guards, curated CI, dependencies, migrations, runtime/frontend and dedicated recovery workflow are unchanged.

Export also runs the data/crypto verifier on the supplied source state before writing a candidate, so wrong source keys fail before restore. Source review covered subprocess environment isolation, full archive decoding before SQL, explicit output ownership/no overwrite, retained-key correspondence, exact decimal/bigint strings, fixed diagnostics and receipt promotion. This is author review plus executable synthetic evidence, not a newly commissioned independent review or hosted security acceptance.

## Concern matrix and merge inventory (fixed before implementation)

| Concern | Focused verification | Result |
| --- | --- | --- |
| Complete archive, inner hash and source/migration correspondence | Actual PG17 archive; native TOC plus full SQL decoding without SQL execution; malformed/header-only/truncated-data/rehashed/mismatched archive rejection | PASS offline |
| Four rings and complete active/retained inventory | Actual unchanged runtime AES/HMAC/capability/preview, versions1/2; independent expected ring fingerprints; wrong/omitted active/retained versions rejected | PASS offline |
| Snapshot consistency | Native source fixture holds repeatable-read exported snapshot during private extraction and pg_dump | PASS for fixture; future operator capture evidence required |
| Ciphertext integrity and pairing | Actual age encrypt/decrypt, trusted ciphertext hashes/size and backup ID; missing/truncated/mixed pair/wrong identities refused | PASS offline |
| Data verifier | All six table fingerprints and five metadata groups; every student envelope decrypt/blind-index check; score8.12345/zero and bigint9007199254740993 preserved | PASS on source-extracted synthetic state; actual restored extraction NOT RUN |
| Failure/output safety | CLI fixed summaries checked against runtime private identities, all eight generated ring keys and identifiers; exclusive directories, no-checkout output, no artifact on failed auth | PASS offline |
| Frontend exclusion and committed-secret containment | Production build/exclusion and scoped output/source scan | PASS; no production secrets were used |
| Actual isolated restore/effective roles/managed services/custody | Explicit G07-4 plan below; existing technical evidence retained at its old SHA | NOT RUN here; no Operational PASS inferred |

Executable inventory: the four linked files above. Documentation inventory: this file, G07 operational audit, owner decisions, manual backup/restore guides, backup recovery evidence header, feature README/CHECKPOINTS, root STATUS/TESTING and ARCHITECTURE code map. No application or schema bug was fixed; BUG_FIX_LOG entry is not applicable to this new tooling slice.

## Private formats and bounds

All private JSON is UTF-8. Keep it outside Git, sync folders and CI. The CLI refuses private input/output paths resolving into the checkout, refuses symlink input files and requires a nonexistent output directory under an existing owner-restricted staging parent. File modes0700/0600 are used where supported; **Windows NTFS ACL inspection is still an owner prerequisite**, not a claim made from POSIX mode bits. Review the actual canonical path and ancestors before use. Local administrator/malware, paging/crash dumps and guaranteed memory/SSD erasure are outside this mechanism.

- Archive input: >32 bytes and at most32MiB. Native parsing checks PG17 custom format and all six Gradebook tables, then decodes the entire archive to SQL **in memory without executing it**. Expanded SQL is also capped32MiB, each native invocation30s, stderr/warning/nonzero/overflow fails closed. A valid TOC alone is insufficient. This does not prove that executing the SQL will restore successfully.
- Private JSON/state/manifest: at most4MiB each; at most10,000 rows per Gradebook table. Oversize means STOP, not automatic cap increase. The local SQL extractor has15s statement and3s lock limits; its single JSON result can exceed the CLI limit before the CLI sees it. Before any future hosted capture, the operator must approve/measure expected source output and enforce the external capture/egress budget; this task does not provide a hosted collection client.
- Four `settings` fields: `identity`, `lookup`, `capability`, `preview`, each the existing `{active, keys}` configuration. All supplied kids are retained and listed in `required`. Independent `expected.keyInventory` contains each ring's `{active, kids, sha256}`; kids are sorted, sha256 is over UTF-8 `canonical(ring)`. Prepare/review this **from the authoritative complete runtime/custody inventory before staging**; do not regenerate it from a suspect incomplete candidate just to pass. Include versions required by current rows/classes and both retained backups. No production keys are generated or recovered from SQL/browser tools.
- `expected.private.json`: exactly `project`, `sourceCommit`, `migrations`, `keyInventory`. Migrations is the complete reviewed ordered array of `{ledgerVersion, file, sha256}`. Ledger version and file prefix may legitimately differ; both are recorded explicitly, duplicate versions/files rejected. File hashes come from the reviewed exact Git blobs, not CRLF-normalized checkout guesses. The tool compares mapping equality; it does not query the hosted ledger or compute approval from local filenames.
- `metadata.private.json`: exactly `format='gb-recovery-v1'`, UUID `backupId`, UTC ISO `createdAt`, `project`, full40-character `sourceCommit`, `postgresMajor=17`, `migrations`, and `snapshot={id, method:'pg_export_snapshot', keysFrozen:true, evidenceId:<UUID>}`. Export adds `settings`, `required`, `inventory`, `dumpSha256`; metadata must not include alternative values for those generated fields. The evidence UUID refers to a private operator capture record, never a secret path or PII.
- `state.private.json`: exactly `tables` (all six arrays) and `security` (objects/schemas/routines/policies/defaults arrays), generated by the supplied SQL. Every table column is string or null, including raw numeric/bigint/date values. Row order/object-key order is normalized; ACL arrays are sorted in SQL. Private inventory hashes bind every supplied row/column and normalized security metadata, including epochs/revisions. This is not a full managed-platform verifier or a substitute for effective-role tests.
- `gb-receipt-v1`: opaque backup ID plus the two ciphertext filenames, sizes and SHA-256; status is always CANDIDATE_UNVERIFIED / NOT_RUN / NOT_RUN at export. No plaintext dump/key fingerprints, project data or secret values go into the outer receipt. Keep this immutable trust anchor independently; authentication does not rewrite it. Additional verification/retention records are separate. Copy only the two `.age` files into a ciphertext-only transfer directory; `receipt.json` is not an allowed third transfer file. Never remove CURRENT/PREVIOUS when creating a candidate.

## Future owner procedure — preparation only, not authority to execute

The following source acquisition, key handling and restore steps are **NOT RUN with production data**. G08 applies before any real student data is processed, including private local restore. Use synthetic inputs until then. Stop on any failure/timeout/unknown outcome; no automatic retry, manifest editing to match suspect input, password in URI/argv/history, transcript or raw diagnostics in chat.

### 1. Authorize source capture and establish independent expectations

Owner records purpose, exact source and target, synthetic/real scope, source commit/applied-ledger mapping, key-inventory origin, staging ACLs/media, private evidence reference, finite connections/commands/queries/bytes/time and cleanup authority. Verify PG17 tool provenance/version, age1.3.2 provenance/version and quota/free resources. No new provider, USB, paid add-on or secondary operational DB is selected. Credentials use owner-controlled libpq service/passfile or equivalent protected mechanism, outside argv and repo; choose a direct or persistent session endpoint supporting exported snapshots, not transaction pooling. Do not let inherited PGSERVICE/PGHOSTADDR select a different source.

Freeze application writes, DDL and key rotation for capture, explicitly including lookup/limiter traffic and sequence use; a database snapshot does not itself freeze external keyrings or sequence advancement. Obtain existing four rings securely and compare against complete trusted active/retained inventory, including previous backups. Record key/config fingerprints before/after capture. Missing secure acquisition/authority, unexpected key change, incompatible managed role/schema or unmapped migration means BLOCKED. This tooling never retrieves Edge secrets or exports cluster role passwords.

### 2. Capture one DB snapshot with its private verification state

On **source connection A**, run owner-authorized `psql -X -q -t -A -v ON_ERROR_STOP=1` using the explicitly reviewed protected libpq connection configuration. Keep this session open:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL idle_in_transaction_session_timeout = '5min';
SELECT pg_export_snapshot();
```

Record the returned snapshot ID privately. Direct psql output to the exact approved `state.private.json` using `\o <absolute-private-path>`, include `scripts/gradebook-backup-snapshot.sql` with `\i <absolute-reviewed-source-path>`, then `\o` to close output. Paths with spaces require psql quoting; no student values are entered as commands. Check psql exit/state shape/byte bound privately. Capture the exact applied migration ledger in the same source session using the pre-approved read scope and compare to the independent mapping; do not infer ledger state from the SQL files alone.

While A remains open, **connection B** runs **one** native PG17 `pg_dump` with `--no-password --format=custom --snapshot=<recorded-ID> --lock-wait-timeout=3s --file=<absolute-private-dump-path>`, using the same protected source configuration. Do not use a PowerShell binary pipeline. Capture warnings/exit code privately; any warning, nonzero exit, timeout, missing bound or expired A means STOP and do not export. After B succeeds, `COMMIT` A, confirm key/config fingerprints unchanged and end the freeze. Keep capture evidence; a metadata assertion alone does not prove this happened. Roles, Auth settings, Edge secrets/configuration and Storage bytes still need separate approved inventories/plans. Raw full pg_dump can contain Supabase internals; do not restore it over a fresh managed project without a separately reviewed compatibility strategy.

### 3. Export and authenticate locally

Prepare owner-only control JSON outside the repo. `export` requires these exact-purpose fields:

| Field | Local input |
| --- | --- |
| `expectedFile` | Independent reviewed expectations file described above |
| `metadataFile` | Snapshot metadata described above |
| `keyringsFile` | Existing complete four-ring JSON; never production keys generated by Work |
| `stateFile`, `dumpFile` | Matched source snapshot extraction and actual custom archive |
| `recipients` | `{database, keyrings}` distinct native age public recipients held by owner |
| `tools` | `{age, pgRestore}` trusted absolute executable paths |
| `outputDirectory` | New path outside checkout/sync under reviewed private staging |

Run from the reviewed repository checkout (only the path to control JSON is in argv):

```powershell
node scripts/gradebook-backup-cli.mjs export 'C:\PrivateStaging\export.control.json'
if ($LASTEXITCODE -ne 0) { throw 'STOP: export failed' }
```

The example private root must first be replaced/prepared and ACL-reviewed by the owner; it is not created automatically. Success creates two ciphertexts and a CANDIDATE receipt in an exclusive directory. No verification or retention promotion occurs. Retain the independent receipt, place only the two ciphertexts in a fresh ciphertext directory, and prepare authentication control with `expectedFile`, `ciphertextDirectory`, `receiptFile`, `identities={database,keyrings}` (absolute paths to restricted native X25519 identities), `tools`. Plugin/passphrase identity formats are rejected by the CLI. Owner enters identities from independent custody as described in the existing guide; Work does not create/receive production identities.

```powershell
node scripts/gradebook-backup-cli.mjs authenticate 'C:\PrivateStaging\auth.control.json'
if ($LASTEXITCODE -ne 0) { throw 'STOP: authentication failed' }
```

This verifies complete age authentication, trusted ciphertext hashes/size, backup ID, independent project/source/migrations/key fingerprints, dump hash and full native archive decoding. It writes no plaintext output. It remains separate from Drive round-trip and actual database recovery. The accepted owner synthetic Drive test is not repeated.

### 4. Independently authorized isolated restore and verifier

After the separate G07-4 approval, add a **new** private `outputDirectory` to auth control and run `open` instead of `authenticate`. Only after complete checks does it write `authenticated.dump` and `manifest.private.json` into exclusive restricted staging. No SQL is executed; these are secret plaintext outputs and must never enter Drive/Git/CI.

Owner verifies a **new empty isolated DB**, reviewed cluster roles/owners/extensions/AAD mapping, and no managed schema collisions. Use the existing restore guide's one `createdb` and one `pg_restore --exit-on-error --single-transaction` template against that exact approved loopback destination. No `--clean`, `--create` against existing DB, `--no-owner`, `--no-privileges`, session replay or automatic repair. On failure retain the target isolated and follow approved cleanup, not retry.

After successful restore, use one read-only psql transaction and the same snapshot extraction SQL against the isolated target, producing a new private `restored-state.private.json`. Prepare verifier control with `expectedFile`, `manifestFile` pointing to the authenticated manifest, `stateFile` pointing to this **fresh target extraction**, and a nonexistent `outputDirectory`. Source-state reuse would only verify source inventory and is not restore evidence.

```powershell
node scripts/gradebook-backup-cli.mjs verify-restored 'C:\PrivateStaging\verify.control.json'
if ($LASTEXITCODE -ne 0) { throw 'STOP: restored data verification failed' }
```

Result is **RESTORED_DATA_CRYPTO_VERIFIED**, permissionVerification=NOT_RUN and managedRecoveryVerification=NOT_RUN. Separately run authorized deny/allow tests under actual anon/authenticated/service_role and compare roles/default grants/RLS/routine security. Auth/admin mapping, revoked sessions, Storage bytes/policies and Edge configuration must be reviewed separately; no new public endpoint/production activation follows from verifier success. Record measured loss/recovery duration and replay deletion/restriction ledger before any separately authorized cutover. Only the combined accepted evidence can promote a separate recovery record; the tool never sets ISOLATED_RECOVERY_VERIFIED or Operational PASS itself.

## G07-4 handoff — NOT STARTED / needs separate approval

**Proposed environment:** owner-controlled clean replacement device/profile, offline PostgreSQL17.11 bound only to127.0.0.1 on an explicitly approved unused port (example15432), native age1.3.2, original synthetic project/AAD, fresh DB `gb_owner_restore_review`, reviewed role/extension provisioning. Not a hosted Supabase project, persistent secondary DB, CI runner or deployment. Exact device/port/private staging path and responsible operator are **not yet named/approved**; no environment has been provisioned by this handoff.

**Prerequisites:** complete trusted synthetic `gb-recovery-v1` candidate plus independent receipt/expected mapping, original source capture evidence and independently recoverable synthetic identities; owner paper/replacement-device evidence; private staging/cleanup/media review; full-schema role/extension/AAD mapping and expected data/catalog/permission assertions; authorization to create a fresh isolated DB and provision test roles; enough local disk and verified free tooling. This task's minimal native source fixture is not the full application migration/Auth/RLS fixture. Do not use its matching source-state verifier result as G07-4 evidence.

**Proposed finite execution envelope to approve, not executed here:**

| Activity | Maximum / boundary |
| --- | --- |
| Ciphertext retrieval | Existing local synthetic pair only;0 Drive uploads/downloads,0 hosted requests/queries |
| Local authentication/open |1 `open`; at most2 age decryptions plus1 pg_restore version,1 TOC listing and1 full SQL decoding; no retry |
| Target creation/restore |1 `createdb`,1 transactional `pg_restore`; both to named new loopback target;0 overwrite/reset/clean |
| Target extraction |1 psql connection; BEGIN + four extractor SET statements + one JSON SELECT + COMMIT =7 top-level statements;15s/3s statement/lock bounds;4MiB/10,000-per-table state cap |
| Data verifier |1 offline `verify-restored`; at most10,000 existing envelopes, no HTTP or live capability replay |
| Effective roles |1 psql connection, at most12 explicitly pre-reviewed read/deny statements with transaction/savepoint wrappers listed before approval; no broad integration suite |
| Provisioning / pg_restore internals | Exact role DDL and archive TOC must be reviewed before approval. `pg_restore` executes archive-dependent SQL; its internal statement count is **not measured/budget-approved here**. Bound to one trusted archive ≤32MiB, one transaction and a separately enforced overall60s restore deadline; do not claim the12 verifier statements cover restore SQL |
| End/cleanup |1 reviewed cleanup sequence for exactly named synthetic target/staging; no deletion of CURRENT/PREVIOUS, paper originals or production resources |

There is no source export or key acquisition in this proposed G07-4 envelope: the trusted synthetic candidate is a prerequisite. If it does not exist, request a separate finite local synthetic source-capture scope first; do not use production as a fallback. If any hosted/real-data source is proposed instead, provide separate explicit target, total requests/queries including pg_dump internals, bytes/data, retry settings, risks/stop conditions and G08 evidence before proceeding. An unmeasured SQL/egress budget is BLOCKED, not implicit permission.

Stop at the first error/warning/timeout/permission mismatch. Do not retry to confirm. G07-4 may establish isolated synthetic recovery/custody evidence; G08, managed-platform recovery and real-data/release authorization remain distinct.

## Exact execution evidence and limits

Windows, Node25.2.1; pinned age1.3.2 Windows ZIP hash `f48d8f8f9ebe903ab5027ed067652f2cc1db94bc206976430133b905dcd8e8c7`. Portable PostgreSQL17.11 from the official PostgreSQL-linked EDB download, fileid1260616, downloaded ZIP SHA-256 `80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`. EDB archive digest was measured locally, not compared to an independent signed publisher digest; pg_restore.exe is unsigned. No system install or package/dependency change. Binaries stay under ignored `tests/local/g07-3/tools`.

Commands (paths in environment point only to those synthetic test tools):

```powershell
$env:GB_TEST_PG_BIN=(Resolve-Path tests/local/g07-3/tools/pg17/pgsql/bin).Path
$env:GB_AGE_BIN=(Resolve-Path tests/local/g07-3/tools/age/age/age.exe).Path
$env:GB_AGE_KEYGEN_BIN=(Resolve-Path tests/local/g07-3/tools/age/age/age-keygen.exe).Path
node tests/gradebook-backup-production.mjs
# Final focused verification after strict metadata/source-key checks; includes positive fixture prerequisite.
$env:GB_TEST_ONLY='cli_export_exclusive,cli_metadata_cannot_override_generated_fields,wrong_crypto_same_inventory'
node tests/gradebook-backup-production.mjs
Remove-Item Env:GB_TEST_ONLY
node --check scripts/gradebook-backup-production.mjs
node --check scripts/gradebook-backup-cli.mjs
node --check tests/gradebook-backup-production.mjs
node node_modules/prettier/bin/prettier.cjs --check scripts/gradebook-backup-production.mjs scripts/gradebook-backup-cli.mjs tests/gradebook-backup-production.mjs
npm run build
git diff --check
```

Execution history retained: (1) sandbox fixture setup failure before cases (old diagnostic did not distinguish initdb from startup); (2) elevated fixture pg_ctl startup timeout before cases, actual server log confirmed ready but Windows child pipe handles remained open; explicit stop and staging cleanup performed; no retry of an unknown server. Harness changed to ignore pg_ctl stdio and track attempted startup for cleanup. (3) first implemented source PASS34 finite cases and cleanup. Review then added complete archive SQL decoding/native-only identity checks and rehashed-data-truncation cases; (4) strengthened archive/core PASS36 finite cases and cleanup; (5) strict CLI metadata follow-up PASS3 focused cases, including its positive prerequisite; (6) final pre-export source-key consistency follow-up PASS4 focused cases (positive prerequisite, valid exclusive CLI export, unknown metadata rejection, wrong-key data verification), cleanup PASS. No accepted old recovery/Drive/UI suite was repeated. These are six new specialist invocations with actual failed attempts retained, not six successful runs or stress/load tests.

The36-case core run and final4-case focused follow-up use real native source fixture SQL, exported-snapshot pg_dump, actual age and actual pg_restore parse/decode, unchanged application crypto, CLI success/failure and negative inventory assertions. **No database restore occurred**. The test migration mapping is deliberately a synthetic one-entry source-file mapping, not a replay of the nine application migrations or hosted ledger evidence. Full application role/Auth/Storage restoration and Linux/macOS/Node24 execution are NOT RUN. Existing accepted native recovery evidence remains attached to its own SHA, not reassigned to this new format.

Production build/exclusion PASS once; existing chart bundle-size warning retained. Syntax and scoped formatting PASS; relative document links/fences and whitespace/scope PASS. Scoped new-source credential-literal scan and all20 production-output files PASS (no backup module/fixture markers or full credential patterns); committed artifacts contain no generated keys/dumps. Pattern scans do not prove absence of every possible encoding. No full unit/UI suite, browser, hosted probe, new specialist Actions run, real secret/PII, key rotation, Drive transfer, G07-4, G08, deployment or main merge. Hosted Supabase/Drive requests/queries **0**. GitHub source reads/push and public tool/doc downloads are separate from hosted-project testing. The requested develop push may start the existing light Offline CI; no specialist is added to it.

Official sources checked2026-10-28: [pg_dump17](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore17](https://www.postgresql.org/docs/17/app-pgrestore.html), [PostgreSQL Windows binaries](https://www.postgresql.org/download/windows/), [EDB archive source](https://www.enterprisedb.com/download-postgresql-binaries), [age1.3.2](https://github.com/FiloSottile/age/releases/tag/v1.3.2), [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Supabase managed/self-hosted restore limits](https://supabase.com/docs/guides/self-hosting/restore-from-platform), [changelog](https://supabase.com/changelog). No new SDK/schema/Auth feature was implemented; current TLS/managed-restore cautions do not authorize hosted testing or paid resources.
