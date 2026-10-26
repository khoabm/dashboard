/** Owns route lifecycle; the Board/SDK graph is loaded only when the Board is requested. */
import './styles/main.css';
import { el } from './utils/dom.js';
import { AppHeader } from './components/app-header.js';
import { SiteNavigation } from './components/site-navigation.js';
import { StudentLookup } from './components/student-lookup.js';
import { verifyStudent } from './services/student-lookup.js';
import { routeFor, routes } from './utils/gradebook-ui.js';

const root = document.querySelector('#app');
const boardRoot = el('div', { id: 'board-app', hidden: true });
const studentRoot = el('div', { hidden: true });
root.append(boardRoot, studentRoot);
let boardModule,
  boardPromise,
  view,
  generation = 0,
  current = null;
const navigation = SiteNavigation(navigate);

/** Commits only the latest route, preserving Board snapshots while disposing all student state. */
async function showRoute(path, focus = true) {
  const ticket = ++generation;
  current = routeFor(path);
  const skip = document.querySelector('.skip-link');
  if (skip) {
    skip.href = current === 'board' ? '#board' : '#main';
    skip.textContent = current === 'board' ? 'Đến bảng học liệu' : 'Đến phần tra cứu';
  }
  view?.dispose();
  view = null;
  boardRoot.hidden = current !== 'board';
  boardRoot.inert = current !== 'board';
  studentRoot.hidden = current === 'board';
  studentRoot.replaceChildren();
  if (current === 'board') {
    if (!boardPromise) boardPromise = import('./main.js');
    try {
      boardModule = await boardPromise;
    } catch {
      if (ticket === generation)
        boardRoot.replaceChildren(
          el('p', { role: 'alert' }, 'Chưa thể mở bảng học liệu. Vui lòng tải lại trang.'),
        );
      return;
    }
    if (ticket !== generation) return;
    boardRoot.querySelector('.app-header')?.prepend(navigation.element);
    boardModule.setBoardActive(true);
    if (focus) {
      const heading = boardRoot.querySelector('h1');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus();
    }
  } else {
    boardModule?.setBoardActive(false);
    const header = AppHeader({
      onLogin: async () => {
        if (await navigate('/')) boardRoot.querySelector('.header-admin')?.click();
      },
      onRefresh: () => void navigate('/'),
      search: null,
      admin: boardModule?.boardSessionActive() || false,
    });
    header.classList.add('gradebook-header');
    header.prepend(navigation.element);
    header.querySelector('[aria-label="Làm mới học liệu"]').hidden = true;
    studentRoot.append(header);
    if (current === 'student') {
      view = StudentLookup({ verify: verifyStudent, navigate });
      studentRoot.append(view.element);
      if (focus) view.focus();
    } else
      studentRoot.append(
        el(
          'main',
          { id: 'main', class: 'gradebook-reserved' },
          el('h1', {}, current === 'admin' ? 'Quản lý bảng điểm' : 'Không tìm thấy trang'),
          el('p', {}, 'Trang này hiện chưa sẵn sàng.'),
          el('a', { href: '/' }, 'Về bảng học liệu'),
        ),
      );
  }
  navigation.select(routes[current] || path);
}

/** Uses same-origin path-only history; navigation never serializes a lookup value or capability. */
async function navigate(path, { pop = false } = {}) {
  if (routeFor(path) === 'missing' && !pop) return false;
  const previous = routes[current] || '/';
  if (
    current === 'board' &&
    routeFor(path) !== 'board' &&
    boardModule &&
    !(await boardModule.prepareRouteExit())
  ) {
    if (pop) history.pushState(null, '', previous);
    return false;
  }
  if (!pop && location.pathname !== path) history.pushState(null, '', path);
  await showRoute(path);
  return true;
}
root.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !link ||
    link.target ||
    link.hasAttribute('download')
  )
    return;
  const path = link.getAttribute('href');
  if (!Object.values(routes).includes(path)) return;
  event.preventDefault();
  void navigate(path);
});
window.addEventListener('popstate', () => void navigate(location.pathname, { pop: true }));
window.addEventListener('app:sign-out', () => {
  if (current === 'student') void showRoute(routes.student);
});
window.addEventListener('pagehide', () => {
  view?.dispose();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted && current !== 'board') void showRoute(location.pathname, false);
});
if (routeFor(location.pathname) !== 'board')
  history.replaceState(null, '', routes[routeFor(location.pathname)] || location.pathname);
void showRoute(location.pathname, false);
