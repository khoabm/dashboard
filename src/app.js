/** Owns route lifecycle; the Board/SDK graph is loaded only when the Board is requested. */
import './styles/main.css';
import { el } from './utils/dom.js';
import { AppHeader, updateHeaderAdmin } from './components/app-header.js';
import { SiteNavigation } from './components/site-navigation.js';
import { StudentLookup } from './components/student-lookup.js';
import { verifyStudent, readStudent } from './services/student-lookup.js';
import { routeFor, routes } from './utils/gradebook-ui.js';
import { createRouteNavigation } from './utils/app-navigation.js';
import { newId } from './utils/id.js';

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
const routeNavigation = createRouteNavigation({
  history,
  location,
  initialPath: routes[routeFor(location.pathname)] || location.pathname,
  newScope: newId,
  prepare: (path) => {
    if (current === 'admin' && routeFor(path) !== 'admin') return view?.prepareExit() ?? true;
    return current === 'board' && routeFor(path) !== 'board' && boardModule
      ? boardModule.prepareRouteExit()
      : true;
  },
  show: showRoute,
});

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
    navigation.setAdmin(boardModule.boardSessionActive());
    if (focus) {
      const heading = boardRoot.querySelector('h1');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus();
    }
  } else {
    boardModule?.setBoardActive(false);
    const header = AppHeader({
      onLogin: async () => {
        if (await navigate('/')) await boardModule?.openBoardAdmin();
      },
      onRefresh: () => void navigate('/'),
      onLogout: () => void boardModule?.logout(),
      search: null,
      admin: boardModule?.boardSessionActive() || false,
    });
    header.classList.add('gradebook-header');
    header.prepend(navigation.element);
    header.querySelector('[aria-label="Làm mới học liệu"]').hidden = true;
    studentRoot.append(header);
    if (current === 'student') {
      view = StudentLookup({ verify: verifyStudent, request: readStudent, navigate });
      studentRoot.append(view.element);
      if (focus) view.focus();
    } else if (current === 'admin') {
      try {
        const [
          { GradebookAdmin },
          { createGradebookAdmin },
          { readRosterFile, readScoreFile },
          { createTeacherCatalog },
        ] = await Promise.all([
          import('./components/gradebook-admin.js'),
          import('./services/gradebook-admin.js'),
          import('./services/roster-file.js'),
          import('./services/gradebook-catalog.js'),
        ]);
        if (!boardPromise) boardPromise = import('./main.js');
        boardModule = await boardPromise;
        if (ticket !== generation) return;
        boardModule.setBoardActive(false);
        const requestGradebookAdmin = createGradebookAdmin({
          session: () => boardModule.boardGradebookSession(),
        });
        view = GradebookAdmin({
          request: requestGradebookAdmin,
          readFile: readRosterFile,
          readScores: readScoreFile,
          loadCatalog: createTeacherCatalog(requestGradebookAdmin),
          onLogin: async () => {
            if (await navigate('/')) await boardModule.openBoardAdmin();
          },
        });
        studentRoot.append(view.element);
        const pending = boardModule.ensureBoardAuth();
        view.setSession(boardModule.boardAuthState());
        navigation.setAdmin(boardModule.boardSessionActive());
        void pending.then(() => {
          if (ticket === generation) view?.setSession(boardModule.boardAuthState());
        });
        if (focus) view.focus();
      } catch {
        if (ticket === generation)
          studentRoot.append(
            el('p', { role: 'alert' }, 'Chưa thể mở quản lý bảng điểm. Hãy tải lại trang.'),
          );
      }
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
async function navigate(path) {
  if (routeFor(path) === 'missing') return false;
  return routeNavigation.navigate(path);
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
window.addEventListener('popstate', (event) => void routeNavigation.pop(event.state));
window.addEventListener('app:sign-out', () => {
  if (current === 'student') void showRoute(routes.student);
  if (current === 'admin')
    view?.setSession(boardModule?.boardAuthState() || { status: 'anonymous', generation: -1 });
  navigation.setAdmin(false);
  updateHeaderAdmin(studentRoot.querySelector('.app-header'), false);
});
window.addEventListener('app:auth-state', () => {
  navigation.setAdmin(boardModule?.boardSessionActive() || false);
  updateHeaderAdmin(studentRoot.querySelector('.app-header'), boardModule?.boardSessionActive() || false);
  if (current === 'admin')
    view?.setSession(boardModule?.boardAuthState() || { status: 'loading', generation: -1 });
});
window.addEventListener('pagehide', () => {
  view?.dispose();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted && current !== 'board') void showRoute(location.pathname, false);
});
void showRoute(location.pathname, false);
