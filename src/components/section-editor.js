/** Opens the section editor and delegates persistence to board services. */

import { el, button, field, errorMessage } from '../utils/dom.js';
import { saveSection, deleteSection } from '../services/board.js';
import { openDialog, ConfirmDialog, ToastNotification } from './primitives.js';

/**
 * Opens a dialog to create, update, or delete a section.
 * Refuses deletion while posts still reference the section.
 *
 * @param {object|null} section - The section to edit, or null for a new section.
 * @param {object} data - Current board and post data for validation.
 * @param {Function} onSaved - Refreshes the board after a successful change.
 */
export function SectionEditor(section, data, onSaved) {
  const { dialog, content } = openDialog(section ? 'Sửa chủ đề' : 'Thêm chủ đề');
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
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      if (!title.value.trim()) throw Error('Vui lòng nhập tên chủ đề.');
      await saveSection({
        ...section,
        board_id: data.board.id,
        title: title.value.trim(),
        description: description.value,
        color: color.value,
        sort_order: Number(order.value),
      });
      dialog.close();
      await onSaved();
      ToastNotification('Đã lưu chủ đề.');
    } catch (e) {
      error.textContent = errorMessage(e);
    } finally {
      submit.disabled = false;
    }
  });
  if (section)
    form.append(
      button(
        'Xóa chủ đề',
        async () => {
          const count = data.posts.filter((p) => p.section_id === section.id).length;
          if (count) {
            error.textContent = `Chủ đề còn ${count} bài (gồm nháp/thùng rác). Hãy chuyển các bài sang chủ đề khác trước.`;
            return;
          }
          if (
            !(await ConfirmDialog(
              'Xóa chủ đề trống?',
              'Thao tác này xóa cột trống. Không có bài đăng nào bị xóa.',
            ))
          )
            return;
          try {
            await deleteSection(section.id);
            dialog.close();
            await onSaved();
          } catch (e) {
            error.textContent = errorMessage(e);
          }
        },
        'button danger subtle',
      ),
    );
  content.append(form);
}
