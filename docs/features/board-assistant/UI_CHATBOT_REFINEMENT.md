# Board Assistant — responsive chatbot UI refinement

Branch: `feature/board-assistant-chatbot-ui`
Base: `ai-learning-assistant` at `34ce44eaf4109f2d0b943b4920b8b25b9df75e07`.

## Approved interface

- Compact green floating **Hỏi trợ lý** entry anchored at the bottom-right of the Board.
- Friendly lightweight robot avatar in the launcher, heading and assistant turns.
- Right-side desktop conversation panel, full-viewport mobile native dialog.
- Separated user/bot message bubbles, local time labels, scrollable conversation, compact cited resource cards.
- Published-title suggestion chips as input shortcuts (never fabricated questions or posts).
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

No permanent browser harness or new CI dependency is required for a presentation-only update.
Any unexecuted test must be reported NOT RUN rather than passed. Do not interpret the previous
MVP synthetic browser evidence as fresh UI acceptance for this branch.

## Files

- `src/components/board-assistant.js` — chatbot structure and UI interactions.
- `src/styles/board-assistant.css` — floating launcher, desktop panel, chat bubbles and mobile layout.
- `public/placeholders/assistant-avatar.png` — optimized 96×96 avatar derived from the approved illustration.

Keep the existing Worker and transport policy unchanged. No hosted test, deploy or merge is
authorized by this change.

## Execution evidence — 2026-10-29

- Branch was created from the exact accepted AI MVP HEAD; original parent branch is unchanged.
- Source edits and the owner-supplied PNG are committed directly on the feature branch.
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
- Changes are committed on the UI feature branch only. PRs are requested in sequence; no merge/deploy is authorized.
