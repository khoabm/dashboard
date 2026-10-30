/** Boots the board UI and coordinates rendering, admin actions, and refresh lifecycle. */

import './styles/main.css';
import { el, button, errorMessage } from './utils/dom.js';
import { debounce, canRestore, moveItem } from './utils/validation.js';
import { client } from './services/client.js';
import { loadBoard, savePost, exportMetadata, reorderPosts } from './services/board.js';
import { verifyAdminSession } from './services/auth-session.js';
import { cleanupPending } from './services/storage.js';
import {
  AppHeader,
  SearchBar,
  BoardContainer,
  AdminToolbar,
  PostPreviewModal,
} from './components/board.js';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  ToastNotification,
  openDialog,
} from './components/primitives.js';
import { QuotaStatus } from './components/quota.js';
import { LoginScreen } from './components/auth.js';
import { updateHeaderAdmin } from './components/app-header.js';
import { SectionEditor } from './components/section-editor.js';
import { PostEditorDrawer } from './components/post-editor.js';
import { createRequestGate } from './utils/request-gate.js';
import { createPendingTask } from './utils/pending-task.js';
import { PulseIndicator, setPendingMessage } from './components/pending.js';
import { BoardNavigation } from './components/board-navigation.js';
import { createAdminEntry } from './utils/app-navigation.js';
import { BoardAssistant } from './components/board-assistant.js';
import { createLiveAssistantRequest } from './services/board-assistant.js';
import { config } from './config/public.js';
import { assistantCatalog, resolveAssistantAction } from './utils/board-assistant.js';
import './styles/board-assistant.css';
const managedRoot = document.querySelector('#board-app');
const root = managedRoot || document.querySelector('#app');
let boardActive = !managedRoot || location.pathname === '/';
const requests = createRequestGate();
let authRefreshTimer,
  authChecking = false,
  authFailed = false,
  authRefreshPromise = null,
  logoutPending = false;

// Shared board snapshot, admin session, filters, and synchronization flags.
let data = { sections: [], posts: [] },
  admin = false,
  userId = null,
  dirty = false,
  filter = 'all',
  selected = 'all',
  query = '',
  lastSync = null;
try {
  selected = localStorage.getItem('khtn8:selected') || 'all';
  query = localStorage.getItem('khtn8:query') || '';
} catch {
  /* Preferences are optional. */
}
// The header search debounces board filtering and attempts to persist the query locally.
let assistantIds = null;
const search = SearchBar(
  debounce((value) => {
    if (search.querySelector('input').value !== value) return;
    assistantIds = null;
    query = value;
    try {
      localStorage.setItem('khtn8:query', query);
    } catch {}
    renderBoard();
  }, 200),
  query,
);
// Page regions: shell centers the board area beneath the introductory hero.
// controls hosts section tabs/mobile selection; boardRegion holds replaceable board content.
// adminRegion stays empty for readers and hosts admin actions and quota status after login.
const shell = el('div', { class: 'board-shell' }),
  controls = el('div', { class: 'board-controls' }),
  workspace = el('div', { class: 'board-workspace' }),
  stickyRegion = el('div', { class: 'board-sticky' }),
  boardRegion = el('div'),
  adminRegion = el('div');
const navigation = BoardNavigation();
// The assistant receives only an explicit public projection, never the Auth or Gradebook state.
const assistant = BoardAssistant({
  snapshot: () => data,
  request: createLiveAssistantRequest({
    enabled: import.meta.env?.VITE_BOARD_ASSISTANT_AI !== 'false',
    endpoint: config.assistantEndpoint,
  }),
  hosted: import.meta.env?.VITE_BOARD_ASSISTANT_AI !== 'false',
  live: true,
  perform: performAssistantAction,
});
const countText = el('span');
// One persistent region survives board rerenders and describes pending admin work or refreshes.
const activity = PulseIndicator();
activity.classList.add('page-progress');
let operationMessage = '',
  syncMessage = '';
const operations = createPendingTask((message) => {
  operationMessage = message;
  updatePendingUI();
});
// Page composition: global header, introductory hero with a live post count, then the board shell.
root.append(
  AppHeader({
    onLogin: () => void openBoardAdmin(),
    onLogout: () => logout(),
    onRefresh: refresh,
    search,
    admin: false,
  }),
  el(
    'section',
    { class: 'hero' },
    el(
      'div',
      { class: 'hero-copy' },
      el('div', { class: 'eyebrow' }, 'HỌC TẬP · KHÁM PHÁ · KẾT NỐI'),
      el('h1', {}, 'Vui học cùng cô Quỳnh'),
      el(
        'p',
        {},
        'Một không gian nhỏ, mở ra nhiều khám phá.',
        el('br'),
        'Cùng tìm kiếm, lưu giữ và khám phá học liệu theo từng chủ đề.',
      ),
      // el(
      //   'div',
      //   { class: 'hero-meta' },
      //   el('span', {}, el('i', { class: 'live-dot' }), 'Học liệu mở'),
      //   countText,
      // ),
    ),
    el('img', { class: 'hero-orbit', src: '/placeholders/orbit.svg', alt: '' }),
  ),
  shell,
);
// Keep filters and mirrored section headings in the same sticky layer;
// the horizontally scrollable post grid remains untouched and below it.
stickyRegion.append(controls, navigation.element, navigation.headings);
workspace.append(stickyRegion, boardRegion);
shell.append(
  activity,
  assistant.element,
  adminRegion,
  workspace,
  el(
    'footer',
    { class: 'footer' },
    el('span', {}, 'Vui học cùng cô Quỳnh'),
    el('span', {}, 'Cùng học hỏi, cùng khám phá ', el('span', { 'aria-hidden': 'true' }, '↗')),
  ),
);

/** Updates visible feedback and locks conflicting controls while a board action is pending. */
function updatePendingUI() {
  setPendingMessage(activity, logoutPending ? '' : operationMessage || syncMessage);
  const pending = operations.pending() || !!syncMessage;
  adminRegion.inert = pending;
  controls.inert = pending;
  navigation.element.inert = pending;
  navigation.headings.inert = pending;
  boardRegion.inert = pending;
  boardRegion.setAttribute('aria-busy', String(pending || !!syncMessage));
  root.querySelector('.header-actions').inert = pending || !!syncMessage;
}

/**
 * Runs one admin action through completion and refresh without duplicate requests.
 *
 * @param {string} message - Pending work to show in the persistent status region.
 * @param {Function} task - Receives a current-operation check for asynchronous boundaries.
 * @returns {Promise<*>} The task result, or undefined for ignored/failed work.
 */
function runBoardAction(message, task) {
  return operations.run(message, async (isCurrent) => {
    try {
      return await task(isCurrent);
    } catch (error) {
      if (isCurrent()) ToastNotification(errorMessage(error), true);
    }
  });
}

// Board rendering and interaction callbacks.

/** Applies only user-confirmed read-only assistant actions to the current public Board snapshot. */
function performAssistantAction(value) {
  if (
    !boardActive ||
    operations.pending() ||
    syncMessage ||
    authChecking ||
    authFailed ||
    logoutPending
  )
    return false;
  const action = resolveAssistantAction(value, assistantCatalog(data));
  if (!action) return false;
  if (action.type === 'open') {
    const post = data.posts.find((p) => p.id === action.id && p.status === 'published');
    if (!post) return false;
    PostPreviewModal(
      post,
      data.sections.find((s) => s.id === post.section_id),
    );
    return true;
  }
  // Assistant navigation is temporary; never retain a question or resurrect older filters.
  assistantIds = action.type === 'filter' ? action.ids : null;
  selected = action.type === 'topic' ? action.id : 'all';
  query = '';
  try {
    localStorage.removeItem('khtn8:query');
    localStorage.removeItem('khtn8:selected');
  } catch {}
  if (assistantIds && matchMedia('(max-width:700px)').matches) {
    selected =
      data.posts.find((post) => assistantIds.includes(post.id) && post.status === 'published')
        ?.section_id || 'all';
  }
  filter = 'all';
  search.querySelector('input').value = query;
  renderControls();
  renderBoard({ resetPosition: true });
  return true;
}

window.addEventListener('pagehide', () => assistant.dismiss());

/**
 * Rebuilds desktop tabs and the mobile section picker from current board state.
 */
function renderControls() {
  const options = [{ id: 'all', title: 'Tất cả chủ đề' }, ...data.sections];

  /**
   * Selects a section, remembers it locally, and refreshes visible board controls.
   *
   * @param {string} id - The selected section identifier.
   */
  const select = (id) => {
    if (assistantIds !== null) {
      assistantIds = null;
      query = '';
      search.querySelector('input').value = '';
    }
    selected = id;
    try {
      localStorage.setItem('khtn8:selected', id);
    } catch {}
    renderControls();
    renderBoard({ resetPosition: true });
  };
  // Desktop section tabs and the mobile select offer the same selection behavior.
  const tabs = el(
    'div',
    { class: 'tabs', role: 'group', 'aria-label': 'Lọc chủ đề' },
    options.map((s) =>
      button(s.title, () => select(s.id), `tab ${s.id === selected ? 'active' : ''}`, {
        'aria-pressed': s.id === selected,
      }),
    ),
  );
  const mobile = el(
    'select',
    { class: 'mobile-select', 'aria-label': 'Chọn chủ đề' },
    options.map((s) =>
      el(
        'option',
        { value: s.id, selected: s.id === (selected === 'all' ? data.sections[0]?.id : selected) },
        s.title,
      ),
    ),
  );
  mobile.addEventListener('change', () => select(mobile.value));
  // The controls region also shows the board title and most recent successful sync time.
  controls.replaceChildren(
    tabs,
    mobile,
    el(
      'span',
      { class: 'board-label' },
      '▦  Bảng học liệu',
      lastSync
        ? ` · Tải lần cuối lúc ${lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
        : '',
    ),
  );
}

/**
 * Supplies BoardContainer with action callbacks and the responsive section selection.
 *
 * @returns {object} The current board action configuration.
 */
function actions() {
  return {
    admin,
    query,
    selected:
      matchMedia('(max-width:700px)').matches && selected === 'all'
        ? data.sections[0]?.id || 'all'
        : selected,
    filter,
    onOpen: (post) =>
      PostPreviewModal(
        post,
        data.sections.find((s) => s.id === post.section_id),
      ),
    onEdit: editPost,
    onNew: (sectionId) => editPost(null, sectionId),
    onSection: (section) => SectionEditor(section, data, refresh),
    onDelete: deletePost,
    onRestore: restorePost,
    onMove: movePost,
  };
}

/**
 * Replaces board DOM while preserving a section anchor.
 * @param {object} options - Explicit selection changes reset the horizontal position.
 */
function renderBoard({ resetPosition = false } = {}) {
  const position = resetPosition ? null : navigation.capture();
  const visibleData =
    assistantIds === null
      ? data
      : {
          ...data,
          posts: data.posts.filter(
            (post) => post.status === 'published' && assistantIds.includes(post.id),
          ),
        };
  const board = BoardContainer(visibleData, actions());
  if (assistantIds !== null)
    board.prepend(
      el(
        'p',
        { role: 'status' },
        'Đang lọc theo nguồn trợ lý đã chọn. Dùng tìm kiếm hoặc chọn chủ đề để bỏ bộ lọc.',
      ),
    );
  boardRegion.replaceChildren(board);
  navigation.attach(board, { all: selected === 'all', position });
  updatePendingUI();
}

/** Updates counts, admin controls, quota, filters, and board after state changes. */
function render(options = {}) {
  // An auth reset temporarily clears Board data; only reconcile a committed snapshot.
  if (options.reconcileAssistant !== false) assistant.reconcile();
  if (!data.sections.some((s) => s.id === selected)) selected = 'all';
  countText.textContent = `${data.sections.length} chủ đề · ${data.posts.filter((p) => p.status === 'published').length} học liệu`;
  // Clear the previous admin-only toolbar and quota before rebuilding this region.
  adminRegion.replaceChildren();
  if (admin)
    adminRegion.append(
      AdminToolbar({
        onNew: () => editPost(),
        onSection: () => SectionEditor(null, data, refresh),
        onExport: downloadMetadata,
        onTrash: () => {
          filter = filter === 'deleted' ? 'all' : 'deleted';
          render();
        },
        filter,
      }),
      button(
        'Dọn tệp thừa',
        () =>
          runBoardAction('Đang kiểm tra và dọn tệp thừa…', async (isCurrent) => {
            await cleanupPending();
            if (isCurrent()) ToastNotification('Đã hoàn tất kiểm tra các tệp đang chờ dọn.');
          }),
        'button subtle',
      ),
    );
  if (admin) {
    // The quota container is populated asynchronously by QuotaStatus.
    const quota = el('div', { class: 'quota-status' });
    adminRegion.append(quota);
    QuotaStatus(quota);
  }
  updateHeaderAdmin(root.querySelector('.app-header'), admin);
  renderControls();
  renderBoard(options);
}

// Remote refresh and editor persistence.

/**
 * Loads the latest board while preserving the previous snapshot on failure.
 * Commits results only within the authentication generation that started the request.
 *
 * @param {object} options - afterWrite permits final reads; revealSectionId targets a confirmed create.
 * @returns {Promise<boolean|undefined>} True for a committed snapshot, false on read failure, undefined if superseded.
 */
async function refresh({ afterWrite = false, revealSectionId = null } = {}) {
  if (!boardActive) return;
  if (authChecking) return;
  if (authFailed) return refreshAuth();
  if (operations.pending() && !afterWrite) return;
  // A confirmed create must supersede an older background snapshot before revealing its column.
  if (revealSectionId) requests.invalidate();
  const ticket = requests.begin();
  if (!ticket) return;
  if (!lastSync) boardRegion.replaceChildren(LoadingState());
  syncMessage = lastSync ? 'Đang tải lại học liệu…' : '';
  updatePendingUI();
  let revealConfirmed = null;
  try {
    const snapshot = await loadBoard();
    if (!requests.isCurrent(ticket)) return;
    data = snapshot;
    lastSync = new Date();
    if (revealSectionId && data.sections.some((section) => section.id === revealSectionId)) {
      revealConfirmed = revealSectionId;
      // A new section must remain visible even when the previous view was filtered or mobile-only.
      if (selected !== 'all' || matchMedia('(max-width:700px)').matches) selected = revealSectionId;
      query = '';
      filter = 'all';
      search.querySelector('input').value = '';
      try {
        localStorage.setItem('khtn8:selected', selected);
        localStorage.setItem('khtn8:query', '');
      } catch {
        /* Preferences are optional. */
      }
    }
    render();
    return true;
  } catch (e) {
    if (!requests.isCurrent(ticket)) return;
    if (!lastSync) boardRegion.replaceChildren(ErrorState(errorMessage(e), refresh));
    else
      ToastNotification(
        'Chưa thể tải thông tin mới. Nội dung đang hiển thị vẫn được giữ lại; hãy thử lại.',
        true,
      );
    return false;
  } finally {
    if (requests.isCurrent(ticket)) {
      syncMessage = '';
      updatePendingUI();
      // Focus can only move into the new column after the board's inert pending lock is released.
      if (revealConfirmed) navigation.reveal(revealConfirmed);
    }
    requests.finish(ticket);
  }
}

/** Rechecks the admin profile and signed-in user before refreshing board data. */
export function refreshAuth({ authOnly = false } = {}) {
  if (!boardActive && !authOnly) return Promise.resolve();
  if (authRefreshPromise) return authRefreshPromise;
  const pending = restoreAuth();
  authRefreshPromise = pending;
  const finished = () => {
    if (authRefreshPromise === pending) authRefreshPromise = null;
  };
  void pending.then(finished, finished);
  return pending;
}

/** Restores the existing Board session; callers share its promise instead of issuing extra checks. */
async function restoreAuth() {
  clearSession();
  const generation = requests.generation();
  authChecking = true;
  window.dispatchEvent(new Event('app:auth-state'));
  syncMessage = 'Đang kiểm tra quyền quản trị…';
  updatePendingUI();
  try {
    const identity = client ? await verifyAdminSession(client) : null;
    if (generation !== requests.generation()) return;
    admin = !!identity;
    userId = identity?.userId ?? null;
    authChecking = false;
    window.dispatchEvent(new Event('app:auth-state'));
    if (boardActive) await refresh();
  } catch {
    if (generation !== requests.generation()) return;
    // Do not read with an unverified stored JWT or unlock private UI after an Auth failure.
    authFailed = true;
    boardRegion.replaceChildren(
      ErrorState(
        'Chưa thể xác minh phiên đăng nhập. Hãy kiểm tra kết nối và thử lại.',
        refreshAuth,
      ),
    );
  } finally {
    if (generation === requests.generation()) {
      authChecking = false;
      syncMessage = '';
      updatePendingUI();
      window.dispatchEvent(new Event('app:auth-state'));
    }
  }
}

/**
 * Opens the editor with callbacks for saving and unsaved-change tracking.
 *
 * @param {object|null} post - The post to edit, or null for a new post.
 * @param {string} sectionId - The preferred section for a new post.
 */
function editPost(post = null, sectionId) {
  if (!data.sections.length) {
    ToastNotification('Hãy tạo chủ đề trước khi tạo bài.', true);
    return;
  }
  const generation = requests.generation(),
    owner = userId;
  PostEditorDrawer({
    post,
    sectionId,
    data,
    userId,
    onSaved: refresh,
    onDirty: (value) => (dirty = value),
    isCurrent: () => admin && userId === owner && requests.generation() === generation,
  }).catch((e) => ToastNotification(errorMessage(e), true));
}

/**
 * Soft-deletes a post only after confirmation, then refreshes the board.
 *
 * @param {object} post - The post to move to the trash.
 */
async function deletePost(post) {
  if (operations.pending()) return;
  if (
    !(await ConfirmDialog(
      'Chuyển bài vào thùng rác?',
      'Bài sẽ ngừng hiển thị công khai. Có thể khôi phục trong 30 ngày.',
    ))
  )
    return;
  await runBoardAction('Đang chuyển bài vào thùng rác…', async (isCurrent) => {
    await savePost({ ...post, status: 'deleted' }, post.attachments);
    if (!isCurrent()) return;
    await refresh({ afterWrite: true });
    if (isCurrent()) ToastNotification('Đã chuyển bài vào thùng rác.');
  });
}

/**
 * Restores an eligible deleted post to draft status, not public visibility.
 *
 * @param {object} post - The deleted post to restore.
 */
async function restorePost(post) {
  if (!canRestore(post)) {
    ToastNotification('Bài đăng này đã quá thời hạn khôi phục 30 ngày.', true);
    return;
  }
  await runBoardAction('Đang khôi phục bài đăng…', async (isCurrent) => {
    await savePost({ ...post, status: 'draft' }, post.attachments);
    if (!isCurrent()) return;
    await refresh({ afterWrite: true });
    if (isCurrent()) ToastNotification('Đã khôi phục về bản nháp.');
  });
}

/**
 * Reorders posts within the same section using the version-checked RPC.
 *
 * @param {object} post - The post to move.
 * @param {number} delta - The relative position change.
 */
async function movePost(post, delta) {
  const peers = data.posts.filter(
    (p) => p.section_id === post.section_id && p.status !== 'deleted',
  );
  const index = peers.findIndex((p) => p.id === post.id),
    target = peers[index + delta];
  if (!target) return;
  const ordered = moveItem(peers, index, delta);
  await runBoardAction('Đang sắp xếp bài đăng…', async (isCurrent) => {
    await reorderPosts(ordered);
    if (!isCurrent()) return;
    await refresh({ afterWrite: true });
  });
}

/** Flushes pending files before confirming logout, without waiting to clear an expired session. */
export async function logout() {
  if (logoutPending || operations.pending()) return;
  logoutPending = true;
  const generation = requests.generation();
  await runBoardAction('Đang chuẩn bị đăng xuất…', async () => {
    try {
      for (const dialog of document.querySelectorAll('dialog')) {
        if (dialog.preserveDraft && !(await dialog.preserveDraft())) {
          ToastNotification(
            'Chưa thể đăng xuất. Hãy chờ thao tác hoàn tất hoặc kiểm tra nháp trong trình soạn thảo.',
            true,
          );
          return;
        }
      }
      if (generation !== requests.generation()) return;
      if (
        dirty &&
        !(await ConfirmDialog(
          'Đăng xuất?',
          'Nháp đã lưu trên thiết bị này. Thay đổi chưa đồng bộ không xuất hiện trên thiết bị khác.',
        ))
      )
        return;
      if (generation !== requests.generation()) return;
      const { error } = await client.auth.signOut();
      if (error) {
        ToastNotification(errorMessage(error), true);
        return;
      }
      if (admin || userId) clearSession();
      schedulePublicRefresh();
    } finally {
      logoutPending = false;
    }
  });
}

/** Clears private UI synchronously, even if the subsequent anonymous read fails. */
function clearSession() {
  authRefreshPromise = null;
  requests.invalidate();
  navigation.reset();
  authChecking = false;
  authFailed = false;
  syncMessage = '';
  operations.reset();
  document.querySelectorAll('dialog').forEach((dialog) => dialog.close());
  admin = false;
  userId = null;
  dirty = false;
  filter = 'all';
  data = { sections: [], posts: [] };
  lastSync = null;
  window.dispatchEvent(new Event('app:sign-out'));
  render({ reconcileAssistant: false });
}

/** Defers SDK reads until the Auth event callback has released its internal lock. */
function schedulePublicRefresh() {
  clearTimeout(authRefreshTimer);
  authRefreshTimer = setTimeout(refresh, 0);
}

/** Downloads a JSON metadata snapshot without Storage file bytes. */
async function downloadMetadata() {
  await runBoardAction('Đang chuẩn bị tệp metadata…', async (isCurrent) => {
    const metadata = await exportMetadata();
    if (!isCurrent()) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' }),
    );
    const anchor = el('a', {
      href: url,
      download: `khtn8-metadata-${new Date().toISOString().slice(0, 10)}.json`,
    });
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ToastNotification(
      'Đã xuất thông tin học liệu. Bản sao này chưa bao gồm các tệp đính kèm; hãy sao lưu chúng riêng.',
    );
  });
}

// Browser lifecycle, keyboard navigation, and connectivity notifications.
window.addEventListener('beforeunload', (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
window.addEventListener('keydown', (event) => {
  if (
    boardActive &&
    event.key === '/' &&
    !document.querySelector('dialog') &&
    !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
  ) {
    event.preventDefault();
    search.querySelector('input').focus();
  }
});
window.addEventListener('online', () => {
  if (!boardActive) return;
  ToastNotification('Đã có mạng. Đang tải lại dữ liệu…');
  refresh();
});
window.addEventListener('offline', () =>
  ToastNotification('Đang ngoại tuyến. Hãy giữ trang mở; nội dung nháp vẫn được lưu cục bộ.', true),
);
document.addEventListener('visibilitychange', () => {
  if (
    boardActive &&
    document.visibilityState === 'visible' &&
    !document.querySelector('dialog') &&
    (!lastSync || Date.now() - lastSync.getTime() > 30_000)
  )
    refresh();
});
matchMedia('(max-width:700px)').addEventListener('change', renderBoard);
let gradebookAuthSession = null;
client?.auth.onAuthStateChange((event, session) => {
  gradebookAuthSession = session;
  if (event === 'SIGNED_OUT') {
    // Unlike routine refresh, sign-out ends the current user's conversation.
    assistant.invalidate();
    clearSession();
    schedulePublicRefresh();
  }
});
// Explicit bootstrap also handles persisted sessions without relying on Auth callback timing.
// SDK reads stay outside the synchronous Auth event callback to avoid its internal lock.
export const openBoardAdmin = createAdminEntry({
  ready: () => authRefreshPromise,
  state: () => ({
    active: boardActive,
    generation: requests.generation(),
    checking: authChecking,
    failed: authFailed,
    admin,
  }),
  login: () => {
    if (!document.querySelector('dialog')) LoginScreen(refreshAuth);
  },
  notify: ToastNotification,
});
if (boardActive) refreshAuth();

/** Suspends Board refreshes without discarding its snapshot, filters, Auth state or saved drafts. */
export function setBoardActive(active) {
  if (boardActive === active) return;
  boardActive = active;
  if (!active) {
    assistant.dismiss();
    authRefreshPromise = null;
    clearTimeout(authRefreshTimer);
    requests.invalidate();
    authChecking = false;
    syncMessage = '';
    client?.auth.stopAutoRefresh();
  } else {
    client?.auth.startAutoRefresh();
    if (!lastSync) void refreshAuth();
    else void refresh();
  }
}

/** Flushes editor-owned drafts before a route change; failed persistence leaves the editor open. */
export async function prepareRouteExit() {
  if (operations.pending() || logoutPending) return false;
  for (const dialog of document.querySelectorAll('dialog')) {
    if (dialog.preserveDraft && !(await dialog.preserveDraft())) return false;
  }
  document.querySelectorAll('dialog').forEach((dialog) => dialog.close());
  return true;
}

/** Reports only the already-verified in-memory Board state; performs no Auth request. */
export function boardSessionActive() {
  return admin;
}

/** Shares the existing verified identity; direct admin routes restore Auth without loading Board data. */
export function ensureBoardAuth() {
  if (authRefreshPromise) return authRefreshPromise;
  return admin && !authFailed ? Promise.resolve() : refreshAuth({ authOnly: true });
}

/** Publishes UI status only; this is never server authorization or a student credential. */
export function boardAuthState() {
  return {
    status: authChecking ? 'loading' : authFailed ? 'error' : admin ? 'admin' : 'anonymous',
    generation: requests.generation(),
  };
}

/** Reads only the cached SDK event session after Board verification; never refreshes Auth. */
export function boardGradebookSession() {
  if (!admin || authChecking || authFailed || gradebookAuthSession?.user?.id !== userId)
    return null;
  return {
    token: gradebookAuthSession.access_token,
    expiresAt: gradebookAuthSession.expires_at,
    generation: requests.generation(),
  };
}
