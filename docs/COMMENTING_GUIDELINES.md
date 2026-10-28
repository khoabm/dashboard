# Quy tắc comment trong source (Commenting Guidelines)

**Mục tiêu:** Giúp developer và AI agent hiểu trách nhiệm của từng file, hợp đồng của function/component và các state/luồng khó nhận ra khi chỉ đọc code. Chỉ mô tả hành vi **đã có thật** tại ref đang làm việc; không suy đoán hoặc chép lại SPEC.

**Phạm vi:** JS/MJS trong `src/`, `scripts/`, `tests/`; comment section có chủ đích trong CSS/HTML và trong SQL mới nếu liên quan. Quy ước này đã được áp dụng cho các module code trên branch refactor; comment không thay đổi hành vi thực thi. Tuân thủ [ARCHITECTURE](ARCHITECTURE.md) về ranh giới module và [CODE_STYLE](CODE_STYLE.md) về format; không đổi logic chỉ để viết comment.

## 1. Ngôn ngữ và ngữ pháp

- **English only** cho comment trong code: `//`, `/* ... */`, JSDoc `/** ... */`, CSS/HTML/SQL comments. Không dịch tên biến, UI text tiếng Việt, thông báo lỗi, test fixture hay nội dung sản phẩm.
- Viết câu ngắn, rõ chủ thể và hành động. Với JSDoc summary, ưu tiên **động từ ngôi thứ ba hiện tại** + đối tượng: `Loads board data`, `Renders an attachment list`, `Validates the file signature`, `Restores a local draft`. Tránh `Handle`, `Process`, `Manage` nếu không nói rõ cái gì và để làm gì.
- Với section/state heading, dùng **cụm danh từ**: `// Board and session state`, `// Attachment cleanup`. Với invariant/risk, dùng câu mô tả hoặc mệnh lệnh rõ lý do: `// Keep local drafts when the remote save fails.`
- Mô tả parameter bằng danh từ có ngữ nghĩa (`The post ID used as the Storage path prefix`); return bằng kết quả và ý nghĩa (`A normalized HTTPS URL, or null when invalid`). Dùng cùng thuật ngữ `post`, `section`, `draft`, `attachment`, `published`, `admin` nhất quán với code.
- Không dùng comment tiếng Anh sai ngữ pháp, lối viết khẩu ngữ, hoặc câu mơ hồ như `Do something here`, `Set data`, `This function is used to...`. Không viết đoạn văn dài để lặp lại điều hàm và type đã thể hiện.

## 2. Comment ở đúng cấp độ

| Vị trí | Comment cần có | Không làm |
| --- | --- | --- |
| **File/module** | 1–2 câu tóm tắt trách nhiệm chính, dependency/side effect quan trọng nếu có; đặt trước import hoặc nhóm code đầu tiên. Ví dụ `src/components/` render DOM, `src/services/` truy cập data, `src/utils/` giữ logic thuần. | Kể tên từng import/export hoặc chép lại mô tả toàn bộ chức năng |
| **Named function/class/component** | Một JSDoc **hợp đồng ngắn**: mục đích, cơ chế hoặc điểm quyết định quan trọng, tham số có ý nghĩa, cách caller sử dụng/lifecycle khi cần và kết quả trả về nếu có. Áp dụng cho export và helper có tên/độc lập; class thêm trách nhiệm state/lifecycle. | Comment từng statement; lặp tên function; bịa type, exception hoặc side effect |
| **Nhóm state** | Một comment ngay trước nhóm state liên quan, chỉ rõ vai trò/lifecycle/invariant khi khó thấy (`data/admin`, `dirty/busy/closing`, cache/timer). | Một comment cho mỗi biến, hoặc đồng nhất state UI với dữ liệu đã lưu backend |
| **Section trong file dài** | Dùng heading ngắn khi chuyển trách nhiệm rõ (render, auth/refresh, draft persistence, upload/cleanup, listeners). Một section bao một nhóm hàm/logic liên quan. | Chèn heading tùy tiện trước từng `if`, `return` hoặc block ngắn |
| **Nhánh logic/rủi ro** | Comment **why**, invariant, failure/rollback, race condition, quota, security hoặc cleanup không suy ra dễ từ code. | Comment **what** hiển nhiên (`// Increment i`, `// Return result`) |
| **CSS/HTML** | Comment theo nhóm tokens/layout/responsive/accessibility hoặc lý do về thứ tự cascade/CSP khi thật cần; không ghi chú nội dung hiển thị. | Chú thích mọi selector, declaration, tag hay label UI |
| **Test/script** | Mô tả phạm vi kiểm thử hoặc lý do fixture, edge case, side effect ít rõ. Test name/assertion đã rõ thì không cần thêm. | Diễn giải từng assertion hoặc biến test thành tài liệu nghiệp vụ |
| **Migration SQL mới** | Giải thích tác động permission/RLS/transaction chỉ khi không hiển nhiên. | Viết lại migration đã apply chỉ để thêm comment |

Các callback inline, arrow expression đơn giản, getter một dòng và biến có tên tự giải thích **không** cần block JSDoc riêng. Điều này không miễn trách nhiệm document hợp đồng cho các function/class/component có tên; chỉ tránh spam comment vào chi tiết không có hợp đồng độc lập.

### DOM được dựng bằng `el(...)` và layout containers

Các component tạo DOM bằng `el(tag, attrs, ...children)` thường có `div` không mang ngữ nghĩa riêng; tên CSS class chỉ là hook để style, **không tự mô tả vai trò của vùng UI**. Vì vậy áp dụng thêm các quy tắc sau:

1. **Vùng giao diện có trách nhiệm riêng:** comment trước **cụm khai báo** DOM để nói vùng đó xuất hiện ở đâu, chứa gì, nối với phần tử cha nào và được caller cập nhật khi nào. Đặc biệt cần làm rõ `el('div')` không có class, `*-shell`, `*-region`, `*-wrap`, `*-controls`, `*-body` khi tên chưa đủ hiểu. Không chỉ viết `Creates a div` hoặc diễn giải từng tag.
2. **Thứ bậc và luồng render:** với `append(...)` hoặc `replaceChildren(...)` dài, thêm một comment trước **cụm ghép UI** để giải thích thứ tự các vùng chính, nơi render động, và phần chỉ hiện cho admin/khách. Không cần ghi chú mọi `span`, `p`, icon hay text hiển nhiên.
3. **Callback có side effect:** comment ngắn trước callback/biến chứa callback **khi có thay đổi state, debounce, localStorage, gọi service, cleanup hoặc trigger render gián tiếp**. Nêu trigger và hiệu ứng thực tế; nếu lưu cục bộ có thể thất bại thì không khẳng định chắc chắn đã lưu. Callback chỉ nối một action rõ tên không cần chú thích riêng.
4. **DOM class và CSS:** ưu tiên giải thích vai trò ở code nơi tạo vùng, nhóm CSS chỉ thêm comment khi cần làm rõ layout/cascade/responsive. Không biến comment thành danh sách selector; không khẳng định CSS class hoặc `div` tự tạo ý nghĩa semantic/accessibility.
5. **Chính xác theo source:** đối chiếu DOM tạo ra với nơi gọi `append`, `replaceChildren`, class được dùng trong CSS và điều kiện render trước khi ghi comment. Nếu DOM được điều khiển từ file khác, mô tả đúng ranh giới caller/component, không tự suy đoán tính năng.

**Good case — mô tả vùng DOM và cách cập nhật (minh họa):**

```js
// The board shell contains admin actions, section filters, the board, and the footer.
// controls hosts section selectors; boardRegion is replaced when the board renders.
// adminRegion is populated only for authenticated administrators.
const shell = el('div', { class: 'board-shell' }),
  controls = el('div', { class: 'board-controls' }),
  boardRegion = el('div'),
  adminRegion = el('div');
```

**Bad case — chỉ lặp lại cú pháp, bỏ sót mục đích:**

```js
// Creates a div.
const shell = el('div', { class: 'board-shell' });
// Another div.
const boardRegion = el('div');
```

Ví dụ không buộc mỗi biến một comment. Một comment nhóm phải đủ để developer lần ra **trách nhiệm + quan hệ cha–con + nơi cập nhật**; nếu tên đã đủ rõ và không có lifecycle đáng chú ý thì không thêm comment.

## 3. Hợp đồng JSDoc

Một JSDoc tốt nên trả lời nhanh: **What? How/why? Inputs? How to use? Output?** Không nhất thiết tách thành năm đoạn nếu một câu đã đủ. Quy tắc:

1. Câu đầu mô tả mục đích từ góc nhìn caller. Câu thứ hai nêu cơ chế, invariant, side effect hoặc failure behavior **chỉ khi quan trọng**.
2. Ghi `@param` cho từng tham số của function/class/component có hợp đồng: type đủ đúng với JavaScript đang dùng, tên đúng signature; destructured options mô tả field quan trọng, default hoặc optional khi có.
3. Ghi `@returns` khi có kết quả (kể cả `Promise<...>`): ý nghĩa kết quả, `null`/`undefined` hoặc object members quan trọng. Với function chỉ cập nhật DOM/state và không trả giá trị, không bắt buộc `@returns {void}`.
4. Ghi `@throws` nếu caller cần xử lý lỗi được ném/reject; ghi `@example` hoặc một câu `Used by ...` **chỉ khi cách gọi, cleanup hay lifecycle không rõ**. Không thêm `@example` máy móc cho mọi hàm.
5. Comment mô tả **contract ổn định**, không ghi thứ tự thao tác quá chi tiết dễ lỗi thời. Khi sửa signature, return, state, side effect hoặc behavior, cập nhật JSDoc **trong cùng diff**.

### Ví dụ A — utility có input/output rõ (`src/utils/validation.js`)

```js
/**
 * Accepts only HTTPS URLs without embedded credentials.
 * Use this check before storing user-provided external links.
 *
 * @param {string} value - The candidate URL.
 * @returns {string|null} The normalized URL, or null when invalid.
 */
```

### Ví dụ B — component có lifecycle (`src/components/post-editor.js`)

```js
/**
 * Builds the attachment editor and notifies its owner when items change.
 * Recreates image previews after edits; the caller must release object URLs on teardown.
 *
 * @param {object} options - The editor configuration.
 * @param {Array<object>} options.attachments - The current attachment entries.
 * @param {Function} options.onChange - Receives the updated attachment list.
 * @param {Function} options.onError - Receives a validation error message.
 * @returns {HTMLElement} The editor root with cleanup() and setAttachments() helpers.
 */
```

### Ví dụ C — service có failure path (`src/services/storage.js`)

```js
/**
 * Uploads new files while preserving existing attachment entries.
 * Checks quota and file signatures, and attempts cleanup when an upload fails.
 * Called by the post editor before saving attachment metadata.
 *
 * @param {string} postId - The post that owns the uploaded files.
 * @param {Array<object>} attachments - Existing and new attachment entries.
 * @param {Function} [onProgress] - Receives the completed and total item counts.
 * @returns {Promise<{attachments: object[], paths: string[]}>} Saved metadata and new paths.
 * @throws {Error} Upload errors may include orphanPaths for later cleanup.
 */
```

Các ví dụ trên **chỉ là comment mẫu**, không tạo hoặc thay đổi function. Không copy nguyên mẫu nếu signature/hành vi thực tế đã đổi.

### Ví dụ D — state/section comment (`src/main.js`)

```js
// Board snapshot and admin session state used by the rendering flow.

// Search filters and refresh status retained across UI updates.
```

Đặt trước nhóm khai báo/liên quan thực tế; không đặt cả hai comment cạnh nhau khi không có code giữa chúng.

## Good case / Bad case khi review comment

| Trường hợp | Good case | Bad case |
| --- | --- | --- |
| Function contract | `Validates file size and MIME type before upload.` | `Handles the file.` |
| State group | `// Dirty and busy flags prevent duplicate saves and unsafe dismissal.` | `// State variables.` |
| Failure path | `// Keep local drafts when a remote save fails.` | `// Error handling.` |
| DOM/layout region | `// boardRegion is replaced with the filtered board on every render.` | `// Create div for board.` |
| Search callback | `// Debounce filtering and attempt to store the query locally.` | `// Search callback.` |

Good case mô tả mục đích hoặc invariant có thật; bad case mơ hồ, lặp tên hoặc không giúp developer quyết định cách sử dụng.

## 4. Review checklist cho AI agent

- Đọc `AGENTS.md`, `ARCHITECTURE.md`, `CODE_STYLE.md` và **file đích**; xác nhận đúng ref/HEAD. Không comment dựa trên suy đoán từ tên hàm.
- Chọn trách nhiệm chính mỗi file; comment theo **module → named contracts → state/section/risk**. Với UI dựng động, kiểm tra thêm vai trò DOM container, cây cha–con, nơi render lại và side effect callback. Không bắt buộc comment từng UI element/callback.
- Kiểm tra English grammar, động từ chính xác, parameter/default/return/promise/error và cách sử dụng/lifecycle. Không mô tả function async là synchronous hoặc UI state là backend persistence.
- Không đưa secret, credential, PII, internal token hay file người dùng vào comment. Không thêm TODO mơ hồ; TODO thật cần mô tả hành động còn thiếu và issue/reference nếu có.
- **Task chỉ viết comment:** diff chỉ được thêm/sửa comment và cập nhật docs liên quan; không đổi identifier, type, logic, UI text, CSS selector/order, database policy, file format hay dependency. Kiểm tra diff/whitespace; chạy offline syntax, unit, build khi có môi trường. Không gọi API/Supabase test để tránh quota. PASS chỉ khi thực chạy.
- Khi bổ sung comment mới, chia theo module và review độ chính xác trước khi merge; không tự động comment hàng loạt để đủ số lượng.
