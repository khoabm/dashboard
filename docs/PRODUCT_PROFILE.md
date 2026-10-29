# Định danh, mục đích và mô hình sản phẩm — Vui học cùng cô Quỳnh

> Cập nhật 2026-10-29. Tài liệu mô tả **toàn website**, không thay đặc tả nghiệp vụ, quyền truy cập hoặc điều kiện nghiệm thu riêng. Đọc [STATUS](STATUS.md) để xác định tính năng đã được kiểm chứng ở mức nào.

## 1. Tên gọi và ý nghĩa

- **Tên website chính thức:** **Vui học cùng cô Quỳnh** — được chủ sở hữu xác nhận, phù hợp tiêu đề trong `index.html`.
- **Mô hình được xác minh từ source:** một website tích hợp các ứng dụng hỗ trợ học tập, tổ chức học liệu và quản lý lớp/điểm theo quyền. Đây là **mô tả hiện trạng và công dụng từ code**, không tự động biến thành cam kết về tất cả tính năng hoặc trạng thái production.
- **KHTN8 Board:** tên lịch sử/kỹ thuật của **ứng dụng Bảng học liệu** từ giai đoạn đầu, gắn với nội dung mẫu Khoa học tự nhiên lớp 8; không phải tên chính thức hoặc giới hạn đối tượng của **toàn website**.
- **Trợ lý học liệu:** tính năng hỗ trợ người xem tại Bảng học liệu; không phải ứng dụng quản lý lớp và không đại diện cho toàn bộ website.

Cần phân biệt **thương hiệu website**, **ứng dụng**, **tính năng bên trong ứng dụng**, **module kỹ thuật** và **dữ liệu/đặc tả có quyền riêng**.

## 2. Mục đích và công dụng

**Mục đích tổng thể:** tạo một điểm truy cập web thống nhất giúp người dùng tìm và sử dụng học liệu; đồng thời cung cấp những quy trình quản lý lớp học, điểm số đã có trong source cho người được cấp quyền.

**Giá trị theo đối tượng:**

- **Người xem/học sinh:** đọc bài học được xuất bản, tìm theo chủ đề/tiêu đề/mô tả, mở các tài nguyên được công bố; có luồng **tra cứu điểm của chính mình sau xác minh**, không phải xem bảng điểm công khai.
- **Giáo viên/người quản lý có quyền:** quản lý nội dung Bảng học liệu; các màn hình quản lý lớp, danh sách học sinh, nhập/xử lý điểm theo chính sách quyền tương ứng. Source tồn tại không chứng minh nghiệp vụ đã vượt gate dữ liệu thật hoặc release.
- **Trợ lý học liệu:** giải thích các chức năng ở cấp mô tả công khai và hỗ trợ hỏi/tìm/tóm tắt văn bản học liệu published có căn cứ, không tự thực hiện ghi dữ liệu.

Đây là mô hình tích hợp nhiều ứng dụng, **không mặc định** có điểm danh, giao bài, liên lạc phụ huynh, thu phí, đa trường hoặc chức năng khác chưa được chỉ định. Nội dung mẫu KHTN8 không đặt giới hạn môn/lớp lên toàn website.

## 3. Mô hình thành phần hiện có

| Phân cấp | Thành phần và route | Công dụng có căn cứ từ source | Quyền và trạng thái |
| --- | --- | --- | --- |
| Website | **Vui học cùng cô Quỳnh** | Thương hiệu, điều hướng và vòng đời route: `index.html`, `src/app.js`, `src/components/site-navigation.js` | Một website có nhiều ứng dụng; quyền không chia sẻ tự động |
| Ứng dụng | **Bảng học liệu** — `/` | Xem/tìm/mở học liệu đã xuất bản; quản lý nội dung có quyền: `src/main.js`, `src/components/board.js` | Tên kỹ thuật lịch sử: KHTN8 Board; khách chỉ đọc published |
| Ứng dụng | **Bảng điểm cá nhân** — `/personal-gradebook` | Tra cứu thông tin điểm cá nhân: `src/components/student-lookup.js`, `src/app.js` | Phải xác minh; không cung cấp dữ liệu điểm công khai |
| Ứng dụng | **Quản lý bảng điểm và lớp** — `/personal-gradebook/admin` | Màn hình lớp/danh sách học sinh/điểm, nhập liệu: `src/components/gradebook-admin.js`, `src/app.js` | Có quyền phía server; route/menu không cấp quyền |
| Tính năng | **Trợ lý học liệu V2** trong Bảng học liệu | Thông tin website, thống kê Board published, tìm/giải thích/tóm tắt trong giới hạn văn bản: `src/utils/assistant-learning.js`, `workers/board-assistant/index.js` | Live hybrid Qwen/Board published, không truy cập Gradebook/Auth, tệp hoặc thao tác ghi |

Các đường dẫn trên được xác minh từ source. **Không được suy luận rằng mọi route/Edge/Worker đã được public deploy hoặc nghiệm thu dữ liệu thật.**

## 4. Ranh giới dữ liệu, quyền và AI

1. **Bảng học liệu:** người xem chỉ thấy bài `published`; quyền tạo/sửa/xóa thuộc người quản trị hợp lệ.
2. **Bảng điểm cá nhân:** chỉ xử lý dữ liệu riêng sau xác minh, không đưa danh sách học sinh/điểm vào nội dung công khai.
3. **Quản lý lớp/điểm:** kiểm tra quyền ở backend; tồn tại URL hoặc menu không đồng nghĩa được phép truy cập.
4. **Trợ lý live:** trả lời kiến thức chung và văn bản Board published; Worker tự đọc projection công khai bằng publishable key, không tin catalog từ client. Không đọc file bytes, ảnh/video, Gradebook/Auth hoặc có quyền ghi. Nguồn phù hợp có citation, kiến thức chung không bịa nguồn Board.
5. **Vận hành:** giữ0 USD, Workers/Workers AI Free là trần dịch vụ; chat live bật theo cấu hình, rate-limit3/10 giây tự phục hồi, không lifetime cap hoặc permanent error-stop. Gate Pilot cũ chỉ là lịch sử; không tự nâng gói hoặc thêm paid fallback.

## 5. Tài liệu và phạm vi áp dụng

- **PRODUCT_PROFILE.md (tài liệu này):** định danh, mục đích, ý nghĩa, đối tượng và mô hình toàn website.
- [OVERVIEW](OVERVIEW.md): entry point ngắn cho ChatGPT/Codex; [ARCHITECTURE](ARCHITECTURE.md): các module và ranh giới; [STATUS](STATUS.md): kết quả có bằng chứng, hạn chế và blockers.
- [SPEC R01–R28](SPEC.md): brief gốc **chủ yếu của Bảng học liệu và hạ tầng**, không tự áp dụng nghiệp vụ cho Gradebook.
- [Gradebook BRIEF](features/personal-gradebook/BRIEF.md) và [CHECKPOINTS](features/personal-gradebook/CHECKPOINTS.md): hợp đồng riêng cho dữ liệu điểm/lớp; [Board Assistant](features/board-assistant/README.md): hợp đồng và nghiệm thu AI.
- [DECISIONS](DECISIONS.md): **tên website** là quyết định chủ sở hữu đã xác nhận; mô hình đa ứng dụng nêu trên được đối chiếu từ code, không được nhầm với quyết định bổ sung tính năng mới.
- Không đổi source, database, route, technical IDs, lịch sử KHTN8 hay kết quả test cũ chỉ vì chuẩn hóa tên và overview.

## 6. Quy ước thuật ngữ

- Nói về **toàn website** → **Vui học cùng cô Quỳnh**.
- Nói về không gian bài học → **Bảng học liệu**; chỉ dùng **KHTN8 Board** khi chỉ dự án/tài liệu/mẫu lịch sử.
- Nói về điểm/lớp → **Bảng điểm cá nhân** hoặc **Quản lý bảng điểm và lớp**, luôn giữ ranh giới quyền.
- Nói về chatbot → **Trợ lý học liệu**, chỉ hỗ trợ dữ liệu công khai, không đại diện toàn website.
- **KHTN8** chỉ phục vụ truy vết tài liệu lịch sử, không là tên/khái niệm để người dùng tra cứu trong sản phẩm tương lai. Runtime assistant không cần FAQ hoặc intent cho tên cũ.
- Trợ lý có thể hướng dẫn công khai về chức năng, đường dẫn và bước xác minh của từng ứng dụng; không được xem/sửa dữ liệu điểm, lớp hoặc định danh cá nhân.
