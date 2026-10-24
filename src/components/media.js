import { el, button } from '../utils/dom.js';
import { safeUrl, youtubeId } from '../utils/validation.js';
import { attachmentUrl } from '../services/storage.js';
import { openDialog, ToastNotification } from './primitives.js';
export function VideoEmbed(url, title) {
  const id = youtubeId(url);
  const wrap = el('div', { class: 'video-wrap' });
  if (id)
    wrap.append(
      button(
        '▶  Tải video YouTube',
        () => {
          wrap.replaceChildren(
            el('iframe', {
              src: `https://www.youtube-nocookie.com/embed/${id}`,
              title,
              allow: 'fullscreen; picture-in-picture',
              allowfullscreen: true,
              referrerpolicy: 'strict-origin-when-cross-origin',
              loading: 'lazy',
            }),
          );
        },
        'video-load',
      ),
    );
  return wrap;
}
export function DocumentPreview(url, a) {
  const wrap = el('div', { class: 'document-preview' });
  if (a.mime_type === 'application/pdf')
    wrap.append(el('iframe', { src: url, title: `Xem PDF: ${a.file_name}`, loading: 'lazy' }));
  wrap.append(
    el(
      'a',
      { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'button' },
      'Mở / tải tài liệu ↗',
    ),
  );
  return wrap;
}
export function AttachmentGallery(attachments) {
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
      const load = button(a.type === 'image' ? 'Mở hình ảnh ↗' : 'Xem tài liệu ↗', async () => {
        load.disabled = true;
        try {
          const url = a.local_url || (await attachmentUrl(a));
          if (url.startsWith('blob:')) blobs.push(url);
          if (!wrap.isConnected) {
            if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            return;
          }
          if (a.type === 'image') {
            const image = el('img', {
              src: url,
              alt: a.file_name || 'Hình ảnh đính kèm',
              loading: 'lazy',
            });
            image.onerror = () => {
              item.append(el('p', {}, 'Ảnh không khả dụng. Thử tải lại hoặc liên hệ quản trị.'));
            };
            const zoom = button('Phóng to', () => {
              const { content } = openDialog(a.file_name || 'Hình ảnh');
              content.append(
                el('img', { src: url, alt: a.file_name || 'Hình phóng to', class: 'zoom-image' }),
              );
            });
            item.append(image, zoom);
          } else item.append(DocumentPreview(url, a));
          load.remove();
        } catch {
          load.disabled = false;
          ToastNotification('Không mở được tệp hoặc liên kết đã hết hạn. Vui lòng thử lại.', true);
        }
      });
      item.append(load);
    }
    wrap.append(item);
  }
  wrap.cleanup = () => blobs.forEach((url) => URL.revokeObjectURL(url));
  return wrap;
}
