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

Open **http://localhost:4173/tests/student-gradeboard.html**, never `/` for offline QA. Use only synthetic **000000009 /29/02/2000**. Try the calendar before verification; open Toán → Thường xuyên1 and compare exact8.25, level8.3 and aggregate count. Change **Loại điểm**, use the ECharts slider only when there are many occupied levels, then Escape. Try widths/counts/failure modes from the fixture toolbar. Reset/expiry/401 must restore an empty enabled form with no chart. Detailed reproducible scenarios are in [tests/README](../../../tests/README.md#cp05--browser-qa-offline-tái-lập-f01f05).

## Screenshot-based correction — 2026-10-27

Source feedback: three user screenshots showed nested input/outer focus rings, missing slash after the birthday month during continuous typing, and excessive controls below the chart. Applied directly on `feature/personal-gradebook-ui-refinement`, **without touching the parent feature branch**.

- **V2-01 / P2:** a visible `Đang chuẩn bị biểu đồ…` status covers the first lazy ECharts import instead of a blank area; fallback remains available if the library fails.
- **V2-02 / P2:** one coherent DOB field: the text input no longer has its own blue browser focus rectangle; the wrapper shows the green focus ring and a red error ring when validation fails, including focus. The calendar button has a distinct keyboard focus outline.
- **V2-03:** removed both the redundant exact-score range and the `Về mức điểm của bạn` button. ECharts' built-in horizontal slider remains the only *visible* chart navigation control. The chart plot itself has a single keyboard focus stop, ArrowLeft/Right/Home/End, and a live accessible score/count description through `aria-valuetext`.
- **V2-04:** month choices after Vietnam's current month are disabled when navigating the current year; switching to the current year clamps a formerly selected future month.
- **Input correction:** typed/pasted digits normalize to `DD/MM/YYYY` as each digit is entered (e.g. `29022000 → 29/02/2000`), preserving the logical cursor position. This does **not** fix invalid calendar dates or change the existing B1 validation.
- **Laptop/desktop:** wider chart dialog (up to 1120 CSS px) and height-sensitive spacing/plot sizing to avoid typical vertical overflow. Short viewport browser checks remain required; content must never be hidden merely to suppress scroll.

The synthetic QA fixture and its developer-only labels are deliberately **unchanged**, per user approval. The feature-local chart/date controls and documents are the only scope. Unit/CI/browser evidence of this correction must be recorded separately rather than inheriting Work's earlier V2 PASS. No hosted calls, migrations or deployment authorized.

## Focus and bar-hover correction — 2026-10-27

User screenshots of the student lookup and chart selectors showed a doubled blue focus outline, while hovering the highlighted personal bar changed its orange fill to generic dark green. The histogram bars also looked too thin in the default laptop/desktop window.

- **Scope:** feature-local `gradebook.css`, pure ECharts option/window helper and targeted unit tests only; no global `main.css`, Board, admin, Supabase, fixture labels or parent-branch changes.
- **Focus:** student CCCD input, chart subject/type selectors and calendar month/year selectors get one consistent green border/ring; invalid CCCD shows red. Native keyboard focus remains visually apparent. Date field retains its previously accepted wrapper focus and invalid presentation.
- **Hover:** the personal bar retains orange even when hovered; emphasis adds a subtle border/shadow instead of recoloring it green. Other bars keep their green fill.
- **Width and density:** responsive default dataZoom window derives the number of visible levels from chart width (8–32 intervals). Bars can grow up to 34px; a 45% category gap preserves separation when zooming/resizing. All 101 validated levels remain in the dataset and can be reached with zoom/scroll or keyboard. No artificial minimum bar width that would make crowded zoom-out columns overlap.
- **Tests:** add pure checks for selected/ordinary hover colors, bar cap/gap and window bounds at widths 280/360/390/768/1024/1440. Browser visual, keyboard and native-select open-state checks must be reported independently; do not infer them from source alone.

## Chỉ vẽ các mức điểm có học sinh — 2026-10-27

Theo phản hồi trực quan, biểu đồ trước đây vẫn trải đều nhiều mức điểm không có học sinh, dẫn đến các cột dữ liệu mảnh và xa nhau. Bản UI này **lọc khi hiển thị** (`studentCount > 0`), không thay đổi API, chuẩn hóa/rounding hay mảng 101 mức được xác thực trước khi render.

- Ví dụ lớp có học sinh ở **0.0, 2.0, 8.3, 10.0**, trục X hiển thị đúng bốn nhãn đó và bốn cột. Những mức không có học sinh bị lược bỏ, **không** ngụ ý khoảng cách giữa các nhãn là một trục số liên tục.
- Giao diện ghi rõ “Chỉ hiển thị mức điểm có học sinh”; trục Y vẫn đếm học sinh nguyên, tooltip hiện mức điểm và số học sinh. Không suy diễn thêm thống kê.
- Cột rộng tối đa **64px**, gap category **36%**; với ít cột, chart được căn giữa và giới hạn độ rộng theo số cột; với nhiều cột, ECharts giữ thanh kéo ngang để xem hết các mức có học sinh. Mọi mức có số lượng >0 đều được giữ; không gộp mức điểm.
- Keyboard Arrow/Home/End chuyển qua **các mức có học sinh**, không còn dừng trên các mức trống; một Tab entry và ESC/focus dialog được giữ. Highlight màu cam theo điểm làm tròn chỉ xuất hiện nếu mức đó có số lượng >0. Nếu điểm cá nhân không có nhóm dữ liệu, phần tóm tắt giữ điểm chính xác nhưng không vẽ cột có số lượng 0.
- Nếu toàn bộ 101 mức có số lượng bằng 0, hiển thị “Lớp chưa có điểm ở mục này.” và không khởi tạo chart/slider. Với nhóm dữ liệu ít hơn hoặc bằng số cột hiển thị, không có thanh kéo thừa.
- Regression thuần: sparse/zero/one/large, các mức 0.0/10.0, hover cá nhân và thường, 101 mức đầy đủ, điều hướng và responsive chart windows. Browser QA độc lập phải xác minh cột không dính nhau, thanh kéo chỉ xuất hiện khi cần, không tràn và biểu đồ đọc được ở 360–1440px.

**Lưu ý:** Đây là thay đổi cách trình bày biểu đồ đã được người dùng yêu cầu; **không thay đổi** các điều khoản về dữ liệu lưu trữ, quyền riêng tư, phân quyền, điểm gốc hay công bố học kỳ. Giữ nguyên fixture QA và nội dung main Board/admin.
