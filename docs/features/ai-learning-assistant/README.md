# AI Learning Assistant V1 — Entry point

**State: DESIGN APPROVED / DOCUMENTATION ONLY. AI-P01 NOT RUN, AI-P02 NOT STARTED.**
**Baseline:** \`khoabm/dashboard\`, \`develop\` at \`78f3c3208b21583545ff9ec0c58d875db2a688f4\` (2026-10-28).
**Working branch:** \`feature/ai-learning-assistant\`. No source implementation, browser PoC, dependencies, hosted queries, deployment, PR or merge are authorized by this documentation task.

## Product goal and explicit decisions

Make the existing public **Bảng học liệu KHTN8** searchable and navigable through a **limited conversational AI assistant**, not a free-form tutor or replacement SearchBar.

An example: "Thí nghiệm có khí thoát ra" -> semantic retrieval of eligible published posts -> a response grounded in actual post titles/short bodies -> result cards and a visible Board filter. "Chỉ video" retains the topic while filtering to YouTube attachments; "Mở bài thứ hai" opens the second result in the current verified list. User can cancel AI filtering and resume normal Board navigation.

**AI boundary:** a genuinely pretrained multilingual/VI embedding model handles semantic retrieval. Intent/slot handling, conversational context and safe Board actions are deterministic and scoped. Fixed/structured grounded responses are not presented as generative LLM output. AI-P01 must demonstrate quality over existing \`matches()\` substring search; otherwise no "AI PASS" and no AI-P02.

**Agreed constraints:** zero incremental cost; static Vanilla JS/HTML/CSS/Vite; Supabase Free remains source of Board data; no new paid API/backend/schema/Edge, admin capabilities, accounts, learner login, chat persistence, or Gradebook data. No new library/model/runtime/CDN dependency without a measured PoC and explicit owner approval. This is an **additive extension** to the 28-group Board specification, not a claim that an AI feature already exists.

## Authoritative read path

1. Root \`AGENTS.md\`, \`docs/OVERVIEW.md\`, \`docs/STATUS.md\`, \`docs/ARCHITECTURE.md\`, \`docs/ROADMAP.md\`.
2. This \`README.md\`, [DESIGN](DESIGN.md) for architecture/UI/behavior, [POC_EVALUATION](POC_EVALUATION.md) for objective AI and zero-cost feasibility, [CHECKPOINTS](CHECKPOINTS.md) for gates/tasks.
3. Existing Board source only as needed: \`src/main.js\`, \`src/components/board.js\`, \`src/utils/validation.js\`, \`src/services/board.js\`, \`src/components/board-navigation.js\`. The Board's current URL/status/search behavior overrides example pseudo-interfaces in this design.

## Scope / not scope

| In V1 (pending feasibility) | Explicitly not in V1 |
| --- | --- |
| User-initiated lazy AI assistant drawer, accessible on desktop/mobile | Universal chatbot or unconstrained advice |
| Semantic matching over published Board metadata only | Indexing/searching private, draft, hidden, deleted posts |
| Multi-turn topic/resource-type follow-ups; deterministic actions | Editing, posting, deleting, publishing, login, data export |
| Show relevant cards, source title and reason; open selected post via existing preview | Invented source citations, independent content generation |
| User-visible filters, clear/reset, safe search fallback | Reading raw PDF/DOCX/PPTX/YouTube contents without a new approved pipeline |
| Memory-only short conversational state | Cloud transcript, localStorage/IndexedDB chat or Gradebook/CCCD/DOB/scores |

## Success definition

Only progress to AI-P02 when the chosen actual pretrained model, Vietnamese evaluation set, cold/warm performance, licensing, download origin and full zero-cost budget are **measured and approved**. If no eligible model is acceptable, stop at AI-P01; preserve original SearchBar rather than shipping deterministic heuristics labeled "AI".

Document owners/decisions: [CHECKPOINTS](CHECKPOINTS.md). This feature is intentionally isolated from Personal Gradebook G07/G08 technical and real-data gates.

## AI-P01 actual result (2026-10-28)

A bounded specialist PoC successfully ran `Xenova/multilingual-e5-small` pretrained q8 in a GitHub Ubuntu CPU runner with 30 synthetic Vietnamese queries; AI retrieval Precision@3 **67.78%**, vs existing substring search baseline **12.22%**. The >=80% acceptance threshold **was not met**. Browser/mobile/network costs and multi-turn actions remain untested. [Evidence and limitations](POC_EVALUATION.md#actual-ai-p01-bounded-run--2026-10-28-supersedes-not-run-above). **AI-P01 PARTIAL / CHANGES REQUIRED; AI-G01 not approved; AI-P02 not started.** The design-only statement above is historical and no application/UI/library integration has been made.
