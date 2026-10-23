# Ràng buộc chi phí 0 USD

Nguồn: SPEC R02, R15, R20–21, R25–28. Ngân sách dịch vụ phát sinh 0 USD ưu tiên hơn tính năng. Không tự upgrade, thẻ, domain, add-on, API AI tính phí, trial chuyển trả phí, analytics/email/CI/storage trả phí; không tạo project/deployment dư hoặc lưu lượng giả để tránh pause.

## Dữ liệu lịch sử từ brief, chưa xác minh cho triển khai

Brief nêu Supabase Free: 500 MB database, 1 GB Storage, 5 GB egress thường và 5 GB cached egress; có thể pause do ít hoạt động. Brief cũng nêu Free không tính overage và Spend Cap thuộc Pro. Đây là thông tin đầu vào, không phải xác minh ngày 2026-10-23. Không dùng các số này làm cấu hình quota hoặc cam kết hiện hành trước khi kiểm tra nguồn chính thức và project thực tế.

Chưa xác minh quyền sử dụng/chi phí Sites hoặc công cụ Work theo gói ChatGPT của người dùng; không suy rằng có plugin là tất cả thao tác miễn phí. Không yêu cầu nâng gói ChatGPT để lách ràng buộc. Nếu không xác minh được hosting 0 USD, tiếp tục phần source/QA làm được và báo blocker, không deploy theo mặc định.

## Phase 0 phải ghi bằng chứng

| Thành phần | Bằng chứng cần có | Hiện tại |
| --- | --- | --- |
| GitHub Free / CI | Plan, quyền repo, giới hạn liên quan nếu chạy CI | Repo truy cập được; plan/quota CI chưa xác minh |
| Supabase | Free Plan đúng project; quota DB/Storage/egress/Realtime; pause và hành vi vượt hạn mức | Chưa xác minh |
| Sites / Work | Quyền dùng, khả năng static/source export, hosting và truy cập ẩn danh nếu phát hành public; không phát sinh phí | Chưa xác minh |
| Dependency/CDN/test | Version, license, nguồn chính thức; không dịch vụ trả phí | Chưa chọn |

Khi xác minh, ghi ngày, URL chính thức, project/account liên quan ở mức không lộ bí mật, giới hạn và kết quả. Không kiểm tra lại mọi dịch vụ mỗi lượt; kiểm tra khi bắt đầu dùng, thông tin có thể đổi hoặc tác vụ làm tăng tài nguyên.

## Quota trong ứng dụng

Cảnh báo 70%, nghiêm trọng 85–90%; chặn chức năng nguy cơ cao khi có số đo đáng tin. Theo dõi DB, Storage, bandwidth, tài nguyên, uploads, Realtime connections/messages, build/deploy. Dùng thêm giới hạn provider; frontend không bảo đảm quota tuyệt đối. Quota không đo được miễn phí phải ghi UNKNOWN, không tạo dashboard số giả.

Một admin vẫn có thể có nhiều người đọc/tải học liệu, đặc biệt bandwidth file. Giảm tải bằng thumbnail/lazy-load/fetch metadata, không polling dày, realtime có chọn lọc. Quota hết/Free pause: thông báo, hạn chế/tạm dừng và giữ phần hoạt động; không tự nâng cấp. Không hứa 24/7. Backup/restore/CI cũng dùng tài nguyên và phải tính vào hạn mức.
