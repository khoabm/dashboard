# Board Assistant — responsive chatbot UI refinement

Branch: `feature/board-assistant-chatbot-ui`
Base: `ai-learning-assistant` at `34ce44eaf4109f2d0b943b4920b8b25b9df75e07`.

## Approved interface

- Compact green floating **Hỏi trợ lý** entry anchored at the bottom-right of the Board.
- Friendly lightweight robot avatar in the launcher, heading and assistant turns.
- Right-side desktop conversation panel, full-viewport mobile native dialog.
- Separated user/bot message bubbles, local time labels, scrollable conversation, compact cited resource cards.
- Published-topic suggestion chips as input shortcuts (never fabricated questions or posts).
- Text-only composer with a dedicated send button. No microphone, attachment or file upload controls.
- Explicit cloud opt-in retains the existing disabled-by-default policy; keyword search still works without AI.
- User-driven open post, view topic, filter, reset and start-new-conversation actions.

## Boundaries

UI only: no changes to retrieval ranking, Cloudflare Worker, hosted activation, source quote validation,
authorization, Supabase, Gradebook, data persistence or pricing. The current public snapshot still
owns all content. The source-derived excerpt cards must never suggest that PDF/image/video bytes
were inspected. The original cropped avatar was replaced by an approved robot illustration from the UI design preview. The image is a 96×96 circular PNG with SHA-256 `be5c939488dd6cec8e010c769ff255b14849d4e139e43ac38311f0a0ad14166d`. It is not the 51×61 user screenshot.

## Verification matrix

| Concern | Expected check |
| --- | --- |
| Structural source | Fixed launcher; dialog header, transcript and composer; no file or mic affordance |
| Safety | Existing public-only projection and read-only action regression unchanged |
| Keyboard | Enter sends; Shift+Enter adds a line; Escape closes; trigger regains focus |
| Ownership | Closing, refresh, route exit, new conversation and aborted requests discard late results |
| Responsive | No horizontal panel/document overflow at 360, 390, 768, 1024 and 1440 px |
| Compact screen | Composer reachable at narrow and short viewport; transcript owns vertical scrolling |
| Accessibility | Named controls, visible focus, modal focus containment and reduced motion |
| CI | Syntax, existing curated tests, build/exclusion, scoped Prettier |
| Hosted calls | Not authorized for UI-only task; must remain 0 |

The existing GitHub Offline CI workflow is scoped to PRs targeting develop/main, so this feature PR does not trigger it automatically. No CI success should be inferred from its absence. A separate exact-commit verification is required before merge.
Any unexecuted test must be reported NOT RUN rather than passed. Do not interpret the previous
MVP synthetic browser evidence as fresh UI acceptance for this branch.

## Files

- `src/components/board-assistant.js` — chatbot structure and UI interactions.
- `src/styles/board-assistant.css` — floating launcher, desktop panel, chat bubbles and mobile layout.
- `public/placeholders/assistant-avatar.png` — optimized 96×96 avatar derived from the approved illustration.

Keep the existing Worker and transport policy unchanged. Hosted tests and deploy are out of scope; merge is permitted only after the requested current-commit CI gate passes.

## Execution evidence — 2026-10-29

- Branch was created from the exact accepted AI MVP HEAD; original parent branch is unchanged.
- Source edits and the approved, preview-derived robot avatar are committed directly on the feature branch.
- Earlier original-cropped-image evidence is superseded by the approved 96×96 design-avatar replacement above.
- Source static review: component parses in V8 after stripping module import/export declarations, CSS delimiter balance 0, fixed launcher, mobile fullscreen, existing cancellation and read-only source callbacks present. This is not the app build or runtime integration test.
- CI statuses on inspected commit: none. Node unit tests, Prettier and Vite build **NOT RUN** in the available GitHub-only workspace (no checked-out npm installation).
- Real browser interaction/responsive/accessibility QA **NOT RUN**. Consequently visual E2E acceptance is **PARTIAL**, not PASS; earlier MVP synthetic browser results predate this new UI.
- Hosted Worker/Supabase requests: **0**. No deploy, merge, schema/API/Worker edits or new test fixtures committed.
- Next acceptance: run scoped code format/check/build and an offline synthetic Chrome keyboard + 360/390/768/1024/1440/short-height matrix without hosted traffic; correct observed issues before final PASS.

## Follow-up — toolbar and avatar refinement (2026-10-29)

- **Focused UI implementation:** circular avatar replaces rectangular screenshot crop; the floating launcher integrates a round badge with the green pill instead of a separate square background.
- Three responsive shortcut cards with inline SVG icons and descriptive labels: **Cuộc trò chuyện mới** (resets memory-only chat), **Bộ lọc trang** (existing read-only reset) and **Gợi ý chủ đề** (focuses published-topic suggestions). No new packages.
- Suggestions now use distinct `sectionTitle` entries from the published-only assistant catalog, up to three; clicking fills the editor but does not send a request. This replaces the previous first-three-post-titles behavior.
- Existing chat transcript, exact citation source cards, cloud opt-in, cancellation and route cleanup remain unchanged except the avatar and toolbar presentation.
- Static JavaScript parse in V8 after removing module declarations **PASS**, CSS bracket-balance **PASS**, source-focused control/invariant checks **PASS**. This is *not* browser E2E or npm build verification.
- New Chrome browser viewport/keyboard QA, npm/Prettier/production build and exact-SHA CI: **NOT RUN** in this GitHub editing session. No authorization to call hosted Worker/Supabase; requests **0**. UI/E2E gate remains **PARTIAL**, not PASS.
- Changes are committed on the UI feature branch. PR #15 targets ai-learning-assistant; PR #16 is a separate downstream integration and is not included in this merge.

## Desktop reading-area refinement — 2026-10-29

Owner screenshot revealed that the desktop dialog reserved excessive vertical space for the toolbar,
optional topic chips and bottom launcher clearance. This is a presentation-only update:

- Desktop dialog now uses almost all viewport height (`100dvh - 24px`) with a 12px top/bottom
  inset and maximum 520px panel width; the scrolling transcript remains flex-owned.
- Nonessential **Công cụ & chủ đề** controls are collapsed by default on desktop and expandable
  with an explicit button (`aria-expanded` / `aria-controls`). Reset, new-chat and topic
  actions remain available without being altered. The toggle retains keyboard operation.
- Mobile at widths up to 700px continues to display the original toolbar and topic chips in
  its full-screen layout. Short desktop heights retain the existing compact viewport override.
- The composer, cited-source cards, cloud opt-in, avatar, read-only actions, request ownership,
  backend integrations and public content rules are untouched.
- Changed only `src/components/board-assistant.js`, `src/styles/board-assistant.css` and this document.
- Verified V8 JavaScript syntax after stripping module imports/exports **PASS**; CSS brace balance **PASS**;
  source assertions for expanded desktop and visible mobile tools **PASS**.
- Browser viewport/keyboard E2E and npm build/format/unit remain **NOT RUN** in this GitHub-only edit.
  Overall UI acceptance remains **PARTIAL** until runtime QA; hosted Supabase/Worker calls **0**.

## Final diff/CI gate review — 2026-10-29

- Compared `feature/board-assistant-chatbot-ui` against `ai-learning-assistant` at `34ce44eaf4109f2d0b943b4920b8b25b9df75e07`: 20 commits ahead, 0 behind; only the component, its stylesheet, the robot PNG, and this document differ.
- Verified no changes to Worker, Board service, Supabase, Gradebook, auth, migrations, package/lockfile or CI workflow.
- Reviewed the public-only projection and read-only action contracts as existing helpers, unchanged by this branch; the suggested topic labels now come from published `sectionTitle` values, not post titles or AI generation.
- Previous synthetic Board Assistant MVP acceptance belongs to the base and must not be misrepresented as runtime QA of this UI refinement.
- On reviewed HEAD `96d7a3b8241ac1c3db2b99d2cea9630a585d466c`, GitHub reported zero check runs. `.github/workflows/ci.yml` runs on PRs to develop/main, not to ai-learning-assistant. Exact-HEAD npm test/build/Prettier and browser E2E **NOT RUN** in this review.
- Gate: **NOT PASS — CI evidence missing**. Do not merge PR #15 until the requested CI gate is demonstrably successful on the final UI commit.

## F01–F06 corrective acceptance — 2026-10-29

Supersedes earlier UI NOT RUN statements only for the synthetic scope executed in
[execution plan/results](UI_FIX_EXECPLAN.md). Current corrections: synchronous preview focus
handoff/modal boundary wrapping; short-height collapsed utilities; readable secondary text;
state-derived live cloud disclosure; session-only validated source-ID filtering; clearing old
persisted filters on assistant navigation. Manual Board substring search remains unchanged.

Actual Chromium eight-viewport geometry/keyboard, cancellation, mock cloud failure, revocation
and production-main synthetic persistence checks PASS. Offline curated131/131 and explicit
assistant pure/transport/Worker19/19 PASS. Build/exclusions/check/format PASS. Paired
[before](evidence/ui-20261029/before-landscape.png) /
[after](evidence/ui-20261029/after-landscape.png) landscape screenshots are synthetic.
Cloudflare hosted pilot BLOCKED (unverifiable quota and insufficient lower hard cap), all
hosted counters0. No Supabase activity. Native200% zoom, iOS/Safari and soft keyboard NOT RUN.
This is partial acceptance, not FULLY E2E PASS; historical hosted evidence above is not replayed.

## V2 learning extension — 2026-10-29

Approved avatar/launcher/native desktop/mobile panel and F01–06 behavior retained. Natural answers
are safe DOM text with deterministic/AI/keyword labels, supporting resource cards and an AI fallibility
notice. [V2 acceptance](V2_ACCEPTANCE.md) records actual six-viewport Chromium and eight-viewport V1
regressions, measured meaningful-text contrast and remaining native-device/zoom limits. No new
visual system, framework, hosted content or public deployment. Synthetic acceptance does not prove
live Qwen quality; hosted gate remains BLOCKED.
