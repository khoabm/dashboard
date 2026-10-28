/** Computes explainable, session-only trends from a student's already validated semester scores. */
import { normalizeScore } from './gradebook/decimal.js';

const fail = (condition) => {
  if (!condition) throw Error('Invalid learning insights data');
};

const median = (values) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

/**
 * Computes a robust Theil–Sen slope across the numbered continuous-assessment slots.
 * Missing slots retain their positions, and a single outlier cannot dominate the estimate.
 * The slot order does not establish real assessment dates or predict future performance.
 *
 * @param {{index: number, value: number}[]} points - At least three bounded grade observations.
 * @returns {number} Median change per score-column step.
 */
export function robustScoreSlope(points) {
  fail(
    Array.isArray(points) &&
      points.length >= 3 &&
      points.length <= 4 &&
      points.every(
        (point, index) =>
          Number.isInteger(point.index) &&
          point.index >= 0 &&
          point.index <= 3 &&
          (index === 0 || point.index > points[index - 1].index) &&
          Number.isFinite(point.value) &&
          point.value >= 0 &&
          point.value <= 10,
      ),
  );
  const slopes = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      slopes.push((points[j].value - points[i].value) / (points[j].index - points[i].index));
    }
  }
  return median(slopes);
}

/**
 * Projects only student-owned, already published scores into a deterministic insight summary.
 * Uses the shared exact-decimal contract and catalog codes; refuses unknown or extra fields.
 * No peer scores, remote requests, storage or model-generated text are involved.
 *
 * @param {Array<{subjectCode: string, columnCode: string, rawScore: string}>} scores - Own semester values.
 * @param {{subjects: object[], scoreColumns: object[]}} catalog - Validated teacher catalog.
 * @returns {{recorded: number, slots: number, analyzed: number, rising: number, profiles: object[]}} Display-safe summaries.
 */
export function analyzeLearningInsights(scores, catalog) {
  fail(Array.isArray(scores) && scores.length <= 56);
  fail(
    Array.isArray(catalog?.subjects) &&
      catalog.subjects.length === 8 &&
      Array.isArray(catalog.scoreColumns) &&
      catalog.scoreColumns.length === 7,
  );
  const subjectCodes = new Set(catalog.subjects.map((item) => item.code));
  const columns = new Set(catalog.scoreColumns.map((item) => item.code));
  fail(subjectCodes.size === 8 && columns.size === 7);
  const txColumns = [1, 2, 3, 4].map((n) =>
    catalog.scoreColumns.find((column) => column.displayName === `Thường xuyên ${n}`),
  );
  fail(txColumns.every(Boolean) && new Set(txColumns.map((item) => item.code)).size === 4);

  const byCoordinate = new Map();
  for (const entry of scores) {
    fail(
      entry !== null &&
        typeof entry === 'object' &&
        Object.keys(entry).length === 3 &&
        ['subjectCode', 'columnCode', 'rawScore'].every((key) => Object.hasOwn(entry, key)) &&
        subjectCodes.has(entry.subjectCode) &&
        columns.has(entry.columnCode),
    );
    const key = `${entry.subjectCode}:${entry.columnCode}`;
    fail(!byCoordinate.has(key));
    // Validation is intentionally shared with Gradebook B1; absent and exact zero differ.
    const value = Number(normalizeScore(entry.rawScore));
    byCoordinate.set(key, value);
  }

  const profiles = catalog.subjects.map((subject) => {
    const points = txColumns.flatMap((column, index) => {
      const value = byCoordinate.get(`${subject.code}:${column.code}`);
      return value === undefined ? [] : [{ index, value }];
    });
    const slope = points.length >= 3 ? robustScoreSlope(points) : null;
    const trend =
      slope === null ? 'insufficient' : slope >= 0.25 ? 'rising' : slope <= -0.25 ? 'falling' : 'steady';
    return {
      subjectCode: subject.code,
      name: subject.displayName,
      samples: points.length,
      median: points.length ? median(points.map((point) => point.value)) : null,
      trend,
    };
  });
  return {
    recorded: byCoordinate.size,
    slots: catalog.subjects.length * catalog.scoreColumns.length,
    analyzed: profiles.filter((profile) => profile.trend !== 'insufficient').length,
    rising: profiles.filter((profile) => profile.trend === 'rising').length,
    profiles,
  };
}
