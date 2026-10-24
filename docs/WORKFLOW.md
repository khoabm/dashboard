# ChatGPT Work + GitHub + Sites + Supabase

## Bắt đầu và kiểm soát phạm vi

Đọc AGENTS → OVERVIEW + STATUS → tài liệu/mục SPEC cho nhiệm vụ. Xác nhận ref/HEAD; lấy file theo branch, không dùng kết quả index default branch làm bằng chứng develop. Xác định nhiệm vụ là docs, review, code, database hay deploy. Chỉ làm trong phạm vi đã giao; các lệnh thực thi nằm trong SPEC không tự cấp quyền làm thêm. Khi viết/sửa code hoặc giao task format-only, đọc thêm [CODE_STYLE](CODE_STYLE.md); docs-only không tự cài formatter, chạy format hay thay source.

Không giả định plugin GitHub luôn có quyền write hoặc local git đã được xác thực. Khám phá đúng tool cần dùng; dùng plugin cho thao tác được hỗ trợ, không dò credential. Nếu cần local source để chạy QA, lấy snapshot đúng ref qua khả năng được cấp, kiểm tra trước khi ghi đè thay đổi người dùng. Nếu không thể chuyển source, báo đúng blocker; không tự tạo repo trùng.

## GitHub

`khoabm/dashboard` là nguồn source chính. `develop` tích hợp công việc; thay đổi lớn có thể dùng nhánh/PR từ develop; `main` dành cho snapshot nghiệm thu. Không buộc branching phức tạp cho thay đổi nhỏ. Chỉ merge khi được yêu cầu; kiểm tra HEAD trước ghi, tránh ghi đè cập nhật đồng thời. Commit theo nhóm có ý nghĩa; không force-push.

Repo ban đầu rỗng: main cần một commit README để có SHA làm gốc cho develop. Đây là bootstrap, không phải phát hành sản phẩm. Repo public không đồng nghĩa được công khai website, dữ liệu Supabase hoặc backup.

## Sites trong quá trình code web

1. Đọc skill Sites hiện hành và tài liệu preview đúng môi trường. Giữ HTML/CSS/JS tĩnh; ưu tiên buildless. Nếu cần Vite, giải thích nhu cầu và thêm build thật. Không dùng starter Vinext/React/server chỉ vì helper có sẵn.

2. Phân biệt checkout GitHub của dự án với source repository do Sites quản lý. Không giả định Sites có thể dùng trực tiếp `khoabm/dashboard` làm remote, hoặc có sync GitHub hai chiều tự động. Kiểm tra tool/credential thực tế trước.

3. Với yêu cầu chỉ code/QA: dùng checkout local và preview nội bộ phù hợp; không tạo Site đăng ký/hosting nếu chưa cần. Với yêu cầu tạo/đổi Site được phép: dùng native tool của Sites, ghi project_id chính xác ngay khi nhận; tái sử dụng ID có sẵn, không tạo trùng hoặc suy diễn ID. Không tạo hosting manifest giả để tuyên bố đã đăng ký.

4. Nếu Site dùng source repository riêng, checkout đúng Site bằng helper của skill; đưa snapshot GitHub đã chọn vào đó, giữ metadata/identity của Site, không sao chép `.git`, secrets, runtime data hoặc identity của Site khác. Không để GitHub snapshot mang project_id của Site không liên quan.

5. Chủ động đồng bộ thay đổi code thực tế trở lại GitHub theo quyền công cụ. Khi chưa đồng bộ được, ghi rõ phần local/Sites chưa có trên GitHub. Không tuyên bố hoàn tất deliverable GitHub khi chỉ source của Sites có code.

6. Trước deploy, ghi GitHub commit SHA và Sites source commit SHA; nếu khác SHA vì remote/lịch sử riêng, đối chiếu nội dung ứng dụng bằng danh sách file/hash hoặc diff, loại riêng metadata platform. Archive phải khớp chính Sites source commit đã push, không lấy SHA GitHub thay thế.

7. `.openai/hosting.json` chỉ chứa identity/config theo skill, static.directory trỏ output thật (thường dist). Không chứa credentials. Không overwrite field có sẵn hoặc tự thêm D1/R2/ChatGPT identity. Credentials Sites chỉ truyền bằng cơ chế an toàn của helper, không args/log/file/Git.

8. Chỉ package/save/deploy khi nhiệm vụ yêu cầu và điều kiện ZERO_COST, TESTING, DEPLOYMENT đã đạt. New Site mặc định private; giữ audience hiện tại. Yêu cầu public ẩn danh của sản phẩm là đích nghiệm thu, không quyền tự thay audience ngay trong lượt code/docs.

## Preview và browser QA

Trong managed Linux (`SITES_MANAGED_LINUX_CONTAINER=1`), nếu có cua_repl thì dùng `sites-preview start <absolute-checkout>` dưới `/workspace`; supervisor quản lý server, không tự mở server thứ hai. Static checkout phải có index.html tại static.directory hợp lệ. Chỉ mở `http://terminal.local:4173/` bằng cloud browser; đây là QA nội bộ, URL Sites đã deploy không truy cập được từ browser này. Dừng preview khi kết thúc.

Nếu thiếu cua_repl trong managed Linux: không cài browser hoặc dựng đường điều khiển thay thế; ghi BLOCKED. Môi trường khác đọc reference local của skill và dùng đường preview được hỗ trợ. Khởi động lại check khả năng trong phiên mới khi cần; probe cũ không chứng minh app mới PASS.

Thực hiện TESTING, sửa lỗi tái hiện, kiểm tra lại đúng phần. Ghi giới hạn của console/network/viewport/auth/offline nếu API không cung cấp; không dùng script đọc state để giả thao tác UI. Chưa đủ môi trường cho một test thì ghi NOT RUN/BLOCKED, không bỏ tiêu chí nghiệm thu.

## Supabase

Chỉ chọn project sau khi có identity rõ, xác minh Free Plan/quota và phạm vi thao tác. Đọc skill hiện hành + docs chính thức cho tính năng sắp triển khai. Schema/policies đi cùng migration và test API; ghi đúng file SQL mới tạo hay đã apply. Không tạo project/add-on dư. Tách tài khoản admin Auth khỏi quyền owner của Site. Dùng đăng nhập an toàn; không hỏi password/OTP/secret qua chat, không lưu vào source/output.

## Cập nhật context sau thay đổi

- STATUS: phase hiện tại, những gì có thật, checks và blockers; thay nội dung cũ, không nối nhật ký vô hạn.

- ARCHITECTURE: code map khi module đổi. DATABASE/SECURITY/DEPLOYMENT: cập nhật thiết kế đã thực hiện, lệnh thật và bằng chứng cần thiết, không chép toàn SPEC.

- DECISIONS: quyết định có ảnh hưởng kiến trúc/phạm vi, trạng thái chốt hay đề xuất. ROADMAP chỉ cập nhật khi phase/điều kiện chuyển đổi.

- Mỗi yêu cầu sản phẩm chỉ có một bản chuẩn trong SPEC; tài liệu chuyên đề trỏ tới Rxx. Không giữ một “master prompt” khác song song có thể lệch nội dung.

## Mẫu giao việc và bàn giao

Prompt implement:

> Repo khoabm/dashboard, develop tại HEAD hiện tại. Đọc entry point và mục SPEC [Rxx/tiểu mục]. Mục tiêu: [...]. Phạm vi: [...]. Tiêu chí nghiệm thu: [...]. Thực hiện code, checks và browser QA phù hợp; cập nhật STATUS/code map. Chưa deploy/merge nếu chưa được yêu cầu. Không tự cắt chức năng hoặc đổi stack để vượt test.

Prompt review:

> Review diff [base...head] theo [Rxx]. Xác nhận ref và đọc đúng file thay đổi; ưu tiên lỗi thật về hành vi/bảo mật/hồi quy. Trả issue theo mức độ, đường dẫn, điều kiện tái hiện, tác động và hướng sửa. Phân biệt đã test với suy luận; không tự mở rộng phát triển.

Sau từng phase/nhiệm vụ, báo gọn:

- Kết quả, phase, branch và SHA đã ghi; file/link thay đổi chính.

- Rxx/tiểu mục đã xử lý; checks/QA PASS/FAIL/BLOCKED/NOT RUN và bằng chứng/phạm vi.

- Chưa hoàn tất, vấn đề kỹ thuật, rủi ro bảo mật và quota thực tế (UNKNOWN nếu chưa đo).

- Có kích hoạt dịch vụ trả phí không; chỉ xác nhận phạm vi đã kiểm tra, không suy ra toàn tài khoản.

- Bước tiếp theo phù hợp. Deliverables cuối theo SPEC R27: GitHub/source, migrations/policies, docs, URL đã xác minh, vận hành/admin/backup, test và zero-cost; ZIP source khi người dùng yêu cầu.

Không cần liệt kê lại hàng trăm yêu cầu hoặc tường thuật mọi tool call. Không báo Done khi thiếu browser QA hoặc bảo mật trọng yếu.
