/** Offline, synthetic-only learning insight validation: no SDK, HTTP, SQL or browser. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeLearningInsights,
  robustScoreSlope,
} from '../src/utils/gradebook-learning-insights.js';
import { fixtureContext } from './student-gradeboard-data.js';
import { subjectLearningFeedback } from '../src/utils/gradebook-learning-feedback.js';
import {
  weightedComparisonPlan,
  compareWeightedClass,
  weightedClassFeedback,
  createWeightedComparisonRead,
} from '../src/utils/gradebook-learning-comparison.js';

const catalog = fixtureContext();
const sample = (subject, column, rawScore) => ({
  subjectCode: catalog.subjects[subject].code,
  columnCode: catalog.scoreColumns[column].code,
  rawScore,
});

test('learning insights: unavailable grades are not mistaken for zero', () => {
  const result = analyzeLearningInsights([], catalog);
  assert.equal(result.recorded, 0);
  assert.equal(result.analyzed, 0);
  assert.equal(result.profiles[0].median, null);
  assert.equal(result.profiles[0].trend, 'insufficient');

  const zero = analyzeLearningInsights([sample(0, 0, '0')], catalog);
  assert.equal(zero.recorded, 1);
  assert.equal(zero.profiles[0].median, 0);
  assert.equal(zero.profiles[0].trend, 'insufficient');
});

test('learning insights: robust slopes distinguish improving and declining scores', () => {
  const result = analyzeLearningInsights(
    [
      sample(0, 0, '5'),
      sample(0, 1, '6'),
      sample(0, 2, '7'),
      sample(0, 3, '8'),
      sample(1, 0, '9'),
      sample(1, 1, '8'),
      sample(1, 2, '7'),
      sample(1, 3, '6'),
      sample(2, 0, '8.25'),
      sample(2, 1, '8.25'),
      sample(2, 2, '8.25'),
    ],
    catalog,
  );
  assert.deepEqual(
    result.profiles.slice(0, 3).map((profile) => profile.trend),
    ['rising', 'falling', 'steady'],
  );
  assert.equal(result.analyzed, 3);
  assert.equal(result.rising, 1);
  assert.equal(result.profiles[2].median, 8.25);
});

test('learning insights: missing middle slots retain their original column positions', () => {
  const result = analyzeLearningInsights(
    [sample(0, 0, '5'), sample(0, 2, '6'), sample(0, 3, '8')],
    catalog,
  );
  assert.equal(result.profiles[0].trend, 'rising');
  assert.equal(result.profiles[0].samples, 3);
});

test('learning insights: needs three observed assessments before trend classification', () => {
  const result = analyzeLearningInsights([sample(0, 0, '1'), sample(0, 3, '10')], catalog);
  assert.equal(result.profiles[0].trend, 'insufficient');
  assert.equal(result.analyzed, 0);
});

test('learning insights: rejects peer fields, duplicates and impossible grades', () => {
  for (const scores of [
    [{ ...sample(0, 0, '8'), studentId: 'private' }],
    [sample(0, 0, '7'), sample(0, 0, '8')],
    [sample(0, 0, '11')],
    [sample(0, 0, '8.123456')],
    [{ ...sample(0, 0, '8'), rawScore: 8 }],
    [{ ...sample(0, 0, '8'), subjectCode: 'unknown' }],
  ]) {
    assert.throws(() => analyzeLearningInsights(scores, catalog));
  }
});

test('learning insights: invalid slope inputs fail closed', () => {
  assert.throws(() => robustScoreSlope([{ index: 0, value: 1 }]));
  assert.throws(() =>
    robustScoreSlope([
      { index: 0, value: 1 },
      { index: 0, value: 2 },
      { index: 3, value: 3 },
    ]),
  );
  assert.throws(() =>
    robustScoreSlope([
      { index: 0, value: 1 },
      { index: 1, value: Infinity },
      { index: 2, value: 3 },
    ]),
  );
});

test('learning insights: score summaries never include gradebook identities or peer data', () => {
  const report = analyzeLearningInsights([sample(0, 0, '9')], catalog);
  assert.deepEqual(Object.keys(report).sort(), [
    'analyzed',
    'falling',
    'profiles',
    'recorded',
    'rising',
    'slots',
  ]);
  assert.deepEqual(Object.keys(report.profiles[0]).sort(), [
    'assessments',
    'median',
    'medianLabel',
    'name',
    'points',
    'samples',
    'subjectCode',
    'trend',
  ]);
});

test('selected-subject advice follows its actual median and four-point trend', () => {
  const rows = [
    sample(0, 0, '4'),
    sample(0, 1, '5'),
    sample(0, 2, '6'),
    sample(0, 3, '7'),
    sample(1, 0, '9'),
    sample(1, 1, '7'),
    sample(1, 2, '5'),
    sample(1, 3, '3'),
    sample(2, 0, '8'),
    sample(2, 1, '8'),
    sample(2, 2, '8'),
  ];
  const report = analyzeLearningInsights(rows, catalog);
  const up = subjectLearningFeedback(report.profiles[0]);
  const down = subjectLearningFeedback(report.profiles[1]);
  const steady = subjectLearningFeedback(report.profiles[2]);
  assert.match(up.observation, /Thường xuyên 1 \(4\.0\)/);
  assert.match(up.observation, /Trung vị.*5\.5/);
  assert.match(up.advice, /ôn tập/);
  assert.match(down.advice, /thay đổi cách ôn tập/);
  assert.match(steady.advice, /duy trì/);
  assert.match(up.heading, /Toán/);
  assert.match(down.heading, /Văn/);
});

test('selected-subject feedback handles no scores, one score, two scores and zero', () => {
  for (const rows of [[], [sample(0, 0, '0')], [sample(0, 0, '0'), sample(0, 3, '3')]]) {
    const profile = analyzeLearningInsights(rows, catalog).profiles[0];
    const feedback = subjectLearningFeedback(profile);
    assert.match(feedback.observation, /chưa|Chưa|đủ|Hiện/);
    assert.doesNotMatch(feedback.observation, /có chiều hướng tăng|có chiều hướng giảm/);
    assert.ok(feedback.advice.length > 35);
  }
});

test('selected-subject feedback does not leak identities and rejects malformed profiles', () => {
  const profile = analyzeLearningInsights([sample(0, 0, '0')], catalog).profiles[0];
  const feedback = subjectLearningFeedback(profile);
  assert.deepEqual(Object.keys(feedback).sort(), ['advice', 'heading', 'observation']);
  assert.doesNotMatch(JSON.stringify(feedback), /studentId|birthDate|CCCD/);
  assert.throws(() => subjectLearningFeedback({ ...profile, samples: 4 }));
  assert.throws(() => subjectLearningFeedback({ ...profile, trend: 'rising' }));
});

/** Synthetic class counts use the accepted 101 buckets, never peer score lists. */
const classHistogram = (column, score, count = 20) => ({
  semester: 1,
  subjectCode: catalog.subjects[0].code,
  columnCode: column.columnCode,
  grouping: 'display_tenth_half_up',
  buckets: Array.from({ length: 101 }, (_, index) => ({
    scoreBucket: `${Math.floor(index / 10)}.${index % 10}`,
    studentCount: index === score * 10 ? count : 0,
  })),
});

test('weighted Gradebook reference: 4 TX x1, 1 tiết/GK x2, CK x3 divided by 11', () => {
  const rows = [5, 6, 7, 8, 8, 9, 10].map((score, index) => sample(0, index, String(score)));
  const plan = weightedComparisonPlan(rows, catalog, catalog.subjects[0].code);
  const expected = (5 + 6 + 7 + 8 + 2 * 8 + 2 * 9 + 3 * 10) / 11;
  assert.equal(plan.weightSum, 11);
  assert.ok(Math.abs(plan.ownAverage - expected) < 1e-12);
  assert.equal(plan.columns.length, 7);
  const result = compareWeightedClass(
    plan,
    plan.columns.map((col) => classHistogram(col, 7)),
    1,
  );
  assert.equal(result.status, 'ready');
  assert.equal(result.classLabel, '7.0');
  assert.equal(result.relation, 'above');
  assert.equal(result.incomplete, false);
});

test('weighted reference excludes missing columns, includes exact zero, and compares matching subset', () => {
  const plan = weightedComparisonPlan(
    [sample(0, 0, '0'), sample(0, 6, '10')],
    catalog,
    catalog.subjects[0].code,
  );
  assert.equal(plan.weightSum, 4);
  assert.equal(plan.ownAverage, 7.5);
  const summary = compareWeightedClass(
    plan,
    [classHistogram(plan.columns[0], 5), classHistogram(plan.columns[1], 5)],
    1,
  );
  assert.equal(summary.classLabel, '5.0');
  assert.equal(summary.usedColumns, 2);
  assert.equal(summary.incomplete, true);
  assert.match(weightedClassFeedback(summary), /cao hơn/);
  const empty = weightedComparisonPlan([], catalog, catalog.subjects[0].code);
  assert.deepEqual(compareWeightedClass(empty, [], 1), { status: 'no-scores' });
});

test('class comparison requires ten aggregated students per selected column and never assigns top rank', () => {
  const plan = weightedComparisonPlan([sample(0, 0, '4')], catalog, catalog.subjects[0].code);
  assert.deepEqual(compareWeightedClass(plan, [classHistogram(plan.columns[0], 5, 9)], 1), {
    status: 'insufficient-class',
  });
  assert.match(weightedClassFeedback({ status: 'insufficient-class' }), /Chưa có đủ/);
  const equal = compareWeightedClass(plan, [classHistogram(plan.columns[0], 4)], 1);
  assert.equal(equal.relation, 'similar');
  assert.doesNotMatch(weightedClassFeedback(equal), /top|xếp hạng|hạng nhất/i);
});

test('class comparison fails closed on wrong scope, peer data and malformed buckets', () => {
  const plan = weightedComparisonPlan([sample(0, 0, '8')], catalog, catalog.subjects[0].code);
  const valid = classHistogram(plan.columns[0], 8);
  for (const payload of [
    { ...valid, semester: 2 },
    { ...valid, subjectCode: 'wrong' },
    { ...valid, studentId: 'private' },
    { ...valid, buckets: valid.buckets.slice(1) },
  ])
    assert.throws(() => compareWeightedClass(plan, [payload], 1));
  assert.throws(() =>
    weightedComparisonPlan(
      [{ ...sample(0, 0, '8'), fullName: 'Private' }],
      catalog,
      catalog.subjects[0].code,
    ),
  );
  assert.throws(() => compareWeightedClass(plan, [], 1));
});

test('class comparison progress is bounded and uses only the existing histogram read', async () => {
  const plan = weightedComparisonPlan(
    [sample(0, 0, '7'), sample(0, 1, '8'), sample(0, 6, '9')],
    catalog,
    catalog.subjects[0].code,
  );
  const calls = [];
  const states = [];
  const owner = createWeightedComparisonRead(
    async (body, { signal }) => {
      calls.push({ body, signal });
      return classHistogram(plan.columns[calls.length - 1], 7);
    },
    (state) => states.push(state),
  );
  assert.equal(calls.length, 0);
  await owner.run(plan, 1);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.signal instanceof AbortSignal));
  assert.deepEqual(
    states.filter((state) => state.status === 'loading').map((state) => state.completed),
    [0, 1, 2, 3],
  );
  assert.equal(states.at(-1).status, 'ready');
  assert.equal(states.at(-1).result.classLabel, '7.0');
  owner.dispose();
});

test('class comparison never sends a request for no scores or after disposal', async () => {
  const empty = weightedComparisonPlan([], catalog, catalog.subjects[0].code);
  let calls = 0;
  const states = [];
  const owner = createWeightedComparisonRead(
    async () => {
      calls++;
    },
    (state) => states.push(state),
  );
  await owner.run(empty, 1);
  assert.equal(calls, 0);
  assert.deepEqual(states.at(-1), { status: 'no-scores' });
  owner.dispose();
  await owner.run(empty, 1);
  assert.equal(calls, 0);
});

test('class comparison cancellation suppresses late results and prevents the next column read', async () => {
  const plan = weightedComparisonPlan(
    [sample(0, 0, '6'), sample(0, 1, '7')],
    catalog,
    catalog.subjects[0].code,
  );
  const held = Promise.withResolvers();
  const states = [];
  const calls = [];
  const owner = createWeightedComparisonRead(
    async (body, { signal }) => {
      calls.push({ body, signal });
      return held.promise;
    },
    (state) => states.push(state),
  );
  const pending = owner.run(plan, 1);
  assert.equal(states.at(-1).status, 'loading');
  assert.equal(calls.length, 1);
  owner.cancel();
  assert.equal(calls[0].signal.aborted, true);
  const previousCount = states.length;
  held.resolve(classHistogram(plan.columns[0], 6));
  await pending;
  assert.equal(calls.length, 1);
  assert.equal(states.length, previousCount);
  owner.dispose();
});

test('class comparison stops on a small group and never fetches remaining columns', async () => {
  const plan = weightedComparisonPlan(
    [sample(0, 0, '6'), sample(0, 1, '7')],
    catalog,
    catalog.subjects[0].code,
  );
  let calls = 0;
  const states = [];
  const owner = createWeightedComparisonRead(
    async () => {
      calls++;
      return classHistogram(plan.columns[0], 6, 9);
    },
    (state) => states.push(state),
  );
  await owner.run(plan, 1);
  assert.equal(calls, 1);
  assert.deepEqual(states.at(-1), { status: 'insufficient-class' });
  owner.dispose();
});

test('class comparison failures have safe distinct states and never retry automatically', async () => {
  const plan = weightedComparisonPlan([sample(0, 0, '5')], catalog, catalog.subjects[0].code);
  for (const [status, category] of [
    [401, 'expired'],
    [403, 'denied'],
    [429, 'limited'],
    [503, 'unavailable'],
  ]) {
    const states = [];
    let calls = 0;
    const owner = createWeightedComparisonRead(
      async () => {
        calls++;
        throw { status, secret: 'must-not-appear' };
      },
      (state) => states.push(state),
    );
    await owner.run(plan, 1);
    assert.equal(calls, 1);
    assert.equal(states.at(-1).status, category);
    assert.doesNotMatch(JSON.stringify(states), /must-not-appear/);
    owner.dispose();
  }
});
