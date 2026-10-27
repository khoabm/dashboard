/** CP05 pure DTO, decimal and state contracts; no HTTP/SDK/browser integration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  studentCatalog,
  ownGrades,
  histogram,
  bucketFor,
  createStudentRead,
} from '../src/utils/student-gradeboard.js';
import { createLookupState } from '../src/utils/gradebook-ui.js';
const catalog = {
  subjects: ['Toán', 'Văn', 'Anh', 'KHTN', 'LS / ĐL', 'Công Nghệ', 'Tin Học', 'GDCD'].map(
    (displayName, i) => ({ code: `s_${i}`, displayName, sortOrder: i + 1, active: true }),
  ),
  scoreColumns: [
    'Thường xuyên 1',
    'Thường xuyên 2',
    'Thường xuyên 3',
    'Thường xuyên 4',
    '1 tiết',
    'Giữa kì',
    'Cuối kì',
  ].map((displayName, i) => ({ code: `c_${i}`, displayName, sortOrder: i + 1, active: true })),
};
const selection = { semester: 1, subjectCode: 's_0', columnCode: 'c_0' };
const distribution = () => ({
  ...selection,
  grouping: 'display_tenth_half_up',
  buckets: Array.from({ length: 101 }, (_, i) => ({
    scoreBucket: `${Math.floor(i / 10)}.${i % 10}`,
    studentCount: i === 83 ? 2 : 0,
  })),
});
test('CP05 catalogs preserve exact labels/order and own raw scores distinguish absence from zero', () => {
  assert.deepEqual(
    studentCatalog({ ...catalog, subjects: [...catalog.subjects].reverse() }),
    catalog,
  );
  assert.deepEqual(
    ownGrades(
      {
        semester: 1,
        scores: [
          { subjectCode: 's_0', columnCode: 'c_0', rawScore: '0.00000' },
          { subjectCode: 's_1', columnCode: 'c_0', rawScore: '8.12345' },
        ],
      },
      1,
      catalog,
    ).map((r) => r.rawScore),
    ['0', '8.12345'],
  );
  assert.deepEqual(ownGrades({ semester: 2, scores: [] }, 2, catalog), []);
  assert.throws(() => ownGrades({ semester: 2, scores: [] }, 1, catalog));
});
test('CP05 exact half-up groups and missing personal value', () => {
  assert.deepEqual(['8.24', '8.25', '8.26', '0', '10'].map(bucketFor), [
    '8.2',
    '8.3',
    '8.3',
    '0.0',
    '10.0',
  ]);
  assert.equal(bucketFor(null), null);
});
test('CP05 aggregate boundary rejects peer fields, malformed counts and wrong selection', () => {
  assert.equal(histogram(distribution(), selection).length, 101);
  for (const change of [
    (v) => (v.buckets[0].studentCount = -1),
    (v) => (v.buckets[0].name = 'peer'),
    (v) => (v.studentId = '1'),
    (v) => (v.columnCode = 'c_1'),
    (v) => v.buckets.pop(),
  ]) {
    const value = distribution();
    change(value);
    assert.throws(() => histogram(value, selection));
  }
  assert.throws(() =>
    ownGrades(
      {
        semester: 1,
        scores: [{ subjectCode: 's_0', columnCode: 'c_0', rawScore: '8', studentId: '1' }],
      },
      1,
      catalog,
    ),
  );
});
test('CP05 no prefetch; latest selection wins and disposed modal cannot receive late results', async () => {
  const pending = [];
  const states = [];
  const reader = createStudentRead(
    () => {
      const held = Promise.withResolvers();
      pending.push(held);
      return held.promise;
    },
    (s) => states.push(s),
  );
  assert.equal(pending.length, 0);
  const first = reader.run({ op: 'histogram' }, (v) => v);
  const second = reader.run({ op: 'histogram' }, (v) => v);
  pending[1].resolve('latest');
  await second;
  pending[0].resolve('old');
  await first;
  assert.equal(states.at(-1).value, 'latest');
  const late = reader.run({}, (v) => v);
  reader.dispose();
  const count = states.length;
  pending[2].resolve('late');
  await late;
  assert.equal(states.length, count);
});
test('CP05 denied, expired, limited and unavailable reads are terminal without retry', async () => {
  for (const [status, expected] of [
    [403, 'denied'],
    [401, 'expired'],
    [429, 'limited'],
    [503, 'unavailable'],
    [0, 'unavailable'],
  ]) {
    let calls = 0;
    let state;
    const r = createStudentRead(
      async () => {
        calls++;
        throw { status, diagnostics: 'hidden' };
      },
      (s) => (state = s),
    );
    await r.run({}, (v) => v);
    assert.equal(calls, 1);
    assert.deepEqual(state, { status: expected });
    r.dispose();
  }
});
test('CP05 capability remains private; semester denial preserves it; revocation clears it', async () => {
  let status = 403,
    calls = 0;
  const clock = () => Date.UTC(2026, 9, 27);
  const state = createLookupState({
    clock,
    verify: async () => ({
      kind: 'verified',
      capability: 'synthetic-memory',
      expiresAt: clock() / 1000 + 60,
      context: catalog,
    }),
    request: async (body, options) => {
      calls++;
      assert.equal(options.capability, 'synthetic-memory');
      assert.ok(options.signal);
      throw { status };
    },
  });
  await state.submit({ documentNumber: '000000009', birthDate: '29/02/2000' });
  assert.doesNotMatch(JSON.stringify(state.snapshot()), /synthetic-memory|000000009/);
  await assert.rejects(state.read({ op: 'grades', semester: 1 }));
  assert.equal(state.snapshot().status, 'verified');
  status = 401;
  await assert.rejects(state.read({ op: 'grades', semester: 2 }));
  assert.equal(state.snapshot().status, 'expired');
  assert.equal(state.context(), null);
  await assert.rejects(state.read({ op: 'grades', semester: 1 }));
  assert.equal(calls, 2);
  state.dispose();
});
test('CP05 leaving route aborts an ignored transport without private result resurrection', async () => {
  const held = Promise.withResolvers();
  let signal;
  const clock = () => Date.UTC(2026, 9, 27);
  const state = createLookupState({
    clock,
    verify: async () => ({
      kind: 'verified',
      capability: 'synthetic-memory',
      expiresAt: clock() / 1000 + 60,
      context: catalog,
    }),
    request: async (_, o) => {
      signal = o.signal;
      return held.promise;
    },
  });
  await state.submit({ documentNumber: '000000009', birthDate: '29/02/2000' });
  const read = state.read({ op: 'grades', semester: 1 });
  state.dispose();
  await assert.rejects(read);
  assert.equal(signal.aborted, true);
  held.resolve({ scores: [] });
  assert.equal(state.snapshot().status, 'disposed');
});

test('CP05 an already cancelled caller starts no private read', async () => {
  const clock = () => Date.UTC(2026, 9, 27);
  let calls = 0;
  const state = createLookupState({
    clock,
    verify: async () => ({
      kind: 'verified',
      capability: 'synthetic-memory',
      expiresAt: clock() / 1000 + 60,
    }),
    request: async () => {
      calls++;
    },
  });
  await state.submit({ documentNumber: '000000009', birthDate: '29/02/2000' });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(state.read({ op: 'grades', semester: 1 }, { signal: controller.signal }));
  assert.equal(calls, 0);
  state.dispose();
});
