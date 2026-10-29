/** Builds the post editor, validates attachments, and preserves recoverable local drafts. */

import { newId } from '../utils/id.js';
import { el, button, field, errorMessage, restrictNumericInput } from '../utils/dom.js';
import {
  safeUrl,
  youtubeId,
  validateFile,
  verifyFileSignature,
  moveItem,
  debounce,
} from '../utils/validation.js';
import { savePost } from '../services/board.js';
import { uploadAttachments, cleanup, queueCleanup } from '../services/storage.js';
import {
  draftKey,
  createDraftWriter,
  readDraft,
  removeDraft,
  filesDraft,
  recoverAttachments,
} from '../services/drafts.js';
import { openDialog, ConfirmDialog, DraftRecoveryDialog, ToastNotification } from './primitives.js';
import { PostPreviewModal } from './board.js';
import { PulseIndicator, setPendingMessage } from './pending.js';

/**
 * Builds an attachment list with file, link, and ordering controls.
 * Rebuilds previews after changes; callers must release object URLs on teardown.
 *
 * @param {object} options - The uploader configuration.
 * @param {Array<object>} options.attachments - The current attachment entries.
 * @param {Function} options.onChange - Receives the updated attachment list.
 * @param {Function} options.onError - Receives a validation error message.
 * @param {Function} options.onPending - Marks a nonempty selection dirty before validation.
 * @returns {HTMLElement} The uploader root with cleanup(), whenReady(), and setAttachments().
 */
export function AttachmentUploader({ attachments, onChange, onError, onPending = () => {} }) {
  // The uploader root owns a reorderable attachment list and temporary image previews.
  const root = el('div');
  const list = el('div', { class: 'editor-attachments' });
  const objectUrls = [];
  const verificationStatus = PulseIndicator();
  let pendingFiles = 0;
  // File signature checks finish before submission or local draft dismissal can proceed.
  let pending = Promise.resolve(),
    destroyed = false;

  /**
   * Rebuilds attachment controls and revokes previews from the previous render.
   */
  function render() {
    objectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
    list.replaceChildren();
    // Each row displays an attachment with reorder and remove controls.
    attachments.forEach((a, i) => {
      const row = el('div', { class: 'editor-attachment' });
      if (a.file?.type.startsWith('image/')) {
        const url = URL.createObjectURL(a.file);
        objectUrls.push(url);
        row.append(el('img', { src: url, alt: `Xem trước ${a.file_name}` }));
      }
      row.append(
        el('span', {}, a.file_name || a.external_url),
        button(
          '↑',
          () => {
            attachments = moveItem(attachments, i, -1);
            onChange(attachments);
            render();
          },
          'icon-button',
          { 'aria-label': `Đưa tệp ${i + 1} lên`, disabled: i === 0 },
        ),
        button(
          '↓',
          () => {
            attachments = moveItem(attachments, i, 1);
            onChange(attachments);
            render();
          },
          'icon-button',
          { 'aria-label': `Đưa tệp ${i + 1} xuống`, disabled: i === attachments.length - 1 },
        ),
        button(
          '×',
          () => {
            attachments = attachments.filter((_, index) => index !== i);
            onChange(attachments);
            render();
          },
          'icon-button',
          { 'aria-label': `Bỏ ${a.file_name}` },
        ),
      );
      list.append(row);
    });
  }
  const files = el('input', {
    type: 'file',
    multiple: true,
    accept: '.jpg,.jpeg,.png,.webp,.pdf,.docx,.pptx,.xlsx',
    'aria-label': 'Chọn ảnh hoặc tài liệu',
  });
  files.addEventListener('change', () => {
    const selectedFiles = [...files.files];
    files.value = '';
    if (!selectedFiles.length) return;
    pendingFiles += selectedFiles.length;
    setPendingMessage(verificationStatus, `Đang kiểm tra ${pendingFiles} tệp đã chọn…`);
    pending = pending
      .then(async () => {
        for (const file of selectedFiles) {
          if (destroyed) return;
          const error = validateFile(file, attachments.length);
          if (error || !(await verifyFileSignature(file))) {
            onError(error || `Tệp ${file.name} có nội dung không đúng định dạng.`);
            continue;
          }
          if (destroyed) return;
          if (attachments.length >= 10) {
            onError('Mỗi bài tối đa 10 tài nguyên.');
            continue;
          }
          attachments.push({
            id: newId(),
            type: file.type.startsWith('image/') ? 'image' : 'document',
            file,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
          });
        }
        if (destroyed) return;
        onChange(attachments);
        render();
      })
      .catch((error) => onError(errorMessage(error)))
      .finally(() => {
        pendingFiles -= selectedFiles.length;
        setPendingMessage(
          verificationStatus,
          !destroyed && pendingFiles ? `Đang kiểm tra ${pendingFiles} tệp đã chọn…` : '',
        );
      });
    onPending();
  });
  const link = el('input', {
    type: 'url',
    placeholder: 'https://…',
    'aria-label': 'Địa chỉ liên kết',
  });

  /** Adds a validated HTTPS link or YouTube attachment to the working list. */
  const addLink = () => {
    const url = safeUrl(link.value);
    if (!url) {
      onError('Chỉ nhận URL HTTPS hợp lệ, không có thông tin đăng nhập.');
      return;
    }
    if (attachments.length >= 10) {
      onError('Mỗi bài tối đa 10 tài nguyên.');
      return;
    }
    const id = youtubeId(url);
    onError('');
    attachments.push({
      id: newId(),
      type: id ? 'youtube' : 'link',
      external_url: url,
      file_name: id ? 'Video YouTube' : new URL(url).hostname,
    });
    link.value = '';
    onChange(attachments);
    render();
  };
  // Uploader layout: file selection area, current attachments, then external-link entry.
  root.append(
    el(
      'div',
      { class: 'upload-zone' },
      el('strong', {}, 'Ảnh & tài liệu'),
      el(
        'p',
        {},
        'JPG, PNG, WebP, PDF, DOCX, PPTX, XLSX · mỗi tệp < 2 MB · tối đa 10 tài nguyên/bài',
      ),
      files,
      verificationStatus,
    ),
    list,
    el(
      'div',
      { class: 'link-row' },
      field('Hoặc thêm liên kết / YouTube', link),
      button('Thêm', addLink),
    ),
  );
  render();
  root.whenReady = () => pending;
  root.cleanup = () => {
    destroyed = true;
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
  };
  root.setAttachments = (value) => {
    attachments = value;
    render();
  };
  return root;
}

/**
 * Opens the post editor and offers recovery of a locally saved draft.
 * Uploads files before the version-checked post save and retains drafts after failure.
 *
 * @param {object} options - The editor configuration.
 * @param {object|null} options.post - Existing post, or null for creation.
 * @param {string} options.sectionId - The section chosen for a new post.
 * @param {object} options.data - Current board data for section and ordering controls.
 * @param {string} options.userId - The user identifier used to isolate drafts.
 * @param {Function} options.onSaved - Refreshes the board after a successful save.
 * @param {Function} options.onDirty - Reports whether unsaved changes remain.
 * @param {Function} options.isCurrent - Checks the owning authentication generation.
 * @returns {Promise<HTMLDialogElement>} The editor dialog, if still open.
 */
export async function PostEditorDrawer({
  post,
  sectionId,
  data,
  userId,
  onSaved,
  onDirty,
  isCurrent = () => true,
}) {
  const key = draftKey(userId, post?.id || 'new');
  const saved = readDraft(key);
  // Pending or failed recovery is read-only: the original draft must not be rewritten.
  let recoveryReady = !saved;
  // Clone an existing post or initialize a draft model before building the editor form.
  let model = post
    ? structuredClone(post)
    : {
        id: newId(),
        title: '',
        body: '',
        section_id: sectionId || data.sections[0]?.id,
        status: 'draft',
        sort_order: data.posts.filter((p) => p.section_id === sectionId).length,
        attachments: [],
        thumbnail_id: null,
      };

  // Editor-local attachments and dirty/busy/closing flags guard saving and dismissal.
  let attachments = [...model.attachments],
    dirty = false,
    busy = false,
    closing = false;
  const original = post?.attachments || [];
  const { dialog, content, close } = openDialog(post ? 'Chỉnh sửa bài đăng' : 'Tạo bài đăng', {
    drawer: true,
  });
  /** Checks the editor and Auth generation after each asynchronous remote-save boundary. */
  const canContinue = () => dialog.open && isCurrent();
  const progress = PulseIndicator();
  progress.classList.add('dialog-progress');
  dialog.querySelector('.dialog-heading').append(progress);
  // Recovery feedback remains accessible while the editable form is inert.
  const recoveryNotice = el('div', { role: 'status' });
  // Form controls hold unsaved values; only submit() attempts remote persistence.
  const title = el('input', {
    required: true,
    maxlength: 200,
    value: model.title,
    placeholder: 'Nhập tiêu đề học liệu…',
  });
  const body = el(
    'textarea',
    { rows: 5, maxlength: 20000, placeholder: 'Mô tả hoặc nội dung bài viết…' },
    model.body,
  );
  const section = el(
    'select',
    { required: true },
    data.sections.map((s) =>
      el('option', { value: s.id, selected: s.id === model.section_id }, s.title),
    ),
  );
  const order = restrictNumericInput(el('input', { type: 'number', step: 1, required: true, value: model.sort_order }));
  const status = el(
    'select',
    {},
    ['published', 'draft', 'hidden'].map((s) =>
      el(
        'option',
        { value: s, selected: s === model.status },
        { published: 'Xuất bản', draft: 'Bản nháp', hidden: 'Ẩn khỏi người xem' }[s],
      ),
    ),
  );
  const thumbnail = el('select', { 'aria-label': 'Ảnh đại diện' });
  // error reports validation/save failures; draftStatus reports local draft and upload progress.
  const error = el('p', { class: 'form-error', role: 'alert' }),
    draftStatus = el('div', { class: 'draft-status', role: 'status' });
  // The form groups post metadata, publication settings, and the attachment section.
  const form = el(
    'form',
    {},
    field('Tiêu đề *', title),
    field('Chủ đề *', section),
    field('Nội dung / mô tả', body),
    el('div', { class: 'field-row' }, field('Trạng thái', status), field('Vị trí', order)),
    field('Ảnh đại diện', thumbnail),
    el('h3', { class: 'editor-section-label' }, 'Tài nguyên đính kèm'),
  );

  /**
   * Collects the current form values and pending attachments into one post model.
   *
   * @returns {object} The unsaved post state.
   */
  function read() {
    return {
      ...model,
      title: title.value.trim(),
      body: body.value,
      section_id: section.value,
      sort_order: Number(order.value),
      status: status.value,
      thumbnail_id: thumbnail.value || null,
      attachments,
    };
  }

  /**
   * Serializes text and file draft writes without marking the post as synced.
   *
   * @returns {Promise<boolean>} Whether both stores accepted this draft snapshot.
   */
  async function persist() {
    if (!recoveryReady) return false;
    if (!busy) {
      const localProgress = PulseIndicator('Đang lưu nháp trên thiết bị…');
      localProgress.classList.add('inline-progress');
      localProgress.removeAttribute('role');
      localProgress.removeAttribute('aria-live');
      draftStatus.replaceChildren(localProgress);
    }
    const saved = await draftWriter.save();
    if (dirty && dialog.open)
      draftStatus.textContent = saved
        ? 'Bản nháp đã được lưu trên thiết bị này, nhưng chưa được lưu vào bài đăng.'
        : 'Chưa thể lưu bản nháp trên thiết bị này. Hãy giữ trang mở và thử lại.';
    return saved;
  }
  const autosave = debounce(persist, 450);

  /** Tracks file selections and results while busy, without reviving a closed session's dirty flag. */
  function markDirty() {
    if (!recoveryReady) return;
    dirty = true;
    if (!dialog.open || closing) return;
    onDirty(true);
    draftStatus.textContent = 'Có thay đổi chưa được lưu vào bài đăng.';
    if (!busy) autosave();
  }

  /** Marks editable form events dirty; in-flight file callbacks use markDirty directly. */
  function changed() {
    if (!busy && !closing) markDirty();
  }

  /** Rebuilds image thumbnail choices while keeping the current selection. */
  function renderThumbnail() {
    const value = thumbnail.value || model.thumbnail_id;
    thumbnail.replaceChildren(
      el('option', { value: '' }, 'Không chọn / tự động'),
      attachments
        .filter((a) => a.type === 'image')
        .map((a) => el('option', { value: a.id, selected: a.id === value }, a.file_name)),
    );
  }
  const uploader = AttachmentUploader({
    attachments,
    onChange: (value) => {
      attachments = value;
      renderThumbnail();
      markDirty();
    },
    onPending: markDirty,
    onError: (message) => (error.textContent = message),
  });
  const draftWriter = createDraftWriter(key, {
    read: () => (recoveryReady && dirty ? read() : null),
    whenReady: () => uploader.whenReady(),
  });
  // The uploader and both feedback regions follow the post fields inside the form.
  form.append(uploader, error, draftStatus);
  const saveDraftButton = button('Lưu bản nháp lên hệ thống', () => submit('draft'));
  const publish = el('button', { type: 'submit', class: 'button primary' }, 'Lưu bài đăng');
  const closeButton = button('×', requestClose, 'icon-button', {
    'aria-label': 'Đóng trình soạn thảo',
  });
  close.replaceWith(closeButton);

  /**
   * Locks keyboard, pointer, and close actions while a stable snapshot is being saved.
   *
   * @param {boolean} value - Whether the editor is processing an explicit action.
   * @param {string} message - The current phase shown outside the inert form.
   */
  function setBusy(value, message = 'Đang xử lý…') {
    busy = value;
    form.inert = value || !recoveryReady;
    form.setAttribute('aria-busy', String(value));
    closeButton.disabled = value;
    publish.disabled = value || !recoveryReady;
    saveDraftButton.disabled = value || !recoveryReady;
    form.classList.toggle('form-busy', value);
    setPendingMessage(progress, value ? message : '');
  }
  // Footer actions support cancellation, draft save, preview, and final submit.
  form.append(
    el(
      'div',
      { class: 'form-actions' },
      button('Hủy', requestClose),
      saveDraftButton,
      button('Xem trước', () => {
        const value = read();
        if (!value.title) {
          error.textContent = 'Vui lòng nhập tiêu đề.';
          return;
        }
        PostPreviewModal(
          value,
          data.sections.find((s) => s.id === value.section_id),
        );
      }),
      publish,
    ),
  );
  form.addEventListener('input', changed);
  form.addEventListener('change', changed);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit(status.value);
  });

  /**
   * Validates and saves the post, then clears drafts only after remote success.
   * On failure, attempts uploaded-file cleanup and retains the recoverable draft.
   *
   * @param {string} nextStatus - The requested post publication state.
   */
  async function submit(nextStatus) {
    if (busy || !recoveryReady || !canContinue() || !form.reportValidity()) return;
    setBusy(true, 'Đang kiểm tra tệp trước khi lưu…');
    autosave.cancel();
    await uploader.whenReady();
    if (!canContinue()) {
      if (dialog.open) setBusy(false);
      return;
    }
    const value = {
      ...read(),
      attachments: [...attachments],
      status: nextStatus,
      placeholder_kind: null,
    };
    if (!value.title) {
      error.textContent = 'Vui lòng nhập tiêu đề.';
      setBusy(false);
      return;
    }
    if (!Number.isInteger(value.sort_order)) {
      error.textContent = 'Vị trí phải là số nguyên.';
      setBusy(false);
      return;
    }
    error.textContent = '';
    let uploaded;
    let unused = [];
    let saveAttempted = false;
    try {
      if (!navigator.onLine) throw Error('Bạn đang ngoại tuyến. Nháp vẫn được giữ trên thiết bị.');
      setPendingMessage(
        progress,
        value.attachments.some((attachment) => attachment.file)
          ? 'Đang tải tệp đính kèm…'
          : 'Đang chuẩn bị bài đăng…',
      );
      uploaded = await uploadAttachments(
        value.id,
        value.attachments,
        (done, total) => {
          draftStatus.textContent = `Đang tải tệp ${done}/${total}…`;
          setPendingMessage(progress, draftStatus.textContent);
        },
        undefined,
        canContinue,
      );
      if (!canContinue()) {
        queueCleanup(uploaded.paths);
        return;
      }
      unused = original
        .filter(
          (a) =>
            a.storage_path && !uploaded.attachments.some((b) => a.storage_path === b.storage_path),
        )
        .map((a) => a.storage_path);
      saveAttempted = true;
      setPendingMessage(
        progress,
        nextStatus === 'published' ? 'Đang xuất bản bài đăng…' : 'Đang lưu bài đăng…',
      );
      await savePost(value, uploaded.attachments);
      // The RPC may commit after SIGNED_OUT. Keep replaced paths before the cancellation exit.
      queueCleanup(unused);
      if (!canContinue()) {
        queueCleanup(uploaded.paths);
        return;
      }
      setPendingMessage(progress, 'Đang hoàn tất lưu bài…');
      await cleanup(unused, undefined, canContinue).catch(() => {
        if (canContinue())
          ToastNotification(
            'Đã lưu bài đăng. Một số tệp cũ chưa xóa được; bạn có thể thử dọn chúng sau.',
            true,
          );
      });
      if (!canContinue()) return;
      autosave.cancel();
      await draftWriter.settled();
      if (!canContinue()) return;
      dirty = false;
      if (dialog.open) onDirty(false);
      removeDraft(key);
      await filesDraft(key, null).catch(() => {});
      if (!canContinue()) return;
      closing = true;
      dialog.close();
      await onSaved();
      ToastNotification(
        nextStatus === 'published' ? 'Đã xuất bản bài đăng.' : 'Đã lưu bài đăng thành công.',
      );
    } catch (e) {
      // A lost response cannot establish whether the RPC committed; later cleanup checks references.
      if (saveAttempted) queueCleanup(unused);
      if (uploaded) {
        if (canContinue()) await cleanup(uploaded.paths, undefined, canContinue).catch(() => {});
        else queueCleanup(uploaded.paths);
      }
      if (!canContinue()) return;
      error.textContent = errorMessage(e);
      await persist();
    } finally {
      if (dialog.open) setBusy(false);
    }
  }

  /** Confirms unsaved changes and attempts to persist the local draft before closing. */
  async function requestClose() {
    if (busy || closing) return;
    if (!recoveryReady) {
      closing = true;
      dialog.close();
      return;
    }
    setBusy(true, 'Đang chuẩn bị đóng trình soạn thảo…');
    autosave.cancel();
    try {
      await uploader.whenReady();
      if (!dialog.open) return;
      if (
        dirty &&
        !(await ConfirmDialog(
          'Rời trình soạn thảo?',
          'Những thay đổi này chưa được lưu vào bài đăng. Bạn chỉ có thể đóng sau khi bản nháp được lưu thành công trên thiết bị.',
        ))
      ) {
        if (dialog.open) autosave();
        return;
      }
      if (!dialog.open) return;
      setPendingMessage(progress, 'Đang lưu nháp trước khi đóng…');
      if (!(await persist())) {
        error.textContent =
          'Chưa thể lưu bản nháp trên thiết bị. Hãy thử lại hoặc lưu bài đăng trước khi đóng.';
        return;
      }
      closing = true;
      dialog.close();
    } finally {
      if (dialog.open) setBusy(false);
    }
  }
  // Logout flushes a stable selection before its own confirmation and Auth request.
  dialog.preserveDraft = async () => {
    if (!recoveryReady) return true;
    if (busy || closing) return false;
    setBusy(true, 'Đang giữ nháp trước khi đăng xuất…');
    autosave.cancel();
    try {
      return await persist();
    } finally {
      if (dialog.open) setBusy(false);
    }
  };
  dialog.addEventListener('cancel', (event) => {
    if (!closing) {
      event.preventDefault();
      requestClose();
    }
  });
  dialog.addEventListener(
    'close',
    () => {
      autosave.cancel();
      onDirty(false);
      // Clear private UI immediately, but let local file checks finish before destroying the queue.
      if (!closing && recoveryReady) {
        void persist()
          .then((saved) => {
            if (!saved)
              ToastNotification(
                'Phiên đã kết thúc nhưng chưa lưu được nháp trên thiết bị này.',
                true,
              );
          })
          .finally(() => uploader.cleanup());
      } else uploader.cleanup();
    },
    { once: true },
  );
  renderThumbnail();
  content.append(recoveryNotice, form);

  /** Shows a safe retry while both original draft stores remain untouched. */
  function recoveryFailed(message) {
    recoveryNotice.replaceChildren(
      el('p', { class: 'form-error' }, `${message} Bản nháp đã lưu vẫn được giữ nguyên.`),
      button('Thử khôi phục lại', restoreSaved),
      button('Giữ nháp và đóng', () => {
        closing = true;
        dialog.close();
      }),
    );
  }

  /** Restores fields only after every promised blob has been read successfully. */
  async function restoreSaved() {
    if (busy || !canContinue()) return;
    setBusy(true, 'Đang khôi phục bản nháp…');
    let restored = false;
    try {
      const recovered = await recoverAttachments(key, saved);
      if (!canContinue()) return;
      model = { ...model, ...saved };
      title.value = model.title || '';
      body.value = model.body || '';
      section.value = model.section_id;
      order.value = model.sort_order;
      status.value = model.status === 'deleted' ? 'draft' : model.status;
      attachments = recovered;
      uploader.setAttachments(attachments);
      renderThumbnail();
      recoveryReady = true;
      recoveryNotice.replaceChildren();
      restored = true;
    } catch {
      if (canContinue()) recoveryFailed('Chưa đọc đủ tệp nháp. Hãy thử lại hoặc đóng để giữ nháp.');
    } finally {
      if (dialog.open) setBusy(false);
    }
    if (restored && canContinue()) markDirty();
  }

  setBusy(false);
  if (saved) {
    const decision = await DraftRecoveryDialog(
      `Khôi phục nội dung đã lưu lúc ${new Date(saved.saved_at).toLocaleString('vi-VN')}? Tệp nháp được giữ riêng trên thiết bị này.`,
    );
    if (!canContinue()) return dialog;
    if (decision === 'restore') await restoreSaved();
    else if (decision === 'discard') {
      setBusy(true, 'Đang bỏ bản nháp…');
      try {
        // Only the explicit discard button authorizes deletion, never an external close.
        await filesDraft(key, null);
        removeDraft(key);
        if (!canContinue()) return dialog;
        recoveryReady = true;
      } catch {
        if (canContinue()) recoveryFailed('Không thể bỏ tệp nháp trên thiết bị.');
      } finally {
        if (dialog.open) setBusy(false);
      }
    } else {
      closing = true;
      dialog.close();
    }
  }
  if (canContinue() && recoveryReady) title.focus();
  return dialog;
}
