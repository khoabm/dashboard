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
