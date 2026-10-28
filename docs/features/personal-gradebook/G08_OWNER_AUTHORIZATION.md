# CP01-C G08 — Owner authorization and institutional review

**OWNER APPROVAL + COMPETENT-AUTHORITY APPROVAL ATTESTATION RECORDED — TECHNICAL RELEASE GATE BLOCKED.** Updated 2026-10-28 (Asia/Bangkok) for `khoabm/dashboard`, PR #12 baseline `3d3e87c236abcdeee09ba0ccfc2107c3981f00ed`.
Original template baseline: `beede03884c0e44995d25746bf5390e7bb4a6952`.
The owner approved real-data use and subsequently stated: **“Tất cả quyền và điều kiện đều được người có thẩm quyền phê duyệt”.** This records the project owner’s attestation that all applicable legal and organizational rights/conditions have competent-authority approval. Do not ask for those approvals again. This is not independent inspection of private evidence, a legal compliance finding, or a technical PASS.

Keep completed identities, contact details, consent evidence, credentials and sensitive records in an institution-approved private record.
The public repository should contain only redacted decision status and safe evidence references.
Do not fill it with student PII, signatures, passwords, private keys or secret locations.

G07 policy A–F remains approved in [owner policy](G07_OWNER_DECISIONS.md). Owner also reported paper copies and Drive authentication complete in the referenced conversation; retain these as owner-reported completion, without repeating accepted steps. G07-4 synthetic PostgreSQL restore PASS is retained; full managed Supabase recovery is DEFERRED/unverified, not PASS.

The latest attestation supersedes earlier PENDING/BLOCKED approval wording in this record. Legal/organizational approval status is **ATTESTED APPROVED**; private supporting evidence is **NOT INDEPENDENTLY VERIFIED**. Technical implementation, production security/configuration, recovery scope and zero-cost readiness remain separate. The current task expressly excludes real import, deployment and production mutation; it grants no PR #12 merge permission.

## Decision record

| Required decision metadata | Owner/institution to complete privately | Current status |
| --- | --- | --- |
| Responsible institution and data-controller/processor roles | Legal name, responsibility allocation, authorized signatory and delegation reference | ATTESTED APPROVED; private details/evidence not independently inspected |
| Authorized system owner | Named person/role, scope, replacement/handover authority | Owner approval and competent-authority approval attestation recorded 2026-10-28; private identity/delegation evidence not independently inspected |
| Reviewers | Institutional decision-maker, privacy/legal reviewer, technical reviewer, child-safeguard lead as applicable | ATTESTED APPROVED; private details/evidence not independently inspected |
| Approved scope | Classes/age groups/fields/purpose/users/environments and exclusions | ATTESTED APPROVED; private details/evidence not independently inspected |
| Evidence record | Private document reference/version/date; public redacted reference only | ATTESTED APPROVED; private details/evidence not independently inspected |
| Decision and conditions | Approve / approve with conditions / reject; effective date, expiry/review trigger | **OWNER APPROVED 2026-10-28** for real-data G08/Gradebook V1; legal/organizational conditions ATTESTED APPROVED; technical security/release NOT RUN in this update |
| Release authorization | Named signatories, technical prerequisites, approved activation scope | **NOT EXECUTED / TECHNICAL GATE BLOCKED**; legal/organizational approval attested; current task excludes import/deploy |

Checkboxes and detail tables below are the private evidence/review inventory, not requests to repeat approval. Unchecked means evidence or implementation has not been independently verified here; it does not negate the owner’s attestation. No approver name, institution, document ID, retention period or legal basis is invented. Source: the owner’s statements in [referenced conversation](chatgpt-conversation://6ae0df79-a688-83ec-9545-f5fac8d7ec62), reproduced in the current task; no supporting private documents were accessed.

## 1. Purpose and lawful basis

- [ ] Specify the precise education/assessment purpose, the responsible institution's mandate and why this separate Gradebook service is needed.
- [ ] Identify the applicable legal basis for **each** operation: collection/import, matching, storage, teacher reveal, student disclosure, aggregate charts, auditing, backup, recovery and deletion. Record legal provisions and institutional authorization; do not assume consent or a teacher's repository access is sufficient.
- [ ] If consent is relied upon, approve clear notice, voluntary/valid collection, age/representative handling, proof, withdrawal and consequences. If another basis is relied upon, record its scope and reviewer rationale. Do not invent or self-approve a legal exception.
- [ ] Prohibit unrelated marketing, public student listings, profiling/ranking or reuse. Review any proposed new purpose before use.

## 2. Responsible institution and authorized owner

- [ ] Confirm who determines purpose/means, who operates the system and who is permitted to process/access backups. Allocate controller/processor and provider responsibilities under applicable law/agreements.
- [ ] Confirm one designated administrative account, least-privilege responsibilities, secure account recovery, handover and removal when personnel leave.
- [ ] Approve a private contact channel for privacy requests/incidents, operational ownership and institutional escalation. Do not publish personal staff contact details without authorization.

## 3. Necessity of CCCD/CMND and DOB

| Field/use in current design | Necessity question for owner/legal reviewer | Decision/evidence |
| --- | --- | --- |
| CMND/CCCD number,9–12 digit string | Is collecting a national identifier necessary/proportionate for this purpose? Could an institution-assigned opaque identifier or another lower-risk method work? Confirm treatment of students without such an identifier | ATTESTED APPROVED; private details/evidence not independently inspected |
| DOB as matching factor | Why is exact full DOB necessary? Are less identifying alternatives feasible? Approve source accuracy, correction and age-specific handling | ATTESTED APPROVED; private details/evidence not independently inspected |
| Optional full name | Is it needed for teacher workflow? Keep optional; no extra demographic/contact fields or ID-document images without a new review | ATTESTED APPROVED; private details/evidence not independently inspected |
| Subject scores, class/year | Define education scope and authorized students/teachers, accuracy/correction and publication boundaries | ATTESTED APPROVED; private details/evidence not independently inspected |
| Audit/limiter metadata | Define minimum security evidence and retention; no raw identifier/DOB/score payload in logs | ATTESTED APPROVED; private details/evidence not independently inspected |

- [ ] Document minimization and rejected/accepted alternatives. Reversible encryption does not make an unnecessary field necessary.
- [ ] Explicitly acknowledge that document+DOB knowledge is not strong proof of identity; accepted V1 technical limitations are not a legal authorization or a new consent record.
- [ ] If the necessary fields/basis cannot be approved, keep real-data use closed and request a separately scoped design change. Do not silently alter the business contract in this preparation task.

## 4. Children's personal data safeguards

- [ ] Establish age groups and any required child/representative approvals/notices; verify who can represent the child and how that is evidenced without overcollecting identity documents.
- [ ] Review student access/disclosure, including whether the applicable rules for disclosure of private information require both child and representative agreement in the particular circumstances. Do not equate technical access with legally approved disclosure.
- [ ] Approve age-appropriate notices, shared-device guidance, correction/withdrawal channels, handling of safety concerns and a best-interests review.
- [ ] Record that encrypted identifiers, DOB, names, scores, exports and backups remain personal-data processing. Pair-knowledge impersonation and small-class aggregate inference are residual risks requiring explicit review; V1 suppression is deferred, not implemented.
- [ ] Verify private responses/no-store/memory cleanup/server denial evidence and prohibit real data in Git/CI/artifacts/screenshots/logs. Avoid third-party tracking or unnecessary sharing.

## 5. Admin and student access scope

| Actor | Current intended scope | Approval needed |
| --- | --- | --- |
| Designated admin | Authorized class/student/score operations, import, publication and explicit single-student identifier reveal; verified JWT/profile/session plus server authorization | Named delegation and operational purpose for each scope; reveal/audit responsibilities |
| Student | Pair verification, short-lived capability, own published-semester grades and aggregate-only selected histogram; no peer identifier/score list | Approved access/disclosure method and residual impersonation/inference risk |
| Anonymous/non-admin/direct client | No private Gradebook tables, writes or teacher RPC access | Review actual deny evidence; no hidden-UI-only control |
| Backup/recovery operator | Only separately authorized backup/restore handling; not automatic teacher access | Scope, destination, custody and independent review |

- [ ] Approve semester publication rules and the limit that previously delivered bytes cannot be remotely erased.
- [ ] Approve account/session revocation, incident restrictions and handover. No student Supabase accounts or broader administrator role is created by this task.

## 6. Retention and deletion

| Data category | Period/trigger to approve | Deletion/verification owner | Decision |
| --- | --- | --- | --- |
| Student identifiers/DOB/name and scores | Exact period and purpose/end-of-enrollment trigger; applicable education obligations | Named authorized role; reviewed deletion order/FKs and evidence | ATTESTED APPROVED; private details/evidence not independently inspected |
| Audit/security/limiter records | Proportionate period and any legally required preservation | Named privacy/security operator | ATTESTED APPROVED; private details/evidence not independently inspected |
| Temporary import/preview/private UI data | Bounded lifecycle; raw files not persisted to Storage/Git | Teacher/operator and technical controls | ATTESTED APPROVED; private details/evidence not independently inspected |
| Primary/offline encrypted backups | Retained generations/maximum age/expiry, including versions and trash | Owner/custodian; receipt of deletion/expiry | ATTESTED APPROVED; private details/evidence not independently inspected |
| Consent/rights/incident records | Applicable proof/limitation/preservation periods | Institution-approved records owner | ATTESTED APPROVED; private details/evidence not independently inspected |

- [ ] Distinguish deactivation/soft deletion from erasure. Existing student deletion restrictions preserve scores; approve an executable deletion process separately rather than promising unsupported UI behavior.
- [ ] Cover provider trash/version history, offline copies, restored copies, retained keys and temporary staging. Define legal holds and who authorizes exceptions.
- [ ] Keep a private deletion/restriction ledger for replay before a restored snapshot is reopened, so recovery does not resurrect removed/restricted data.
- [ ] Do not destroy a shared encryption key to erase one student if it would make other retained data unrecoverable. No purge/re-key/schema operation is performed here.

## 7. Backup and key custody responsibilities

A–F are already approved in [owner policy](G07_OWNER_DECISIONS.md): private personal Drive Free, no USB/secondary DB, sole owner/no emergency custodian, two independently recoverable age identities, manual triggers/no guaranteed RPO/RTO, latest+previous verified. Do not reopen these choices. Institutional acceptance of the actual processing/storage scope remains separate.

- [ ] Record private evidence of two physical-paper identities, trusted receipt custody and recovery without the original Windows dependency. Phone-note re-entry alone is insufficient. Do not repeat accepted synthetic Drive tests.
- [ ] Confirm actual restricted account/folder access, independent Google recovery and free capacity; no private identities beside ciphertext. No account IDs/codes or secret locations in this public template.
- [ ] Review production exporter/validator and complete DB/key-version consistency, managed roles/Auth/Storage/Edge recovery inventory, retention/deletion and isolated destination scope. Cloud technical PASS does not prove owner production recovery.
- [ ] Authorize each actual export/isolated restore separately with exact target/data/budget/stop conditions. Review resulting data/permission evidence before Operational PASS; cutover/overwrite requires separate approval. No real credentials through chat or Actions.

[Current G07 audit and minimal owner actions](G07_OPERATIONAL_AUDIT_20261028.md) distinguish accepted evidence from missing operations.

## 8. Third-party storage and potential cross-border processing

- [ ] Inventory Supabase processing locations, Google Drive account/product/terms, authorized operators and any other provider involved in real-data operations. Do not assume a free personal account meets institution requirements.
- [ ] Determine actual storage/processing/remote-access geography, provider/subprocessor terms, protection obligations and whether cross-border assessment/filing or another legal process applies. Record qualified review and required evidence; encryption does not automatically remove these obligations.
- [ ] Approve restricted sharing, institutional account ownership/access recovery and offboarding. Prohibit public links and storage of private decryption credentials alongside ciphertext.
- [ ] Verify actual free quota before use; Google account capacity is shared with other products. Stop on insufficient/unverifiable quota; no upgrades, purchases or paid fallback.
- [ ] Record that GitHub Actions receives newly generated synthetic fixtures only. No real student data, production dump/keyring, private identity credential or sensitive artifact may be introduced there.

## 9. Incident response and data subject rights

- [ ] Name institutional incident lead and contacts, triage/severity process, protected evidence handling, containment authority, provider coordination and recovery/cutover signatory.
- [ ] Review applicable notification recipients, legal thresholds/deadlines and required records under current law. Record exact obligations and responsible clock owner; do not assume an old generic deadline applies.
- [ ] Define response to lost/stolen backups, compromised age identities, production key compromise, unauthorized reveal, incorrect scores and provider/account loss. Disable affected access through an authorized plan; no automatic destructive key drop.
- [ ] Approve identity/representative verification for access, correction, deletion, restriction/withdrawal/objection and complaints as applicable; record requests, legal exceptions, response deadlines and appeal/escalation privately.
- [ ] Avoid asking requesters to email full CCCD/DOB as a default verification shortcut. Minimize evidence and prevent disclosure to an impersonator.
- [ ] Reapply approved restrictions/deletions after restore, verify containment and document safe resumption. Runbook readiness is not an incident drill PASS.

## 10. Release gate and required approvals

| Gate | Required evidence/sign-off | Current result |
| --- | --- | --- |
| Purpose/legal authority/institution/operator | Signed or otherwise valid institutional delegation and reviewed lawful-basis record | ATTESTED APPROVED; supporting evidence not independently verified |
| Necessary fields/children's safeguards/notices | Documented necessity and applicable child/representative arrangements | ATTESTED APPROVED; supporting evidence not independently verified |
| Access/residual-risk approval | Actual server deny evidence + approved scope, pair-knowledge/inference risks and accountable roles | Approval ATTESTED APPROVED; prior technical evidence retained within its original scope |
| Retention/deletion/rights/incident response | Approved periods, executable responsibilities and reviewed legal obligations | ATTESTED APPROVED; supporting evidence not independently verified |
| Provider/storage/transfer review | Approved account/folder and independent credential custody, terms/geography and required assessments/filings | ATTESTED APPROVED; supporting evidence not independently verified |
| G07 technical/operational recovery | New synthetic evidence review, permissions, independently held custody and approved operational plan | PASS synthetic technical retained / PARTIAL operational |
| Costs and production activation | Verified safe/free environment plus scoped execution authorization | Technical readiness NOT RUN here; import/deploy excluded by current task |

**G08 approval attestation RECORDED; technical release/import readiness remains BLOCKED, not executed.**
No assistant signs for an institution or claims independently verified legal compliance. Approval attestation does not establish security, quota, operational recovery or production deployment.

## Technical next step — zero-cost, before real import

| Concern | Next verification | Current disposition |
| --- | --- | --- |
| Exact source/config and least privilege | Review existing migration/Edge/config evidence, deny coverage and source-to-deployed version correspondence; no secret values or student rows | Prior evidence only; fresh production correspondence NOT RUN |
| Privacy and import safety | Review existing redaction/no-store/memory cleanup, atomic preview/apply, stale conflicts, unpublished-semester and file handling evidence; choose finite offline regression only for an identified gap | No new runtime test; NOT RUN |
| Recovery | Document managed Auth/Storage/Edge/secrets scope and restore limits against G07-4 engine-only proof | DEFERRED/unverified; do not repeat accepted synthetic restore |
| Cost | Verify current official Free limits and safe target/capacity before any hosted execution; no trial/add-on/new paid resource | Fresh quota/capacity NOT VERIFIED |
| Any later hosted verification | Separate per-activity plan: exact target, purpose, synthetic data, maximum requests/queries including SDK retries, stop on first 429/503/timeout; obtain scoped approval before execution | NOT RUN; current task has zero Supabase/Drive requests |
| Real import/deploy | Review technical results and separately authorized execution scope | Excluded from current task |

Review at baseline `3d3e87c`: PR #12 open/ready, develop base `78f3c32`, mergeable at read time, two documentation files only; no submitted reviews or inline threads. [Offline CI 40713400354](https://github.com/khoabm/dashboard/actions/runs/40713400354) SUCCESS, including syntax/scoped credential scan, curated unit/component contracts, build and format. This CI does not prove hosted security or legal compliance. No rerun requested. This update adds only this record, CHECKPOINTS and STATUS; docs content/diff/local links checked once before publication. New commit CI must be read separately; no inherited PASS claim.

## Historical current-law review starting points

Prior record states these official sources were checked 2026-10-28; not rechecked in this documentation update:

- [Law91/2025/QH15, official government record](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=), effective2026-01-01.
- [Decree356/2025/ND-CP, official government record](https://vanban.chinhphu.vn/?classid=1&docid=216387&pageid=27160&typegroupid=4), effective2026-01-01.
- [Government explanation of children's-data provisions](https://xaydungchinhsach.chinhphu.vn/quy-dinh-bao-ve-du-lieu-ca-nhan-cua-tre-em-nguoi-bi-mat-hoac-han-che-nang-luc-hanh-vi-dan-su-119250725165056743.htm).

These identify the current review framework; this preparation does not determine applicability, exemptions, institutional authority, filings, consent sufficiency or legal compliance. The owner now attests competent-authority approvals are complete; the assistant has not independently inspected the underlying review. Do not use superseded guidance as the sole authority.
