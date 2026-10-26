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

/** Maps safe categories, never backend diagnostic text or personal values. */
export function adminMessage(error) {
  if (error?.status === 409)
    return 'Dữ liệu hoặc bản xem trước đã thay đổi. Hãy tải lại trước khi xác nhận.';
  if (error?.status === 401 || error?.status === 403)
    return 'Phiên quản trị chưa được xác minh hoặc đã hết hạn.';
  if (error?.status === 422)
    return 'Không thể thực hiện. Kiểm tra thông tin; học sinh có điểm cần được ngừng sử dụng thay vì xóa.';
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
        const result = await Promise.race([request(body, { signal }), stopped]);
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
export function createRosterPreview(clock = Date.now) {
  let batch = null,
    preview = null,
    classId = null,
    version = 0;
  return {
    clear() {
      batch = null;
      preview = null;
      classId = null;
      version++;
    },
    set(value, owner) {
      batch = structuredClone({ headers: value.headers, rows: value.rows });
      preview = null;
      classId = owner;
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
    apply(owner) {
      if (!batch || !preview || classId !== owner || preview.expiresAt * 1000 <= clock()) {
        preview = null;
        throw new AdminError(409, 'preview');
      }
      return {
        op: 'roster.apply',
        classId: owner,
        headers: batch.headers,
        rows: batch.rows,
        previewToken: preview.previewToken,
      };
    },
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
