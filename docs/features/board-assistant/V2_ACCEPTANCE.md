# Correction V2-F01–F05 — nghiệm thu / 2026-10-29

**Offline: READY FOR OWNER REVIEW. Tổng thể: PARTIAL vì hosted chưa được xác minh.**
Baseline review/local/remote cee8e1dffd8fccfe94d8f9b7becae34ee9226806; tiếp tục cùng nhánh
feature/ai-learning-assistant-v2-e2e, base ai-learning-assistant50ea1cb. Không merge hoặc deploy website.
Final commit/remote receipt và kết quả tạo Draft PR ghi trong báo cáo bàn giao chủ sở hữu.

## Chuẩn sản phẩm được cập nhật trong cùng tác vụ

Theo chỉ đạo tiếp của chủ sở hữu: **Vui học cùng cô Quỳnh là web quản lý lớp online với các ứng dụng
đính kèm**, không giới hạn mục đích/đối tượng ở KHTN8. [PRODUCT_PROFILE](../../PRODUCT_PROFILE.md)
lưu căn cứ từ app.js/site-navigation/Gradebook UI. Profile trợ lý, README/OVERVIEW/SPEC hiện hành
đã chuẩn hóa; technical IDs và bằng chứng lịch sử không đổi. Trợ lý chỉ mô tả ứng dụng hiện hữu,
không đọc dữ liệu lớp/điểm hay suy số lớp/học sinh từ snapshot học liệu. Regression bổ sung kiểm tra
purpose/audience/apps và không trả private counts; browser kiểm tra profile không còn KHTN/lớp8.

## Findings và correction đã thực thi

| Finding | Nguyên nhân / sửa | Bằng chứng |
| --- | --- | --- |
| V2-F01/P2 | UI luôn thêm filter kể cả không nguồn; nay chỉ render khi sources được validate và khác rỗng; action resolver từ chối IDs[] | Browser deterministic/keyword-zero/AI-insufficient không có filter; invalid source bị từ chối, có nguồn vẫn mở/lọc được |
| V2-F02/P2 | Câu hỏi inventory thông thường thiếu mẫu nhận diện; nay normalize dấu câu/space, tách tín hiệu website/inventory/listing/specific và tham chiếu follow-up | Pure bảng câu hỏi dương/âm,6 viewport hỏi “Web có những gì?”, “Trang này có bài học nào?”, follow-up tự nhiên giữ IDs; không nuốt câu hỏi nội dung cụ thể |
| V2-F03/P3 | Profile dùng tên kỹ thuật thay tên sản phẩm | websiteProfile.name là Vui học cùng cô Quỳnh; test đối chiếu index.html vốn đã đúng; không đổi identifier/lịch sử |
| V2-F04/P2 | BGE chạy trước khi dùng candidates từ context | Context hiện hành lấy trực tiếp nguồn rồi chỉ Qwen; query mới vẫn BGE+Qwen; test header/model list/candidates xác nhận1vs2 calls, nguồn revoked0 |
| V2-F05/P2 | Cap4 không mô tả dự phòng theo đường xử lý V2 | Cap3 bảo thủ server-side, giữ nguyên count/stopped và DO identity; legacycount>=3/stopped không hồi sinh; malformed/null/falsy allowance fail closed, chỉ record undefined mới khởi tạo |

Cải tiến liên quan: API V2 cũng dùng deterministic helper trước reserve/inference; transport đối chiếu
kết quả với profile tính cục bộ, không tin metadata giả và không phụ thuộc thứ tự JSON keys. Thông báo
thiếu nguồn/cần làm rõ phân biệt khỏi thông tin website; keyword rỗng gợi ý cách hỏi hữu ích.
Không có framework/dependency/CI/Auth/Gradebook/Supabase/schema hoặc global deployment thay đổi.

## Kết quả kiểm thử thực tế

Node24.19.0, Vite8.3.5, dependencies khóa hiện có. Regression mới trên baseline:18 tests,14 PASS/4 FAIL
(routing, identity, embedding thừa, direct metadata inference) đúng các lỗi cần sửa. Sau triển khai,
regression JSON-key-order phát hiện1 FAIL/40; đã sửa và specialist xác minh lại. Không bỏ assertion.

| Lệnh / gate | Kết quả lần chốt |
| --- | --- |
| npm run check | PASS syntax/credential scan/diff |
| npm run test:ci | 131/131 PASS, không đổi curated scope; Gradebook regression giữ nguyên |
| node --test tests/assistant-learning.test.js tests/assistant-learning-worker.test.js tests/board-assistant.test.js tests/board-assistant-transport.test.js tests/board-assistant-worker.test.js | 41/41 PASS: V2 pure8 + specialist13, V1 pure6 + transport5 + Worker9 |
| npm run build | PASS và production test/source exclusion; còn cảnh báo chunk size không chặn build |
| npm run format:check; git diff --check | PASS |
| PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/assistant-learning-browser.cjs | PASS6 viewport, paraphrases/identity/no-empty-filter, grounded mock/follow-up, nguồn/filter/focus, invalid/insufficient/zero-result, quota fallback, safe text, reduced motion |
| PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/board-assistant-browser.cjs | PASS8 viewport V1/keyboard/focus/suggestion/new/cancel/late-response/fallback |
| node /tmp/assistant-board.cjs (bản giữ ở tests/local/assistant-e2e) | PASS actual main.js bằng audit fixture: search persistence, source filter, reset/refresh/topic selection |
| Specialist rerun sau siết malformed allowance | 22/22 PASS; chỉ chạy lại2 file Worker bị tác động, không lặp curated suite |

Official GitHub Actions NOT RUN: target ai-learning-assistant ngoài CI triggers hiện hành, không sửa
workflow. Worker parse/import được kiểm chứng qua specialist; check script chỉ kiểm frontend/Edge.
Các phiên tests cũ ở phần lịch sử bên dưới không được tính thành tests mới của đợt correction.

Sau chỉ đạo chuẩn hóa sản phẩm, focused profile/Worker tests được chạy lại và thêm1 pure test;
full assistant count hiện tại41. Chỉ kiểm lại các phần routing/profile/browser/check/build/format
bị tác động; không chạy lại131 curated chỉ vì đổi mô tả sản phẩm. Không đổi business logic Gradebook.

## Browser và evidence

Chromium thực /usr/bin/chromium + environment Playwright core, Vite cùng môi trường cloud.
360×640,390×844,667×375,768×1024,1024×768,1440×900; suite V1 thêm1024×375 và720×450.
Tất cả document scrollWidth bằng viewportWidth, composer trong viewport, transcript có chiều cao
168/389/145/683/427/559px tương ứng6 viewport; transcript sở hữu scroll. HTTP ngoài loopback0.
[Geometry](evidence/v2-correction-20261029/geometry.json),
[tên website trên mobile](evidence/v2-correction-20261029/identity-mobile.png),
[desktop](evidence/v2-correction-20261029/identity-desktop.png),
[follow-up landscape](evidence/v2-correction-20261029/followup-landscape.png).
Các captures còn lại và probe identity giữ trong ignored tests/local/assistant-v2-correction.

Modal Tab/ShiftTab/Enter/ShiftEnter/Escape và preview return-focus PASS trong regression Chromium.
Reduced motion PASS. Không đổi CSS; số đo contrast của đợt trước giữ dưới dạng lịch sử, không gọi là
đo lại. Native200% zoom, screen-reader runtime, Safari/physical mobile/on-screen keyboard NOT RUN.
Mock output không chứng minh chất lượng hoặc grounding ngữ nghĩa của Qwen thật.

## Accounting và server-side guard hiện tại

| Đường xử lý | HTTP Worker | DO reserve | BGE | Qwen | DO stop khi lỗi | Trần mỗi lượt |
| --- | --- | --- | --- | --- | --- | --- |
| Deterministic trên trang | 0 | 0 | 0 | 0 | 0 | 0 |
| API V2 deterministic đã bật trong fixture | 1 | 0 | 0 | 0 | 0 | 1 |
| Query AI mới | 1 | 1 | 1 | 1 | tối đa1 | thành công4 / lỗi tối đa5 |
| Follow-up có context hợp lệ | 1 | 1 | 0 | 1 | tối đa1 | thành công3 / lỗi tối đa4 |
| Input/context sai trước reserve | 1 | 0 | 0 | 0 | 0 | 1 |
| Reservation bị từ chối | 1 | 1 | 0 | 0 | 0 | 2 |
| OPTIONS | 1 (đếm riêng) | 0 | 0 | 0 | 0 | 1 |

Cap3 accepted reservations => tối đa15 operations kể cả stop cho từng lượt. Cộng dự phòng2 OPTIONS,
1 invalid POST và1 denied reservation (2 operations) =>20. Đếm/reserve phía client trước request vẫn
bắt buộc cho các operation ngoài inference; server cap không thể ngăn mọi request đối nghịch đến
một endpoint public. CORS không phải authentication. Không public activate trước admission/provenance.
Giữ cùng lifetime allowance; restart/triển khai không reset count/stopped, không đổi run ID để thêm lượt.
Một record đã dùng3/4 lượt V1 tiếp tục bị chặn. Siết cap là thay đổi có chủ ý, không migration dữ liệu.
DO serialized last-slot/restart/stopped/corrupt-state và lỗi storage/model/abort/deadline được test offline.

## Ledger Cloudflare và trạng thái cuối

Ledger V2 trước0; đợt này cũng0, không cấp thêm40:

| Activity | Worker POST | OPTIONS | BGE | Qwen | DO reserve/stop | Tổng / còn | Deployments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A BLOCKED | 0 | 0 | 0 | 0 | 0/0 | 0/20; còn20 | 0/2 |
| B NOT RUN, chưa đủ điều kiện | 0 | 0 | 0 | 0 | 0/0 | 0/20; còn20 | 0/2 |
| Lifetime V2 | 0 | 0 | 0 | 0 | 0/0 | 0/40; còn40 | 0/4 |

Control-plane Cloudflare0; Supabase hosted0. Connector Cloudflare/GitHub/Supabase không khả dụng;
environment_status hiện tại không có secrets/runtime variables/outbound identities. Vì vậy account,
Free/model entitlement/quota và live Worker config không xác minh được; không activation/deploy hay
rollback. Checked-in AI_ENABLED=false, PREVIEW_EXPIRES="" giữ nguyên. Live disabled/version chỉ có
bằng chứng lịch sử do owner cung cấp, không coi là kiểm tra live mới. Không chi phí hay resource mới.

## Kiến nghị

Chấp nhận scope offline sau owner review diff và evidence; không gọi đây là hosted hoặc production
PASS. P1: xác minh quyền Cloudflare/account/Free/quota và kiểm thử model có ledger khi đủ điều kiện;
P1: trusted provenance/admission trước public release. P2: routing vẫn heuristic, citations không chứng
minh mọi mệnh đề, native device/screen reader chưa test. GitHub API Forbidden có thể chặn Draft PR;
ưu tiên Git push và compare URL đã xác minh. Không tự merge hoặc mở AI công khai.

---

# Hồ sơ triển khai V2 ban đầu — giữ nguyên bằng chứng lịch sử

Mô tả KHTN8/lớp8 dưới đây phản ánh brief cũ, không còn là chuẩn phạm vi sản phẩm hiện hành;
xem PRODUCT_PROFILE phía trên. Các kết quả kiểm thử cũ giữ đúng lịch sử, không chạy lại để đổi scope.


# Scoped Grounded Learning Assistant V2 — acceptance / 2026-10-29

**PARTIAL — local implementation reviewable; hosted quality/public release BLOCKED.**
Baseline ai-learning-assistant50ea1cbf30b6fa603fce43f588aaa921f6ec54da (PR18 included).
Task feature/ai-learning-assistant-v2-e2e. Feature checkpoint bf99afb; final source adds same-ID
snapshot invalidation before send and normal synthetic screenshots. Final commit/remote/PR receipt
is in the owner delivery report. [Architecture/plan](V2_EXECPLAN.md). No merge or website deployment.

## Implemented checkpoints

| CP | Result | Evidence and limits |
| --- | --- | --- |
| 01 Website knowledge | PASS offline | fixed verified site purpose/audience/capabilities; current published topic/resource counts; bounded named lists with truncation notice, empty/changed catalogs; no model for profile |
| 02 Intent/retrieval | PASS scoped | Vietnamese normalized rules distinguish website/audience/inventory/topic/overview/educational/follow-up/search/sensitive unsupported. Ambiguous outside questions rely on model abstention; not a general intent classifier |
| 03 Generated response | PASS mock / BLOCKED hosted | existing BGE ranking + Qwen JSON status/answer/IDs/coverage; <=1800chars/3 citations, no extra keys; answered requires allowed source IDs; insufficient text replaced with fixed refusal |
| 04 Conversation/UI | PASS synthetic | one prior validated question + <=3 source IDs, memory-only; follow-up restricted to prior sources; current snapshot checked before send/after response/action; close/reset/cancel clears ownership; natural answer uses text DOM |
| 05 Security/cost | PASS bounded contracts / BLOCKED production | shared public wire validator rejects private fields before fetch; no tools/writes/Auth/Gradebook; no retries;40s Worker/45s transport deadlines; existing global lifetime4 reservation/stop guard and disabled config retained |
| 06 Acceptance | PARTIAL | final offline and actual Chromium gates PASS; Cloudflare identity/quota absent, no hosted pilot; API prevents Draft PR; remote receipt in owner handoff |

The source model is public title/body/topic text, not file bytes. Counts include only topics represented
by published posts, explicitly labelled. Lists show<=20 topics and<=10 titles, never a silent complete
summary claim. AI catalogs>24 are disabled rather than sampled. Context retains one prior question,
not model-generated prose, bounded by400chars and current source IDs. The UI transcript is bounded
by9 message rows. Neither context nor answers are written to storage/logs/analytics.

## Commands and outcomes

Node24.19.0, Vite8.3.5, existing locked dependencies retained (no dependency declaration/lock change).

| Command | Outcome |
| --- | --- |
| npm run check | PASS frontend/13 Edge module syntax, scoped credential literals, diff whitespace |
| npm run test:ci | PASS131/131; policy unchanged, includes Gradebook pure regressions |
| node --test tests/assistant-learning.test.js tests/assistant-learning-worker.test.js tests/board-assistant.test.js tests/board-assistant-transport.test.js tests/board-assistant-worker.test.js | PASS33/33: V2 pure5/specialist9, V1 pure6/transport5/Worker8 |
| npm run build | PASS production exclusion; existing nonfatal chunk-size warning |
| npm run format:check; git diff --check | PASS |
| PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/assistant-learning-browser.cjs | PASS6 viewports; generated mock responses, exact profile counts/zero requests even opted-in, follow-up context, citation navigation/focus, close/reset, quota/no retry, safe markup text and reduced motion |
| PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/board-assistant-browser.cjs | PASS8 viewport V1 regressions, keyboard preview focus, suggestion no-send/new, stop/close delayed responses, cloud failure/reopen |
| Explicit existing audit fixture actual-main driver (tests/local/assistant-e2e/assistant-board.cjs) | PASS manual persistence, source filter, refresh, reset, topic handoff/manual selection; zero hosted calls |
| Additional bounded accessibility probe (tests/local/assistant-v2) | PASS720x450 reflow proxy, changed-snapshot context invalidation before request and measured text contrast |

Focused tests ran during implementation; full final suite ran after stable implementation. Only affected
browser/check/build/format checks were rerun after the observed same-ID snapshot ownership correction;
unchanged curated suites were not rerun merely to accumulate PASS. Source test behavior is preserved
by final docs/evidence commits. Official GitHub Actions NOT RUN for integration-target branch; triggers
remain develop/main. No tests/HTTP/Worker/browser specialists added to test:ci.

## Browser evidence

Actual /usr/bin/chromium with environment Playwright core, Vite in same cloud machine.
360×640,390×844,667×375,768×1024,1024×768,1440×900; V1 also1024×375 and720×450.
[Geometry](evidence/v2-20261029/geometry.json), [contrast](evidence/v2-20261029/accessibility.json),
[desktop](evidence/v2-20261029/desktop.png), [mobile](evidence/v2-20261029/mobile.png),
[landscape](evidence/v2-20261029/landscape.png). Remaining screenshots/finite drivers under ignored
 tests/local/assistant-v2 and tests/local/assistant-e2e. Requests blocked outside loopback; actual
external HTTP0. Contrast: answer10.61:1, disclosure5.49:1, consent7.07:1. These measurements do not
constitute an exhaustive accessibility audit. Native200% zoom, screen-reader runtime, physical
mobile keyboard/iOS/Safari NOT RUN. Half-size viewport is a reflow proxy, not native zoom evidence.

## Synthetic model evaluation (not live Qwen)

| Input / evidence | Expected | Actual scripted-binding result |
| --- | --- | --- |
| Web này làm gì? / Tôi có thể làm gì trên website? | deterministic purpose, zero inference | verified KHTN8 purpose/capabilities, calls0 |
| Có bao nhiêu học liệu? / topic listing | exact public inventory | pure fixture2 resources/2 represented topics; browser1/1; draft excluded |
| Giải thích bọt khí; source says reaction creates gas/bubbles | supported explanation with p citation | “Phản ứng tạo khí làm xuất hiện bọt khí.”, p valid |
| Giải thích dễ hiểu hơn | same source scope; bounded prior question | same p only; prior question transmitted; candidate q rejected |
| Unsupported question/output | insufficient; no invented external facts | fixed refusal replaces scripted “Invented capital”; no sources |
| Injected instructions / extra tools / unknown IDs | data, no privileged instructions/actions | system marks data untrusted; extra keys/unknown IDs fail closed, allowance stopped |
| <img ...> generated text | literal text, no executable HTML | browser descendant img0, no external fetch |
| Late embedding/deadline/aborted request | no additional Qwen or stale turn | fake timer40s deadline stops allowance; late result does not launch Qwen; pre-aborted models0 |

Mock answers demonstrate plumbing/validation only. Actual Qwen accuracy, Vietnamese quality and resistance
to semantic prompt injection are BLOCKED pending the authorized hosted gate. Valid source IDs cannot
prove factual entailment. No claim of complete hallucination prevention.

## Hosted ledger and final operations

| Activity | Worker requests | OPTIONS | BGE | Qwen | DO reserve/stop | Combined / remaining | Deployments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A BLOCKED | 0 | 0 | 0 | 0 | 0/0 | 0/20;20 unused | 0/2 |
| B NOT RUN (conditional prerequisite unmet) | 0 | 0 | 0 | 0 | 0/0 | 0/20;20 unused | 0/2 |
| Lifetime | 0 | 0 | 0 | 0 | 0/0 | 0/40;40 unused | 0/4 |

Cloudflare control-plane calls0. Environment metadata has no identity/secret/runtime bindings;
identity manifest connections[]; Cloudflare CLI/connector unavailable. Correct account, active Free
plan/model entitlement/current quota/live config cannot be verified. Historical dashboard is not current
quota. Therefore no activation, hosted request, deployment or rollback attempted. Checked-in
AI_ENABLED=false/PREVIEW_EXPIRES="" unchanged; live state/deployed version NOT independently verified.
No Supabase hosted calls, production content, billing change or new resource. Existing V1 budget allows
4 global reservations (each successful V2 chat4 counted operations), not a generic public allowance.

## Release blockers and owner trial

P1: browser-supplied catalog is not independently proven published; CORS is not authentication.
Before public release, trusted content provenance plus admission/abuse control and renewed cost/privacy
review are required. This task does not create a Supabase service, schema or public inference endpoint.
P1: live Qwen integration/rollback verification blocked by missing Cloudflare access; stay disabled.
P2: heuristic intent routing and citation checks do not guarantee language understanding or claim truth.
P2: native zoom/devices/screen reader remain unverified. UI/UX Pro Max unavailable; existing design used.
GitHub API Forbidden blocks Draft PR creation; Git HTTPS access can still push the reviewed branch.

Owner trial: run npm run dev, open /tests/board-assistant-ui.html on loopback. Use synthetic data only.
“Web này làm gì?” and “Có bao nhiêu học liệu?” work without inference. Automated browser driver injects
scripted AI answers and exercises follow-ups; this fixture does not call live Cloudflare. Do not enable
AI against real Board data or open a public preview. Review source/screenshots first; hosted review
requires the existing Worker account/Free/quota/access prerequisites, not a token pasted into chat.
Do not approve production release or infer real-content/model acceptance from this local result.
