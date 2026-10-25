# Personal Gradebook — Codex entry point

**Project:** KHTN8 Board (`khoabm/dashboard`). **Feature:** Bảng điểm cá nhân. **Phase:** planning/docs only; **implementation:** NOT STARTED. Branch `feature/personal-gradebook` created from `develop` `af43f51` on 2026-10-25.

## Read path (token-efficient)

1. Read root [AGENTS](../../../AGENTS.md), [OVERVIEW](../../OVERVIEW.md), and [STATUS](../../STATUS.md) once at the chosen HEAD.
2. Read [BRIEF](BRIEF.md) for **approved business requirements and exact visible labels**. It is the canonical specification for this new feature, overriding older prospective examples; never substitute existing board SPEC R01–R28.
3. For database, identity lookup, import, API or security work, read [DATA_AND_SECURITY](DATA_AND_SECURITY.md), plus [DATABASE](../../DATABASE.md), [SECURITY](../../SECURITY.md), and current Supabase guidance.
4. For work planning, implementation or review, read [CHECKPOINTS](CHECKPOINTS.md). Read only relevant source and code-style files after selecting a checkpoint.
5. Inspect diffs since last reviewed SHA rather than rereading the repository. Before any code task, verify current branch/HEAD and checkpoint evidence.

## Source-of-truth and boundaries

- New user decisions > [BRIEF](BRIEF.md) > technical proposals in [DATA_AND_SECURITY](DATA_AND_SECURITY.md) > this index. Implementation state comes from code/migrations at current SHA, not a checkbox by itself.
- Existing board implementation and 28-part [SPEC](../../SPEC.md) remain authoritative for the current learning-resource board; this feature must not regress it.
- **Labels, order, input rules, INSERT-only imports, 2 semesters, raw-score precision, student-only charts and privacy controls are approved.** Internal identifiers, token duration, rate-limit thresholds, data retention and UI implementation details are proposals requiring evidence/security review; do not present them as new user-approved mandates.
- No feature code, database changes, Edge Function deployment, demo personal data, account creation, merge to develop/main, public hosting or billed services are authorized by this docs-only task.
- Protect real student identifiers and birth dates: never commit to Git, QA fixtures, issue text or logs. Use synthetic numbers/dates in tests.

## Feature checkpoint map

[CHECKPOINTS](CHECKPOINTS.md) is the execution/acceptance tracker: CP00 baseline → CP01 schema/security → CP02 navigation/student lookup → CP03 student administration/import → CP04 score administration/import/publication → CP05 student board/chart → CP06 integration/regression → CP07 final review/merge. These CPs are for this feature, not global project Phase 0–6.

For every checkpoint report: **branch/HEAD; what changed; requirement IDs; actual tests (PASS/FAIL/NOT RUN/BLOCKED); risks; next unblocked checkpoint**. Do not conflate offline mocks with real Auth/RLS/privacy tests. Update the tracker and root STATUS only with observed evidence.
