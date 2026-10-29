# UI acceptance execution — 2026-10-29

CP-A: clean source 989ec35e552310f8131906782a6d3b70927a1366 verified against fetched ai-learning-assistant. Task branch fix/board-assistant-ui-e2e-20261029. No merge, deployment or PR16 changes.

| Finding / severity | Hypothesis and inventory | Acceptance |
| --- | --- | --- |
| F01 medium | component performs preview before modal removal | real Chromium before/after focus and Escape; close assistant synchronously before handoff |
| F02 medium | mobile utilities always expanded, fixed header/composer exhaust short heights | CSS; six viewports plus short desktop; bounded composer, scrollable transcript, no overflow |
| F03 medium | meaningful disclosure/actions 10–11px | scoped CSS; readable 13px secondary content, 200% emulation and focus |
| F04 medium | disclosure captured at open, failure mutates separate flags | component; live status derived from availability, explicit opt-in, failure/reopen test |
| F05 high | lexical retrieval differs from substring Board search | utils/main; validated session-only source ID filter; multiword/paraphrase/empty/revocation tests |
| F06 medium | assistant mutations leave stale persisted query/topic | main; clear saved query/topic on temporary actions, preserve manual persistence; refresh/reset/topic tests |

CP-B inventory: component/CSS/main/utils, focused tests, this plan, BUG_FIX_LOG, UI_CHATBOT_REFINEMENT, STATUS. Additional Board data projection only if required; no Worker/Gradebook changes.
CP-C: npm ci if needed; check, curated test:ci, assistant pure tests, explicit transport/Worker specialists, build/exclusion and format once final; diff check. No CI trigger changes.
CP-D: isolated synthetic browser harness, block non-loopback traffic. Chromium pointer/keyboard, Tab/ShiftTab/Escape, Enter/ShiftEnter, suggestion no-send, tools/new/reset, preview handoff, cancellation/late results, cloud error, revoked sources. 360x640,390x844,667x375,768x1024,1024x768,1440x900 plus short desktop and 200% layout. Capture baseline/final screenshots and geometry in ignored tests/local. Desktop emulation does not establish iOS/physical keyboard acceptance.
CP-E: conditional only. Read-only account/Free/quota/Worker access and enforceable two-reservation cap required before any data-plane request. Reserve ledger before requests: POST<=3 (valid<=2 invalid<=1), OPTIONS<=2, BGE<=2, Qwen<=2, combined including DO<=12; deployment<=2. Stop without retry on uncertainty/error/quota mismatch. If activated, finally restore disabled/empty expiry/no allowance and verify config. If unavailable, BLOCKED with all counts zero; never infer entitlement from historical docs.
CP-F: review final diff, update evidence with actual counts, commit [CF-Pages-Skip], push, Draft PR to ai-learning-assistant. Source freshness checked before push. Risks: modal event races, mobile section selection, stale persisted manual debounce; targeted browser checks and source validation mitigate. PASS only for executed checks. No hosted Supabase, no added costs. V2 remains gated by unresolved acceptance.

## Execution results

CP-A completed: before Chromium preview close left BODY focused; at667×375 transcript22px and composer bottom434.25>375. Same synthetic reproduction after: launcher focused, transcript133px, composer bottom375. Paired screenshots under evidence/ui-20261029.
CP-B: F01 closes/removes assistant before handoff, guarded close ownership and explicit modal Tab wrapping. F02 secondary tools collapse on short screens and bounded expanded scrolling; expanded landscape transcript33px, controls reachable. F03 scoped meaningful secondary copy/actions13px, actions44px and visible button focus. F04 live status + consent text derives from current availability, failure disables cloud until page/component lifetime ends. F05 selected validated published IDs replace raw question search; empty ID selection shows empty Board, manual search remains substring. F06 temporary topic/filter/reset clears persisted keys, never stores question; manual search/topic persist normally; stale debounce ignored if input changed.
CP-C: Node24.19.0, retained locked dependencies; syntax/secret/diff check PASS; curated131/131 PASS; explicit pure+transport+Worker19/19 PASS; build/exclusions PASS with existing nonfatal chunk-size warning; format PASS. Initial checks ran once before final keyboard/race correction; final regression rerun justified by source changes. CI configuration unchanged, official Actions not triggered by this target.
CP-D: actual Chromium /usr/bin/chromium with environment Playwright core. Loopback-only request routing; non-loopback HTTP0. Six required viewports plus1024×375 and720×450 PASS geometry/keyboard preview matrix. Pointer/keyboard launcher, Enter/ShiftEnter, Tab/ShiftTab, Escape, tools/suggestions no-send/new conversation, preview focus, cloud failure/reopen, stop/close delayed failures, revoked-source action and unavailable storage PASS. Actual main.js with existing audit fixture PASS manual persistence/source filtering/reset/refresh/topic selection. Screenshots and geometry retained; browser drivers/harness in ignored tests/local/assistant-e2e. Text200% screenshot and half-size viewport approximate zoom/reflow; native browser200% zoom, mobile soft keyboard, physical devices/Safari NOT RUN. Detailed contrast measurement and automated accessibility audit NOT RUN. Published-only pure tests cover hidden/draft/deleted; mocks do not prove deployed authorization or model quality.
CP-E BLOCKED: no configured Cloudflare identity/credentials; current account/Free/quota cannot be verified. Source DO cap4 does not enforce task cap2. No activation attempted; no Worker changes. Ledger POST0/3(valid0/2,invalid0/1), OPTIONS0/2, BGE0/2,Qwen0/2,DO0,combined0/12,deployments0/2. Local checked-in config AI_ENABLED=false, empty PREVIEW_EXPIRES; live disabled state NOT independently verified. No rollback needed because no activation occurred. Supabase hosted calls0.
CP-F: GitHub API returns Forbidden through platform proxy even with approved execution; Git HTTPS read works. Push and PR receipts recorded in final delivery; never infer API authorization from Git. No merge/deploy/PR16 edits. UI/UX Pro Max was not available in supplied skills or checkout; existing repository tokens/conventions used. Partial acceptance only; do not infer V2 readiness or live Qwen quality.

### Reproduce browser acceptance

Maintained synthetic entry: tests/board-assistant-ui.html + board-assistant-ui.js.
Explicit driver outside CI: tests/board-assistant-browser.cjs. Start Vite, then run
`PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/board-assistant-browser.cjs`
from checkout root with Chromium at /usr/bin/chromium. Playwright is environment tooling,
not a project dependency. Outputs go to ignored tests/local/assistant-e2e (create this directory
before a fresh run). Eight-viewport script revalidated after retaining maintained fixture paths.
Additional actual-main persistence and storage/revocation probes remain in ignored task artifacts;
the six pure assistant tests are committed in tests/board-assistant.test.js.
