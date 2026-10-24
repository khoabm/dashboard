/** Exercises complete metadata reads, session fencing, and uncertain uploads without network. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readAllRows } from '../src/services/pagination.js';
import { loadBoard, exportMetadata } from '../src/services/board.js';
import { uploadAttachments, cleanup } from '../src/services/storage.js';
import { createRequestGate } from '../src/utils/request-gate.js';

// Any accidental use of the real client fails this suite before reaching the network.
globalThis.fetch = () => {
  throw Error('Live network is forbidden in offline regression');
};
const local = new Map();
globalThis.localStorage = {
  getItem: (key) => local.get(key) ?? null,
  setItem: (key, value) => local.set(key, value),
};

/**
 * Builds an ordered, capped PostgREST fixture with observable page requests.
 *
 * @param {object} tables - Rows by table name.
 * @param {number} cap - The simulated provider response cap.
 * @param {Function} alter - Optional fault injection for a page response.
 * @returns {object} A request-compatible client and its call log.
 */
function metadataClient(tables, cap = 200, alter = (response) => response) {
  const calls = [];
  return {
    calls,
    from(table) {
      const orders = [];
      const query = {
        select: () => query,
        order: (column) => {
          orders.push(column);
          return query;
        },
        limit: async (limit) => ({ data: (tables[table] || []).slice(0, limit), error: null }),
        range: async (from, to) => {
          const rows = [...(tables[table] || [])].sort((a, b) => {
            for (const column of orders) {
              if (a[column] < b[column]) return -1;
              if (a[column] > b[column]) return 1;
            }
            return 0;
          });
          calls.push({ table, from, to, orders: [...orders] });
          return alter(
            {
              data: rows.slice(from, Math.min(to + 1, from + cap)),
              count: rows.length,
              error: null,
            },
            { table, from },
          );
        },
      };
      return query;
    },
  };
}

test('board and export include >1000 rows despite a smaller provider cap and tied ordering', async () => {
  const posts = Array.from({ length: 121 }, (_, i) => ({
    id: String(i).padStart(4, '0'),
    sort_order: 0,
    version: 1,
  }));
  const attachments = Array.from({ length: 1210 }, (_, i) => ({
    id: String(i).padStart(5, '0'),
    post_id: posts[Math.floor(i / 10)].id,
    sort_order: 0,
    type: 'link',
  })).reverse();
  const db = metadataClient({
    boards: [{ id: 'board' }],
    sections: [{ id: 'section' }],
    posts,
    attachments,
    audit_logs: attachments,
  });
  const board = await loadBoard(db);
  assert.equal(board.posts.length, 121);
  assert.ok(board.posts.every((post) => post.attachments.length === 10));
  assert.equal(
    db.calls.findIndex((call) => call.table === 'attachments') >
      db.calls.findIndex((call) => call.table === 'posts'),
    true,
  );
  assert.ok(db.calls.every((call) => call.orders.at(-1) === 'id'));
  const exported = await exportMetadata(db);
  assert.equal(exported.attachments.length, 1210);
  assert.equal(exported.audit_logs.length, 1210);
  assert.equal(new Set(exported.attachments.map((row) => row.id)).size, 1210);
});

test('exact page boundary needs no empty sentinel request; an empty table remains valid', async () => {
  const db = metadataClient({ posts: Array.from({ length: 1000 }, (_, id) => ({ id })) }, 500);
  assert.equal((await readAllRows(db, 'posts')).length, 1000);
  assert.equal(db.calls.length, 2);
  assert.deepEqual(await readAllRows(db, 'attachments'), []);
});

test('incomplete, duplicate, changing-count and failed pages never become editable snapshots or backups', async () => {
  const rows = Array.from({ length: 4 }, (_, id) => ({ id }));
  for (const fault of [
    (response) => ({ ...response, count: null }),
    (response, { from }) => (from ? { ...response, data: [] } : response),
    (response, { from }) => (from ? { ...response, data: [{ id: 0 }, { id: 1 }] } : response),
    (response, { from }) => (from ? { ...response, count: 3 } : response),
    (response, { from }) => (from ? { ...response, error: Error('page failed') } : response),
  ]) {
    const alter = (response, request) =>
      request.table === 'attachments' ? fault(response, request) : response;
    const db = metadataClient({ posts: [{ id: 'post' }], attachments: rows }, 2, alter);
    await assert.rejects(loadBoard(db));
    await assert.rejects(exportMetadata(db));
  }
});

test('logout invalidates an old response and permits a public request before it finishes', async () => {
  const gate = createRequestGate();
  let resolvePrivate;
  const delayed = new Promise((resolve) => {
    resolvePrivate = resolve;
  });
  let visible = ['private'];
  const old = gate.begin();
  assert.equal(gate.begin(), null);
  const privateRequest = delayed.then((rows) => {
    if (gate.isCurrent(old)) visible = rows;
    gate.finish(old);
  });
  gate.invalidate();
  visible = [];
  const publicTicket = gate.begin();
  resolvePrivate(['private returned late']);
  await privateRequest;
  assert.deepEqual(visible, []);
  assert.equal(gate.isCurrent(publicTicket), true);
  // A public failure keeps the cleared state, and a late failure cannot free the newer slot.
  gate.finish(old);
  assert.equal(gate.begin(), null);
  gate.finish(publicTicket);
  assert.ok(gate.begin());
});

/**
 * Creates a Storage fixture that can lose upload responses or reject reference checks.
 *
 * @param {object} options - Faults and referenced paths for the scenario.
 * @returns {object} A request-compatible client with attempted and deleted path logs.
 */
function storageClient({
  failAt = 0,
  referenceError = false,
  referenced = [],
  truncated = false,
} = {}) {
  const attempts = [],
    removed = [];
  return {
    attempts,
    removed,
    rpc: async () => ({ data: { storage_bytes: 0 }, error: null }),
    storage: {
      from: () => ({
        upload: async (path) => {
          attempts.push(path);
          return {
            data: {},
            error: attempts.length === failAt ? Error('Upload response lost') : null,
          };
        },
        remove: async (paths) => {
          removed.push(...paths);
          return { data: [], error: null };
        },
      }),
    },
    from: () => ({
      select: () => ({
        in: async (_, paths) => {
          const data = referenced
            .filter((path) => paths.includes(path))
            .map((storage_path) => ({ storage_path }));
          return {
            data: truncated ? [] : data,
            count: data.length,
            error: referenceError ? Error('Reference lookup offline') : null,
          };
        },
      }),
    }),
  };
}

test('lost upload response retains the attempted object and successful earlier uploads for cleanup', async () => {
  local.clear();
  const db = storageClient({ failAt: 2, referenceError: true });
  const file = new File(['%PDF-1.4 offline fixture'], 'lesson.pdf', { type: 'application/pdf' });
  let caught;
  try {
    await uploadAttachments(
      'post',
      [
        { id: 'one', file },
        { id: 'two', file },
      ],
      () => {},
      db,
    );
  } catch (error) {
    caught = error;
  }
  assert.match(caught.message, /response lost/);
  assert.equal(db.attempts.length, 2);
  assert.deepEqual(caught.orphanPaths, db.attempts);
  assert.deepEqual(JSON.parse(local.get('khtn8:cleanup')), db.attempts);
  assert.deepEqual(db.removed, []);
  const recovered = storageClient({ referenced: [db.attempts[0]] });
  await cleanup(db.attempts, recovered);
  assert.deepEqual(recovered.removed, [db.attempts[1]]);
  assert.deepEqual(JSON.parse(local.get('khtn8:cleanup')), []);
});

test('an uncertain upload is removed after a complete reference check, never on a truncated check', async () => {
  local.clear();
  const db = storageClient({ failAt: 1 });
  const file = new File(['%PDF-1.4 fixture'], 'lesson.pdf', { type: 'application/pdf' });
  await assert.rejects(
    uploadAttachments('post', [{ file }], () => {}, db),
    /response lost/,
  );
  assert.deepEqual(db.removed, db.attempts);
  const capped = storageClient({ referenced: ['post/used.pdf'], truncated: true });
  await assert.rejects(cleanup(['post/used.pdf'], capped), /tham chiếu/);
  assert.deepEqual(capped.removed, []);
  assert.deepEqual(JSON.parse(local.get('khtn8:cleanup')), ['post/used.pdf']);
});

test('cleanup batches large queues and preserves every referenced object', async () => {
  local.clear();
  const paths = Array.from({ length: 1201 }, (_, i) => `post/${i}.pdf`);
  const referenced = paths.filter((_, i) => i % 2 === 0);
  const db = storageClient({ referenced });
  await cleanup(paths, db);
  assert.equal(db.removed.length, 600);
  assert.ok(db.removed.every((path) => !referenced.includes(path)));
  assert.deepEqual(JSON.parse(local.get('khtn8:cleanup')), []);
});

test('cancelled upload before it starts makes no usage or Storage request', async () => {
  local.clear();
  const db = storageClient();
  let calls = 0;
  db.rpc = async () => {
    calls++;
    return { data: { storage_bytes: 0 }, error: null };
  };
  const file = new File(['%PDF-test'], 'lesson.pdf', { type: 'application/pdf' });
  await assert.rejects(
    uploadAttachments(
      'post',
      [{ file }],
      () => {},
      db,
      () => false,
    ),
    { name: 'AbortError' },
  );
  assert.equal(calls, 0);
  assert.deepEqual(db.attempts, []);
});

test('expiry while usage is pending stops the first upload', async () => {
  local.clear();
  const db = storageClient();
  let active = true;
  db.rpc = async () => {
    active = false;
    return { data: { storage_bytes: 0 }, error: null };
  };
  const file = new File(['%PDF-test'], 'lesson.pdf', { type: 'application/pdf' });
  await assert.rejects(
    uploadAttachments(
      'post',
      [{ file }],
      () => {},
      db,
      () => active,
    ),
    { name: 'AbortError' },
  );
  assert.deepEqual(db.attempts, []);
  assert.deepEqual(db.removed, []);
});

test('expiry after the first upload stops the batch and queues its path without remote cleanup', async () => {
  local.clear();
  const db = storageClient();
  let active = true,
    references = 0;
  const from = db.from;
  db.from = (...args) => {
    references++;
    return from(...args);
  };
  const storage = db.storage.from();
  db.storage.from = () => ({
    ...storage,
    upload: async (path) => {
      const result = await storage.upload(path);
      active = false;
      return result;
    },
  });
  const file = new File(['%PDF-test'], 'lesson.pdf', { type: 'application/pdf' });
  await assert.rejects(
    uploadAttachments(
      'post',
      [{ file }, { file }],
      () => {},
      db,
      () => active,
    ),
    { name: 'AbortError' },
  );
  assert.equal(db.attempts.length, 1);
  assert.equal(references, 0);
  assert.deepEqual(db.removed, []);
  assert.deepEqual(JSON.parse(local.get('khtn8:cleanup')), db.attempts);
});

test('expiry after a reference lookup does not start Storage deletion', async () => {
  local.clear();
  const db = storageClient();
  let active = true;
  db.from = () => ({
    select: () => ({
      in: async () => {
        active = false;
        return { data: [], count: 0, error: null };
      },
    }),
  });
  await assert.rejects(
    cleanup(['post/possible-orphan.pdf'], db, () => active),
    { name: 'AbortError' },
  );
  assert.deepEqual(db.removed, []);
  assert.deepEqual(JSON.parse(local.get('khtn8:cleanup')), ['post/possible-orphan.pdf']);
});
