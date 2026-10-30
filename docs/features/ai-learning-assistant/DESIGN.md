# AI Learning Assistant V1 — Design contract

**Status: PROPOSED IMPLEMENTATION DESIGN, NO CODE.** User chose **Option A**: a limited chatbot with real semantic retrieval plus controlled action execution. UX follows existing Board components and project UI/UX guidance; no visual overhaul or new framework.

## 1. Verified integration baseline vs proposals

| Verified at \`develop\` \`78f3c32\` | Proposed future addition (NOT IMPLEMENTED) |
| --- | --- |
| \`src/main.js\` owns \`data.sections\`, \`data.posts\`, \`query\`, \`selected\`, \`filter\`; search is debounced (200ms), \`khtn8:query\` / \`khtn8:selected\` are persisted | Feature-local, memory-only assistant controller and transient result filter |
| \`src/components/board.js\` exports \`SearchBar\`, \`BoardContainer\`, \`PostCard\`, \`PostPreviewModal\` | Small accessible chat drawer and optional result highlighting/filtered Board view; no SearchBar redesign |
| \`src/utils/validation.js\` \`matches(post,section,query)\` compares accent-normalized concatenated fields by substring | AI embeddings scored separately; do not overwrite \`matches()\` or claim keyword matching is AI |
| \`src/services/board.js\` returns Board, sections, posts with attachment metadata | Reuse existing loaded Board snapshot; no new hosted fetch, Storage blob reading or search RPC |
| \`BoardContainer\` shows only \`published\` for public readers, with mobile single-section fallback | AI candidate allowlist and AI cross-section result mode must **not** be restricted to mobile's first section |
| Attachments can be \`image\`, \`document\`, \`link\`, \`youtube\`; \`placeholder_kind\` and \`thumbnail_url\` are preview hints | Media filter must use true attachment type; placeholder media may be explicitly tagged as demo and cannot be conflated with real assets |

**Integrity rule:** never allow retrieved/serialized model output to bypass permission-aware application data projection. Candidate list is derived from **current** \`status === 'published'\` rows and a public-safe section; exclude deleted/hidden/draft regardless of admin sign-in. Do not insert generated content as HTML or show any hidden metadata/attachment URLs.

## 2. Proposed functional architecture

\`\`\`text
User chat input (Vietnamese, <=300 chars)
    |
    v
Chat UI + Session Controller (memory, <=10 turns; dispose on route exit)
    |
    +-> Deterministic intent/slot parser (command allowlist)
    |      find | refine(type/section/topic) | open_result | reset | clarify | unsupported
    |
    +-> Semantic Retriever (lazy, pretrained VI/multilingual model)
    |      query embedding against approved published metadata index
    |      model/library/source selected only after AI-P01 PASS
    |
    v
Action Validator (live post IDs + publication status + snapshot revision)
    |
    +-> Render safe chat response grounded in existing titles/bodies
    +-> Apply explicit AI-only Board result-ID filter + visible filter chips
    +-> Open existing card preview through the current onOpen path
\`\`\`

**Separation of concerns:** the model retrieves meaning, not UI commands or authorization. It returns scores/IDs, **never arbitrary executable actions**. Intent state machine chooses an action from a fixed enum. The Board adapter validates candidate IDs against a fresh public projection. The response composer uses controlled templates with actual result counts/labels and discloses uncertainty.

Possible future files (not created now):
- \`src/features/ai-assistant/controller.js\` — session state, action validation, cancellation.
- \`src/features/ai-assistant/intent.js\` — pure command/slot parsing; follow-up and ambiguity rules.
- \`src/features/ai-assistant/retriever.js\` — lazy load/index/model adapter; test-injected, capped work.
- \`src/features/ai-assistant/chat.js\` — accessible drawer and grounded answer/result cards.
- Integration adapter at \`src/main.js\` / narrow optional \`BoardContainer\` result filter; feature-local styling, tests.

Names are suggestions, not a prerequisite to add abstractions or dependencies.

## 3. Intent + slot + state contracts

Proposed structured interpretation (illustrative, not an existing API):

\`\`\`js
{
  intent: "find" | "refine" | "open_result" | "reset" | "clarify" | "unsupported",
  slots: {
    topic: "phản ứng tạo khí" | null,
    resourceType: "youtube" | "document" | "image" | "link" | null,
    sectionId: null,
    resultOrdinal: null
  },
  ambiguity: false
}
\`\`\`

Working session (ephemeral, no transcript persistence):
- \`topicText\` (last explicit topic), \`sectionId\` (optional), \`resourceType\` (optional).
- \`resultIds\` ordered immutable array of current **published** post IDs, \`resultSnapshotVersion\` derived from current loaded Board data, \`selectedPostId\` if preview is open.
- \`conversationTurns\` bounded and sanitized; \`modelStatus\` (\`idle/loading/ready/unavailable\`); \`operationGeneration\` for stale-response cancellation; \`aiFilterActive\`.
- Limits proposed: 10 recent turns, 300 input characters, 5 visible results per batch. Evaluate memory and max post count in AI-P01; never store user input or results in localStorage, sessionStorage, IndexedDB or logs.

### Intent parsing priority

1. \`reset\`: "Xóa bộ lọc AI", "Tìm chủ đề khác từ đầu"; restore previous manual Board presentation.
2. \`open_result\`: "Mở bài thứ 2", "Xem kết quả đầu tiên". Requires a current, unambiguous ordered result list; if absent/stale -> clarify, **never** choose an arbitrary post.
3. \`refine\`: "Chỉ video", "Cho bài đọc", "Trong chủ đề X", "Còn bài nào khác?". Carry previous topic only when a valid prior conversation exists; otherwise ask for topic. Nonempty topic change resets pagination/result ordinals and reruns retrieval.
4. \`find\`: semantic topic query, optionally combined with resource type and section.
5. \`clarify/unsupported\`: ask one targeted question; do not fabricate success.

"Chỉ video" means \`attachments.some(a => a.type === 'youtube')\`, *not* \`thumbnail_url\`, image art, a YouTube-shaped title or \`placeholder_kind\`. Documents use actual document attachments. If demonstration placeholders must be searchable, label them as demo and verify published eligibility. If post has multiple attachments, define "video only" as **post contains >=1 YouTube attachment**, not a post exclusively containing videos.

## 4. Conversational scenarios (hypothetical, NOT current data)

| Turn | Input | Proposed safe result |
| --- | --- | --- |
| 1 | "Thí nghiệm có khí thoát ra" | \`find(topic)\` -> rank published posts; respond "Mình tìm thấy N học liệu có thể liên quan đến ...", show actual titled cards |
| 2 | "Chỉ lấy video thôi" | \`refine(resourceType=youtube)\` on same topic, recompute/validate results and update visible chip \`Video\` |
| 3 | "Mở bài thứ hai" | \`open_result(2)\` only if current ordered list has a still-published second ID; open via existing \`PostPreviewModal\` path |
| 4 | "Có tài liệu PDF không?" | Switch to \`resourceType=document\`, retain topic; if zero results, state none (do not invent a PDF) |
| 5 | "Chuyển sang kết tủa" | Replace topic, reset selected ordinal, preserve type only when clearly intended; otherwise show current filters for user correction |
| 6 | "Xóa bộ lọc" | Clear assistant filter/state; manual SearchBar \`query\` and section preference remain unchanged |

If "mở bài thứ hai" arrives after data refresh/reorder/status change, revalidate IDs and order against current results or ask the user to rerun, never silently open a stale or unpublished post. "Còn bài nào khác" requires a bounded next-page view of the same evaluated result set, not hidden/unpublished expansion.

**Grounding/response contract:** only cite post title, short body excerpt, section and attachment type from actual current public-safe metadata. Do not assert knowledge of PDF text, embedded videos or external links; never generate scientific explanations not in the available source. The response may say "Không đủ nội dung để tóm tắt bài này" instead of inventing an answer.

## 5. Search vs AI Board result state

Existing \`SearchBar\` state is a separate **manual mode**. AI must not write \`khtn8:query\`, \`khtn8:selected\` or mutate its input silently.

Proposed Board presentation state: \`mode: manual | assistant\`, \`assistantResultIds\`, \`assistantFilterChips\`, \`manualSelectionSnapshot\` (only in memory). When assistant activates, show a visible banner "Đang xem kết quả từ trợ lý AI", result count, topic/type chips and one-tap "Xóa lọc AI". Manual SearchBar entry or manual section selection exits AI mode or offers explicit switch; do not silently combine two independent search contracts. On AI exit restore current manual \`query\` and \`selected\`.

**Mobile trap to address:** today \`renderBoard\` converts \`selected=all\` to the first section when viewport <=700px. An assistant result set may span many sections; AI mode must use a cross-section presentation (an assistant results list or explicit scoped BoardContainer behavior) instead of quietly discarding other sections. Preserve horizontal navigation and scroll focus rules. Results are linked to IDs, not DOM card positions.

When \`loadBoard()\` commits a newer snapshot, invalidate or recompute assistant results, including:
- post published->hidden/deleted, moved section, edited title/body/version/attachments;
- section deletion or renamed fields; type/media changes;
- changes to sort order and result ordinal.
A cheap in-memory snapshot generation + live ID/status/version/attachment validation is sufficient for design; **do not** build a persistent vector database, write SQL triggers or index protected media. On route leave, sign-out, page lifecycle cancellation or model-loading race, clear private/transient state and close the drawer; stale promises cannot restore old filters.

## 6. Accessible UI/UX contract

- One **optional** clearly labeled "Trợ lý học liệu AI" opener in the Board view, not Gradebook; do not interfere with current header Search, tabs, admin tools or editor/draft controls.
- Desktop: bounded-width side drawer/overlay. Mobile <=700px: near-fullscreen sheet with safe viewport height, sticky header/input and content scroll. Adopt existing Board typography/colors, spacing, \`openDialog\`, PulseIndicator/feedback patterns where appropriate; no new design system.
- Opening moves focus to heading/input; Escape/close returns focus to opener; tab order and background inert/aria-modal behavior are explicit. Ctrl/Enter is **not** assumed. Enter sends when appropriate, Shift+Enter adds newline if using textarea. Min 44px touch controls; no keyboard trap.
- \`role=log\` or equivalent announced new-response region with restrained \`aria-live=polite\`, avoiding reading full lists repeatedly; loading/error/empty/unavailable text visible. Suppress duplicate announcements.
- Chips visibly show what the assistant changed, can be removed by keyboard, and do not rely only on color. Results show actual title/type, safe source label and optional "Mở"; highlight on Board without layout shifts. Reduced-motion, mobile keyboard avoidance, long Vietnamese wrapping, focus visibility.
- Consent/expectation: first use explicitly notes "AI dùng để tìm học liệu; không phải chatbot trả lời mọi kiến thức", model may need a download and can be unavailable offline. Provide cancel/stop. Original SearchBar remains fully usable and is a first-class fallback.

UI guidance applies to design only; actual browser/screen-reader behavior remains **NOT RUN**.

## 7. Security, privacy, resource and cost boundaries

1. No AI interaction with Gradebook or student information (CCCD/DOB/scores). Only existing public Board data after \`published\` verification. Admin draft/hidden/deleted content must never enter the model index; title/body/section/attachment-type allowlist only. No raw Storage files or privileged URLs.
2. No external LLM/API requests with user prompts, transcript or Board metadata. If a model asset is downloaded from an allowed host, initial GET of **public model files** is a separate technical fact to verify; hosting/CDN requests may have provider logs. Zero **paid** inference is required, not a promise of zero network bytes.
3. Do not add \`transformers.js\`, ONNX runtimes, models, hosted CDN, new CSP origins, workers or service worker caches until AI-P01 measures and owner approves exact dependency/version/license/source/bytes/compatibility. Offline replay/caching subject to browser storage rules; no transcript cache.
4. Defend against untrusted post body and message prompt injection: Board text is retrieval data, **never instructions**; template replies via \`textContent\`. No arbitrary script, post edit, export, upload or navigation URL execution. Preview uses the existing validated Board action.
5. No automatic model downloads/extra Supabase calls on site load. Lazy only by user request; cap memory/CPU, cancel stale workloads. Stop on quota/cost uncertainty. Zero-cost proof requires measurement, not just "free tier" marketing.

## 8. Failure behavior / non-goals

- No model available/download fails/unsupported device/unsupported language -> label **AI unavailable**; keep native manual search. Never call pure keyword fallback an AI result.
- Low similarity/ambiguous intent -> say "Mình chưa tìm được học liệu đủ liên quan..." and ask refinement; show existing lexical Search separately.
- Zero published matches -> honest empty result and "Xóa lọc AI".
- No sound, animation spectacle, proactive notifications, voice, grading, analytics, quiz generation, personal student advice, PDF/YouTube transcript ingestion, live web search, or general-purpose tool calling in V1.

**No implementation or result is claimed by this contract.**
