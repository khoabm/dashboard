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
were inspected. The avatar is the owner-supplied PNG stored unchanged; checksum SHA-256 `927cdd151837d4b1497a812402f3b020058382e5a2569812736af6d977c28656`. CSS only scales its rendering.

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
- `public/placeholders/assistant-avatar.png` — original owner-supplied 51×61 RGBA avatar (byte-for-byte).

Keep the existing Worker and transport policy unchanged. No hosted test, deploy or merge is
authorized by this change.
