# KHTN8 Board

Website học liệu Khoa học tự nhiên lớp 8, bố cục cột như Padlet. Một quản trị viên biên tập; người xem ẩn danh chỉ đọc. HTML/CSS/Vanilla JS + Supabase Free, ngân sách dịch vụ phát sinh **0 USD**.

**Trạng thái:** mới thiết lập tài liệu trên `develop`; chưa có ứng dụng, database hoặc deployment. Repo: `khoabm/dashboard`. `main` mới có commit khởi tạo.

## Bắt đầu một phiên ChatGPT Work

Đọc [AGENTS.md](AGENTS.md), [OVERVIEW](docs/OVERVIEW.md) và [STATUS](docs/STATUS.md), sau đó chọn tài liệu theo bảng trong AGENTS. Không đọc toàn repo hoặc toàn SPEC mỗi lượt.

Prompt ngắn dùng cho chat mới:

> Làm việc với repo khoabm/dashboard, nhánh develop. Đọc AGENTS.md, docs/OVERVIEW.md và docs/STATUS.md ở HEAD hiện tại. Giải thích ngắn mục tiêu, trạng thái có bằng chứng, và bước tiếp theo. Chỉ đọc thêm tài liệu/code liên quan nhiệm vụ; giữ các ràng buộc 0 USD, HTML/CSS/JS, Supabase và quy trình Sites. Nhiệm vụ lượt này: [điền nhiệm vụ]. Không triển khai công khai khi tôi chưa yêu cầu.

## Tài liệu

- [Đặc tả đầy đủ](docs/SPEC.md) và [bản đồ yêu cầu](docs/REQUIREMENTS_MAP.md).

- [Kiến trúc/cách code](docs/ARCHITECTURE.md), [database](docs/DATABASE.md), [bảo mật](docs/SECURITY.md).

- [Quy trình Work + Sites](docs/WORKFLOW.md), [QA](docs/TESTING.md), [triển khai](docs/DEPLOYMENT.md).

- [Roadmap](docs/ROADMAP.md), [chi phí](docs/ZERO_COST.md), [quyết định](docs/DECISIONS.md), [đối chiếu brief](docs/ADAPTATION_AUDIT.md).

Chưa có lệnh install/dev/build/test để chạy. Thêm lệnh thật vào README khi triển khai; không ghi script giả hoặc tạo bộ khung framework chỉ để đủ cây thư mục. Source và tài liệu thuộc GitHub; học liệu phát sinh lúc chạy thuộc Supabase. Có thể xuất ZIP source khi được yêu cầu, không đóng gói secrets hay dữ liệu người dùng.
