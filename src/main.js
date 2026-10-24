/** Boots the board UI and coordinates rendering, admin actions, and refresh lifecycle. */

import './styles/main.css';
import { el, button, errorMessage } from './utils/dom.js';
import { debounce, canRestore, moveItem } from './utils/validation.js';
import { client } from './services/client.js';
import { loadBoard, isAdmin, savePost, exportMetadata, reorderPosts } from './services/board.js';
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
import { SectionEditor } from './components/section-editor.js';
import { PostEditorDrawer } from './components/post-editor.js';
import { createRequestGate } from './utils/request-gate.js';
const root = document.querySelector('#app');
const requests = createRequestGate();
let authRefreshTimer;

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
const search = SearchBar(
  debounce((value) => {
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
  boardRegion = el('div'),
  adminRegion = el('div');
const countText = el('span');
// Page composition: global header, introductory hero with a live post count, then the board shell.
root.append(
  AppHeader({
    onLogin: () => {
      if (admin) ToastNotification('Bạn đang ở chế độ quản trị.');
      else LoginScreen(refreshAuth);
    },
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
      el('h1', {}, 'KHOA HỌC TỰ NHIÊN ', el('span', {}, '– 8')),
      el(
        'p',
        {},
        'Một không gian nhỏ, mở ra nhiều khám phá.',
        el('br'),
        'Cùng tìm kiếm, lưu giữ và khám phá học liệu theo từng chủ đề.',
      ),
      el(
        'div',
        { class: 'hero-meta' },
        el('span', {}, el('i', { class: 'live-dot' }), 'Học liệu mở'),
        countText,
      ),
    ),
    el('img', { class: 'hero-orbit', src: '/placeholders/orbit.svg', alt: '' }),
  ),
  shell,
);
// Inside the shell, administrative tools precede section filters and the board; the footer follows.
shell.append(
  adminRegion,
  controls,
  boardRegion,
  el(
    'footer',
    { class: 'footer' },
    el('span', {}, 'KHTN8 Board · Không gian học liệu Khoa học tự nhiên lớp 8'),
    el('span', {}, 'Cùng học hỏi, cùng khám phá ', el('span', { 'aria-hidden': 'true' }, '↗')),
  ),
);

// Board rendering and interaction callbacks.

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
    selected = id;
    try {
      localStorage.setItem('khtn8:selected', id);
    } catch {}
    renderControls();
    renderBoard();
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
        ? ` · cập nhật ${lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
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

/** Replaces the visible board with its latest filtered representation. */
function renderBoard() {
  boardRegion.replaceChildren(BoardContainer(data, actions()));
}

/** Updates counts, admin controls, quota, filters, and board after state changes. */
function render() {
  if (!data.sections.some((s) => s.id === selected)) selected = 'all';
  countText.textContent = `${data.sections.length} chủ đề · ${data.posts.filter((p) => p.status === 'published').length} học liệu`;
  // Clear the previous admin-only toolbar and quota before rebuilding this region.
  adminRegion.replaceChildren();
  if (admin)
    adminRegion.append(
      AdminToolbar({
        onNew: () => editPost(),
        onSection: () => SectionEditor(null, data, refresh),
        onLogout: logout,
        onExport: downloadMetadata,
        onTrash: () => {
          filter = filter === 'deleted' ? 'all' : 'deleted';
          render();
        },
        filter,
      }),
      button(
        'Dọn tệp thừa',
        async () => {
          try {
            await cleanupPending();
            ToastNotification('Đã kiểm tra và dọn các tệp thừa được ghi nhận.');
          } catch (e) {
            ToastNotification(errorMessage(e), true);
          }
        },
        'button subtle',
      ),
    );
  if (admin) {
    // The quota container is populated asynchronously by QuotaStatus.
    const quota = el('div', { class: 'quota-status' });
    adminRegion.append(quota);
    QuotaStatus(quota);
  }
  const loginLabel = root.querySelector('.header-admin');
  loginLabel.textContent = admin ? 'Quản trị viên' : 'Đăng nhập quản trị';
  renderControls();
  renderBoard();
}

// Remote refresh and editor persistence.

/**
 * Loads the latest board while preserving the previous snapshot on failure.
 * Commits results only within the authentication generation that started the request.
 */
async function refresh() {
  const ticket = requests.begin();
  if (!ticket) return;
  if (!lastSync) boardRegion.replaceChildren(LoadingState());
  try {
    const snapshot = await loadBoard();
    if (!requests.isCurrent(ticket)) return;
    data = snapshot;
    lastSync = new Date();
    render();
  } catch (e) {
    if (!requests.isCurrent(ticket)) return;
    if (!lastSync) boardRegion.replaceChildren(ErrorState(errorMessage(e), refresh));
    else ToastNotification('Chưa đồng bộ được. Đang giữ dữ liệu đã tải; hãy thử lại.', true);
  } finally {
    requests.finish(ticket);
  }
}

/** Rechecks the admin profile and signed-in user before refreshing board data. */
export async function refreshAuth() {
  requests.invalidate();
  const generation = requests.generation();
  const nextAdmin = await isAdmin();
  const { data: auth } = await client.auth.getUser();
  if (generation !== requests.generation()) return;
  admin = nextAdmin;
  userId = auth.user?.id;
  await refresh();
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
  PostEditorDrawer({
    post,
    sectionId,
    data,
    userId,
    onSaved: refresh,
    onDirty: (value) => (dirty = value),
  }).catch((e) => ToastNotification(errorMessage(e), true));
}

/**
 * Soft-deletes a post only after confirmation, then refreshes the board.
 *
 * @param {object} post - The post to move to the trash.
 */
async function deletePost(post) {
  if (
    !(await ConfirmDialog(
      'Chuyển bài vào thùng rác?',
      'Bài sẽ ngừng hiển thị công khai. Có thể khôi phục trong 30 ngày.',
    ))
  )
    return;
  try {
    await savePost({ ...post, status: 'deleted' }, post.attachments);
    await refresh();
    ToastNotification('Đã chuyển bài vào thùng rác.');
  } catch (e) {
    ToastNotification(errorMessage(e), true);
  }
}

/**
 * Restores an eligible deleted post to draft status, not public visibility.
 *
 * @param {object} post - The deleted post to restore.
 */
async function restorePost(post) {
  if (!canRestore(post)) {
    ToastNotification('Đã hết thời hạn khôi phục 30 ngày. Không tự động xóa tệp.', true);
    return;
  }
  try {
    await savePost({ ...post, status: 'draft' }, post.attachments);
    await refresh();
    ToastNotification('Đã khôi phục về bản nháp.');
  } catch (e) {
    ToastNotification(errorMessage(e), true);
  }
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
  try {
    await reorderPosts(ordered);
    await refresh();
  } catch (e) {
    ToastNotification(errorMessage(e), true);
  }
}

/** Confirms unsaved edits, signs out, and clears the visible admin session. */
async function logout() {
  if (
    dirty &&
    !(await ConfirmDialog(
      'Đăng xuất?',
      'Sẽ thử lưu nháp trên thiết bị trước khi đăng xuất. Thay đổi chưa đồng bộ không xuất hiện trên thiết bị khác.',
    ))
  )
    return;
  for (const dialog of document.querySelectorAll('dialog')) {
    if (dialog.preserveDraft && !(await dialog.preserveDraft())) {
      ToastNotification('Chưa lưu được nháp. Hãy giữ trình soạn thảo mở.', true);
      return;
    }
  }
  const { error } = await client.auth.signOut();
  if (error) {
    ToastNotification(errorMessage(error), true);
    return;
  }
  if (admin || userId) clearSession();
  schedulePublicRefresh();
}

/** Clears private UI synchronously, even if the subsequent anonymous read fails. */
function clearSession() {
  requests.invalidate();
  document.querySelectorAll('dialog').forEach((dialog) => dialog.close());
  admin = false;
  userId = null;
  dirty = false;
  filter = 'all';
  data = { sections: [], posts: [] };
  lastSync = null;
  render();
}

/** Defers SDK reads until the Auth event callback has released its internal lock. */
function schedulePublicRefresh() {
  clearTimeout(authRefreshTimer);
  authRefreshTimer = setTimeout(refresh, 0);
}

/** Downloads a JSON metadata snapshot without Storage file bytes. */
async function downloadMetadata() {
  try {
    const metadata = await exportMetadata();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' }),
    );
    const anchor = el('a', {
      href: url,
      download: `khtn8-metadata-${new Date().toISOString().slice(0, 10)}.json`,
    });
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ToastNotification('Đã xuất metadata. Tệp Storage cần sao lưu riêng theo hướng dẫn.');
  } catch (e) {
    ToastNotification(errorMessage(e), true);
  }
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
    event.key === '/' &&
    !document.querySelector('dialog') &&
    !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
  ) {
    event.preventDefault();
    search.querySelector('input').focus();
  }
});
window.addEventListener('online', () => {
  ToastNotification('Đã có mạng. Đang tải lại dữ liệu…');
  refresh();
});
window.addEventListener('offline', () =>
  ToastNotification('Đang ngoại tuyến. Hãy giữ trang mở; nội dung nháp vẫn được lưu cục bộ.', true),
);
document.addEventListener('visibilitychange', () => {
  if (
    document.visibilityState === 'visible' &&
    !document.querySelector('dialog') &&
    (!lastSync || Date.now() - lastSync.getTime() > 30_000)
  )
    refresh();
});
matchMedia('(max-width:700px)').addEventListener('change', renderBoard);
client?.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    clearSession();
    schedulePublicRefresh();
  }
});
refresh();
