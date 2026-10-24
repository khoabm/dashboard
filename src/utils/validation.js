/** Validates external media and provides pure helpers for search and post ordering. */

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

/**
 * Accepts HTTPS URLs without embedded credentials for external resources.
 *
 * @param {string} value - The candidate URL.
 * @returns {string|null} The normalized URL, or null when invalid.
 */
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

/**
 * Extracts an 11-character video ID from supported YouTube URLs.
 *
 * @param {string} value - The candidate video URL.
 * @returns {string|null} The video ID, or null when the URL is unsupported.
 */
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

/**
 * Checks attachment count, file size, extension, and declared MIME type.
 * Signature verification is performed separately before upload.
 *
 * @param {File} file - The selected attachment.
 * @param {number} count - Existing attachment count.
 * @returns {string|null} A validation message, or null when accepted.
 */
export function validateFile(file, count = 0) {
  if (count >= MAX_ATTACHMENTS) return 'Mỗi bài tối đa 10 tài nguyên.';
  if (!file.size || file.size >= MAX_BYTES) return 'Mỗi tệp phải nhỏ hơn 2 MB (2.000.000 byte).';
  const extension = file.name.toLowerCase().split('.').pop();
  if (!FILE_TYPES[extension] || file.type !== FILE_TYPES[extension])
    return 'Chỉ nhận JPG, PNG, WebP, PDF, DOCX, PPTX, XLSX đúng định dạng.';
  return null;
}

/**
 * Checks leading file bytes against the supported image, PDF, or ZIP signatures.
 *
 * @param {File} file - The selected attachment.
 * @returns {Promise<boolean>} Whether its header matches the declared MIME type.
 */
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

/**
 * Removes Vietnamese diacritics and normalizes case for text search.
 *
 * @param {string} text - The text to normalize.
 * @returns {string} The comparable search text.
 */
export const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

/**
 * Searches a post and its section using accent-insensitive matching.
 *
 * @param {object} post - The post title and body.
 * @param {object} section - The section title and description.
 * @param {string} query - The user-entered search term.
 * @returns {boolean} Whether the combined text contains the term.
 */
export function matches(post, section, query) {
  return normalize(`${post.title} ${post.body} ${section.title} ${section.description}`).includes(
    normalize(query.trim()),
  );
}

/**
 * Allows restoration only for deleted posts within the 30-day window.
 *
 * @param {object} post - The post status and deletion timestamp.
 * @param {number} now - The comparison time in milliseconds.
 * @returns {boolean} Whether restoration is still permitted.
 */
export function canRestore(post, now = Date.now()) {
  return post.status === 'deleted' && now - new Date(post.deleted_at).getTime() <= 30 * 86400000;
}

/**
 * Returns a reordered array without mutating the input.
 * An out-of-range move returns an unchanged copy.
 *
 * @param {Array<*>} items - The original ordered items.
 * @param {number} index - The item to move.
 * @param {number} delta - The relative position change.
 * @returns {Array<*>} The reordered copy.
 */
export function moveItem(items, index, delta) {
  const next = [...items],
    target = index + delta;
  if (target < 0 || target >= items.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Delays a callback until input settles and exposes cancel() for teardown.
 *
 * @param {Function} fn - The callback to schedule.
 * @param {number} delay - The idle period in milliseconds.
 * @returns {Function} The debounced callback with a cancel() method.
 */
export function debounce(fn, delay = 250) {
  let timer;
  const call = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  call.cancel = () => clearTimeout(timer);
  return call;
}
