/** Displays external media and attachment previews only when the viewer opens them. */

import { el, button } from '../utils/dom.js';
import { safeUrl, youtubeId } from '../utils/validation.js';
import { attachmentUrl } from '../services/storage.js';
import { openDialog, ToastNotification } from './primitives.js';
import { PulseIndicator, setPendingMessage } from './pending.js';

/**
 * Keeps frame loading visible until the browser reports load or failure.
 * A load event describes the frame only, not successful video playback or PDF rendering.
 *
 * @param {HTMLElement} wrap - The preview container receiving the frame.
 * @param {HTMLIFrameElement} frame - The user-requested embedded document or video.
 * @param {string} message - The pending frame description.
 */
function appendFrame(wrap, frame, message) {
  const progress = PulseIndicator(message);
  frame.addEventListener('load', () => setPendingMessage(progress), { once: true });
  frame.addEventListener(
    'error',
    () => {
      setPendingMessage(progress);
      wrap.append(
        el('p', {}, 'Không tải được nội dung nhúng. Vui lòng mở lại hoặc dùng liên kết tài liệu.'),
      );
    },
    { once: true },
  );
  wrap.append(progress, frame);
}

/**
 * Creates a YouTube preview that loads its iframe only after a click.
 *
 * @param {string} url - The YouTube URL to validate.
 * @param {string} title - The accessible iframe title.
 * @returns {HTMLElement} The lazy video container.
 */
export function VideoEmbed(url, title) {
  const id = youtubeId(url);
  // video-wrap is a click-to-load placeholder until an iframe replaces the button.
  const wrap = el('div', { class: 'video-wrap' });
  if (id)
    wrap.append(
      button(
        '▶  Tải video YouTube',
        () => {
          wrap.replaceChildren();
          appendFrame(
            wrap,
            el('iframe', {
              src: `https://www.youtube-nocookie.com/embed/${id}`,
              title,
              allow: 'fullscreen; picture-in-picture',
              allowfullscreen: true,
              referrerpolicy: 'strict-origin-when-cross-origin',
              loading: 'lazy',
            }),
            'Đang tải trình phát video…',
          );
        },
        'video-load',
      ),
    );
  return wrap;
}

/**
 * Builds a document link and an inline viewer when the attachment is a PDF.
 *
 * @param {string} url - The resolved document URL.
 * @param {object} a - Attachment name and MIME metadata.
 * @returns {HTMLElement} The document preview.
 */
export function DocumentPreview(url, a) {
  // document-preview groups an optional inline PDF viewer with its open/download link.
  const wrap = el('div', { class: 'document-preview' });
  if (a.mime_type === 'application/pdf')
    appendFrame(
      wrap,
      el('iframe', { src: url, title: `Xem PDF: ${a.file_name}`, loading: 'lazy' }),
      'Đang tải bản xem PDF…',
    );
  wrap.append(
    el(
      'a',
      { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'button' },
      'Mở / tải tài liệu ↗',
    ),
  );
  return wrap;
}

/**
 * Renders attachment entries and resolves protected file URLs on demand.
 * The caller must invoke cleanup() to revoke created blob URLs.
 *
 * @param {Array<object>} attachments - Media entries to preview.
 * @returns {HTMLElement} The gallery root with a cleanup() helper.
 */
export function AttachmentGallery(attachments) {
  // The gallery groups per-attachment headings and user-triggered previews.
  const wrap = el('div', { class: 'attachment-gallery' });
  const blobs = [];
  for (const a of attachments) {
    const item = el('section', { class: 'attachment' });
    item.append(el('h3', {}, a.file_name || 'Tài nguyên'));
    if (a.type === 'youtube' && youtubeId(a.external_url))
      item.append(VideoEmbed(a.external_url, a.file_name || 'Video YouTube'));
    else if (a.type === 'link') {
      const url = safeUrl(a.external_url || '');
      if (url)
        item.append(
          el(
            'a',
            { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'resource-link' },
            new URL(url).hostname,
            ' ↗',
          ),
        );
    } else {
      const progress = PulseIndicator();
      const load = button(a.type === 'image' ? 'Mở hình ảnh ↗' : 'Xem tài liệu ↗', async () => {
        if (load.disabled) return;
        load.disabled = true;
        setPendingMessage(progress, 'Đang mở tài nguyên…');
        try {
          const url = a.local_url || (await attachmentUrl(a));
          if (url.startsWith('blob:')) blobs.push(url);
          if (!wrap.isConnected) {
            if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            return;
          }
          if (a.type === 'image') {
            setPendingMessage(progress, 'Đang tải hình ảnh…');
            await new Promise((resolve, reject) => {
              const image = el('img', {
                src: url,
                alt: a.file_name || 'Hình ảnh đính kèm',
                onLoad: resolve,
                onError: () => {
                  image.remove();
                  reject(Error('Image unavailable'));
                },
              });
              item.append(image);
            });
            if (!wrap.isConnected) return;
            const zoom = button('Phóng to', () => {
              const { content } = openDialog(a.file_name || 'Hình ảnh');
              content.append(
                el('img', { src: url, alt: a.file_name || 'Hình phóng to', class: 'zoom-image' }),
              );
            });
            item.append(zoom);
          } else item.append(DocumentPreview(url, a));
          load.remove();
        } catch {
          load.disabled = false;
          if (wrap.isConnected)
            ToastNotification(
              'Không mở được tệp hoặc liên kết đã hết hạn. Vui lòng thử lại.',
              true,
            );
        } finally {
          setPendingMessage(progress);
        }
      });
      item.append(progress, load);
    }
    wrap.append(item);
  }
  wrap.cleanup = () => blobs.forEach((url) => URL.revokeObjectURL(url));
  return wrap;
}
