/** Commits limiter decisions before pair/grade reads; publication stays a B3 transaction check. */
import { allowFields, documentNumber, birthDate, semester, code, bigintId, requireContract } from './contracts.js';
import { catalogDtos, classDto, checked, scoreDtos, histogramDto } from './dto.js';
import { lookupContext } from './admin.js';
import { Failure } from './http.js';

/** Verify pair syntax is deliberately charged globally even when invalid. */
export function validateStudent(body) {
  const specs = { verify: ['documentNumber', 'birthDate'], grades: ['semester'], histogram: ['semester', 'subjectCode', 'columnCode'] };
  requireContract(body && typeof body.op === 'string' && Object.hasOwn(specs, body.op), 'operation');
  allowFields(body, ['op', ...specs[body.op]], body.op === 'verify' ? ['op'] : ['op', ...specs[body.op]]);
  if (body.op !== 'verify') semester(body.semester);
  if (body.op === 'histogram') { code(body.subjectCode); code(body.columnCode); }
}

/** A completed limiter RPC is its own transaction, even if subsequent verification fails. */
export async function charge(backend, reading, identityLookup = null) {
  const decision = await backend.rpc('gb_limit', { reading, identity_lookup: identityLookup }, true);
  checked(() => requireContract(typeof decision?.allowed === 'boolean' && Number.isInteger(decision.retryAfter) && decision.retryAfter >= 0 && decision.retryAfter <= 900, 'limiter'));
  if (!decision.allowed) throw new Failure(429, 'limited', null, Math.max(1, decision.retryAfter));
}

/** Capabilities supply every identity/epoch selector; JSON supplies selection only. */
export async function executeStudent(body, request, context) {
  const { backend, cryptography, today, now, checkpoint } = context;
  if (body.op === 'verify') {
    let valid = true;
    try { documentNumber(body.documentNumber); birthDate(body.birthDate, today); } catch { valid = false; }
    if (!valid) {
      await charge(backend, false);
      throw new Failure(400, 'request');
    }
    const active = await lookupContext(backend);
    if (!active) { await charge(backend, false); throw new Failure(401, 'verification'); }
    const lookup = await cryptography.lookup(active.classId, active.lookupKeyVersion, body.documentNumber);
    checkpoint();
    await charge(backend, false, lookup);
    const pair = await backend.rpc('gb_pair_check', { cid: active.classId, lookup, birth_date: body.birthDate, key_version: active.lookupKeyVersion }, true);
    if (!pair) throw new Failure(401, 'verification');
    checked(() => {
      requireContract(pair.classId === active.classId && pair.class?.id === active.classId, 'backend');
      bigintId(pair.studentId); bigintId(pair.classEpoch); bigintId(pair.studentEpoch);
    });
    const issued = await cryptography.issueCapability({ classId: pair.classId, studentId: pair.studentId, classEpoch: pair.classEpoch, studentEpoch: pair.studentEpoch }, now());
    return { payload: { capability: issued.token, expiresAt: issued.expiresAt, class: classDto(pair.class, true), ...catalogDtos(active) }, status: 200 };
  }
  const claims = await cryptography.capability(request.headers.get('x-gradebook-capability'), now());
  checkpoint();
  await charge(backend, true);
  const args = { cid: claims.classId, sid: claims.studentId, class_epoch: claims.classEpoch, student_epoch: claims.studentEpoch, semester: body.semester };
  if (body.op === 'grades') {
    const result = await backend.rpc('gb_student_grades', args, true);
    return { payload: { semester: body.semester, scores: scoreDtos(result) }, status: 200 };
  }
  const result = await backend.rpc('gb_histogram', { ...args, subject: body.subjectCode, col: body.columnCode }, true);
  return { payload: { semester: body.semester, subjectCode: body.subjectCode, columnCode: body.columnCode, grouping: 'display_tenth_half_up', buckets: histogramDto(result) }, status: 200 };
}
