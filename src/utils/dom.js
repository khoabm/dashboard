/** Builds DOM controls and translates service errors into user-facing messages. */

/**
 * Creates a DOM element with attributes, event handlers, and flattened child nodes.
 * Text children use text nodes rather than HTML parsing.
 *
 * @param {string} tag - The HTML element name.
 * @param {object} attrs - Attributes and on-prefixed event listeners.
 * @param {...*} children - Nested nodes or values to append.
 * @returns {HTMLElement} The newly created element.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'value') node.value = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity))
    if (child !== null && child !== undefined && child !== false)
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}

/**
 * Creates a non-submit button with a click callback.
 *
 * @param {string} text - The visible button label.
 * @param {Function} onClick - The click handler.
 * @param {string} className - Optional CSS classes.
 * @param {object} attrs - Additional attributes.
 * @returns {HTMLButtonElement} The configured button.
 */
export const button = (text, onClick, className = 'button', attrs = {}) =>
  el('button', { type: 'button', class: className, onClick, ...attrs }, text);

/**
 * Associates a form control with its visible label.
 *
 * @param {string} label - The field label.
 * @param {HTMLElement} control - The input or other control.
 * @returns {HTMLLabelElement} The containing label.
 */
export function field(label, control) {
  if (control?.matches?.('input[type="checkbox"]')) return checkboxField(label, control);
  return el('label', { class: 'field' }, el('span', {}, label), control);
}

/** Shared native checkbox row: label-click, keyboard semantics, and disabled state stay native. */
export function checkboxField(label, control) {
  return el('label', { class: 'field field-checkbox ui-checkbox' }, control, el('span', {}, label));
}

/**
 * Keeps numeric-looking controls free of text without changing value precision or submit rules.
 * Text mode is required for identifiers with leading zeros and exact decimal score strings.
 * Browsers vary in beforeinput support, so input fallback also rejects invalid paste/drop data.
 *
 * @param {HTMLInputElement} input - An existing input with its original type and listeners.
 * @param {{decimal?: boolean, date?: boolean}} options - Decimal point or DD/MM/YYYY separators.
 * @returns {HTMLInputElement} The unchanged control for fluent UI construction.
 */
export function restrictNumericInput(input, { decimal = false, date = false } = {}) {
  const accepted = decimal ? /^[0-9]*(?:\\.[0-9]*)?$/ : date ? /^[0-9/]*$/ : /^[0-9]*$/;
  let lastValue = accepted.test(input.value) ? input.value : '';
  let lastCaret = null;
  const caret = () => {
    // Native number inputs do not expose selection; text inputs do.
    try {
      return input.selectionStart;
    } catch {
      return null;
    }
  };
  const restore = () => {
    if (accepted.test(input.value)) {
      lastValue = input.value;
      lastCaret = caret();
      return;
    }
    input.value = lastValue;
    if (lastCaret !== null && typeof input.setSelectionRange === 'function')
      input.setSelectionRange(lastCaret, lastCaret);
  };
  input.addEventListener(
    'beforeinput',
    (event) => {
      if (event.isComposing || event.data === null || event.data === undefined) return;
      if (event.inputType?.startsWith('delete')) return;
      const start = caret();
      const end = input.selectionEnd;
      const next =
        start === null
          ? event.data
          : input.value.slice(0, start) + event.data + input.value.slice(end ?? start);
      if (!accepted.test(next)) event.preventDefault();
    },
    { capture: true },
  );
  input.addEventListener(
    'input',
    (event) => {
      if (!event.isComposing) restore();
    },
    { capture: true },
  );
  input.addEventListener('compositionend', restore);
  return input;
}

// Only explicitly reviewed app messages may reach the UI verbatim.
// Backend messages can contain internal table names, request details, or English diagnostics.
const userFacingErrors = new Set([
  'Hệ thống chưa được thiết lập đầy đủ. Vui lòng liên hệ người quản lý.',
  'Đăng nhập không thành công. Kiểm tra thông tin hoặc thử lại sau.',
  'Tài khoản này chưa được cấp quyền quản trị.',
  'Vui lòng nhập tên chủ đề.',
  'Bạn đang ngoại tuyến. Nháp vẫn được giữ trên thiết bị.',
  'Không xác minh được đầy đủ dữ liệu. Hãy tải lại trước khi chỉnh sửa.',
  'Dữ liệu thay đổi khi đang tải. Hãy tải lại trước khi chỉnh sửa.',
  'Trang dữ liệu không nhất quán. Hãy tải lại trước khi chỉnh sửa.',
  'Số lượng dữ liệu không nhất quán. Hãy tải lại.',
  'Mỗi bài tối đa 10 tài nguyên.',
  'Mỗi tệp phải nhỏ hơn 2 MB (2.000.000 byte).',
  'Chỉ nhận JPG, PNG, WebP, PDF, DOCX, PPTX, XLSX đúng định dạng.',
  'Nội dung tệp không khớp định dạng.',
  'Chưa kiểm tra được dung lượng lưu trữ. Để tránh vượt giới hạn, việc tải tệp mới đang tạm dừng.',
  'Dung lượng lưu trữ đã gần giới hạn an toàn (90%). Vui lòng giải phóng dung lượng hoặc thêm liên kết thay thế.',
  'Chưa thể xác định tệp nào có thể xóa an toàn trong nhóm này. Nhóm tệp này được giữ nguyên.',
  'Chưa thể mở tệp trong bản nháp. Nội dung đã lưu vẫn được giữ nguyên.',
  'Ghi tệp nháp bị hủy.',
  'Tệp nháp không đầy đủ. Bản nháp đã lưu vẫn được giữ nguyên.',
  'Chưa đọc đủ tệp nháp. Bản nháp đã lưu vẫn được giữ nguyên.',
]);

/**
 * Converts known backend and session failures into actionable UI messages.
 * Never display unknown backend text directly, even when it resembles a friendly message.
 *
 * @param {object} error - The error returned or thrown by a service.
 * @returns {string} A localized message, with a fallback for unknown errors.
 */
export function errorMessage(error) {
  const message = typeof error?.message === 'string' ? error.message : '';
  if (error?.code === 'PT409')
    return 'Bài đăng đã thay đổi. Vui lòng tải lại dữ liệu trước khi thử lại.';
  if (error?.code === '40001')
    return 'Bài đăng đã có thay đổi từ nơi khác. Bản nháp của bạn vẫn được giữ; hãy tải lại bài để xem phiên bản mới nhất.';
  if (error?.code === '23503')
    return 'Chủ đề này vẫn có bài đăng, bao gồm cả bài nháp và bài trong thùng rác. Hãy chuyển các bài sang chủ đề khác trước.';
  if (error?.code === '42501' || /JWT|session/i.test(message))
    return 'Phiên đăng nhập hoặc quyền quản trị không còn hợp lệ. Nội dung nháp vẫn được giữ.';
  if (error?.status === 429 || error?.code === '429')
    return 'Có quá nhiều yêu cầu cùng lúc. Vui lòng thử lại sau.';
  if (error?.name === 'AbortError') return 'Thao tác đã dừng. Vui lòng thử lại nếu cần.';
  if (userFacingErrors.has(message)) return message;
  if (/Failed to fetch|NetworkError|Load failed/i.test(message))
    return 'Không thể kết nối. Vui lòng kiểm tra mạng rồi thử lại.';
  return 'Không thể hoàn tất thao tác. Vui lòng thử lại sau.';
}
