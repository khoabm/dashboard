/** Projects only own scores and aggregate distributions; all authoritative decimals remain strings. */
import { teacherCatalog } from './gradebook-scores.js';
import { normalizeScore, displayScore } from './gradebook/decimal.js';

const requireValue = (ok) => {
  if (!ok) throw Error('Invalid student response');
};
const exact = (value, fields) =>
  requireValue(
    value && typeof value === 'object' && Object.keys(value).every((key) => fields.includes(key)),
  );
export const studentCatalog = teacherCatalog;
export const bucketFor = (value) => (value === null ? null : displayScore(value));

/** Rejects unexpected peer fields, duplicate coordinates and mismatched semester responses. */
export function ownGrades(value, semester, catalog) {
  exact(value, ['semester', 'scores']);
  requireValue(
    value.semester === semester && Array.isArray(value.scores) && value.scores.length <= 56,
  );
  const seen = new Set();
  return value.scores.map((row) => {
    exact(row, ['subjectCode', 'columnCode', 'rawScore']);
    requireValue(
      catalog.subjects.some((s) => s.code === row.subjectCode) &&
        catalog.scoreColumns.some((c) => c.code === row.columnCode),
    );
    const key = row.subjectCode + ':' + row.columnCode;
    requireValue(!seen.has(key));
    seen.add(key);
    return {
      subjectCode: row.subjectCode,
      columnCode: row.columnCode,
      rawScore: normalizeScore(row.rawScore),
    };
  });
}

/** Accepts exactly 101 ordered aggregate-only buckets, never a list of peer scores. */
export function histogram(value, selection) {
  exact(value, ['semester', 'subjectCode', 'columnCode', 'grouping', 'buckets']);
  requireValue(
    value.semester === selection.semester &&
      value.subjectCode === selection.subjectCode &&
      value.columnCode === selection.columnCode &&
      value.grouping === 'display_tenth_half_up' &&
      Array.isArray(value.buckets) &&
      value.buckets.length === 101,
  );
  return value.buckets.map((row, index) => {
    exact(row, ['scoreBucket', 'studentCount']);
    const scoreBucket = `${Math.floor(index / 10)}.${index % 10}`;
    requireValue(
      row.scoreBucket === scoreBucket &&
        Number.isSafeInteger(row.studentCount) &&
        row.studentCount >= 0,
    );
    return { scoreBucket, studentCount: row.studentCount };
  });
}

/** Owns one finite read channel; cancellation invalidates results even if transport ignores AbortSignal. */
export function createStudentRead(read, changed) {
  let generation = 0,
    controller,
    disposed = false;
  const cancel = () => {
    generation++;
    controller?.abort();
  };
  return {
    cancel,
    dispose() {
      cancel();
      disposed = true;
    },
    async run(body, project) {
      if (disposed) return;
      cancel();
      const ticket = generation;
      controller = new AbortController();
      changed({ status: 'loading' });
      try {
        const value = await read(body, { signal: controller.signal });
        if (disposed || ticket !== generation) return;
        changed({ status: 'ready', value: project(value) });
      } catch (error) {
        if (disposed || ticket !== generation) return;
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
      }
    },
  };
}
