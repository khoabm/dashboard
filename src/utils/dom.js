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
export const button = (text, onClick, className = 'button', attrs = {}) =>
  el('button', { type: 'button', class: className, onClick, ...attrs }, text);
export function field(label, control) {
  return el('label', { class: 'field' }, el('span', {}, label), control);
}
export function errorMessage(error) {
  if (error?.code === '40001')
    return 'Bài đã được sửa ở tab khác. Nháp vẫn được giữ; hãy tải lại bản mới.';
  if (error?.code === '23503')
    return 'Cột còn bài đăng (kể cả nháp và thùng rác). Hãy chuyển các bài sang cột khác trước.';
  if (error?.code === '42501' || /JWT|session/i.test(error?.message || ''))
    return 'Phiên đăng nhập hoặc quyền quản trị không còn hợp lệ. Nội dung nháp vẫn được giữ.';
  return error?.message || 'Không kết nối được dữ liệu. Hãy kiểm tra mạng rồi thử lại.';
}
