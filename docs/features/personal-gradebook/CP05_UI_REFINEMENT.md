# CP05 UI refinement — Student Gradeboard + Analytics Drawer

**Branch:** `feature/personal-gradebook-ui-refinement`  
**Parent:** `feature/personal-gradebook` at `09de67787621d64527073ca0f1f16b13dea8d6ee`  
**Status:** visual implementation candidate, **NOT visually accepted** by the user. Do not merge or present as production UX approval.

## Decision and boundaries

The user rejected the current visual quality, especially the bar chart. This is a **UI review and visual redesign**; CP02–CP05 feature/security decisions remain the contract, not an authorization to change data rules. Only `StudentGradeboard` and its `student-chart-dialog` are restyled. The main Board page, global navigation/header, teacher CRUD/import/publication UI, API/Edge/DB, secrets and published site must be unchanged.

No hosted requests, production data or deployment are authorized. The Gradebook production verify/read services remain fail-closed. The existing committed `tests/student-gradeboard.html` fixture is the offline review entry.

## Wireframe — desktop

```text
┌────────────────── Student Gradeboard ────────────────────────────┐
│ KẾT QUẢ HỌC TẬP                                     8 môn · 7 cột │
│ Bảng điểm của bạn                                              │
│ Lớp · Năm học                                                    │
├──────────────────────────────────────────────────────────────────┤
│ [ Học kỳ I | Học kỳ II ]                       [ Xác minh lại ]   │
│ ↗ Chọn một ô điểm để khám phá phân bố điểm của lớp.               │
├──────────────────────────────────────────────────────────────────┤
│ Môn học     TX1   TX2   TX3   TX4   1 tiết   Giữa kì  Cuối kì    │
│ Toán        8.3   0.0   10.0    —      ...     ...       ...     │
│ Văn          —     ... ...                                     │
│ (8 subjects total; first column stays visible on horizontal scroll)│
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────── Analytics dialog ────────────────────────┐
│ Phân bố điểm                                               [×]  │
│ PHÂN TÍCH KẾT QUẢ                                               │
│ Học kỳ I · Toán · Thường xuyên 1                                 │
│ [Môn học ▾]                          [Cột điểm ▾]                │
│ ┌──────── Điểm gốc ────────┐ ┌──── Cùng nhóm ──────────────────┐ │
│ │ 8.25   · Nhóm 8.3       │ │ 3 học sinh · Nhóm 8.3           │ │
│ └──────────────────────────┘ └───────────────────────────────────┘ │
│ Phân bố điểm của lớp                         101 nhóm · 0–10     │
│ Số học sinh          Y scale/grid fixed                          │
│ 23 │ - - - - - - - - - - - - - - - - - - - -                    │
│ 12 │         ▒     ▒               █                          │
│  0 └────────────────────────────────────────────────────────      │
│        0.0       1.0       ...  8.3 (highlight) ... 10.0          │
│       < internally scrollable exact 101 buckets >                │
│ explanatory rounding and aggregate-only note                     │
│ [scroll hint]                              [Đóng biểu đồ]         │
└──────────────────────────────────────────────────────────────────┘
```

Mobile: semester buttons fill the row, reset can wrap; score table scrolls internally. Chart becomes a near-full-height native dialog/bottom sheet, selectors stack, two summary panels remain legible, Y axis stays fixed while 101 bars scroll horizontally. All labels remain full Vietnamese catalog names, not TX/GK/CK abbreviations (wireframe shorthand is schematic only).

## Visual and interaction acceptance

- Show only the current semester's table. Exactly eight subjects, seven columns. `—` for absent, `0.0` for zero, one decimal in table; preserve exact raw scores internally.
- Clicking a cell opens that selection; two dropdowns change chart without prefetch. Show original score separate from its half-up bucket, and count of students *in that aggregate bucket*; never show identities, rankings, raw peer scores or unapproved statistics.
- Keep exactly 101 score buckets from 0.0 through 10.0 and a numeric integer Y axis; bars remain proportional. A no-score cell has no personal highlight, and all-zero histogram is empty.
- Histogram is keyboard reachable via one roving focus point, arrows/Home/End, Escape and restored focus; viewport/selector changes cancel stale reads; changing semester, 401/403/expiry/reset retains prior security behavior.
- Verify widths 360/390/768/1024/1440 CSS px, visible hover/focus, internal table/chart scrolling and no full-page overflow. Iframe Chrome is *not* Safari/real mobile acceptance.
- No styling changes to shared Board component selectors, main Board home, admin class/roster/teacher grade workspace, or existing site navigation.
- Preserve `npm run check`, `npm run test:ci`, `npm run format:check`, `npm run build` and production exclusion of `tests/` fixtures. Hosted QA requests: **0**.

## Library decision — not automatically approved

The earlier review suggested Apache ECharts and Shoelace for richer charts and native web-component controls. At implementation time, [Shoelace explicitly states it is sunset](https://shoelace.style/), with [Web Awesome as its successor](https://webawesome.com/docs/resources/migrating-from-shoelace); do **not** introduce an unmaintained library merely to follow an early suggestion. [Apache ECharts](https://echarts.apache.org/) remains a candidate for a separate reviewed component upgrade.

For this narrowly scoped branch, **no library is installed**: preserving deterministic offline QA (CSP denies third-party network), exact 101 keyboard-focusable buckets, the pinned npm lockfile, a zero-cost static bundle and current fail-closed production outweighs adding a new chart/UI dependency before visual sign-off. The candidate keeps native dialog/select and locally rendered HTML/CSS bars, with redesigned layout and typography. This is an explicit technical trade-off, not a claim that the previous library recommendations were user-rejected. If visual review still finds the bars poor, prototype ECharts and Web Awesome **in the same feature scope** only after verifying licenses, bundle/lockfile/offline assets and accessibility. Do not add CDN dependencies or change the Board's UI kit.

## Nguyên tắc ngôn ngữ hiển thị

Giao diện hướng đến học sinh và phụ huynh, không sử dụng từ kỹ thuật như `half-up`, `DTO`, `101 bucket` hay các mã trạng thái HTTP trong nhãn. Những thay đổi này chỉ tác động bản hiển thị, **không** sửa cách tính điểm hoặc phân quyền.

| Cách gọi cũ | Cách gọi mới | Ý nghĩa vẫn được bảo toàn |
| --- | --- | --- |
| 7 cột điểm (thanh tóm tắt) | 2 học kỳ | Bảng vẫn đủ 7 loại điểm |
| Phân bố điểm / 101 nhóm | Biểu đồ điểm của lớp / Thang điểm từ 0 đến 10 | Vẫn là 101 mức điểm 0.0–10.0 |
| Cột điểm | Loại điểm | Không đổi danh sách 7 loại điểm |
| Điểm gốc | Điểm chưa làm tròn | Giữ nguyên giá trị chính xác cấp từ backend |
| Số học sinh cùng nhóm | Số học sinh ở mức điểm này | Cùng mức *sau làm tròn*, không khẳng định cùng điểm thực tế |
| half-up | Ví dụ 8.25 được xếp vào mức 8.3 | Quy tắc nhóm không đổi |
| Phiên tra cứu hết hạn | Thời gian xem bảng điểm đã hết | Vẫn cần xác minh lại |

Thông báo lỗi dùng ngôn ngữ trung tính, có hành động tiếp theo; không suy diễn lý do không được xem học kỳ từ một mã 403. Các lựa chọn trong bản xem thử QA được Việt hóa để thuận tiện đánh giá UI, nhưng giá trị tình huống và công cụ đo đếm chỉ phục vụ phát triển, không xuất hiện ở production.

## Manual reproduction and gate

```sh
git switch feature/personal-gradebook-ui-refinement
npm ci
node --test tests/student-gradeboard.test.js tests/gradebook-ui.test.js
npm run dev
```

Open `http://localhost:4173/tests/student-gradeboard.html` (synthetic component fixture; not `/`). Use **000000009 / 29/02/2000**; select Toán/TX1; compare exact 8.25 and highlighted 8.3/aggregate count; choose other columns, empty state and publication/401/403 modes. Change fixture width to 360/390/768/1024/1440 and keyboard navigate chart. Check external and console error counters. Do not enter real student data or call hosted services.

**Honest gate:** This document specifies the proposed visual solution. Browser/device/user aesthetic acceptance and backend security are **NOT RUN** unless independently demonstrated. User approval of visual design is required before merge.
