/** Defines CP03 request/error boundaries and cancellable, memory-only administrator work. */
import { importedName } from './gradebook/imports.js';
import { documentNumber, bigintId, requireContract } from './gradebook/contracts.js';
import { apiDate, uiDate, birthDate, vietnamToday } from './gradebook/dates.js';

export class AdminError extends Error {
  constructor(status = 503, code = 'unavailable') {
    super(code);
    this.status = status;
    this.code = code;
  }
}

/** Projects a structured 422 preview only; diagnostics, identities, state hashes and tokens are discarded. */
export function previewErrors(payload) {
  const counts = {};
  for (const key of ['insert', 'update', 'unchanged', 'error', 'skippedBlank']) {
    const n = payload?.counts?.[key];
    requireContract(Number.isSafeInteger(n) && n >= 0 && n <= 14000, 'preview');
    counts[key] = n;
  }
  requireContract(
    counts.error > 0 && Array.isArray(payload.errors) && payload.errors.length <= 2000,
    'preview',
  );
  const errors = payload.errors.map((error) => {
    requireContract(
      Number.isSafeInteger(error.row) &&
        error.row >= 2 &&
        Number.isInteger(error.column) &&
        error.column >= 1 &&
        error.column <= 10,
      'preview',
    );
    return { row: error.row, column: error.column, code: 'invalid' };
  });
  return { counts, errors, previewToken: null, expiresAt: null };
}

/** Maps safe categories, never backend diagnostic text or personal values. */
export function adminMessage(error) {
  if (error?.status === 409)
    return 'Dữ liệu hoặc bản xem trước đã thay đổi. Hãy tải lại trước khi xác nhận.';
  if (error?.status === 401 || error?.status === 403)
    return 'Phiên quản trị chưa được xác minh hoặc đã hết hạn.';
  if (error?.status === 422)
    return 'Không thể thực hiện. Kiểm tra dữ liệu và điều kiện thao tác; hãy tải lại nếu dữ liệu đã thay đổi.';
  if (error?.status === 429)
    return 'Vui lòng dừng và thử lại sau; hệ thống không tự gửi lại yêu cầu.';
  if (error?.name === 'AbortError')
    return 'Đã dừng chờ kết quả. Tải lại dữ liệu trước khi thử lại thao tác ghi.';
  return 'Chưa thể hoàn tất thao tác. Hãy tải lại dữ liệu trước khi thử lại; hệ thống không tự gửi lại yêu cầu.';
}

/** Builds only changed metadata fields; school year never changes student/score relationships. */
export function classInput(values, current) {
  const result = { op: current ? 'class.patch' : 'class.create' };
  if (current)
    Object.assign(result, { classId: current.id, expectedRevision: bigintId(current.revision) });
  for (const [key, max] of [
    ['name', 100],
    ['schoolYear', 32],
  ]) {
    const value = values[key]?.trim();
    requireContract(
      typeof value === 'string' &&
        value.isWellFormed() &&
        !value.includes('\0') &&
        Array.from(value).length > 0 &&
        Array.from(value).length <= max,
      'class',
    );
    if (!current || value !== current[key]) result[key] = value;
  }
  requireContract(!current || 'name' in result || 'schoolYear' in result, 'unchanged');
  return result;
}

/** Keeps identity corrections separate and confirmed; IDs/revisions remain authoritative strings. */
export function studentInput(
  values,
  classId,
  current,
  correctIdentity = false,
  today = vietnamToday(),
) {
  const result = { op: current ? 'student.patch' : 'student.create', classId };
  if (current)
    Object.assign(result, {
      studentId: bigintId(current.id),
      expectedRevision: bigintId(current.revision),
    });
  const name = importedName(values.fullName, true);
  const fullName = name.state === 'value' ? name.value : null;
  if (!current) {
    result.documentNumber = documentNumber(values.documentNumber);
    result.birthDate = birthDate(uiDate(values.birthDate), today);
    if (fullName) result.fullName = fullName;
  } else {
    if (fullName !== current.fullName) {
      result.fullName = fullName;
      if (fullName === null) result.confirmed = true;
    }
    if (correctIdentity) {
      if (values.documentNumber) result.documentNumber = documentNumber(values.documentNumber);
      const dob = birthDate(uiDate(values.birthDate), today);
      if (dob !== current.birthDate) result.birthDate = dob;
      result.confirmed = true;
    }
    requireContract(
      ['fullName', 'documentNumber', 'birthDate'].some((k) => Object.hasOwn(result, k)),
      'unchanged',
    );
  }
  return result;
}

/** Allows one operation, aborts on session/route changes and rejects late responses before exposure. */
export function createAdminGate(request, session, deadline = 15000) {
  let generation = 0,
    controller = null;
  const cancel = () => {
    generation++;
    controller?.abort();
    controller = null;
  };
  return {
    cancel,
    async call(body) {
      if (session().status !== 'admin') throw new AdminError(403, 'forbidden');
      if (controller) throw new AdminError(409, 'busy');
      const owner = session().generation,
        ticket = generation;
      controller = new AbortController();
      const active = controller;
      const signal = controller.signal;
      let timer;
      try {
        const stopped = new Promise((_, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Cancelled', 'AbortError')),
            { once: true },
          );
          timer = setTimeout(() => active.abort(), deadline);
        });
        const response = Promise.resolve(request(body, { signal })).catch((error) => {
          if (
            error?.status === 422 &&
            ['roster.preview', 'scores.preview', 'scores.batch.preview'].includes(body.op) &&
            error.payload?.counts
          )
            return previewErrors(error.payload);
          throw error;
        });
        const result = await Promise.race([response, stopped]);
        if (
          signal.aborted ||
          ticket !== generation ||
          session().status !== 'admin' ||
          session().generation !== owner
        )
          throw new DOMException('Cancelled', 'AbortError');
        return result;
      } finally {
        clearTimeout(timer);
        if (ticket === generation) controller = null;
      }
    },
  };
}

/** Owns a preview's exact in-memory input/expiry; any change makes confirmation unusable. */
export function createRosterPreview(clock = Date.now, kind = 'roster') {
  let batch = null,
    preview = null,
    classId = null,
    version = 0,
    semester = null;
  return {
    clear() {
      batch = null;
      preview = null;
      classId = null;
      semester = null;
      version++;
    },
    set(value, owner, selectedSemester = null) {
      requireContract(
        kind === 'roster' || (kind === 'scores' && [1, 2].includes(selectedSemester)),
        'semester',
      );
      batch = structuredClone({ headers: value.headers, rows: value.rows });
      preview = null;
      classId = owner;
      semester = selectedSemester;
      return ++version;
    },
    ticket: () => version,
    accept(value, ticket) {
      if (
        ticket !== version ||
        !batch ||
        value.counts?.error ||
        typeof value.previewToken !== 'string' ||
        !value.previewToken ||
        value.previewToken.length > 4096 ||
        !Number.isSafeInteger(value.expiresAt) ||
        value.expiresAt * 1000 <= clock()
      )
        return false;
      preview = { previewToken: value.previewToken, expiresAt: value.expiresAt };
      return true;
    },
    apply(owner, selectedSemester = null) {
      if (
        !batch ||
        !preview ||
        classId !== owner ||
        semester !== selectedSemester ||
        preview.expiresAt * 1000 <= clock()
      ) {
        preview = null;
        throw new AdminError(409, 'preview');
      }
      return {
        op: `${kind}.apply`,
        classId: owner,
        ...(kind === 'scores' ? { semester } : {}),
        headers: batch.headers,
        rows: batch.rows,
        previewToken: preview.previewToken,
      };
    },
  };
}

/** Binds a bulk clear to one student and a verified snapshot, never an inferred browser score count. */
export function studentScoresClearAction(student, classId, fingerprint, acknowledged = false) {
  requireContract(
    typeof fingerprint === 'string' && /^[0-9a-f]{64}$/.test(fingerprint),
    'fingerprint',
  );
  return {
    op: 'student.scores.clear',
    classId,
    studentId: bigintId(student.id),
    expectedRevision: bigintId(student.revision),
    expectedFingerprint: fingerprint,
    confirmed: true,
    acknowledged: acknowledged === true,
  };
}

/** Projects ordinary DTOs so crypto/identity fields cannot accidentally enter a list or form cache. */
export function studentRecord(value, classId) {
  requireContract(value?.classId === classId && typeof value.active === 'boolean', 'response');
  const name = value.fullName === null ? null : importedName(value.fullName, true).value;
  return {
    id: bigintId(value.id),
    classId,
    revision: bigintId(value.revision),
    fullName: name || null,
    birthDate: apiDate(value.birthDate),
    active: value.active,
  };
}

/** Requires explicit confirmation, preserving the server's safe-delete and revision authority. */
export function studentAction(student, classId, kind, confirmed) {
  requireContract(
    ['deactivate', 'reactivate', 'delete'].includes(kind) && confirmed === true,
    'confirmation',
  );
  return {
    op: `student.${kind}`,
    classId,
    studentId: bigintId(student.id),
    expectedRevision: bigintId(student.revision),
    confirmed: true,
  };
}
