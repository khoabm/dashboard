# OWNER AI PREVIEW

**2026-10-29: PARTIAL / live preview BLOCKED, chưa READY FOR OWNER TEST.**
Đọc [Gate C Desktop](GATE_C_DESKTOP.md) để biết bằng chứng và ledger. Preview
local bên dưới chạy được nhưng là **scripted offline**, không phải Qwen3 thật.

## Vì sao chưa bật model thật

Đã kiểm tra đúng Worker `khtn8-board-assistant-mvp`, account kết thúc `852f88f`,
Free/$0 trên Chrome. Binding AI/BUDGET và model catalog BGE-M3/Qwen3 tồn tại.
Ngày 2026-10-29 19:44:45 giờ Việt Nam, endpoint status xác thực trả:

```json
{"count":1,"stopped":true,"limit":3,"remaining":0}
```

Đây là **allowance dùng chung hiện có**, ID `approved-synthetic-mvp-v1`;
ledger V2 cũ 0/40 không làm mới state MVP. Không có hai reservations còn lại
để dành cho owner. Còn operations trong ngân sách test không đồng nghĩa còn
inference reservations. Tác vụ này cấm reset/đổi ID/tạo DO mới để cấp thêm.
`--hosted` vì vậy kết thúc BLOCKED trước bất kỳ request/deployment nào.

## Prerequisites

- Windows, Node và dependencies repository đã có (`node_modules`). Không cần
  extension mới, key, credentials hay tài khoản học sinh.
- Checkout nhánh `feature/ai-learning-assistant-v2-e2e`.
- Port4173 rảnh. Nếu server khác đang dùng port này, dừng **đúng server của mình**;
  script không tự kill process hoặc chuyển port.

## Start và Stop — demo local đã kiểm chứng

Mở terminal tại thư mục repository:

```powershell
node scripts/owner-preview-start.mjs
```

Mở Chrome tại **http://127.0.0.1:4173/tests/owner-ai-preview.html**.
Trang hiển thị `DỮ LIỆU GIẢ · SCRIPTED OFFLINE`. Dùng component Board và
Trợ lý học liệu thật; mọi dữ liệu của trang đều là mẫu, không đọc Supabase.

1. Bấm **Mở trợ lý học liệu**.
2. Bật checkbox AI để thử **nhánh xử lý scripted** trong demo. Consent là
   component thật; banner của trang xác nhận chế độ đang chạy. Checkbox này
   không vượt được hosted gate hoặc gọi model thật trong workflow mặc định.
3. Hỏi một câu và mở nguồn hoặc bấm lọc Board.
4. Nhấn Escape để đóng. Có thể chọn kịch bản offline trước khi mở lại panel:
   thiếu nguồn, lỗi, chờ để Dừng, thu hồi nguồn khi chờ, HTML dạng văn bản.

```powershell
node scripts/owner-preview-stop.mjs
```

Hoặc Ctrl+C trong terminal Start. Server tự đóng sau30 phút; không cron,
watcher thường trực hay service cài vào Windows. Sau Stop, Chrome reload URL
trên phải không kết nối được. Lệnh Stop chỉ gọi loopback, không gọi Cloudflare.

## Câu hỏi mẫu và nguồn kỳ vọng

| Câu hỏi | Nguồn / kỳ vọng |
| --- | --- |
| Web này làm gì? | Profile website deterministic, không model |
| So sánh Lực đẩy trong nước và Nếp gấp sao giấy | Hai nguồn lesson/fold; scripted giữ đúng hướng lực và thao tác gấp |
| Giải thích thêm được không? | Theo hai nguồn của câu trước trong memory; không thêm nguồn riêng tư |
| 20/11/2026 có phong trào gì? (bỏ chọn AI) | Ngày có năm được nhận; tìm từ khóa có thông báo gốc và bản đổi lịch, tự đọc cả hai |

Scripted model không đánh giá relevance/tổng hợp tự nhiên của Qwen. Không dùng
câu trả lời scripted cho thông báo để kết luận chất lượng model thật.

## Phân biệt model thật và fallback

- Workflow Start hiện tại **luôn offline**; nó override AI=false và bỏ `.env`
  khỏi Vite. Không có yêu cầu owner sửa source/config.
- `Tìm bằng từ khóa · AI không được sử dụng` là deterministic fallback.
- Nhãn `AI · ...` trong fixture là kết quả của scripted transport/Worker,
  **không đủ chứng minh hosted**. Live acceptance cần banner Cloudflare thật,
  deployment/version được xác minh và receipt model-calls2 cho câu mới,
 1 cho follow-up, citations/facts được kiểm tra. Hiện chưa có bằng chứng này.

## Cloudflare safety và cách xác minh đã tắt

Worker deployment cuối giữ AI_ENABLED=false, PREVIEW_EXPIRES rỗng,
PREVIEW_ACCESS_EXPIRES rỗng, PREVIEW_TOKEN_SHA256 rỗng. Đã xác minh cấu hình
live và bearer cũ trả403 trước DO/model sau khi thu hồi. Không cần owner gọi
probe lặp lại hoặc chạy lệnh Stop để tiêu thêm quota.

Trong Cloudflare dashboard → Workers & Pages → Worker trên → Settings,
chỉ đọc các biến public flags/expiry này. Không bấm Upgrade hoặc reset DO.
Nếu cần khẩn cấp: đặt AI_ENABLED=false và xóa hai expiry/hash; hoặc deploy
default-disabled config đã review bằng Wrangler hiện có. Rollback về pre-state
version được ghi trong Gate C. Không dùng `--keep-vars` để vô tình giữ access.

Admission mới dùng bearer256-bit có hạn tối đa30 phút, digest SHA-256 phía
Worker, raw bearer chỉ ở server local và proxy header (không VITE env/Git).
Worker chỉ chấp nhận exact windows từ corpus synthetic bundled phía server;
CORS/publication claims của browser không cấp quyền. Proxy kiểm origin/host
loopback và expiry. Không tự mở tunnel hoặc endpoint cho public.

## Troubleshooting / giới hạn

- **Port đang dùng:** dừng server đúng terminal; không tự đổi origin.
- **AI lỗi:** UI khóa cloud cho phiên trang, vẫn tìm từ khóa; không tự retry.
- **Allowance stopped/exhausted:** đây là blocker hiện tại, không phải lỗi cần
  restart script. Không đổi run ID/DO, không reset counter hoặc tự cấp quota.
- **Không kết nối sau30 phút/Stop:** chạy lại Start cho demo local, không làm
  mới hosted reservations.
- **Mất focus/nguồn bị ẩn:** panel bỏ context; mở lại và hỏi dựa trên snapshot mới.
- **Cần Qwen3 thật:** cần một quyết định ngân sách/allowance mới được chỉ định
  rõ và review riêng; hiện không cung cấp lệnh lách gate. Không mua credit/gói.
- Không nhập CCCD, DOB cá nhân, điểm, session/password, học sinh thật; không
  dùng Board production hoặc Gradebook làm corpus. Ngày sự kiện bình thường
  được phép. Chưa có provenance/privacy gate cho dữ liệu thực.

Đây là owner demo cục bộ; không production-ready và chưa có live owner preview.
