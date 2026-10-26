/** Provides reusable feedback states, dialogs, and status labels for the UI. */

import { el, button } from '../utils/dom.js';
import { PulseIndicator } from './pending.js';

/**
 * Shows a temporary toast, replacing any previously scheduled dismissal.
 *
 * @param {string} message - The visible notification.
 * @param {boolean} error - Whether to use the error presentation.
 */
export function ToastNotification(message, error = false) {
  const root = document.querySelector('#toast');
  root.textContent = message;
  root.className = error ? 'toast error' : 'toast';
  clearTimeout(ToastNotification.timer);
  ToastNotification.timer = setTimeout(() => {
    root.className = '';
    root.textContent = '';
  }, 6500);
}

/**
 * Builds the loading indicator used while the board first loads.
 *
 * @returns {HTMLElement} The status element.
 */
export const LoadingState = () =>
  el('div', { class: 'state loading' }, PulseIndicator('Đang mở không gian học liệu…'));

/**
 * Builds the empty-state message for a board without visible posts.
 *
 * @param {string} message - The main empty-state heading.
 * @returns {HTMLElement} The empty-state element.
 */
export const EmptyState = (message = 'Chưa có học liệu ở đây.') =>
  el(
    'div',
    { class: 'state empty' },
    el('span', { class: 'state-icon', 'aria-hidden': 'true' }, '⌁'),
    el('h3', {}, message),
    el('p', {}, 'Hãy thử chủ đề khác hoặc thay đổi từ khóa tìm kiếm.'),
  );

/**
 * Builds an error state with a retry action.
 *
 * @param {string} message - The failure details.
 * @param {Function} retry - The callback to retry loading.
 * @returns {HTMLElement} The error-state element.
 */
export const ErrorState = (message, retry) =>
  el(
    'div',
    { class: 'state error' },
    el('h3', {}, 'Chưa thể tải học liệu'),
    el('p', {}, message),
    button('Thử lại', retry),
  );

/**
 * Builds a compact synchronization or admin-status indicator.
 *
 * @param {string} text - The status label.
 * @returns {HTMLElement} The indicator element.
 */
export const SyncIndicator = (text) =>
  el('span', { class: 'sync', role: 'status' }, el('i', { 'aria-hidden': 'true' }), text);

/**
 * Opens a modal dialog and restores focus after it closes.
 *
 * @param {string} title - The dialog heading and accessible label.
 * @param {object} options - Set drawer to use the side-panel layout.
 * @returns {object} The dialog, content container, and close button.
 */
export function openDialog(title, { drawer = false } = {}) {
  const previous = document.activeElement;
  // The dialog owns a heading/close control and a content region filled by its caller.
  const dialog = el('dialog', { class: drawer ? 'dialog drawer' : 'dialog', 'aria-label': title });
  const content = el('div', { class: 'dialog-content' });
  const heading = el('div', { class: 'dialog-heading' }, el('h2', {}, title));
  const close = button('×', () => dialog.close(), 'icon-button', { 'aria-label': 'Đóng' });
  heading.append(close);
  dialog.append(heading, content);
  document.body.append(dialog);
  dialog.addEventListener(
    'close',
    () => {
      dialog.remove();
      previous?.focus();
    },
    { once: true },
  );
  dialog.showModal();
  return { dialog, content, close };
}

/**
 * Requests confirmation and resolves false when the dialog is dismissed.
 *
 * @param {string} message - The confirmation question.
 * @param {string} description - Optional context for the decision.
 * @param {object} options - Optional AbortSignal for a route/session-owned confirmation.
 * @returns {Promise<boolean>} True only when the user confirms.
 */
export function ConfirmDialog(message, description = '', { signal } = {}) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(false);
    const { dialog, content } = openDialog(message);
    const abort = () => dialog.close();
    signal?.addEventListener('abort', abort, { once: true });
    // The confirmation actions resolve true only when confirmed; dismissal resolves false.
    content.append(
      el('p', {}, description),
      el(
        'div',
        { class: 'form-actions' },
        button('Hủy', () => dialog.close()),
        button(
          'Xác nhận',
          () => {
            resolve(true);
            dialog.close();
          },
          'button danger',
        ),
      ),
    );
    dialog.addEventListener(
      'close',
      () => {
        signal?.removeEventListener('abort', abort);
        resolve(false);
      },
      { once: true },
    );
  });
}

/**
 * Offers recovery or explicit discard without treating dismissal as deletion consent.
 *
 * @param {string} description - The saved draft timestamp and recovery context.
 * @returns {Promise<'restore'|'discard'|'cancel'>} The explicit choice, or cancel on close/expiry.
 */
export function DraftRecoveryDialog(description) {
  return new Promise((resolve) => {
    const { dialog, content } = openDialog('Có bản nháp trên thiết bị');
    // Only the discard button authorizes deletion; Escape, X, and external close keep the draft.
    content.append(
      el('p', {}, description),
      el('p', {}, 'Đóng hộp thoại để giữ nháp và quyết định sau.'),
      el(
        'div',
        { class: 'form-actions' },
        button(
          'Bỏ bản nháp',
          () => {
            resolve('discard');
            dialog.close();
          },
          'button danger',
        ),
        button(
          'Khôi phục',
          () => {
            resolve('restore');
            dialog.close();
          },
          'button primary',
        ),
      ),
    );
    dialog.addEventListener('close', () => resolve('cancel'), { once: true });
  });
}
export const statusLabels = {
  draft: 'Bản nháp',
  published: 'Đã xuất bản',
  hidden: 'Đã ẩn',
  deleted: 'Thùng rác',
};
