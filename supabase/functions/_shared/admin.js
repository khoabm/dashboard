/** Explicit teacher operations bound to verified actor/session and actual B3 argument names. */
import {
  allowFields,
  bigintId,
  birthDate,
  documentNumber,
  importedName,
  normalizeScore,
  uuid,
  semester,
  code,
  text,
  requireContract,
} from './contracts.js';
import { classDto, studentDto, scoreDtos, catalogDtos, importDto, checked } from './dto.js';
import { normalizeImport, protectedRows } from './imports.js';
import { Failure } from './http.js';

const specs = {
  'catalog.read': [['classId'], ['classId']],
  'class.read': [['classId'], []],
  'class.create': [
    ['name', 'schoolYear'],
    ['name', 'schoolYear'],
  ],
  'class.patch': [
    ['classId', 'expectedRevision', 'name', 'schoolYear'],
    ['classId', 'expectedRevision'],
  ],
  'students.list': [['classId', 'cursor', 'limit'], ['classId']],
  'student.read': [
    ['classId', 'studentId'],
    ['classId', 'studentId'],
  ],
  'student.reveal': [
    ['classId', 'studentId'],
    ['classId', 'studentId'],
  ],
  'student.create': [
    ['classId', 'documentNumber', 'birthDate', 'fullName'],
    ['classId', 'documentNumber', 'birthDate'],
  ],
  'student.patch': [
    [
      'classId',
      'studentId',
      'expectedRevision',
      'documentNumber',
      'birthDate',
      'fullName',
      'confirmed',
    ],
    ['classId', 'studentId', 'expectedRevision'],
  ],
  'student.deactivate': [
    ['classId', 'studentId', 'expectedRevision', 'confirmed'],
    ['classId', 'studentId', 'expectedRevision', 'confirmed'],
  ],
  'student.reactivate': [
    ['classId', 'studentId', 'expectedRevision', 'confirmed'],
    ['classId', 'studentId', 'expectedRevision', 'confirmed'],
  ],
  'student.delete': [
    ['classId', 'studentId', 'expectedRevision', 'confirmed'],
    ['classId', 'studentId', 'expectedRevision', 'confirmed'],
  ],
  'scores.read': [
    ['classId', 'semester', 'studentId', 'cursor', 'limit'],
    ['classId', 'semester'],
  ],
  'score.put': [
    [
      'classId',
      'studentId',
      'semester',
      'subjectCode',
      'columnCode',
      'expectedRevision',
      'score',
      'acknowledged',
    ],
    ['classId', 'studentId', 'semester', 'subjectCode', 'columnCode', 'expectedRevision', 'score'],
  ],
  'score.delete': [
    [
      'classId',
      'studentId',
      'semester',
      'subjectCode',
      'columnCode',
      'expectedRevision',
      'confirmed',
      'acknowledged',
    ],
    [
      'classId',
      'studentId',
      'semester',
      'subjectCode',
      'columnCode',
      'expectedRevision',
      'confirmed',
    ],
  ],
  'semester.publish': [
    ['classId', 'semester', 'expectedRevision', 'confirmed', 'acknowledgeMissing'],
    ['classId', 'semester', 'expectedRevision', 'confirmed'],
  ],
  'semester.unpublish': [
    ['classId', 'semester', 'expectedRevision', 'confirmed'],
    ['classId', 'semester', 'expectedRevision', 'confirmed'],
  ],
  'roster.preview': [
    ['classId', 'headers', 'rows'],
    ['classId', 'headers', 'rows'],
  ],
  'roster.apply': [
    ['classId', 'headers', 'rows', 'previewToken'],
    ['classId', 'headers', 'rows', 'previewToken'],
  ],
  'scores.preview': [
    ['classId', 'semester', 'headers', 'rows'],
    ['classId', 'semester', 'headers', 'rows'],
  ],
  'scores.apply': [
    ['classId', 'semester', 'headers', 'rows', 'previewToken'],
    ['classId', 'semester', 'headers', 'rows', 'previewToken'],
  ],
};

/** Unknown fields, including client actor/session/crypto, fail before privileged access. */
export function validateAdmin(body, today) {
  requireContract(
    body && typeof body.op === 'string' && Object.hasOwn(specs, body.op),
    'operation',
  );
  const [allowed, required] = specs[body.op];
  allowFields(body, ['op', ...allowed], ['op', ...required]);
  if (Object.hasOwn(body, 'classId')) uuid(body.classId);
  if (Object.hasOwn(body, 'studentId')) bigintId(body.studentId);
  if (Object.hasOwn(body, 'cursor')) bigintId(body.cursor);
  if (Object.hasOwn(body, 'limit'))
    requireContract(Number.isInteger(body.limit) && body.limit >= 1 && body.limit <= 200, 'limit');
  if (
    Object.hasOwn(body, 'expectedRevision') &&
    !(body.expectedRevision === null && body.op.startsWith('score.'))
  )
    bigintId(body.expectedRevision);
  if (Object.hasOwn(body, 'semester')) semester(body.semester);
  if (Object.hasOwn(body, 'subjectCode')) code(body.subjectCode);
  if (Object.hasOwn(body, 'columnCode')) code(body.columnCode);
  if (Object.hasOwn(body, 'documentNumber')) documentNumber(body.documentNumber);
  if (Object.hasOwn(body, 'birthDate')) birthDate(body.birthDate, today);
  if (Object.hasOwn(body, 'score')) normalizeScore(body.score);
  if (Object.hasOwn(body, 'name')) text(body.name, 100);
  if (Object.hasOwn(body, 'schoolYear')) text(body.schoolYear, 32);
  for (const field of ['confirmed', 'acknowledged', 'acknowledgeMissing'])
    if (Object.hasOwn(body, field))
      requireContract(typeof body[field] === 'boolean', 'confirmation');
  if (
    [
      'student.deactivate',
      'student.reactivate',
      'student.delete',
      'score.delete',
      'semester.publish',
      'semester.unpublish',
    ].includes(body.op)
  )
    requireContract(body.confirmed === true, 'confirmation');
  if (Object.hasOwn(body, 'fullName')) {
    const name = body.fullName === null ? { state: 'blank' } : importedName(body.fullName, true);
    requireContract(body.op !== 'student.create' || body.fullName !== null, 'name');
    if (body.op === 'student.patch' && name.state === 'blank')
      requireContract(body.confirmed === true, 'confirmation');
  }
  if (body.op === 'student.patch')
    requireContract(
      ['fullName', 'documentNumber', 'birthDate'].some((field) => Object.hasOwn(body, field)),
      'fields',
    );
  if (body.op === 'class.patch')
    requireContract(Object.hasOwn(body, 'name') || Object.hasOwn(body, 'schoolYear'), 'fields');
  if (body.op === 'scores.read' && body.studentId)
    requireContract(!Object.hasOwn(body, 'cursor') && !Object.hasOwn(body, 'limit'), 'pagination');
  if (Object.hasOwn(body, 'previewToken'))
    requireContract(
      typeof body.previewToken === 'string' && body.previewToken.length <= 4096,
      'preview',
    );
}

/** Non-sensitive context is still checked against the authorized request's class. */
export async function lookupContext(backend, cid = null) {
  const value = await backend.rpc('gb_lookup_context', {});
  if (!value) return null;
  checked(() => {
    uuid(value.classId);
    requireContract(
      Number.isInteger(value.lookupKeyVersion) &&
        value.lookupKeyVersion > 0 &&
        value.lookupKeyVersion <= 2147483647,
      'context',
    );
  });
  if (cid && value.classId !== cid) throw new Failure(403, 'forbidden');
  catalogDtos(value);
  return value;
}

/** Every write is one named B3 mutation; import apply uses only one batch mutation. */
export async function executeAdmin(body, identity, context) {
  const { backend, cryptography, today, now, checkpoint } = context;
  const auth = { actor: identity.actor, session: identity.session };
  const base = { ...auth, cid: body.classId };
  const student = { ...base, sid: body.studentId };
  const ok = (payload, status = 200) => ({ payload, status });
  const call = (name, args) => backend.rpc(name, args);
  const activeContext = async () => {
    const active = await lookupContext(backend, body.classId);
    if (!active) throw new Failure(403, 'forbidden');
    return active;
  };

  switch (body.op) {
    case 'catalog.read': {
      // Service-role lookup alone is not authorization: retain B3's class lock/session recheck first.
      const current = classDto(await call('gb_class_read', base));
      if (current.id !== body.classId) throw new Failure(403, 'forbidden');
      const active = await activeContext();
      checkpoint();
      return ok(catalogDtos(active, { v1: true }));
    }
    case 'class.create':
      return ok({
        class: classDto(
          await call('gb_class_create', {
            ...auth,
            name: body.name.trim(),
            school_year: body.schoolYear.trim(),
          }),
        ),
      });
    case 'class.read': {
      const cid = body.classId || (await lookupContext(backend))?.classId;
      return ok({ class: cid ? classDto(await call('gb_class_read', { ...auth, cid })) : null });
    }
    case 'class.patch': {
      const current = classDto(await call('gb_class_read', base));
      return ok({
        class: classDto(
          await call('gb_class_patch', {
            ...base,
            expected: body.expectedRevision,
            name: body.name?.trim() ?? current.name,
            school_year: body.schoolYear?.trim() ?? current.schoolYear,
          }),
        ),
      });
    }
    case 'students.list': {
      const page = await call('gb_students_list', {
        ...base,
        after_id: body.cursor || '0',
        page_size: body.limit || 100,
      });
      const students = checked(() => {
        requireContract(Array.isArray(page) && page.length <= (body.limit || 100), 'backend');
        return page.map(studentDto);
      });
      return ok({
        students,
        nextCursor: students.length === (body.limit || 100) ? students.at(-1).id : null,
      });
    }
    case 'student.read':
      return ok({
        student: studentDto(await call('gb_student_read', { ...student, reveal: false })),
      });
    case 'student.reveal': {
      const envelope = await call('gb_student_read', { ...student, reveal: true });
      if (envelope?.id !== body.studentId) throw new Failure(503, 'identity_unavailable');
      const document = await cryptography.reveal(envelope, body.classId);
      checkpoint();
      // Deliberately no spread of envelope or ordinary SQL DTO into the reveal response.
      return ok({ documentNumber: document });
    }
    case 'student.create':
    case 'student.patch': {
      const value = {};
      if (Object.hasOwn(body, 'documentNumber')) {
        const active = await activeContext();
        Object.assign(
          value,
          await cryptography.encryptIdentity(
            body.classId,
            active.lookupKeyVersion,
            body.documentNumber,
          ),
        );
      }
      if (Object.hasOwn(body, 'birthDate')) value.birthDate = body.birthDate;
      if (Object.hasOwn(body, 'fullName')) {
        const name =
          body.fullName === null ? { state: 'blank' } : importedName(body.fullName, true);
        value.fullName =
          name.state === 'value' ? name.value : body.op === 'student.patch' ? null : '';
      }
      checkpoint();
      const result =
        body.op === 'student.create'
          ? await call('gb_student_create', { ...base, value })
          : await call('gb_student_patch', { ...student, expected: body.expectedRevision, value });
      return ok({ student: studentDto(result) });
    }
    case 'student.deactivate':
    case 'student.reactivate':
      return ok({
        student: studentDto(
          await call('gb_student_status', {
            ...student,
            expected: body.expectedRevision,
            active: body.op === 'student.reactivate',
            confirmed: true,
          }),
        ),
      });
    case 'student.delete':
      await call('gb_student_delete', {
        ...student,
        expected: body.expectedRevision,
        confirmed: true,
      });
      return ok({ deleted: true });
    case 'score.put':
    case 'score.delete': {
      const args = {
        ...student,
        semester: body.semester,
        subject: body.subjectCode,
        col: body.columnCode,
        expected: body.expectedRevision,
        acknowledged: body.acknowledged === true,
      };
      if (body.op === 'score.delete') {
        await call('gb_score_delete', { ...args, confirmed: true });
        return ok({ deleted: true });
      }
      const result = await call('gb_score_put', { ...args, value: normalizeScore(body.score) });
      return ok(
        checked(() => {
          requireContract(typeof result?.changed === 'boolean', 'backend');
          return { changed: result.changed };
        }),
      );
    }
    case 'scores.read': {
      const limit = body.studentId ? 1 : body.limit || 100;
      const after = body.studentId ? (BigInt(body.studentId) - 1n).toString() : body.cursor || '0';
      const page = await call('gb_scores_read', {
        ...base,
        semester: body.semester,
        after_id: after,
        page_size: limit,
      });
      const students = checked(() => {
        requireContract(Array.isArray(page) && page.length <= limit, 'backend');
        return page.map((row) => ({
          studentId: bigintId(row.studentId),
          scores: scoreDtos(row.scores, true),
        }));
      });
      if (body.studentId && students[0]?.studentId !== body.studentId)
        throw new Failure(422, 'invalid');
      return ok({
        students,
        nextCursor: !body.studentId && students.length === limit ? students.at(-1).studentId : null,
      });
    }
    case 'semester.publish':
    case 'semester.unpublish':
      return ok({
        class: classDto(
          await call('gb_semester_set', {
            ...base,
            semester: body.semester,
            published: body.op === 'semester.publish',
            expected: body.expectedRevision,
            confirmed: true,
            acknowledge_missing: body.acknowledgeMissing === true,
          }),
        ),
      });
    default: {
      const kind = body.op.startsWith('roster.') ? 'roster' : 'scores';
      const applying = body.op.endsWith('.apply');
      const active = await activeContext();
      const batch = normalizeImport(body, kind, today, catalogDtos(active));
      const binding = {
        ...auth,
        classId: body.classId,
        kind,
        semester: kind === 'scores' ? body.semester : null,
      };
      const token = applying
        ? await cryptography.preview(body.previewToken, binding, batch.canonical, now())
        : null;
      const rows = await protectedRows(batch, kind, active, cryptography, checkpoint);
      const args = {
        ...base,
        headers: batch.headers,
        rows,
        ...(kind === 'scores' ? { semester: body.semester } : {}),
      };
      let plan;
      try {
        plan = await call(kind === 'roster' ? 'gb_roster_preview' : 'gb_scores_preview', args);
      } catch (error) {
        if (applying && error.classification === '22023')
          throw new Failure(409, 'preview_conflict');
        throw error;
      }
      const projected = importDto(plan);
      if (!applying) {
        const signed =
          projected.counts.error === 0
            ? await cryptography.issuePreview(
                binding,
                batch.canonical,
                plan.internalStateHash,
                now(),
              )
            : null;
        return ok(
          {
            ...projected,
            previewToken: signed?.token ?? null,
            expiresAt: signed?.expiresAt ?? null,
          },
          projected.counts.error ? 422 : 200,
        );
      }
      if (
        projected.counts.error !== 0 ||
        !/^[0-9a-f]{64}$/.test(plan.internalStateHash) ||
        !(await cryptography.stateMatches(
          token.kid,
          binding,
          plan.internalStateHash,
          token.stateDigest,
        ))
      )
        throw new Failure(409, 'preview_conflict');
      checkpoint();
      let applied;
      try {
        applied = await call(kind === 'roster' ? 'gb_roster_apply' : 'gb_scores_apply', {
          ...args,
          expected: plan.internalStateHash,
        });
      } catch (error) {
        // A publication/validation change after preflight is still a stale preview, never a retry.
        if (error.classification === '22023') throw new Failure(409, 'preview_conflict');
        throw error;
      }
      return ok(importDto(applied, true));
    }
  }
}
