/** Pure B4 decoded-body projections; no HTTP, SDK, storage, token verification or production transport. */
import { allowFields, requireContract } from './gradebook/contracts.js';
import { SCORE_HEADERS } from './gradebook-scores.js';
import { studentContext, ownGrades, histogram } from './student-gradeboard.js';

const subjectNames = ['Toán', 'Văn', 'Anh', 'KHTN', 'LS / ĐL', 'Công Nghệ', 'Tin Học', 'GDCD'];
const catalogFields = ['code', 'displayName', 'sortOrder', 'active'];

/** Requires the current V1 presentation catalog; codes remain server-owned, never derived from labels. */
function contextPayload(payload) {
  const classFields = ['name', 'schoolYear', 'semester1Published', 'semester2Published'];
  allowFields(payload.class, classFields, classFields);
  for (const [field, length] of [
    ['subjects', 8],
    ['scoreColumns', 7],
  ]) {
    requireContract(Array.isArray(payload[field]) && payload[field].length === length, 'response');
    for (const row of payload[field]) allowFields(row, catalogFields, catalogFields);
  }
  const context = studentContext({
    class: payload.class,
    subjects: payload.subjects,
    scoreColumns: payload.scoreColumns,
  });
  for (const [rows, names] of [
    [context.subjects, subjectNames],
    [context.scoreColumns, SCORE_HEADERS.slice(3)],
  ])
    requireContract(
      rows.every((row, index) => row.displayName === names[index]),
      'catalog',
    );
  return context;
}

/** B4 adds only requestId to every body. Drop that correlation field, rejecting other envelope drift. */
export function envelope(payload, fields) {
  allowFields(payload, [...fields, 'requestId'], [...fields, 'requestId']);
  requireContract(
    typeof payload.requestId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.requestId,
      ),
    'response',
  );
}

/** Keeps the opaque capability only in the returned internal adapter result, never in a UI snapshot. */
export function verificationPayload(payload, clock = Date.now) {
  envelope(payload, ['capability', 'expiresAt', 'class', 'subjects', 'scoreColumns']);
  const now = clock();
  requireContract(
    Number.isSafeInteger(now) &&
      typeof payload.capability === 'string' &&
      /^[!-~]{1,8192}$/.test(payload.capability) &&
      Number.isSafeInteger(payload.expiresAt) &&
      Number.isSafeInteger(payload.expiresAt * 1000) &&
      payload.expiresAt * 1000 > now &&
      payload.expiresAt * 1000 <= now + 720000,
    'verification',
  );
  const context = contextPayload(payload);
  return {
    kind: 'verified',
    capability: payload.capability,
    // Allow at most two minutes of clock skew, without extending local retention.
    expiresAt: Math.min(payload.expiresAt, Math.floor(now / 1000) + 600),
    context,
  };
}

/** Checks selection and decoded success DTO only; current publication/identity authorization stays server-side. */
export function studentReadPayload(body, payload, context) {
  allowFields(
    context,
    ['class', 'subjects', 'scoreColumns'],
    ['class', 'subjects', 'scoreColumns'],
  );
  const catalog = contextPayload(context);
  requireContract([1, 2].includes(body?.semester), 'semester');
  if (body.op === 'grades') {
    allowFields(body, ['op', 'semester'], ['op', 'semester']);
    envelope(payload, ['semester', 'scores']);
    return {
      semester: body.semester,
      scores: ownGrades(
        { semester: payload.semester, scores: payload.scores },
        body.semester,
        catalog,
      ),
    };
  }
  allowFields(
    body,
    ['op', 'semester', 'subjectCode', 'columnCode'],
    ['op', 'semester', 'subjectCode', 'columnCode'],
  );
  requireContract(
    body.op === 'histogram' &&
      catalog.subjects.some((row) => row.code === body.subjectCode) &&
      catalog.scoreColumns.some((row) => row.code === body.columnCode),
    'selection',
  );
  const fields = ['semester', 'subjectCode', 'columnCode', 'grouping', 'buckets'];
  envelope(payload, fields);
  const value = Object.fromEntries(fields.map((key) => [key, payload[key]]));
  return { ...value, buckets: histogram(value, body) };
}

/** Verify deliberately does not distinguish unknown, mismatched or inactive identities. No retry advice. */
export function verificationFailure(status) {
  return { kind: status === 401 ? 'neutral' : status === 429 ? 'limited' : 'unavailable' };
}

/** Retains terminal HTTP categories for the existing read/admin ownership logic, without diagnostics. */
export function studentReadFailure(status) {
  const safe = [400, 401, 403, 409, 413, 415, 422, 429, 503].includes(status) ? status : 503;
  return Object.assign(new Error('Student request unavailable'), { status: safe });
}
