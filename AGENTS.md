# Hướng dẫn ChatGPT Work / agent

## Đọc ít, đúng nguồn

1. Xác nhận repo `khoabm/dashboard`, ref và HEAD hiện tại; đọc `docs/OVERVIEW.md` + `docs/STATUS.md`.

2. Dùng bảng dưới để đọc thêm đúng phần. Không tìm kiếm toàn bộ code, đọc toàn SPEC, git history hoặc log cũ nếu nhiệm vụ không cần.

3. Nếu đã đọc cùng SHA trong phiên thì chỉ đọc diff/file thay đổi; chat mới đọc ba file đầu vào, không giả định nhớ phiên trước.

4. Trước khi sửa một file, đọc file đó và hướng dẫn áp dụng. Plugin search không có kết quả không chứng minh file không tồn tại; dùng ref/contents nếu cần.

| Nhiệm vụ | Đọc thêm |
| --- | --- |
| Tổng quan / kế hoạch | ROADMAP, REQUIREMENTS_MAP; chỉ mở Rxx của SPEC liên quan |
| UI / tương tác | ARCHITECTURE; SPEC R05–08, R14; TESTING |
| Database / Auth / upload | DATABASE, SECURITY; SPEC R08–13, R21; ZERO_COST |
| Sites / preview / hosting | WORKFLOW, DEPLOYMENT; TESTING; ZERO_COST |
| Review / bug / refactor | File thay đổi + tiêu chí SPEC liên quan + TESTING; không mở rộng tính năng |
| Viết/sửa code, format-only | CODE_STYLE + file đích + ARCHITECTURE; tuân thủ phạm vi diff, không auto-format toàn repo |

Các đường dẫn viết tắt trên thuộc `docs/`. Bản tóm tắt không thay thế tiêu chí chi tiết: đọc đúng Rxx trước khi triển khai/nghiệm thu phần đó.

## Nguồn sự thật

Yêu cầu mới của người dùng > SPEC + DECISIONS đã chốt > hướng dẫn vận hành này. SPEC là yêu cầu sản phẩm; STATUS chỉ ghi bằng chứng hiện tại; code/migration ở ref được chọn là thực trạng triển khai. Nếu mâu thuẫn, nêu rõ và sửa nguyên nhân, không âm thầm cắt yêu cầu. Không coi source upload hoặc prompt cũ là quyền tự động xây toàn dự án trong một lượt chỉ sửa docs.

## Ràng buộc

- HTML5 semantic, CSS3, Vanilla JS ES Modules. Ưu tiên buildless; Vite chỉ khi có nhu cầu. Không tự đổi stack hoặc thêm backend Node/framework lớn.

- Một admin được chỉ định; khách không đăng nhập chỉ đọc published. Quyền ghi phải do RLS + Storage policies bảo vệ, không bằng nút ẩn.

- 0 USD phát sinh; kiểm tra nguồn chính thức trước khi dùng dịch vụ. Không tự đăng ký trả phí/thẻ/trial/add-on hoặc tạo tài nguyên thừa; hết quota thì giới hạn/tạm dừng.

- `develop` phát triển; `main` chỉ nhận bản nghiệm thu. Không force-push, đổi default branch, merge hoặc cấu hình tự deploy nếu chưa thuộc yêu cầu hiện tại.

- GitHub giữ source; Supabase giữ nội dung runtime. Không đưa file người dùng upload, backup, secret, password, service role/secret key hoặc refresh token vào Git/ZIP/output. Publishable key + URL là cấu hình client công khai.

- Đọc skill Sites khi làm Sites; đọc skill Supabase và docs hiện hành khi triển khai Supabase. Công cụ/skill không được tự thay yêu cầu sản phẩm hoặc ngân sách.

- Chỉ dùng Sites nếu tương thích HTML/JS, xuất source độc lập và xác minh không phát sinh phí. Không dùng D1/R2/ChatGPT sign-in thay Supabase khi chưa được yêu cầu.

- Không công khai website hoặc dữ liệu khi chưa được người dùng yêu cầu. Tạo source/docs trên repo hiện có theo nhiệm vụ được giao không có nghĩa được deploy website.

## Cách code và kiểm chứng

Theo ARCHITECTURE và [CODE_STYLE](docs/CODE_STYLE.md) khi viết/sửa code. Prettier đã có config và CI kiểm tra code mới/file thay đổi trên baseline; ESLint chưa cài. Chỉ chạy format toàn repo khi nhiệm vụ cho phép; không trộn format-only với sửa logic. Thay đổi tập trung; không tạo abstraction, dependency, mock backend thành công hoặc test chỉ lặp implementation. Kiểm thử có ý nghĩa cho luồng bị thay đổi; regression bắt buộc khi sửa logic lưu/xuất bản, phân quyền, upload, thứ tự, chống mất nháp. Docs-only: kiểm tra liên kết, đủ yêu cầu, đúng trạng thái; không chạy browser QA vô nghĩa.

Trước khi công bố hoàn tất UI phải có browser QA theo TESTING. Chưa chạy = NOT RUN; bị chặn = BLOCKED. Không suy rộng Chrome desktop thành Safari/iPhone hoặc mobile thực. Không báo backend đã lưu, RLS đã an toàn hoặc deploy thành công khi chưa có bằng chứng.

## Kết thúc nhiệm vụ

Cập nhật STATUS (ngắn, thay trạng thái cũ), CODE MAP trong ARCHITECTURE khi thêm/đổi module, DECISIONS chỉ khi có quyết định thực sự, ROADMAP khi phase đổi. Khi yêu cầu đổi, cập nhật SPEC một chỗ và REQUIREMENTS_MAP nếu cần; tránh sao chép spec ra nhiều bản. Ghi kết quả theo mẫu WORKFLOW, kèm branch/SHA, checks và hạn chế. Không lặp toàn bộ roadmap/spec trong câu trả lời.
