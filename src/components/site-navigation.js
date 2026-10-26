/** Renders accessible primary navigation with explicit routes and no backend dependency. */
import { el, button } from '../utils/dom.js';
import { routes } from '../utils/gradebook-ui.js';

export function SiteNavigation(navigate) {
  const panel = el('nav', {
    id: 'site-navigation-panel',
    class: 'site-navigation-panel',
    'aria-label': 'Điều hướng chính',
    hidden: true,
  });
  const toggle = button('☰', () => setOpen(panel.hidden), 'icon-button menu-toggle', {
    'aria-label': 'Mở menu điều hướng',
    'aria-expanded': 'false',
    'aria-controls': panel.id,
  });
  const links = [
    ['Bảng học liệu', routes.board, '01'],
    ['Bảng điểm cá nhân', routes.student, '02'],
    ['Quản lý bảng điểm', routes.admin, '03'],
  ].map(([label, href, number]) =>
    el(
      'a',
      {
        href,
        onClick: (event) => {
          if (
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          event.preventDefault();
          setOpen(false);
          void navigate(href);
        },
      },
      el('span', { class: 'navigation-number', 'aria-hidden': 'true' }, number),
      label,
      el('span', { 'aria-hidden': 'true' }, '↗'),
    ),
  );
  links[2].hidden = true;
  panel.append(el('span', { class: 'navigation-caption' }, 'KHÔNG GIAN HỌC TẬP'), ...links);
  const element = el('div', { class: 'site-navigation' }, toggle, panel);
  /** Keeps disclosure state and focus ownership consistent across click, keyboard and route changes. */
  function setOpen(open, focus = false) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Đóng menu điều hướng' : 'Mở menu điều hướng');
    if (focus) (open ? links[0] : toggle).focus();
  }
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, true);
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (panel.hidden) {
        setOpen(true, true);
        return;
      }
      const available = links.filter((link) => !link.hidden);
      const index = available.indexOf(document.activeElement);
      available[
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? available.length - 1
            : (index + (event.key === 'ArrowUp' ? -1 : 1) + available.length) % available.length
      ].focus();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!element.contains(event.target)) setOpen(false);
  });
  element.addEventListener('focusout', (event) => {
    if (!element.contains(event.relatedTarget)) setOpen(false);
  });
  return {
    element,
    setAdmin(active) {
      links[2].hidden = !active;
    },
    select(path) {
      setOpen(false);
      links.forEach((link) => {
        if (link.getAttribute('href') === path) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    },
  };
}
