# AI Learning Insights — local student Gradebook analysis

**Branch:** `feature/ai-learning-insights`. **Status:** implemented in isolated source; offline unit tests and browser visual QA NOT RUN in this session.

## Scope
- Read-only, private-session insight panels after successful published-semester `grades` response.
- Reuse `ownGrades` DTO validation. No Supabase/Edge/API calls beyond the Gradebook's existing authorized score read.
- No prediction, academic grade weighting, ranking, peer identifiers, persistent logs, analytics/telemetry, extra dependencies or model download.
- Does not share implementation, branch or readiness gates with AI-P01 Learning Assistant semantic search.

## Explainable local model
- Extract four correctly named continuous assessment columns for each of eight approved subjects from the validated catalog; missing assessments remain missing.
- Show median of available own continuous-assessment scores as a descriptive statistic, **not** an official average.
- If at least 3 continuous-assessment values exist, compute Theil–Sen median pairwise slope against their fixed assessment column indices. Classify slope >= 0.25 as rising, <= -0.25 as falling, otherwise steady. Threshold is a product heuristic, not a scientifically trained classifier.
- Less than 3 data points yields insufficient evidence; raw zero is valid.
- A score column index is *not* a timestamp. Avoid extrapolation, personalized conclusions, comparison with others or guaranteed learning improvement.
- A score read failure, semester change, route disposal or histogram access denial clears private insights. No extra API or Storage read is performed.

## Source boundaries
- `src/utils/gradebook-learning-insights.js` — pure model, exact score contract, no DOM or I/O.
- `src/components/student-learning-insights.js` — accessible text-first presentation.
- `src/components/student-gradeboard.js` — lifecycle integration; only receives already authorized own-score DTO.
- `src/styles/gradebook.css` — scoped responsive cards using existing Gradebook palette.
- `tests/gradebook-learning-insights.test.js` — synthetic pure offline cases, independent of hosted services.

## Verification and acceptance
- Source files committed to feature branch only; no production/Supabase changes, deployment or merge.
- Offline test command (not executed here): `node --test tests/gradebook-learning-insights.test.js`.
- Existing relevant regression (not executed here): `node --test tests/student-gradeboard.test.js`.
- Format, build and browser QA at 360/390/768/1440 px, keyboard focus and screen-reader checks remain **NOT RUN**; they are required before any UI PASS or merge. Tests cannot be marked PASS from code inspection alone.
- Real-world pedagogical validation and suitability of heuristic thresholds require owner/educator review. No production AI model is claimed.
