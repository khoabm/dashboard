/** Finite B4 regressions: real Web Crypto/SDK, synthetic identities and network-denying mocks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createCipheriv } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { createCrypto, encode64, decode64, decodeJson } from '../supabase/functions/_shared/crypto.js';
import { createHandler } from '../supabase/functions/_shared/handler.js';
import { backendFactory } from '../supabase/functions/_shared/backend.js';
import { Failure, rpcFailure, bodyJson } from '../supabase/functions/_shared/http.js';
import { runtimeConfig } from '../supabase/functions/_shared/runtime.js';
import { frameTuple } from '../src/utils/gradebook/canonical.js';

globalThis.fetch = async () => { throw Error('Live network forbidden in B4 tests'); };
const project = 'syntheticprojectref01';
const cid = '30000000-0000-4000-8000-000000000001';
const actor = '10000000-0000-4000-8000-000000000001';
const session = '20000000-0000-4000-8000-000000000001';
const other = '40000000-0000-4000-8000-000000000001';
const sid = '9007199254740993';
const digits = '000000009'; // Entirely synthetic; no real student's identifier or DOB.
const dob = '2000-01-01';
const now = 1792994400;
const clock = () => now * 1000;
const config = { project, url: `https://${project}.supabase.co`, issuer: `https://${project}.supabase.co/auth/v1`,
  anonKey: 'synthetic-public-key', serviceKey: 'synthetic-server-key', origins: ['https://board.example.invalid'] };
const bytes = (value) => Buffer.alloc(32, value);
const encoded = (value) => bytes(value).toString('base64url');
const settings = {
  identity: { active: 'new', keys: { old: encoded(1), new: encoded(5) } },
  lookup: { active: '1', keys: { 1: encoded(2), 2: encoded(6) } },
  capability: { active: 'cap', keys: { cap: encoded(3) } },
  preview: { active: 'preview', keys: { preview: encoded(4) } },
};
const cryptography = await createCrypto(project, settings);
const clazz = { id: cid, name: 'Synthetic class', schoolYear: '2026', revision: '1', semester1Published: true, semester2Published: true };
const student = { id: sid, classId: cid, fullName: 'Synthetic fixture', birthDate: dob, active: true, revision: '1' };
const subjectRows = [['math','Toán'],['literature','Văn'],['english','Anh'],['natural_science','KHTN'],['history_geography','LS / ĐL'],['technology','Công Nghệ'],['informatics','Tin Học'],['civics','GDCD']];
const columnRows = [['continuous_1','Thường xuyên 1'],['continuous_2','Thường xuyên 2'],['continuous_3','Thường xuyên 3'],['continuous_4','Thường xuyên 4'],['period_test','1 tiết'],['midterm','Giữa kì'],['final','Cuối kì']];
const catalogs = { subjects: subjectRows.map(([code, displayName], i) => ({ code, displayName, sortOrder: i + 1, active: true })),
  scoreColumns: columnRows.map(([code, displayName], i) => ({ code, displayName, sortOrder: i + 1, active: true })) };
const lookupContext = { classId: cid, lookupKeyVersion: 1, ...catalogs };
const counts = { insert: 1, update: 0, unchanged: 0, error: 0, skippedBlank: 0 };
const state = 'ab'.repeat(32);
const plan = { counts, errors: [], internalStateHash: state, writes: [{ private: 'never HTTP' }] };

/** JWTs are synthetic: real signature verification is mocked only at Auth getUser. */
function jwt(changes = {}, header = {}) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'ES256', typ: 'JWT', ...header })}.${encode({ iss: config.issuer, aud: 'authenticated', sub: actor, session_id: session, role: 'authenticated', iat: now - 10, exp: now + 3600, ...changes })}.${Buffer.alloc(64, 7).toString('base64url')}`;
}

/** Independently produces an AES-GCM reference envelope with Node crypto, not B4 encryption. */
function referenceEnvelope({ plaintext = digits, aadClass = cid, lookup, version = 2 } = {}) {
  const digest = lookup ?? createHmac('sha256', bytes(6)).update(`gb:lookup:v1|${project}|${cid}|2|${digits}`).digest('hex');
  const nonce = Buffer.alloc(12, 9);
  const cipher = createCipheriv('aes-256-gcm', bytes(1), nonce);
  cipher.setAAD(Buffer.from(`gb:id:v1|${project}|${aadClass}|${digest}`));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return { ...student, ciphertext: ciphertext.toString('hex'), nonce: nonce.toString('hex'), encKid: 'old', algVersion: 1, identityLookup: digest, lookupKeyVersion: version };
}

/** Each mock exposes call counts/arguments only inside the test; it performs no I/O. */
function fixture(kind = 'admin', replies = {}, options = {}) {
  const calls = [];
  const backend = {
    async user(token) { calls.push({ name: 'getUser', token }); return { id: actor }; },
    async admin(id) { calls.push({ name: 'profile', id }); return true; },
    async rpc(name, args) {
      calls.push({ name, args: structuredClone(args) });
      if (Object.hasOwn(replies, name)) return typeof replies[name] === 'function' ? replies[name](args) : structuredClone(replies[name]);
      if (name === 'gb_lookup_context') return structuredClone(lookupContext);
      if (name === 'gb_limit') return { allowed: true, retryAfter: 0 };
      throw Error('Unexpected offline RPC');
    },
  };
  Object.assign(backend, options.backend || {});
  const handler = createHandler(kind, { config, backendFactory: () => backend, cryptography, clock, ...options });
  return {
    calls, handler,
    async send(body, headers = {}, signal) {
      const response = await handler(new Request(`https://edge.example.invalid/${kind}`, { method: 'POST', headers: {
        'content-type': 'application/json', ...(kind === 'admin' ? { authorization: `Bearer ${jwt()}` } : {}), ...headers,
      }, body: JSON.stringify(body), signal }));
      return { status: response.status, body: await response.json(), headers: response.headers };
    },
  };
}

test('HMAC framing matches independent Node reference and separates class/project/generation', async () => {
  const expected = createHmac('sha256', bytes(2)).update(`gb:lookup:v1|${project}|${cid}|1|${digits}`).digest('hex');
  assert.equal(await cryptography.lookup(cid, 1, digits), expected);
  assert.notEqual(await cryptography.lookup(other, 1, digits), expected);
  assert.notEqual(await cryptography.lookup(cid, 2, digits), expected);
  const alternate = await createCrypto('otherproject', settings);
  assert.notEqual(await alternate.lookup(cid, 1, digits), expected);
});

test('identity encryption uses fresh 96-bit nonces and approved AAD; retained keys reveal successfully', async () => {
  const one = await cryptography.encryptIdentity(cid, 1, digits);
  const two = await cryptography.encryptIdentity(cid, 1, digits);
  assert.equal(one.nonce.length, 24);
  assert.notEqual(one.nonce, two.nonce);
  assert.equal(await cryptography.reveal({ ...one, classId: cid, algVersion: 1, identityLookup: one.lookup }, cid), digits);
  assert.equal(await cryptography.reveal(referenceEnvelope(), cid), digits);
});

test('CON-002: HTTP reveal allows plaintext only after authenticating stored row context', async () => {
  const envelope = { ...referenceEnvelope(), internalStateHash: state, privateExtra: 'never HTTP' };
  const f = fixture('admin', { gb_student_read: envelope });
  const result = await f.send({ op: 'student.reveal', classId: cid, studentId: sid });
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body).sort(), ['documentNumber', 'requestId']);
  assert.equal(result.body.documentNumber, digits);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(f.calls.at(-1), { name: 'gb_student_read', args: { actor, session, cid, sid, reveal: true } });
});

test('CON-002: ciphertext/tag/AAD/class/digest/generation/kid/algorithm and plaintext failures disclose nothing', async () => {
  const original = referenceEnvelope();
  const flip = (value, index) => value.slice(0, index) + (parseInt(value.slice(index, index + 2), 16) ^ 1).toString(16).padStart(2, '0') + value.slice(index + 2);
  const cases = [
    { ...original, ciphertext: flip(original.ciphertext, 0) },
    { ...original, ciphertext: flip(original.ciphertext, original.ciphertext.length - 2) },
    referenceEnvelope({ aadClass: other }), { ...original, classId: other },
    { ...original, identityLookup: '00'.repeat(32) },
    { ...original, lookupKeyVersion: 1 }, { ...original, lookupKeyVersion: 99 },
    { ...original, encKid: 'unknown' }, { ...original, algVersion: 2 },
    referenceEnvelope({ plaintext: '000000008' }), referenceEnvelope({ plaintext: 'ABCDEFGHI' }),
  ];
  for (const envelope of cases) {
    const f = fixture('admin', { gb_student_read: envelope });
    const result = await f.send({ op: 'student.reveal', classId: cid, studentId: sid });
    assert.equal(result.status, 503);
    assert.deepEqual(Object.keys(result.body).sort(), ['error', 'requestId']);
    assert.equal(f.calls.filter((c) => c.name.startsWith('gb_')).length, 1);
    assert.equal(JSON.stringify(result.body).includes(digits), false);
  }
});

test('keyrings reject wrong lengths, missing active kid and cross-purpose reuse', async () => {
  for (const replacement of [
    { active: 'missing', keys: settings.identity.keys },
    { active: 'new', keys: { new: Buffer.alloc(16).toString('base64url') } },
    { active: 'new', keys: { new: encoded(3) } },
  ]) await assert.rejects(createCrypto(project, { ...settings, identity: replacement }), (e) => e.status === 503);
});

test('ordinary/list DTOs drop every extra crypto field and preserve BIGINT strings', async () => {
  const f = fixture('admin', { gb_student_read: referenceEnvelope(), gb_students_list: [referenceEnvelope()] });
  const read = await f.send({ op: 'student.read', classId: cid, studentId: sid });
  const list = await f.send({ op: 'students.list', classId: cid });
  assert.deepEqual(read.body.student, student);
  assert.deepEqual(list.body.students, [student]);
  assert.equal(read.body.student.id, sid);
});

test('JWT claims reject wrong issuer/audience/expiry/session/algorithm before RPC', async () => {
  for (const token of [jwt({ iss: 'https://wrong.invalid' }), jwt({ aud: 'other' }), jwt({ exp: now }), jwt({ session_id: null }), jwt({ nbf: now + 1 }), jwt({}, { alg: 'none' })]) {
    const f = fixture();
    const result = await f.send({ op: 'student.read', classId: cid, studentId: sid }, { authorization: `Bearer ${token}` });
    assert.equal(result.status, 401);
    assert.equal(f.calls.length, 0);
  }
});

test('Auth user mismatch, invalid signature response and inactive admin cannot reach RPC', async () => {
  for (const backend of [
    { user: async () => ({ id: other }) },
    { user: async () => { throw new Failure(401, 'verification'); } },
    { admin: async () => false },
  ]) {
    const f = fixture('admin', {}, { backend });
    const result = await f.send({ op: 'student.read', classId: cid, studentId: sid });
    assert([401, 403].includes(result.status));
    assert.equal(f.calls.filter((c) => c.name.startsWith('gb_')).length, 0);
  }
});

test('client actor/session/crypto selectors and unknown operations are rejected before authentication', async () => {
  for (const body of [
    { op: 'student.read', classId: cid, studentId: sid, actor: other },
    { op: 'student.read', classId: cid, studentId: sid, session },
    { op: 'student.create', classId: cid, documentNumber: digits, birthDate: dob, identityLookup: state },
    { op: 'arbitrary.sql' },
    { op: ['class.read'] },
  ]) {
    const f = fixture(); const result = await f.send(body);
    assert.equal(result.status, 400); assert.equal(f.calls.length, 0);
  }
});

test('non-string student operation cannot coerce the allowlist or consume a limiter/read', async () => {
  for (const op of [['verify'], ['grades'], null, {}]) {
    const f = fixture('student');
    assert.equal((await f.send({ op, semester: 1 })).status, 400);
    assert.equal(f.calls.length, 0);
  }
});

test('CON-004: real SDK uses getUser(jwt), isolated service headers and one terminal write POST', async () => {
  const traffic = [];
  const fetchMock = async (url, init) => {
    const headers = new Headers(init.headers);
    traffic.push({ url: String(url), method: init.method || 'GET', authorization: headers.get('authorization'), redirect: init.redirect, body: init.body });
    if (String(url).endsWith('/auth/v1/user')) return Response.json({ id: actor });
    if (String(url).includes('/admin_profiles?')) return Response.json({ active: true, role: 'admin' });
    if (String(url).endsWith('/rpc/gb_score_put')) return Response.json({ code: 'PT409', message: 'private SQL diagnostics', details: digits }, { status: 409 });
    throw Error('Unexpected synthetic transport request');
  };
  const f = fixture('admin', {}, { backendFactory: backendFactory(createClient, config, fetchMock) });
  const result = await f.send({ op: 'score.put', classId: cid, studentId: sid, semester: 1, subjectCode: 'math', columnCode: 'final', expectedRevision: '1', score: '8.12345' });
  assert.equal(result.status, 409);
  assert.equal(traffic.length, 3);
  assert.equal(traffic.filter((t) => t.method === 'POST').length, 1);
  assert.equal(traffic[0].authorization, `Bearer ${jwt()}`);
  assert(traffic.slice(1).every((t) => t.authorization === `Bearer ${config.serviceKey}` && t.redirect === 'error'));
  assert.deepEqual(JSON.parse(traffic[2].body), { actor, session, cid, sid, semester: 1, subject: 'math', col: 'final', expected: '1', acknowledged: false, value: '8.12345' });
  assert.equal(JSON.stringify(result.body).includes('private SQL'), false);
  assert.equal(JSON.stringify(result.body).includes(digits), false);
});

test('infrastructure SQLSTATE, HTTP429/503 and unknown failures remain safe unavailable without another write', async () => {
  for (const error of [{ code: '40001' }, { code: 'XX000' }, { status: 429 }, { status: 503 }]) {
    const mapped = rpcFailure({ ...error, message: 'private details' });
    assert.equal(mapped.status, 503);
    if (error.code) assert.equal(mapped.classification, error.code);
    const f = fixture('admin', { gb_score_put: () => { throw mapped; } });
    const result = await f.send({ op: 'score.put', classId: cid, studentId: sid, semester: 1, subjectCode: 'math', columnCode: 'final', expectedRevision: null, score: '0' });
    assert.equal(result.status, 503);
    assert.equal(f.calls.filter((c) => c.name === 'gb_score_put').length, 1);
  }
});

test('manual exact score/date/BIGINT/confirmation validation precedes any write', async () => {
  const valid = { op: 'score.put', classId: cid, studentId: sid, semester: 1, subjectCode: 'math', columnCode: 'final', expectedRevision: null, score: '8' };
  for (const score of ['8.123456', '8.123450', '1e0', '-1', '+1', 'NaN', 'Infinity', '10.00001', 8.1]) {
    const f = fixture(); assert.equal((await f.send({ ...valid, score })).status, 400); assert.equal(f.calls.length, 0);
  }
  for (const birthDate of ['2000-02-30', '01/01/2000', '9999-01-01']) {
    const f = fixture(); assert.equal((await f.send({ op: 'student.create', classId: cid, documentNumber: digits, birthDate })).status, 400);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture();
  assert.equal((await f.send({ ...valid, studentId: 42 })).status, 400);
  assert.equal((await f.send({ op: 'student.patch', classId: cid, studentId: sid, expectedRevision: '1', fullName: null })).status, 400);
  assert.equal(f.calls.length, 0);
});

test('student create/patch pass generated envelopes; blank manual names require confirmation', async () => {
  const f = fixture('admin', { gb_student_create: student, gb_student_patch: student });
  assert.equal((await f.send({ op: 'student.create', classId: cid, documentNumber: digits, birthDate: dob })).status, 200);
  const create = f.calls.find((c) => c.name === 'gb_student_create');
  assert.equal(create.args.value.lookup, await cryptography.lookup(cid, 1, digits));
  assert.equal(Object.hasOwn(create.args.value, 'documentNumber'), false);
  assert.equal(create.args.value.birthDate, dob);
  assert.equal((await f.send({ op: 'student.patch', classId: cid, studentId: sid, expectedRevision: '1', fullName: null, confirmed: true })).status, 200);
  assert.deepEqual(f.calls.at(-1).args, { actor, session, cid, sid, expected: '1', value: { fullName: null } });
});

test('teacher operation inventory uses actual RPC names/arguments and no raw SQL response spread', async () => {
  const f = fixture('admin', { gb_class_read: clazz, gb_class_create: clazz, gb_class_patch: clazz, gb_student_status: student,
    gb_student_delete: null, gb_score_put: { changed: true, privateExtra: state }, gb_score_delete: null,
    gb_scores_read: [{ studentId: sid, scores: [{ subjectCode: 'math', columnCode: 'final', rawScore: '8.10000', revision: '2' }] }], gb_semester_set: clazz });
  const cases = [
    { op: 'class.read' }, { op: 'class.create', name: 'Synthetic', schoolYear: '2026' },
    { op: 'class.patch', classId: cid, expectedRevision: '1', name: 'Changed' },
    { op: 'student.deactivate', classId: cid, studentId: sid, expectedRevision: '1', confirmed: true },
    { op: 'student.reactivate', classId: cid, studentId: sid, expectedRevision: '1', confirmed: true },
    { op: 'student.delete', classId: cid, studentId: sid, expectedRevision: '1', confirmed: true },
    { op: 'scores.read', classId: cid, semester: 1, studentId: sid },
    { op: 'score.put', classId: cid, studentId: sid, semester: 1, subjectCode: 'math', columnCode: 'final', score: '10.00000', expectedRevision: null, acknowledged: true },
    { op: 'score.delete', classId: cid, studentId: sid, semester: 2, subjectCode: 'math', columnCode: 'final', expectedRevision: '2', confirmed: true, acknowledged: true },
    { op: 'semester.publish', classId: cid, semester: 1, expectedRevision: '1', confirmed: true, acknowledgeMissing: true },
    { op: 'semester.unpublish', classId: cid, semester: 2, expectedRevision: '1', confirmed: true },
  ];
  for (const body of cases) assert.equal((await f.send(body)).status, 200);
  assert.deepEqual(f.calls.find((c) => c.name === 'gb_class_patch').args, { actor, session, cid, expected: '1', name: 'Changed', school_year: '2026' });
  assert.equal(f.calls.find((c) => c.name === 'gb_scores_read').args.after_id, '9007199254740992');
  assert.deepEqual(f.calls.find((c) => c.name === 'gb_semester_set').args, { actor, session, cid, semester: 1, published: true, expected: '1', confirmed: true, acknowledge_missing: true });
});

test('capability TTL/audience/project/version/tampering and BIGINT epochs are checked', async () => {
  const issued = await cryptography.issueCapability({ classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3' }, now);
  const claims = await cryptography.capability(issued.token, now);
  assert.equal(claims.studentId, sid); assert.equal(claims.exp - claims.iat, 600);
  await assert.rejects(cryptography.capability(issued.token, now + 600), (e) => e.status === 401);
  await assert.rejects(cryptography.capability(issued.token.replace('v1.', 'v2.'), now), (e) => e.status === 401);
  await assert.rejects(cryptography.capability(issued.token.replace('.cap.', '.unknown.'), now), (e) => e.status === 401);
  const parts = issued.token.split('.'); const payload = decode64(parts[2]); payload[15] ^= 1;
  await assert.rejects(cryptography.capability(`${parts[0]}.${parts[1]}.${encode64(payload)}`, now), (e) => e.status === 401);
  const alternate = await createCrypto('otherproject', settings);
  await assert.rejects(alternate.capability(issued.token, now), (e) => e.status === 401);
  await assert.rejects(cryptography.issueCapability({ classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3', audience: 'other' }, now));
});

test('verify commits limiter first, issues no grades, and sends only protected matching state to SQL', async () => {
  const pair = { classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3', class: clazz };
  const f = fixture('student', { gb_pair_check: pair });
  const result = await f.send({ op: 'verify', documentNumber: digits, birthDate: dob });
  assert.equal(result.status, 200);
  assert.deepEqual(f.calls.map((c) => c.name), ['gb_lookup_context', 'gb_limit', 'gb_pair_check']);
  assert.deepEqual(f.calls[1].args, { reading: false, identity_lookup: await cryptography.lookup(cid, 1, digits) });
  assert.deepEqual(f.calls[2].args, { cid, lookup: await cryptography.lookup(cid, 1, digits), birth_date: dob, key_version: 1 });
  assert.deepEqual(Object.keys(result.body).sort(), ['capability', 'class', 'expiresAt', 'requestId', 'scoreColumns', 'subjects']);
  assert.equal(Object.hasOwn(result.body.class, 'id'), false);
  assert.equal(Object.hasOwn(result.body, 'scores'), false);
});

test('unknown/mismatched identities are neutral; malformed verify still consumes global quota', async () => {
  const f = fixture('student', { gb_pair_check: null });
  const first = await f.send({ op: 'verify', documentNumber: digits, birthDate: dob });
  const second = await f.send({ op: 'verify', documentNumber: '000000008', birthDate: '2000-01-02' });
  assert.equal(first.status, 401); assert.deepEqual(first.body.error, second.body.error);
  const malformed = fixture('student');
  assert.equal((await malformed.send({ op: 'verify', documentNumber: 'ABC', birthDate: dob })).status, 400);
  assert.deepEqual(malformed.calls, [{ name: 'gb_limit', args: { reading: false, identity_lookup: null } }]);
});

test('limiter denial/failure blocks pair and grade access and is never retried', async () => {
  const issued = await cryptography.issueCapability({ classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3' }, now);
  for (const reading of [false, true]) for (const denied of [true, false]) {
    const f = fixture('student', { gb_limit: () => {
      if (denied) return { allowed: false, retryAfter: 60 };
      throw new Failure(503, 'unavailable');
    } });
    const result = await f.send(reading ? { op: 'grades', semester: 1 } : { op: 'verify', documentNumber: digits, birthDate: dob },
      reading ? { 'x-gradebook-capability': issued.token } : {});
    assert.equal(result.status, denied ? 429 : 503);
    assert.equal(f.calls.filter((c) => c.name === 'gb_limit').length, 1);
    assert.equal(f.calls.some((c) => ['gb_pair_check', 'gb_student_grades', 'gb_histogram'].includes(c.name)), false);
    if (denied) {
      assert.equal(result.headers.get('retry-after'), '60');
      assert.equal(result.headers.get('access-control-expose-headers'), 'Retry-After');
    }
  }
});

test('student grades/histogram use capsule claims, selected semester and aggregate-only DTOs', async () => {
  const issued = await cryptography.issueCapability({ classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3' }, now);
  const buckets = Array.from({ length: 101 }, (_, i) => ({ scoreBucket: `${Math.floor(i / 10)}.${i % 10}`, studentCount: i === 81 ? 1 : 0, peerName: 'never HTTP' }));
  const f = fixture('student', { gb_student_grades: [{ subjectCode: 'math', columnCode: 'final', rawScore: '8.10000', peerId: other }], gb_histogram: buckets });
  const headers = { 'x-gradebook-capability': issued.token };
  const grades = await f.send({ op: 'grades', semester: 2 }, headers);
  assert.deepEqual(grades.body.scores, [{ subjectCode: 'math', columnCode: 'final', rawScore: '8.1' }]);
  assert.deepEqual(f.calls[1].args, { cid, sid, class_epoch: '2', student_epoch: '3', semester: 2 });
  const histogram = await f.send({ op: 'histogram', semester: 2, subjectCode: 'math', columnCode: 'final' }, headers);
  assert.equal(histogram.status, 200); assert.equal(histogram.body.buckets.length, 101);
  assert.deepEqual(Object.keys(histogram.body.buckets[0]), ['scoreBucket', 'studentCount']);
  const forged = await f.send({ op: 'grades', semester: 2, studentId: other }, headers);
  assert.equal(forged.status, 400);
});

test('publication denial for one semester does not invalidate a capability for another or republish', async () => {
  const issued = await cryptography.issueCapability({ classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3' }, now);
  let published = false;
  const f = fixture('student', { gb_student_grades: (args) => {
    if (args.semester === 1 && !published) throw new Failure(403, 'unavailable_semester', '42501');
    return [];
  } });
  const headers = { 'x-gradebook-capability': issued.token };
  assert.equal((await f.send({ op: 'grades', semester: 1 }, headers)).status, 403);
  assert.equal((await f.send({ op: 'grades', semester: 2 }, headers)).status, 200);
  published = true;
  assert.equal((await f.send({ op: 'grades', semester: 1 }, headers)).status, 200);
});

test('invalid/expired capability has no limiter/read request; epoch denial returns no grades', async () => {
  const f = fixture('student');
  assert.equal((await f.send({ op: 'grades', semester: 1 }, { 'x-gradebook-capability': 'invalid' })).status, 401);
  assert.equal(f.calls.length, 0);
  const issued = await cryptography.issueCapability({ classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3' }, now);
  const expired = fixture('student', {}, { clock: () => (now + 600) * 1000 });
  assert.equal((await expired.send({ op: 'grades', semester: 1 }, { 'x-gradebook-capability': issued.token })).status, 401);
  assert.equal(expired.calls.length, 0);
  const revoked = fixture('student', { gb_student_grades: () => { throw new Failure(403, 'unavailable_semester', '42501'); } });
  assert.equal((await revoked.send({ op: 'grades', semester: 1 }, { 'x-gradebook-capability': issued.token })).status, 403);
  assert.deepEqual(revoked.calls.map((c) => c.name), ['gb_limit', 'gb_student_grades']);
});

const roster = { op: 'roster.preview', classId: cid, headers: ['custom', ''], rows: [{ row: 2, documentNumber: digits, birthDate: dob }] };

test('roster preview token binds B1 input and private state without exposing either transcript', async () => {
  const f = fixture('admin', { gb_roster_preview: plan, gb_roster_apply: { counts, errors: [], committed: true, internalStateHash: state } });
  const preview = await f.send(roster);
  assert.equal(preview.status, 200);
  assert.equal(Object.hasOwn(preview.body, 'internalStateHash'), false);
  assert.equal(Object.hasOwn(preview.body, 'writes'), false);
  const payload = decodeJson(decode64(preview.body.previewToken.split('.')[2]));
  assert.deepEqual(Object.keys(payload).sort(), ['actor','classId','exp','inputDigest','kind','project','purpose','semester','session','stateDigest'].sort());
  assert.notEqual(payload.stateDigest, state);
  assert.equal(JSON.stringify(payload).includes(digits), false);
  const apply = await f.send({ ...roster, op: 'roster.apply', previewToken: preview.body.previewToken });
  assert.equal(apply.status, 200);
  assert.deepEqual(Object.keys(apply.body).sort(), ['committed','counts','errors','requestId']);
  assert.equal(f.calls.filter((c) => c.name === 'gb_roster_apply').length, 1);
  const args = f.calls.at(-1).args;
  assert.equal(args.expected, state);
  assert.equal(Object.hasOwn(args.rows[0], 'documentNumber'), false);
  assert.equal(args.rows[0].lookup, await cryptography.lookup(cid, 1, digits));
});

test('preview HMAC canonicalization binds actor/session/class/kind/semester/input, expiry and signature', async () => {
  const binding = { actor, session, classId: cid, kind: 'roster', semester: null };
  const issued = await cryptography.issuePreview(binding, 'synthetic framed input', state, now);
  const payload = decodeJson(decode64(issued.token.split('.')[2]));
  const scope = frameTuple('scope', [cid, 'roster', null]);
  const expected = createHmac('sha256', bytes(4)).update(frameTuple('gb:preview-state:v1', [project, scope, state])).digest('base64url');
  assert.equal(payload.stateDigest, expected);
  for (const altered of [{ actor: other }, { session: other }, { classId: other }, { kind: 'scores' }, { semester: 1 }]) {
    await assert.rejects(cryptography.preview(issued.token, { ...binding, ...altered }, 'synthetic framed input', now), (e) => e.status === 409);
  }
  await assert.rejects(cryptography.preview(issued.token, binding, 'changed input', now), (e) => e.status === 409);
  await assert.rejects(cryptography.preview(issued.token, binding, 'synthetic framed input', now + 300), (e) => e.status === 409);
  await assert.rejects(cryptography.preview(issued.token.slice(0, -1), binding, 'synthetic framed input', now), (e) => e.status === 409);
});

test('stale preflight, DB row errors and PT409 apply do not perform or repeat batch writes', async () => {
  const f = fixture('admin', { gb_roster_preview: plan });
  const token = (await f.send(roster)).body.previewToken;
  for (const stale of [{ ...plan, internalStateHash: 'cd'.repeat(32) }, { ...plan, counts: { ...counts, error: 1 }, errors: [{ row: 2, column: 1, code: 'invalid' }] }]) {
    const target = fixture('admin', { gb_roster_preview: stale });
    assert.equal((await target.send({ ...roster, op: 'roster.apply', previewToken: token })).status, 409);
    assert.equal(target.calls.some((c) => c.name.endsWith('_apply')), false);
  }
  const conflict = fixture('admin', { gb_roster_preview: plan, gb_roster_apply: () => { throw rpcFailure({ code: 'PT409' }); } });
  assert.equal((await conflict.send({ ...roster, op: 'roster.apply', previewToken: token })).status, 409);
  assert.equal(conflict.calls.filter((c) => c.name === 'gb_roster_apply').length, 1);
});

test('DB-dependent publication changes during preflight or final apply remain terminal409', async () => {
  const body = { op: 'scores.preview', classId: cid, semester: 1, headers: Array(10).fill('custom'),
    rows: [{ row: 2, documentNumber: digits, birthDate: dob, subjectName: 'Toán', scores: ['8', null, null, null, null, null, null] }] };
  const initial = fixture('admin', { gb_scores_preview: plan });
  const token = (await initial.send(body)).body.previewToken;
  for (const stage of ['preflight', 'apply']) {
    const changed = () => { throw rpcFailure({ code: '22023', message: 'published' }); };
    const f = fixture('admin', { gb_scores_preview: stage === 'preflight' ? changed : plan, gb_scores_apply: changed });
    assert.equal((await f.send({ ...body, op: 'scores.apply', previewToken: token })).status, 409);
    assert.equal(f.calls.filter((c) => c.name === 'gb_scores_apply').length, stage === 'apply' ? 1 : 0);
  }
});

test('score imports use seven ordered cells and customizable headers; duplicates and lexical precision fail', async () => {
  const body = { op: 'scores.preview', classId: cid, semester: 2, headers: Array(10).fill('custom'), rows: [{ row: 3, documentNumber: digits, birthDate: dob, subjectName: 'Toán', scores: ['0', null, '', '8.10000', null, null, '10.00000'] }] };
  const f = fixture('admin', { gb_scores_preview: plan, gb_scores_apply: { counts, errors: [], committed: true } });
  const preview = await f.send(body);
  assert.equal(preview.status, 200);
  assert.deepEqual(f.calls.at(-1).args.rows[0].scores, ['0', null, null, '8.1', null, null, '10']);
  assert.equal((await f.send({ ...body, op: 'scores.apply', previewToken: preview.body.previewToken })).status, 200);
  assert.equal(f.calls.filter((c) => c.name === 'gb_scores_apply').length, 1);
  for (const rows of [[body.rows[0], { ...body.rows[0], row: 4 }], [{ ...body.rows[0], scores: ['8.123450', null, null, null, null, null, null] }]]) {
    const invalid = fixture('admin');
    const result = await invalid.send({ ...body, rows });
    assert.equal(result.status, 422);
    assert.equal(invalid.calls.some((c) => c.name === 'gb_scores_preview'), false);
    assert.equal(result.body.issues[0].column, 4);
  }
});

test('timeout/cancellation never starts a sensitive follow-up after a stalled limiter', async () => {
  const held = Promise.withResolvers();
  const issued = await cryptography.issueCapability({ classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3' }, now);
  const f = fixture('student', { gb_limit: () => held.promise }, { deadlineMs: 50 });
  const result = await f.send({ op: 'grades', semester: 1 }, { 'x-gradebook-capability': issued.token });
  assert.equal(result.status, 503); assert.equal(f.calls.length, 1);
  held.resolve({ allowed: true, retryAfter: 0 });
  await new Promise(setImmediate);
  assert.equal(f.calls.length, 1);
  const controller = new AbortController(); controller.abort();
  const cancelled = fixture('student');
  assert.equal((await cancelled.send({ op: 'verify', documentNumber: digits, birthDate: dob }, {}, controller.signal)).status, 503);
  assert.equal(cancelled.calls.length, 0);
});

/** Captures actual pinned SDK invocation headers without Auth, network or application bootstrap. */
async function sdkInvokeHeaders(headers = {}) {
  const requests = [];
  const client = createClient(config.url, config.anonKey, {
    accessToken: async () => 'synthetic-access-token',
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (url, init) => {
        requests.push({ url: String(url), method: init.method, headers: new Headers(init.headers) });
        return Response.json({ synthetic: true });
      },
    },
  });
  const result = await client.functions.invoke('synthetic-function', { body: { op: 'synthetic' }, headers });
  assert.equal(result.error, null);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(new URL(requests[0].url).pathname, '/functions/v1/synthetic-function');
  assert.match(requests[0].headers.get('x-client-info'), /^supabase-js\/2\.118\.0;/);
  return [...requests[0].headers.keys()].sort();
}

test('CORS preflight permits actual pinned SDK JSON headers for both entrypoints without backend work', async () => {
  const required = await sdkInvokeHeaders();
  assert.deepEqual(required, ['apikey', 'authorization', 'content-type', 'x-client-info']);
  for (const kind of ['admin', 'student']) {
    let backendCreations = 0;
    const f = fixture(kind, {}, { backendFactory: () => { backendCreations += 1; throw Error('OPTIONS must not create clients'); } });
    const result = await f.handler(new Request(`https://edge.example.invalid/${kind}`, {
      method: 'OPTIONS',
      headers: {
        Origin: config.origins[0],
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': required.join(', '),
      },
    }));
    assert.equal(result.status, 204);
    assert.equal(result.headers.get('access-control-allow-origin'), config.origins[0]);
    assert.equal(result.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
    assert.deepEqual(result.headers.get('access-control-allow-headers').split(', ').sort(),
      [...required, 'x-gradebook-capability'].sort());
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.equal(result.headers.get('vary'), 'Origin');
    assert.equal(await result.text(), '');
    assert.equal(backendCreations, 0);
    assert.deepEqual(f.calls, []);
  }
});

test('CORS preflight permits the dedicated capability header without limiter or sensitive reads', async () => {
  const required = await sdkInvokeHeaders({ 'x-gradebook-capability': 'synthetic-capability' });
  assert.ok(required.includes('x-gradebook-capability'));
  let backendCreations = 0;
  const f = fixture('student', {}, { backendFactory: () => { backendCreations += 1; throw Error('OPTIONS must not create clients'); } });
  const result = await f.handler(new Request('https://edge.example.invalid/student', {
    method: 'OPTIONS',
    headers: {
      Origin: config.origins[0],
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': required.join(', '),
    },
  }));
  assert.equal(result.status, 204);
  const allowed = result.headers.get('access-control-allow-headers').split(', ');
  for (const header of required) assert.ok(allowed.includes(header));
  assert.equal(backendCreations, 0);
  assert.deepEqual(f.calls, []);
});

test('CORS preflight rejects unapproved origins for both entrypoints without backend work', async () => {
  for (const kind of ['admin', 'student']) {
    let backendCreations = 0;
    const f = fixture(kind, {}, { backendFactory: () => { backendCreations += 1; throw Error('Unapproved origin must not create clients'); } });
    const result = await f.handler(new Request(`https://edge.example.invalid/${kind}`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://unapproved.invalid',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, apikey, content-type, x-client-info',
      },
    }));
    assert.equal(result.status, 403);
    assert.equal(result.headers.get('access-control-allow-origin'), null);
    assert.equal(result.headers.get('access-control-allow-headers'), null);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(backendCreations, 0);
    assert.deepEqual(f.calls, []);
  }
});

test('HTTP boundaries enforce CORS, JSON media type, chunk/body limit and no diagnostic logging', async () => {
  const f = fixture();
  assert.equal((await f.send({ op: 'class.read' }, { origin: 'https://unapproved.invalid' })).status, 403);
  assert.equal((await f.send({ op: 'class.read' }, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await f.send({ op: 'class.read' }, { 'content-length': '4194305' })).status, 413);
  const options = await f.handler(new Request('https://edge.example.invalid/admin', { method: 'OPTIONS', headers: { origin: config.origins[0] } }));
  assert.equal(options.status, 204); assert.equal(f.calls.length, 0);
  await assert.rejects(bodyJson(new Request('https://edge.example.invalid/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ padded: 'synthetic' }) }), new AbortController().signal, 16), (e) => e.status === 413);
  for (const file of await readdir('supabase/functions/_shared')) {
    const source = await readFile('supabase/functions/_shared/' + file, 'utf8');
    assert.doesNotMatch(source, /console\.(log|error|debug|warn)|localStorage|sessionStorage/);
  }
});

test('server configuration contains only explicit project/origins and isolated server credentials', () => {
  const env = { SUPABASE_URL: config.url, SUPABASE_ANON_KEY: config.anonKey, SUPABASE_SERVICE_ROLE_KEY: config.serviceKey, GB_ALLOWED_ORIGINS: JSON.stringify(config.origins) };
  assert.deepEqual(runtimeConfig((name) => env[name]), config);
  assert.throws(() => runtimeConfig((name) => ({ ...env, GB_ALLOWED_ORIGINS: '["*"]' })[name]));
  assert.throws(() => runtimeConfig((name) => ({ ...env, SUPABASE_URL: 'http://untrusted.invalid' })[name]));
});

test('retained capability and preview kids remain usable after synthetic active-key changes', async () => {
  const binding = { actor, session, classId: cid, kind: 'roster', semester: null };
  const cap = await cryptography.issueCapability({ classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3' }, now);
  const preview = await cryptography.issuePreview(binding, 'synthetic input', state, now);
  const rotated = await createCrypto(project, { ...settings,
    capability: { active: 'newcap', keys: { ...settings.capability.keys, newcap: encoded(7) } },
    preview: { active: 'newpreview', keys: { ...settings.preview.keys, newpreview: encoded(8) } },
  });
  assert.equal((await rotated.capability(cap.token, now)).studentId, sid);
  assert.equal((await rotated.preview(preview.token, binding, 'synthetic input', now)).kid, 'preview');
  assert.match((await rotated.issueCapability({ classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3' }, now)).token, /^v1\.newcap\./);
});

test('authenticated capability plaintext still rejects wrong audience or non-string identity claims', async () => {
  for (const changed of [{ audience: 'other' }, { studentId: 42 }, { studentEpoch: '0' }]) {
    const payload = { project, audience: 'student-lookup', classId: cid, studentId: sid, classEpoch: '2', studentEpoch: '3', iat: now, exp: now + 600, ...changed };
    const nonce = Buffer.alloc(12, 11);
    const cipher = createCipheriv('aes-256-gcm', bytes(3), nonce);
    cipher.setAAD(Buffer.from(`gb:cap:v1|${project}|student-lookup|v1|cap`));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final(), cipher.getAuthTag()]);
    await assert.rejects(cryptography.capability(`v1.cap.${Buffer.concat([nonce, encrypted]).toString('base64url')}`, now), (e) => e.status === 401);
  }
});

test('real SDK profile GET503 is terminal with retry(false) and no privileged RPC', async () => {
  const traffic = [];
  const fetchMock = async (url) => {
    traffic.push(String(url));
    if (String(url).endsWith('/auth/v1/user')) return Response.json({ id: actor });
    if (String(url).includes('/admin_profiles?')) return Response.json({ code: 'XX000', message: 'private diagnostic' }, { status: 503 });
    throw Error('Unexpected synthetic request');
  };
  const f = fixture('admin', {}, { backendFactory: backendFactory(createClient, config, fetchMock) });
  const result = await f.send({ op: 'student.read', classId: cid, studentId: sid });
  assert.equal(result.status, 503);
  assert.equal(traffic.length, 2);
  assert.equal(traffic.some((url) => url.includes('/rpc/')), false);
  assert.equal(JSON.stringify(result.body).includes('private diagnostic'), false);
});

test('CON-004 static chain guard verifies eight reviewed replacements and unchanged reveal semantics', async () => {
  const sql = await readFile('supabase/migrations/20261026030000_gradebook_transactions.sql', 'utf8');
  const fix = await readFile('supabase/migrations/20261026050000_gradebook_nonretryable_conflicts.sql', 'utf8');
  const signatures = [...fix.matchAll(/\('((?:public|gradebook)\.[a-z_]+)\([^']+\)','([0-9a-f]{64})','([0-9a-f]{64})'/g)];
  assert.equal(signatures.length, 8);
  const { createHash } = await import('node:crypto');
  const sha = (value) => createHash('sha256').update(value).digest('hex');
  let effective = sql;
  for (const [, name, oldHash, newHash] of signatures) {
    const start = sql.indexOf(`CREATE FUNCTION ${name}(`);
    const from = sql.indexOf('AS $$', start) + 5;
    const end = sql.indexOf('$$;', from);
    const source = sql.slice(from, end);
    assert.equal(sha(source), oldHash);
    const corrected = source.replaceAll("ERRCODE='40001'", "ERRCODE='PT409'");
    assert.equal(sha(corrected), newHash);
    effective = effective.replace(source, corrected);
  }
  assert.doesNotMatch(effective, /ERRCODE='40[0-9A-Z]{3}'|serialization_failure|deadlock_detected/);
  const reveal = await readFile('supabase/migrations/20261026060000_gradebook_reveal_identity_context.sql', 'utf8');
  assert.match(reveal, /identityLookup.*,encode\(s\.identity_lookup/);
  assert.match(reveal, /lookupKeyVersion.*,s\.lookup_key_version/);
  assert.doesNotMatch(reveal, /ERRCODE.*40[0-9A-Z]{3}/);
});
