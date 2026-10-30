# Historical Owner UAT only

Normal chatbot now uses [live chat](LIVE_CHAT_ACCEPTANCE.md), no Owner Start/Stop, bearer, reservations or expiry. Do not use archived setup/recover commands to operate the live Worker. Old failure evidence below is retained unchanged.

# OWNER AI PREVIEW — UAT có giới hạn

**2026-10-29: HOSTED BLOCKED sau owner follow-up503; KHÔNG READY.**
Ledger55/60, QA1/owner2, blocked=true; không còn lượt trong phiên này để retry.
Không chạy Setup/Start để reset hoặc tự cấp identity khác. Correction đã kiểm offline,
chưa deploy hoặc retest thật. [Incident mới](V2_PILOT_ACCEPTANCE.md#owner-follow-up-failure--2026-10-29).
Các con số43/60/còn2 và hướng dẫn Start bên dưới là bàn giao trước incident, không
phải trạng thái hiện tại. Giữ lại để đối chiếu; chỉ offline fallback hiện dùng được.
Codex đã replay đúng câu từng lỗi bằng Qwen3 thật: HTTP200, lịch mới22/11/2026,
lịch cũ20/11/2026, hai citations đúng. Worker hiện **disabled**; Start mới bật tạm.
Đây là dữ liệu synthetic, không phải dữ liệu thật/production. [Evidence](V2_PILOT_ACCEPTANCE.md#owner-authorized-uat-retest--2026-10-29).

## Trên máy hiện tại

Tại `D:\hoctap\dashboard\dashboard`, giữ terminal Start mở:

```powershell
node scripts/owner-preview-start.mjs --hosted --uat
```

Đợi dòng **HOSTED Cloudflare, dữ liệu giả**, mở
**[Chrome UAT](http://127.0.0.1:4173/tests/owner-ai-preview.html)**.
Port4173 phải rảnh; script dừng trước khi gọi Cloudflare nếu port bận, không kill process.
Không dùng `--qa`: lượt QA đã dùng, tối đa hai lượt còn lại dành cho owner.

1. Banner phải hiện **DỮ LIỆU GIẢ · Cloudflare thật**; kịch bản offline bị disabled.
2. Mở trợ lý, bật checkbox AI rồi gửi câu hỏi. Không gửi lặp khi đang chờ.
3. Đợi answer và nguồn. Banner phải hiện HTTP200/model calls2 cho câu mới,
   hoặc1 cho follow-up. Checkbox AI một mình không chứng minh model thật.
4. Đối chiếu đáp án; mở học liệu/lọc nguồn không gọi thêm model. Mở nguồn hoặc
   đóng panel sẽ kết thúc context; nếu muốn follow-up, hỏi trước khi đóng.
5. Hết hai lượt thì dừng; không reload/restart để có lượt mới.

| Lượt đề xuất | Câu hỏi | Kỳ vọng |
| --- | --- | --- |
|1|Xưởng mô hình giấy diễn ra khi nào? Có thay đổi lịch không?|22/11/2026 mới;20/11/2026 cũ; notice và update hoặc update đủ hỗ trợ|
|2, cùng hội thoại|Cần mang những gì?|Giấy tái chế và bút màu; giữ nguồn trước, không bịa vật dụng|

Có thể hỏi về lực đẩy hoặc hướng dẫn gấp sao giấy thay vì câu đầu. Bốn bài trên
Board là toàn bộ corpus thử nghiệm. “Web này làm gì?” là deterministic, không dùng
để chứng minh Qwen hoạt động. Follow-up thật chưa được Codex chấm trong đợt này.

## Stop trước khi đóng terminal

Trong terminal thứ hai, cùng repository:

```powershell
node scripts/owner-preview-stop.mjs --uat
```

Hoặc Ctrl+C tại terminal Start. Đợi thông báo **Đã dừng owner preview**;
Stop deploy-disable, đọc lại settings và xác minh bearer cũ403 trước khi thành công.
Có thể mất20–40 giây, client chờ60 giây; không cưỡng bức tắt giữa chừng.
Nếu process đã crash và local server không còn:

```powershell
node scripts/owner-preview-stop.mjs --recover --uat
```

Recover chỉ tắt AI/xóa access và đọc lại flags; không reset count hoặc mở blocked.
Preview tự fail-closed tối đa15 phút, cả khi Chrome/Codex đóng. Không cron/watcher.
Không xác minh tắt bằng cách gửi thêm câu hỏi: dùng kết quả Stop/settings/bearer403.

## Free receipt và allowance

- Đã xác minh Workers Free/$0 và usage33,13/10.000 neurons trên Chrome; không
  Billing Read scope mới, paid plan, card hoặc credits. Cloudflare Free là chốt phí.
- `tests/local/owner-ai-uat/free-preflight.json` có bằng chứng mới, chỉ hợp lệ30 phút,
  headroom bảo thủ>=2.000 neurons. Start bị BLOCKED nếu hết hạn; không tự sửa ngày
  để vượt gate. Sau đó nhờ Codex đọc lại plan/usage trên dashboard và làm mới receipt
  cho **cùng identity**, không thêm allowance. Cửa sổ cụ thể có trong handoff cuối.
- Cần Node/dependencies và Wrangler đã đăng nhập như máy hiện tại. Không cần sửa
  source, tự tạo token hoặc nhập bearer. Bearer chỉ tồn tại trong memory controller.
- Identity cố định `approved-synthetic-v2-owner-uat-v1`: cap3 trọn đời, Codex1 đã dùng,
  owner2 còn lại; cùng namespace/class, không tạo DO/class tiếp theo hoặc reset.
- Ledger riêng `tests/local/owner-ai-uat/ledger.json`: **43/60** gồm incident31 +
  status/revocation3 +QA9. Start +2 câu mới +Stop dự kiến13 operations, tổng<=56/60;
  Start/Stop không hỏi gì vẫn tiêu5. Không mở/đóng phiên nhiều lần chỉ để kiểm tra.
- Start không tạo ledger/allowance. `owner-uat-setup.mjs` đã chạy đúng một lần theo
  phê duyệt chủ sở hữu; chạy lại sẽ EEXIST, không reset. Không xóa file để chạy lại.
- Pilot cũ `approved-synthetic-v2-pilot-v1` vẫn3/stopped, remaining0; ledger cũ31/40
  blocked=true được bảo toàn, không còn là allowance để tiếp tục.
- `http://127.0.0.1:4173/__owner/status` chỉ đọc trạng thái local, không gọi Cloudflare;
  pilotRemainingEstimate là ước lượng, lastStatus là lần DO read gần nhất.

## Lỗi và diagnostics

429/503/timeout/entitlement: dừng ngay, không retry hoặc chạy Start để vượt failure-stop.
Ledger latch và Worker stop có thể làm các lượt chưa dùng còn0; báo lại để điều tra.
Receipt lỗi chỉ giữ stage/reason/reserved/failureStop, HTTP và model counts; không
log raw reasoning, prompts hoặc full answers mặc định. Generic error UI vẫn được giữ.
Không gửi CCCD, DOB/email cá nhân, điểm, credentials hoặc dữ liệu học sinh. Không
Supabase/production/tunnel/public endpoint; Worker xác minh exact synthetic corpus.

## Offline không quota

```powershell
node scripts/owner-preview-start.mjs
```

Cùng URL, banner **SCRIPTED OFFLINE**, checkbox chạy binding giả. Chọn “Điều chỉnh lịch”
để replay UI; đây không phải Qwen thật. Stop bằng lệnh Stop ở trên, không `--recover`.
Không kích hoạt hosted để chỉ kiểm tra responsive, lỗi, cancellation hoặc HTML literal.

Các bàn giao cũ và incident chưa xác định root cause được giữ trong
[V2_PILOT_ACCEPTANCE](V2_PILOT_ACCEPTANCE.md); UAT retest thành công không khôi phục
response đã mất hoặc chứng minh mọi câu hỏi tương lai đúng. Chưa merge/deploy website,
chưa đủ gate dùng corpus thật hoặc production-ready.
