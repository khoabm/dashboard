/** Injects bounded browser faults with synthetic data and no live service requests. */

import '/src/styles/main.css';
import { el, button } from '/src/utils/dom.js';

// This fixture is a dev entry only; index.html never imports it and Vite does not bundle it.
const nativeFetch = window.fetch.bind(window);
const setItem = Storage.prototype.setItem;
const openDB = indexedDB.open.bind(indexedDB);
const fileSlice = File.prototype.slice;
const evidence = document.querySelector('#evidence');
const sectionId = '20000000-0000-4000-8000-000000000001';
let admin = false,
  holdNext = false,
  releaseRead,
  releaseSave,
  requests = 0,
  blocked = 0;
let lastSaved = null;
let attachments = [];
// Each synthetic selection has a manually released signature check, independent of filechooser.
let verificationGate = null;
File.prototype.slice = function (...args) {
  const blob = fileSlice.apply(this, args);
  if (this.name === 'pending-qa.pdf' && verificationGate?.pending) {
    const gate = verificationGate;
    const arrayBuffer = blob.arrayBuffer.bind(blob);
    blob.arrayBuffer = async () => {
      await gate.promise;
      return arrayBuffer();
    };
  }
  return blob;
};
const posts = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    section_id: sectionId,
    title: 'Học liệu public QA',
    body: 'Dữ liệu kiểm thử offline',
    status: 'published',
    sort_order: 0,
    version: 1,
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    section_id: sectionId,
    title: 'PRIVATE QA — chỉ quản trị',
    body: 'Nội dung riêng phải biến mất khi đăng xuất',
    status: 'draft',
    sort_order: 1,
    version: 1,
  },
];
const sections = [
  {
    id: sectionId,
    board_id: 'board',
    title: 'Chủ đề QA',
    description: '',
    color: '#dcece5',
    sort_order: 0,
  },
];

/** Returns the current fault toggle without reading production application state. */
const enabled = (id) => document.getElementById(id).checked;

/** Encodes one synthetic SDK response, including the total visible row count. */
function response(data, status = 200, count = Array.isArray(data) ? data.length : 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Content-Range': `0-${Math.max(count - 1, 0)}/${count}`,
    },
  });
}

// Failures affect only fixture-scoped draft keys; no credentials or real user drafts are touched.
Storage.prototype.setItem = function (key, value) {
  if (key.startsWith('khtn8:draft:audit-fixture:') && enabled('fail-text'))
    throw Error('QA text storage full');
  return setItem.call(this, key, value);
};
indexedDB.open = (...args) => {
  if (enabled('fail-files')) throw Error('QA IndexedDB unavailable');
  return openDB(...args);
};

// The SDK still builds real queries; this transport serves synthetic responses locally.
window.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (url.origin === location.origin) return nativeFetch(input, init);
  if (!url.hostname.endsWith('.supabase.co')) {
    blocked++;
    throw Error('External network forbidden by QA fixture');
  }
  requests++;
  const path = url.pathname;
  if (path.endsWith('/rpc/save_post')) {
    const payload = JSON.parse(init.body);
    if (enabled('delay-save'))
      await new Promise((resolve) => {
        releaseSave = resolve;
      });
    if (enabled('fail-save')) return response({ message: 'QA save failed', code: '40001' }, 409);
    lastSaved = payload;
    attachments = attachments.filter((attachment) => attachment.post_id !== payload.p_post.id);
    attachments.push(
      ...payload.p_attachments.map((attachment) => ({ ...attachment, post_id: payload.p_post.id })),
    );
    const existing = posts.find((post) => post.id === payload.p_post.id);
    if (existing) Object.assign(existing, payload.p_post, { version: existing.version + 1 });
    else posts.push({ ...payload.p_post, version: 1 });
    return response(payload.p_post);
  }
  if (path.endsWith('/rpc/app_usage'))
    return response({ storage_bytes: 0, database_bytes_estimate: 1000, egress_bytes: null });
  if (path.endsWith('/admin_profiles'))
    return response(admin ? [{ role: 'admin', active: true }] : []);
  if (!admin && enabled('fail-public')) return response({ message: 'QA public offline' }, 503);
  const table = path.split('/').at(-1);
  let rows =
    table === 'boards'
      ? [{ id: 'board', title: 'QA board' }]
      : table === 'sections'
        ? sections
        : table === 'posts'
          ? posts.filter((post) => admin || post.status === 'published')
          : table === 'attachments'
            ? attachments.filter(
                (attachment) =>
                  admin ||
                  posts.some(
                    (post) => post.id === attachment.post_id && post.status === 'published',
                  ),
              )
            : [];
  rows = structuredClone(rows);
  if (table === 'posts' && admin && holdNext) {
    holdNext = false;
    await new Promise((resolve) => {
      releaseRead = resolve;
    });
  }
  const from = Number(url.searchParams.get('offset') || 0);
  const limit = Number(url.searchParams.get('limit') || 500);
  return response(rows.slice(from, from + limit), 200, rows.length);
};

const { client } = await import('/src/services/client.js');
const callbacks = [];
// No Auth token or password is created. The fixture injects identity lookup and event delivery.
client.auth.getUser = async () => ({
  data: { user: admin ? { id: 'audit-fixture' } : null },
  error: null,
});
client.auth.onAuthStateChange = (callback) => {
  callbacks.push(callback);
  return { data: { subscription: { unsubscribe() {} } } };
};
client.auth.signOut = async () => {
  admin = false;
  callbacks.forEach((callback) => callback('SIGNED_OUT'));
  return { error: null };
};
const main = await import('/src/main.js');
document.querySelector('#release-file').onclick = () => verificationGate?.release();
document.querySelector('#admin').onclick = async () => {
  admin = true;
  await main.refreshAuth();
  evidence.textContent = 'Đã nạp quản trị giả lập. Không có phiên Auth thật.';
};
document.querySelector('#hold').onclick = () => {
  holdNext = true;
  evidence.textContent = 'Lần đọc posts quản trị tiếp theo sẽ chờ nút trả response.';
};
document.querySelector('#release').onclick = () => {
  releaseRead?.();
  evidence.textContent = 'Đã trả response quản trị cũ.';
};
/** Reports synthetic draft metadata and pending-file state through visible fixture evidence. */
async function inspectDrafts() {
  const { filesDraft } = await import('/src/services/drafts.js');
  const drafts = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('khtn8:draft:audit-fixture:')) {
      const value = JSON.parse(localStorage.getItem(key));
      let files, fileNames, headers;
      try {
        const stored = (await filesDraft(key)) || [];
        files = stored.length;
        fileNames = stored.map((attachment) => attachment.file.name);
        headers = await Promise.all(stored.map((attachment) => attachment.file.slice(0, 5).text()));
      } catch {
        files = 'unavailable';
      }
      drafts.push({
        title: value.title,
        files,
        fileNames,
        headers,
        attachment_order: value.attachment_order,
      });
    }
  }
  const leave = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(leave);
  evidence.textContent = JSON.stringify(
    {
      mockRequests: requests,
      externalBlocked: blocked,
      liveRequests: 0,
      drafts,
      lastSavedTitle: lastSaved?.p_post.title,
      savedAttachments: lastSaved?.p_attachments.length,
      verificationPending: verificationGate?.pending || false,
      beforeunloadGuarded: leave.defaultPrevented,
    },
    null,
    2,
  );
  return evidence.textContent;
}
document.querySelector('#inspect').onclick = inspectDrafts;

/** Stages a local PDF through a bubbling file-input event and holds its signature check. */
async function stagePendingFile(dialog) {
  if (verificationGate?.pending) return;
  let release;
  verificationGate = {
    pending: true,
    promise: new Promise((resolve) => {
      release = resolve;
    }),
    release: () => {
      verificationGate.pending = false;
      release();
    },
  };
  const bytes = await (await nativeFetch('/placeholders/sample.pdf')).blob();
  const files = new DataTransfer();
  files.items.add(new File([bytes], 'pending-qa.pdf', { type: 'application/pdf' }));
  const input = dialog.querySelector('input[type="file"]');
  input.files = files.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  const leave = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(leave);
  dialog.querySelector('.qa-file-state').textContent =
    `File đang xác minh · beforeunload guarded: ${leave.defaultPrevented}`;
}

// A fixture-only response release button remains operable outside the editor's inert form.
new MutationObserver(() => {
  const dialog = document.querySelector('dialog.drawer');
  if (!dialog || dialog.querySelector('.qa-release')) return;
  // Controls stay outside the inert production form; all injected identities and files are synthetic.
  const state = el('pre', { class: 'qa-file-state', role: 'status' });
  const controls = el(
    'div',
    { class: 'qa-release' },
    button('QA: trả response lưu giả lập', () => releaseSave?.()),
    button('QA: chọn PDF và giữ xác minh', () => stagePendingFile(dialog)),
    button('QA: hoàn tất xác minh', () => {
      verificationGate?.release();
      state.textContent = 'Đã trả kết quả xác minh PDF.';
    }),
    button('QA: hết phiên giả lập', () => {
      admin = false;
      callbacks.forEach((callback) => callback('SIGNED_OUT'));
    }),
    button('QA: đăng xuất có lưu nháp', async () => {
      await main.logout();
    }),
    button('QA: bật lỗi IndexedDB', () => {
      document.querySelector('#fail-files').checked = true;
      state.textContent = 'Đã bật lỗi IndexedDB.';
    }),
    button('QA: tắt lỗi IndexedDB', () => {
      document.querySelector('#fail-files').checked = false;
      state.textContent = 'Đã tắt lỗi IndexedDB.';
    }),
    button('QA: kiểm tra nháp', async () => {
      state.textContent = await inspectDrafts();
    }),
    state,
  );
  dialog.querySelector('.dialog-content').prepend(controls);
}).observe(document.body, { childList: true });
