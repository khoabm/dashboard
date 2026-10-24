/** Tests local draft recovery and exclusion of files and credentials from text storage. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveDraft,
  readDraft,
  draftKey,
  removeDraft,
  createDraftWriter,
  recoverAttachments,
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

test('recovery read failure preserves saved text and the original blob for a later retry', async () => {
  const key = draftKey('recovery-test', 'post');
  const file = {
    id: 'file',
    file_name: 'lesson.pdf',
    file: new File(['%PDF-test'], 'lesson.pdf', { type: 'application/pdf' }),
  };
  saveDraft(key, { title: 'Original draft', attachments: [file] });
  const original = map.get(key),
    saved = readDraft(key);
  const files = [file];
  await assert.rejects(
    recoverAttachments(key, saved, async () => {
      throw Error('Temporary read failure');
    }),
    /Temporary/,
  );
  assert.equal(map.get(key), original);
  assert.equal(await files[0].file.text(), '%PDF-test');
  const recovered = await recoverAttachments(key, saved, async () => files);
  assert.equal(recovered[0].id, 'file');
  assert.equal(map.get(key), original);
});

test('recovery rejects missing or unlisted blobs instead of silently dropping saved files', async () => {
  const saved = { attachments: [], attachment_order: ['expected'] };
  await assert.rejects(
    recoverAttachments('missing', saved, async () => undefined),
    /đủ tệp/,
  );
  await assert.rejects(
    recoverAttachments('missing', saved, async () => [{ id: 'expected' }]),
    /đầy đủ/,
  );
  await assert.rejects(
    recoverAttachments('extra', { attachments: [], attachment_order: [] }, async () => [
      { id: 'unexpected', file: new Blob(['%PDF-test']) },
    ]),
    /đủ tệp/,
  );
  assert.deepEqual(saved.attachment_order, ['expected']);
});

test('complete recovery preserves the mixed metadata/blob order and leaves both stores untouched', async () => {
  const link = { id: 'link', external_url: 'https://example.org/lesson' };
  const first = { id: 'one', file: new Blob(['%PDF-one']) },
    second = { id: 'two', file: new Blob(['%PDF-two']) };
  const saved = { attachments: [link], attachment_order: ['two', 'link', 'one'] };
  const recovered = await recoverAttachments('ordered', saved, async () => [first, second]);
  assert.deepEqual(
    recovered.map((entry) => entry.id),
    saved.attachment_order,
  );
  assert.equal(await recovered[0].file.text(), '%PDF-two');
  assert.deepEqual(saved.attachments, [link]);
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

test('partial draft publication preserves the committed legacy snapshot across close and retry', async () => {
  const key = draftKey('partial-write', 'post');
  const oldFile = { id: 'old', file: new File(['%PDF-old'], 'old.pdf') };
  const nextFile = { id: 'next', file: new File(['%PDF-next'], 'next.pdf') };
  const blobs = new Map([[key, [oldFile]]]);
  saveDraft(key, { title: 'Committed', attachments: [oldFile] });
  const originalText = map.get(key);
  let fail = true,
    writes = 0;
  const writer = createDraftWriter(key, {
    whenReady: async () => {},
    read: () => ({ title: 'Replacement', attachments: [nextFile] }),
    writeFiles: async (pointer, files) => {
      writes++;
      blobs.set(pointer, files);
    },
    writeText: (pointer, value) => {
      if (fail) throw Error('Text quota exceeded after blob write');
      saveDraft(pointer, value);
    },
  });
  assert.equal(await writer.save(), false);
  assert.equal(map.get(key), originalText);
  // Reopening reads only persisted metadata; the writer's in-memory state is irrelevant.
  const reopened = await recoverAttachments(key, readDraft(key), async (pointer) =>
    blobs.get(pointer),
  );
  assert.equal(reopened[0].id, 'old');
  assert.equal(await reopened[0].file.text(), '%PDF-old');
  assert.equal(await writer.save(), false);
  assert.equal(writes, 1);
  fail = false;
  assert.equal(await writer.save(), true);
  const committed = readDraft(key);
  assert.notEqual(committed.files_key, key);
  const restored = await recoverAttachments(key, committed, async (pointer) => blobs.get(pointer));
  assert.equal(await restored[0].file.text(), '%PDF-next');
  assert.equal(await blobs.get(key)[0].file.text(), '%PDF-old');
  assert.equal(writes, 1);
});

test('published version survives a later empty-file partial write and foreign pointers are rejected', async () => {
  const key = draftKey('versioned', 'post');
  const blobs = new Map();
  let fail = false;
  let value = { title: 'Version one', attachments: [{ id: 'pdf', file: new Blob(['%PDF-one']) }] };
  const writer = createDraftWriter(key, {
    whenReady: async () => {},
    read: () => value,
    writeFiles: async (pointer, files) => blobs.set(pointer, files),
    writeText: (pointer, draft) => {
      if (fail) throw Error('Storage full');
      saveDraft(pointer, draft);
    },
  });
  assert.equal(await writer.save(), true);
  const committed = map.get(key);
  fail = true;
  value = { title: 'Removed file', attachments: [] };
  assert.equal(await writer.save(), false);
  assert.equal(map.get(key), committed);
  const restored = await recoverAttachments(key, readDraft(key), async (pointer) =>
    blobs.get(pointer),
  );
  assert.equal(await restored[0].file.text(), '%PDF-one');
  await assert.rejects(
    recoverAttachments(key, { files_key: draftKey('other-user', 'post') }),
    /không hợp lệ/,
  );
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
