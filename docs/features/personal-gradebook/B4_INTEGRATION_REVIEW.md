# CP01-B4 preflight — BLOCKED / 2026-10-26

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
