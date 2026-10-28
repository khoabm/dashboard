# AI Learning Assistant — Checkpoints and release gates

**Current:** DOCUMENTATION ONLY (2026-10-28), baseline \`develop\` \`78f3c3208b21583545ff9ec0c58d875db2a688f4\`; branch \`feature/ai-learning-assistant\`. This plan does not authorize implementation, model download, browser QA, hosted Supabase, PR/merge or deploy.

## Gate map

| Gate | Objective | Entry condition | Exit evidence | Status |
| --- | --- | --- | --- | --- |
| AI-P00 — Design | Fix MVP/architecture/intents/privacy and owner constraints | Explicit Option A + docs authorization | README / DESIGN / POC_EVALUATION consistent and reviewable | DOCUMENTATION CREATED; REVIEW PENDING |
| AI-P01 — Feasibility | Test actual embedding model vs existing Search on Vietnamese Board fixtures | Separate permission to run a bounded PoC, verified model license/bytes, zero-cost plan | Frozen annotated query corpus, metrics, exact device/cold/warm/browser/bytes, failure cases, report | **NOT RUN** |
| AI-G01 — Go/no-go | Accept explicit model+runtime+asset delivery, quality/perf/cost | AI-P01 evidence | Owner ACCEPT/REVISE/STOP, approved dependency budget and CSP/source | **NOT APPROVED** |
| AI-P02 — Integration | Small chat drawer, isolated memory state, semantic retrieval and allowed Board actions | AI-G01 owner approval | Functional component tests, search/Board regression, screenshot/responsive/browser a11y evidence, reviewed diff | **NOT STARTED** |
| AI-G02 — Final review | Accept feature into \`develop\` through review | P02 checks pass | PR with exact diff, no Gradebook changes, explicit owner merge decision | **NOT STARTED** |

## MVP acceptance matrix for AI-P02 (future)

- [ ] Semantic retrieval uses **real pretrained embedding inference**; model output only ranks publicly visible Board IDs. Fallback is clearly non-AI.
- [ ] "Thí nghiệm có khí thoát ra" finds actual published matches without fabricated posts, and reports insufficient results accurately.
- [ ] "Chỉ video" keeps the last topic and filters by \`attachment.type='youtube'\`, not placeholders/thumbnails.
- [ ] "Mở bài thứ hai" uses valid ordered current result IDs, opens the existing card preview, rejects stale/unpublished/absent IDs.
- [ ] New conversation "Chỉ video" requests a topic instead of inventing context.
- [ ] "Đổi sang kết tủa", "Còn bài nào khác", "Xóa bộ lọc AI" manage state consistently; manual SearchBar remains independently usable and retains user preferences.
- [ ] Assistant results spanning sections are reachable on mobile; no first-section-only loss.
- [ ] A published post becoming hidden/deleted, moved/reordered or edited invalidates/revalidates search results; newer refreshes and old model promises cannot revive stale cards.
- [ ] Exact public-safe field allowlist; 0 draft/hidden/deleted/private metadata indexed, 0 Gradebook data or transcript persistence, 0 arbitrary writes or XSS.
- [ ] Lazy loading, cancel/unavailable/low-confidence/empty states, zero incremental paid service, no unexpected background model downloads.
- [ ] Keyboard-only open/send/filter/close, Escape + focus return, live response announcement, 44px touch targets, reduced motion, mobile keyboard/viewport safe behavior.
- [ ] Existing board navigation, reader/admin experiences, uploads/drafts and Gradebook routes are unchanged; tests remain scoped and offline first.
- [ ] UI/Bundled model runtime evidence reviewed: actual devices and mobile responsiveness, no undocumented network/CSP/dependency changes.
- [ ] No GitHub branch other than feature is edited; PR/merge requires separately authorized action.

## Recommended focused implementation sequence (not started)

1. Verify AI-P01 shortlist model eligibility and official license; freeze synthetic/public-safe corpus + labels; offline evaluation against \`matches()\` baseline.
2. Record quality/device/bytes/zero-cost evidence; get explicit **AI-G01** choice. If FAIL/BLOCKED, stop without feature code.
3. Introduce pure intent/slot state machine + security-filtered retriever adapter; test with fixed fixtures and no real inference.
4. Connect real approved embedding runtime behind lazy, cancellable loader, then add accessible drawer and results.
5. Integrate only via a narrow Board presentation adapter; maintain explicit manual/assistant switch and no shared search persistence.
6. Review accessibility/responsive, browser QA and preexisting regression inventory using smallest permitted suites. No hosted workload without separate authorization.
7. Submit Draft PR to \`develop\` if requested; no merge without owner decision. Stop at any cost/privacy/security regression.

## Required outcome report per checkpoint

\`branch / starting SHA / resulting SHA / changed paths / tests actually executed + counts / hosted requests/bytes / model license & runtime evidence / PASS|CHANGES REQUIRED|BLOCKED|NOT RUN / next authorized scope\`.

**Explicit exclusions:** no free-form LLM, generation of lessons/quizzes, PDF/YouTube extraction, teacher automation, Gradebook scores/identifiers, production DB change, cross-site analytics, cloud chat logs, secondary server or paid services. These require a new user decision and scope.

## Evidence update — 2026-10-28

**AI-P01 RETRIEVAL CHANGES REQUIRED / overall PARTIAL.** [One-shot successful execution 40727956898](https://github.com/khoabm/dashboard/actions/runs/40727956898) at `1a4e83a` ran actual pretrained multilingual E5 q8 on synthetic 30-query fixture; Precision@3 **67.78% < 80%** target; lexical baseline 12.22%; paraphrase Recall@3 65% vs 0%. Runner measured 118.3 MB ONNX + 17.1 MB tokenizer, ~3s initialization, ~3 ms p95 warm single-query inference. These are **runner-only**, with mobile/browser, full distribution cost, security/intent and live corpus **NOT RUN**. Original failed attempt 40727585269 is preserved. **AI-G01 NOT APPROVED; AI-P02 NOT STARTED**. See [POC_EVALUATION.md](POC_EVALUATION.md#actual-ai-p01-bounded-run--2026-10-28-supersedes-not-run-above). No deployment/merge.
