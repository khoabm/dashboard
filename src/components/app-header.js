/** Renders shared branding and utilities without importing Board services or the SDK. */
import { el, button } from '../utils/dom.js';

/**
 * Renders the site header with search, refresh, and admin entry actions.
 *
 * @param {object} options - The header callbacks, search element, and admin state.
 * @returns {HTMLElement} The header element.
 */
export function AppHeader({ onLogin, onRefresh, search, admin }) {
  // Header layout: home/brand link, injected search field, and refresh/admin navigation.
  return el(
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
      button(admin ? 'Quản trị viên' : 'Đăng nhập quản trị', onLogin, 'button header-admin'),
    ),
  );
}
