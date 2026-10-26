# GB-B4-INT-001 — FIXED IN DRAFT / 2026-10-26

Correction baseline `76102e281ad1f0c0da86f52bfc3aa14baad93e4e`, branch `feature/personal-gradebook`. [Additive migration20261026060000](../../../supabase/migrations/20261026060000_gradebook_reveal_identity_context.sql) corrects only `public.gb_student_read(uuid,uuid,uuid,bigint,boolean)`. It retains every existing reveal field and adds `identityLookup=encode(s.identity_lookup,'hex')` and `lookupKeyVersion=s.lookup_key_version` from the selected student row. Ordinary/default reads and lists are unchanged; shared student_dto and all accepted migrations are untouched.

The original/corrected prosrc SHA256 hashes are respectively `91d74b47b239794722720ea8b6414a7cfeb126e8e08fcbbf8f3720ffa2517b9d` and `dc1f1791ac02db7ec9af9db81f5c35dd57be9648a2516267f7fa608b166adddc`. The migration fails on missing/body-drift targets, unexpected signature/default/language/return/configuration/security or browser EXECUTE. It compares the complete pg_proc metadata excluding prosrc before/after, preserving owner, raw ACL, volatility, security mode, defaults and return type. Exact corrected replay is accepted. One guarded CREATE OR REPLACE changes only this projection; no grants, table changes, new RPC, retry or custom transaction SQLSTATE.

**Audit meaning:** the existing class-scoped `gradebook:student_reveal:count=1` event means an authorized database reveal request. It does not independently establish successful Edge decryption, HMAC verification or browser display. No personal or crypto payload is added to audit.

## Focused correction evidence

One execution of `PGLITE_MODULE_PATH=/workspace/scratch/a61e5700450e/b2-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js node tests/gradebook-reveal-sql.mjs`: **7/7 groups PASS**, fresh disposable in-memory PGlite0.5.11 / PostgreSQL18.6, actual migration chain plus synthetic platform fixture. No database URL or hosted credentials accepted.

| Group | Evidence |
| --- | --- |
| A | Ordinary/default read and list are exactly equal to pre-correction DTOs, with all six protected context/envelope fields absent; no reveal audit |
| B | Reveal retains envelope fields and returns exact lowercase stored digest; owner-only synthetic row generation7 vs class generation1 proves row selection. No sixth caller crypto argument is accepted |
| C | Invalid actor/session/class, cross-class/missing student and actual anon/authenticated execution denied; service_role permitted |
| D | Exactly one authorized class/actor event; denied requests add none; no name/DOB/digest/ciphertext/nonce/key ID in audit |
| E | Exact intended body-only addition; complete target metadata and raw/effective ACL preserved; every other Board/Gradebook function unchanged |
| F | Reviewed original and corrected replay accepted; unexpected body and renamed/missing target reject with P0001 and no partial function changes |
| G | All eight Gradebook PT409 branches and Board definitions unchanged; no custom40001/serialization_failure/deadlock_detected in effective application function bodies |

Static `node --check tests/gradebook-reveal-sql.mjs`, source-hash/projection checks and `git diff --check` PASS. Supabase CLI was not installed/in PATH; the unique ordered migration filename follows the existing convention without installing a CLI or risking telemetry. Pinned Prettier offline invocation was **UNAVAILABLE (ENOTCACHED)**, not PASS; no cached package/bundled CLI was available and no registry request was sent. Formatting was reviewed manually. No dependency or lockfile change, full app/B2/B3 suite, build or browser test.

## Correction self-review and remaining gates

1. Both identityLookup and lookupKeyVersion come from the selected stored row: **YES**, including different generation fixture.
2. Ordinary/default read/list exposes either field: **NO**, exact DTO equality verified.
3. Browser roles can execute the RPC: **NO**, effective privileges and execution denial verified locally.
4. Forged actor/session or cross-class student bypasses checks: **NO in the synthetic local cases**; existing authorization/lock body unchanged.
5. Reveal retains audit: **YES**, class-scoped authorized-request event, no sensitive payload.
6. Metadata and other function behavior preserved: **YES** by full metadata/source snapshot comparisons.
7. Unexpected body drift is rejected: **YES**; missing target also rejected transactionally.
8. PT409 correction preserved and retryable business errors introduced: **preserved / NONE introduced**.
9. B4 has the stored inputs needed for the approved AAD and HMAC verification without an extra private lookup: **YES at the SQL contract boundary**; project/keyrings remain trusted Edge configuration.
10. Edge decryption/HMAC/browser DTO security proven: **NO / NOT RUN**; no B4 code exists in this task.

GB-B4-INT-001 is **FIXED IN DRAFT / READY FOR REVIEW / NOT APPLIED**. B4 implementation remains **NOT STARTED**, not completed or accepted. Its original SQL integration blocker is addressed in the forward draft chain; B4 must still verify JWT/session, crypto/tag/HMAC/keyrings/capabilities/preview tokens/limiter/DTO redaction offline under a separate task. The synthetic mismatched row/class key generations are an owner-only test distinction, not a production rotation procedure.

Future approved rollout is **B2 → B3 → PT409 correction → reveal correction**; reconcile pending versions separately and keep endpoints unavailable until the complete chain and security gates pass. Never replay the recorded applied Board hotfix. Hosted requests/Auth0; migrations applied0; Edge deployments0; secrets provisionedNO; real dataNONE; stress/load/soak/stretchNONE. Native PostgreSQL17, concurrency, hosted Auth/RLS/API, B4 Web Crypto, CP01-C and real-data gate remain NOT RUN. B5 NOT STARTED.

## CP01-B4 reviewer concerns — mandatory confirmation register (2026-10-26)

Source: independent review of `feb256ae3` after the 7/7 PGlite SQL correction. These are **explicit B4 handoff checks**, not a claim that native PostgreSQL, Edge crypto or CI has passed. Work must report each concern by ID as **PASS / FAIL / NOT RUN / BLOCKED**, with file/function, exact focused evidence and remaining owner. Never silently mark a future gate PASS.

| ID / severity | Risk and compulsory Work confirmation | Evidence required / handoff decision |
| --- | --- | --- |
| **GB-B4-CON-001 / P2 — PostgreSQL 17 migration compatibility** | B3 reveal correction's strict `pg_proc` body-hash / metadata guard was tested on PGlite/PostgreSQL **18.6**, whereas recorded hosted engine is **PostgreSQL 17.11**. Check SQL definitions, version-specific `pg_get_functiondef`/`pg_proc` assumptions, defaults and quoted `proconfig` without weakening guards. | **B4:** record a read-only static compatibility assessment, exact assumptions/risks; no hosted/native17 queries unless separately approved. **CP01-C:** real PG17 function/migration evidence remains NOT RUN and an explicit rollout gate; lack of PG17 access is not automatically B4 implementation FAIL. Unexpected drift on deploy must fail closed. |
| **GB-B4-CON-002 / P1 if violated — crypto context, reveal & browser DTO redaction** | Only privileged Edge server code may receive `gb_student_read(reveal=true)` envelope and stored `identityLookup`/row `lookupKeyVersion`. Reconstruct exact CP01-A AAD, verify AES-256-GCM tag, validate 9–12 ASCII digits, select generation-specific HMAC key and recompute/compare digest before displaying anything. Build an **explicit browser response allowlist**; never spread raw RPC JSON or return lookup/index, generation, ciphertext, nonce, encKid, algVersion, internal hashes, keys or backend diagnostics. Unknown key/tag/mismatch must fail closed. | **B4 mandatory offline gate:** synthetic success plus tampered AAD/tag, wrong class/digest/key generation, unknown kid, invalid decrypted value, server RPC response redaction and error/log non-disclosure. Verify ordinary/admin-list DTO unaffected. A SQL reveal audit logs *authorized DB request*, not success of Edge decrypt/display. Missing or failed checks: CHANGES REQUIRED; do not proceed B5. Hosted response still NOT RUN until CP01-C. |
| **GB-B4-CON-003 / P3 — Prettier / offline CI** | Earlier `prettier@3.6.2` command returned **ENOTCACHED**, not formatting PASS. Do not label formatter/CI as executed based on manual review, nor fetch dependencies solely to make a docs gate green. | **B4:** format new Edge/test JS using tools already available and run the smallest supported focused formatter/check once; report exact command/results or BLOCKED/NOT RUN. **B5:** confirm exact-HEAD format and new server test wiring into offline CI, with separately documented evidence; no re-running whole suites solely for optics. |
| **GB-B4-CON-004 / P1 if violated — PostgREST retry-storm recurrence** | Do not raise application `40001`/retryable class-40 business conflicts, re-map `PT409` to retryable errors, retry terminal 409/429/503/timeouts or automatically repeat writes at Edge/SDK/proxy. Historical 40001 in B3 is overridden by the versioned PT409 correction. | **B4 mandatory offline gate:** inspect effective migration chain and SDK/Edge error mapping; focused mock test proves one failed write remains one invocation; note that one HTTP POST can still cause server-side retries. Never use hosted load tests; STOP immediately on signs of retry storm. Reference [database incident](../../DATABASE.md#cảnh-báo-tái-diễn-gb-ops-001--sqlstate-retryable-cho-xung-đột-nghiệp-vụ). |
| **GB-B4-CON-005 / rollout and real-data gate** | B2, B3, PT409 correction and reveal correction are **draft only**, do not assume deployed Auth/RLS/HTTP behavior; secret provisioning, migration ledger, full security and real personal data have separate acceptance. | **B4:** 0 hosted SQL/Auth/API/Storage requests, 0 secret deployment, 0 live migrations, synthetic offline fixtures only. **CP01-C:** separate authorization for reconciled exact rollout and live JWT/RLS/API/native17 tests; real-data gate must pass before using student records. |

**B4 completion rule:** Work's final report must include a concise concern-by-concern table with state, source/test evidence, residual risk, and owning checkpoint. `GB-B4-CON-002` and the B4 part of `GB-B4-CON-004` are hard implementation gates. `GB-B4-CON-001` native17 and `GB-B4-CON-003` exact-HEAD CI cannot be mislabeled PASS or silently waived; carry forward to CP01-C and B5 respectively. This register does not authorize hosted testing or deployment.
---

# Historical B4 preflight — BLOCKED at baseline0bbd0c3

The original report below explains the finding before the separately authorized SQL correction above. Its OPEN/BLOCKED statuses and proposed future tests are historical; they do not override the current draft correction evidence. B4 cryptographic checks remain deferred.

Baseline `0bbd0c3b179c564a0705af97dbdac6a6b9c1a7f6`, branch `feature/personal-gradebook`. Local checkout advanced from `778600d` to the accepted descendant after reviewing its five documentation-only changes; no merge/rebase. B4 implementation has not been created. This report records a confirmed static integration defect, not an observed hosted failure.

## GB-B4-INT-001 / P1 — reveal RPC omits authenticated identity context

**OPEN — blocking B3 dependency.** CP01-A §6 requires document AES-256-GCM AAD exactly `gb:id:v1|<project_ref>|<lowercase class UUID>|<lowercase lookup hex>`. Authorized reveal must authenticate/decrypt, validate the digits and recompute the HMAC using the stored lookup-key generation before disclosure.

Evidence at this baseline:

- [B3 migration](../../../supabase/migrations/20261026030000_gradebook_transactions.sql), lines172–184: `public.gb_student_read(uuid,uuid,uuid,bigint,boolean)` checks admin/session/class, then `reveal=true` audits and returns the ordinary student DTO plus `ciphertext`, `nonce`, `encKid`, `algVersion`. It omits stored `identity_lookup` and `lookup_key_version`.
- The same migration, lines83–86: `gradebook.student_dto` contains only id/classId/fullName/birthDate/active/revision. The omitted identity context is not supplied by the base DTO.
- [B2 migration](../../../supabase/migrations/20261026014933_gradebook_foundation.sql), student constraints, and B3 `gradebook.identity` at lines139–147: ciphertext/tag is25–28 bytes, corresponding to9–12 document bytes plus16 tag bytes. There is no embedded lookup context in the approved envelope.
- B3 `gb_lookup_context` at lines456–461 supplies active class/key generation and catalogs, not the selected student's stored digest. Planner fingerprints stored crypto internally but returns only `internalStateHash` to Edge, not its transcript. These interfaces cannot reconstruct the missing AAD.
- [Non-retryable correction](../../../supabase/migrations/20261026050000_gradebook_nonretryable_conflicts.sql) targets eight other definitions; it does not change `gb_student_read`. The gap remains in the effective intended migration chain.

The class UUID and project ref alone are insufficient to construct the required AAD. Computing the document's HMAC first requires the plaintext that reveal is meant to decrypt. Caller-supplied lookup values are not trusted stored context. Changing AAD, skipping tag/HMAC verification, returning raw ciphertext to the browser or adding direct private-table access would violate the approved boundary.

Impact: the required `student.reveal` operation cannot be safely completed through the accepted B3 interface. This does not establish a production disclosure, retry storm or hosted malfunction: Gradebook is unapplied, B4 absent, and no hosted request was sent. Other B4 operations are not declared defective; B4 as a complete checkpoint is blocked by this dependency.

## Smallest proposed upstream correction — not implemented

Use a separately authorized additive migration after `20261026050000`, replacing only the exact `gb_student_read(uuid,uuid,uuid,bigint,boolean)` definition. Add stored lowercase lookup hex and stored lookup-key version to the **server-only reveal=true projection**. Preserve the ordinary projection, authorization, class lock, audit, signature, owner, ACL, SECURITY INVOKER and fixed search_path. Do not edit accepted migrations, add a table or expose a new browser RPC.

B4 can then construct AAD using that stored context, select the retained lookup-generation key, authenticate/decrypt, validate the document syntax and recompute/compare its HMAC. Its browser response must explicitly omit the lookup, key-generation context and entire encrypted envelope. Retained keyring entries support old encryption kids; an unknown generation/kid or mismatched digest must fail closed. No real rotation is part of the correction.

Focused offline acceptance for that future correction:

1. Apply the intended chain in an existing disposable runtime; capture the exact function owner/ACL/config before and after. Ordinary read/list responses still contain no crypto/index fields; browser-role EXECUTE remains denied.
2. With one synthetic encrypted identity, authorized reveal returns the exact stored context only to the server role. Use Web Crypto to authenticate/decrypt with the approved AAD and recompute HMAC; verify the browser DTO contains only approved reveal fields.
3. Wrong class/digest, altered ciphertext/tag, missing/unknown key version or encryption kid fails without returning plaintext. Wrong actor/session/class is denied by the RPC, and authorized reveal retains its class-scoped audit behavior.
4. Retain the effective-definition non-retryable guard; introduce no custom class40 business errors or automatic retry. No hosted call, large batch or concurrency/load test is needed to verify this projection change offline.

The SQL/RPC correction is outside this B4-only authorization. Do not silently implement it or resume B4 as ready before the dependency is reviewed and corrected. This is not a request to deploy the correction.

## Verification and scope

Repository/source/doc reads and static inspection only. Tests executed **NONE**: the missing return fields are directly visible in SQL, and no executable code changed. Existing B3 conflict results are historical evidence, not rerun or evidence for reveal cryptography. No new dependency/runtime/secret was installed or provisioned.

Hosted Supabase requests **0**; Auth attempts **0**; SQL/migrations/deployments **0**; stress/load/soak/stretch **NONE**. No Edge entrypoints, frontend, SQL, B1 utility or test source changed. Native PostgreSQL17, hosted Auth/API/RLS/concurrency, B4 crypto execution and CP01-C remain **NOT RUN**; B5 **NOT STARTED**; real-personal-data gate **NOT RUN**.
