/** Injects bounded browser faults with synthetic data and no live service requests. */

import '/src/styles/main.css';
import { el, button } from '/src/utils/dom.js';
import { newId } from '/src/utils/id.js';

// This fixture is a dev entry only; index.html never imports it and Vite does not bundle it.
const nativeFetch = window.fetch.bind(window);
const setItem = Storage.prototype.setItem;
const openDB = indexedDB.open.bind(indexedDB);
const fileSlice = File.prototype.slice;
const getRecord = IDBObjectStore.prototype.get;
const evidence = document.querySelector('#evidence');
const sectionId = '20000000-0000-4000-8000-000000000001';
let admin = false,
  holdNext = false,
  releaseRead,
  releaseSave,
  requests = 0,
  blocked = 0;
let lastSaved = null;
let seededDraft = null;
const removedPaths = [];
const operationCalls = {};
const operationWaiters = [];
const serviceCalls = { usage: 0, upload: 0, save: 0, remove: 0 };
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

/**
 * Holds one selected synthetic transport until the visible fixture control releases it.
 *
 * @param {string} kind - The synthetic operation category.
 * @returns {Promise<boolean>} Whether the released request should fail.
 */
async function waitForOperation(kind) {
  operationCalls[kind] = (operationCalls[kind] || 0) + 1;
  if (document.querySelector('#pending-target').value !== kind) return false;
  if (enabled('hold-operation')) await new Promise((resolve) => operationWaiters.push(resolve));
  return enabled('fail-operation');
}

/** Releases held synthetic requests and lets subsequent steps run without another artificial wait. */
function releaseOperation() {
  document.querySelector('#hold-operation').checked = false;
  operationWaiters.splice(0).forEach((resolve) => resolve());
}
document.querySelector('#release-operation').onclick = releaseOperation;

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
// Read-only faults leave writes healthy, exposing accidental autosave after failed recovery.
IDBObjectStore.prototype.get = function (...args) {
  if (this.name === 'files' && enabled('fail-read')) throw Error('QA draft read unavailable');
  return getRecord.apply(this, args);
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
  const method = init?.method || 'GET';
  const kind = path.endsWith('/rpc/app_usage')
    ? 'quota'
    : path.endsWith('/rpc/save_post') ||
        path.endsWith('/rpc/reorder_posts') ||
        (path.endsWith('/sections') && method !== 'GET')
      ? 'write'
      : path.endsWith('/posts')
        ? 'read'
        : path.endsWith('/audit_logs')
          ? 'export'
          : path.endsWith('/attachments')
            ? 'cleanup'
            : 'other';
  if (await waitForOperation(kind)) return response({ message: 'QA operation failed' }, 503);
  if (path.endsWith('/rpc/reorder_posts')) {
    const { p_ids } = JSON.parse(init.body);
    p_ids.forEach((id, index) => {
      const post = posts.find((post) => post.id === id);
      if (post) Object.assign(post, { sort_order: index, version: post.version + 1 });
    });
    return response(null);
  }
  if (path.endsWith('/sections') && method !== 'GET') {
    const body = init.body ? JSON.parse(init.body) : {};
    const id = url.searchParams.get('id')?.replace('eq.', '');
    if (method === 'POST') {
      const section = { ...body, id: newId() };
      sections.push(section);
      return response(section);
    }
    const index = sections.findIndex((section) => section.id === id);
    if (method === 'PATCH') Object.assign(sections[index], body);
    const row = sections[index];
    if (method === 'DELETE') sections.splice(index, 1);
    return response(row);
  }
  if (path.endsWith('/rpc/save_post')) {
    serviceCalls.save++;
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
    if (existing)
      Object.assign(existing, payload.p_post, {
        version: existing.version + 1,
        deleted_at: payload.p_post.status === 'deleted' ? new Date().toISOString() : null,
      });
    else posts.push({ ...payload.p_post, version: 1 });
    return response(payload.p_post);
  }
  if (path.includes('/storage/v1/object/') && init?.method === 'POST') serviceCalls.upload++;
  if (path.includes('/storage/v1/object/') && init?.method === 'DELETE') {
    serviceCalls.remove++;
    removedPaths.push(...JSON.parse(init.body).prefixes);
  }
  if (path.endsWith('/rpc/app_usage')) {
    serviceCalls.usage++;
    return response({ storage_bytes: 0, database_bytes_estimate: 1000, egress_bytes: null });
  }
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
  const orders = (url.searchParams.get('order') || '').split(',').filter(Boolean);
  rows.sort((left, right) => {
    for (const order of orders) {
      const [column, direction] = order.split('.');
      if (left[column] < right[column]) return direction === 'desc' ? 1 : -1;
      if (left[column] > right[column]) return direction === 'desc' ? -1 : 1;
    }
    return 0;
  });
  const paths = url.searchParams.get('storage_path');
  if (table === 'attachments' && paths?.startsWith('in.')) {
    const selected = paths
      .slice(4, -1)
      .split(',')
      .map((path) => path.replaceAll('"', ''));
    rows = rows.filter((row) => selected.includes(row.storage_path));
  }
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
  if (await waitForOperation('auth')) return { error: Error('QA sign-out failed') };
  admin = false;
  callbacks.forEach((callback) => callback('SIGNED_OUT'));
  return { error: null };
};
client.auth.signInWithPassword = async () => {
  if (await waitForOperation('auth')) return { error: Error('QA sign-in failed') };
  admin = true;
  return { data: { session: null }, error: null };
};
const bucketClient = client.storage.from.bind(client.storage);
client.storage.from = (...args) => {
  const bucket = bucketClient(...args);
  bucket.createSignedUrl = async () => {
    if (await waitForOperation('media')) return { data: null, error: Error('QA media failed') };
    return { data: { signedUrl: `${location.origin}/placeholders/science.svg` }, error: null };
  };
  return bucket;
};
const main = await import('/src/main.js');
document.querySelector('#seed-cleanup').onclick = async () => {
  const { queueCleanup } = await import('/src/services/storage.js');
  queueCleanup(['qa-fixture/unused.pdf']);
};
document.querySelector('#preview-media').onclick = async () => {
  const { PostPreviewModal } = await import('/src/components/board.js');
  PostPreviewModal({
    title: 'Ảnh QA local',
    body: 'Transport ký URL giả lập; bytes SVG local.',
    attachments: [
      { id: 'qa-image', type: 'image', file_name: 'Ảnh QA', storage_path: 'qa-fixture/image.svg' },
    ],
  });
};
document.querySelector('#mock-login').onclick = async () => {
  const { LoginScreen } = await import('/src/components/auth.js');
  LoginScreen(main.refreshAuth);
  const form = document.querySelector('dialog form');
  // No credentials are entered or generated; the mock accepts this intentionally empty form.
  form.noValidate = true;
  form.requestSubmit();
};
document.querySelector('#seed-recovery').onclick = async () => {
  const { filesDraft, saveDraft, draftKey } = await import('/src/services/drafts.js');
  const key = draftKey('audit-fixture', posts[1].id);
  const bytes = await (await nativeFetch('/placeholders/sample.pdf')).blob();
  const attachment = {
    id: '90000000-0000-4000-8000-000000000123',
    type: 'document',
    file_name: 'recovery-qa.pdf',
    file: new File([bytes], 'recovery-qa.pdf', { type: 'application/pdf' }),
  };
  await filesDraft(key, null);
  await filesDraft(key, [attachment]);
  saveDraft(key, { ...posts[1], title: 'Nháp được giữ nguyên', attachments: [attachment] });
  seededDraft = { key, text: localStorage.getItem(key) };
  evidence.textContent = 'Đã tạo đúng 1 PDF và snapshot nháp synthetic cho bài PRIVATE QA.';
};
document.querySelector('#release-file').onclick = () => verificationGate?.release();
document.querySelector('#release-save').onclick = () => releaseSave?.();
document.querySelector('#seed-remote').onclick = async () => {
  attachments = [
    {
      id: '90000000-0000-4000-8000-000000000456',
      post_id: posts[1].id,
      type: 'document',
      storage_path: `${posts[1].id}/old-qa.pdf`,
      file_name: 'old-qa.pdf',
      mime_type: 'application/pdf',
      size_bytes: 100,
      sort_order: 0,
    },
  ];
  await main.refreshAuth();
  evidence.textContent = 'Đã gắn 1 file Storage synthetic old-qa.pdf. Không upload thật.';
};
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
  let seedState = null;
  if (seededDraft) {
    const current = localStorage.getItem(seededDraft.key);
    let files;
    try {
      files = ((await filesDraft(seededDraft.key)) || []).length;
    } catch {
      files = 'unavailable';
    }
    seedState = {
      textExists: current !== null,
      textUnchanged: current === seededDraft.text,
      files,
    };
  }
  // Count only synthetic records, including unpublished snapshots left after a failed text write.
  const draftFileRecords = await new Promise((resolve) => {
    const request = openDB('khtn8-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onerror = () => resolve('unavailable');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('files', 'readonly');
      const keys = tx.objectStore('files').getAllKeys();
      keys.onsuccess = () =>
        resolve(
          keys.result.filter(
            (key) => typeof key === 'string' && key.startsWith('khtn8:draft:audit-fixture:'),
          ).length,
        );
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        resolve('unavailable');
      };
    };
  });
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
      seedState,
      serviceCalls,
      cleanupCandidates: JSON.parse(localStorage.getItem('khtn8:cleanup') || '[]'),
      remotePaths: attachments.map((attachment) => attachment.storage_path),
      removedPaths,
      draftFileRecords,
      operationCalls,
      heldOperations: operationWaiters.length,
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
  document.querySelectorAll('dialog:not(.drawer)').forEach((modal) => {
    if (modal.querySelector('.qa-expiry')) return;
    const controls = el(
      'div',
      { class: 'qa-expiry' },
      button('QA: trả phản hồi thao tác', releaseOperation),
      button('QA: tắt lỗi thao tác', () => {
        document.querySelector('#fail-operation').checked = false;
      }),
      button('QA: hết phiên giả lập', () => {
        admin = false;
        callbacks.forEach((callback) => callback('SIGNED_OUT'));
      }),
      button('QA: tắt lỗi đọc', () => {
        document.querySelector('#fail-read').checked = false;
      }),
    );
    modal.querySelector('.dialog-content').prepend(controls);
  });
  const dialog = document.querySelector('dialog.drawer');
  if (!dialog || dialog.querySelector('.qa-release')) return;
  // Controls stay outside the inert production form; all injected identities and files are synthetic.
  const state = el('pre', { class: 'qa-file-state', role: 'status' });
  const controls = el(
    'div',
    { class: 'qa-release' },
    button('QA: trả phản hồi thao tác', releaseOperation),
    button('QA: tắt lỗi thao tác', () => {
      document.querySelector('#fail-operation').checked = false;
    }),
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
    button('QA: tắt lỗi đọc', () => {
      document.querySelector('#fail-read').checked = false;
    }),
    button('QA: bật lỗi text', () => {
      document.querySelector('#fail-text').checked = true;
    }),
    button('QA: tắt lỗi text', () => {
      document.querySelector('#fail-text').checked = false;
    }),
    button('QA: đặt lại bộ đếm dịch vụ', () => {
      Object.keys(serviceCalls).forEach((key) => {
        serviceCalls[key] = 0;
      });
      state.textContent = 'Bộ đếm dịch vụ = 0.';
    }),
    button('QA: kiểm tra nháp', async () => {
      state.textContent = await inspectDrafts();
    }),
    state,
  );
  dialog.querySelector('.dialog-content').prepend(controls);
}).observe(document.body, { childList: true });
