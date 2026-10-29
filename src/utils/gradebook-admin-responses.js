/** Validates teacher envelopes before private data reaches component state. */
import { allowFields, bigintId, documentNumber, requireContract } from './gradebook/contracts.js';
import { apiDate } from './gradebook/dates.js';
import { normalizeScore } from './gradebook/decimal.js';
import { studentRecord } from './gradebook-admin.js';
import { teacherCatalog, SCORE_HEADERS } from './gradebook-scores.js';
import { envelope } from './gradebook-responses.js';

export const adminFields = {
  'catalog.read': ['classId'],
  'class.read': ['classId'],
  'class.create': ['name', 'schoolYear'],
  'class.patch': ['classId', 'expectedRevision', 'name', 'schoolYear'],
  'students.list': ['classId', 'cursor', 'limit'],
  'student.read': ['classId', 'studentId'],
  'student.reveal': ['classId', 'studentId'],
  'student.create': ['classId', 'documentNumber', 'birthDate', 'fullName'],
  'student.patch': [
    'classId',
    'studentId',
    'expectedRevision',
    'documentNumber',
    'birthDate',
    'fullName',
    'confirmed',
  ],
  'student.deactivate': ['classId', 'studentId', 'expectedRevision', 'confirmed'],
  'student.reactivate': ['classId', 'studentId', 'expectedRevision', 'confirmed'],
  'student.delete': ['classId', 'studentId', 'expectedRevision', 'confirmed'],
  'scores.read': ['classId', 'semester', 'studentId', 'cursor', 'limit'],
  'score.put': [
    'classId',
    'studentId',
    'semester',
    'subjectCode',
    'columnCode',
    'expectedRevision',
    'score',
    'acknowledged',
  ],
  'score.delete': [
    'classId',
    'studentId',
    'semester',
    'subjectCode',
    'columnCode',
    'expectedRevision',
    'confirmed',
    'acknowledged',
  ],
  'semester.publish': [
    'classId',
    'semester',
    'expectedRevision',
    'confirmed',
    'acknowledgeMissing',
  ],
  'semester.unpublish': ['classId', 'semester', 'expectedRevision', 'confirmed'],
  'roster.preview': ['classId', 'headers', 'rows'],
  'roster.apply': ['classId', 'headers', 'rows', 'previewToken'],
  'scores.preview': ['classId', 'semester', 'headers', 'rows'],
  'scores.apply': ['classId', 'semester', 'headers', 'rows', 'previewToken'],
  'scores.batch.preview': ['classId', 'semester', 'changes'],
  'scores.batch.apply': ['classId', 'semester', 'changes', 'previewToken'],
};

/** Rejects credential selectors and unsafe numeric coercion; B4 owns business preconditions. */
export function adminRequest(body) {
  requireContract(Object.hasOwn(adminFields, body?.op), 'operation');
  allowFields(body, ['op', ...adminFields[body.op]], ['op']);
  if ('classId' in body) uuid(body.classId);
  for (const key of ['studentId', 'cursor', 'expectedRevision'])
    if (
      key in body &&
      !(key === 'expectedRevision' && body[key] === null && body.op.startsWith('score.'))
    )
      bigintId(body[key]);
  if ('score' in body) normalizeScore(body.score);
  return structuredClone(body);
}

/** Validates scope syntax without deriving authorization from it. */
function uuid(value) {
  requireContract(
    typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
    'uuid',
  );
  return value;
}

/** Validates metadata without retaining extra server fields. */
function text(value, max) {
  requireContract(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= max &&
      value.trim() === value &&
      value.isWellFormed() &&
      !value.includes('\0'),
    'response',
  );
  return value;
}

/** Projects class metadata independently of score relationships. */
function classroom(value, id) {
  if (value === null) {
    requireContract(!id, 'response');
    return null;
  }
  const fields = [
    'id',
    'revision',
    'name',
    'schoolYear',
    'semester1Published',
    'semester2Published',
  ];
  allowFields(value, fields, fields);
  requireContract(
    (!id || value.id === id) &&
      typeof value.semester1Published === 'boolean' &&
      typeof value.semester2Published === 'boolean',
    'response',
  );
  return {
    ...value,
    id: uuid(value.id),
    revision: bigintId(value.revision),
    name: text(value.name, 100),
    schoolYear: text(value.schoolYear, 32),
  };
}

/** Ordinary student DTOs reject reveal and crypto fields. */
function student(value, body) {
  const fields = ['id', 'classId', 'fullName', 'birthDate', 'active', 'revision'];
  allowFields(value, fields, fields);
  if (body.studentId) requireContract(value.id === body.studentId, 'response');
  apiDate(value.birthDate);
  if (value.fullName !== null) text(value.fullName, 200);
  return studentRecord(value, body.classId);
}

/** Validates provisional counts and safe physical error positions. */
function imported(payload, applying) {
  const fields = applying
    ? ['counts', 'errors', 'committed']
    : ['counts', 'errors', 'previewToken', 'expiresAt'];
  envelope(payload, fields);
  const keys = ['insert', 'update', 'unchanged', 'error', 'skippedBlank'];
  allowFields(payload.counts, keys, keys);
  for (const key of keys)
    requireContract(
      Number.isSafeInteger(payload.counts[key]) &&
        payload.counts[key] >= 0 &&
        payload.counts[key] <= 14000,
      'preview',
    );
  requireContract(Array.isArray(payload.errors) && payload.errors.length <= 2000, 'preview');
  const errors = payload.errors.map((row) => {
    allowFields(row, ['row', 'column', 'code'], ['row', 'column', 'code']);
    requireContract(
      Number.isSafeInteger(row.row) &&
        row.row >= 2 &&
        Number.isInteger(row.column) &&
        row.column >= 1 &&
        row.column <= 10 &&
        row.code === 'invalid',
      'preview',
    );
    return { ...row };
  });
  if (applying)
    requireContract(
      payload.committed === true && payload.counts.error === 0 && !errors.length,
      'preview',
    );
  else if (payload.counts.error)
    requireContract(payload.previewToken === null && payload.expiresAt === null, 'preview');
  else
    requireContract(
      typeof payload.previewToken === 'string' &&
        /^[!-~]{1,4096}$/.test(payload.previewToken) &&
        Number.isSafeInteger(payload.expiresAt) &&
        payload.expiresAt * 1000 > Date.now() &&
        payload.expiresAt * 1000 <= Date.now() + 600000,
      'preview',
    );
  return {
    counts: { ...payload.counts },
    errors,
    ...(applying
      ? { committed: true }
      : { previewToken: payload.previewToken, expiresAt: payload.expiresAt }),
  };
}

/** Returns the operation DTO and drops the validated request correlation ID. */
export function adminPayload(body, payload) {
  const op = body.op;
  if (op === 'catalog.read') {
    envelope(payload, ['subjects', 'scoreColumns']);
    for (const rows of [payload.subjects, payload.scoreColumns]) {
      requireContract(Array.isArray(rows), 'catalog');
      for (const row of rows)
        allowFields(
          row,
          ['code', 'displayName', 'sortOrder', 'active'],
          ['code', 'displayName', 'sortOrder', 'active'],
        );
    }
    const result = teacherCatalog(payload);
    for (const [rows, names] of [
      [result.subjects, ['Toán', 'Văn', 'Anh', 'KHTN', 'LS / ĐL', 'Công Nghệ', 'Tin Học', 'GDCD']],
      [result.scoreColumns, SCORE_HEADERS.slice(3)],
    ])
      requireContract(
        rows.every((row, i) => row.sortOrder === i + 1 && row.displayName === names[i]),
        'catalog',
      );
    return result;
  }
  if (op.startsWith('class.') || op.startsWith('semester.')) {
    envelope(payload, ['class']);
    requireContract(payload.class !== null || op === 'class.read', 'response');
    return { class: classroom(payload.class, body.classId) };
  }
  if (op.endsWith('.preview') || op.endsWith('.apply'))
    return imported(payload, op.endsWith('.apply'));
  if (op === 'student.reveal') {
    envelope(payload, ['documentNumber']);
    return { documentNumber: documentNumber(payload.documentNumber) };
  }
  if (op === 'score.put') {
    envelope(payload, ['changed']);
    requireContract(typeof payload.changed === 'boolean', 'response');
    return { changed: payload.changed };
  }
  if (op.endsWith('.delete')) {
    envelope(payload, ['deleted']);
    requireContract(payload.deleted === true, 'response');
    return { deleted: true };
  }
  if (op === 'students.list' || op === 'scores.read') {
    envelope(payload, ['students', 'nextCursor']);
    requireContract(
      Array.isArray(payload.students) &&
        payload.students.length <= (body.limit || (body.studentId ? 1 : 100)),
      'page',
    );
    const seen = new Set();
    const students = payload.students.map((row) => {
      if (op === 'students.list') return student(row, body);
      allowFields(row, ['studentId', 'scores'], ['studentId', 'scores']);
      const id = bigintId(row.studentId);
      requireContract(!body.studentId || id === body.studentId, 'response');
      requireContract(Array.isArray(row.scores) && row.scores.length <= 56, 'page');
      const coordinates = new Set();
      const scores = row.scores.map((score) => {
        const fields = ['subjectCode', 'columnCode', 'rawScore', 'revision'];
        allowFields(score, fields, fields);
        for (const key of ['subjectCode', 'columnCode'])
          requireContract(
            typeof score[key] === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(score[key]),
            'code',
          );
        const coordinate = score.subjectCode + '|' + score.columnCode;
        requireContract(!coordinates.has(coordinate), 'coordinate');
        coordinates.add(coordinate);
        return {
          ...score,
          rawScore: normalizeScore(score.rawScore),
          revision: bigintId(score.revision),
        };
      });
      return { studentId: id, scores };
    });
    for (const row of students) {
      const id = row.id || row.studentId;
      requireContract(!seen.has(id), 'page');
      seen.add(id);
    }
    return {
      students,
      nextCursor: payload.nextCursor === null ? null : bigintId(payload.nextCursor),
    };
  }
  envelope(payload, ['student']);
  return { student: student(payload.student, body) };
}
