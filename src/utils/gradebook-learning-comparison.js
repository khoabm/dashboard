/** Computes one bounded, non-ranking class comparison from existing aggregate histogram DTOs. */
import { normalizeScore } from './gradebook/decimal.js';
import { allowFields, requireContract } from './gradebook/contracts.js';
import { histogram } from './student-gradeboard.js';

const check = (value) => requireContract(value, 'learning-comparison');
const weights = new Map([
  ['Thường xuyên 1', 1],
  ['Thường xuyên 2', 1],
  ['Thường xuyên 3', 1],
  ['Thường xuyên 4', 1],
  ['1 tiết', 2],
  ['Giữa kì', 2],
  ['Cuối kì', 3],
]);
const key = (subject, column) => JSON.stringify([subject, column]);
const units = (raw) => {
  const [whole, fraction = ''] = normalizeScore(raw).split('.');
  return Number(whole) * 100000 + Number(fraction.padEnd(5, '0'));
};
const oneDecimal = (number) => (Math.round((number + Number.EPSILON) * 10) / 10).toFixed(1);

/**
 * Selects only the current student's recorded scores in a subject, with user-approved weights.
 * Missing cells are excluded from both numerator and denominator; exact zero remains a score.
 *
 * @param {Array<object>} scores - Validated own semester score DTOs.
 * @param {object} catalog - Verified Gradebook presentation catalog.
 * @param {string} subjectCode - Selected subject from that catalog.
 * @returns {{subjectCode:string, columns:object[], weightSum:number, ownAverage:number|null, ownLabel:string}} Plan capped at seven columns.
 */
export function weightedComparisonPlan(scores, catalog, subjectCode) {
  check(
    Array.isArray(scores) &&
      scores.length <= 56 &&
      Array.isArray(catalog?.subjects) &&
      catalog.subjects.length === 8 &&
      Array.isArray(catalog?.scoreColumns) &&
      catalog.scoreColumns.length === 7 &&
      catalog.subjects.some((subject) => subject.code === subjectCode) &&
      new Set(catalog.scoreColumns.map((column) => column.code)).size === 7 &&
      new Set(catalog.scoreColumns.map((column) => column.displayName)).size === 7 &&
      catalog.scoreColumns.every((column) => weights.has(column.displayName)),
  );
  const seen = new Set();
  const byKey = new Map();
  for (const row of scores) {
    allowFields(
      row,
      ['subjectCode', 'columnCode', 'rawScore'],
      ['subjectCode', 'columnCode', 'rawScore'],
    );
    check(
      catalog.subjects.some((subject) => subject.code === row.subjectCode) &&
        catalog.scoreColumns.some((column) => column.code === row.columnCode),
    );
    const coordinate = key(row.subjectCode, row.columnCode);
    check(!seen.has(coordinate));
    seen.add(coordinate);
    byKey.set(coordinate, units(row.rawScore));
  }
  const columns = catalog.scoreColumns.flatMap((column) => {
    const value = byKey.get(key(subjectCode, column.code));
    return value === undefined
      ? []
      : [
          {
            columnCode: column.code,
            weight: weights.get(column.displayName),
            ownUnits: value,
          },
        ];
  });
  const weightSum = columns.reduce((total, column) => total + column.weight, 0);
  const ownAverage = weightSum
    ? columns.reduce((total, column) => total + column.weight * column.ownUnits, 0) /
      (weightSum * 100000)
    : null;
  return {
    subjectCode,
    columns,
    weightSum,
    ownAverage,
    ownLabel: ownAverage === null ? '—' : oneDecimal(ownAverage),
  };
}

/**
 * Combines precisely one validated 101-bucket histogram per planned score column.
 * Per-column class means are weighted by the same grade coefficients; this is not
 * the class distribution of individual weighted means when learners miss different cells.
 *
 * @param {ReturnType<typeof weightedComparisonPlan>} plan - Complete personal column plan.
 * @param {object[]} responses - Aggregate-only responses in the same order as plan.columns.
 * @param {number} semester - Authorized semester 1 or 2.
 * @returns {object} Either suppressed/absent or a bounded non-ranking comparison.
 */
export function compareWeightedClass(plan, responses, semester) {
  check(
    [1, 2].includes(semester) &&
      plan &&
      typeof plan.subjectCode === 'string' &&
      Array.isArray(plan.columns) &&
      plan.columns.length <= 7 &&
      Array.isArray(responses) &&
      responses.length === plan.columns.length &&
      Number.isInteger(plan.weightSum) &&
      plan.weightSum >= 0 &&
      plan.weightSum <= 11 &&
      (plan.ownAverage === null ||
        (Number.isFinite(plan.ownAverage) && plan.ownAverage >= 0 && plan.ownAverage <= 10)),
  );
  if (!plan.columns.length) return { status: 'no-scores' };

  let weightedSum = 0;
  const counts = [];
  for (let i = 0; i < plan.columns.length; i++) {
    const column = plan.columns[i];
    check(
      column &&
        typeof column.columnCode === 'string' &&
        [1, 2, 3].includes(column.weight) &&
        Number.isInteger(column.ownUnits) &&
        column.ownUnits >= 0 &&
        column.ownUnits <= 1000000,
    );
    const buckets = histogram(responses[i], {
      semester,
      subjectCode: plan.subjectCode,
      columnCode: column.columnCode,
    });
    const count = buckets.reduce((total, bucket) => total + bucket.studentCount, 0);
    // Never publish a tiny cohort comparison; do not try to infer hidden identities.
    if (!Number.isSafeInteger(count) || count > 10000) throw Error('Invalid aggregate size');
    if (count < 10) return { status: 'insufficient-class' };
    counts.push(count);
    const bucketSum = buckets.reduce((total, bucket, index) => {
      return total + (index * bucket.studentCount) / 10;
    }, 0);
    weightedSum += (column.weight * bucketSum) / count;
  }
  const classAverage = weightedSum / plan.weightSum;
  const difference = plan.ownAverage - classAverage;
  const relation = difference > 0.3 ? 'above' : difference < -0.3 ? 'below' : 'similar';
  return {
    status: 'ready',
    ownLabel: plan.ownLabel,
    classLabel: oneDecimal(classAverage),
    usedColumns: plan.columns.length,
    totalColumns: 7,
    minCount: Math.min(...counts),
    maxCount: Math.max(...counts),
    incomplete: plan.columns.length !== 7 || Math.min(...counts) !== Math.max(...counts),
    relation,
  };
}

/**
 * Explains a result without suggesting ranks, percentiles or personal shortcomings.
 * @param {ReturnType<typeof compareWeightedClass>} result - Bounded comparison.
 * @returns {string} Natural-language descriptive and non-ranking feedback.
 */
export function weightedClassFeedback(result) {
  check(result && ['ready', 'no-scores', 'insufficient-class'].includes(result.status));
  if (result.status === 'no-scores')
    return 'Môn này chưa có điểm để tính trung bình tham khảo. Bạn có thể xem lại khi có thêm điểm.';
  if (result.status === 'insufficient-class')
    return 'Chưa có đủ dữ liệu tổng hợp của lớp để so sánh một cách phù hợp.';
  check(
    [result.usedColumns, result.minCount, result.maxCount].every(Number.isSafeInteger) &&
      result.usedColumns >= 1 &&
      result.usedColumns <= 7 &&
      result.minCount >= 10 &&
      result.maxCount <= 10000 &&
      ['above', 'below', 'similar'].includes(result.relation),
  );
  const text = {
    above:
      'Điểm trung bình tham khảo của bạn đang cao hơn mặt bằng ước tính của lớp trên các cột đã đối chiếu. Hãy tiếp tục phát huy những cách học hiệu quả.',
    below:
      'Điểm trung bình tham khảo của bạn đang thấp hơn mặt bằng ước tính của lớp trên các cột đã đối chiếu. Bạn có thể thử ôn lại từng dạng bài và trao đổi với giáo viên khi cần.',
    similar:
      'Điểm trung bình tham khảo của bạn đang khá gần mặt bằng ước tính của lớp trên các cột đã đối chiếu. Hãy tiếp tục học đều và chú ý những phần còn vướng.',
  };
  return text[result.relation];
}

/**
 * Owns one opt-in, bounded class-comparison operation and reports observable progress.
 * Its injected read uses the existing verified Gradebook capability; no retries/prefetch.
 * Cancellation suppresses late results even when a transport ignores AbortSignal.
 *
 * @param {Function} read - Existing student read(body, { signal }) adapter.
 * @param {Function} changed - Receives loading/progress, result, or safe terminal state.
 * @returns {{run: Function, cancel: Function, dispose: Function}} Single-operation owner.
 */
export function createWeightedComparisonRead(read, changed) {
  check(typeof read === 'function' && typeof changed === 'function');
  let generation = 0;
  let controller = null;
  let disposed = false;
  const cancel = () => {
    generation++;
    controller?.abort();
    controller = null;
  };
  return {
    cancel,
    dispose() {
      cancel();
      disposed = true;
    },
    async run(plan, semester) {
      if (disposed) return;
      cancel();
      const ticket = generation;
      if (!plan?.columns?.length) {
        check(plan && Array.isArray(plan.columns) && plan.columns.length === 0);
        changed({ status: 'no-scores' });
        return;
      }
      check(
        [1, 2].includes(semester) &&
          Array.isArray(plan.columns) &&
          plan.columns.length <= 7 &&
          typeof plan.subjectCode === 'string',
      );
      controller = new AbortController();
      const signal = controller.signal;
      const current = () => !disposed && ticket === generation && !signal.aborted;
      const total = plan.columns.length;
      changed({ status: 'loading', completed: 0, total });
      const responses = [];
      try {
        for (const column of plan.columns) {
          const selection = {
            semester,
            subjectCode: plan.subjectCode,
            columnCode: column.columnCode,
          };
          const value = await read({ op: 'histogram', ...selection }, { signal });
          if (!current()) return;
          // Reject invalid scope or private peer rows before issuing another request.
          const buckets = histogram(value, selection);
          const count = buckets.reduce((sum, bucket) => sum + bucket.studentCount, 0);
          if (!Number.isSafeInteger(count) || count > 10000)
            throw Error('Invalid aggregate size');
          if (count < 10) {
            changed({ status: 'insufficient-class' });
            return;
          }
          responses.push(value);
          changed({ status: 'loading', completed: responses.length, total });
        }
        const result = compareWeightedClass(plan, responses, semester);
        if (current()) changed({ status: result.status, result });
      } catch (error) {
        if (!current()) return;
        changed({
          status:
            error?.status === 401
              ? 'expired'
              : error?.status === 403
                ? 'denied'
                : error?.status === 429
                  ? 'limited'
                  : 'unavailable',
        });
      } finally {
        if (ticket === generation) controller = null;
      }
    },
  };
}
