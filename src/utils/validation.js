export const MAX_BYTES = 2_000_000;
export const MAX_ATTACHMENTS = 10;
export const FILE_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
export function safeUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.'))
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export function youtubeId(value) {
  const safe = safeUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  let id;
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    id =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1];
  } else if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  return /^[\w-]{11}$/.test(id || '') ? id : null;
}
export function validateFile(file, count = 0) {
  if (count >= MAX_ATTACHMENTS) return 'Mỗi bài tối đa 10 tài nguyên.';
  if (!file.size || file.size >= MAX_BYTES) return 'Mỗi tệp phải nhỏ hơn 2 MB (2.000.000 byte).';
  const extension = file.name.toLowerCase().split('.').pop();
  if (!FILE_TYPES[extension] || file.type !== FILE_TYPES[extension])
    return 'Chỉ nhận JPG, PNG, WebP, PDF, DOCX, PPTX, XLSX đúng định dạng.';
  return null;
}
export async function verifyFileSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const match = (...signature) => signature.every((byte, index) => bytes[index] === byte);
  const text = new TextDecoder().decode(bytes);
  if (file.type === 'image/jpeg') return match(255, 216, 255);
  if (file.type === 'image/png') return match(137, 80, 78, 71, 13, 10, 26, 10);
  if (file.type === 'image/webp') return text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP';
  if (file.type === 'application/pdf') return text.startsWith('%PDF-');
  return match(80, 75, 3, 4); // OOXML ZIP container; never executed or embedded as HTML.
}
export const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
export function matches(post, section, query) {
  return normalize(`${post.title} ${post.body} ${section.title} ${section.description}`).includes(
    normalize(query.trim()),
  );
}
export function canRestore(post, now = Date.now()) {
  return post.status === 'deleted' && now - new Date(post.deleted_at).getTime() <= 30 * 86400000;
}
export function moveItem(items, index, delta) {
  const next = [...items],
    target = index + delta;
  if (target < 0 || target >= items.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
export function debounce(fn, delay = 250) {
  let timer;
  const call = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  call.cancel = () => clearTimeout(timer);
  return call;
}
