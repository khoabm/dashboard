# Grounded Learning Assistant V2 — execution plan / 2026-10-29

Baseline50ea1cbf30b6fa603fce43f588aaa921f6ec54da; dedicated feature/ai-learning-assistant-v2-e2e.
Clean baseline fetched from ai-learning-assistant; develop divergence25 ahead/8 behind; do not merge.
Read AGENTS, overview/status, architecture/testing/style/comments, roadmap/zero-cost, R07.1 and
MVP/UI/F01–06 evidence. No UI/UX Pro Max skill available; retain approved tokens and dialog.

## Decisions and boundaries before implementation

V1 projects published title/body/topic text, lexical fallback, BGE hybrid ranking, Qwen ID selection,
exact excerpts and user-confirmed read-only actions. It cannot explain sources or contextualize follow-ups.
V2 adds a pure deterministic intent/profile layer, a strict generated-answer contract, and bounded
source-focused conversational context. Frontend -> public projection -> deterministic website/topic
answer (zero model calls) OR explicit consent -> transport -> existing Worker BGE -> candidate
selection -> Qwen grounded answer -> validation -> safe text DOM + validated source cards.
Never transmit files, attachment URLs, Gradebook, Auth or private records. Metadata overview explicitly
is not a complete document summary; full current published inventory drives exact counts, with bounded
listed items and explicit truncation. Cloud catalog>24 refuses inference rather than silently sampling.

Context holds at most the last source IDs and one validated prior question, in memory only, owned by
one open modal/snapshot. Follow-ups reuse those sources, not model-generated prose as trusted facts.
Reset/close/abort/snapshot/route exit clears it. Worker rechecks context IDs/shape and limits, then
embeds contextual query; no additional model call. No cross-session memory or persistent transcript.
Model JSON {status,answer,ids,coverage}; bounded answer1800 characters,<=3 allowed IDs, finite enum
statuses/coverage, exact keys, no tool/action output. Answered requires citations; insufficient always
renders a fixed abstention. Qwen sources are untrusted JSON data, system forbids following their
instructions/external facts. Citation validity is not factual correctness; synthetic fact evaluations
and production provenance remain distinct. No claim of complete hallucination/prompt-injection prevention.

Client catalog is NOT independent proof of publication. CORS is NOT authentication. Public endpoint
must stay disabled: production needs trusted content provenance and abuse admission beyond this task.
Existing globally serialized DO lifetime4 reservations permits at most16 standard operations, plus
failure-stop overhead within Activity A20; no new ID to replenish exhausted allowance. Deploy only
with verified account/Free/model entitlement/remaining quota, short expiry, synthetic-only access and
known unused global allowance. No such identity currently injected; inspect metadata only, no secrets.
No paid services/resources/new Supabase integration or migrations. No website release/merge.

## Checkpoints and concern/test matrix

| CP | Inventory and acceptance |
| --- | --- |
| 01 profile | new pure assistant-learning utility; exact counts/published topics/capabilities, empty/large/changed catalog, Vietnamese paraphrases; zero-fetch browser assertions |
| 02 intent | same utility + component; website/topic/list/search/summary/educational/follow-up/outside routes; ordinary lexical fallback and source validation unchanged |
| 03 generation | Worker/service + pure contract; strict envelope, malformed/oversize/unknown IDs, grounded prompt inspection, abstention, two calls maximum, existing V1 regressions |
| 04 conversation/UI | component; memory-only context, safe text answer labels/citations, clear on cancel/close/reset/snapshot, no implicit retries, existing focus/filter/keyboard |
| 05 safety | explicit specialist tests; input/context rejection, disabled/quota/abort/timeouts, DO fail closed, injection samples; no HTTP/Worker suites in test:ci |
| 06 acceptance | six viewport Chromium matrix plus short-height/reflow/reduced motion, generated mock turn/follow-up/overview/navigation/reset/late responses; check, curated, focused pure/specialist, build, format/diff; docs/evidence/commit/push/Draft PR |

Expected inventory: new pure helper/tests; existing assistant component/service/Worker/tests; maintained
synthetic browser fixture/driver; SPEC R07.1, architecture map, roadmap/status, assistant docs and bug log.
No dependency/lockfile/Gradebook/Auth/CI/global deployment config changes. Stable checkpoints committed.

## Hosted activities, accounting and rollback

Activity A only after final offline/browser gates: up to3 synthetic cases (grounded paraphrase,
unsupported, contextual follow-up/injection if justified). Each POST1+DO reservation1+BGE1+Qwen1=4;
three successful cases12 operations; reserve8 for at most2 preflights and failure-stop/uncertain overhead.
Hard global cap4 reservations; total requests including optional invalid probe must remain<=20.
Pre-request finite ledger reserves worst-case; no retries, polling or confirmatory calls. Stop on any
402/429/unexpected503/auth error/timeout/uncertain completion/usage or counter mismatch. Activity B
(max20, task40) only after confirmed integration defect, correction and offline revalidation; never to
retry transient failure or consume allowance. At most activation+disabled restoration deployments
per activity (task<=4). try/finally restore AI_ENABLED=false, empty PREVIEW_EXPIRES/no usable allowance;
verify read-only active config, stop critically if uncertain. Control-plane calls recorded separately.
Without credentials/quota/safe access evidence: hosted BLOCKED, zero calls, no activation/rollback needed.

Final gates distinguish PASS/FAIL/PARTIAL/BLOCKED/NOT RUN. Source scope locally reviewable even when
hosted and GitHub API access blocked. Use [CF-Pages-Skip], push without force, Draft target integration
only; exact compare URL if API Forbidden. No permission checkpoint needed for authorized work.
