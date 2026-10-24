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
  return el('label', { class: 'field' }, el('span', {}, label), control);
}

/**
 * Converts known backend and session failures into actionable UI messages.
 *
 * @param {object} error - The error returned or thrown by a service.
 * @returns {string} A localized message, with a fallback for unknown errors.
 */
export function errorMessage(error) {
  if (error?.code === '40001')
    return 'Bài đăng đã có thay đổi từ nơi khác. Bản nháp của bạn vẫn được giữ; hãy tải lại bài để xem phiên bản mới nhất.';
  if (error?.code === '23503')
    return 'Cột còn bài đăng (kể cả nháp và thùng rác). Hãy chuyển các bài sang cột khác trước.';
  if (error?.code === '42501' || /JWT|session/i.test(error?.message || ''))
    return 'Phiên đăng nhập hoặc quyền quản trị không còn hợp lệ. Nội dung nháp vẫn được giữ.';
  return error?.message || 'Không kết nối được dữ liệu. Hãy kiểm tra mạng rồi thử lại.';
}
