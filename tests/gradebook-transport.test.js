/** Specialist offline frontend/HTTP boundary checks; never runs in curated CI or calls a network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGradebookTransport, requestGradebook } from '../src/services/gradebook-transport.js';
import { createGradebookAdmin } from '../src/services/gradebook-admin.js';
import { createTeacherCatalog } from '../src/services/gradebook-catalog.js';
import { createStudentLookup } from '../src/services/student-lookup.js';
import { createLookupState } from '../src/utils/gradebook-ui.js';
import { createAdminGate } from '../src/utils/gradebook-admin.js';
import { fixtureContext } from './student-gradeboard-data.js';

const cid = '30000000-0000-4000-8000-000000000001',
  requestId = '40000000-0000-4000-8000-000000000001';
const auth = {
  token: 'synthetic-access-token',
  expiresAt: Math.floor(Date.now() / 1000) + 600,
  generation: 1,
};
const classValue = {
  id: cid,
  revision: '9007199254740993',
  name: 'Synthetic class',
  schoolYear: '2026',
  semester1Published: true,
  semester2Published: false,
};
const response = (value, status = 200) => Response.json({ ...value, requestId }, { status });
const transport = (fetcher, options = {}) =>
  createGradebookTransport({
    enabled: true,
    url: 'https://synthetic.supabase.co',
    key: 'sb_publishable_synthetic',
    fetcher,
    ...options,
  });
globalThis.fetch = () => {
  throw Error('Network forbidden');
};

test('disabled production/default/invalid config never invokes fetch', async () => {
  let calls = 0;
  const fetcher = () => {
    calls++;
    throw Error('Forbidden');
  };
  for (const options of [
    {},
    { enabled: 'true' },
    { enabled: true, url: 'https://untrusted.invalid' },
  ])
    await assert.rejects(
      createGradebookTransport({ ...options, fetcher })('student-lookup', { op: 'verify' }),
      { status: 503 },
    );
  await assert.rejects(requestGradebook('student-lookup', { op: 'verify' }), { status: 503 });
  assert.equal(calls, 0);
});

test('teacher sends one authorized POST, catalog class binding and safe projected metadata', async () => {
  const calls = [];
  const context = fixtureContext();
  context.subjects[0].code = 'math';
  context.scoreColumns[0].code = 'continuous_1';
  const request = createGradebookAdmin({
    session: () => auth,
    transport: transport(async (url, init) => {
      calls.push({ url, init });
      const body = JSON.parse(init.body);
      return response(
        body.op === 'catalog.read'
          ? { subjects: context.subjects, scoreColumns: context.scoreColumns }
          : { class: classValue },
      );
    }),
  });
  assert.deepEqual(await request({ op: 'class.read' }), { class: classValue });
  const catalog = await createTeacherCatalog(request)({ classId: cid });
  assert.equal(catalog.subjects[0].code, 'math');
  assert.equal(catalog.scoreColumns[0].code, 'continuous_1');
  assert.deepEqual(JSON.parse(calls[1].init.body), { op: 'catalog.read', classId: cid });
  assert.equal(calls[0].init.headers.authorization, 'Bearer ' + auth.token);
  assert.equal(calls[0].init.headers.apikey, 'sb_publishable_synthetic');
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls.length, 2);
  await assert.rejects(request({ op: 'class.read', actor: 'forged' }), { status: 503 });
  assert.equal(calls.length, 2);
});

test('missing/expired teacher sessions and terminal statuses do not retry or expose diagnostics', async () => {
  let calls = 0;
  const wire = transport(async () => {
    calls++;
    return response({ error: 'private diagnostic' }, 409);
  });
  for (const session of [() => null, () => ({ ...auth, expiresAt: 0 })])
    await assert.rejects(createGradebookAdmin({ session, transport: wire })({ op: 'class.read' }), {
      status: 401,
    });
  assert.equal(calls, 0);
  for (const status of [401, 403, 409, 422, 429, 503]) {
    const request = createGradebookAdmin({
      session: () => auth,
      transport: transport(async () => {
        calls++;
        return response({ error: 'private diagnostic' }, status);
      }),
    });
    await assert.rejects(
      request({ op: 'class.read' }),
      (e) => e.status === status && !JSON.stringify(e).includes('private diagnostic'),
    );
  }
  assert.equal(calls, 6);
});

test('structured 422 preview survives AdminError and gate while malformed/private fields fail closed', async () => {
  const payload = {
    counts: { insert: 1, update: 0, unchanged: 0, error: 1, skippedBlank: 0 },
    errors: [{ row: 3, column: 1, code: 'invalid' }],
    previewToken: null,
    expiresAt: null,
  };
  const request = createGradebookAdmin({
    session: () => auth,
    transport: transport(async () => response(payload, 422)),
  });
  const body = { op: 'roster.preview', classId: cid, headers: ['', ''], rows: [] };
  await assert.rejects(
    request(body),
    (error) =>
      error.status === 422 && error.payload.errors[0].row === 3 && !('requestId' in error.payload),
  );
  const gate = createAdminGate(request, () => ({ status: 'admin', generation: 1 }));
  assert.equal((await gate.call(body)).counts.error, 1);
  const malformed = createGradebookAdmin({
    session: () => auth,
    transport: transport(async () => response({ ...payload, identityLookup: 'private' }, 422)),
  });
  await assert.rejects(malformed(body), { status: 503 });
});

test('timeout, abort, late response and session replacement cannot return stale private data', async () => {
  let release;
  const wire = transport(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    { timeout: 10 },
  );
  await assert.rejects(wire('grades-admin', { op: 'class.read' }, { token: auth.token }), {
    status: 503,
  });
  release(response({ class: classValue }));
  const controller = new AbortController();
  const pending = transport(() => new Promise(() => {}))(
    'student-lookup',
    { op: 'verify' },
    { signal: controller.signal },
  );
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  let owner = auth,
    finish;
  const request = createGradebookAdmin({
    session: () => owner,
    transport: transport(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ),
  });
  const old = request({ op: 'class.read' });
  owner = null;
  finish(response({ class: classValue }));
  await assert.rejects(old, { name: 'AbortError' });
});

test('student state owns capability; only approved header carries it and 403 preserves semester I', async () => {
  const context = fixtureContext(),
    calls = [];
  let status = 200;
  const services = createStudentLookup(
    transport(async (url, init) => {
      const body = JSON.parse(init.body);
      calls.push({ body, headers: init.headers });
      if (body.op === 'verify')
        return response({
          ...context,
          capability: 'synthetic-memory-capability',
          expiresAt: Math.floor(Date.now() / 1000) + 300,
        });
      if (status !== 200) return response({ error: 'private' }, status);
      return response({
        semester: body.semester,
        scores: [{ subjectCode: 'item_0', columnCode: 'item_0', rawScore: '8.12345' }],
      });
    }),
  );
  const state = createLookupState({
    verify: services.verifyStudent,
    request: services.readStudent,
  });
  await state.submit({ documentNumber: '000000009', birthDate: '29/02/2000' });
  assert.equal(state.snapshot().status, 'verified');
  assert.ok(!JSON.stringify(state.snapshot()).includes('capability'));
  const grades = await state.read({ op: 'grades', semester: 1 });
  assert.equal(grades.scores[0].rawScore, '8.12345');
  assert.deepEqual(calls[1].body, { op: 'grades', semester: 1 });
  assert.equal(calls[1].headers['x-gradebook-capability'], 'synthetic-memory-capability');
  assert.equal(calls[0].headers['x-gradebook-capability'], undefined);
  status = 403;
  await assert.rejects(state.read({ op: 'grades', semester: 2 }), { status: 403 });
  assert.equal(state.snapshot().status, 'verified');
  status = 401;
  await assert.rejects(state.read({ op: 'grades', semester: 1 }), { status: 401 });
  assert.equal(state.context(), null);
  assert.equal(state.snapshot().status, 'expired');
  state.dispose();
});

test('malformed verification/private responses and peer selectors fail closed', async () => {
  let calls = 0;
  const service = createStudentLookup(
    transport(async () => {
      calls++;
      return response({ capability: 'sensitive', private: 'diagnostic' });
    }),
  );
  assert.deepEqual(
    await service.verifyStudent({ documentNumber: '000000009', birthDate: '2000-02-29' }),
    { kind: 'unavailable' },
  );
  await assert.rejects(
    service.readStudent({ op: 'grades', semester: 1, studentId: '2' }, { capability: 'synthetic' }),
    { status: 503 },
  );
  assert.equal(calls, 1);
  await assert.rejects(
    service.readStudent(
      { op: 'grades', semester: 1 },
      { capability: 'synthetic', context: fixtureContext() },
    ),
    { status: 503 },
  );
});

test('all approved teacher operation families retain B4 response contracts and exact writes', async () => {
  const pupil = {
    id: '9007199254740993',
    classId: cid,
    revision: '9007199254740994',
    fullName: null,
    birthDate: '2000-02-29',
    active: true,
  };
  const counts = { insert: 1, update: 0, unchanged: 0, error: 0, skippedBlank: 0 };
  const calls = [];
  const request = createGradebookAdmin({
    session: () => auth,
    transport: transport(async (_url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      if (body.op.startsWith('class.') || body.op.startsWith('semester.'))
        return response({ class: classValue });
      if (body.op === 'students.list') return response({ students: [pupil], nextCursor: null });
      if (body.op === 'scores.read')
        return response({
          students: [
            {
              studentId: pupil.id,
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
        });
      if (body.op === 'student.reveal') return response({ documentNumber: '000000009' });
      if (body.op.endsWith('.delete')) return response({ deleted: true });
      if (body.op === 'score.put') return response({ changed: true });
      if (body.op.endsWith('.preview'))
        return response({
          counts,
          errors: [],
          previewToken: 'synthetic-preview',
          expiresAt: Math.floor(Date.now() / 1000) + 300,
        });
      if (body.op.endsWith('.apply')) return response({ counts, errors: [], committed: true });
      return response({ student: pupil });
    }),
  });
  for (const op of [
    'class.read',
    'class.create',
    'class.patch',
    'students.list',
    'student.read',
    'student.create',
    'student.patch',
    'student.deactivate',
    'student.reactivate',
    'student.delete',
    'student.reveal',
    'scores.read',
    'score.put',
    'score.delete',
    'roster.preview',
    'roster.apply',
    'scores.preview',
    'scores.apply',
    'semester.publish',
    'semester.unpublish',
  ]) {
    // Business validation remains B4-owned; this finite matrix verifies DTO compatibility only.
    const body = {
      op,
      ...(op === 'class.create' ? {} : { classId: cid }),
      ...(op === 'score.put' ? { score: '8.12345', expectedRevision: null } : {}),
    };
    const result = await request(body);
    assert.ok(result);
    if (op === 'scores.read') assert.equal(result.students[0].scores[0].rawScore, '8.12345');
  }
  assert.equal(calls.length, 20);
  assert.equal(calls.find((row) => row.op === 'score.put').score, '8.12345');
});

test('HTTP 200 with bounded clock skew verifies unpublished context and caps local capability lifetime', async (t) => {
  const now = Date.UTC(2026, 9, 28, 10, 0, 0) + 279;
  t.mock.method(Date, 'now', () => now);
  const context = fixtureContext();
  context.class.semester1Published = false;
  context.class.semester2Published = false;
  for (const remaining of [660721, 720721, -279]) {
    let calls = 0;
    const services = createStudentLookup(
      transport(async (_url, init) => {
        calls++;
        assert.equal(init.headers.authorization, undefined);
        assert.equal(init.credentials, 'omit');
        return response({
          ...context,
          capability: 'synthetic-skew-placeholder',
          expiresAt: (now + remaining) / 1000,
        });
      }),
    );
    let expiryDelay;
    const state = createLookupState({
      verify: services.verifyStudent,
      request: services.readStudent,
      clock: () => now,
      setTimer: (_callback, delay) => {
        expiryDelay = delay;
        return 1;
      },
      clearTimer: () => {},
    });
    await state.submit({ documentNumber: '000000009', birthDate: '29/02/2000' });
    assert.equal(state.snapshot().status, remaining === 660721 ? 'verified' : 'unavailable');
    if (remaining === 660721) {
      assert.deepEqual(state.context(), context);
      assert.ok(expiryDelay > 0 && expiryDelay <= 600000);
      assert.equal(state.snapshot().expiresAt, Math.floor(now / 1000) + 600);
    }
    assert.ok(!JSON.stringify(state.snapshot()).includes('synthetic-skew-placeholder'));
    assert.equal(calls, 1);
    state.dispose();
  }
});
