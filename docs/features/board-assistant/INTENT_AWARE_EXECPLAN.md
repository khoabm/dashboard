# AI-IA01 — Intent-aware conversational routing (2026-10-31)

Baseline: `develop` at `b6f340559f0364a2406e778142936fdbd1b47790`.
Working branch: `feature/ai-assistant-intent-aware-chat-20261031`. Owner approved isolated implementation, E2E tests and final owner QA. Do not merge or deploy production without a separate release decision. Zero new paid services or packages.

## Outcome
Prioritize a natural Vietnamese dialogue over accidental post matches. Use public Board only when the user explicitly asks about website information, follows a verified Board topic, or a bounded AI ambiguity decision determines Board grounding. General science knowledge must not trigger a Board read or BGE inference. Hybrid answers must distinguish cited Board facts from general explanations.

## Pre-edit matrix and inventory
| Concern | Focused proof | Execution scope |
| --- | --- | --- |
| Ambiguous/general/Board/hybrid/follow-up routing; new topic; no misleading title keyword | Pure parameterized intent tests | CI-safe |
| Bounded protocol and public-only provenance; no private fields; no fabricated source | Existing injected Worker specialists plus focused additions | Manual offline, not CI |
| General questions have zero Supabase/BGE reads; Board questions use fresh published projection; no source does not become ungrounded Board claim | Injected Worker model/network fakes | Manual offline, not CI |
| Cancel/429/503/retry quota, no stale source links, normal keyword fallback | Existing browser/transport fault fixtures | Manual offline |
| Mobile/keyboard/source labels/clear conversation | Chrome synthetic Board UI, 390px + desktop; Safari/native separately untested | Browser manual |
| Syntax/format/build/exclusions and regression | Existing GitHub Offline CI and narrow tests | After implementation |
| Real hosted AI latency, provider quota, quality or live data | Explicit per-activity budget and approval required by AGENTS | BLOCKED pending scoped hosted authorization |

Planned merge inventory: `src/utils/assistant-intent.js` (pure route), `workers/board-assistant/live.js` (route before retrieval, bounded Qwen), `src/services/board-assistant.js` and `src/components/board-assistant.js` (truthful source labels), `tests/assistant-intent.test.js` (pure), `tests/assistant-live.test.js` (manual specialist), `package.json` (include only pure intent tests in curated CI), and short source docs / bug log. No Auth, Gradebook, migrations, Supabase schema/RLS/API, existing Cloudflare runtime binding or frontend framework change.
