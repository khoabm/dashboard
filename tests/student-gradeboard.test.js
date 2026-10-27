/** CP05 pure DTO, decimal and state contracts; no HTTP/SDK/browser integration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  studentCatalog,
  studentContext,
  histogramScale,
  bucketIndex,
  ownGrades,
  histogram,
  bucketFor,
  createStudentRead,
} from '../src/utils/student-gradeboard.js';
import { fixtureContext } from './student-gradeboard-data.js';
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
      context: { ...catalog, class: fixtureContext().class },
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
      context: { ...catalog, class: fixtureContext().class },
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
      context: fixtureContext(),
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

test('F01 verification context must be complete before capability can authorize reads; reset recovers', async () => {
  for (const context of [
    undefined,
    {},
    { ...fixtureContext(), subjects: [] },
    { ...fixtureContext(), class: { ...fixtureContext().class, semester1Published: 'true' } },
    { ...fixtureContext(), class: undefined },
  ]) {
    let selected = context,
      calls = 0;
    const clock = () => Date.UTC(2026, 9, 27);
    const state = createLookupState({
      clock,
      verify: async () => ({
        kind: 'verified',
        capability: 'synthetic-memory',
        expiresAt: clock() / 1000 + 60,
        context: selected,
      }),
      request: async () => {
        calls++;
      },
    });
    await state.submit({ documentNumber: '000000009', birthDate: '29/02/2000' });
    assert.equal(state.snapshot().status, 'unavailable');
    assert.equal(state.context(), null);
    await assert.rejects(state.read({ op: 'grades', semester: 1 }));
    assert.equal(calls, 0);
    state.reset();
    selected = fixtureContext();
    await state.submit({ documentNumber: '000000009', birthDate: '29/02/2000' });
    assert.equal(state.snapshot().status, 'verified');
    state.dispose();
  }
  const projected = studentContext({ ...fixtureContext() });
  assert.equal(projected.class.semester2Published, false);
});
test('F02 integer axes cover zero, one, mixed and large safe counts with proportional values', () => {
  for (const counts of [[0, 0], [1], [1, 2, 3, 4, 5], [6, 14, 23], [Number.MAX_SAFE_INTEGER]]) {
    const scale = histogramScale(counts);
    assert.equal(scale.ticks[0], 0);
    assert.equal(scale.ticks.at(-1), Math.max(1, ...counts));
    assert.ok(scale.ticks.length <= 6);
    assert.ok(scale.ticks.every(Number.isSafeInteger));
    assert.ok(counts.every((n) => n / scale.maximum <= 1));
  }
  assert.deepEqual(histogramScale([0]).ticks, [0, 1]);
  assert.deepEqual(histogramScale([1]).ticks, [0, 1]);
  assert.deepEqual(['0', '8.25', '10'].map(bucketFor), ['0.0', '8.3', '10.0']);
  assert.throws(() => histogramScale([-1]));
});
test('F03 roving bucket indices stay bounded; Tab is never intercepted', () => {
  assert.equal(bucketIndex(0, 'ArrowLeft'), 0);
  assert.equal(bucketIndex(100, 'ArrowRight'), 100);
  assert.equal(bucketIndex(20, 'ArrowLeft'), 19);
  assert.equal(bucketIndex(20, 'ArrowRight'), 21);
  assert.equal(bucketIndex(20, 'Home'), 0);
  assert.equal(bucketIndex(20, 'End'), 100);
  assert.equal(bucketIndex(20, 'Tab'), 20);
});

test('V2 ECharts options retain all101 buckets, exact highlights and integer axes', async () => {
  const { studentChartOptions, chartWindow } = await import('../src/utils/student-chart.js');
  for (const peak of [0, 1, 23, 1000]) {
    const rows = distribution().buckets.map((row, index) => ({
      ...row,
      studentCount: index === 83 ? peak : 0,
    }));
    const option = studentChartOptions(rows, '8.3', chartWindow(83, 390), true);
    assert.equal(option.xAxis.data.length, 101);
    assert.equal(option.series[0].data.length, 101);
    assert.equal(option.series[0].data[83].value, peak);
    assert.equal(option.series[0].data.filter((row) => row.itemStyle.borderWidth === 1).length, 1);
    // Highlight never turns the generic green on hover; other buckets keep their own color.
    assert.equal(option.series[0].data[83].itemStyle.color, '#d28a44');
    assert.equal(option.series[0].data[83].emphasis.itemStyle.color, '#d28a44');
    assert.equal(option.series[0].data[83].emphasis.itemStyle.borderWidth, 2);
    assert.equal(option.series[0].data[50].emphasis.itemStyle.color, '#80b49b');
    assert.equal(option.series[0].barMaxWidth, 34);
    assert.equal(option.series[0].barCategoryGap, '45%');
    assert.equal(option.yAxis.minInterval, 1);
    assert.equal(option.yAxis.max, Math.max(1, peak));
    assert.equal(option.animation, false);
    assert.equal(option.dataZoom[0].filterMode, 'none');
    assert.ok(option.dataZoom[0].endValue <= 100);
    assert.equal(
      studentChartOptions(rows, null, chartWindow(0, 1440)).series[0].data.filter(
        (row) => row.itemStyle.borderWidth === 1,
      ).length,
      0,
    );
  }
  assert.deepEqual(chartWindow(0, 390), { start: 0, end: 8 });
  assert.deepEqual(chartWindow(100, 1440), { start: 68, end: 100 });
  for (const width of [280, 360, 390, 768, 1024, 1440]) {
    const first = chartWindow(0, width);
    const last = chartWindow(100, width);
    const middle = chartWindow(83, width);
    const span = first.end - first.start;
    assert.ok(span >= 8 && span <= 32);
    assert.equal(first.start, 0);
    assert.equal(last.end, 100);
    assert.equal(last.end - last.start, span);
    assert.equal(middle.end - middle.start, span);
    assert.ok(middle.start <= 83 && middle.end >= 83);
  }
  // Larger plots can show more levels without forcing narrow bars at mobile widths.
  assert.ok(
    chartWindow(40, 390).end - chartWindow(40, 390).start <
      chartWindow(40, 1024).end - chartWindow(40, 1024).start,
  );
});
