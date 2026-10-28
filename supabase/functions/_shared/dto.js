/** Explicit response projections: raw SQL JSON never becomes an HTTP payload. */
import {
  allowFields,
  bigintId,
  uuid,
  apiDate,
  normalizeScore,
  code,
  text,
  requireContract,
} from './contracts.js';
import { Failure } from './http.js';

/** Backend shape failures are unavailable, not validation errors attributable to the browser. */
export function checked(project) {
  try {
    return project();
  } catch {
    throw new Failure(503, 'unavailable');
  }
}
function bool(value) {
  requireContract(typeof value === 'boolean', 'backend');
  return value;
}
function count(value) {
  requireContract(Number.isSafeInteger(value) && value >= 0, 'backend');
  return value;
}

/** Class DTO has no crypto/key/epoch material. Public lookup omits internal class ID/revision. */
export function classDto(value, publicView = false) {
  return checked(() => {
    const result = {
      name: text(value.name, 100),
      schoolYear: text(value.schoolYear, 32),
      semester1Published: bool(value.semester1Published),
      semester2Published: bool(value.semester2Published),
    };
    return publicView
      ? result
      : { id: uuid(value.id), revision: bigintId(value.revision), ...result };
  });
}

/** Only approved admin student fields leave ordinary read/list/create/patch operations. */
export function studentDto(value) {
  return checked(() => ({
    id: bigintId(value.id),
    classId: uuid(value.classId),
    fullName: value.fullName === null ? null : text(value.fullName, 200),
    birthDate: apiDate(value.birthDate),
    active: bool(value.active),
    revision: bigintId(value.revision),
  }));
}

/** Own/admin score rows retain authoritative strings without Number conversion. */
export function scoreDtos(value, revisions = false) {
  return checked(() => {
    requireContract(Array.isArray(value) && value.length <= 56, 'backend');
    return value.map((row) => ({
      subjectCode: code(row.subjectCode),
      columnCode: code(row.columnCode),
      rawScore: normalizeScore(row.rawScore),
      ...(revisions ? { revision: bigintId(row.revision) } : {}),
    }));
  });
}

// V1 response invariants only; all returned rows/codes still come from the authoritative RPC.
const v1Labels = {
  subjects: ['Toán', 'Văn', 'Anh', 'KHTN', 'LS / ĐL', 'Công Nghệ', 'Tin Học', 'GDCD'],
  scoreColumns: [
    'Thường xuyên 1',
    'Thường xuyên 2',
    'Thường xuyên 3',
    'Thường xuyên 4',
    '1 tiết',
    'Giữa kì',
    'Cuối kì',
  ],
};

/** Projects catalogs; teacher-only strict V1 mode does not change existing student/internal callers. */
export function catalogDtos(context, { v1 = false } = {}) {
  return checked(() => {
    const project = (rows) => {
      requireContract(Array.isArray(rows) && rows.length >= 1 && rows.length <= 32, 'backend');
      const seen = new Set();
      return rows
        .map((row) => {
          const id = code(row.code);
          requireContract(!seen.has(id), 'backend');
          seen.add(id);
          requireContract(Number.isSafeInteger(row.sortOrder) && row.sortOrder > 0, 'backend');
          return {
            code: id,
            displayName: text(row.displayName, 100),
            sortOrder: row.sortOrder,
            active: bool(row.active),
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);
    };
    const result = {
      subjects: project(context.subjects),
      scoreColumns: project(context.scoreColumns),
    };
    if (v1) {
      for (const [field, labels] of Object.entries(v1Labels)) {
        requireContract(result[field].length === labels.length, 'catalog');
        for (const row of context[field]) {
          allowFields(
            row,
            ['code', 'displayName', 'sortOrder', 'active'],
            ['code', 'displayName', 'sortOrder', 'active'],
          );
          requireContract(row.displayName === row.displayName.trim(), 'catalog');
        }
        result[field].forEach((row, index) =>
          requireContract(
            row.active && row.sortOrder === index + 1 && row.displayName === labels[index],
            'catalog',
          ),
        );
      }
    }
    return result;
  });
}

/** Preview/apply responses never include writes, internalStateHash or DB envelopes. */
export function importDto(value, applying = false) {
  return checked(() => {
    const counts = Object.fromEntries(
      ['insert', 'update', 'unchanged', 'error', 'skippedBlank'].map((key) => [
        key,
        count(value.counts[key]),
      ]),
    );
    requireContract(Array.isArray(value.errors) && value.errors.length <= 2000, 'backend');
    const errors = value.errors.map((error) => {
      requireContract(
        Number.isSafeInteger(error.row) &&
          error.row >= 2 &&
          Number.isInteger(error.column) &&
          error.column >= 1 &&
          error.column <= 10 &&
          error.code === 'invalid',
        'backend',
      );
      return { row: error.row, column: error.column, code: 'invalid' };
    });
    if (applying) requireContract(value.committed === true && counts.error === 0, 'backend');
    return { counts, errors, ...(applying ? { committed: true } : {}) };
  });
}

/** Histogram output contains 101 ordered aggregate buckets and no peer rows. */
export function histogramDto(value) {
  return checked(() => {
    requireContract(Array.isArray(value) && value.length === 101, 'backend');
    return value.map((row, index) => {
      const expected = `${Math.floor(index / 10)}.${index % 10}`;
      requireContract(row.scoreBucket === expected, 'backend');
      return { scoreBucket: expected, studentCount: count(row.studentCount) };
    });
  });
}
