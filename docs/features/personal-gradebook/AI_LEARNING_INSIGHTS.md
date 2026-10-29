# AI Learning Insights — implementation handoff

The canonical implementation scope, heuristic, module map and acceptance limitations are maintained at [AI Learning Insights](../ai-learning-insights/README.md).

**Feature branch:** feature/ai-learning-insights. The feature is a local Gradebook student analysis module, not a hosted AI provider or the Board Learning Assistant.

**Owner review boundary:** Existing student authentication and authorization must remain authoritative. The insight panel only uses already verified and published semester own-grade rows. Do not deploy or import real student data based on unit-test or CI results alone.

**Release state:** Code and offline CI checks are evaluated on the branch's current commit. Browser/mobile keyboard, disclosure animation, and accessibility QA must be recorded separately and remain NOT RUN unless independently exercised.
