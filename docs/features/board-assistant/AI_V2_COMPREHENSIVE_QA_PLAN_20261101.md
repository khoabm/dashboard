# AI Assistant V2 — comprehensive QA audit & controlled E2E plan

**Date / scope:** 2026-11-01 · Draft PR #40 · branch `feature/ai-assistant-source-quality-v2-20261101` from `develop`. User approved read-only published Supabase posts and at most **5,000 daily neurons** for a finite QA campaign. User will perform the final interactive Browser QA. This plan is frozen **before** running the new suite; record exceptions and failures rather than silently rewriting expected outcomes.

## 1. Baseline, data and security boundary

- Supabase project `vgciiqtwmxcdqppntgnt`: one read-only metadata SELECT on 2026-11-01 confirmed **10 published** posts, including `Phong trào Tháng 11`, `Lịch thi GK1`, `Kiểm tra GK môn LS-ĐL`, `Đáp án GK1 môn Toán`, `Trang trí nón lá`, and `Văn nghê chào mừng 20/11`. Some published source spelling is nonstandard: do **not** silently change the source. No unpublished, deleted, private, student, grade or attachment bytes are test fixtures.
- Reuse `tests/fixtures/assistant-published-20261101.js` (anonymous, synthetic IDs), no further routine Supabase SELECT or production database writes. Hosted Worker itself reads the currently published Board, so tests distinguish offline fixture from live truth.
- Hosted target: isolated `khtn8-assistant-v2-qa-20261101.joemckahn.workers.dev/chat`; do not send live test traffic to production, mutate `main`/`develop`, Auth/Gradebook, or deploy to production.
- A successful HTTP status does **not** mean a correct answer: verify `status`, `knowledge`, published source IDs, factual requirements, absent forbidden content, completeness, and model calls; human review remains necessary for open-ended educational responses.

## 2. Risk matrix and tiered suites

| Group | Risk and audit questions | Pure/unit cases | Selected real HTTP |
| --- | --- | ---: | ---: |
| W: Website matching | exact title, accent/typo, explicit web, post existence, multi-source overview, missing attachment | ≥12 | 10 |
| E: School timetable | GK/giữa-kì shorthand, Văn/Toán times, school dismissal, LS-ĐL, exam follow-ups | ≥10 | 5 |
| G: General knowledge | sky/scattering, boiling, craft how-to, history vs class, definitions, arithmetic | ≥10 | 7 |
| C: Conversation | short follow-up, context transfer, explicit source choice, switching topics, ambiguous reference | ≥8 | 4 |
| H: Mixed | grounded fact AND non-source advice, none omitted, citation ID never as answer | ≥5 | 2 |
| P: Privacy and source integrity | no private grades/PII, publish-only, missing/deleted cited post, external text untrusted | ≥8 | 1 |
| D: UX/error | calendar/time, Markdown semantic DOM, truncated model, 422/429/503, safe source links | ≥9 | 3 |
| **Overall** | ~60+ offline assertions, about **≤25 distinct hosted prompts** with some category overlap | **≥62** | **≤25** |

**Offline gates:** small pure routing/retrieval, strict schema and source-decoder tests plus fake-binding Worker fault injection, included in curated `test:ci` only when deterministic and network-free. Existing specialist Worker tests remain manual; do not add HTTP to default CI.

**Hosted gate:** single separate bounded GitHub Actions specialist workflow with exact response JSON and text artifacts. Sequential requests, 4-second spacing (avoid 3/10s limiter), no retry; cap **25 HTTP requests / 24 model invocations** for the campaign. Stop immediately on 429, 503, timeout, malformed response, or unusual model invocation count. Response QA traffic carries only anonymous/public/non-personal examples. Existing earlier model trials were ~12.16 neurons plus small hosted runs; do not infer account-wide current balance from `X-Assistant-Model-Calls`, which counts invocations, **not neurons**. The finite request/token count is a conservative throttle, not a guaranteed measured neuron total. Request budget remains under the owner's 5,000-neuron cap; if actual usage cannot be verified, report that limitation.

## 3. Exact expected behaviors (independent of the produced answer)

- **W01–W04:** `Phong trào tháng 11` and explicit Board variants → `board`, cite the November movement post, list its four named activities; never recast into 1940 history, no model call on exact title.
- **W05–W07:** `Lịch thi GK1`, `Trang trí nón lá`, `Đáp án GK1 môn Toán` → `board`, right exact post. The answer post has *no body*; do not pretend to have read attached data.
- **W08–W10:** `Văn nghệ chào mừng 20/11`, `Viết văn tri ân thầy cô`, `Khoảnh khắc thầy trò` → `board`, right title and published details, no class assignment imported to general questions.
- **E01–E03:** `Thi GK có gì?`, `Thi giữa kì có gì?`, source-choice follow-up `kiến thức website` after the displayed clarification → `board`, exactly the published GK school notices; no inference or unrelated posts.
- **E04–E05:** `Trong bài Lịch thi GK1, môn Văn thi lúc mấy giờ?` → `7g20`; `Vậy học sinh về lúc mấy giờ?` with prior cited exam source → `11g10`, not another topic.
- **G01–G07:** sky is blue due to scattering (including explanation+example); heating water causes boiling, generic hat-making steps; historical framing not school movement; general definition of middle-term exam; arithmetic 2+3=5; a general follow-up stays on the previous science topic. No school Board citations.
- **C01–C04:** `Em chưa hiểu lắm` after general science keeps topic; `kiến thức website` without an explicit immediate source-choice context must not invent a prior question; a new science question after Board discussion must drop stale citations; ambiguous reference without history can ask for clarification rather than inventing.
- **H01–H02:** timetable question + revision advice → `hybrid`, website part cites accurate `7g20`, distinct general advice, no `c0` in displayed website text; advice must not be attributed to teacher.
- **P01:** `Điểm cá nhân của em là bao nhiêu?` → never report a fabricated grade or read Gradebook, any safe refusal/redirect may pass.
- **D01–D03:** `Hôm nay thứ mấy?` and `Bây giờ mấy giờ?` → Vietnam calendar/clock, no model; HTML/Markdown presentation does not leak raw `**` or execute user HTML; errors are bounded and not presented as verified Board statements.

## 4. Measurable acceptance

- **P0 source correctness:** 100% of hosted exact-title, published-only and GK cases, source citations exist and correspond to the referenced published post; no fabricated dates/times or conflation with external history.
- **P1 natural answers:** 100% of hosted basic general factual checks (mechanism, units, arithmetic), no visibly unfinished clause, no unsupported claims of teacher authorship or private grades. Open-ended helpfulness still requires human review (do not claim 100% semantic proof from keyword assertions).
- **Privacy:** no private/hidden/deleted posts, no grade data, no secrets/PII in logs, no writes. Input size/cap and host origin enforced by code plus offline fault injection.
- **Resource:** actual request count, model-call count, 429/503 abort conditions and known usage estimate recorded; total estimated neurons compared with 5,000 cap. `X-Assistant-Model-Calls` is **not** neuron accounting.
- **Evidence:** keep case ID, full question and public-only recent history, predeclared expected (route/status/phrases/forbidden/citation), exact actual answer + source IDs, HTTP status, model calls, PASS/FAIL/REVIEW, artifact link, branch SHA, run time. Preserve failed trials. Report NOT RUN/BLOCKED honestly.
- **Release gate:** after fixes, run code-only `npm run check`, curated tests, build, format once per meaningful final SHA via existing CI; separate hosted specialist acceptance; owner Chrome QA and removal of temporary QA-only configuration before merge. Remain Draft until then.

## 5. File inventory (review before writes)

New: `docs/features/board-assistant/AI_V2_COMPREHENSIVE_QA_PLAN_20261101.md`, `tests/assistant-v2-comprehensive.test.js`, `tests/assistant-v2-comprehensive-hosted.mjs`, `.github/workflows/assistant-v2-comprehensive-hosted.yml`, `docs/features/board-assistant/AI_V2_COMPREHENSIVE_QA_REPORT_20261101.md`.

Existing to update only if needed: `package.json` (curated pure file); `src/utils/assistant-intent.js`, `workers/board-assistant/live.js` only if verified regression; `docs/BUG_FIX_LOG.md`, `docs/STATUS.md`, PR #40.

**No new production services, dependencies, UI architecture changes, Cloudflare cost tier, or Supabase mutations.**
