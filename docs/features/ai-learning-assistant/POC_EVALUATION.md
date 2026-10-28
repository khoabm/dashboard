# AI-P01 — Semantic retrieval feasibility and evaluation protocol

**Status: PLANNED / NOT RUN.** This is a measurable, explicitly bounded PoC specification, not test evidence. Do not build AI-P02 from a model demo with only cherry-picked examples.

## 1. Questions the PoC must answer

1. Can an actual pretrained Vietnamese/multilingual embedding model retrieve **public published** KHTN8 posts beyond the current substring \`matches()\` baseline?
2. Do Vietnamese accent variations/paraphrases ("khí thoát ra"/"sủi bọt", "kết tủa"/"chất rắn xuất hiện") rank the right **ground-truth** resources? Are scientific terms mishandled?
3. Does the model run acceptably on target Windows/Android/mobile browsers with a **cold** first download and **warm** follow-up query, including disabled network / unsupported runtime?
4. Are real license, source, exact model/version/runtime dependencies, CDN transfer, model size, cache lifetime, CSP and total 0 USD operational assumptions acceptable?
5. Can a deterministic intent + memory state machine safely perform multi-turn commands independent of model and database changes?

## 2. Candidate selection (no selection yet)

Shortlist one small pretrained Vietnamese or multilingual *sentence embedding* model and, only if justified, one alternate; inspect publisher license/model card and supported browser inference formats (e.g., ONNX / WebAssembly). A model name, library or CDN is **not approved** until verified. Prefer a cached/static model under a proven no-cost delivery path rather than runtime calls to a paid inference service.

Measure exact files, weight bytes, runtime bytes, download/transformation overhead and dynamic requests. Include the time to first useful answer and impact on the existing Vite bundle. Proposed stop condition: any paid account, card, non-permitted network telemetry, unapproved CSP, browser-incompatible inference, memory crashes or unacceptable model delivery => **BLOCKED**, not "use an API temporarily".

## 3. Corpus and trusted relevance labels

- Build a **bounded, redacted local fixture** from representative published \`section.title\`, \`section.description\`, \`post.title\`, \`post.body\` and **attachment types only**. Do not query hosted Supabase without separate capped authorization. Use synthetic posts when source material is insufficient; mark synthetic vs real public metadata separately.
- Corpus should cover gas evolution, precipitates, chemical change, physics/biology themes, videos vs PDFs and plausible **hard negatives** (e.g., gas-law lesson vs experiment producing gas). Include a post whose title has no query keywords but body/meaning are relevant.
- Human-label ground truth per query: relevant post IDs, borderline cases, non-relevant distractors. Freeze fixture, relevance judgments, model version and query set before running; neither model nor tests may generate their own grading labels.
- Proposed minimum **30 varied queries**: direct phrase, paraphrase, omitted diacritics, typo, abbreviated Vietnamese, multi-topic collision, vague command and out-of-corpus. Use more than one relevant post where possible. Report size and sampling bias.
- Data privacy gate: any selected real public metadata must be published-only, no private/draft/hidden/deleted or child identifiers; no actual upload/file bytes, no untrusted script rendering. If insufficient labeled data, verdict **INCONCLUSIVE**, not PASS.

## 4. Metrics and objective gates (PROPOSED)

| Concern | Proposed acceptance target | Evidence / caveat |
| --- | --- | --- |
| Retrieval Precision@3 | >=80% overall over frozen labeled queries with sufficient relevant targets | Compute as relevant results among up to 3 returned slots; explicitly define empty result treatment and relevant-count normalization; report per-category |
| Better than old Search | Semantic model must improve recall/Precision for *paraphrased non-keyword* subset relative to \`matches()\` | Compare same exact corpus; no "AI value" if results merely mirror substring matches |
| Multi-turn state/action | >=90% correct finite test cases; **100%** for forbidden writes/stale/unpublished opens | Include "chỉ video", topic changes, 2nd result, reset, no previous topic, missing result |
| Grounding | 0 invented post titles/URLs or unsupported claims across acceptance set | Model supplies only ranks/IDs; fixed response templates |
| Warm inference | Target <2 seconds/query on chosen representative machine | Measure p50/p95 and per-device; no promise for all clients |
| Cold loading | Must be reported: size MB, requests, download time, first inference | No fixed approval threshold until owner sees measured tradeoff |
| Device support | Current project target desktop + common mobile, keyboard accessible; fail gracefully | Actual target/browser matrix to be approved; WebGPU optional, CPU/WASM fallback measured |
| Incremental cost | $0 of paid inference/hosting/services; **no purchase/trial** | Verify delivery quotas/license and actual model distribution strategy; zero cost != zero bandwidth |
| Regression | Existing SearchBar and Board navigation unaffected | AI-P02 later tests; AI-P01 mock/fixture only |

**Metric interpretation:** Precision@3 alone is weak if very few relevant documents exist; also provide Recall@3, MRR, zero-result accuracy, false-positive examples and confidence calibration. A similarity threshold must be selected from evaluation evidence, **not hard-coded as universally valid**.

## 5. Explicit test matrix (future scope)

| Area | Examples to test | Expected behavior |
| --- | --- | --- |
| Vietnamese | "Thí nghiệm có khí thoát ra" vs "Hiện tượng sủi bọt khi cho hóa chất vào nhau" | Semantically consistent top results when labels support |
| Type follow-up | "Chỉ video"; "Đổi sang PDF" | Same topic, true attachment-type filter |
| Result action | "Mở bài thứ hai" after 2 matches; after update/unpublish | Opens only current published ID; stale result refuses safely |
| Context | New session "Chỉ video" | Asks which topic; does not invent prior state |
| Board sync | User types SearchBar after AI active; changes tab; refresh | Explicit switch or reset; no persisted query/selected mutation |
| Privacy | Draft/hidden/deleted/archived and admin-scope posts present in fixture | 0 indexed/replied/opened |
| Unexpected input | XSS-looking strings; "xóa hết bài"; ambiguous "mở nó" | Render as text; no write/admin action; clarify |
| Failure | Offline cold start, failed CDN, blocked WASM/WebGPU, low memory | Transparent AI unavailable; standard Search remains |
| Lifecycle | Navigate to Gradebook while inference in flight | Cancel/drop result and clear assistant session; no leaked state |

## 6. Execution and cost protocol (AFTER separate approval)

- Begin only from isolated \`feature/ai-learning-assistant\` at a recorded SHA; review source/fixtures and exact asset model sizes. No auto selection of package/CDN.
- Perform first pass with static fixture and locally available tools; target zero hosted Supabase/Drive/API requests. No live SQL, Auth, real data or student records.
- Cap *model download*, browser sessions, devices, attempts and time in the eventual approved PoC plan; no stress/load/soak or repeated benchmark loops. First record any blocker; do not auto-retry failed runtime/cost outcomes.
- Report each evaluated query group, accuracy table, cold/warm measurements and user/device environment; avoid raw personal query logging. Note all untested browsers as NOT RUN.
- Do **not** install new libraries/models into the production code or change CSP until owner reviews this P01 evidence and accepts the chosen model/dependencies.
- Any release-site or cloud inference evaluation needs separately approved exact endpoints, network requests/byte budget and stop conditions per project \`AGENTS.md\`.

## 7. Decision template

| Item | Result |
| --- | --- |
| Branch, SHA, fixture hash | NOT RUN |
| Candidate model/library/version/license | UNSELECTED |
| Published-only data and privacy | NOT RUN |
| Precision@3, Recall@3, MRR / baseline | NOT RUN |
| Intent/action accuracy and negative cases | NOT RUN |
| Download bytes, cold/warm time, RAM, device matrix | NOT RUN |
| Verified cost/CSP/network footprint | NOT RUN |
| Overall AI-P01 | **NOT RUN / NOT APPROVED** |
| Owner go/no-go for AI-P02 | **PENDING** |

If metrics fail or selected delivery cannot stay zero cost, stop. A low-risk lexical assistant may be a **separately labeled non-AI fallback**, not a relabeled successful PoC.
