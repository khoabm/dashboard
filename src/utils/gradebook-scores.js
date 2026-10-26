/** Defines CP04 catalog, decimal, positional import and teacher mutation contracts without transport. */
import { bigintId, documentNumber, requireContract } from './gradebook/contracts.js';
import { birthDate, uiDate, vietnamToday } from './gradebook/dates.js';
import { normalizeScore, compareScores } from './gradebook/decimal.js';
import { studentRecord } from './gradebook-admin.js';

export const SCORE_HEADERS = Object.freeze([
  'CMND/CCCD',
  'Ngày sinh',
  'Môn',
  'Thường xuyên 1',
  'Thường xuyên 2',
  'Thường xuyên 3',
  'Thường xuyên 4',
  '1 tiết',
  'Giữa kì',
  'Cuối kì',
]);

/** Mirrors B4 selector grammar without importing server modules into the frontend graph. */
function code(value) {
  requireContract(typeof value === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(value), 'code');
  return value;
}

/** Uses the server catalog's codes/order; no teacher endpoint or parallel production catalog is invented. */
export function teacherCatalog(value) {
  const project = (rows, length) => {
    requireContract(Array.isArray(rows) && rows.length === length, 'catalog');
    const codes = new Set(),
      orders = new Set(),
      names = new Set();
    return rows
      .map((row) => {
        const id = code(row.code);
        requireContract(
          row.active === true &&
            Number.isSafeInteger(row.sortOrder) &&
            row.sortOrder > 0 &&
            typeof row.displayName === 'string' &&
            row.displayName.length <= 100 &&
            row.displayName.isWellFormed() &&
            !row.displayName.includes('\0') &&
            row.displayName.trim() === row.displayName &&
            row.displayName !== '' &&
            !codes.has(id) &&
            !orders.has(row.sortOrder) &&
            !names.has(row.displayName),
          'catalog',
        );
        codes.add(id);
        orders.add(row.sortOrder);
        names.add(row.displayName);
        return { code: id, displayName: row.displayName, sortOrder: row.sortOrder, active: true };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };
  return { subjects: project(value?.subjects, 8), scoreColumns: project(value?.scoreColumns, 7) };
}

/** Projects one bounded joined page; concurrent roster changes require reload instead of mismatched names/scores. */
export function teacherPage(roster, grades, classId, catalog) {
  requireContract(
    Array.isArray(roster?.students) &&
      roster.students.length <= 20 &&
      Array.isArray(grades?.students) &&
      grades.students.length === roster.students.length,
    'page',
  );
  const seen = new Set();
  const students = roster.students.map((entry, i) => {
    const student = studentRecord(entry, classId),
      row = grades.students[i];
    requireContract(
      !seen.has(student.id) &&
        row.studentId === student.id &&
        Array.isArray(row.scores) &&
        row.scores.length <= 56,
      'page',
    );
    seen.add(student.id);
    const cells = new Map();
    for (const score of row.scores) {
      requireContract(
        catalog.subjects.some((s) => s.code === score.subjectCode) &&
          catalog.scoreColumns.some((c) => c.code === score.columnCode),
        'catalog',
      );
      const key = `${score.subjectCode}|${score.columnCode}`;
      requireContract(!cells.has(key), 'coordinate');
      cells.set(key, {
        rawScore: normalizeScore(score.rawScore),
        revision: bigintId(score.revision),
      });
    }
    return { ...student, cells };
  });
  requireContract(roster.nextCursor === grades.nextCursor, 'page');
  if (grades.nextCursor !== null) bigintId(grades.nextCursor);
  return { students, nextCursor: grades.nextCursor };
}

/** Keeps absent cells last; all nonblank comparisons use B1 exact raw decimal semantics. */
export function compareScoreCells(a, b, descending = false) {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  return compareScores(a.rawScore, b.rawScore) * (descending ? -1 : 1);
}

/** Builds an exact coordinate mutation, including null expected absence and explicit publication acknowledgement. */
export function scoreMutation({
  classroom,
  student,
  semester,
  subjectCode,
  columnCode,
  existing,
  score,
  deleting = false,
  confirmed = false,
  acknowledged = false,
}) {
  requireContract([1, 2].includes(semester), 'semester');
  const published = classroom[`semester${semester}Published`];
  requireContract(
    typeof published === 'boolean' && (!published || acknowledged === true),
    'acknowledgement',
  );
  if (deleting) requireContract(!!existing && confirmed === true, 'confirmation');
  return {
    op: deleting ? 'score.delete' : 'score.put',
    classId: classroom.id,
    studentId: bigintId(student.id),
    semester,
    subjectCode: code(subjectCode),
    columnCode: code(columnCode),
    expectedRevision: existing ? bigintId(existing.revision) : null,
    ...(deleting ? { confirmed: true } : { score: normalizeScore(score) }),
    ...(published ? { acknowledged: true } : {}),
  };
}

/** Changes only the selected semester; the server owns missing-count and class revision checks. */
export function publicationMutation(
  classroom,
  semester,
  publishing,
  confirmed,
  acknowledgeMissing = false,
) {
  requireContract(
    [1, 2].includes(semester) && confirmed === true && typeof publishing === 'boolean',
    'confirmation',
  );
  return {
    op: publishing ? 'semester.publish' : 'semester.unpublish',
    classId: classroom.id,
    semester,
    expectedRevision: bigintId(classroom.revision),
    confirmed: true,
    ...(publishing ? { acknowledgeMissing: acknowledgeMissing === true } : {}),
  };
}

/** Retains XML decimal text verbatim; suspicious binary tails/exponents/sixth places are rejected, never rounded. */
export function excelScore(value) {
  return normalizeScore(value?.kind === 'excel-number' ? value.value : value);
}

/** Maps A–J without header-derived keys, preserving original coordinates and nonblank duplicate slots. */
export function scoreBatch(records, catalogs, today = vietnamToday()) {
  const catalog = teacherCatalog(catalogs),
    headers = records[0]?.cells;
  requireContract(
    Array.isArray(headers) &&
      headers.length === 10 &&
      headers.every(
        (v) => typeof v === 'string' && v.length <= 4096 && v.isWellFormed() && !v.includes('\0'),
      ),
    'columns',
  );
  const rows = [],
    errors = [],
    seen = new Set();
  let count = 0,
    skippedBlank = 0,
    previous = 1;
  for (const record of records.slice(1)) {
    if (record.cells.every((v) => v === '' || v === null)) continue;
    requireContract(
      ++count <= 2000 && Number.isSafeInteger(record.row) && record.row > previous,
      'rows',
    );
    previous = record.row;
    const row = record.row;
    if (record.cells.length !== 10) {
      errors.push({ row, column: Math.min(record.cells.length + 1, 11), code: 'columns' });
      continue;
    }
    const cells = record.cells;
    let document,
      date,
      valid = true;
    const read = (column, work) => {
      try {
        return work();
      } catch {
        errors.push({ row, column, code: 'invalid' });
        valid = false;
      }
    };
    document = read(1, () => documentNumber(cells[0]));
    date = read(2, () =>
      birthDate(cells[1]?.kind === 'date' ? cells[1].value : uiDate(cells[1]), today),
    );
    read(3, () =>
      requireContract(
        catalog.subjects.some((s) => s.displayName === cells[2]),
        'subject',
      ),
    );
    const scores = cells.slice(3).map((value, i) => {
      if (value === '' || value === null) {
        skippedBlank++;
        return null;
      }
      return read(i + 4, () => {
        const score = excelScore(value);
        const key = `${document}|${cells[2]}|${i}`;
        requireContract(!seen.has(key), 'duplicate_coordinate');
        if (document) seen.add(key);
        return score;
      });
    });
    if (valid)
      rows.push({ row, documentNumber: document, birthDate: date, subjectName: cells[2], scores });
  }
  requireContract(count > 0, 'empty');
  return { headers: [...headers], rows, errors, count, width: 10, skippedBlank };
}
