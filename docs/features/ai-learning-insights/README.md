# AI Learning Insights — Gradebook student view

Scope: deterministic session-only insights from the student's previously verified, published semester grades. Independent of the Board chatbot and hosted AI experiments. No model/API calls.

## Requirements implemented

- Collapsed-by-default insight panel above the existing score table; smooth disclosure with reduced-motion styles.
- Three compact statistics with decorative SVG: recorded grade slots, subjects eligible for trend analysis, subjects trending upward.
- Eight subject cards with direction icons and a separate median summary. Direction is NOT calculated from the median.
- Four continuous assessments (Thường xuyên 1–4) plotted from known values only. Missing observations retain their slot and are not connected across gaps.
- Independent 1 tiết, Giữa kì, Cuối kì values; not included in the median/trend calculation.
- Selected-subject Vietnamese observation and supportive, practical study suggestion grounded in observed scores, median, sample count and trend; no generative text, prediction or classification.

## Technical contracts

- Uses existing B1 exact decimal validation; canonical score strings 0–10 with no more than five fractional digits.
- Per subject median of available Thường xuyên values. At least three distinct observed slots are needed for Theil–Sen median pairwise slope. Rising >= +0.25 score points/slot; falling <= -0.25; otherwise steady.
- Ordered slot labels are not verified dates. Trend is descriptive, not predictive.
- Unknown keys, extra private fields, duplicate coordinates and invalid values fail closed. No peer scores or identities are read.
- Modules: src/utils/gradebook-learning-insights.js (pure analysis), src/utils/gradebook-learning-feedback.js (bounded localized feedback), src/components/gradebook-learning-insights.js (semantic UI and SVG), src/components/student-gradeboard.js (lazy mount and invalidation), src/styles/gradebook.css (responsive CSS).
- Added finite offline cases in tests/student-gradeboard.test.js, already included in the curated test:ci allowlist.
- Does not change authorization, backend, database, API, CI policy, dependencies, or deploy settings.

## Acceptance boundary

Pure test, format and build checks require observed CI output to count as PASS. Browser, keyboard, device, and screenshot QA are NOT RUN until actually performed. Hosted API/Supabase requests during implementation: 0. Real student data and deployment: NOT RUN.

## Selected-subject feedback refinement (2026-10-29)

- The insight message now follows the selected subject, not the class-wide count summary. Every selection updates the heading, descriptive evidence and one practical study suggestion.
- Feedback cites the count of known TX observations, first and last actual observed TX index/value, and the median. A trend phrase is only shown when three or four observations exist.
- A rising pattern supports perseverance or developing existing habits; a falling pattern invites changing study technique and seeking help; a steady pattern suggests maintenance or concrete practice. Sparse/empty cases avoid direction claims. Advice is optional guidance, not an educational diagnosis.
- Labels/messages are written in natural student-facing Vietnamese; no names or IDs are inferred, no peer data or remote model calls. Old Gradebook score-column labels remain unchanged.
- Finite offline regression cases cover rising/falling/steady, no/one/two scores, exact zero, malformed profiles and source confidentiality.

## Verification follow-up

The contextual-feedback change is limited to a pure suggestion helper, student panel text, responsive styling, synthetic tests, and this handoff note. The original Board/Gradebook access boundaries remain untouched. Validation uses existing strict B1 score/capability projection; 3+ own-score samples are required before directional advice. This heuristic does not establish causation, study habits, ability, or a future score. Suggestions are optional and can be discussed with a teacher.

## Weighted reference and opt-in class comparison (2026-10-29)

- New user-approved **reference** formula per subject and semester: (TX1+TX2+TX3+TX4+2×1 tiết+2×Giữa kì+3×Cuối kì)/11 when all slots are recorded. Missing entries never count as zero: divide by the sum of weights for present entries; numeric 0 is included.
- Uses *existing* capability-authenticated published-semester histogram operations. No additional endpoints, migrations, service changes or external ML are introduced.
- The class reference is the weighted mean of the per-column histogram averages for **exactly the same scored columns as the selected student's formula**; histogram buckets are rounded tenths. This is not the distribution or exact class mean of per-student weighted averages when different students are missing different columns.
- Comparison is opt-in **inside the existing subject-feedback panel**, with at most seven sequential aggregate reads for a single selected subject. No eager calls or automatic retry. On subject switch, semester switch, route exit or denial, the old request is aborted and its private result discarded.
- Do not compare at all if any requested aggregate has fewer than ten students with scores. Unequal group sizes or incomplete personal coverage are disclosed. A small ±0.3 reference-point buffer is treated as similar. Never show rank/Top, percentile or claims about academic ability.
- A descriptive observation and optional encouragement stay distinct from the class reference. A publication/auth/availability failure remains a neutral fail-closed UI result.
- Offline regression includes full eleven-weight formula, zero, missing data, exact code/semester/column matching, cohort size, and malformed/privacy-rich responses. Live backend calls and actual browser QA are NOT RUN.

## Existing pulse loader and read-state refinement (2026-10-29)

- Reuses the shared `PulseIndicator` and `setPendingMessage` inside the existing subject comparison section. The progress label reports completed columns out of the current plan (maximum seven) via a polite live status.
- Keeps the button disabled while a comparison is pending and marks its result region busy. A new subject/semester, route exit or publication denial cancels in-flight requests, clears loader/status and ignores any stale results.
- Shows friendly terminal states for unavailable, rate-limited, denied, expired, empty and insufficient class data. A transient unavailable state offers **manual** `Thử lại` only; no automatic retries or extra APIs.
- A per-subject operation uses the existing capability-authenticated histogram read sequentially and checks every aggregate's scope/cohort before fetching the next column. Synthetic offline tests cover progress, one-shot calls, cancellation, minimum cohort, no-scores, and fail-closed errors. No hosted API calls or browser QA were performed.
