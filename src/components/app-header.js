/** Renders shared branding and utilities without importing Board services or the SDK. */
import { el, button } from '../utils/dom.js';

/** Updates the shared account disclosure without changing any authentication state. */
export function updateHeaderAdmin(header, active) {
  if (!header) return;
  const login = header.querySelector('.header-admin-login');
  const account = header.querySelector('.header-account');
  if (!login || !account) return;
  login.hidden = active;
  account.hidden = !active;
  if (!active) account.open = false;
}

/**
 * Renders the site header with search, refresh, and admin entry actions.
 *
 * @param {object} options - The header callbacks, search element, and admin state.
 * @returns {HTMLElement} The header element.
 */
export function AppHeader({ onLogin, onLogout, onRefresh, search, admin }) {
  const account = el(
    'details',
    { class: 'header-account', hidden: true },
    el(
      'summary',
      { class: 'button header-admin' },
      'Quản trị viên',
      el('span', { class: 'header-account-chevron', 'aria-hidden': 'true' }, '⌄'),
    ),
    el(
      'div',
      { class: 'header-account-popover' },
      button(
        'Đăng xuất',
        () => {
          account.open = false;
          onLogout?.();
        },
        'button header-account-logout',
      ),
    ),
  );
  const dismiss = (event) => {
    if (!account.contains(event.target)) account.open = false;
  };
  account.addEventListener('toggle', () => {
    if (account.open) document.addEventListener('pointerdown', dismiss);
    else document.removeEventListener('pointerdown', dismiss);
  });
  account.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && account.open) {
      event.preventDefault();
      account.open = false;
      account.querySelector('summary').focus();
    }
  });
  account.addEventListener('focusout', (event) => {
    if (!account.contains(event.relatedTarget)) account.open = false;
  });
  // Header presentation never decides who is authorized to access administrative actions.
  const header = el(
    'header',
    { class: 'app-header' },
    el(
      'a',
      { href: '/', class: 'brand', 'aria-label': 'Trang chính' },
      el('img', { src: '/placeholders/mark.svg', alt: '', width: 38, height: 38 }),
      el('strong', {}, 'Vui học cùng cô Quỳnh'),
      el('span', { class: 'brand-divider' }),
      el('span', { class: 'brand-note' }, 'Không gian học liệu'),
    ),
    search,
    el(
      'nav',
      { class: 'header-actions', 'aria-label': 'Tiện ích' },
      button('↻', onRefresh, 'icon-button', { 'aria-label': 'Làm mới học liệu' }),
      button('Đăng nhập quản trị', onLogin, 'button header-admin header-admin-login'),
      account,
    ),
  );
  updateHeaderAdmin(header, admin);
  return header;
}
