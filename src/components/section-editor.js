/** Opens the section editor and delegates persistence to board services. */

import { el, button, field, errorMessage } from '../utils/dom.js';
import { saveSection, deleteSection } from '../services/board.js';
import { openDialog, ConfirmDialog, ToastNotification } from './primitives.js';
import { PulseIndicator, setPendingMessage } from './pending.js';
import { createPendingTask } from '../utils/pending-task.js';

/**
 * Opens a dialog to create, update, or delete a section.
 * Refuses deletion while posts still reference the section.
 *
 * @param {object|null} section - The section to edit, or null for a new section.
 * @param {object} data - Current board and post data for validation.
 * @param {Function} onSaved - Receives the confirmed section ID for new-section reveal.
 */
export function SectionEditor(section, data, onSaved) {
  const { dialog, content, close } = openDialog(section ? 'Sửa chủ đề' : 'Thêm chủ đề');
  const progress = PulseIndicator();
  progress.classList.add('dialog-progress');
  dialog.querySelector('.dialog-heading').append(progress);
  const title = el('input', { required: true, maxlength: 100, value: section?.title || '' });
  const description = el('textarea', { maxlength: 1000, rows: 3 }, section?.description || '');
  const color = el('input', { type: 'color', value: section?.color || '#dcece5' });
  const order = el('input', {
    type: 'number',
    step: 1,
    required: true,
    value: section?.sort_order ?? data.sections.length,
  });
  const error = el('p', { class: 'form-error', role: 'alert' });
  const submit = el('button', { type: 'submit', class: 'button primary' }, 'Lưu chủ đề');
  // Section form: editable metadata, validation feedback, and save/cancel actions.
  const form = el(
    'form',
    {},
    field('Tên chủ đề', title),
    field('Mô tả', description),
    el('div', { class: 'field-row' }, field('Màu chủ đề', color), field('Vị trí', order)),
    error,
    el(
      'div',
      { class: 'form-actions' },
      button('Hủy', () => dialog.close()),
      submit,
    ),
  );
  const saving = createPendingTask((message) => {
    setPendingMessage(progress, message);
    form.inert = !!message;
    form.setAttribute('aria-busy', String(!!message));
    form.classList.toggle('form-busy', !!message);
    submit.disabled = close.disabled = !!message;
  });
  dialog.addEventListener('cancel', (event) => {
    if (saving.pending()) event.preventDefault();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saving.run('Đang lưu chủ đề…', async () => {
      error.textContent = '';
      try {
        if (!title.value.trim()) throw Error('Vui lòng nhập tên chủ đề.');
        const saved = await saveSection({
          ...section,
          board_id: data.board.id,
          title: title.value.trim(),
          description: description.value,
          color: color.value,
          sort_order: Number(order.value),
        });
        if (!dialog.open) return;
        dialog.close();
        const refreshed = await onSaved({ revealSectionId: section ? null : saved.id });
        // Keep a refresh failure visible; do not overwrite it with a success toast after the dialog closes.
        if (refreshed)
          ToastNotification(section ? 'Đã lưu chủ đề.' : `Đã thêm chủ đề “${saved.title}”.`);
      } catch (e) {
        if (dialog.open) error.textContent = errorMessage(e);
      }
    });
  });
  if (section)
    form.append(
      button(
        'Xóa chủ đề',
        async () => {
          if (saving.pending()) return;
          const count = data.posts.filter((p) => p.section_id === section.id).length;
          if (count) {
            error.textContent = `Chủ đề này vẫn còn ${count} bài đăng, bao gồm cả bài nháp và bài trong thùng rác. Hãy chuyển chúng sang chủ đề khác trước.`;
            return;
          }
          if (
            !(await ConfirmDialog(
              'Xóa chủ đề trống?',
              'Chủ đề trống này sẽ bị xóa. Không có bài đăng nào bị xóa.',
            ))
          )
            return;
          if (!dialog.open) return;
          await saving.run('Đang xóa chủ đề…', async () => {
            try {
              await deleteSection(section.id);
              if (!dialog.open) return;
              dialog.close();
              await onSaved();
            } catch (e) {
              if (dialog.open) error.textContent = errorMessage(e);
            }
          });
        },
        'button danger subtle',
      ),
    );
  content.append(form);
}
