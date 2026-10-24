# Quyết định và thay đổi định hướng

Chỉ ghi quyết định có ảnh hưởng scope/kiến trúc; ngày + căn cứ + hệ quả. Không dùng file này làm nhật ký từng thao tác.

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

Còn thiếu: ảnh wireframe quản trị để visual acceptance; tạo tài khoản Auth/tắt signup; E2E admin/upload/sync; full backup/restore; xác minh Sites hosting 0 USD/audience trước Phase 6. Các mặc định agent chọn không được gắn nhãn là người dùng đã duyệt ảnh/retention hoặc toàn sản phẩm.
