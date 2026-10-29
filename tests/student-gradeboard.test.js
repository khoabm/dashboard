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

test('V2 sparse chart shows only occupied levels, preserves full aggregate and hover colors', async () => {
  const { studentChartOptions, chartWindow, occupiedScoreLevels, occupiedLevelIndex } =
    await import('../src/utils/student-chart.js');
  for (const peak of [0, 1, 23, 1000]) {
    const rows = distribution().buckets.map((row, index) => ({
      ...row,
      studentCount: index === 83 ? peak : 0,
    }));
    const occupied = occupiedScoreLevels(rows);
    assert.equal(rows.length, 101);
    assert.deepEqual(
      occupied.map((row) => row.scoreBucket),
      peak ? ['8.3'] : [],
    );
    const option = studentChartOptions(rows, '8.3', chartWindow(0, 390, occupied.length), true);
    assert.equal(option.aria.label.enabled, false); // Preserve the plot's interactive role, not ECharts role=img.
    assert.deepEqual(option.xAxis.data, peak ? ['8.3'] : []);
    assert.equal(option.series[0].data.length, peak ? 1 : 0);
    assert.equal(option.series[0].data[0]?.value, peak || undefined);
    assert.equal(option.yAxis.minInterval, 1);
    assert.equal(option.yAxis.max, Math.max(1, peak));
    assert.equal(option.animation, false);
    assert.equal(option.dataZoom.length, 0);
    if (peak) {
      assert.equal(option.series[0].data[0].itemStyle.color, '#d28a44');
      assert.equal(option.series[0].data[0].emphasis.itemStyle.color, '#d28a44');
      assert.equal(option.series[0].data[0].emphasis.itemStyle.borderWidth, 2);
    }
  }

  const rows = distribution().buckets.map((row, index) => ({
    ...row,
    studentCount: index === 0 ? 1 : index === 20 ? 3 : index === 83 ? 23 : index === 100 ? 2 : 0,
  }));
  const option = studentChartOptions(rows, '8.3', chartWindow(2, 390, 4), true);
  assert.deepEqual(option.xAxis.data, ['0.0', '2.0', '8.3', '10.0']);
  assert.deepEqual(
    option.series[0].data.map((row) => row.value),
    [1, 3, 23, 2],
  );
  assert.equal(option.series[0].data.filter((row) => row.itemStyle.borderWidth === 1).length, 1);
  assert.equal(option.series[0].data[1].emphasis.itemStyle.color, '#80b49b');
  assert.equal(option.series[0].barMaxWidth, 64);
  assert.equal(option.series[0].barCategoryGap, '36%');
  assert.equal(option.dataZoom.length, 0);

  const none = studentChartOptions(rows, null, chartWindow(0, 390, 4));
  assert.equal(none.series[0].data.filter((row) => row.itemStyle.borderWidth === 1).length, 0);
  assert.equal(occupiedLevelIndex(0, 'ArrowLeft', 4), 0);
  assert.equal(occupiedLevelIndex(0, 'ArrowRight', 4), 1);
  assert.equal(occupiedLevelIndex(2, 'Home', 4), 0);
  assert.equal(occupiedLevelIndex(0, 'End', 4), 3);
  assert.equal(occupiedLevelIndex(3, 'ArrowRight', 4), 3);
  assert.equal(occupiedLevelIndex(0, 'Home', 0), 0);
});

test('V2 dense occupied levels remain separated, scrollable and reachable across screen widths', async () => {
  const { studentChartOptions, chartWindow, occupiedScoreLevels } = await import(
    '../src/utils/student-chart.js'
  );
  const rows = distribution().buckets.map((row) => ({ ...row, studentCount: 2 }));
  const visible = occupiedScoreLevels(rows);
  assert.equal(visible.length, 101);
  for (const width of [280, 360, 390, 768, 1024, 1440]) {
    const first = chartWindow(0, width, visible.length);
    const last = chartWindow(100, width, visible.length);
    const middle = chartWindow(83, width, visible.length);
    const span = first.end - first.start + 1;
    assert.ok(span >= 4 && span <= 18);
    assert.equal(first.start, 0);
    assert.equal(last.end, 100);
    assert.equal(last.end - last.start + 1, span);
    assert.equal(middle.end - middle.start + 1, span);
    assert.ok(middle.start <= 83 && middle.end >= 83);
    const option = studentChartOptions(rows, '8.3', middle, true);
    assert.equal(option.xAxis.data.length, 101);
    assert.equal(option.series[0].data.length, 101);
    assert.equal(option.dataZoom.length, 2);
    assert.equal(option.dataZoom[0].filterMode, 'none');
    assert.equal(option.series[0].barMaxWidth, 64);
    assert.equal(option.series[0].barCategoryGap, '36%');
  }
  assert.ok(
    chartWindow(40, 390, 101).end - chartWindow(40, 390, 101).start <
      chartWindow(40, 1024, 101).end - chartWindow(40, 1024, 101).start,
  );
});
test('V2 responsive chart shows and hides dataZoom as occupied levels fit different widths', async () => {
  const { chartWindow, chartNeedsScroller, studentChartOptions } = await import(
    '../src/utils/student-chart.js'
  );
  const rows = distribution().buckets.map((row, index) => ({
    ...row,
    studentCount: [0, 10, 20, 30, 40, 50, 60, 70, 80, 83, 90, 100].includes(index) ? 5 : 0,
  }));
  const count = 12;
  const desktop = chartWindow(9, 1050, count);
  const mobile = chartWindow(9, 340, count);
  assert.equal(chartNeedsScroller(count, desktop), false);
  assert.equal(studentChartOptions(rows, '8.3', desktop).dataZoom.length, 0);
  assert.equal(chartNeedsScroller(count, mobile), true);
  assert.equal(studentChartOptions(rows, '8.3', mobile).dataZoom.length, 2);
  assert.equal(chartNeedsScroller(count, chartWindow(9, 1050, count)), false);
  assert.ok(mobile.start <= 9 && mobile.end >= 9);
  for (const width of [280, 360, 390, 420, 700, 768, 1024, 1440]) {
    const window = chartWindow(9, width, count);
    const options = studentChartOptions(rows, '8.3', window);
    const needsScroller = chartNeedsScroller(count, window);
    assert.equal(options.dataZoom.length, needsScroller ? 2 : 0);
    assert.equal(options.grid.bottom, needsScroller ? 86 : 44);
    assert.equal(options.xAxis.data.length, count);
    assert.ok(window.start <= 9 && window.end >= 9);
  }
  assert.equal(chartNeedsScroller(1, chartWindow(0, 280, 1)), false);
  assert.equal(chartNeedsScroller(0, chartWindow(0, 280, 0)), false);
});

// These are decoded data/state contracts, never HTTP/SDK/Edge execution in curated CI.
const requestId = '00000000-0000-4000-8000-000000000006';
const responseClock = () => Date.UTC(2026, 9, 27, 6);
const verifiedBody = () => ({
  requestId,
  capability: 'opaque-synthetic-capability',
  expiresAt: responseClock() / 1000 + 600,
  ...fixtureContext(),
});

test('CP06-A2 B4 verification envelope normalizes once into a detached internal context', async () => {
  const { verificationPayload } = await import('../src/utils/gradebook-responses.js');
  const payload = verifiedBody();
  payload.subjects.reverse();
  const result = verificationPayload(payload, responseClock);
  assert.equal(result.kind, 'verified');
  assert.equal(result.capability, payload.capability);
  assert.equal(result.expiresAt, payload.expiresAt);
  assert.deepEqual(result.context, fixtureContext());
  assert.equal(Object.hasOwn(result, 'requestId'), false);
  payload.class.name = 'Changed after projection';
  payload.subjects[0].displayName = 'Changed after projection';
  assert.deepEqual(result.context, fixtureContext());
});

test('CP06-A2 incomplete, incompatible or private verification metadata fails closed without echo', async () => {
  const { verificationPayload } = await import('../src/utils/gradebook-responses.js');
  for (const mutate of [
    (v) => delete v.class,
    (v) => delete v.requestId,
    (v) => (v.requestId = 'invalid'),
    (v) => (v.capability = ''),
    (v) => (v.capability = 'with whitespace'),
    (v) => (v.expiresAt = responseClock() / 1000),
    (v) => (v.expiresAt += 121),
    (v) => (v.expiresAt = String(v.expiresAt)),
    (v) => delete v.class.semester2Published,
    (v) => (v.class.semester1Published = 'true'),
    (v) => (v.class.id = 'private'),
    (v) => v.subjects.pop(),
    (v) => (v.subjects[0].code = v.subjects[1].code),
    (v) => (v.subjects[0].displayName = 'Unknown subject'),
    (v) => (v.scoreColumns[0].active = false),
    (v) => (v.scoreColumns[0].sortOrder = v.scoreColumns[1].sortOrder),
    (v) => (v.subjects[0].identityLookup = 'private'),
    (v) => (v.internalStateHash = 'private'),
  ]) {
    const payload = verifiedBody();
    mutate(payload);
    assert.throws(
      () => verificationPayload(payload, responseClock),
      (error) => {
        assert.doesNotMatch(error.message, /opaque-synthetic-capability|private|Unknown subject/);
        return true;
      },
    );
  }
  let getterCalls = 0;
  const payload = verifiedBody();
  Object.defineProperty(payload, 'capability', { enumerable: true, get: () => getterCalls++ });
  assert.throws(() => verificationPayload(payload, responseClock));
  assert.equal(getterCalls, 0);
});

test('CP06-A2 read envelopes drop requestId and preserve exact own decimals and aggregate-only selection', async () => {
  const { studentReadPayload } = await import('../src/utils/gradebook-responses.js');
  const context = fixtureContext(),
    body = { op: 'grades', semester: 1 };
  const payload = {
    requestId,
    semester: 1,
    scores: ['0', '10', '8.12345'].map((rawScore, index) => ({
      subjectCode: 'item_0',
      columnCode: `item_${index}`,
      rawScore,
    })),
  };
  assert.deepEqual(
    studentReadPayload(body, payload, context).scores.map((s) => s.rawScore),
    ['0', '10', '8.12345'],
  );
  assert.deepEqual(studentReadPayload(body, { requestId, semester: 1, scores: [] }, context), {
    semester: 1,
    scores: [],
  });
  for (const rawScore of ['8.123456', '8.123450', '8e0', 8.1]) {
    const invalid = structuredClone(payload);
    invalid.scores[0].rawScore = rawScore;
    assert.throws(() => studentReadPayload(body, invalid, context));
  }
  assert.throws(() => studentReadPayload({ ...body, studentId: '1' }, payload, context));
  assert.throws(() => studentReadPayload(body, { ...payload, ciphertext: 'private' }, context));
  const selected = { op: 'histogram', semester: 1, subjectCode: 'item_0', columnCode: 'item_0' };
  const aggregate = { ...distribution(), requestId, subjectCode: 'item_0', columnCode: 'item_0' };
  const result = studentReadPayload(selected, aggregate, context);
  assert.equal(result.buckets.length, 101);
  assert.equal(Object.hasOwn(result, 'requestId'), false);
  for (const change of [
    (v) => v.buckets.pop(),
    (v) => (v.buckets[0].studentId = 'peer'),
    (v) => (v.columnCode = 'item_1'),
    (v) => (v.semester = 2),
  ]) {
    const invalid = structuredClone(aggregate);
    change(invalid);
    assert.throws(() => studentReadPayload(selected, invalid, context));
  }
});

test('CP06-A3 normalized capability stays private through publication denial, revocation and expiry', async () => {
  const { verificationPayload, studentReadFailure, verificationFailure } = await import(
    '../src/utils/gradebook-responses.js'
  );
  let now = responseClock(),
    calls = 0,
    denied = 403;
  const state = createLookupState({
    clock: () => now,
    setTimer: () => 0,
    clearTimer: () => {},
    verify: async () => verificationPayload(verifiedBody(), () => now),
    request: async () => {
      calls++;
      throw studentReadFailure(denied);
    },
  });
  await state.submit({ documentNumber: '000000009', birthDate: '29/02/2000' });
  assert.equal(state.snapshot().status, 'verified');
  assert.doesNotMatch(JSON.stringify(state.snapshot()), /opaque-synthetic|000000009|2000-02-29/);
  await assert.rejects(state.read({ op: 'grades', semester: 2 }), { status: 403 });
  assert.equal(state.snapshot().status, 'verified'); // The other semester's capability remains owned.
  denied = 401;
  await assert.rejects(state.read({ op: 'grades', semester: 1 }), { status: 401 });
  assert.equal(state.snapshot().status, 'expired');
  assert.equal(state.context(), null);
  assert.equal(calls, 2);
  await state.submit({ documentNumber: '000000009', birthDate: '29/02/2000' });
  now += 600000;
  state.checkExpiry();
  await assert.rejects(state.read({ op: 'grades', semester: 1 }), { status: 401 });
  assert.equal(calls, 2);
  state.dispose();
  for (const status of [400, 401, 403, 409, 413, 415, 422, 429, 503, 500]) {
    const fault = studentReadFailure(status);
    assert.equal(fault.status, status === 500 ? 503 : status);
    assert.equal(fault.message, 'Student request unavailable');
    assert.deepEqual(verificationFailure(status), {
      kind: status === 401 ? 'neutral' : status === 429 ? 'limited' : 'unavailable',
    });
  }
  assert.equal(studentReadFailure('40001').status, 503);
});

test('CP06-A3 a normalized late verification cannot resurrect a reset or disposed view', async () => {
  const { verificationPayload } = await import('../src/utils/gradebook-responses.js');
  for (const action of ['reset', 'dispose']) {
    const held = Promise.withResolvers();
    const state = createLookupState({
      clock: responseClock,
      setTimer: () => 0,
      clearTimer: () => {},
      verify: async () => verificationPayload(await held.promise, responseClock),
    });
    const pending = state.submit({ documentNumber: '000000009', birthDate: '29/02/2000' });
    state[action]();
    held.resolve(verifiedBody());
    await pending;
    assert.equal(state.context(), null);
    assert.equal(state.snapshot().status, action === 'reset' ? 'idle' : 'disposed');
    assert.doesNotMatch(JSON.stringify(state.snapshot()), /opaque-synthetic|000000009|2000-02-29/);
    state.dispose();
  }
});

import {
  analyzeLearningInsights,
  robustScoreSlope,
  learningInsightRemark,
} from '../src/utils/gradebook-learning-insights.js';

const insightsRows = (entries) =>
  entries.map(([subject, column, rawScore]) => ({
    subjectCode: `s_${subject}`,
    columnCode: `c_${column}`,
    rawScore,
  }));

test('Learning Insights: no network, empty semester and 0 distinguish missing cells', () => {
  const blank = analyzeLearningInsights([], catalog);
  assert.deepEqual([blank.recorded, blank.slots, blank.analyzed, blank.rising], [0, 56, 0, 0]);
  assert.equal(blank.profiles[0].medianLabel, '—');
  assert.equal(blank.profiles[0].trend, 'insufficient');
  assert.match(learningInsightRemark(blank), /Chưa có môn học/);
  const one = analyzeLearningInsights(insightsRows([[0, 0, '0.00000']]), catalog);
  assert.equal(one.recorded, 1);
  assert.equal(one.profiles[0].medianLabel, '0.0');
  assert.equal(one.profiles[0].points[0].display, '0.0');
  assert.equal(one.profiles[0].points[1].value, null);
});

test('Learning Insights: median uses all recorded TX scores while trend needs >=3 distinct slots', () => {
  const result = analyzeLearningInsights(
    insightsRows([
      [0, 0, '5'],
      [0, 1, '6'],
      [0, 2, '7'],
      [0, 3, '8'],
      [1, 0, '9'],
      [1, 1, '8'],
      [1, 2, '7'],
      [1, 3, '6'],
      [2, 0, '3'],
      [2, 2, '3'],
      [2, 3, '3'],
      [3, 0, '8.12500'],
      [3, 2, '8.87500'],
    ]),
    catalog,
  );
  assert.equal(result.analyzed, 3);
  assert.equal(result.rising, 1);
  assert.equal(result.falling, 1);
  assert.equal(result.profiles[0].medianLabel, '6.5');
  assert.equal(result.profiles[0].trend, 'rising');
  assert.equal(result.profiles[1].trend, 'falling');
  assert.equal(result.profiles[2].trend, 'steady');
  assert.equal(result.profiles[3].medianLabel, '8.5');
  assert.equal(result.profiles[3].trend, 'insufficient');
  assert.match(learningInsightRemark(result), /1 môn tăng, 1 môn giảm và 1 môn ổn định/);
});

test('Learning Insights: independent 1 tiết/Giữa kì/Cuối kì never change trend', () => {
  const rows = insightsRows([
    [0, 0, '4'],
    [0, 1, '5'],
    [0, 2, '6'],
  ]);
  const first = analyzeLearningInsights(rows, catalog).profiles[0];
  const second = analyzeLearningInsights(
    [
      ...rows,
      ...insightsRows([
        [0, 4, '0'],
        [0, 5, '10'],
        [0, 6, '5'],
      ]),
    ],
    catalog,
  ).profiles[0];
  assert.equal(first.trend, 'rising');
  assert.equal(second.trend, 'rising');
  assert.equal(first.medianLabel, second.medianLabel);
  assert.deepEqual(
    second.assessments.map((a) => a.display),
    ['0.0', '10.0', '5.0'],
  );
});

test('Learning Insights: bounded robust slope is not dominated by a single spike', () => {
  assert.equal(
    robustScoreSlope([
      { index: 0, value: 4 },
      { index: 1, value: 5 },
      { index: 2, value: 6 },
      { index: 3, value: 10 },
    ]),
    1.5,
  );
  assert.throws(() => robustScoreSlope([{ index: 0, value: 4 }]));
  assert.throws(() =>
    robustScoreSlope([
      { index: 1, value: 2 },
      { index: 0, value: 3 },
      { index: 2, value: 4 },
    ]),
  );
});

test('Learning Insights: reject unknown fields, duplicate coordinates and invalid decimals', () => {
  const valid = insightsRows([[0, 0, '8.12345']]);
  for (const rows of [
    [...valid, ...valid],
    [{ ...valid[0], studentId: 'private' }],
    insightsRows([[0, 0, '8.123456']]),
    insightsRows([[0, 0, '8.123450']]),
    insightsRows([[0, 0, '-1']]),
    insightsRows([[0, 0, 'NaN']]),
    insightsRows([[9, 0, '8']]),
    insightsRows([[0, 7, '8']]),
  ])
    assert.throws(() => analyzeLearningInsights(rows, catalog));
});
