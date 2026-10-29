## Mục tiêu và kết quả

Trợ lý trước đây chỉ xét catalog/body preview có giới hạn nên có thể bỏ bài ngoài 24 vị trí đầu hoặc dữ kiện sau 1.200 ký tự. Gate B index toàn văn bản published đã tải, không phụ thuộc topic; gửi shortlist passage có offsets và metadata thời gian qua V3, map citations về native post IDs cho mở/lọc Board. Gate A xác minh tên Vui học cùng cô Quỳnh và hướng dẫn ứng dụng deterministic, không truy cập dữ liệu riêng.

- Local corpus bound 2M UTF-16; vượt giới hạn/không rõ phân trang nêu rõ partial/unknown. Semantic search chỉ trên shortlist, không claim toàn website.
- Tối đa 8 candidates, Qwen 5 passages/24KB JSON, 3 citations; follow-up bounded memory-only. Timezone Asia/Ho_Chi_Minh, không dùng ngày tạo/sửa như ngày hoạt động.
- Giữ cancellation/revocation, sửa native Escape race; không đổi CSS/thiết kế đã nghiệm thu, Gradebook/Auth/RLS/migrations/CI/dependencies/Worker allowance/run ID.

## Bằng chứng đã thực thi

- Gate A: 43/43 baseline compatibility tests và Chromium 6 viewport PASS.
- Focused final: 95/95; curated CI: 131/131 PASS. Sau sửa copy cuối: 52/52 affected tests, browser 6 viewport, check/build/format/diff PASS.
- Chromium Gate B: 360×640, 390×844, 667×375, 768×1024, 1024×768, 1440×900; actual component/transport/Worker với scripted AI/DO, external HTTP 0. Existing V2/V1 browser và actual-main filter/reset/refresh regression PASS.
- U01–U20/T01–T10 và ảnh/log/geometry: docs/features/board-assistant/GATE_AB_ACCEPTANCE.md.

## Ranh giới nghiệm thu

Hosted Worker/OPTIONS/BGE/Qwen/DO/Supabase/control-plane/deployments: tất cả 0. AI_ENABLED=false và expiry rỗng trong repo không đổi; không kiểm tra live activation state. Gate C model quality và Gate D release NOT RUN, ngoài scope; không coi mock là bằng chứng Qwen thật. PDF/ảnh/Office/video chưa extraction. Client provenance/admission/abuse/privacy gates vẫn phải giải quyết trước production.

Draft PR target ai-learning-assistant. Không merge/deploy. Official CI không được trigger bởi target này; không đổi CI rules. Chi tiết root causes, giới hạn và test commands trong acceptance/ExecPlan/BUG_FIX_LOG.
