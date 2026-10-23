# MASTER PROMPT — KHTN8 BOARD

> Nguồn yêu cầu chuẩn, không phải báo cáo tính năng đã hoàn thành. Chuyển từ “Pasted text(1).txt” do người dùng cung cấp ngày 2026-10-23. Giữ đủ 28 nhóm yêu cầu; thay phần hosting cũ theo yêu cầu mới. Mọi chỉ dẫn “bắt đầu triển khai” bên dưới chỉ áp dụng khi nhiệm vụ hiện tại cho phép xây ứng dụng, không tự mở rộng một lượt chỉ sửa tài liệu. Xem [bản đồ truy vết](REQUIREMENTS_MAP.md), [trạng thái](STATUS.md) và [quy trình Work](WORKFLOW.md).

Full-stack Development Specification — Zero-Cost Architecture

**Version:** 1.1 (chuẩn hóa từ brief người dùng; bỏ nhà cung cấp hosting cũ, bổ sung Work + Sites).

**Project:** KHTN8 Board – Không gian học liệu Khoa học tự nhiên lớp 8

**Reference UI:** https://padlet.com/nguyquynh01/khoa-hoc-tu-nhien-k8-kdv5ggxf7schpqyb

---

<a id="r01"></a>

## I. VAI TRÒ VÀ MỤC TIÊU

Bạn đóng vai trò là Senior Full-stack Engineer, UI/UX Designer, Software Architect, QA Engineer và DevOps Engineer.

Nhiệm vụ là thiết kế, phát triển, kiểm thử và hỗ trợ triển khai một website học liệu số mang tên **KHTN8 Board**, dựa trên cấu trúc bảng học liệu kiểu Padlet.

Website có một người quản trị duy nhất và cho phép người xem truy cập công khai mà không đăng nhập.

Yêu cầu trọng tâm:

1. Giữ bố cục và cảm giác sử dụng tương tự Padlet dạng bảng cột.

2. Sử dụng wireframe quản trị đã được thống nhất làm cơ sở giao diện chính.

3. Hỗ trợ quản trị viên thêm, sửa, xóa, sắp xếp bài đăng và tài liệu trực tiếp trên website.

4. Nội dung được lưu tập trung, đồng bộ với mọi người xem trên các thiết bị.

5. Khởi tạo nội dung bằng placeholder, chưa cần học liệu thực tế.

6. Sử dụng GitHub Free và Supabase Free; quy trình frontend theo ChatGPT Work + Sites tại docs/WORKFLOW.md.

7. Không phát sinh chi phí trong quá trình thiết kế, phát triển, kiểm thử và vận hành theo phạm vi được kiểm soát.

8. Bảo đảm mã nguồn rõ ràng, có thể bảo trì và mở rộng về sau.

9. Chưa phát triển hệ thống bình luận, đăng bài ẩn danh hoặc tương tác nhiều người, nhưng cần dự trù khả năng mở rộng.

Không sao chép toàn bộ tính năng Padlet. Chỉ triển khai các chức năng nằm trong phạm vi yêu cầu.

<a id="r02"></a>

## II. NGUYÊN TẮC ZERO-COST — RÀNG BUỘC TUYỆT ĐỐI

**Ngân sách tối đa được phép sử dụng: 0 USD.**

Đây là điều kiện bắt buộc, có mức ưu tiên cao hơn các yêu cầu tính năng.

### 2.1. Dịch vụ được phép sử dụng

- GitHub Free: lưu trữ và quản lý mã nguồn.

- Supabase Free: PostgreSQL, Authentication, Storage và Realtime.

- Thư viện JavaScript mã nguồn mở, miễn phí, có giấy phép phù hợp.

- CDN miễn phí nếu không yêu cầu thanh toán và không ảnh hưởng đáng kể đến độ ổn định.

- Công cụ kiểm thử miễn phí.

- localStorage và IndexedDB của trình duyệt.

### 2.2. Những hành động bị cấm

- Không nâng cấp Supabase lên Pro.

- Không mua tên miền riêng.

- Không kích hoạt add-on trả phí hoặc tài nguyên tính phí.

- Không đăng ký hoặc tự động sử dụng dịch vụ yêu cầu thẻ thanh toán.

- Không tạo nhiều project, deployment hoặc tài nguyên dư thừa gây nguy cơ vượt hạn mức.

- Không sử dụng OpenAI API, API nhận diện AI hoặc các API tính phí.

- Không kích hoạt dịch vụ giám sát, analytics, email, storage hoặc CI/CD trả phí.

- Không sử dụng plugin ChatGPT để thực hiện thao tác tính phí.

- Không tự động đồng ý bản dùng thử yêu cầu chuyển sang gói trả phí.

- Không dùng các giải pháp né giới hạn hoặc tạo lưu lượng giả để duy trì gói miễn phí.

Nếu bất kỳ yêu cầu nào không thể thực hiện trong phạm vi miễn phí, phải:

1. Xác định rõ nguyên nhân.

2. Đề xuất phương án miễn phí thay thế.

3. Giữ nguyên các chức năng đã hoạt động.

4. Không tự nâng cấp hoặc chi tiêu.

5. Báo cáo những hạn chế không thể khắc phục trong phạm vi 0 USD.

### 2.3. Kiểm soát quota

Cần kiểm tra giới hạn chính thức của GitHub, Supabase và nền tảng hosting được chọn tại thời điểm triển khai.

Thiết lập các ngưỡng cảnh báo ở mức ứng dụng đối với:

- Dung lượng Storage.

- Dung lượng Database.

- Băng thông.

- Số lượng tài nguyên.

- Tải lên tệp.

- Realtime connections/messages nếu sử dụng.

- Lượng build/deployment.

Ưu tiên cảnh báo từ 70%, cảnh báo nghiêm trọng từ 85–90%, và chủ động chặn chức năng có nguy cơ vượt giới hạn khi có đủ dữ liệu đáng tin cậy.

Không coi việc cảnh báo phía frontend là cơ chế bảo đảm quota tuyệt đối. Phải sử dụng thêm giới hạn của nhà cung cấp khi được hỗ trợ.

Nếu không thể đo chính xác một quota bằng công cụ miễn phí, phải nêu rõ và không đưa ra cam kết sai về mức sử dụng.

Chấp nhận việc hệ thống bị giới hạn hoặc tạm dừng khi vượt quota, thay vì phát sinh chi phí.

<a id="r03"></a>

## III. TECH STACK BẮT BUỘC

### 3.1. Frontend

- HTML5 semantic.

- CSS3.

- Vanilla JavaScript ES Modules.

- Responsive design với CSS Grid và Flexbox.

- CSS custom properties cho design tokens.

- Không dùng React, Next.js, Vue hoặc framework SPA lớn nếu không chứng minh được nhu cầu thực tế.

- Không phụ thuộc vào serverless functions cho các thao tác có thể thực hiện an toàn qua Supabase client.

- Ưu tiên website tĩnh, có thể chạy và build với cấu hình đơn giản.

Có thể sử dụng Vite để quản lý môi trường phát triển, bundle và build nếu cần. Vite phải xuất frontend tĩnh, có thể triển khai độc lập và tương thích quy trình Sites.

### 3.2. Backend as a Service

Supabase Free:

- PostgreSQL: dữ liệu.

- Supabase Auth: một tài khoản quản trị.

- Supabase Storage: ảnh và tài liệu.

- Supabase Realtime: đồng bộ dữ liệu nếu phù hợp quota.

- Row Level Security: kiểm soát quyền truy cập.

- Storage Policies: kiểm soát tải và xóa file.

Không bổ sung backend Node.js độc lập trừ khi có lý do kỹ thuật hoặc bảo mật thực sự cần thiết và được giải trình.

### 3.3. Hosting và mã nguồn

- GitHub Free làm nguồn mã chính.

- Một repository cho dự án.

- Nhánh `main` dùng cho production.

- Feature branches hoặc pull requests cho thay đổi quan trọng.

- ChatGPT Work + Sites hỗ trợ xây dựng và kiểm tra frontend tĩnh theo docs/WORKFLOW.md.

- Deploy từ repository.

- Dùng URL mặc định của nền tảng hosting đã được xác minh miễn phí.

- Không cần mua domain.

- Không bắt buộc analytics hoặc dịch vụ đo hiệu năng bên ngoài.

<a id="r04"></a>

## IV. CÔNG CỤ CHATGPT VÀ PLUGIN

Kiểm tra trạng thái các tích hợp GitHub, Supabase và Sites trước khi sử dụng.

### GitHub

Nếu plugin GitHub có sẵn và được người dùng kết nối:

- Kiểm tra repository.

- Tạo và cập nhật file khi được phép.

- Quản lý branches.

- Kiểm tra commits và pull requests.

- Hỗ trợ debug lỗi CI/CD.

Nếu plugin không hỗ trợ thao tác yêu cầu, sử dụng cách tiếp cận phù hợp khác hoặc cung cấp file nguồn và hướng dẫn rõ ràng.

### Supabase

Nếu tích hợp Supabase khả dụng:

- Kiểm tra dự án đang ở Free Plan.

- Đọc schema và cấu hình hiện có.

- Tạo migration nếu được phép.

- Cấu hình RLS.

- Kiểm thử policies.

- Không tạo dịch vụ hoặc add-on trả phí.

Không xuất hiện database password, service_role key, refresh token hoặc bí mật khác trong output, repository hay frontend.

### ChatGPT Work và Sites

Ưu tiên ChatGPT Work cho:

- Phân tích dự án.

- Thực hiện các bước triển khai.

- Quản lý mã nguồn.

- Kiểm thử website bằng trình duyệt.

- Đối chiếu giao diện với wireframe.

- Hỗ trợ xử lý lỗi.

Chỉ sử dụng Sites nếu đã xác minh khả năng tương thích với repository, JavaScript modules, Supabase và quy trình deployment.

Sites là công cụ hỗ trợ được ưu tiên trong ChatGPT Work; sản phẩm không phụ thuộc Sites để chạy, bảo trì hoặc xuất mã nguồn. Nếu gây xung đột, thiếu khả năng xuất mã nguồn hoặc yêu cầu trả phí, loại bỏ khỏi workflow mà không ảnh hưởng kiến trúc chính.

Mọi hành động kết nối tài khoản và thay đổi có ảnh hưởng lớn đến dữ liệu phải tuân theo quyền được cấp. Không tự ý xóa dữ liệu production, repository hoặc tài nguyên của người dùng.

<a id="r05"></a>

## V. GIAO DIỆN VÀ TRẢI NGHIỆM

### 5.1. Định hướng chung

Thiết kế giao diện sáng, dễ nhìn, thân thiện với học sinh.

Phong cách:

- Padlet-like column board.

- Các cột chủ đề theo hàng ngang.

- Thẻ tài liệu bo góc.

- Màu pastel phân biệt chủ đề.

- Nền xanh xám nhạt.

- Khoảng cách nhất quán.

- Chữ tiếng Việt rõ ràng.

- Tối ưu desktop và smartphone.

- Hoạt ảnh nhẹ.

- Không lạm dụng hiệu ứng.

Sử dụng ảnh placeholder hợp pháp, không phụ thuộc vào ảnh bản quyền lấy từ Padlet.

### 5.2. Desktop wireframe

Header:

- Logo/icon KHTN.

- Tiêu đề KHOA HỌC TỰ NHIÊN – 8.

- Mô tả ngắn.

- Thanh tìm kiếm.

- Nút tùy chọn và truy cập quản trị.

- Trạng thái đồng bộ khi ở chế độ quản trị.

Board:

- Các cột học liệu nằm ngang.

- Tiêu đề cột có nền màu riêng.

- Mỗi cột chứa nhiều post card.

- Card có thể chứa thumbnail, tiêu đề, mô tả ngắn, loại tài nguyên.

- Các thẻ có chiều cao linh hoạt.

- Cột có thể cuộn dọc nếu cần.

- Board cuộn ngang khi không đủ diện tích.

- Không bóp nhỏ các cột đến mức mất khả năng đọc.

Gợi ý:

- Chiều rộng cột 300–340px.

- Bo góc 10–16px.

- Khoảng cách thẻ 12–16px.

- Shadow nhẹ.

- Màu chữ tương phản rõ.

### 5.3. Mobile wireframe

- Header đơn giản.

- Thanh tìm kiếm có thể thu gọn.

- Chọn chủ đề bằng tabs hoặc dropdown.

- Hiển thị một cột nội dung dễ đọc.

- Không ép người dùng cuộn ngang toàn trang để đọc chữ.

- Các nút chức năng có vùng chạm đủ lớn.

- Form thêm/sửa bài chiếm màn hình phù hợp.

- Nút thêm bài ở vị trí thuận tiện cho quản trị viên.

- Không tạo lỗi tràn chiều ngang.

### 5.4. Placeholder

Khởi tạo:

- 01 bảng KHTN8.

- 03 cột mẫu: Chủ đề 01, Chủ đề 02, Chủ đề 03.

- Mỗi cột có 02 bài mẫu.

- Bài mẫu có thể đại diện cho văn bản, hình ảnh, tài liệu, video YouTube và liên kết.

- Tất cả dữ liệu phải có nhãn placeholder rõ ràng.

- Có thể thay hoặc xóa toàn bộ placeholder bằng giao diện quản trị.

- Không tạo học liệu khoa học có vẻ như nội dung chính thức nếu chưa được người dùng cung cấp.

<a id="r06"></a>

## VI. COMPONENT SPECIFICATION

Tổ chức giao diện theo component JavaScript tái sử dụng.

Các component tối thiểu:

1. AppHeader.

2. SearchBar.

3. BoardContainer.

4. SectionColumn.

5. PostCard.

6. PostPreviewModal.

7. AttachmentGallery.

8. DocumentPreview.

9. VideoEmbed.

10. AdminToolbar.

11. PostEditorDrawer.

12. SectionEditor.

13. AttachmentUploader.

14. ConfirmDialog.

15. ToastNotification.

16. LoadingState.

17. EmptyState.

18. ErrorState.

19. SyncIndicator.

20. LoginScreen.

Component phải tách biệt logic, không lặp code không cần thiết.

<a id="r07"></a>

## VII. CHỨC NĂNG PUBLIC

Người xem không cần đăng nhập.

Phải có:

- Xem bảng học liệu.

- Duyệt các chủ đề.

- Mở bài đăng.

- Xem ảnh.

- Phóng to ảnh.

- Xem PDF nếu trình duyệt hỗ trợ.

- Tải hoặc mở tài liệu.

- Truy cập link ngoài.

- Xem video YouTube được nhúng khi khả dụng.

- Tìm kiếm tiêu đề, mô tả và chủ đề.

- Hiển thị trạng thái không có kết quả.

- Responsive desktop/mobile.

Không có:

- Đăng bài công khai.

- Bình luận.

- Like.

- Upload của học sinh.

- Đăng nhập học sinh.

- Thống kê cá nhân học sinh.

- Chat.

- AI assistant.

- Thanh toán.

Các tính năng trên chỉ là khả năng mở rộng trong tương lai.

<a id="r08"></a>

## VIII. CHỨC NĂNG ADMIN

Chỉ một tài khoản được chỉ định có quyền biên tập.

### 8.1. Đăng nhập

- Dùng Supabase Auth.

- Không mở đăng ký tài khoản tự do.

- Tài khoản quản trị được xác định bằng User ID có quyền rõ ràng.

- Không chỉ dựa vào ẩn/hiện nút chức năng.

- Các thao tác ghi bắt buộc được RLS kiểm soát.

- Người dùng chưa đăng nhập chỉ được xem dữ liệu công khai.

### 8.2. Quản lý cột

Quản trị viên có thể:

- Tạo cột.

- Sửa tiêu đề cột.

- Sửa mô tả.

- Thay màu cột.

- Đổi thứ tự.

- Xóa cột khi được xác nhận.

- Di chuyển bài đăng giữa các cột.

Nếu cột chứa bài đăng, phải cảnh báo trước khi xóa và tránh xóa dây chuyền ngoài ý muốn.

### 8.3. Quản lý bài đăng

Quản trị viên có thể:

- Tạo bài mới.

- Sửa bài.

- Xóa mềm bài.

- Khôi phục bài đã xóa nếu còn thời hạn.

- Chuyển bài giữa các cột.

- Thay đổi vị trí bài.

- Xem trước trước khi xuất bản.

- Lưu nháp.

- Xuất bản.

- Ẩn bài khỏi người xem.

Các trạng thái:

- draft

- published

- hidden

- deleted

Chỉ published được hiển thị công khai.

Mặc định triển khai hiện tại: khôi phục trong 30 ngày, khôi phục về draft; không tự purge. Cột có bất kỳ bài nào (kể cả deleted) bị chặn xóa bằng FK restrict, cần chuyển bài sang cột khác. Đây là mặc định có thể review, không phải yêu cầu mở rộng tính năng.

### 8.4. Form tạo bài

Các trường:

- Tiêu đề (bắt buộc).

- Chủ đề (bắt buộc).

- Nội dung/mô tả.

- Danh sách tài nguyên.

- Thumbnail.

- Trạng thái xuất bản.

- Vị trí sắp xếp.

Form desktop dùng drawer bên phải.

Form mobile dùng full-screen editor.

Có các nút:

- Hủy.

- Lưu nháp.

- Xem trước.

- Đăng bài/Lưu thay đổi.

### 8.5. Thêm liên kết

Hỗ trợ:

- Website HTTPS.

- YouTube.

- Google Drive links ở chế độ chia sẻ phù hợp.

- Google Docs/Sheets/Slides.

- Liên kết mô phỏng hoặc học liệu bên ngoài.

Kiểm tra URL.

Không cho phép `javascript:`, `data:` hoặc URL nguy hiểm.

Liên kết bên ngoài được mở an toàn, không làm mất trang học liệu hiện tại.

### 8.6. Hình ảnh

- Tải lên nhiều ảnh.

- JPG, PNG, WebP.

- Giới hạn nhỏ hơn 2 MB mỗi ảnh; quy ước byte của implementation: <2.000.000 byte, provider maximum 1.999.999 byte.

- Có preview trước upload.

- Có thể thay và xóa riêng từng ảnh.

- Có thể đổi thứ tự ảnh.

- Nén ảnh tại trình duyệt khi phù hợp.

- Không tự động upscale ảnh.

- Không sử dụng dịch vụ AI chỉnh sửa ảnh trả phí.

- Có fallback khi ảnh lỗi.

### 8.7. Tài liệu

Cho phép:

- PDF.

- DOCX.

- PPTX.

- XLSX nếu đáp ứng chính sách upload an toàn.

Mỗi file phải nhỏ hơn 2 MB.

Tối đa mặc định 10 file cho mỗi bài.

Không tải file vào localStorage dưới dạng Base64.

PDF ưu tiên trình xem native hoặc PDF.js nếu cần.

DOCX, PPTX, XLSX không bắt buộc xem trực tiếp; có thể mở hoặc tải xuống.

### 8.8. Video

MVP chỉ hỗ trợ:

- YouTube URL.

- Liên kết video ngoài hợp lệ.

Có thumbnail hoặc placeholder.

Không upload video gốc lên Supabase trong bản đầu.

Không sử dụng video transcoding trả phí.

Thumbnail implementation tham chiếu attachment ảnh cùng bài; khi thay file dùng path ngẫu nhiên mới. Lưu bài và danh sách metadata là transaction có expected_version, sắp xếp bài là transaction kiểm phiên bản.

### 8.9. Lưu nháp và chống mất dữ liệu

- Autosave bản nháp cục bộ có debounce.

- Không tự động xuất bản.

- Cho phép khôi phục nội dung nháp.

- Phát hiện thay đổi chưa lưu.

- Cảnh báo trước khi rời form.

- Không ghi mật khẩu hoặc token vào dữ liệu bản nháp.

- Dùng IndexedDB nếu cần lưu blob tạm.

<a id="r09"></a>

## IX. DATABASE DESIGN

Sử dụng Supabase PostgreSQL.

Các bảng:

### boards

- id

- title

- description

- settings

- created_at

- updated_at

### sections

- id

- board_id

- title

- description

- color

- sort_order

- created_at

- updated_at

### posts

- id

- section_id

- title

- body

- status

- sort_order

- version

- created_at

- updated_at

- deleted_at

### attachments

- id

- post_id

- type

- storage_path

- external_url

- file_name

- mime_type

- size_bytes

- sort_order

- created_at

### admin_profiles

- user_id

- role

- active

### audit_logs

- id

- actor_id

- action

- target_id

- created_at

Có thể tinh chỉnh trường dữ liệu sau khi thiết kế schema thực tế, nhưng phải giữ nguyên ý nghĩa và khả năng mở rộng.

Các bảng phải có primary key, foreign key, index hợp lý.

Không lạm dụng JSONB nếu quan hệ dữ liệu cần truy vấn và phân quyền riêng.

Dùng migration SQL có thể version control.

<a id="r10"></a>

## X. SECURITY SPECIFICATION

Đây là yêu cầu bắt buộc.

1. Bật RLS trên tất cả các bảng có dữ liệu ứng dụng.

2. Public chỉ được SELECT dữ liệu published.

3. Admin mới được INSERT/UPDATE/DELETE theo chính sách.

4. RLS phải kiểm tra người dùng được phép, không chỉ kiểm tra `authenticated`.

5. Không đưa service_role key vào frontend.

6. Không commit file `.env.local`.

7. Chỉ đưa public anon/publishable key vào client.

8. Không lưu thông tin nhạy cảm trong localStorage.

9. Storage upload/delete chỉ được admin thực hiện.

10. Áp dụng giới hạn dung lượng và định dạng file.

11. Kiểm tra dữ liệu đầu vào.

12. Render nội dung người dùng theo cách chống XSS.

13. Không thực thi HTML tùy ý do người dùng nhập.

14. Thiết lập Content Security Policy phù hợp với các nguồn tài nguyên sử dụng.

15. Không mở CORS quá rộng cho các API tự tạo.

16. Dữ liệu nháp phải không bị người xem truy cập.

17. Không cho người xem tải lên file hay thực hiện thao tác ghi.

18. Kiểm thử truy cập trái phép trực tiếp vào Supabase API, không chỉ qua giao diện.

19. Không coi hidden UI là phân quyền.

20. Mọi thay đổi có tác động phá hủy dữ liệu phải có xác nhận.

Ưu tiên tránh tạo API backend riêng.

Nếu cần server-side operation có quyền đặc biệt, phải chứng minh rằng giải pháp có thể hoạt động trong Free Plan và không để lộ thông tin nhạy cảm.

<a id="r11"></a>

## XI. STORAGE DESIGN

Sử dụng Supabase Storage Free.

Đề xuất:

- Một bucket tài nguyên học liệu.

- Chỉ phục vụ file đã xuất bản cho người xem.

- File nháp không được công khai.

- Tệp có tên lưu trữ bằng ID ngẫu nhiên.

- Lưu tên gốc trong metadata.

- Có cơ chế thay file và dọn file không còn được tham chiếu.

Cân nhắc bucket private với signed URLs nếu cần bảo vệ file nháp. Nếu sử dụng public bucket cho tài nguyên xuất bản, bảo đảm không upload file chưa xuất bản vào vùng công khai.

Khi một bài có nhiều tệp:

- Upload tệp trước.

- Kiểm tra kết quả.

- Lưu metadata.

- Chỉ chuyển bài sang published sau khi tài nguyên đã sẵn sàng.

- Nếu có lỗi giữa chừng, phải có phương án hoàn tác hoặc dọn tài nguyên thừa.

Không giả định Storage và Database là một transaction nguyên tử.

Mặc định triển khai: bucket private, file path bất biến; signed URL 60 giây. Sau hidden/deleted, URL đã ký có thể còn dùng tối đa thời hạn đó; bytes đã tải/cached không thu hồi được. Cleanup chỉ xóa path đã xác minh không còn tham chiếu.

<a id="r12"></a>

## XII. LOCAL STORAGE

Sử dụng localStorage cho:

- Bản nháp văn bản.

- Chủ đề đang chọn.

- Tùy chọn giao diện.

- Trạng thái tìm kiếm/lọc.

- Một số tùy chọn người dùng không nhạy cảm.

Sử dụng IndexedDB khi cần lưu Blob/File tạm.

Không lưu:

- Tệp lớn dưới dạng Base64 trong localStorage.

- Database credentials.

- Service role keys.

- Mật khẩu.

- Dữ liệu được coi là nguồn sự thật chính thức.

Nguồn dữ liệu chính phải là Supabase.

<a id="r13"></a>

## XIII. ĐỒNG BỘ DỮ LIỆU

Website phải bảo đảm sau khi quản trị viên đăng bài, thiết bị khác có thể nhận dữ liệu mới.

Ưu tiên:

1. Lưu dữ liệu tập trung.

2. Làm mới dữ liệu sau thao tác ghi thành công.

3. Realtime subscription nếu phù hợp giới hạn miễn phí.

4. Đồng bộ lại khi ứng dụng trở về trạng thái active.

5. Có phương án tải lại hoặc refresh thủ công khi realtime bị ngắt.

Không sử dụng polling liên tục với tần suất cao.

Implementation hiện tại chọn fetch sau ghi, khi mở trang, khi tab active sau ít nhất 30 giây và refresh thủ công; chưa dùng Realtime. Người đang giữ tab mở không tự nhận cập nhật ngay nếu không refresh/quay lại tab.

Chỉ subscribe vào dữ liệu published cần thiết.

Tránh tải lại toàn bộ Storage hoặc tải lại file gốc khi chỉ metadata thay đổi.

Có thể dùng chiến lược chỉ fetch nội dung bị ảnh hưởng.

Nếu cần đơn giản hóa để giữ quota miễn phí, được phép giảm realtime subscription và ưu tiên fetch khi mở/tải lại trang, nhưng phải báo rõ trade-off so với mục tiêu đồng bộ tức thời.

<a id="r14"></a>

## XIV. RESPONSIVE VÀ ACCESSIBILITY

Phải hỗ trợ:

- Desktop.

- Tablet.

- Smartphone Android.

- iPhone.

Yêu cầu:

- Không tràn layout.

- Không có nút quá nhỏ.

- Có focus visible.

- Dùng semantic elements.

- Form có label.

- Dialog có hành vi bàn phím hợp lý.

- Ảnh có alt text phù hợp.

- Video embed có title.

- Độ tương phản dễ đọc.

- Loading, success, error rõ ràng.

- Có trạng thái disabled khi thao tác chưa hợp lệ.

- Hỗ trợ reduced motion cơ bản.

<a id="r15"></a>

## XV. THƯ VIỆN ĐƯỢC PHÉP

Có thể cân nhắc:

- Supabase JS SDK.

- SortableJS cho kéo thả.

- PDF.js cho xem PDF.

- Lucide Icons hoặc thư viện icon miễn phí.

- DOMPurify nếu cần xử lý HTML an toàn.

- Vite cho build.

- Vitest cho unit test.

- Playwright cho browser/end-to-end test.

Không bắt buộc dùng tất cả.

Chỉ thêm thư viện khi có giá trị thực tế.

Kiểm tra giấy phép, phiên bản và rủi ro bảo trì.

Ưu tiên khóa phiên bản dependency trong lockfile, không phụ thuộc CDN `latest` khi triển khai production.

<a id="r16"></a>

## XVI. CẤU TRÚC REPOSITORY ĐỀ XUẤT

Tên sản phẩm/thư mục mẫu: `khtn8-board/`; repository thực tế được người dùng chọn là `khoabm/dashboard`.

```text
README.md
package.json
package-lock.json
.gitignore
.env.example
index.html
public/
  images/
  placeholders/
src/
  main.js
  styles/
  components/
  services/
  utils/
  config/
  data/
supabase/
  migrations/
  seed.sql
tests/
docs/
  ARCHITECTURE.md
  DATABASE.md
  SECURITY.md
  DEPLOYMENT.md
  ZERO_COST.md
  TESTING.md
```

Có thể điều chỉnh theo kiến trúc thực tế nhưng phải giữ dự án dễ đọc và dễ bảo trì. Các đường dẫn code ở đây là đề xuất, chưa phải file đã triển khai.

<a id="r17"></a>

## XVII. GITHUB WORKFLOW

1. Dùng repository GitHub Free hiện có: `khoabm/dashboard`; không tạo repository mới.

2. `khtn8-board` là tên đề xuất ban đầu; không đổi tên repository `dashboard`. Nhánh `develop` dùng cho phát triển; `main` dành cho bản phát hành đã nghiệm thu.

3. Thiết lập `.gitignore`.

4. Không đưa secrets vào Git.

5. Commit theo từng nhóm tính năng.

6. Dùng pull request hoặc nhánh riêng cho thay đổi lớn.

7. Giữ `main` ở trạng thái deploy được.

8. Không ghi đè lịch sử Git không cần thiết.

9. Không dùng Git LFS cho tài nguyên học liệu khi không cần.

10. Không tự động đưa tệp người dùng upload qua website trở lại GitHub.

GitHub lưu **mã nguồn**; Supabase lưu **nội dung được tạo khi website đang chạy**.

Việc cập nhật bài học trên Supabase không yêu cầu một lần deploy frontend mới.

<a id="r18"></a>

## XVIII. TRIỂN KHAI FRONTEND TĨNH

Dùng quy trình ChatGPT Work + Sites tại docs/WORKFLOW.md; chỉ triển khai khi đã đáp ứng ràng buộc chi phí và phạm vi người dùng cho phép.

Yêu cầu:

- Đồng bộ đúng snapshot mã nguồn với repository GitHub.

- Chỉ phát hành snapshot main đã nghiệm thu; không tự cấu hình auto-deploy khi chưa được yêu cầu.

- Build ra thư mục static.

- Hỗ trợ trang web qua HTTPS mặc định.

- Có SPA fallback chỉ nếu kiến trúc routing thực sự cần.

- Không dùng serverless functions không cần thiết.

- Không kích hoạt các dịch vụ trả phí.

- Không mua domain.

- Không kích hoạt analytics trả phí.

- Kiểm tra biến môi trường trước deploy.

- Dùng đúng public Supabase URL và publishable/anon key.

- Không lộ secret.

- Kiểm tra runtime và Network tab sau deploy.

Cấu hình phải tái tạo được từ repository và tài liệu hướng dẫn.

<a id="r19"></a>

## XIX. KIỂM THỬ

### Functional tests

- Mở website.

- Hiển thị 3 cột placeholder.

- Hiển thị 6 bài mẫu.

- Tìm kiếm.

- Mở ảnh.

- Mở PDF.

- Mở link.

- Xem YouTube.

- Login admin.

- Logout admin.

- Tạo cột.

- Sửa cột.

- Tạo bài.

- Lưu nháp.

- Xuất bản.

- Sửa bài.

- Xóa bài.

- Khôi phục bài.

- Upload ảnh.

- Upload file dưới 2 MB.

- Từ chối file không hợp lệ.

- Sắp xếp bài.

- Kiểm tra đồng bộ giữa hai trình duyệt.

### Security tests

- Public không thể INSERT.

- Public không thể UPDATE.

- Public không thể DELETE.

- Public không thể upload vào Storage.

- Người dùng authenticated nhưng không phải admin không thể ghi.

- Draft không bị đọc công khai.

- Service keys không xuất hiện trong client bundle.

- URL không an toàn bị từ chối.

- Nội dung độc hại không thực thi script.

### Reliability tests

- Mất mạng khi soạn.

- Mất mạng khi upload.

- Refresh trang trong lúc có nháp.

- Hết phiên đăng nhập.

- Upload một phần thất bại.

- File không tồn tại.

- Supabase project bị pause.

- Quota gần giới hạn.

- Dữ liệu không có bài.

- Realtime bị mất kết nối.

### Responsive tests

- 360px.

- 390px.

- 768px.

- 1024px.

- 1440px.

Không coi website đã hoàn thành nếu chỉ kiểm tra một kích thước màn hình.

<a id="r20"></a>

## XX. PERFORMANCE

- Lazy-load hình ảnh.

- Tối ưu ảnh thumbnail.

- Dùng WebP khi thích hợp.

- Không tải tất cả file đính kèm khi mở bảng.

- Chỉ tải file khi người dùng yêu cầu.

- Giảm lượng JavaScript.

- Không tạo các listener hoặc subscription dư thừa.

- Debounce tìm kiếm, autosave.

- Tránh N+1 queries.

- Dùng index database.

- Có trạng thái loading/skeleton.

Mục tiêu là trải nghiệm nhanh với vài chục đến vài trăm bài học, không cần xây hệ thống phức tạp cho quy mô hàng triệu bài đăng.

<a id="r21"></a>

## XXI. SAO LƯU VÀ KHÔI PHỤC

Vì không sử dụng gói Supabase Pro:

- Không dựa vào automatic backups trả phí.

- Có cơ chế export metadata.

- Tài liệu hóa cách sao lưu PostgreSQL miễn phí bằng công cụ phù hợp.

- Tài liệu hóa cách sao lưu tệp Storage.

- Không lưu bản sao dữ liệu nhạy cảm vào repository công khai.

- Có quy trình restore được kiểm thử.

- Xác định rõ nội dung nào có thể bị mất nếu dịch vụ gặp sự cố.

Các thao tác backup tự động chỉ được thêm khi thật sự vận hành được trong giới hạn miễn phí và không có nguy cơ vượt quota.

<a id="r22"></a>

## XXII. QUY ĐỊNH VỀ PLACEHOLDER

Trong lần khởi tạo:

- Không cần kết nối tài liệu Padlet thật.

- Không tự động crawl và tải nội dung có bản quyền.

- Không phỏng đoán tên bài học thực tế.

- Sử dụng placeholder hợp lý, có nhãn rõ.

- Dữ liệu seed phải tái tạo được.

- Không tạo trùng dữ liệu khi chạy seed nhiều lần.

- Quản trị viên có thể thay các placeholder mà không cần sửa mã nguồn.

<a id="r23"></a>

## XXIII. KHẢ NĂNG MỞ RỘNG TƯƠNG LAI

Chưa triển khai nhưng cần lưu ý:

- Đăng bài ẩn danh.

- Bình luận.

- Like/reaction.

- Kiểm duyệt trước công khai.

- Báo cáo nội dung.

- Chống spam và rate limiting.

- Nhiều bảng học liệu.

- Google Sheets export/import.

- Khả năng chuyển sang MongoDB nếu có lý do.

- Nhiều người quản trị.

Không xây trước những chức năng này.

Chỉ tránh những quyết định thiết kế có thể làm việc mở rộng trở nên khó khăn.

<a id="r24"></a>

## XXIV. TRIỂN KHAI THEO GIAI ĐOẠN

### Phase 0 — Audit & Planning

- Kiểm tra tool/plugin hiện có.

- Xác minh phiên bản công nghệ.

- Kiểm tra Free Plan.

- Kiểm tra chi phí.

- Chốt cấu trúc dự án.

- Kiểm tra quyền truy cập.

- Xuất architecture checklist.

### Phase 1 — Frontend UI

- Xây dựng wireframe thành website thực tế.

- Tạo 3 cột placeholder.

- Tạo 6 bài mẫu.

- Responsive.

- Modal và tìm kiếm.

- Không cần backend để kiểm tra giao diện ban đầu.

### Phase 2 — Supabase

- Tạo schema và migrations.

- Tạo RLS.

- Thiết lập Auth.

- Thiết lập Storage.

- Kiểm thử chính sách bảo mật.

### Phase 3 — Admin CMS

- Đăng nhập.

- Thêm/sửa/xóa cột.

- Thêm/sửa/xóa bài.

- Upload ảnh/file.

- Link/video.

- Lưu nháp.

- Xuất bản.

- Sắp xếp.

### Phase 4 — Đồng bộ

- Tải dữ liệu từ Supabase.

- Đồng bộ sau khi lưu.

- Realtime hoặc phương án thay thế tiết kiệm quota.

- Error handling.

- Đồng bộ các thiết bị.

### Phase 5 — Testing & Hardening

- Functional tests.

- Security tests.

- Responsive tests.

- Performance.

- Kiểm tra quota và cấu hình.

- Backup/restore.

- Sửa lỗi.

### Phase 6 — Deploy

- Đẩy code lên GitHub.

- Deploy frontend tĩnh theo quy trình Sites đã xác minh miễn phí và được người dùng yêu cầu.

- Kiểm tra trang công khai.

- Kiểm tra admin.

- Kiểm tra trên điện thoại.

- Kiểm tra quyền truy cập.

- Báo cáo hoàn tất.

Không triển khai production khi chưa đạt yêu cầu bảo mật trọng yếu.

<a id="r25"></a>

## XXV. DEFINITION OF DONE

Dự án chỉ được xem là hoàn thành khi:

1. Website có giao diện thống nhất với wireframe đã duyệt.

2. Desktop/mobile hoạt động tốt.

3. Public xem được học liệu không cần tài khoản.

4. Quản trị viên đăng nhập được.

5. Chỉ admin có quyền ghi.

6. Tạo/sửa/xóa bài hoạt động.

7. Upload ảnh và file hoạt động.

8. Link và video YouTube hoạt động.

9. Nội dung lưu được trong Supabase.

10. Thiết bị khác đọc được dữ liệu đã xuất bản.

11. Trạng thái draft không bị công khai.

12. localStorage lưu nháp đúng mục đích.

13. RLS và Storage Policy đã được kiểm thử.

14. Không có secret trong frontend.

15. GitHub chứa mã nguồn đầy đủ.

16. Frontend deploy thành công trên nền tảng đã được xác minh miễn phí; quyền truy cập phù hợp đối tượng được người dùng cho phép.

17. Không có dịch vụ trả phí được kích hoạt.

18. Có README và hướng dẫn vận hành.

19. Có hướng dẫn sao lưu, khôi phục.

20. Báo cáo rõ các giới hạn còn tồn tại của Free Plan.

<a id="r26"></a>

## XXVI. YÊU CẦU ĐỐI VỚI AI KHI THỰC HIỆN

Không tự ý thay đổi tech stack chính.

Không biến dự án thành một ứng dụng React/Next.js hoặc hệ thống CMS lớn khi không cần thiết.

Không bỏ chức năng quản trị để đơn giản hóa.

Không giả lập dữ liệu đã lưu thành công khi backend chưa lưu.

Không báo deployment thành công khi chưa xác minh URL thực tế.

Không coi việc tạo giao diện đẹp là hoàn thành toàn bộ phần mềm.

Không để lỗi bảo mật vì muốn triển khai nhanh.

Không hứa bảo đảm hoạt động 24/7 với Free Plan.

Không được phát sinh phí.

Nếu quyền công cụ không đầy đủ, phải xác định rõ công đoạn nào thực hiện được và công đoạn nào cần thao tác từ chủ tài khoản.

Luôn giữ mã nguồn dễ đọc, dễ nâng cấp và không phụ thuộc vào nền tảng AI tạo website cụ thể.

<a id="r27"></a>

## XXVII. OUTPUT BẮT BUỘC

Sau từng giai đoạn, cung cấp:

- Công việc đã thực hiện.

- Các file được tạo hoặc chỉnh sửa.

- Thành phần đã kiểm thử.

- Thành phần chưa hoàn tất.

- Vấn đề kỹ thuật.

- Tình trạng bảo mật.

- Tình trạng quota.

- Xác nhận không sử dụng dịch vụ trả phí.

- Bước triển khai phù hợp tiếp theo.

Kết quả cuối phải bao gồm:

- Repository GitHub.

- Source code đầy đủ.

- Database migrations.

- Storage policies.

- Documentation.

- Deployment URL đã được xác minh.

- Hướng dẫn đăng nhập và cập nhật nội dung.

- Hướng dẫn sao lưu.

- Kết quả kiểm thử.

- Báo cáo tuân thủ Zero-cost.

Nếu chưa thực hiện được thao tác nào, phải ghi đúng trạng thái, không giả định rằng đã hoàn thành.

<a id="r28"></a>

## XXVIII. LỆNH KHỞI ĐẦU

Hãy bắt đầu bằng Phase 0.

Đầu tiên, kiểm tra tính khả thi của toàn bộ kiến trúc, trạng thái plugin, giới hạn các dịch vụ miễn phí, khả năng đáp ứng yêu cầu Zero-cost và các phụ thuộc cần thiết.

Sau đó lập kế hoạch triển khai chi tiết theo các phase đã quy định.

Khi mọi điều kiện tiền đề đã đáp ứng và người dùng đã cấp các quyền cần thiết, tiến hành xây dựng dự án theo kế hoạch, bắt đầu từ frontend với placeholder.

Ưu tiên tính đúng đắn, khả năng sử dụng thực tế, bảo mật và chi phí 0 USD hơn việc bổ sung tính năng ngoài phạm vi.

**Nguyên tắc cuối: KHTN8 Board phải là một sản phẩm web độc lập, do người dùng kiểm soát mã nguồn và dữ liệu, không phải một bản demo chỉ chạy được trong giao diện ChatGPT.**

