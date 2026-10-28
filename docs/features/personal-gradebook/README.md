# Personal Gradebook — Codex entry point

**G07/G08 preparation (2026-10-28):** [backup assessment, proposed independent age custody, runbook and test evidence](G07_BACKUP_RECOVERY.md); [owner authorization checklist/decision template](G08_OWNER_AUTHORIZATION.md). G07 PARTIAL (offline age19 cases PASS; new native17/ACL run awaits approval); operational custody and G08 remain BLOCKED. No Drive upload or real-data permission.

**Project:** KHTN8 Board (`khoabm/dashboard`). **Current (2026-10-28):** CP02–CP05/CP06-B OFFLINE ACCEPTED; CP01-C bounded hosted acceptance is PARTIAL, not a full security PASS. Four reviewed Gradebook migrations are applied under their [actual MCP versions](../../DATABASE.md#gradebook-migration-rollout-gate--gb-ops-rev-002); both B4 Edge Functions are deployed v2 with synthetic-only key custody and localhost:4173 origin. Production frontend default stays disabled, no public deployment or real-data authorization. [Current evidence and remaining gates](CP06_OFFLINE_READINESS.md#cp01-c--bounded-hosted-acceptance--2026-10-28); PR5 remains Draft → develop. Older snapshots below are historical.

**Historical B5 snapshot (2026-10-26 / baselinec9e18c1):** B4 ACCEPTED AS DRAFT. [Superseding CI policy/concern matrix/asset inventory](B5_OFFLINE_REVIEW.md#current-policy-correction--baselinec9e18c1-supersedes-sql-ci-approval): six explicit component/pure-unit files in test:ci; no API/Supabase/Edge/SQL integration in CI, staged PGlite/runner withdrawn. Prior120 Node and temporary20 SQL groups retained as historical evidence only. PR5 Draft/dirty (BUG_FIX_LOG conflict), Actions blocked; native Deno/PG17, CP01-C and real-data gates NOT RUN. No automatic continuation or pre-merge asset deletion.

**CP05 UI refinement merged (2026-10-27):** [CP05_UI_REFINEMENT](CP05_UI_REFINEMENT.md) retains design/review history. Current chart consumes101 aggregates but displays occupied categories, with responsive scroller and one keyboard focus point; DOB calendar retains strict date-only behavior. CP06-A records new browser resize/lifecycle evidence; earlier candidate-only/NOT RUN notes are historical and never imply hosted acceptance.

## Read path (token-efficient)

1. Read root [AGENTS](../../../AGENTS.md), [OVERVIEW](../../OVERVIEW.md), and [STATUS](../../STATUS.md) once at the chosen HEAD.
2. Read [BRIEF](BRIEF.md) for **approved business requirements and exact visible labels**. It is the canonical specification for this new feature, overriding older prospective examples; never substitute existing board SPEC R01–R28.
3. For database, identity lookup, import, API or security work, read [DATA_AND_SECURITY](DATA_AND_SECURITY.md), plus [DATABASE](../../DATABASE.md), [SECURITY](../../SECURITY.md), and current Supabase guidance.
4. For work planning, implementation or review, read [CHECKPOINTS](CHECKPOINTS.md). Read only relevant source and code-style files after selecting a checkpoint.
5. Inspect diffs since last reviewed SHA rather than rereading the repository. Before any code task, verify current branch/HEAD and checkpoint evidence.

## Source-of-truth and boundaries

- New user decisions > [BRIEF](BRIEF.md) > technical proposals in [DATA_AND_SECURITY](DATA_AND_SECURITY.md) > this index. Implementation state comes from code/migrations at current SHA, not a checkbox by itself.
- Existing board implementation and 28-part [SPEC](../../SPEC.md) remain authoritative for the current learning-resource board; this feature must not regress it.
- **BRIEF V1.2 / user D01–D05 plus positional-import clarification (2026-10-26):** approved scope includes ≤5-place raw decimals, atomic roster/score UPSERT, editable class/year metadata, server rate limiting, exact UI/catalog labels/order, customizable import headers with fixed physical positions, two semesters and student-only charts. Statistical inference mitigation is Accepted/Deferred for V1; access authorization, aggregate-only responses and publication checks remain mandatory. See [decision history](../../DECISIONS.md#personal-gradebook-2026-10-26). Thresholds/TTL, parser limits, transaction/audit details and retention remain technical defaults or gates requiring evidence, not newly user-approved values.
- Historical pre-CP01-C boundary: this handoff alone did not authorize hosted operations. The owner separately authorized the current bounded CP01-C rollout/testing; it does not authorize real personal data, account creation, merge, public frontend deployment or billed services. [GB-OPS-001 retry warning](../../DATABASE.md#cảnh-báo-tái-diễn-gb-ops-001--sqlstate-retryable-cho-xung-đột-nghiệp-vụ) must be followed for B4.
- Protect real student identifiers and birth dates: never commit to Git, QA fixtures, issue text or logs. Use synthetic numbers/dates in tests.

## Feature checkpoint map

[CHECKPOINTS](CHECKPOINTS.md) is the execution/acceptance tracker: CP00 baseline → CP01 schema/security → CP02 navigation/student lookup → CP03 student administration/import → CP04 score administration/import/publication → CP05 student board/chart → CP06 integration/regression → CP07 final review/merge. These CPs are for this feature, not global project Phase 0–6.

For every checkpoint report: **branch/HEAD; what changed; requirement IDs; actual tests (PASS/FAIL/NOT RUN/BLOCKED); risks; next unblocked checkpoint**. Do not conflate offline mocks with real Auth/RLS/privacy tests. Update the tracker and root STATUS only with observed evidence.

CP00 correction and [finding dispositions](CHECKPOINTS.md#cp00-finding-dispositions) document readiness only. CP01 drafts and CP02/CP03 offline UI evidence do not establish backend security acceptance. Complete the [real-data gate](DATA_AND_SECURITY.md#h-real-personal-data-gate) before using real students' information, even before deployment. No rollover/history workflow or suppression engine is implied by this plan.

CP01-A database/backend design: [CP01_TECHNICAL_DESIGN](CP01_TECHNICAL_DESIGN.md), based on read-only environment verification at `f522266` on 2026-10-26. Read this before proposing CP01-B. Design evidence is distinct from CP01-B implementation, CP01-C authorized integration and the real-data gate; none starts automatically.

[Accepted CP01-A refinements](CP01_TECHNICAL_DESIGN.md#143-accepted-refinement-disposition), reviewed from `31f887bd`: semester-scoped publication checks, complete private UPSERT state fingerprint and calendar-only Vietnam DOB validation. B1–B5 ownership and future live acceptance are linked there; no runtime acceptance is implied.
