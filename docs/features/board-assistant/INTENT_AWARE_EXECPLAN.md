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

## Implementation record — source checkpoint 2026-10-31

- Branch created from exact develop base, commits through `39cc736e6a`
  (documentation receipt will advance the SHA). Draft PR #37 targets develop.
- Pure route `src/utils/assistant-intent.js`; conditionally read Board only for
  BOARD/HYBRID; general path calls Qwen directly without Supabase/BGE; uncertain
  classification uses Qwen without Board text and fails closed to clarification.
- Live UI labels show Board, general or mixed origin; no authenticated or Gradebook
  state is read. Worker still uses published-only public REST projection, native
  Cloudflare rate limit and one-shot inference. No paid service/binding changes.
- Offline CI #41172224963 at `a4d242a`: 186 curated unit PASS, check,
  production build and Prettier PASS. New browser fixture/manual specialist
  tests added later; rerun/latest receipt to be checked.
- Source-test inventory: `tests/assistant-intent.test.js` curated pure;
  `tests/assistant-live.test.js` manual fake-binding Worker specialist;
  `tests/assistant-intent-browser.cjs` and
  `tests/assistant-live-ui.html`/JS manual Chrome fixture, localhost only,
  `tests/local/ai-intent-ui` for ignored screenshots. No external traffic
  permitted in browser script. **Manual specialist/browser NOT RUN** in
  current Chat connector execution, hosted inference/real Supabase 0.
- Owner gate: verify specialist + interactive desktop/mobile browser/real
  response quality in Work Cloud Browser before promoting this Draft PR.
  Do not merge/deploy until evidence supports completion.


## Owner QA findings / correction 2026-10-31

- TC-02 FAIL: general answer ended mid-clause and omitted a requested example.
- TC-06 FAIL: website question and general study advice were blended; exam hour
  was skipped, and entire message received a website-only label.
- TC-09 fixture includes multiple independent topics within one published note
  (Toán GK1 at 9g20/60 min, study guidance, rotating cleaning duties); a 1000-char
  passage can include more than one topic, so semantic match is insufficient as
  proof that a specific clause is supported.
- Confirmed the actual Cloudflare Worker currently serving chat last deployed
  2026-10-29, before PR #37; the owner's Pages preview used new frontend but
  OLD model-routing server. No test currently proves new hosted intent behavior.
- Fix added to source: strict structured model output, hybrid two-field contract,
  deterministic requested-exam-time check against cited public passages, limited
  model answer acceptance, and regression tests. Bounded error instead of
  fabricating complete answers; no automatic retry.
- Follow-up: manual specialist tests, browser QA with isolated test Worker, and
  free-quota-bounded hosted validation (separate approval per AGENTS), not performed.


## Owner follow-up QA — natural craft how-to + collapsed sources (2026-10-31)

Confirmed from the owner's supplied browser screenshot and responses:
- A generic how-to question about designing a conical hat was answered with Board-specific class assignments and shopping steps: wrong source choice. Generic how-to should default to GENERAL, even when a published post has a matching topic; an explicit "theo bài đăng/cô đăng" request remains BOARD.
- The Owner sees source-origin notes after every live answer and large multiple source cards by default. The requested UI is *no visible origin status note*, and one accessible source collection per answer, collapsed by default, with smooth expand/collapse and reduced-motion accessibility.
- The old publicly deployed Worker still predates PR #37; observed online behavior must not be misrepresented as an evaluation of new intent logic.

Focused matrix before edit:

| Concern | Evidence target | Allowed environment |
| --- | --- | --- |
| Generic how-to vs explicit Board how-to vs hybrid Board + natural explanation, even when prior history has Board sources | Parameterized pure router tests, no network | Curated CI |
| General path never reads Supabase or invokes BGE | Additional fake-binding Worker specialist fixture | Manual offline; NOT RUN unless directly executed |
| Hide ordinary general/Board origin note but retain honest hybrid response split | Source view DOM inspection / manual Chrome fixture | Browser manual; NOT RUN until browser access |
| Two+ related post cards under one collapsed toggle, accessible keyboard/focus, no unwanted source action until deliberate expand | Synthetic Chromium browser scenario at 390 and 1280, zero external traffic; reduced motion | Manual offline; NOT RUN until runnable environment |
| No effects on routes, Gradebook/Auth/RLS, no new dependencies, no broken output | Existing GitHub CI syntax, curated unit, build, format | GitHub Actions on changed HEAD |

Inventory: `src/utils/assistant-intent.js`, `src/components/board-assistant.js`, `src/styles/board-assistant.css`, `tests/assistant-intent.test.js`, `tests/assistant-live.test.js`, `tests/assistant-intent-browser.cjs`, `docs/features/board-assistant/INTENT_AWARE_EXECPLAN.md`, `docs/BUG_FIX_LOG.md`, `docs/STATUS.md`. No new service/dependency/API/DB, no production Worker publish or authorized hosted QA traffic.
