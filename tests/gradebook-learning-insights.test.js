/** Offline, synthetic-only learning insight validation: no SDK, HTTP, SQL or browser. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeLearningInsights,
  robustScoreSlope,
} from '../src/utils/gradebook-learning-insights.js';
import { fixtureContext } from './student-gradeboard-data.js';

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
