# CP01-C G07 — Backup recovery preparation

Date: 2026-10-28 (Asia/Bangkok). **G07 PARTIAL; production custody BLOCKED. G08 BLOCKED.**

Read-only assessment baseline: `feature/personal-gradebook` at
`beede03884c0e44995d25746bf5390e7bb4a6952`, verified with GitHub and `git ls-remote`.
Working branch: `feature/cp01-c-g07-g08-recovery`, created in the Work cloud checkout only.
No GitHub branch/push/workflow mutation has been performed in this preparation phase.
The task explicitly requires confirmation before hosted mutations; publication and the new Actions run await that confirmation.

## 1. Technical assessment and policy differences

Sources: [technical design §6](CP01_TECHNICAL_DESIGN.md#6-identity-encryption-and-key-management),
[DATA §H](DATA_AND_SECURITY.md#h-real-personal-data-gate), [checkpoint contracts](CHECKPOINTS.md),
[current G01–G08 dispositions](CP06_OFFLINE_READINESS.md#cp01-c--cloud-only-security-verification--2026-10-28),
[existing Board backup](../../BACKUP.md), actual runtime `crypto.js`/`runtime.js`, nine applied-mapping migration files,
and `tests/cloud/{connections,recover,native-adapter}.mjs` at the baseline.
Google Drive searches for Gradebook and CP01 returned no matching documents; repository documents are the assessment source.
No deployed environment, production keyring or owner computer was accessed.

| Keyring / runtime purpose | Existing contract | Recovery requirement |
| --- | --- | --- |
| `GB_ID_ENC_KEYS` / `identity` | AES-256-GCM reversible document number; row `identity_enc_kid` selects key; AAD binds project/class/blind index | Keep every kid referenced by retained rows/snapshots; wrong key/AAD fails closed |
| `GB_LOOKUP_KEYS` / `lookup` | HMAC-SHA256 blind index; numeric generation from class/student, independent from active kid | Keep required class/student generations; losing it breaks lookup, uniqueness and identity verification |
| `GB_CAP_KEYS` / `capability` | AES-GCM opaque capability; default lifetime 600 seconds; class/student epochs checked by normal read path | Record active/retained kids; restore does not extend expiry or revive revoked sessions/epochs |
| `GB_PREVIEW_KEYS` / `preview` | HMAC-SHA256 preview + commitments; default lifetime 300 seconds, actor/session/scope binding | Record active/retained kids; old previews remain subject to expiry/state/session validation |

All rings use distinct CSPRNG 32-byte keys; active and up to 16 retained keys are validated by unchanged runtime code.
`GB_ALLOWED_ORIGINS` is separate environment configuration, not a fifth keyring or decryption credential.
Scores, DOB and optional names are not all protected by identity-field AES; the complete backup therefore needs file encryption too.

DPAPI: the earlier ignored export is tied to the original Windows account/machine. Same-account decrypt is useful evidence but cannot provide disaster recovery after loss of that account/device. No DPAPI export was read in this task.

Prior cloud recovery uses `pg_dump --no-owner --no-privileges`, restores into another database in the same disposable cluster and runs a fresh Linux child. It AES-GCM-wraps the four generated rings; its wrapping credential is passed in memory with the wrapped payload. This is a valid synthetic compatibility proof, not independently held operational custody or a full permission restore.
No existing age-based backup or Drive uploader was found in the relevant source inventory. Existing migration guards, recovery/replay specialists and application crypto remain unchanged.

| Proposed policy | Difference from approved design | Disposition |
| --- | --- | --- |
| Google Drive Free as primary | Design leaves encrypted destination and authorized provider undecided | PROPOSED; account/folder, institution permission, capacity and transfer assessment pending |
| Encrypted offline secondary | Consistent with independent recovery, but media/location/access/retention not previously selected | PROPOSED; existing approved media only, no purchase |
| age with separately held identity credentials | New concrete outer encryption tool; does not replace application AES/HMAC/envelopes | Synthetic implementation authorized; operational tool/custody approval pending |
| Owner as primary custodian | Task establishes intended role; named authorized person/account and handover evidence still absent | Owner role recorded; no key material generated for owner or provisioned |
| Emergency custodian | No approved person or mechanism exists | PENDING; no emergency recipient is silently added |
| PG17 restore retaining owner/ACL/RLS | Extends prior test, which deliberately omitted owner/ACL | New bounded test prepared; NOT RUN on Actions yet |

No backup destination, retention duration, legal basis, RPO/RTO, emergency custody, production encryption contract or business behavior is approved by this document.

## 2. Architecture and custody plan

The operational design is a proposal for owner review. The implemented helper deliberately accepts only the fixed synthetic project/format; it is **not a production export/restore CLI**.

1. An authorized future operator establishes a consistent DB/key-version snapshot and reviewed source/migration mapping. Do not rotate/drop keys while pairing a dump and its inventory. A later production export requires its own explicit scope/egress budget.
2. Produce `database.dump.age` and `keyrings.json.age`, using two distinct age native X25519 recipients. Keep the DB dump and keyring export separate. The encrypted key export binds project, backup ID, source SHA, PG major, migration hashes, required/active/retained key IDs and the dump SHA-256. No secrets belong in the outer receipt.
3. Keep ciphertext copies in the owner-approved primary folder and on approved offline media. Keep the keyring ciphertext in separately restricted custody from the DB ciphertext where practicable. The rehearsal uses separate files/directories; it does not prove Drive folder isolation.
4. The owner holds both age private identity credentials separately from those ciphertext copies and from the original Windows/Google account dependency. A public recipient can encrypt but cannot recover data. Exact credential location/access and recovery of the Google account must be recorded privately and tested. Never put private identities in Drive beside backups, in Git, CI secrets, chat, browser storage or a public decision record.
5. Owner decides whether emergency recovery is required and names an authorized custodian, conditions, scope and revocation/handover controls. Any extra age recipient can decrypt; do not add one until explicitly approved. No shared-password or secret-sharing system is introduced.

| Custody item | Responsible role | Required private evidence | Current state |
| --- | --- | --- | --- |
| Primary storage account/folder | Owner + institution authorizer | Account ownership, restricted sharing, MFA/account recovery, free quota reserve, transfer review | PENDING |
| Offline encrypted copy | Owner | Existing media, separate location, physical access, receipt/checksum and last restore date | PENDING |
| DB age identity | Owner, primary recovery custodian | Separate credential location and independent access rehearsal | PENDING |
| Key-export age identity | Owner, primary recovery custodian | Separate from ciphertext and original device/account; no material in evidence | PENDING |
| Required key/version inventory | Authorized technical operator | Project/class/row generation mapping paired to every retained snapshot | Synthetic only |
| Emergency access | Owner/institution to decide | Custodian/absence decision, activation/revocation and handover rules | PENDING |
| Restore authorization/cutover | Owner + applicable institution | Destination, data scope, permission tests and signed release | BLOCKED |

Node buffers are bounded to 32 MiB per input; credentials use private temporary files (directory0700/file0600) in synthetic rehearsal only. Subprocess stdout/stderr are captured and failures expose a fixed category. Selected buffers are cleared, but JavaScript/OS memory cannot promise complete secret erasure. For production, review staging, paging, crash dumps and encrypted media separately. No production capacity has been measured.

## 3. Concern/test matrix and change inventory

This matrix was established before implementation. The existing curated `test:ci`, application source, schema/migration files, package manifest/lock and older cloud specialists remain unchanged.

| Concern | New bounded verification | Evidence boundary |
| --- | --- | --- |
| age creation and complete authentication | Actual pinned age encrypt/decrypt; wrong/missing identity; altered/truncated files including recomputed outer hashes | Offline actual crypto |
| Snapshot integrity/binding | Trusted ciphertext checksums + authenticated inner dump checksum; reject mixed DB/key snapshots | Outer SHA alone is not proof of provenance; trusted receipt stays independently controlled |
| Required versions | Four rings with retained1/active2; missing required versions rejected; restored old/new identities and old tokens read by unchanged crypto | No real key read/export/rotation; no HMAC maintenance cutover claimed |
| Native data recovery | Fresh custom dump preserving owners/ACL; source DB deleted; new Linux child decrypts complete files before creating a fixed fresh target; exact score8.12345, identities and8/7 catalogs | PG17 cloud candidate, not yet executed |
| Permission restoration | Compare schema/object owners/ACLs, default privileges, routine security, RLS flags/policies; explicit anon/authenticated read/write/RPC denial and service-role read/RPC success | Same synthetic cluster roles; not production Auth/gateway or cross-cluster role provisioning |
| Restore failure | Corrupt archive refused in separate empty DB; no Gradebook/Auth/Storage schemas; `--exit-on-error --single-transaction`; fixed target must not preexist | Native test NOT RUN; cannot infer every disk/crash recovery scenario |
| Upload safety/free quota | Local dry-run accepts exactly two age files, checksums and owner-reserved byte budget; rejects extra/plaintext files and insufficient quota | No connector upload, account quota read or download round-trip |
| Secret containment | Runtime-generated synthetic keys only; captured diagnostics; encrypted payload and child-output checks; no artifacts/caches | Source/static and actual offline evidence; new Actions log/artifact readback pending |

Executable inventory: `scripts/gradebook-backup.mjs`, `tests/gradebook-backup.mjs`, `tests/cloud/backup.mjs`, `.github/workflows/gradebook-backup-recovery.yml`.
Documents: this file, G08 owner package, plus short links/status in BACKUP, STATUS, ARCHITECTURE, TESTING, DATA_AND_SECURITY, CHECKPOINTS and feature README.
No production tool provisioning, frontend changes, new runtime dependency, merge or deployment.

## 4. Disaster recovery runbook

The steps below are an owner-review procedure, not authorization to handle real data.

### Before a production backup

1. Complete G08 and custody approvals. Record scope/operator/date, project identity, source SHA, exact applied ledger-to-file mapping, free quota reserve, retention, RPO/RTO, offline copy location and authorized export budget privately. Use an approved clean recovery environment, never a CI runner for real backups.
2. Review current supported PG17 dump/restore tooling and trusted binary provenance. Record versions; inspect help. Securely supply credentials without argv, logs or chat. Stop if the selected tools/resources cannot be verified as safe and free.
3. Establish a consistent snapshot across DB and key inventory; coordinate writes/rotation. Preserve required generations from DB and every retained snapshot. Reject missing keys; never substitute the active key for an old kid.
4. Preserve schema/data/owners/ACL/RLS/functions and required role mapping; roles are cluster-global and are not provided by a single `pg_dump`. Auth identities/configuration, Edge configuration/secrets, source migrations and Storage object bytes need separate authorized recovery plans. Do not export role passwords as a shortcut.
5. Outer-encrypt the entire DB and separate key export to approved recipients. Record trusted SHA-256/size receipts privately. Authenticate a test decrypt before treating either copy as recoverable. Do not persist plaintext intermediate output on unapproved storage.

### Drive procedure: dry-run validated, upload disabled

1. Verify the approved folder/account, private sharing, institutional permission, account recovery, provider terms and potential cross-border obligations. No public/anyone-link sharing. Do not assume personal Drive is institution-approved.
2. Check current free storage available across Gmail/Drive/Photos, reserve room for retained generations and safe replacement; do not buy Google One. If quota/ownership cannot be verified, stop.
3. Run the local candidate validator (`planTransfer` in the synthetic rehearsal): exactly `database.dump.age` and `keyrings.json.age`, binary age header, complete hashes and total bytes within the reserved budget. The actual offline test runs this on newly encrypted synthetic files; no service call occurs.
4. A future separately authorized upload may transfer ciphertext only into the approved private locations. Never upload raw dumps, plaintext keyrings, age private identities, passwords or raw import files. Use opaque snapshot identifiers, not student names/classes in filenames.
5. After any later authorized transfer, record provider file IDs/version/size, download ciphertext once within an explicit request/egress budget, compare the trusted receipt and perform isolated full decryption/recovery. Upload success alone is not recoverability. The real Drive API/upload/download and private-sharing checks are **NOT RUN** in this task, including for synthetic files.
6. Do not delete the previous verified copy until both copies and recovery evidence are accepted. Apply approved expiry to originals, versions, trash and offline copies. No automatic purge or scheduled upload is created here.

### During recovery

1. Owner declares incident, closes affected access through a separately authorized plan, preserves safe evidence and authorizes the isolated destination. Do not overwrite the active project or run reset/clean/replay there.
2. Retrieve an approved ciphertext pair and independent credential custody. Verify trusted receipt/provenance and snapshot/project/version correspondence. Stop for wrong/missing keys, hashes, source mapping or quota. A malicious dump executes code: trust/review the source before restoring.
3. Fully decrypt/authenticate both files in restricted staging **before** executing SQL. Do not pipe unauthenticated partial plaintext directly into a restore tool. Check the inner dump hash and required kids/generations; no fallback to empty keyrings or fresh random production keys.
4. Prepare reviewed least-privilege role/owner mapping on a fresh authorized target. The synthetic harness retains same-cluster role definitions; cross-cluster managed-platform roles remain a separate operational gate. Restore atomically and stop on first error. Keep the failed target isolated for review; do not blindly retry or cut over.
5. Compare table/catalog counts, raw decimal/date semantics, old/new identity decrypt, blind-index matching, keys/epochs and snapshot metadata. Verify owners/ACL/defaults/RLS/routine security and deny paths under actual roles, not only as superuser.
6. Restore Auth/admin mapping and environment/Storage separately. The AAD binds the original project; a different project ID requires an explicit supported migration/re-encryption design, not renaming configuration. Do not replay expired previews or capabilities, or restore old active sessions as a shortcut.
7. Apply approved deletions/restrictions that occurred after the snapshot before reopening access. If compromise is suspected, authorize token invalidation/rotation and a safe re-key plan; do not delete shared historical keys needed by retained encrypted data.
8. Record restoration start/end, selected backup time, measured loss interval and recovery duration, permissions/deny results, reviewer and remaining risks without PII/secrets. Owner/institution approve cutover separately; verify both backup copies, then clear restricted staging according to policy. This task performs no cutover.

## 5. Evidence and acceptance status

| Acceptance requirement | Status | Evidence / remaining work |
| --- | --- | --- |
| Current branch/HEAD, design and policy assessment | PASS | Baseline above, actual source review, no Phase1 writes |
| age encrypted creation | PASS — synthetic offline | Pinned age1.3.2 release SHA-256 `cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10`; actual binary executed |
| Integrity, wrong credential, corruption, snapshot mismatch and quota refusal | PASS — synthetic offline | `node tests/gradebook-backup.mjs`:19 finite cases, one execution after initial implementation; fixed archive-boundary fixture, not native DB evidence |
| Independent decryption | PARTIAL | Fresh age CLI processes + separate credentials PASS offline; new full native child workflow NOT RUN; older Linux proof retained below |
| Native DB + keyring recovery | PARTIAL | Prior synthetic G07 PASS retained; age/native17 candidate prepared, awaiting approved GitHub publication/run |
| Required keyring versions and restored data readability | PARTIAL | Offline completeness/missing-version cases PASS; prior native retained1/active2 crypto PASS; new two-row/precision/catalog test NOT RUN |
| Owner/ACL/RLS/default privileges restored | BLOCKED — execution pending | New explicit native comparison/role tests prepared; cannot claim permission PASS from prior `--no-privileges` proof |
| Recovery failure handling | PARTIAL | Actual age failures safely refused; native malformed-archive case prepared, NOT RUN |
| No plaintext secrets in new Actions logs/commits/artifacts | PARTIAL | No production secret used; offline output fixed summaries; source checks required before commit; new run/log/artifact readback pending |
| Drive upload procedure | PARTIAL | Local actual-ciphertext dry-run PASS; no uploads or remote validation; operational provider approval pending |
| Primary/offline destinations and independent owner custody | BLOCKED | Owner records/approvals and operational rehearsal absent |
| G08 real-data authorization | BLOCKED | [Owner package](G08_OWNER_AUTHORIZATION.md); no sign-off inferred |

**Prior evidence, not a new age run:** [Actions40571286995](https://github.com/khoabm/dashboard/actions/runs/40571286995),
SHA `eb02ccc7b717f24cede95940dae2adc7c66d7038`, independently re-read through GitHub in this task:
completed/success; independent-connection/recovery step success, native/Auth/Edge steps skipped; artifacts list empty.
The [source-baseline Offline CI40571960457](https://github.com/khoabm/dashboard/actions/runs/40571960457) also reports success at baseline `beede038...`.
Neither run validates the new code. New G07 Actions URL: **NOT RUN — approval pending**, no URL invented.

Workflow boundaries: one public standard `ubuntu-24.04` job,15-minute timeout, serial concurrency,
loopback-only PostgreSQL17.11 container (2CPU/2GiB), pg8.16.3 installed into runner temp,
checksum-pinned age1.3.2, no repository secrets, artifacts or cache upload. Only one new synthetic concern is run;
no prior Auth/concurrency suite is repeated. No workflow_dispatch dependency on the default branch:
an explicitly approved push to the dedicated branch/path starts it. No PR creation, base-branch update, merge or deploy is needed.
If private visibility, runner/tool/image availability, unexpected errors or a cost/safety boundary fails, stop; do not switch to paid resources or blindly rerun.

This task's hosted Supabase SQL/Auth/API/Storage/metadata requests: **0**. Real data/production credentials/keyring operations: **0**.
Owner-computer operations: **0**. Drive writes/uploads: **0**. GitHub writes/new workflow executions: **0** at preparation.
Public source/tool/document downloads are distinct from hosted project access.

Preparation source checks actually executed: Node syntax checks for all three new MJS files;
Prettier3.6.2 check for those files and workflow YAML; parsed workflow assertions for the dedicated branch,
public/standard runner, read-only permissions, no secrets/artifact/cache references and loopback PG17;
`bash -n` on all six run steps; relative links in both new documents; scoped credential-literal scan;
and `git diff --check` all PASS. Diff inspection confirms `src/`, `supabase/`, package/lock,
curated CI and existing cloud specialists unchanged. No frontend build/browser/full regression suite was repeated
for this isolated tooling/docs change; prior baseline CI is separate evidence. Native PG17/Docker are not
installed in the Work container, so the new native candidate cannot run here; do not spoof Actions guards.

Changed files (13):

- `.github/workflows/gradebook-backup-recovery.yml`
- `scripts/gradebook-backup.mjs`
- `tests/gradebook-backup.mjs`
- `tests/cloud/backup.mjs`
- `docs/features/personal-gradebook/G07_BACKUP_RECOVERY.md`
- `docs/features/personal-gradebook/G08_OWNER_AUTHORIZATION.md`
- `docs/features/personal-gradebook/DATA_AND_SECURITY.md`
- `docs/features/personal-gradebook/CHECKPOINTS.md`
- `docs/features/personal-gradebook/README.md`
- `docs/BACKUP.md`
- `docs/STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`

## 6. Official references checked 2026-10-28

- [GitHub billing](https://docs.github.com/en/actions/concepts/billing-and-usage) and [standard public runners](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job): standard public-repository hosted runners are free; no larger runner/storage fallback is authorized. Public visibility was freshly verified through GitHub.
- [age official project](https://github.com/FiloSottile/age) and [pinned release](https://github.com/FiloSottile/age/releases/tag/v1.3.2): native recipients/identities and authenticated file encryption; release API digest was compared before local execution.
- [PostgreSQL17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html): custom archives, separate global roles, trusted dump execution and atomic restore.
- [Google account storage](https://support.google.com/drive/answer/9312312?hl=en): up to15GB shared across Gmail/Drive/Photos; actual free space/account eligibility was not checked. No paid storage is assumed.
- [Supabase changelog](https://supabase.com/changelog): checked relevant current breaking-change notices; no Supabase API/schema/client implementation change is made. No project endpoint was called.

Remaining risks: unexecuted new native test; unknown actual free Drive quota and sharing/cross-border suitability; owner/emergency custody and credential loss; cross-cluster role/Auth/Storage restoration; production snapshot/rotation coordination; production backup volume/egress and retention; same-runner simulation does not establish owner disaster recovery. Synthetic recovery never grants production G07 or G08 approval.
