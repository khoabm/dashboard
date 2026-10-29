# OWNER AI PREVIEW — V2 pilot

**Trạng thái mới sau owner UAT 2026-10-29: hosted BLOCKED, chưa READY.**
Ledger31/40, qaReservations2/ownerReservations1, blocked=true. Giữ nguyên evidence;
không xóa ledger, reset DO hoặc chạy Start hosted để thử lại. Hai mẫu PASS dưới đây
là lịch sử, không bao gồm câu hỏi lịch Xưởng mô hình giấy đã trả503.
[Điều tra và correction offline](V2_PILOT_ACCEPTANCE.md#owner-uat-incident--offline-correction--2026-10-29).
Để tự kiểm tra correction không tốn quota: chạy `node scripts/owner-preview-start.mjs`
**không có `--hosted`**, mở URL Chrome bên dưới, chọn “Điều chỉnh lịch (mô phỏng offline)”,
mở trợ lý, bật checkbox và hỏi “Xưởng mô hình giấy diễn ra khi nào? Có thay đổi lịch không?”.
Kỳ vọng lịch mới22/11/2026, lịch cũ20/11/2026 và hai nguồn notice/update.
Stop offline bằng `node scripts/owner-preview-stop.mjs` trong cùng môi trường.
Đây là scripted model; không phải nghiệm thu Qwen thật. Phần Start hosted sau đây
chỉ dùng khi incident/failure-stop và Free/allowance đã được xử lý theo quyền riêng.

**2026-10-29: Hosted Pilot PASS trên hai mẫu nhỏ; owner workflow đã kiểm chứng.**
[Evidence/ledger/giới hạn](V2_PILOT_ACCEPTANCE.md). Worker sau bàn giao **disabled**.
Pilot `approved-synthetic-v2-pilot-v1` đã dùng2/5, còn3, stopped=false; workflow
owner cho phép tối đa2 câu. MVP cũ count1/stopped không đổi. Không production-ready.

## Start AI thật — máy hiện tại

Trong terminal tại repository:

```powershell
node scripts/owner-preview-start.mjs --hosted
```

Mở **[Chrome owner preview](http://127.0.0.1:4173/tests/owner-ai-preview.html)**.

1. Đợi terminal báo HOSTED synthetic pilot, expiry và allowance.
2. Trang phải hiện **DỮ LIỆU GIẢ · Cloudflare thật**. Mở trợ lý, chọn checkbox AI.
3. Hỏi một câu. Banner sau phản hồi hiện HTTP200/model calls2 cho câu mới,
   hoặc1 cho follow-up; answer/source cards xuất hiện. Không gửi lặp vì thấy chậm.
4. Mở học liệu/lọc Board để đối chiếu, không gọi model. Đóng/mở panel xóa context;
   hãy hỏi follow-up trước khi đóng. Tối đa2 câu trong workflow owner.

Chỉ dùng4 bài synthetic đang hiển thị. Không dùng production, Supabase,
Gradebook hoặc dữ liệu học sinh. Không cần sửa source hay nhập token.

| Lượt | Câu hỏi gợi ý | Nguồn kỳ vọng |
| --- | --- | --- |
|1|Nếp gấp sao giấy cần làm những gì và dùng loại giấy nào?|Gấp mép theo đường chéo, miết phẳng, giấy tái chế sạch |
|2|Nói dễ hiểu hơn về bài này được không?|Cùng nguồn câu trước; không nguồn riêng tư |

Hai câu thật Codex đã kiểm chứng là hướng lực trong nước và so sánh bài lực đẩy/
gấp giấy. Follow-up/temporal/abstention chưa chấm model thật; có regression offline.
“Web này làm gì?” dùng deterministic profile, không model.

## Stop — tắt hosted thật trước khi đóng server

Trong terminal thứ hai, cùng repository:

```powershell
node scripts/owner-preview-stop.mjs
```

Hoặc Ctrl+C tại terminal Start. Stop đợi deploy-disable/readback rồi kiểm tra
bearer cũ403; có thể cần20–40 giây, client chờ tối đa60 giây. Thành công mới trả
“Đã dừng owner preview”. Server đóng, reload URL local không kết nối được.
Không tắt cưỡng bức terminal khi Stop đang chạy.

Nếu process crash hoặc không còn local server:

```powershell
node scripts/owner-preview-stop.mjs --recover
```

Recover chỉ deploy default-disabled/đọc flags; không reset/unlock allowance,
không inference hoặc tự khôi phục hoạt động có completion không chắc chắn.
Không xóa ledger/lock để chạy lại. Báo lỗi để kiểm tra riêng nếu ledger bị blocked.
Worker tự fail-closed theo expiry tuyệt đối tối đa15 phút kể cả Chrome/Codex đóng;
không cron, service hay watcher thường trực. Không để AI=true vô thời hạn.

## Free và quota trước mỗi Start

- Máy hiện tại có Node/dependencies, Wrangler tại
  `tests/local/ai-tools/node_modules/wrangler/bin/wrangler.js`, CLI đã đăng nhập
  đúng account. Không tạo key hoặc yêu cầu billing/scope mới. Port4173 phải rảnh;
  script không kill process hoặc chuyển port.
- `tests/local/owner-ai-pilot/free-preflight.json` giữ bằng chứng Free/usage đã
  kiểm tra bằng Chrome, giá trị30 phút, còn ít nhất2000 neurons theo tính bảo thủ.
  Hosted Start bị chặn khi receipt hết hạn; không suy Free từ config hoặc trả phí.
- Sau expiry, yêu cầu Codex **xác minh lại Workers Free/$0 và usage trên Chrome,
  làm mới preflight cho cùng pilot**. Không sửa timestamp/plan/quota bằng tay để
  vượt gate. Final handoff ghi cửa sổ receipt hiện tại.
- Start đọc live settings/bindings/identity và DO trước enable. Raw bearer chỉ ở
  memory controller; Worker nhận SHA-256/expiry. Controller thêm Authorization,
  không đưa token vào VITE/frontend/Git.
- Ledger `tests/local/owner-ai-pilot/ledger.json` carry3 operations trước,
  hiện23/40. Start/Stop thành công dùng5 operations, câu mới4, follow-up3.
  Một Start +2 câu mới +Stop đưa tổng tối đa36/40, không cấp thêm40.
- Ledger thiếu/corrupt/unsettled/failure-stop thì BLOCKED; không auto-init/reset/
  identity mới. Role cap Codex3/owner2 giữ qua restart. `--qa` dành cho QA được duyệt;
  owner dùng `--hosted` thông thường. Start/Stop không hỏi câu nào vẫn tiêu5 operations.

Trạng thái local (không gọi Cloudflare): `http://127.0.0.1:4173/__owner/status`.
used/sessionRemaining/operations là cục bộ; lastStatus đọc lúc Start,
pilotRemainingEstimate chỉ là ước lượng. Stop đọc DO thật. Final settings đã xác
minh AI=false, expiry/access/hash rỗng, namespace cũ.

## Scripted offline — fallback không quota

```powershell
node scripts/owner-preview-start.mjs
```

Cùng URL Chrome, banner **SCRIPTED OFFLINE**. Checkbox AI lúc này chạy scripted
transport/Worker trong browser; nhãn AI trong panel không chứng minh model thật.
Chọn kịch bản offline ngoài panel để thử lỗi/thiếu nguồn/hủy/thu hồi/HTML literal.
Stop vẫn dùng command trên nhưng không gọi hosted.

## Troubleshooting và quyền riêng tư

- Free/usage chưa xác minh hoặc receipt hết hạn: hosted BLOCKED, dùng offline.
- 429/503/timeout/entitlement: không gửi lại/Start để retry; phiên latch blocked,
  Worker được disable. Không đổi ID hoặc mua credits/gói/thẻ.
- Stop lỗi: xem terminal Start, dùng --recover nếu cần. Chỉ báo an toàn khi flags
  live đã xác minh; expiry là lớp cuối, không phải lý do bỏ Stop.
- Không nhập CCCD/email/DOB cá nhân, điểm, credentials/session. Ngày sự kiện và
  tháng/năm bình thường được phép. Fixture không có dữ liệu học sinh.
- Không public/tunnel preview; Worker chỉ nhận exact windows từ corpus synthetic
  server-approved, không tin publication claim của browser.
- Clone/máy khác thiếu ledger/receipt/CLI sẽ BLOCKED; không tự tạo lại file để có
  allowance mới. State thật nằm trong cùng DO và không được replenish.
