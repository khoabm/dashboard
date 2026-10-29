/** Computes explainable session-only learning trends from validated, published own scores. */
import { normalizeScore, displayScore } from './gradebook/decimal.js';
import { allowFields, requireContract } from './gradebook/contracts.js';

const check = (condition) => requireContract(condition, 'insights');
const middle = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const scoreUnits = (raw) => {
  const [integer, fraction = ''] = normalizeScore(raw).split('.');
  return Number(integer) * 100000 + Number(fraction.padEnd(5, '0'));
};
const labelUnits = (units) => {
  const rounded = Math.floor((units + 5000) / 10000);
  return `${Math.floor(rounded / 10)}.${rounded % 10}`;
};
const coordinate = (subject, column) => JSON.stringify([subject, column]);

/**
 * Estimates the median pairwise change per assessment slot (Theil–Sen).
 * Slots are ordered labels, not verified dates; the result is descriptive, never predictive.
 *
 * @param {{index: number, value: number}[]} points - 3–4 ascending, unique TX1–TX4 observations.
 * @returns {number} Score change per slot.
 */
export function robustScoreSlope(points) {
  check(
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
  return middle(slopes);
}

/**
 * Produces only personal, bounded per-subject summaries from the existing own-grades response.
 * Never reads class distributions, identifiers, unpublished semesters or remote services.
 *
 * @param {Array<{subjectCode: string, columnCode: string, rawScore: string}>} scores - Validated own grades.
 * @param {{subjects: object[], scoreColumns: object[]}} catalog - Server-verified ordered catalog.
 * @returns {object} Statistics, four-point trend profiles and three independent assessment slots.
 */
export function analyzeLearningInsights(scores, catalog) {
  check(Array.isArray(scores) && scores.length <= 56);
  check(
    Array.isArray(catalog?.subjects) &&
      catalog.subjects.length === 8 &&
      Array.isArray(catalog?.scoreColumns) &&
      catalog.scoreColumns.length === 7,
  );
  const subjectCodes = new Set(catalog.subjects.map((s) => s.code));
  const columnCodes = new Set(catalog.scoreColumns.map((c) => c.code));
  check(subjectCodes.size === 8 && columnCodes.size === 7);
  const continuous = [1, 2, 3, 4].map((n) =>
    catalog.scoreColumns.find((column) => column.displayName === `Thường xuyên ${n}`),
  );
  const other = ['1 tiết', 'Giữa kì', 'Cuối kì'].map((name) =>
    catalog.scoreColumns.find((column) => column.displayName === name),
  );
  check(
    [...continuous, ...other].every(Boolean) &&
      new Set([...continuous, ...other].map((column) => column.code)).size === 7,
  );
  const values = new Map();
  for (const entry of scores) {
    allowFields(entry, ['subjectCode', 'columnCode', 'rawScore'], [
      'subjectCode',
      'columnCode',
      'rawScore',
    ]);
    check(subjectCodes.has(entry.subjectCode) && columnCodes.has(entry.columnCode));
    const key = coordinate(entry.subjectCode, entry.columnCode);
    check(!values.has(key));
    const units = scoreUnits(entry.rawScore);
    values.set(key, units);
  }
  const profiles = catalog.subjects.map((subject) => {
    const points = continuous.map((column, index) => {
      const units = values.get(coordinate(subject.code, column.code));
      return {
        index,
        label: column.displayName,
        value: units === undefined ? null : units / 100000,
        display: units === undefined ? '—' : labelUnits(units),
      };
    });
    const observed = points.filter((point) => point.value !== null);
    const units = continuous
      .map((column) => values.get(coordinate(subject.code, column.code)))
      .filter((value) => value !== undefined);
    const slope = observed.length >= 3 ? robustScoreSlope(observed) : null;
    const trend =
      slope === null
        ? 'insufficient'
        : slope >= 0.25
          ? 'rising'
          : slope <= -0.25
            ? 'falling'
            : 'steady';
    return {
      subjectCode: subject.code,
      name: subject.displayName,
      samples: observed.length,
      median: units.length ? middle(units) / 100000 : null,
      medianLabel: units.length ? labelUnits(middle(units)) : '—',
      trend,
      points,
      assessments: other.map((column) => {
        const value = values.get(coordinate(subject.code, column.code));
        return {
          label: column.displayName,
          display: value === undefined ? '—' : labelUnits(value),
        };
      }),
    };
  });
  return {
    recorded: values.size,
    slots: 56,
    analyzed: profiles.filter((profile) => profile.trend !== 'insufficient').length,
    rising: profiles.filter((profile) => profile.trend === 'rising').length,
    falling: profiles.filter((profile) => profile.trend === 'falling').length,
    profiles,
  };
}

/**
 * Builds a bounded, non-evaluative observation; it never suggests grades or predicts outcomes.
 *
 * @param {ReturnType<typeof analyzeLearningInsights>} summary - Previously validated analysis.
 * @returns {string} One Vietnamese descriptive sentence.
 */
export function learningInsightRemark(summary) {
  check(
    summary &&
      Number.isInteger(summary.analyzed) &&
      summary.analyzed >= 0 &&
      summary.analyzed <= 8 &&
      Number.isInteger(summary.rising) &&
      Number.isInteger(summary.falling) &&
      summary.rising >= 0 &&
      summary.falling >= 0 &&
      summary.rising + summary.falling <= summary.analyzed,
  );
  if (!summary.analyzed)
    return 'Chưa có môn học nào đủ ba điểm Thường xuyên để mô tả xu hướng trong học kỳ này.';
  const stable = summary.analyzed - summary.rising - summary.falling;
  return `Trong ${summary.analyzed} môn đủ dữ liệu, có ${summary.rising} môn tăng, ${summary.falling} môn giảm và ${stable} môn ổn định theo thứ tự các lần điểm Thường xuyên.`;
}
