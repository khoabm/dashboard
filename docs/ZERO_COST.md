## Live chat Free verification — 2026-10-30

Actual Chrome Workers plans Free/$0/Current plan, pre-acceptance59.41/10k daily neurons; Supabase organization API plan=free/tier_free. Same Worker/AI and historical namespace retained, native rate binding3/10 seconds, no paid fallback/upgrade/card/credits. Real acceptance uses five UI submissions total (three scenarios plus two failing-case retests); no forced quota exhaustion or hosted spam. Provider Free ceiling replaces old artificial lifetime budgets for normal chat. [Evidence](features/board-assistant/LIVE_CHAT_ACCEPTANCE.md). No privileged database access or normal-user manual Free receipt gate.

# Ràng buộc chi phí 0 USD

## Board Assistant — xác minh 2026-10-29

Cloudflare dashboard Workers plans hiển thị **Free / $0 / Current plan**; Workers AI gồm
10.000 Neurons/ngày, SQLite Durable Objects có hạn mức Free theo nguồn chính thức đã đọc.
Chỉ một Worker + namespace bộ đếm cần cho task; không D1/R2, AI Gateway/prepaid credit,
thẻ/trial/upgrade hoặc thay đổi billing. BGE-M3 và Qwen3 chỉ dùng trong các đợt synthetic
được phê duyệt, có lifetime allowance và dừng lỗi; Worker đã deploy lại mặc định tắt.
Nguồn, phiên bản deploy, từng đợt request và giới hạn: [assistant evidence](features/board-assistant/README.md).
Không có yêu cầu trả phí nào được chấp nhận; không suy số đo này ra hóa đơn/usage toàn tài khoản.
Nếu provider hoặc Codex yêu cầu trả phí thì dừng task và report, không đổi kiến trúc để lách.

Nguồn SPEC R02/R15/R20–21/R25–28. Không nâng gói, trial/thẻ, domain, add-on, API AI, email/analytics/CI/storage trả phí hoặc lưu lượng giả để tránh pause. Hết quota ưu tiên chặn/tạm dừng, không trả phí. Không cam kết 24/7.

## Xác minh ngày 2026-10-23

| Thành phần | Bằng chứng / giới hạn |
| --- | --- |
| Supabase | Plugin get_organization: org qvosfzztldzaxxodxzlx plan=free, tier=tier_free; project dashboard/vgciiqtwmxcdqppntgnt hiện có, không tạo thêm. Pricing chính thức: 500 MB DB, 1 GB Storage, 5 GB egress thường + 5 GB cached egress; Free có thể pause sau 1 tuần ít hoạt động, tối đa 2 active projects |
| Sử dụng thực tế | Database physical estimate ~11,55 MB (không phải số đo billing chính xác), Storage learning-resources 0 byte/0 object; 1 board/3 cột/6 posts. Băng thông/MAU/CI usage UNKNOWN, không bịa dashboard. Placeholder SVG/PDF nằm trong frontend source, không phải runtime uploads |
| GitHub | Repo public khoabm/dashboard đã có, quyền push/maintain/admin từ plugin. Chỉ ghi source, không tạo repo/Actions/Pages/LFS/trial mới; không có công cụ xác nhận subscription/CI quota của toàn tài khoản |
| Sites / Work | Chỉ dùng Sites managed preview nội bộ được môi trường cung cấp; không create Site, deploy, mua domain hoặc resource. Chưa xác minh phí hosting/audience/anonymous access, nên Phase 6 BLOCKED; không suy từ plugin khả dụng ra quyền hosting miễn phí |
| Dependency | Supabase JS 2.118.0 và Vite 8.3.5 MIT từ npm metadata; khóa package-lock. Node test runner miễn phí có sẵn, không cài paid test service. Không AI API trả phí/CDN latest |

Nguồn chính thức: https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/billing-on-supabase . Changelog https://supabase.com/changelog.md đã đọc; thay đổi Node20 support cần Node22+, project dùng Node24. Postgres17.11 minor breaking-change liên quan ltree/btree_gist/legacy encryption không được ứng dụng dùng: https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes .

## Cơ chế trong ứng dụng

app_usage chỉ admin: tổng metadata object trong bucket học liệu, pg_database_size là physical estimate. UI cảnh báo 70%, critical từ 90%; upload mới kiểm usage và từ chối nếu tổng dự kiến đạt 90% Storage hoặc không lấy được số đo. Database chỉ ước tính nên cần đối chiếu provider; egress không đo được từ app và hiển thị chưa đo.

Provider bucket enforce 1.999.999 byte và MIME allowlist; DB enforce tối đa 10 tài nguyên/bài. App không bảo đảm tuyệt đối quota toàn tài khoản: concurrent uploads, bucket khác hoặc egress ngoài app không bị các ngưỡng này quản lý đầy đủ. Provider Free là ranh giới cuối, không tự upgrade. Backup/download cũng dùng egress.

Không dùng Realtime/polling hoặc keepalive giả. Fetch khi mở/ghi/active/manual; thumbnail ký theo batch/lazy-load, file bytes chỉ tải khi mở. Một admin vẫn có nhiều người xem tải học liệu; phải theo dõi Dashboard khi vận hành thật.

Lượt triển khai này không kích hoạt dịch vụ trả phí; không suy ra hoặc bảo đảm mọi dịch vụ khác của toàn tài khoản đều 0 USD. Chỉ xác minh lại dịch vụ khi bắt đầu dùng/chuyển gói hoặc thông tin có khả năng thay đổi.

## CP01-C public standard-runner authorization — 2026-10-28

Owner explicitly authorizes the separate cloud specialist workflow. GitHub repository API confirms visibility=public; current official [billing](https://docs.github.com/en/actions/concepts/billing-and-usage) and [standard runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) confirm public standard ubuntu-24.04 execution is free. Job-level public/repository guards and a fresh visibility check precede containers. No larger/self-hosted/paid runner, hosted Supabase, production secrets, artifacts, cache uploads, external storage or resource creation. Timeout20 minutes, one concurrency group, Docker memory2GiB/CPU2. Missing resources => BLOCKED, never upgrade. Existing Offline CI npm cache upload is disabled as well; test:ci scope unchanged. This verifies the workflow's marginal cost boundary, not the owner's unrelated bill.
