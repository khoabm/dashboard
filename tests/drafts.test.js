/** Tests local draft recovery and exclusion of files and credentials from text storage. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveDraft,
  readDraft,
  draftKey,
  removeDraft,
  createDraftWriter,
} from '../src/services/drafts.js';
const map = new Map();
globalThis.localStorage = {
  getItem: (k) => map.get(k) ?? null,
  setItem: (k, v) => map.set(k, v),
  removeItem: (k) => map.delete(k),
};
test('text draft survives recovery without files or auth credentials', () => {
  const key = draftKey('user-a', 'post-a');
  saveDraft(key, {
    title: 'Chưa đăng',
    body: 'Nội dung',
    password: 'never',
    access_token: 'never',
    attachments: [
      { id: 'new', file: {}, file_name: 'unsaved.png' },
      { id: 'saved', storage_path: 'post/file.png', file_name: 'saved.png' },
    ],
  });
  const value = readDraft(key);
  assert.equal(value.title, 'Chưa đăng');
  assert.equal(value.attachments.length, 1);
  assert.equal(value.password, undefined);
  assert.equal(value.access_token, undefined);
  assert.equal(value.attachments[0].file, undefined);
  assert.notEqual(draftKey('user-b', 'post-a'), key);
  removeDraft(key);
  assert.equal(readDraft(key), null);
});

test('draft flush waits for pending validation before reading dirty state and file bytes', async () => {
  const validation = Promise.withResolvers();
  let dirty = false,
    value = { title: 'Before selection', attachments: [] },
    reads = 0;
  const stored = [];
  const writer = createDraftWriter('pending', {
    whenReady: () => validation.promise,
    read: () => {
      reads++;
      return dirty ? value : null;
    },
    writeFiles: async (_, files) => stored.push({ files }),
    writeText: (_, draft) =>
      stored.push({ title: draft.title, order: draft.attachments.map((a) => a.id) }),
  });
  const saved = writer.save();
  await Promise.resolve();
  assert.equal(reads, 0);
  assert.deepEqual(stored, []);
  // A signature result arriving while the editor is locked must become part of this flush.
  dirty = true;
  value = {
    title: 'After validation',
    attachments: [
      {
        id: 'pdf',
        file_name: 'pending.pdf',
        file: new File(['%PDF-fixture'], 'pending.pdf', { type: 'application/pdf' }),
      },
    ],
  };
  validation.resolve();
  assert.equal(await saved, true);
  assert.equal(stored[0].files.length, 1);
  assert.equal(await stored[0].files[0].file.text(), '%PDF-fixture');
  assert.deepEqual(stored[1], { title: 'After validation', order: ['pdf'] });
});

test('failed blob storage blocks success and text writes but allows a later full retry', async () => {
  let fail = true,
    textWrites = 0,
    fileWrites = 0;
  const writer = createDraftWriter('failure', {
    whenReady: async () => {},
    read: () => ({
      title: 'Keep editor open',
      attachments: [{ id: 'pdf', file: new Blob(['%PDF-test']) }],
    }),
    writeFiles: async () => {
      if (fail) throw Error('IndexedDB unavailable');
      fileWrites++;
    },
    writeText: () => {
      textWrites++;
    },
  });
  assert.equal(await writer.save(), false);
  assert.equal(textWrites, 0);
  fail = false;
  assert.equal(await writer.save(), true);
  assert.equal(fileWrites, 1);
  assert.equal(textWrites, 1);
});

test('text storage and validation failures remain failures instead of closing over a partial draft', async () => {
  const textFailure = createDraftWriter('text-failure', {
    whenReady: async () => {},
    read: () => ({ attachments: [] }),
    writeFiles: async () => {},
    writeText: () => {
      throw Error('Local storage full');
    },
  });
  assert.equal(await textFailure.save(), false);
  let writes = 0;
  const validationFailure = createDraftWriter('validation-failure', {
    whenReady: async () => {
      throw Error('File read failed');
    },
    read: () => ({ attachments: [] }),
    writeFiles: async () => {
      writes++;
    },
    writeText: () => {
      writes++;
    },
  });
  assert.equal(await validationFailure.save(), false);
  assert.equal(writes, 0);
});

test('settled waits for every queued write before confirmed-save cleanup can remove a draft', async () => {
  const firstWrite = Promise.withResolvers();
  let value = { title: 'First', attachments: [] },
    count = 0;
  const events = [];
  const writer = createDraftWriter('serial', {
    whenReady: async () => {},
    read: () => value,
    writeFiles: async () => {
      if (++count === 1) await firstWrite.promise;
    },
    writeText: (_, snapshot) => events.push(snapshot.title),
  });
  const first = writer.save();
  // Let the first snapshot reach storage, then change the next queued snapshot.
  await Promise.resolve();
  await Promise.resolve();
  value = { title: 'Latest', attachments: [] };
  const second = writer.save();
  const cleared = writer.settled().then(() => events.push('cleanup'));
  await Promise.resolve();
  assert.deepEqual(events, []);
  firstWrite.resolve();
  assert.equal(await first, true);
  assert.equal(await second, true);
  await cleared;
  assert.deepEqual(events, ['First', 'Latest', 'cleanup']);
});
