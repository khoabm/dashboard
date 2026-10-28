/** Pure CP03 ownership/input/preview contracts only; no HTTP, SDK, server or database execution. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classInput,
  studentInput,
  studentAction,
  studentRecord,
  createAdminGate,
  createRosterPreview,
  adminMessage,
} from '../src/utils/gradebook-admin.js';
import { newId } from '../src/utils/id.js';
import { adminPayload, adminRequest } from '../src/utils/gradebook-admin-responses.js';

const classroom = {
  id: '00000000-0000-4000-8000-000000000001',
  revision: '9007199254740993',
  name: '6A8',
  schoolYear: '2026–2027',
};
const student = {
  id: '9007199254740993',
  revision: '9007199254740994',
  classId: classroom.id,
  fullName: 'Tên giả lập',
  birthDate: '2000-02-29',
  active: true,
};
const input = { fullName: student.fullName, documentNumber: '000000009', birthDate: '29/02/2000' };

test('CP03-T01 unverified/failed/expired owners cannot invoke work; UUID routing has its existing fallback', async () => {
  let calls = 0;
  for (const status of ['loading', 'error', 'anonymous']) {
    const gate = createAdminGate(
      () => {
        calls++;
      },
      () => ({ status, generation: 1 }),
    );
    await assert.rejects(gate.call({ op: 'class.read' }), { status: 403 });
  }
  assert.equal(calls, 0);
  const original = crypto.randomUUID;
  try {
    crypto.randomUUID = undefined;
    assert.match(newId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  } finally {
    crypto.randomUUID = original;
  }
});

test('CP03-T02 class name/year patch is independent and preserves exact revision; no rollover fields', () => {
  assert.deepEqual(classInput({ name: '6A8', schoolYear: '2027–2028' }, classroom), {
    op: 'class.patch',
    classId: classroom.id,
    expectedRevision: classroom.revision,
    schoolYear: '2027–2028',
  });
  assert.deepEqual(classInput({ name: ' 6A9 ', schoolYear: classroom.schoolYear }, classroom), {
    op: 'class.patch',
    classId: classroom.id,
    expectedRevision: classroom.revision,
    name: '6A9',
  });
  assert.throws(() => classInput(classroom, classroom));
  assert.throws(() => classInput({ name: '', schoolYear: '2026' }, null));
  assert.equal(classInput({ name: '6A8', schoolYear: '2026' }, null).op, 'class.create');
  assert.doesNotMatch(
    adminMessage({ status: 409, message: 'private backend payload' }),
    /private backend/,
  );
  assert.doesNotMatch(adminMessage({ status: 503 }), /Chưa có dữ liệu nào được ghi/);
});

test('CP03-T03 student corrections/status/delete require deliberate fields/confirmation, never numeric IDs/cascade', () => {
  const created = studentInput(input, classroom.id, null, false, '2026-10-26');
  assert.equal(created.documentNumber, '000000009');
  assert.equal(created.birthDate, '2000-02-29');
  const renamed = studentInput(
    { ...input, fullName: 'Tên mới', documentNumber: 'bad', birthDate: 'bad' },
    classroom.id,
    student,
  );
  assert.deepEqual(renamed, {
    op: 'student.patch',
    classId: classroom.id,
    studentId: student.id,
    expectedRevision: student.revision,
    fullName: 'Tên mới',
  });
  assert.equal(studentInput({ ...input, fullName: '' }, classroom.id, student).confirmed, true);
  assert.throws(() =>
    studentInput({ ...input, documentNumber: 'bad' }, classroom.id, student, true),
  );
  for (const kind of ['deactivate', 'reactivate', 'delete']) {
    assert.throws(() => studentAction(student, classroom.id, kind, false));
    assert.deepEqual(studentAction(student, classroom.id, kind, true), {
      op: `student.${kind}`,
      classId: classroom.id,
      studentId: student.id,
      expectedRevision: student.revision,
      confirmed: true,
    });
  }
});

test('CP03-T04 ordinary list projection discards identity, encrypted material and unrelated payload', () => {
  assert.deepEqual(
    studentRecord(
      { ...student, documentNumber: '000000009', identityLookup: 'private', scores: ['private'] },
      classroom.id,
    ),
    student,
  );
  assert.throws(() => studentRecord(student, 'other-class'));
  assert.throws(() => studentRecord({ ...student, id: 123 }, classroom.id));
});

test('CP03-T09 confirmation binds the class, batch generation, token and expiry; errors cannot grant apply', () => {
  let now = 1000000;
  const preview = createRosterPreview(() => now);
  const batch = {
    headers: ['', ''],
    rows: [{ row: 2, documentNumber: '000000009', birthDate: '2000-02-29' }],
  };
  const token = {
    counts: { error: 0 },
    previewToken: 'synthetic-preview',
    expiresAt: 1100,
    private: 'never stored',
  };
  const ticket = preview.set(batch, classroom.id);
  assert.equal(preview.accept({ ...token, counts: { error: 1 } }, ticket), false);
  assert.throws(() => preview.apply(classroom.id));
  assert.equal(preview.accept(token, ticket), true);
  batch.rows[0].documentNumber = '999999999';
  assert.equal(preview.apply(classroom.id).rows[0].documentNumber, '000000009');
  assert.throws(() => preview.apply('another-class'));
  const newer = preview.set(batch, classroom.id);
  assert.equal(preview.accept(token, ticket), false);
  assert.equal(preview.accept(token, newer), true);
  now = 1100001;
  assert.throws(() => preview.apply(classroom.id));
  preview.clear();
  assert.equal(preview.accept(token, newer), false);
});

test('CP03-T10 cancellation/session change fences slow reveal or mutation results; no retry and no stale commit', async () => {
  const held = Promise.withResolvers();
  const owner = { status: 'admin', generation: 1 };
  let calls = 0;
  const gate = createAdminGate(
    () => {
      calls++;
      return held.promise;
    },
    () => owner,
  );
  const pending = gate.call({ op: 'student.reveal' });
  const rejection = assert.rejects(pending, { name: 'AbortError' });
  gate.cancel();
  held.resolve({ documentNumber: '000000009' });
  await rejection;
  assert.equal(calls, 1);
  const another = Promise.withResolvers();
  const g2 = createAdminGate(
    () => another.promise,
    () => owner,
  );
  const p2 = g2.call({ op: 'class.patch' });
  owner.status = 'anonymous';
  owner.generation++;
  another.resolve({ class: classroom });
  await assert.rejects(p2, { name: 'AbortError' });
});

test('CP06-B pure teacher envelopes preserve raw values, BIGINT strings and reject private fields', () => {
  const requestId = '40000000-0000-4000-8000-000000000001';
  const body = { op: 'scores.read', classId: classroom.id, semester: 1, limit: 20 };
  const payload = {
    requestId,
    students: [
      {
        studentId: '9007199254740993',
        scores: [
          {
            subjectCode: 'math',
            columnCode: 'continuous_1',
            rawScore: '8.12345',
            revision: '9007199254740994',
          },
        ],
      },
    ],
    nextCursor: null,
  };
  const result = adminPayload(body, payload);
  assert.equal(result.students[0].scores[0].rawScore, '8.12345');
  assert.equal(result.students[0].studentId, '9007199254740993');
  assert.ok(!('requestId' in result));
  assert.throws(() => adminPayload(body, { ...payload, identityLookup: 'private' }));
  assert.throws(() =>
    adminPayload(body, {
      ...payload,
      students: [{ ...payload.students[0], birthDate: '2000-01-01' }],
    }),
  );
  assert.throws(() => adminRequest({ ...body, session: 'forged' }));
  assert.throws(() => adminRequest({ op: 'score.put', score: 8.12345 }));
});

test('CP06-B pure projections cover confirmed mutations, class absence and safe error previews', () => {
  const requestId = '40000000-0000-4000-8000-000000000001';
  assert.deepEqual(adminPayload({ op: 'class.read' }, { requestId, class: null }), { class: null });
  for (const op of ['student.delete', 'score.delete'])
    assert.deepEqual(adminPayload({ op }, { requestId, deleted: true }), { deleted: true });
  assert.deepEqual(adminPayload({ op: 'score.put' }, { requestId, changed: false }), {
    changed: false,
  });
  assert.throws(() =>
    adminPayload({ op: 'score.put' }, { requestId, changed: true, rawScore: '8' }),
  );
  const preview = {
    requestId,
    counts: { insert: 0, update: 0, unchanged: 0, error: 1, skippedBlank: 0 },
    errors: [{ row: 4, column: 3, code: 'invalid' }],
    previewToken: null,
    expiresAt: null,
  };
  assert.equal(adminPayload({ op: 'scores.preview' }, preview).errors[0].row, 4);
  assert.throws(() =>
    adminPayload({ op: 'scores.preview' }, { ...preview, previewToken: 'sensitive' }),
  );
  assert.throws(() =>
    adminPayload(
      { op: 'scores.apply' },
      { requestId, counts: preview.counts, errors: [], committed: true },
    ),
  );
});
