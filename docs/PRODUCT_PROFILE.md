# Chuẩn sản phẩm hiện hành — Vui học cùng cô Quỳnh

Chủ sở hữu chốt trong tác vụ V2 correction ngày2026-10-29: **web là một sản phẩm quản lý lớp
online với các ứng dụng đính kèm**. Không lấy nội dung mẫu KHTN8 để suy mục đích, đối tượng hoặc
giới hạn môn học/lớp học của toàn web. Tên sản phẩm chính thức là **Vui học cùng cô Quỳnh**.

## Phạm vi có căn cứ từ source

| Ứng dụng / lớp chức năng | Căn cứ hiện có | Ranh giới |
| --- | --- | --- |
| Web và điều hướng giữa ứng dụng | src/app.js; src/components/site-navigation.js; src/utils/gradebook-ui.js | Vòng đời route độc lập; web không phải chỉ có chatbot hoặc chỉ có Board |
| Bảng học liệu | src/main.js; src/components/board.js | Khách đọc published, tìm chủ đề/tiêu đề/mô tả và mở tài nguyên; quản trị nội dung theo quyền riêng |
| Bảng điểm cá nhân | src/components/student-lookup.js; src/app.js | Có luồng xác minh trước khi đọc; không phải bảng điểm công khai hay học sinh tự có quyền |
| Quản lý bảng điểm và lớp | src/components/gradebook-admin.js; gradebook-scores.js; src/app.js | Source có quản lý lớp, danh sách học sinh, nhập/xử lý điểm; chỉ người có quyền, không phải chức năng trợ lý |
| Trợ lý học liệu V2 | src/components/board-assistant.js; src/utils/assistant-learning.js; Worker | Giới thiệu web/ứng dụng và hỗ trợ nguồn học liệu công khai; không đọc/ghi dữ liệu lớp, điểm, Auth hoặc tệp |

Đối tượng sản phẩm: giáo viên/người quản lý lớp và học sinh. Đây là định hướng sử dụng và mô tả
cấu trúc hiện hữu, không cấp quyền cho một cá nhân hay xác nhận mọi chức năng đã được nghiệm thu live.
Các tính năng điểm danh, giao bài, nhắn tin, thu phí… không được suy thêm nếu chưa có yêu cầu/source.

## Hợp đồng profile và tài liệu

websiteProfile trong src/utils/assistant-learning.js giữ tên, mục đích, đối tượng và tên các ứng dụng.
Tên phải khớp index.html. Nội dung/đếm học liệu lấy từ Board published snapshot, ghi rõ scope
**Bảng học liệu**; không dùng số học liệu để suy số lớp, học sinh hoặc bảng điểm. Trợ lý có thể mô tả
sự tồn tại của ứng dụng riêng nhưng không được dùng context đó để lấy dữ liệu riêng.

README/OVERVIEW/SPEC và tài liệu V2 hiện hành dùng chuẩn này. KHTN8 Board là tên kỹ thuật/lịch sử
của ứng dụng Bảng học liệu và dữ liệu mẫu; không đổi repository, schema, module hay lịch sử kiểm thử.
R01–R28 gốc chủ yếu là yêu cầu Bảng học liệu, không được âm thầm mở rộng thành mọi ứng dụng của web.
Gradebook giữ brief, quyền truy cập và gate nghiệm thu riêng. Chỉ đạo mới của chủ sở hữu ưu tiên hơn
mô tả sản phẩm cũ; không sửa lại evidence cũ như thể đã kiểm thử theo định nghĩa mới.

Đợt correction chỉ chuẩn hóa profile/tài liệu và kiểm chứng hồi quy liên quan; không sửa business
logic Gradebook/Auth/Supabase, không deploy website hay bật AI công khai. Trạng thái thực thi mới nhất:
[STATUS](STATUS.md), [V2 acceptance](features/board-assistant/V2_ACCEPTANCE.md).
