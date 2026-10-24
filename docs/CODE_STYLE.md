# Quy ước định dạng code (Code Style)

Tài liệu này là nguồn chuẩn **về cách trình bày source** cho developer và AI agent của KHTN8 Board. Đọc [AGENTS](../AGENTS.md) và [ARCHITECTURE](ARCHITECTURE.md) để biết phạm vi, kiến trúc và trách nhiệm module; tài liệu này không thay thế [SPEC](SPEC.md), quy tắc bảo mật hay kiểm thử.

## Trạng thái và phạm vi

- **Có hiệu lực như quy ước viết code:** áp dụng cho file mới và phần code được chỉnh sửa về sau. Code cũ trên `develop` chưa tuân thủ đồng đều, đặc biệt JS/CSS/HTML đang viết nén.
- **Lượt thay đổi tài liệu này:** chỉ quy định chuẩn và chỉ dẫn agent; **không** cài Prettier/ESLint, thêm scripts/CI, sửa application code, format toàn repo hoặc chạy lại migration.
- Trước khi sửa một file, đọc nó và giữ nguyên logic, public API, thứ tự side effect, CSS cascade, HTML/CSP, dữ liệu và hành vi. Định dạng code cũ phải là nhiệm vụ/commit riêng có phạm vi rõ và có diff + regression checks.
- Không áp dụng formatter lên `package-lock.json`, `dist/`, tệp nhị phân, dữ liệu do người dùng upload, hay migration SQL **đã áp dụng**. Không đưa secret vào output/tooling.

## Chuẩn đề xuất cho formatter

Khi được giao cài formatter ở một lượt sau, ưu tiên **Prettier** cho `*.js`, `*.mjs`, `*.css`, `*.html`, `*.json`, `*.md`. Dùng cấu hình tương đương sau để mọi máy/agent có cùng cách format:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "arrowParens": "always",
  "bracketSpacing": true,
  "endOfLine": "lf"
}
```

Đây là **mẫu cấu hình mục tiêu**, chưa phải file config tồn tại trong repo. `printWidth` là mục tiêu xuống dòng, không phải giới hạn ký tự tuyệt đối. Tuân theo hành vi parser của Prettier (ví dụ thuộc tính HTML và key JSON vẫn dùng nháy kép). Không sửa code chỉ để ép một phong cách khác với formatter đã thống nhất.

| Loại | Quy ước bổ sung |
| --- | --- |
| JS/ES Modules, tests, scripts | 2 spaces; một statement trên một dòng; khoảng trắng quanh toán tử; block nhiều dòng khi có nhiều bước; import theo nhóm rõ ràng, **không tự đảo thứ tự** import có side effect |
| CSS | Mỗi selector/rule và declaration được xuống dòng dễ đọc; dấu cách sau `:`; dấu `;` sau declaration; phân tách các rule bằng dòng trống phù hợp; không đổi thứ tự selector, media query, specificity |
| HTML | Indent theo cây DOM, thuộc tính dài có thể xuống dòng; giữ semantic markup và giá trị CSP, aria, URL; không tự tổ chức lại DOM |
| JSON | Indent 2 spaces; key và chuỗi nháy kép; JSON hợp lệ (không comment/trailing comma); không chỉnh sửa lockfile vì lý do format |
| Markdown | Heading và code fence có language; link tương đối còn hoạt động; bảng/list dễ đọc; tránh nhân bản tài liệu chuẩn |

## Quy tắc dễ đọc khi viết/sửa code

1. Đặt tên rõ nghĩa: `camelCase` cho biến/hàm, `PascalCase` cho class/constructor, `UPPER_SNAKE_CASE` cho hằng số thật sự bất biến, `kebab-case` cho tên file mới và CSS class; giữ tên API/column/schema đã tồn tại. Prefix `is`/`has`/`can` cho boolean khi phù hợp.
2. Một hàm nên diễn đạt một trách nhiệm. Tách khối xử lý dài hoặc callback lồng nhau khi cải thiện được khả năng đọc mà không tạo abstraction vô ích. Giữ ranh giới `components` / `services` / `utils` của ARCHITECTURE.
3. Không gộp nhiều statement qua `;` trên một dòng, không nén các nhánh `if`/`try`/`catch` thành một dòng nếu có xử lý; ưu tiên guard clause dễ theo dõi. Với object/array/call dài, mỗi phần tử hoặc thuộc tính một dòng khi cần.
4. Dùng comment để giải thích **vì sao** (rủi ro bảo mật, rollback, quota, edge case), tránh comment nhắc lại code. Không tự đổi tiếng Việt của UI, status, thông báo, hoặc semantics lỗi khi chỉ format.
5. Tách thay đổi format thuần khỏi refactor hành vi. Nếu cần sửa logic, làm commit riêng có test và nêu rõ diff; không lén thay thuật toán, điều kiện, DOM, SQL hoặc public API trong commit format.
6. Giữ newline cuối file, không trailing whitespace, dùng LF. Không dùng auto-format cả repo khi chỉ sửa một vùng nhỏ; hạn chế diff không liên quan.

### Ví dụ JavaScript (minh họa phong cách)

```js
import { result } from './client.js';

export async function loadPublishedPosts(db, sectionId) {
  if (!sectionId) {
    return [];
  }

  const posts = await result(
    db.from('posts').select('*').eq('section_id', sectionId).eq('status', 'published'),
  );

  return posts;
}
```

Ví dụ chỉ minh họa cách trình bày, **không phải API mới** hoặc yêu cầu thay implementation hiện tại.

### SQL / Supabase

Prettier **không có parser SQL PostgreSQL mặc định**; không dùng Prettier trực tiếp cho `*.sql` và không tự cài plugin SQL ở lượt docs-only. Với **migration mới**:

- Indent 2 spaces; mỗi mệnh đề SQL chính một dòng; tên schema/table/column theo `snake_case` hiện có; keyword SQL dùng chữ hoa nhất quán để dễ quét.
- Chia rõ `CREATE`, `ALTER`, `SELECT`, `WHERE`, `JOIN`, `ON`, `GRANT`, `REVOKE` và các nhánh PL/pgSQL khi câu lệnh phức tạp. Chú thích lý do của RLS/privilege/transaction thay vì lặp tên lệnh.
- Migration đã apply là lịch sử bất biến: muốn thay schema/policy thì tạo migration mới theo [DATABASE](DATABASE.md) và [SECURITY](SECURITY.md); không rewrite migration cũ vì định dạng.

## Quy trình cho agent

1. Đọc `AGENTS.md` → `OVERVIEW.md` + `STATUS.md` → tài liệu theo nhiệm vụ. Khi định **viết/sửa code**, đọc thêm file này và các file đích; đừng quét toàn codebase.
2. Trước khi thay đổi, xác định đây là `docs-only`, `format-only` hay `behavior change`. Trong lượt docs-only chỉ sửa tài liệu. Với file mới áp dụng toàn bộ quy ước; với file cũ áp dụng cho phần thay đổi mà không kéo theo diff lớn.
3. Khi được yêu cầu **triển khai công cụ** sau này: thêm cấu hình Prettier và script `format`/`format:check` có thể tái lập (pin version, lockfile); chọn phạm vi ignore tường minh; chạy check trên đúng phạm vi. Chỉ cân nhắc ESLint để phát hiện lỗi/chất lượng JS, **không** trùng trách nhiệm format của Prettier; phải kiểm tra xung đột rule trước khi thêm. Không tuyên bố script/lint check có sẵn khi chưa thêm.
4. Với format-only, review diff để xác nhận **chỉ whitespace/line wrapping/quote/semi hợp lệ**, chạy syntax/test/build và regression phù hợp khi có môi trường; ghi PASS/FAIL/BLOCKED/NOT RUN trung thực. Với docs-only, kiểm tra link và phạm vi file; không cần browser QA.
5. Bàn giao kèm branch/SHA, danh sách file, trạng thái formatter/linter thực tế và checks theo [WORKFLOW](WORKFLOW.md). Không tự merge `develop`/`main` hoặc deploy.
