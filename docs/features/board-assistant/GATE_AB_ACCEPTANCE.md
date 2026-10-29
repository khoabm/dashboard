# V2 Gate A/B — Universal Public Content Grounding / 2026-10-29

**Gate A: PASS. Gate B: PASS trong contract offline được mô tả dưới đây.**
Gate C (hosted Qwen/model quality) và Gate D (final review/merge/release) **NOT RUN — ngoài phạm vi**.
Không coi kết quả này là production-ready hoặc bảo đảm mọi câu trả lời của Qwen đúng.
Baseline 01198f0b8e1b298101d1ee8405ec988b507db109, đúng nhánh feature/ai-learning-assistant-v2-e2e;
base ai-learning-assistant50ea1cb. Đã đọc/reconcile3 commit mới, fast-forward không tạo merge commit.
Checkpoints4504078 (plan/Gate A),9ed2082 (format-only test baseline),4170140 (implementation),
b988e07 (metadata-bound guard), b5da9ad (consent V3), 8400bbc (copy coverage dễ hiểu);
final docs/push receipt trong báo cáo bàn giao. Không đổi
PRODUCT_PROFILE, Auth/Gradebook/RLS/migration/CI/dependencies, Worker allowance/run ID hay cấu hình deploy.

## Gate A — bằng chứng runtime mới

43/43 tests cũ (pure/transport/Worker) PASS trên baseline trước triển khai B. Chromium 6 viewport hiện
có PASS, gồm tên Vui học cùng cô Quỳnh; ba ứng dụng; đường dẫn Bảng học liệu `/`, Bảng điểm cá nhân
`/personal-gradebook` và quản lý `/personal-gradebook/admin`; xác minh/quyền riêng; refusal dữ liệu
điểm/học sinh; deterministic không gọi model. Các ghi chú NOT RUN của01198f0 giữ lịch sử, được supersede
chỉ cho scope runtime này. Không suy hướng dẫn đường dẫn thành cấp quyền hoặc đọc dữ liệu Gradebook.

## Data flow và mức bao phủ thực tế

1. loadBoard dùng readAllRows cho sections/posts/attachments, exact count, unique id và paging đến đủ
   visible rows. Trang bị provider cap ngắn vẫn được đọc tiếp; duplicate/missing/count change bị từ chối.
2. Loader bổ sung publicCoverage.complete=true/method=exact-count-pages/transactional=false. Đây không
   phải transaction DB snapshot, không chứng minh server provenance hay dữ liệu chưa đổi sau khi tải.
3. publicAssistantCorpus chỉ giữ published với section hợp lệ; full body, tên/ID nguồn/chủ đề,
   createdAt/updatedAt và boolean hasAttachments. Không copy Auth/Gradebook/arbitrary keys/URL/path/file names.
   Snapshot không có evidence loader được ghi unknown; invalid/oversized được ghi partial, không giả complete.
4. Index toàn corpus đủ điều kiện, không theo tên topic/thứ tự bài. Chunks có overlap và exact offsets;
   local lexical rank có IDF, title relevance, temporal evidence và diversity giữa post. Corpus nhỏ giữ
   ứng viên không trùng từ để BGE có cơ hội chọn paraphrase; corpus lớn không anchor hỏi làm rõ thay vì lấy8 bài đầu.
5. Wire V3 chỉ gửi shortlist passages. BGE mới tối đa8 chunks; Qwen top5, JSON prompt<=24KB, không lặp
   body trong temporal metadata. Follow-up giới hạn nguồn native đã có, tối đa3 passages, chỉ Qwen.
6. Worker validate V3 shape/metadata/offsets/context/citations và grounded answer; transport map chunk IDs
   về native post IDs và exact quote trong full body. Card native được dedup, nhiều trích đoạn cùng bài
   vẫn hiển thị; open/filter chỉ native IDs đã recheck. Legacy V1/V2 wire contract vẫn được test.
7. UI fingerprint full public corpus, metadata và coverage trước/after request/action. Reset/route/close/
   cancel/revocation bỏ context và kết quả muộn. Native Escape abort ngay ở cancel event trước close queue;
   không để embedding vừa release phát sinh Qwen sau khi modal đã đóng.

### Giới hạn có chủ ý, không giấu coverage

| Lớp | Giới hạn / hành vi |
| --- | --- |
| Local index | 2.000.000 UTF-16 units tổng body/title; vượt thì không index prefix, báo partial/thu hẹp |
| Body | Schema20.000 Unicode codepoints; index toàn văn bản trong bound, không cắt tại1200; không cắt surrogate pair |
| Metadata wire | Title<=200/sectionTitle<=160 UTF-16 units của wire hiện có; vượt cap giữ nguyên local và báo partial thay vì cắt im lặng |
| Passage | 1000 UTF-16 units, overlap160; offsets + textLength giữ provenance cục bộ |
| Semantic/generation | Shortlist<=8; Qwen<=5 và24.000 bytes JSON; metadata dates tối đa4/đoạn, raw passage vẫn còn nguyên; đánh dấu dateEvidenceLimited |
| Answer/context | Answer<=1800chars,<=3 passage citations; một prior question<=400chars +<=3 native source IDs trong memory |
| Network envelope | Existing64KB input/24KB response guards; Worker40s/transport45s, không retry |

Full lexical scan khác full semantic search. Mọi bài/chunk trong corpus được chấm local, kể cả vị trí>24
và body>1200; nhưng semantic chỉ xét shortlist. Paraphrase không có lexical anchor trong corpus lớn có
thể cần làm rõ; incidental anchors cũng có thể chưa chọn đúng bài. UI giải thích bằng tiếng Việt dễ hiểu phạm vi bài đã tải, tìm từ khóa, các đoạn được chọn
và giới hạn file, không khẳng định đã kiểm tra toàn website. Tóm tắt bài dài có thể chỉ dựa trên các cửa
sổ được gửi; prompt yêu cầu nêu giới hạn khi không phủ đủ body. Không vector DB/service mới.

## Grounding và temporal

Clock injected, timezone Asia/Ho_Chi_Minh; tests frozen2026-11-10T02:00:00Z (09:00 Việt Nam).
Schema có created_at/updated_at, không có published_at hoặc event/deadline fields. Không suy chúng thành
ngày sự kiện. Hỗ trợ explicit D/M[/Y], D-M[-Y], ISO và “ngày D tháng M [năm Y]”; thiếu năm giữ null.
Cue gần ngày tách event/start/end, registration, preparation, creation/edit và publication text từ body.
Cancellation/revision giữ từng nguồn; không join event chỉ do keyword hay chọn bản hiệu lực từ updated_at.

V3 có guard từ chối obvious unsupported date/year/numeric literal, tráo deadline thành event, bỏ cảnh báo
hủy/thay đổi, tự gọi yearless event là sắp tới, coi start cũ là đã kết thúc và superlative mới nhất không
có scope. Creation/edit metadata chỉ dùng với nhãn đúng, civil date theo timezone Việt Nam; không thành
publication. Đây là kiểm tra bảo thủ, **không phải proof of entailment**; phép suy diễn số mới hoặc cách
nói lịch phức tạp hợp lệ vẫn có thể bị từ chối. People/place/group attribution và lý luận tự nhiên cần
Gate C quality evaluation. Nguồn chứa instruction vẫn là data, model không được cấp tool/write access.

## Ma trận universal U01–U20

Tất cả PASS trong tests synthetic; cột evidence ghi rõ loại bằng chứng, không suy ra Qwen thật.

| ID | Nội dung / assertion đã chạy | Evidence |
| --- | --- | --- |
| U01 | Lực đẩy từ dưới lên, đúng lesson và quote | pure + scripted semantic integration |
| U02 | Thông báo Sao Xanh nhómA/sân mô phỏng, không đổi thành toàn lớp | exact source fact assertion |
| U03 | Tóm tắt arbitrary post có đúng nguồn, khai báo đoạn trích | pure + bounded prompt |
| U04 | Hai bài lực đẩy/gấp sao giấy, giữ đúng facts của từng bài | pure candidates + scripted answer2 sources |
| U05 | Giới thiệu/chuẩn bị/đổi lịch Sao Xanh; giấy tái chế/bút màu và22/11/2026 | multi-source scripted answer/citations |
| U06 | Đổi topic thành tên Ω chưa cấu hình, vẫn tìm bài gấp giấy | pure dynamic topic |
| U07 | Paraphrase đồ được nâng trong chất lỏng không trùng câu nguồn | fake BGE rank, exact lesson answer; không claim embedding quality thật |
| U08 | deep nằm sau30 filler, đảo thứ tự vẫn cùng shortlist | pure + full transport/Worker |
| U09 | 7 đơn vị sau ký tự1200, quote/offset đúng | pure + service/Worker + Chromium |
| U10 | Chunk/overlap phủ hết long body, UTF-16 quotes JSON round-trip | pure boundary tests |
| U11 | Sao Đỏ nhómB khác Sao Xanh nhómA, không gộp source | distinct attribution assertions + prompt |
| U12 | No-anchor corpus lớn clarify0 model; corpus nhỏ mock abstention không nguồn bịa | pure + integration + browser |
| U13 | Draft/hidden/deleted/orphan không vào corpus; attachment paths không vào wire | projection/paging/wire assertions |
| U14 | Source sửa/xóa/ẩn hoặc stale context bị từ chối | mapping + zero-fetch revoked context + browser pending/action |
| U15 | Title/file-only nói rõ chưa đọc PDF/ảnh/slide/video | planner0 model, không extraction |
| U16 | Unknown snapshot,2M limit và wire-metadata oversized => partial rõ ràng | pure + integration + browser |
| U17 | Nhiều topic cùng query vẫn giữ candidate từ các topic | pure cross-topic |
| U18 | Follow-up native IDs, chỉ1 Qwen, context bounded và không lưu | integration + browser |
| U19 | Prompt injection trong source không thành instruction/tools; HTML text không execute | prompt separation/schema + browser |
| U20 | Website/apps/navigation deterministic, câu hỏi nội dung/số lượng trong bài không bị đếm website | Gate A pure/browser + routing regression |

## Ma trận temporal T01–T10

| ID | Kết quả xác minh offline | Trạng thái |
| --- | --- | --- |
| T01 | Upcoming ưu tiên full-year event sau frozen today; yearless không khẳng định tương lai | PASS |
| T02 | 20/11 khớp day/month nhưng không thêm năm | PASS |
| T03 | Tháng11, tuần09–15/11, UTC18:00 chuyển đúng ngày Việt Nam | PASS |
| T04 | Event20/11 khác registration15/11 và preparation18/11; tráo vai trò bị reject | PASS |
| T05 | Past candidates tách khỏi future/unknown year; start cũ không chứng minh đã kết thúc | PASS |
| T06 | Created01/09 khác event20/11; chỉ nhãn creation được dùng metadata date | PASS |
| T07 | Không có ngày => không phát sinh evidence ngày | PASS |
| T08 | Thiếu năm null,31/02 bị từ chối; thêm năm qua model bị reject; query lịch công khai khác DOB | PASS |
| T09 | Hủy/đổi lịch giữ flags/cue; bỏ cảnh báo hủy hoặc ngày mới bịa bị reject | PASS |
| T10 | Hai hoạt động giống keyword vẫn có native IDs và dates riêng | PASS |

## Test commands, counts và lịch sử lỗi

Node 24.19.0, Vite 8.3.5; dependencies retained, không thêm package. Gate A 43/43 trước B; final 95/95 gồm
43 compatibility +36 new pure +14 V3 specialists +2 paging tests. Không test mới nào vào curated CI.

```sh
npm run check
npm run test:ci
node --test tests/assistant-learning.test.js tests/assistant-learning-worker.test.js tests/board-assistant.test.js tests/board-assistant-transport.test.js tests/board-assistant-worker.test.js tests/public-grounding.test.js tests/public-grounding-worker.test.js tests/public-loading.test.js
npm run build
npm run format:check
git diff --check
```

| Gate | Outcome thực chạy |
| --- | --- |
| check | PASS frontend/13 Edge modules syntax, scoped credential literals, diff; Worker parse/import bởi specialists |
| test:ci |131/131 PASS tại final checkpoint; không chạy lặp sau thay đổi chỉ nằm ở assistant/V3/browser ngoài suite |
| focused final |95/95 PASS; counts ở trên |
| build/exclusion |PASS, warning chunk size cũ không chặn |
| format |PASS; baseline 01198f0 có test chưa format, đã sửa riêng ở9ed2082 |
| browser |Gate B 6 viewport, Gate A/V2 existing 6, V1 existing 8 PASS; actual main.js Board filter/reset/refresh persistence PASS |

Full final suites chạy khi ổn định; sau thay đổi có lý do chỉ rerun phần affected. Đã phát hiện và sửa:
U07 lexical prefilter loại paraphrase; keyword syllable overlap gây filter sai bài; “chuyến” bị nhận
nhầm là “hủy”; queued native close abort trễ; byte prompt có body duplicate; metadata không được cắt
im lặng. Fixture syntax/forbidden Origin envelope cũng được sửa riêng trong test harness, không nới
CORS production. Assertions về đúng facts/native source/filter/model-call count được giữ, không disable.
Official GitHub Actions NOT RUN cho target ai-learning-assistant; không đổi trigger để tạo xanh giả.

## Browser evidence và khả năng tái lập

```sh
# Start existing Vite in another persistent terminal, from checkout root:
npm run dev
PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/public-grounding-browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/assistant-learning-browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/board-assistant-browser.cjs
```

Vite và actual /usr/bin/chromium cùng cloud machine; Playwright là environment tooling, không dependency.
Entry maintained tests/public-grounding-ui.html dùng component -> actual transport -> Worker handler ->
scripted AI/DO bindings, không outbound Worker HTTP. Browser Request strips Origin; fixture mô phỏng
worker-facing headers, không thay CORS thật và không chứng minh hosted gateway/workerd integration.

360×640,390×844,667×375,768×1024,1024×768,1440×900; V1 thêm1024×375 và720×450. Native dialog/focus,
open quote after1200, filter native deep ID, reset, follow-up, large catalog, partial coverage, pending
stop/close/snapshot edit/revocation và HTML literal PASS. Escape release case chứng minh model calls1
(embedding đã chạy, Qwen không bắt đầu). Every non-loopback HTTP blocked, actual external HTTP0.
Disclosure nói đúng selected public text + memory source context; CSS/avatar/panel design giữ nguyên.
[Geometry](evidence/universal-20261029/geometry.json), [mobile](evidence/universal-20261029/mobile.png),
[desktop](evidence/universal-20261029/desktop.png), [landscape](evidence/universal-20261029/landscape.png).
Các captures/finite probes khác ở ignored tests/local/public-grounding và tests/local/assistant-e2e.
Safari/physical device/screen reader/native200% zoom NOT RUN; không suy từ Chromium emulation.

## Ledger và trạng thái vận hành

| Operation trong Gate A/B | Thực tế |
| --- | --- |
| Hosted Worker HTTP / OPTIONS |0 /0 |
| Hosted BGE-M3 / Qwen3 |0 /0 |
| Hosted Durable Object |0 |
| Supabase hosted |0 |
| Cloudflare control-plane / deployments |0 /0 |

V2 lifetime ledger vẫn0/40; Activity A20 và B20 conditional không dùng/cấp lại trong Gate A/B.
Allowances, Durable Object class/storage schema/run ID không thay đổi. Repo AI_ENABLED=false và expiry
rỗng giữ nguyên; không kiểm tra live config vì hosted/control-plane ngoài scope. Không activation nên
không có rollback hosted cần thực hiện. Không mua/nâng gói/tạo resource hoặc dùng real content/student data.

## Rủi ro còn lại và chuyển Gate C

- P1 release: client catalog/coverage không chứng minh publication/provenance độc lập, CORS không phải
  authentication; admission/abuse/quota/real-content privacy còn gate riêng, không sửa RLS/Auth ở đây.
- Gate C chưa chạy: fake vectors/answers chỉ kiểm plumbing, candidate selection, exact facts trong
  fixture và fail-closed guards, không chứng minh Qwen semantic quality hoặc hallucination prevention.
- Corpus lớn có thể cần lexical anchor; semantic shortlist không đảm bảo mọi paraphrase tìm đúng bài.
  Quá giới hạn hoặc không rõ coverage không được khẳng định full website. Numeric/date guards bảo thủ
  có thể từ chối suy diễn hợp lệ; relative dates/cách nói lịch ngoài parser cần làm rõ.
- File bytes chưa đọc; OCR/PDF/Office/Excel/YouTube transcript/vision chỉ là future extension có điều kiện,
  không blocker nghiệm thu văn bản công khai của Gate B.
- GitHub API có thể Forbidden; push/remote SHA + compare link là fallback được duyệt, không merge.

Đề nghị chấp nhận Gate A/B offline theo ma trận/bounds này và chuẩn bị Gate C riêng nếu owner yêu cầu,
sau khi kiểm chứng Cloudflare account/Free/quota/provenance/admission/synthetic budget. Không tự bắt đầu
Gate C hoặc Gate D, không yêu cầu owner chạy lại tests trong khi cloud đã thực thi được.

## Biên nhận kết thúc phần triển khai

Source checkpoint cuối: `8400bbc` trên nhánh V2; baseline `01198f0`. Suite focused ổn định
95/95 và curated CI 131/131 được giữ trong [log focused](evidence/universal-20261029/focused-95.log)
và [log CI](evidence/universal-20261029/curated-131.log). Sau thay đổi copy cuối, chạy lại
[52 tests affected](evidence/universal-20261029/affected-52.log), browser Gate B sáu viewport,
check, [build](evidence/universal-20261029/build.log) và [format](evidence/universal-20261029/format.log): PASS.
Không chạy lặp curated suite không bị ảnh hưởng. Geometry và screenshots bên trên đã đồng bộ copy cuối.

Sau khi tiếp tục phiên, server Vite cũ đã dừng nên lần chụp bổ sung đầu tiên gặp
`ERR_CONNECTION_REFUSED` trước khi tải fixture. Khởi động lại Vite localhost và chụp lại thành công;
đây không phải lỗi sản phẩm hoặc một request hosted. Ảnh được xem lại bằng công cụ đọc ảnh.

Draft PR target `ai-learning-assistant`; nếu GitHub GraphQL Forbidden thì ghi BLOCKED, dùng
[compare được chủ sở hữu cho phép](https://github.com/khoabm/dashboard/compare/ai-learning-assistant...feature/ai-learning-assistant-v2-e2e?expand=1).
Push SHA, working-tree và kết quả tạo Draft PR phải được xác minh trong báo cáo bàn giao, không
coi link compare là PR đã tạo. Các gate hosted C/D vẫn NOT RUN, không đề nghị owner chạy lại QA offline.
