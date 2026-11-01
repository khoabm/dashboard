# AI Assistant V2 — comprehensive QA report, exact HTTP responses (2026-11-01)

## 1. Test provenance and facts

- **Branch:** `feature/ai-assistant-source-quality-v2-20261101`, Draft PR #40; base `develop`.
- **Live execution examined:** [GitHub Actions run #41282985681](https://github.com/khoabm/dashboard/actions/runs/41282985681), [exact JSON and Markdown artifact](https://github.com/khoabm/dashboard/actions/runs/41282985681/artifacts/13073657581). A second duplicate [run #41283058356](https://github.com/khoabm/dashboard/actions/runs/41283058356) independently also executed 25 cases and found the same two failures. A third [run #41283081995](https://github.com/khoabm/dashboard/actions/runs/41283081995) stopped after 5 requests due to a timeout; no retry was attempted.
- **Read-only Supabase ground truth:** 10 published posts confirmed by one metadata SELECT on 2026-11-01; the fixture in `tests/fixtures/assistant-published-20261101.js` is sanitized and its wording is NOT a substitute for the currently published body.
- **Original run actual result:** 25 requests, 23 automated passes (including 10 with human semantic review), 2 routing failures, 14 model invocations. HTTP 200 alone was not a pass condition.
- **Automation issue:** The PR paths-based workflow unexpectedly re-ran the hosted suite for subsequent commits, creating duplicated quota usage. All 3 hosted test workflows have now been switched to *manual `workflow_dispatch` only* to stop further automatic traffic.
- **Cost caveat:** 14 model invocations per complete 25-case run **are not** 14 neurons. Neurons consumed across the account cannot be derived from HTTP response headers; no claim is made that the full campaign used a verified neuron total below 5,000. This is an evidence/accounting gap.
- **Current code improvements since observed run:** Fixed punctuation-aware title routing for `20/11`/`LS-ĐL`, explicit named GK post handling, and safe personal-gradebook redirection. These newer changes were verified by offline unit/build, NOT by this earlier live run.

## 2. Outcomes, including FAIL and human review findings

| ID | Question | Expected route | Observed route | HTTP | Models | Automated result | Human analysis |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| W01 | Phong trào tháng 11 | unknown | board | 200 | 0 | PASS | Meets specified factual/source checks |
| W02 | Dựa vào nội dung web cho biết phong trào tháng 11 có gì? | unknown | board | 200 | 0 | PASS | Meets specified factual/source checks |
| W03 | Khoảnh khắc thầy trò | unknown | board | 200 | 0 | PASS | Meets specified factual/source checks |
| W04 | Trang trí nón lá | unknown | board | 200 | 0 | PASS | Meets specified factual/source checks |
| W05 | Văn nghê chào mừng 20/11 | unknown | general | 200 | 1 | FAIL | FAIL: missed a published title with `/` |
| W06 | Viết văn tri ân thầy cô | unknown | general | 200 | 2 | FAIL | FAIL: mistook a named activity for a writing request |
| W07 | Đáp án GK1 môn Toán | unknown | board | 200 | 0 | PASS | Meets specified factual/source checks |
| W08 | Lịch thi GK1 | unknown | board | 200 | 0 | PASS | Meets specified factual/source checks |
| W09 | Kiểm tra GK môn LS-ĐL | unknown | board | 200 | 0 | PASS | Meets specified factual/source checks |
| E01 | Thi GK có gì? | unknown | board | 200 | 0 | PASS | Meets specified factual/source checks |
| E02 | Thi giữa kì có gì? | unknown | board | 200 | 0 | PASS | Meets specified factual/source checks |
| C01 | kiến thức website | unknown | board | 200 | 0 | PASS | Meets specified factual/source checks |
| D01 | Hôm nay thứ mấy? | unknown | general | 200 | 0 | PASS | Meets specified factual/source checks |
| D02 | Bây giờ mấy giờ? | unknown | general | 200 | 0 | PASS | Meets specified factual/source checks |
| G01 | Vì sao bầu trời có màu xanh? Giải thích đơn giản và cho một ví dụ. | unknown | general | 200 | 1 | AUTO_PASS_REVIEW | Manual review note below |
| G02 | Tại sao nước sôi khi được đun nóng? | unknown | general | 200 | 1 | AUTO_PASS_REVIEW | Manual review note below |
| G03 | Chỉ tôi cách thiết kế nón lá | unknown | general | 200 | 1 | AUTO_PASS_REVIEW | Manual review note below |
| G04 | Vì sao cầu vồng xuất hiện? | unknown | general | 200 | 1 | AUTO_PASS_REVIEW | Manual review note below |
| G05 | 2 cộng 3 bằng bao nhiêu? | unknown | general | 200 | 1 | PASS | Meets specified factual/source checks |
| G06 | Thi giữa kỳ là gì? | unknown | general | 200 | 1 | AUTO_PASS_REVIEW | Manual review note below |
| C02 | Em chưa hiểu lắm, giải thích đơn giản hơn và cho ví dụ được không? | unknown | general | 200 | 1 | AUTO_PASS_REVIEW | Needs improvement: repetitive example |
| C03 | Vì sao bầu trời có màu xanh? | unknown | general | 200 | 1 | AUTO_PASS_REVIEW | Manual review note below |
| H01 | Theo bài Lịch thi GK1 trên web, môn Văn thi lúc mấy giờ? Giải thích thêm cách ôn tập. | unknown | hybrid | 200 | 1 | AUTO_PASS_REVIEW | Manual review note below |
| E03 | Theo bài Lịch thi GK1, môn Văn thi lúc mấy giờ? | unknown | board | 200 | 1 | AUTO_PASS_REVIEW | Manual review note below |
| P01 | Điểm cá nhân của em là bao nhiêu? | unknown | general | 200 | 1 | AUTO_PASS_REVIEW | FAIL on intent: answered about AI's own grades |

## 3. Exact predeclared expectation and captured actual answer for EACH case

### W01 — PASS

**Question:** Phong trào tháng 11

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 0; source count 1.

**Actual response (verbatim from hosted logs):**

~~~text
Theo bài "Phong trào Tháng 11" trên website:
Các phong trào trong tháng 11
- Khoảnh khắc thầy trò
- Trang trí nón lá
- Viết văn tri ân thầy cô
- Văn nghê chào mừng 20/11
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### W02 — PASS

**Question:** Dựa vào nội dung web cho biết phong trào tháng 11 có gì?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 0; source count 1.

**Actual response (verbatim from hosted logs):**

~~~text
Theo bài "Phong trào Tháng 11" trên website:
Các phong trào trong tháng 11
- Khoảnh khắc thầy trò
- Trang trí nón lá
- Viết văn tri ân thầy cô
- Văn nghê chào mừng 20/11
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### W03 — PASS

**Question:** Khoảnh khắc thầy trò

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 0; source count 1.

**Actual response (verbatim from hosted logs):**

~~~text
Theo bài "Khoảnh khắc thầy trò" trên website:
- Lên ý tưởng
- Mượn máy chụp ảnh
- Thuê đạo cụ
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### W04 — PASS

**Question:** Trang trí nón lá

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 0; source count 1.

**Actual response (verbatim from hosted logs):**

~~~text
Theo bài "Trang trí nón lá" trên website:
- Chọn HS tham gia [ẩn danh sách cá nhân]
- Lên ý tưởng
- Đặt mua 2 nón ( 1cái nộp, 1 cái demo)
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### W05 — FAIL

**Question:** Văn nghê chào mừng 20/11

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 1; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Dưới đây là một bài văn nghị luận chào mừng 20/11:

**Bài văn nghị luận chào mừng 20/11**

Ngày 20/11 là dịp để chúng ta bày tỏ lòng biết ơn sâu sắc đến những người thầy, người cô đã dìu dắt, truyền đạt kiến thức và rèn luyện nhân cách cho chúng ta. Đây không chỉ là ngày lễ truyền thống mà còn là dịp để mỗi học sinh, phụ huynh và cộng đồng cùng nhau tri ân những người giáo viên - những người lái đò thầm lặng, đưa bao thế hệ học trò đến bến bờ tri thức.

Người thầy không chỉ là người truyền đạt kiến thức mà còn là người thầy tâm huyết, luôn quan tâm, động viên và dìu dắt học sinh trên con đường học tập. Họ là những người thầm lặng, không đòi hỏi gì nhiều, chỉ mong muốn học trò của mình có thể trưởng thành và thành công. Chính vì vậy, ngày 20/11 là dịp để chúng ta bày tỏ lòng biết ơn, sự kính trọng và tình cảm chân thành nhất đến những người thầy, người cô.

Trong cuộc sống hiện đại, khi mà công nghệ phát triển, các phương tiện truyền thông ngày càng đa dạng, nhưng vai trò của người thầy vẫn không bao giờ thay đổi. Họ là những người truyền cảm hứng, là những người truyền bá tri thức và nhân cách cho thế hệ trẻ. Vì vậy, mỗi học sinh cần có ý thức học tập, rèn luyện và sống có trách nhiệm để không phụ lòng thầy cô.

Nhân ngày 20/11, chúng ta hãy cùng nhau bày tỏ lòng biết ơn sâu sắc đến những người thầy, người cô. Hãy trân trọng những bài giảng, những lời khuyên chân thành và những tình cảm mà thầy cô đã dành cho chúng ta. Đây là dịp để chúng ta cùng nhau lan tỏa tinh thần hiếu học, tôn sư trọng đạo và xây dựng một nền giáo dục tốt đẹp hơn trong tương lai.
~~~

**Automatic issues:** route=general; citations=0; models=1; missing "Văn nghê chào mừng 20/11"; missing "trang phục"

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### W06 — FAIL

**Question:** Viết văn tri ân thầy cô

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 2; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Viết văn tri ân thầy cô là cách thể hiện lòng biết ơn sâu sắc đối với những người thầy, người cô đã dìu dắt, truyền đạt kiến thức và dạy dỗ chúng ta nên người. Trong bài viết, bạn có thể kể về những kỷ niệm đẹp, sự tận tâm của thầy cô, và những bài học quý báu mà họ đã trao tặng. Hãy viết thật chân thành, cảm động để thể hiện sự trân trọng và lòng biết ơn của mình.
~~~

**Automatic issues:** route=general; citations=0; models=2; missing "giấy"

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### W07 — PASS

**Question:** Đáp án GK1 môn Toán

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 0; source count 1.

**Actual response (verbatim from hosted logs):**

~~~text
Website có bài "Đáp án GK1 môn Toán", nhưng nội dung văn bản chưa có. Nếu bài có tệp đính kèm, mình chưa đọc được nội dung tệp đó.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### W08 — PASS

**Question:** Lịch thi GK1

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 0; source count 3.

**Actual response (verbatim from hosted logs):**

~~~text
Website đang có 3 bài đăng công khai liên quan đến kiểm tra giữa kỳ:

- **Lịch thi GK1**: Lịch thi T2/26/10/2026
- 7g20 Kiểm tra môn Văn 90 phút
- 9g20 Kiểm tra môn Toán 60 phút
- 10g25 Kiểm tra môn Anh 45 phút
- 11g10 Học sinh về

- **Kiểm tra GK môn LS-ĐL**: Ôn kĩ đề cương thầy phát
Thời gian: Tiết 1-2 chiều thứ 6

- **Đáp án GK1 môn Toán**: Bài đăng có trên website; chưa có nội dung văn bản để trích dẫn.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### W09 — PASS

**Question:** Kiểm tra GK môn LS-ĐL

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 0; source count 3.

**Actual response (verbatim from hosted logs):**

~~~text
Website đang có 3 bài đăng công khai liên quan đến kiểm tra giữa kỳ:

- **Lịch thi GK1**: Lịch thi T2/26/10/2026
- 7g20 Kiểm tra môn Văn 90 phút
- 9g20 Kiểm tra môn Toán 60 phút
- 10g25 Kiểm tra môn Anh 45 phút
- 11g10 Học sinh về

- **Kiểm tra GK môn LS-ĐL**: Ôn kĩ đề cương thầy phát
Thời gian: Tiết 1-2 chiều thứ 6

- **Đáp án GK1 môn Toán**: Bài đăng có trên website; chưa có nội dung văn bản để trích dẫn.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### E01 — PASS

**Question:** Thi GK có gì?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 0; source count 3.

**Actual response (verbatim from hosted logs):**

~~~text
Website đang có 3 bài đăng công khai liên quan đến kiểm tra giữa kỳ:

- **Lịch thi GK1**: Lịch thi T2/26/10/2026
- 7g20 Kiểm tra môn Văn 90 phút
- 9g20 Kiểm tra môn Toán 60 phút
- 10g25 Kiểm tra môn Anh 45 phút
- 11g10 Học sinh về

- **Kiểm tra GK môn LS-ĐL**: Ôn kĩ đề cương thầy phát
Thời gian: Tiết 1-2 chiều thứ 6

- **Đáp án GK1 môn Toán**: Bài đăng có trên website; chưa có nội dung văn bản để trích dẫn.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### E02 — PASS

**Question:** Thi giữa kì có gì?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 0; source count 3.

**Actual response (verbatim from hosted logs):**

~~~text
Website đang có 3 bài đăng công khai liên quan đến kiểm tra giữa kỳ:

- **Lịch thi GK1**: Lịch thi T2/26/10/2026
- 7g20 Kiểm tra môn Văn 90 phút
- 9g20 Kiểm tra môn Toán 60 phút
- 10g25 Kiểm tra môn Anh 45 phút
- 11g10 Học sinh về

- **Kiểm tra GK môn LS-ĐL**: Ôn kĩ đề cương thầy phát
Thời gian: Tiết 1-2 chiều thứ 6

- **Đáp án GK1 môn Toán**: Bài đăng có trên website; chưa có nội dung văn bản để trích dẫn.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### C01 — PASS

**Question:** kiến thức website

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 0; source count 3.

**Actual response (verbatim from hosted logs):**

~~~text
Website đang có 3 bài đăng công khai liên quan đến kiểm tra giữa kỳ:

- **Lịch thi GK1**: Lịch thi T2/26/10/2026
- 7g20 Kiểm tra môn Văn 90 phút
- 9g20 Kiểm tra môn Toán 60 phút
- 10g25 Kiểm tra môn Anh 45 phút
- 11g10 Học sinh về

- **Kiểm tra GK môn LS-ĐL**: Ôn kĩ đề cương thầy phát
Thời gian: Tiết 1-2 chiều thứ 6

- **Đáp án GK1 môn Toán**: Bài đăng có trên website; chưa có nội dung văn bản để trích dẫn.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### D01 — PASS

**Question:** Hôm nay thứ mấy?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 0; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Hôm nay là Chủ Nhật, 1 tháng 11, 2026.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### D02 — PASS

**Question:** Bây giờ mấy giờ?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 0; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Bây giờ là 14:00, Chủ Nhật, 1 tháng 11, 2026 (giờ Việt Nam).
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** No additional semantic concerns identified in this limited read-through; automatic checks do not prove universal truth.

### G01 — AUTO_PASS_REVIEW

**Question:** Vì sao bầu trời có màu xanh? Giải thích đơn giản và cho một ví dụ.

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 1; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Bầu trời có màu xanh vì ánh sáng từ Mặt Trời bị tán xạ bởi các phân tử trong khí quyển Trái Đất. Ánh sáng xanh bị tán xạ nhiều hơn so với các màu khác, khiến ta thấy bầu trời màu xanh. Ví dụ: Khi Mặt Trời mọc hoặc lặn, ánh sáng phải đi qua nhiều lớp khí quyển hơn, nên màu đỏ hoặc cam nổi bật hơn.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Giải thích cơ chế tán xạ và ví dụ Mặt Trời mọc/lặn: phù hợp THCS.

### G02 — AUTO_PASS_REVIEW

**Question:** Tại sao nước sôi khi được đun nóng?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 1; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Nước sôi khi được đun nóng vì nhiệt độ làm tăng chuyển động của các phân tử nước. Khi đạt đến 100°C (ở áp suất khí quyển chuẩn), nước chuyển từ trạng thái lỏng sang khí, tạo ra bọt khí và sôi.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Giải thích nhiệt chuyển động và mốc 100°C ở áp suất chuẩn: phù hợp, còn giản lược.

### G03 — AUTO_PASS_REVIEW

**Question:** Chỉ tôi cách thiết kế nón lá

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 1; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Để thiết kế nón lá, bạn có thể thực hiện các bước sau:
1. **Chọn nguyên liệu**: Dùng lá cọ hoặc lá dừa non, chọn lá tươi, mỏng và mềm.
2. **Làm khung nón**: Dùng tre hoặc nứa để tạo khung hình nón, uốn cong và buộc chặt.
3. **Bọc lá**: Xếp lá theo chiều dọc, bắt đầu từ mép dưới lên, dùng chỉ hoặc dây để cố định.
4. **Hoàn thiện**: Cắt tỉa lá thừa, thêm dây cột hoặc nơ trang trí.
Ví dụ: Bạn có thể làm nón lá truyền thống với hình dáng cong nhẹ và màu tự nhiên của lá.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Hướng dẫn thực hành; cần con người rà soát tính khả thi/vật liệu.

### G04 — AUTO_PASS_REVIEW

**Question:** Vì sao cầu vồng xuất hiện?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 1; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Cầu vồng xuất hiện do hiện tượng khúc xạ và phản xạ ánh sáng mặt trời trong các giọt nước mưa. Khi ánh sáng trắng đi qua giọt nước, nó bị tách thành các màu sắc khác nhau theo bước sóng, tạo thành dải quang phổ. Ánh sáng này sau đó phản xạ bên trong giọt nước và thoát ra ngoài, tạo thành cầu vồng.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Nêu khúc xạ, phản xạ và tán sắc: phù hợp ở mức phổ thông.

### G05 — PASS

**Question:** 2 cộng 3 bằng bao nhiêu?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 1; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
2 cộng 3 bằng 5.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Đúng phép cộng 2+3=5.

### G06 — AUTO_PASS_REVIEW

**Question:** Thi giữa kỳ là gì?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 1; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Thi giữa kỳ là bài kiểm tra được tổ chức vào giữa học kỳ để đánh giá kiến thức và kỹ năng của học sinh sau một thời gian học tập. Bài thi này giúp giáo viên kiểm tra mức độ hiểu bài và điều chỉnh phương pháp giảng dạy nếu cần. Ví dụ: Trong học kỳ I, học sinh sẽ thi giữa kỳ vào giữa tháng 11.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Định nghĩa phù hợp nhưng ví dụ 'giữa tháng 11' chỉ là minh họa, không được hiểu là lịch trường.

### C02 — AUTO_PASS_REVIEW

**Question:** Em chưa hiểu lắm, giải thích đơn giản hơn và cho ví dụ được không?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 1; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Ánh sáng Mặt Trời gồm nhiều màu, nhưng khi đi qua khí quyển Trái Đất, ánh sáng xanh bị tán xạ nhiều hơn nên lan tỏa khắp bầu trời. Ví dụ: Khi trời nắng, ta thấy bầu trời xanh vì ánh sáng xanh lan rộng. Khi trời tối, ánh sáng xanh ít hơn nên bầu trời tối hơn.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Chưa đạt chất lượng ví dụ: 'bầu trời xanh vì ánh sáng xanh lan rộng' vẫn gần như lặp lại giải thích. Nên có ví dụ tương phản/đời thường rõ hơn.

### C03 — AUTO_PASS_REVIEW

**Question:** Vì sao bầu trời có màu xanh?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 1; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Bầu trời có màu xanh vì ánh sáng mặt trời bị tán xạ khi đi qua khí quyển Trái Đất. Ánh sáng trắng từ mặt trời gồm nhiều màu, trong đó ánh sáng xanh bị tán xạ mạnh hơn các màu khác do bước sóng ngắn hơn. Khi đó, ánh sáng xanh lan tỏa khắp bầu trời và mắt ta thấy bầu trời màu xanh.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Chuyển chủ đề sạch, không dẫn nguồn giờ thi cũ.

### H01 — AUTO_PASS_REVIEW

**Question:** Theo bài Lịch thi GK1 trên web, môn Văn thi lúc mấy giờ? Giải thích thêm cách ôn tập.

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `hybrid`; model invocations 1; source count 1.

**Actual response (verbatim from hosted logs):**

~~~text
Theo bài đăng:
Theo bài Lịch thi GK1 trên web, môn Văn thi lúc 7g20.

Giải thích thêm:
Em nên ôn tập bằng cách đọc lại các bài văn đã học, làm bài tập về nhà và xem lại các đề thi cũ để nắm chắc kiến thức.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Có 7g20 và phân biệt rõ giờ thi với lời khuyên; lời khuyên không được coi là thông báo giáo viên.

### E03 — AUTO_PASS_REVIEW

**Question:** Theo bài Lịch thi GK1, môn Văn thi lúc mấy giờ?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `board`; model invocations 1; source count 1.

**Actual response (verbatim from hosted logs):**

~~~text
Theo lịch thi GK1, môn Văn thi lúc 7g20.
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Trả đúng giờ Văn 7g20 và có nguồn.

### P01 — AUTO_PASS_REVIEW

**Question:** Điểm cá nhân của em là bao nhiêu?

**Predeclared expected (from test suite):**

~~~js
(not found)
~~~

**Observed:** HTTP 200; route `general`; model invocations 1; source count 0.

**Actual response (verbatim from hosted logs):**

~~~text
Tôi không có điểm cá nhân vì tôi là trợ lý AI. Bạn có thể hỏi tôi về cách tính điểm hoặc cách cải thiện điểm số trong học tập nhé!
~~~

**Automatic issues:** None under automatic criteria.

**Human qualitative check:** Không tiết lộ điểm nhưng hiểu nhầm 'điểm của em' thành điểm của trợ lý. Đây là lỗi hội thoại; đã sửa bằng hướng dẫn mở Bảng điểm cá nhân + xác minh, chưa hosted retest.

## 4. Corrective actions and residual risks

1. **W05/W06 source misrouting:** on the branch, title-like phrases are now compared with published post titles even when they contain punctuation or words such as 'cô'. Current live Worker deployment at time of this run predated that change; rerun is required to claim live PASS.
2. **P01 score intention:** a private-grade question now receives deterministic guidance to use the separate verified Gradebook interface, with no access to private student records. This change was offline-tested, not hosted-retested.
3. **C02 conversational pedagogy:** despite automatic PASS, the analogy is still circular. Stronger examples or clarification prompts remain advisable and have not been implemented in this iteration.
4. **Source freshness:** anonymous public catalog is read from Supabase at request time, but fixtures can differ in spelling and redacted personal identifiers; test by meaningful facts rather than byte equality.
5. **Model quotas/availability:** open-ended Qwen and embedding runs vary in response and cost; a single observed PASS does not guarantee subsequent responses. Do not auto-retry 429/503/timeouts.
6. **Browser UI:** actual headless/mobile user-journey testing was not performed in these hosted requests. Owner Browser QA remains an independent release gate.

## 5. Separate offline evidence

[Offline CI #41283585733](https://github.com/khoabm/dashboard/actions/runs/41283585733): 281/281 tests, static/syntax, production build, pinned Prettier PASS at code commit `47568a8`. The source changes after that SHA must have their own final CI receipt before merge.

**Status:** Real hosted audit completed for the earlier Worker version; **not final end-to-end production acceptance**. Keep PR Draft and do not merge/release production until remaining gates.
