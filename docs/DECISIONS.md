# Quyết định và thay đổi định hướng

Chỉ ghi quyết định có ảnh hưởng scope/kiến trúc; ngày + căn cứ + hệ quả. Không dùng file này làm nhật ký từng thao tác.

## Board Assistant MVP — 2026-10-29

AI-D01: người dùng cho phép phát triển trên branch hiện tại và deploy Worker riêng, cấm
merge/main/web deploy. Zero cost có ưu tiên cao nhất; bất kỳ yêu cầu trả phí/thẻ/trial/credit
(kể cả Codex) đều phải dừng. Quyền tự động hóa chỉ thuộc task này; không sửa AGENTS.md.

AI-D02: MVP dùng chat UI + hybrid retrieval; model chỉ chọn ID nguồn, Worker lấy nguyên văn
public text để hạn chế lỗi chép lại/hallucination. Nút hành động qua allowlist read-only và
fresh snapshot; không model tools/JS/DOM tùy ý/Gradebook. Đây là nền mở rộng trợ lý page,
không phải chatbot sinh lời giải hoặc quyền sửa nội dung. Chuẩn sản phẩm tại SPEC R07.1.

AI-D03: một SQLite Durable Object lưu counter/stop flag để enforce allowance trên nhiều
isolate; không lưu nội dung/IP, không thêm D1/R2. Allowance mới chỉ có sau phê duyệt từng
đợt; không tự reset quota sau lỗi. Frontend AI và Worker config mặc định tắt. Dữ liệu public
thật và public production API cần gate riêng; finite synthetic E2E không thay gate đó.

| ID / ngày | Trạng thái | Quyết định và căn cứ |
| --- | --- | --- |
| D01 / 2026-10-23 | Đã chốt | Theo yêu cầu người dùng: repo khoabm/dashboard, tạo develop để thiết lập tài liệu; chưa xây website trong lượt này |
| D02 / 2026-10-23 | Đã chốt | Theo brief: KHTN8 Board, HTML/CSS/Vanilla JS, Supabase Free, một admin/khách đọc published, 0 USD, source độc lập |
| D03 / 2026-10-23 | Đã chốt | Theo yêu cầu mới: bỏ nội dung nhà cung cấp hosting trước đây; tối ưu workflow ChatGPT Work tích hợp Sites, giữ ràng buộc xuất source và tương thích/miễn phí |
| D04 / 2026-10-23 | Quy ước vận hành | SPEC giữ đủ yêu cầu; AGENTS + OVERVIEW + STATUS là entry point; đọc mục liên quan, không bắt chat mới đọc toàn code/spec |
| D05 / 2026-10-23 | Quy ước vận hành | develop phát triển, main dành bản nghiệm thu; repo trống cần bootstrap main. Không tự merge/deploy công khai; kiểm tra snapshot GitHub và Sites thay vì giả định auto-sync |

| D06 / 2026-10-23 | Phạm vi hiện tại | Người dùng giao triển khai source trên develop, không dùng nhà cung cấp hosting cũ; không yêu cầu merge main. Tiếp tục phần độc lập, không phát hành khi thiếu security/cost gate |
| D07 / 2026-10-23 | Mặc định kỹ thuật triển khai, có thể review; phần phiên được thay bởi D09 | Vite bundle static SDK (không framework); ban đầu dùng phiên memory, từ 2026-10-24 theo D09. Các phần còn lại: <2 MB = <2.000.000 byte; retention 30 ngày không purge; FK restrict cho cột; thumbnail attachment ID; optimistic transaction/version và atomic reorder |
| D08 / 2026-10-23 | Mặc định kỹ thuật triển khai, có thể review | Bucket private, immutable paths, signed URL 60 giây với giới hạn thu hồi đã nêu; batch thumbnail; refresh sau ghi/active/manual, không Realtime/polling; ưu tiên quota |
| D09 / 2026-10-24 | Triển khai theo yêu cầu giữ đăng nhập qua refresh và bảo mật | Thay phiên memory mặc định bằng SDK persistence trong sessionStorage, key/BroadcastChannel riêng cho tab độc lập; fallback memory nếu storage không dùng được. Bootstrap xác minh user từ Auth server + active admin profile, chặn UI/board khi chưa xác minh hoặc lỗi. Không chọn persistence mặc định vào localStorage, không thêm cookie/backend riêng. Hợp đồng và giới hạn browser/XSS tại SPEC R08.1; bằng chứng AUD-016 / QA-A18 |
| D10 / 2026-10-24 | Theo thiết kế người dùng chấp nhận, có giới hạn rõ | Giữ UI bảng hiện tại, chỉ thêm điều hướng overflow native + trái/phải và reveal chủ đề mới; người dùng loại mục “Đi đến”. SPEC R05.2 giữ hợp đồng duy nhất, AUD-017 / QA-A19 giữ bằng chứng. Regression dùng lại được nằm trong tests và giữ Git; output/ảnh QA/scratch local nằm trong tests/local đã ignore |

<a id="personal-gradebook-2026-10-26"></a>

## Personal Gradebook — quyết định 2026-10-26

Phạm vi riêng của feature, không thay D01–D10 của bảng học liệu. Căn cứ: yêu cầu CP00 Documentation Correction và các quyết định D01–D05 của người dùng. Hợp đồng chuẩn giữ tại [BRIEF V1.2](features/personal-gradebook/BRIEF.md); bảng này ghi lý do thay đổi, không sao chép spec. Chỉ sửa tài liệu, không coi là implementation/ủy quyền migration.

| ID | Trạng thái / thay thế | Quyết định và hệ quả |
| --- | --- | --- |
| GB-D01 | Người dùng chốt; làm rõ precision V1.0 | Tối đa 5 chữ số thập phân, decimal-string API, không làm tròn khi ghi; hiển thị 1 chữ số, dùng raw cho tính toán. GB-06 / DATA §A |
| GB-D02 | Người dùng chốt; thay yêu cầu bảo toàn nhãn năm học lịch sử | Tên lớp/năm học là metadata sửa độc lập dù đã có điểm; không rollover/nhân bản, không snapshot nhãn cũ; không di chuyển/UPDATE điểm. GB-01 |
| GB-D03 | Người dùng chốt; thay hoàn toàn chính sách import cũ | Roster/điểm cho phép UPSERT nguyên tử với preview INSERT/UPDATE/unchanged/error, không thêm student ID; identity/DOB bảo vệ đúng người, blank không tự xóa. GB-07 giữ chi tiết |
| GB-D04 | Accepted / Deferred for V1 | Chấp nhận rủi ro suy luận histogram; không ngưỡng cohort/suppression/framework trong V1 và không block CP05. Giữ xác minh, publication, aggregate-only, không trả dữ liệu cá nhân người khác. Xem lại ở milestone riêng |
| GB-D05 | Người dùng duyệt hành vi; ngưỡng kỹ thuật chưa được nghiệm thu | Server limiter per-identity + cross-identity, atomic/fail-closed. Giá trị đề xuất tại DATA §D cần kiểm chứng; không Redis/WAF trả phí |
| GB-D06 | Người dùng chốt 2026-10-26; thay quy tắc literal import headers | Excel/CSV map theo vị trí vật lý: roster 2/3 cột, điểm 10 cột; header đổi tên/trùng vẫn hợp lệ. Giữ nhãn catalog/UI và subject value. Preview phải hiện mapping; không hứa phát hiện mọi hoán đổi cột điểm hợp lệ. GB-B1-REV-003 / BRIEF V1.2 |
| GB-T04 | B1 correction đã duyệt; cần server enforcement sau | Trim tên trước giới hạn 200 Unicode code points; raw cap 4096 UTF-16 units, reject NUL/lone surrogate. Row nguồn safe integer ≥2 tăng dần, được có gap; bỏ qua dòng hoàn toàn rỗng thuộc parser CP03/04, không bỏ dòng sai/thiếu một phần. GB-B1-REV-001/002 |
| GB-T01 | Phương án kỹ thuật ưu tiên, pending CP01 verification | Sáu bảng non-exposed `gradebook`; RPC public hẹp chỉ service_role EXECUTE, SECURITY INVOKER và grants tối thiểu; transaction UPSERT + audit, không đổi RPC học liệu. DATA §B/E |
| GB-T02 | Phương án kỹ thuật tối thiểu, pending CP01 verification | Audit dùng bảng hiện tại, target UUID của lớp, actor server xác minh, action/counts không PII; không tái dùng trigger UUID-row cho BIGINT/composite và không thêm bảng thứ bảy. Chấp nhận trace ở mức lớp, không lịch sử từng điểm. DATA §I |
| GB-T03 | Gate bắt buộc theo yêu cầu người dùng; hiện NOT RUN | Trước dữ liệu học sinh thật phải có bằng chứng quyền/mục đích, retention/delete, keys, backup/recovery, server authorization và log redaction. Synthetic development không cần chờ gate này; CP07 không phải lần đầu kiểm. DATA §H |

## Các gate còn lại của bảng học liệu (baseline)

Còn thiếu: ảnh wireframe quản trị để visual acceptance; tạo tài khoản Auth/tắt signup; E2E admin/upload/sync; full backup/restore; xác minh Sites hosting 0 USD/audience trước Phase 6. Các mặc định agent chọn không được gắn nhãn là người dùng đã duyệt ảnh/retention hoặc toàn sản phẩm.

## CP01-C deployment decisions — 2026-10-28

- **GB-OPS-D01 / owner-approved:** only four unapplied Gradebook filenames follow actual MCP-assigned versions; exact SQL/guards and five applied Board ledger entries stay unchanged. Current mapping/evidence: [DATABASE](DATABASE.md#gradebook-migration-rollout-gate--gb-ops-rev-002). No general timestamp-renumbering or ledger-repair authority.
- **GB-OPS-D02 / owner-approved synthetic scope:** four separate256-bit keyrings and local Windows DPAPI backup; origin allowlist is environment configuration, CP01-C localhost:4173 only. Origin changes do not rotate keys or mutate DB. DPAPI is not sufficient for real-data backup; independent recovery/production custody remains gated in [DATA §H](features/personal-gradebook/DATA_AND_SECURITY.md#h-real-personal-data-gate).

## Tên website do chủ sở hữu xác nhận; mô hình ứng dụng đối chiếu từ source — 2026-10-29

PRODUCT-D01 / **tên website được chủ sở hữu xác nhận**: **Vui học cùng cô Quỳnh**
là tên toàn website; KHTN8 Board là tên lịch sử/kỹ thuật của **Bảng học liệu**,
không thay tên repository, schema, module, brief hoặc bằng chứng cũ.

PRODUCT-D02 / **mô hình được đối chiếu từ source**: các ứng dụng hiện có gồm Bảng học
liệu, Bảng điểm cá nhân, Quản lý bảng điểm/lớp; Trợ lý học liệu là tính năng của Board.
Đây là mô tả hiện trạng và công dụng, **không khẳng định chủ sở hữu đã duyệt mọi
chi tiết định vị sản phẩm hoặc thêm nghiệp vụ mới**, không chứng minh đã public release.
Xem [PRODUCT_PROFILE](PRODUCT_PROFILE.md).

PRODUCT-D03 / **ranh giới tài liệu và quyền**: SPEC gốc chủ yếu cho Bảng học liệu
và hạ tầng; Gradebook/AI giữ brief, quyền, acceptance gates riêng. Không tự mở
Auth/Supabase, truy cập dữ liệu riêng, merge hoặc deploy do đổi tên/overview.
