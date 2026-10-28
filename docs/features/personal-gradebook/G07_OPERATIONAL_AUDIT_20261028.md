# G07 Operational audit after PR #5 — 2026-10-28

Baseline: `develop` / `6a0daf3906e147a3882d6c7f27a712967480e8de`, repository `khoabm/dashboard`; clean checkout before this audit. Merge parents: `307b6c611ca36d8d8e05a6cccf8dadd86d754a30` and `1a76aee5958a3d7f5a147ef92e5e067a68aec693`. Local tree comparison with the second parent has zero differences. The referenced prior conversation reports merge-SHA CI [40693395683](https://github.com/khoabm/dashboard/actions/runs/40693395683/job/122833705128) SUCCESS; this task did not independently query GitHub or rerun CI.

**Technical PASS retained; Operational/Overall PARTIAL. G08 BLOCKED; deployment NOT RUN.** [A–F](G07_OWNER_DECISIONS.md) remain approved. No new architectural choice or production authorization is inferred.

## Scope and concern matrix established before edits

| Concern | Preparation / narrow verification | Inventory |
| --- | --- | --- |
| Stale pre-merge entry points | Reconcile current header against local parents/tree; retain historical evidence | STATUS, feature README, CHECKPOINTS |
| Operational gaps and production boundary | Read policy, both manual guides, owner report, helper, offline/native test source and dedicated workflow; document blockers | This audit, restore guide |
| Superseded custody questions in G08 | Replace §7 questions with approved policy and remaining evidence; correct technical status | G08 authorization template |
| Documentation integrity | One relative-file-link check, Markdown fence balance and git diff whitespace/scope inspection | All six changed documents |

No executable, dependency, workflow or migration changes. No runtime bug fix; BUG_FIX_LOG entry is not applicable to this status/runbook reconciliation. No architecture/module or roadmap phase change.

## Evidence audit and exit conditions

| Item | Current evidence | Missing evidence / next action |
| --- | --- | --- |
| Synthetic technical recovery | Native17/age/data/ACL/RLS/rollback PASS retained at `910ac0ae`, run40623615581; 21 offline cases retained | Same-cluster synthetic proof only; do not rerun accepted suite |
| Owner local + Drive | [Owner report](G07_OWNER_REHEARSAL_20261028.md) PASS, baseline0679367; local/remote receipt PASS | Accepted owner report, not agent observation; do not repeat Drive test |
| Two independent age identities | Synthetic recipients and phone-note re-entry PASS | Physical paper and replacement-device path NOT RUN; phone notes do not prove paper custody |
| Trusted receipt and Google access | Manual guide defines independent receipt/account recovery | Owner privately confirms receipt survives original machine loss, restricted sharing, current free capacity and account recovery; no account IDs/codes in public evidence |
| Production paired export/validator | Helper rejects non-synthetic format/project; 32MiB bounded inputs; no DB/upload client | BLOCKED: reviewed production contract, secret acquisition, consistent snapshot and verifier absent; do not relax synthetic guards |
| Owner isolated PostgreSQL restore | Cloud proof retained; owner demo is text, databaseRecoveryVerification=NOT_RUN | NOT RUN: trusted clean isolated target, role/AAD mapping and finite authorized verification plan; no production overwrite |
| Latest + previous verified | Approved retention; candidate never replaces verified set until applicable checks pass | Production generations not evidenced. Bootstrap honestly with one verified set, retain it until a later verified second set exists; do not duplicate one snapshot and claim two generations |
| Managed dependencies | Runbooks identify Auth/admin mapping, Edge config, Storage bytes/policies and global roles | Recovery inventory/verifier still required; single pg_dump is insufficient; no secondary live DB introduced |
| G08 authority | Conditional owner project authorization recorded | Institutional/processing/provider/retention evidence remains BLOCKED; reference data arrives only after applicable conditions are evidenced |

## Safe preparation for a future production-tooling task

This is a review checklist, not an implemented format or permission to export. A separate implementation can be developed with synthetic inputs before production access is authorized; G08 does not block unrelated offline development.

- Specify a versioned production manifest and validator together: opaque snapshot ID, UTC/source SHA, original project/AAD identity, PG/tool versions, exact applied-ledger-to-file mapping, authenticated inner dump hash, counts and complete required/active/retained inventory for all four rings. Bind both ciphertexts to the same snapshot. Keep key values and plaintext hashes out of public receipts.
- Define how the authorized operator obtains existing server keyrings securely; no browser/SQL secret scraping, fresh replacement keys or secret values in argv/logs/Git/Actions. Coordinate writes and rotation so DB and keys describe one generation. Production handling remains blocked until this mechanism is reviewed and authorized.
- Review full recovery coverage: global roles/ownership/default ACL/RLS, Auth/admin UID and session revocation, Edge settings and secrets, Storage metadata plus actual bytes, deletion/restriction ledger. Record coverage and omissions explicitly; no new provider/resource is selected here.
- Bound local input/output sizes and runtime, fail closed on missing retained kid, corrupt/mixed files or archive collision; fully authenticate before SQL. Use fixed diagnostic categories and restricted staging with cleanup for every failure path. Test with finite offline fixtures; do not add hosted/API/SQL specialists to curated CI.
- Before any future hosted activity, submit its exact target, goal, data, maximum requests/queries/bytes including implicit retries, risks and stop conditions for separate approval. Unknown quota, 429/503/timeout or ambiguous write outcome means stop, no retry. Production overwrite/cutover is separately authorized.

## Minimal owner actions, in order

1. Complete only the missing custody exercise: two synthetic identities re-entered from separate physical papers on clean independent staging/device without original Windows credentials; public recipients and both decryptions match. Reuse accepted synthetic ciphertext/receipt if available; no repeat Drive transfer is required. Do not destroy the sole original or generate production keys for this audit. If unavailable, record replacement-device verification BLOCKED. See [backup §4–4.1](G07_MANUAL_BACKUP_GUIDE.md) and [restore](G07_MANUAL_RESTORE_GUIDE.md).
2. Privately confirm trusted receipt custody, Google recovery/access, sharing and actual capacity for candidate + latest + previous. Report only date, environment/tool version, completed checks, PASS/FAIL/NOT RUN and redacted evidence reference; never keys, paper photos, private locations, account IDs or student data. Confirm cleanup of synthetic temporary material; corrected Windows snippets remain NOT RUN until actually exercised.
3. Complete applicable [G08 authorization evidence](G08_OWNER_AUTHORIZATION.md). After production tooling review, approve one bounded export/isolated recovery activity with an exact target and budget. No real dataset or secret is requested now.

Paper/receipt evidence can progress now. Production-tool implementation/review can proceed offline in a scoped follow-up; actual export/managed restore cannot close in this task. Do not mark Operational PASS from policy approval, cloud proof or two successful decrypt receipts alone.

## Verification and accounting for this audit

Documentation-only: relative file links/fence balance and `git diff --check`, once after edits; scope inspection confirms only the six documents in the inventory. No browser/unit/build/native recovery or new CI run; accepted tests are retained at their recorded SHAs, not relabeled as tests of this documentation commit. No hosted requests/queries, Drive transfers, production keys/PII, owner-device operations, migrations, deployment or main merge: **0**. No paid service activated. Operational remains PARTIAL, G08 BLOCKED.
