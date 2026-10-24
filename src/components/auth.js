/** Presents admin login and verifies the active profile before enabling editor actions. */

import { el, button, field, errorMessage } from '../utils/dom.js';
import { requireClient } from '../services/client.js';
import { isAdmin } from '../services/board.js';
import { openDialog } from './primitives.js';

/**
 * Opens the admin login dialog and checks the profile after password sign-in.
 * Clears password input and calls the owner only after admin access is confirmed.
 *
 * @param {Function} onSuccess - Refreshes the authenticated app state after login.
 */
export function LoginScreen(onSuccess) {
  const { dialog, content } = openDialog('Đăng nhập quản trị');
  const email = el('input', {
    type: 'email',
    required: true,
    autocomplete: 'username',
    placeholder: 'Email quản trị',
  });
  const password = el('input', {
    type: 'password',
    required: true,
    autocomplete: 'current-password',
  });
  const error = el('p', { class: 'form-error', role: 'alert' });
  const submit = el('button', { type: 'submit', class: 'button primary' }, 'Đăng nhập');
  // Login form: admin-only guidance, credentials, inline error, and submit action.
  const form = el(
    'form',
    {},
    el(
      'p',
      { class: 'muted' },
      'Chỉ dành cho tài khoản quản trị đã được chỉ định. Người xem không cần đăng nhập.',
    ),
    field('Email', email),
    field('Mật khẩu', password),
    error,
    submit,
    el(
      'p',
      { class: 'fine-print' },
      'Chưa có tài khoản quản trị? Vui lòng liên hệ người quản lý. Trang này không hỗ trợ đăng ký tài khoản.',
    ),
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    error.textContent = '';
    try {
      const { error: loginError } = await requireClient().auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value,
      });
      password.value = '';
      if (loginError)
        throw Error('Đăng nhập không thành công. Kiểm tra thông tin hoặc thử lại sau.');
      if (!(await isAdmin())) {
        await requireClient().auth.signOut();
        throw Error('Tài khoản này chưa được cấp quyền quản trị.');
      }
      dialog.close();
      await onSuccess();
    } catch (e) {
      error.textContent = errorMessage(e);
    } finally {
      submit.disabled = false;
    }
  });
  dialog.addEventListener('close', () => (password.value = ''), { once: true });
  content.append(form);
}
