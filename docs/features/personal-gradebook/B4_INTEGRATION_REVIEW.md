# GB-B4-INT-001 — FIXED IN DRAFT / 2026-10-26

**Latest:** [CP01-B4 implementation and five mandatory confirmations](#cp01-b4-implementation--mandatory-concern-confirmations-2026-10-26) supersede earlier B4 NOT STARTED/crypto NOT RUN statements only for the executed offline checks. SQL/history/hosted limitations below remain recorded evidence.

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

---

# CP01-B4 implementation — mandatory concern confirmations (2026-10-26)

Baseline `29a7f2af889c31aee1a70792275f9ac5b1819ef4`, same feature branch. **B4 READY FOR REVIEW, offline evidence only.** No migration, B1, Board, frontend or dependency/lockfile change. New code: `supabase/functions/{grades-admin,student-lookup}/index.js`, eleven modules in `_shared`, draft function gateway/entrypoint configuration in `supabase/config.toml`, and `tests/gradebook-edge.test.js`. Exact SDK import pin2.118.0, existing Node24.22.1 runtime and Web Crypto; no framework/new service. No deploy or secret inspection/provisioning.

### Actual HTTP/RPC boundary

- `grades-admin`:20 explicit teacher operation names from §5.3. `auth.js` constrains JWT issuer/audience/exp/iat/nbf/role/sub/session_id, calls supported Auth getUser(jwt), binds its user to sub and checks active admin_profiles with a separate privileged SDK client. Every admin B3 RPC independently rechecks that actor/session with admin_session_ok. Browser actor/session/encrypted fields are rejected. Client user_metadata is unused. Auth/profile errors fail closed; session revocation at the mutation/read transaction is a DB dependency, not proved by the JWT mock.
- `backend.js`: per-request public Auth and service-role clients; no incoming default headers; persistence/refresh/URL-session detection disabled. Every PostgREST call uses retry(false), request AbortSignal and redirect:error. No Edge retry or background request loop. Global15-second request deadline, B3's3-second class lock timeout retained. A client abort does not prove a running DB transaction stopped or a lost-response write rolled back: re-preview after a lost response, never auto-resubmit.
- `admin.js`: class/read/patch/create, student list/read/create/patch/status/delete/reveal, score CRUD/read, publication and both imports map to actual B3 names/arguments. class.read can use active non-sensitive lookup context when no classId is supplied. class.patch reads preserved metadata then submits the caller's expectedRevision, so a later edit still conflicts. Single-student scores.read adapts the existing keyset RPC with after_id=studentId−1/page_size1 and rejects a nonmatching result. IDs/revisions/raw scores remain strings. Clearing a manual name needs fullName:null/blank plus confirmed:true; published manual scores need acknowledged:true. No per-row RPC writes.
- `student-lookup`: verify, grades, histogram only. Invalid bounded pair syntax charges only global gb_limit before400. Valid syntax obtains class/key context, computes class-scoped HMAC, awaits committed gb_limit, then pair_check. Unknown/mismatch/inactive results are neutral401. Success returns capability/expiry, public class presentation and ordered catalogs, no grades/internal student ID. Grades/histogram use only decrypted capability identity/epochs, commit a separate read limiter, then rely on B3 for active/publication checks. No IP key or application limiter. An unpublished semester never changes the capability; another published semester or republish can still work if epochs/expiry permit.
- DTO integration detail: verification supplies class/catalog metadata for the memory-only view context. Current B3 student grade/histogram RPCs return score/aggregate arrays; follow-on HTTP responses return only selection plus own scores/aggregate buckets, rather than fabricating or fetching unavailable class metadata. Histogram explicitly labels display-tenth half-up grouping. This refines the earlier proposed repeated-metadata response, not grade/publication semantics.
- Safe HTTP: POST JSON, no query parameters,4MiB streamed byte cap,2,000 import rows, exact field allowlists, bounded CORS origin list (only Retry-After exposed for cross-origin backoff), no cookies, no-store/nosniff, safe400/401/403/409/413/415/422/429/503 categories. Unknown SQL diagnostics are never returned or logged; sanitized SQLSTATE classification stays internal in Failure. No diagnostic logger receives request bodies/tokens/PII.

### Cryptographic and import contracts

`crypto.js` imports independent32-byte Web Crypto keys for identity AES-GCM, lookup HMAC-SHA256, capability AES-GCM and preview HMAC-SHA256. Each keyring is a JSON object with exactly active:string and keys:{kid:canonical-unpadded-base64url-32-byte-key},1–16 entries, kid alphabet `[A-Za-z0-9_-]{1,32}`. Lookup kids are canonical positive integer generations≤2147483647. Unknown active/retained keys, malformed lengths or reused key material across purposes fail closed. Old kids/generations can be retained; no real rotation or maintenance workflow is implemented.

Server-only environment names: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GB_ALLOWED_ORIGINS (JSON exact-origin array), GB_ID_ENC_KEYS, GB_LOOKUP_KEYS, GB_CAP_KEYS, GB_PREVIEW_KEYS. No key values/examples are provisioned or included in source. Project/issuer derive from the canonical trusted https://project.supabase.co URL. CORS accepts configured HTTPS origins, with explicit loopback HTTP permitted for controlled local use; no wildcard. Draft config keeps grades-admin verify_jwt=true and student-lookup=false; both handlers still enforce their own authentication. Gateway/asymmetric-JWT behavior remains CP01-C.

Identity lookup/AAD exactly follow §6. Fresh96-bit random nonce and128-bit GCM tag on writes. Reveal uses selected stored identityLookup/lookupKeyVersion and retained encryption kid, validates algVersion1, authenticates/decrypts, checks9–12 ASCII digits and native HMAC verify before returning **only documentNumber and requestId**. Never spread the SQL envelope. Temporary binary plaintext is cleared; JS strings remain transient bounded memory, not a claim of guaranteed physical zeroization. The SQL audit means authorized DB reveal request, not successful crypto/display.

Capability format v1.kid.base64url(nonce||ciphertext||tag), AES-GCM AAD `gb:cap:v1|project|student-lookup|v1|kid`. Exact payload: project, audience=student-lookup, classId, studentId/classEpoch/studentEpoch strings, iat/exp integer seconds,600-second lifetime. No document/DOB/name/scores. Claims/tag/kid/project/audience/expiry are checked before limiter/read. No persistent storage or token table.

Preview format v1.kid.base64url(payload).base64url(HMAC). Exact payload: project/purpose=import, actor/session/classId/kind/semester/exp/inputDigest/stateDigest. Five-minute expiry. Scope is frameTuple('scope',[classId,kind,semester-text-or-null]); commitments use the approved distinct gb:preview-input:v1 and gb:preview-state:v1 domains framing project/scope/full normalized input or internal state hash. Signature frames version/kid plus every payload field under gb:preview-token:v1. Native HMAC verification checks signatures/input/state commitments. B1 canonicalRosterInput and canonicalScoreCells are reused unchanged; imports.js frames full score headers/source rows/identity/date/subject plus seven ordered cells. Physical position, not header text, determines meaning. Proposed fresh encryption bytes are excluded from input commitment.

Apply verifies actor/session/scope/token/input, performs one read-only preview preflight, compares keyed state commitment, then sends its trusted internal hash to exactly one B3 apply transaction. DB-dependent preflight invalidation becomes terminal409; B3 rechecks under its class write lock. PT409 remains409, genuine40001/unknown infrastructure errors become503, never success or auto-retry. Invalid preview errors receive422 with safe counts/coordinates and no token; complete server-only hashes/writes never cross HTTP. A valid preview is not authority by itself.

### Mandatory confirmation matrix

| Concern | Status and evidence | Residual risk / owner |
| --- | --- | --- |
| GB-B4-CON-001 | **PASS static assessment; native PostgreSQL17 NOT RUN.** Existing B2/B3/PT409/reveal SQL untouched. PG17 documents every explicit pg_proc field used by guards, pg_get_functiondef/pg_get_expr, sha256 and trim_scale. Metadata comparison uses the current engine's row before/after, not an18.6 serialized row constant. | Native17 binaries absent. pg_get_functiondef is reconstructed SQL; exact prosrc LF hashes, false default deparsing and quoted proconfig must actually match on17.11. Preserve fail-closed guards; CP01-C must execute the authorized chain/ACL/default/replay cases before rollout. |
| GB-B4-CON-002 | **PASS offline hard gate.** crypto.reveal + admin explicit DTO, real Web Crypto with independent Node AES/HMAC reference fixtures. Tests cover success/old encryption kid/row generation2 vs active1, altered ciphertext/tag/AAD/class/digest/generation/unknown kid/algorithm, valid-tag wrong HMAC and invalid plaintext; HTTP contains no envelope/index/context/diagnostics. Ordinary DTO test also passes. | Auth/RLS/gateway/platform logging and live HTTP redaction NOT RUN; SQL audit is request-only. CP01-C/real-data gate; B5 verifies consuming UI memory behavior. |
| GB-B4-CON-003 | **NOT RUN — formatter unavailable.** One focused pinned offline Prettier check returned ENOTCACHED; no formatter PASS/CI result claimed. Node syntax checks PASS. No formatter/dependency installation. | B5 owns exact-HEAD format/Deno dependency graph/lock/runtime checks and formal server-check CI scope. New test matches the existing Node unit glob; CI config unchanged/not run. |
| GB-B4-CON-004 | **PASS static/offline hard gate.** Static hash guard derives all eight final PT409 bodies from accepted chain; reveal correction contains no retryable business error. Actual SDK/fetch mock demonstrates one failed score POST remains one POST, isolated server headers, safe409; profile GET503 is not retried. Fault cases503/429/genuine40001, denied limiter, stale apply and timeout have no automatic resubmission/sensitive follow-up. | Mock invocation counts do not prove server-internal PostgREST retry behavior. Board hosted smoke remains previously BLOCKED; real hosted integration NOT RUN / CP01-C. Client timeout may leave backend work running. |
| GB-B4-CON-005 | **PASS scope compliance.** Hosted project SQL/Auth/API/Storage/log requests0; migrations0, deployments0, production secretsNO, real student dataNONE, stress/load/soak/stretchNONE. Only public documentation references were fetched, not project endpoints. | B5 NOT STARTED; separate authorized rollout reconciliation, CP01-C and real-data gate remain required. No evidence of legal/data-processing authorization or key recovery is inferred. |

### Exact focused evidence and remaining gates

- `node --test tests/gradebook-edge.test.js`: first execution **29/29 PASS**, Node24.22.1, no network. Then static self-review fixed GB-B4-001/P2 non-string op coercion; `node --test --test-name-pattern='client actor|non-string student operation' tests/gradebook-edge.test.js`: **2/2 PASS**, only affected tests.
- Added three focused retained-key/authenticated-capability-claims/SDK-GET503 cases, executed once with `node --test --test-name-pattern='retained capability|authenticated capability plaintext|real SDK profile GET503' tests/gradebook-edge.test.js`: **3/3 PASS**. Current source has34 distinct tests; no claim of a new full34/34 run. Earlier cases are not rerun for extra PASS counts.
- Static self-review also fixed GB-B4-002/P2: DB publication validation22023 at final apply, after a valid preview, now maps to terminal409 just as preflight invalidation does. `node --test --test-name-pattern='DB-dependent publication|stale preflight' tests/gradebook-edge.test.js`: **2/2 PASS**, one actual apply attempt at most. Authorization42501 and infrastructure40001 mapping remain distinct; SQL unchanged.
- Added safe Retry-After CORS exposure; `node --test --test-name-pattern='limiter denial/failure' tests/gradebook-edge.test.js`: **1/1 PASS**, denied/failed limiter still prevents all sensitive follow-ups.
- `rg --files supabase/functions -g '*.js' | xargs -n 1 node --check`; `node --check tests/gradebook-edge.test.js`: syntax PASS. Source/link/migration-preservation and git diff checks recorded in the task report. No SQL execution needed for unchanged migrations; prior7/7 reveal SQL evidence is historical, not rerun.
- `npm exec --offline --package=prettier@3.6.2 -- prettier --check 'supabase/functions/**/*.js' tests/gradebook-edge.test.js`: exit1 ENOTCACHED, formatter did not execute. No registry traffic; no formatting PASS inferred.
- Full app/B2/B3 suites, build, Deno execution/bundle/config parsing, native17, multi-connection concurrency, hosted JWT/RLS/API/security, browser, exact-HEAD CI, key recovery and real-data gate **NOT RUN**. Node tests prove crypto/handler behavior and mock request boundaries, not deployed JWT signatures or DB permissions.

Sources checked2026-10-26: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [function authorization headers](https://supabase.com/docs/guides/functions/auth-headers), [dependency imports](https://supabase.com/docs/guides/functions/dependencies), [changelog](https://supabase.com/changelog), [PG17 pg_proc](https://www.postgresql.org/docs/17/catalog-pg-proc.html), [PG17 function metadata](https://www.postgresql.org/docs/17/functions-info.html), [PG17 numeric functions](https://www.postgresql.org/docs/17/functions-math.html), [PG17 binary hash functions](https://www.postgresql.org/docs/17/functions-binarystring.html). Markdown changelog fetch was unsupported; the HTML index was read. No relevant inspected change required weakening auth or SQL guards. Hosted plan/quota/state was not queried.

## GB-B4-REV-001 — SDK CORS correction (2026-10-26)

**P2 / FIXED IN DRAFT / NOT DEPLOYED.** Baseline `e036521e079c514a44b24ed1bf9b706fbddfa5e5`, clean local/remote feature/personal-gradebook. The shared OPTIONS handler omitted x-client-info, so a browser's Supabase SDK preflight could fail before POST; direct Node POST tests did not establish browser header compatibility. No hosted failure was reproduced or inferred.

Only production change: `_shared/handler.js` adds `x-client-info` to the existing explicit authorization/apikey/content-type/x-gradebook-capability header list. Origin allowlist, POST/OPTIONS, no-store/Vary, existing response headers and all Auth/crypto/RPC/DTO/retry logic remain unchanged. Both entrypoints use this same handler; config and migrations are unchanged.

### Pinned SDK header evidence

Installed `@supabase/supabase-js` and `@supabase/functions-js` are2.118.0. Source `supabase-js/src/lib/constants.ts` defines X-Client-Info; `lib/fetch.ts` supplies apikey/Authorization; `FunctionsClient.ts:invoke` supplies application/json for object bodies. A real pinned SDK invoke with synthetic accessToken callback and mocked fetch captured exactly **apikey, authorization, content-type, x-client-info**. A second synthetic invocation also captures the explicitly supplied x-gradebook-capability. Neither invocation performs Auth/network requests; global live fetch remains forbidden.

Other headers were reviewed, not assumed: the SDK's `src/cors.ts` combines headers for multiple products/options. x-retry-count belongs to PostgREST retries, not default Functions invocation. Traceparent/tracestate/baggage are optional, only sent when tracePropagation is explicitly enabled; defaults remain disabled. x-region requires an explicit region and adds forceFunctionRegion query state; the existing Gradebook no-query contract remains unchanged. These optional modes are not enabled/supported by this narrow correction. No wildcard headers/origins or broader SDK default methods were imported. [Official CORS documentation](https://supabase.com/docs/guides/functions/cors) confirms tracing opt-in; public changelog reviewed, no relevant breaking change found. No project endpoint was queried.

### Focused evidence

- `node --test --test-name-pattern='CORS preflight|HTTP boundaries' tests/gradebook-edge.test.js`: **4/4 PASS**, one execution,162.68ms total. Three new finite tests inspect actual OPTIONS responses for both handler kinds, student capability support and unapproved-origin403. They assert exact allowed header/method values, origin/no-store/Vary and zero backend client creation/Auth/RPC/limiter calls. Existing HTTP boundary test also passes, including invalid POST media/size/origin and no diagnostic logger. Current source37 tests; no full37-test execution claimed.
- `node --check supabase/functions/_shared/handler.js`; `node --check tests/gradebook-edge.test.js`; `git diff --check`: **PASS**. Production diff is one header addition; no dependency changes.
- Full app/B4/SQL suites, browser/hosted CORS, JWT/RLS/API, native17, Deno and exact-HEAD CI **NOT RUN**. No formatting execution in this correction; prior ENOTCACHED remains NOT RUN / B5, no formatter PASS inferred. Existing teacher/capability/error/DTO/retry tests remain prior evidence, not newly executed acceptance.

### Unchanged mandatory concern matrix

| Concern | Status preserved | Evidence and residual owner |
| --- | --- | --- |
| GB-B4-CON-001 | Static assessment PASS (prior); native17 **NOT RUN** | All SQL unchanged; strict guard/runtime verification remains CP01-C. |
| GB-B4-CON-002 | **PASS offline** (prior, not rerun) | AES-GCM/HMAC/reveal/DTO files unchanged; hosted redaction/Auth/RLS remains CP01-C. |
| GB-B4-CON-003 | **NOT RUN** | Previous Prettier ENOTCACHED; format/Deno/exact-HEAD CI remains B5. |
| GB-B4-CON-004 | **PASS static/offline** (prior, not rerun) | No SQL/error/client retry changes; OPTIONS zero-backend assertions are new. Internal PostgREST/hosted behavior remains CP01-C. |
| GB-B4-CON-005 | **PASS scope compliance** | Hosted Supabase/Auth0, migrations0, Edge deployments0, secretsNO, real dataNONE, stress/load/soak/stretchNONE. Separate authorization required for rollout/security/real-data gates. |

B4 READY FOR FINAL REVIEW only. B5 NOT STARTED; CP01-C, rollout reconciliation and real-personal-data gate NOT RUN. This correction does not authorize or start those checkpoints.
