# CP05 UI Refinement V2 — Chart & Date Picker

**Branch:** `feature/personal-gradebook-ui-refinement`
**Starting HEAD:** `75590c16a3d5a4ccdcfc6377106f93e23e66c4b2`
**PR:** [#7, Draft → feature/personal-gradebook](https://github.com/khoabm/dashboard/pull/7)
**Status:** implementation candidate for user visual review; **NOT visually accepted**. No merge/deployment authorized.

## Scope and change inventory

The earlier HTML/CSS chart candidate and no-library decision are superseded by this explicitly authorized V2 evaluation. Existing CP02–CP05 data/security requirements remain unchanged. Only student-facing chart/calendar components, feature-local styles, pure helpers/tests, pinned dependency/notices and relevant docs change. Board home, shared header/navigation, CP03/CP04, backend/SQL/Edge and production fail-closed adapters are untouched.

| Concern | Implementation / verification |
| --- | --- |
| Chart quality and exact data | Lazy modular ECharts SVG; all101 ordered aggregates retained; integer Y-axis/grid, tooltip and personal color; pure options tests + browser0/1/23/1000 |
| Accessibility and navigation | Native range is one Tab stop for all101 levels; Arrow/Home/End announce exact level/count; normal Tab exit, return-to-personal action, Escape/focus restore; browser |
| Dates and input ownership | Feature-local Gregorian calendar, manual field is the selected value; B1 strict validation/Vietnam reference day; pure leap/boundary cases + browser |
| Lifecycle and privacy | Read generations fence late module/read results; chart/ResizeObserver disposal; date listeners/navigation state cleared on reset/expiry/401/exit; browser synthetic fault injection |
| Responsive layout | Contained table, near-full-height chart sheet and mobile calendar sheet; Chrome iframe widths360/390/768/1024/1440; not physical-device/Safari evidence |
| Delivery boundaries | Existing curated CI policy retained; tests fixture excluded from build; no hosted request or backend integration acceptance |

## Chart architecture and library decision

[Apache ECharts](https://echarts.apache.org/) **6.0.0**, exact npm dependency, Apache-2.0, is suitable for Vanilla JS and provides a polished numeric axis, aggregate-only tooltip, SVG rendering and navigable X-axis without a general UI framework. [Official modular imports](https://echarts.apache.org/handbook/en/basics/import/) are used: core, BarChart, Grid, Tooltip, DataZoom, Aria and SVGRenderer. Local bundling only, no runtime CDN. Transitive zrender6.0.0 is BSD-3-Clause; tslib2.3.0 is0BSD. Required upstream notices/licenses are included in the existing public notice asset; no unrelated package upgraded.

`student-gradeboard.js` loads `student-chart.js` dynamically only after an on-demand histogram response. `student-chart.js` owns the ECharts instance, resize observer, exact-level range/announcement and personal-return action. `utils/student-chart.js` builds presentation options without importing ECharts and remains pure-testable. Closing/replacing a chart, semester change, session invalidation or route disposal cancels/fences old work and disposes the renderer/observer. The library adds a separate lazy chunk, not an initial Board dependency. Final build sizes are recorded in STATUS.

The header shows **Biểu đồ điểm của lớp**, semester/subject/type context, two selectors and clear close controls. Summary cards separate **Điểm chưa làm tròn** from **Số học sinh ở mức điểm này**; the personal rounded level is explicit. Green peer bars and a warm personal bar use the original101 counts with `filterMode: none`; the viewport shows about21 levels on small charts or41 on larger charts. Drag the overview slider or use the single-stop range to reach every level0.0–10.0. Zoom/navigation never re-bins, suppresses or averages data. Missing personal score disables the return action and has no highlight. All-zero data has a readable0–1 Y-axis and an empty-state message. Integer counts remain proportional. Raw decimal strings use B1 half-up only for display/highlighting; no authoritative score Number conversion.

SVG/ARIA alone is not treated as sufficient keyboard access. The native range exposes an explicit `aria-valuetext` with level/count/personal status, Arrow/Home/End, one Tab entry and normal Tab exit. Selecting a level recenters the visible range and shows its safe numeric tooltip. Resize updates the plot/window; reduced-motion disables chart animation. No101 sequential Tab stops or mouse-only information.

## Date-picker decision and architecture

[Flatpickr](https://flatpickr.js.org/options/) (MIT) was evaluated, including its manual-input parsing, invalid-preload/blur behavior and [native-mobile fallback](https://flatpickr.js.org/mobile-support/). These are usable features but require extra synchronization/validation work for this project's strict date-only contract. A small **feature-local calendar** was selected instead; this is not a claim that Flatpickr is unsafe. No second UI dependency, framework, Shoelace, paid kit or permissive Date parser is added.

`BirthDatePicker` wraps the existing text field and a visible calendar-icon button into one field. The text field is the only selected DOB value. Opening an empty calendar positions its month using Vietnam today but selects **no birthday**. Month select and directly editable year avoid hundreds of previous-month clicks. Choosing a day writes DD/MM/YYYY; manual valid input synchronizes calendar selection. Invalid text stays unchanged and is rejected by existing form validation; it is never normalized into a different date.

`utils/birth-calendar.js` uses integer Gregorian components and existing B1 `apiDate/uiDate/birthDate/vietnamToday`; DOB is never converted through a timestamp. It preserves29/02/2000, rejects31/02/2000 and29/02/1900 and disables/rejects future dates against the Vietnam day. Calendar arrows move by day/week, Home/End by week, PageUp/PageDown by month (Shift by year); Escape returns focus to its trigger. The nonmodal calendar also has explicit close/outside-click dismissal and normal Tab exit. Desktop uses an anchored panel; mobile a contained sheet with approximately44px day targets. Reset/verification/expiry/401/exit clears text and calendar navigation state; disposal removes its outside/input listeners and private DOM.

## Offline verification and remaining gates

Focused command: `node --test tests/student-gradeboard.test.js tests/gradebook-ui.test.js` —26/26 PASS before final gates. New cases cover all101 option entries/highlights/counts0/1/23/1000, window bounds, reduced animation, Gregorian navigation, leap dates, invalid manual forms and Vietnam midnight. Existing read cancellation/DTO/precision/session tests are retained.

Actual local Chrome QA uses the maintained synthetic fixture, not the Board/bootstrap: widths360/390/768/1024/1440, contained chart/table/calendar, range Home/End/arrow/Tab, numeric Y axes, selector replacement, zero/missing score, count0/1/23/1000, empty/loading/503/403, pending selection/close response, expiry and held401 cleanup. Date checks include invalid manual dates/future date, no automatic today selection, month/year entry, leap-day choice, manual-to-calendar sync, ArrowRight across month and Escape focus. External/error counters remain0. Screenshots stay ignored under tests/local/cp05. These are Chrome iframe CSS-width observations, **not** physical touch/mobile/Safari or OS reduced-motion acceptance. Final gate results/CI are in root STATUS.

Hosted Supabase/Auth/API/SQL/metadata/log requests0; migrations/deployments0; secretsNO; real dataNONE; stress/load/soak/stretchNONE. CP01-C/native PostgreSQL17/hosted JWT-RLS-publication-limiter and real-data gates remain NOT RUN. Existing CP03/CP04 integration gaps are outside this UI task. User visual approval remains required before merging Draft PR7.

## Manual review

```sh
git switch feature/personal-gradebook-ui-refinement
npm ci
npm run dev
```

Open **http://localhost:4173/tests/student-gradeboard.html**, never `/` for offline QA. Use only synthetic **000000009 /29/02/2000**. Try the calendar before verification; open Toán → Thường xuyên1 and compare exact8.25, level8.3 and aggregate count. Change **Loại điểm**, use the overview slider, **Chọn mức điểm** and **Về mức điểm của bạn**, then Escape. Try widths/counts/failure modes from the fixture toolbar. Reset/expiry/401 must restore an empty enabled form with no chart. Detailed reproducible scenarios are in [tests/README](../../../tests/README.md#cp05--browser-qa-offline-tái-lập-f01f05).
