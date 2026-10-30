/** Bulk score removal contract: synthetic IDs and no hosted database writes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { studentScoresClearAction } from '../src/utils/gradebook-admin.js';
import { adminRequest, adminPayload } from '../src/utils/gradebook-admin-responses.js';
import { validateAdmin, executeAdmin } from '../supabase/functions/_shared/admin.js';

const cid = '30000000-0000-4000-8000-000000000001';
const student = { id: '9007199254740993', revision: '9007199254740994' };
const fingerprint = 'ab'.repeat(32);
const base = { classId: cid, studentId: student.id, expectedRevision: student.revision };

test('new clear operation requires a bound student and exact snapshot digest', () => {
  const request = studentScoresClearAction(student, cid, fingerprint, true);
  assert.deepEqual(request, {
    op: 'student.scores.clear',
    ...base,
    expectedFingerprint: fingerprint,
    confirmed: true,
    acknowledged: true,
  });
  assert.deepEqual(adminRequest(request), request);
  assert.doesNotThrow(() => validateAdmin(request, '2026-10-30'));
  for (const altered of [
    { ...request, expectedFingerprint: 'invalid' },
    { ...request, confirmed: false },
    { ...request, studentId: 13 },
    { ...request, documentNumber: '000000009' },
  ])
    assert.throws(() => validateAdmin(altered, '2026-10-30'));
  assert.throws(() => studentScoresClearAction(student, cid, 'bad'));
});

test('summary schema allows counts, publication flags and fingerprint only', () => {
  const request = { op: 'student.scores.summary', ...base };
  assert.deepEqual(adminRequest(request), request);
  assert.doesNotThrow(() => validateAdmin(request, '2026-10-30'));
  const summary = {
    semester1Count: 3,
    semester2Count: 2,
    totalCount: 5,
    semester1Published: true,
    semester2Published: false,
    fingerprint,
  };
  assert.deepEqual(adminPayload(request, summary), summary);
  assert.throws(() => adminPayload(request, { ...summary, totalCount: 4 }));
  assert.throws(() => adminPayload(request, { ...summary, documentNumber: '000000009' }));
  assert.deepEqual(adminPayload({ ...request, op: 'student.scores.clear' }, { deletedCount: 5 }), {
    deletedCount: 5,
  });
  assert.throws(() =>
    adminPayload({ ...request, op: 'student.scores.clear' }, { deletedCount: -1 }),
  );
});

test('summary and clear dispatch only to their named server RPCs', async () => {
  const calls = [];
  const context = {
    backend: {
      rpc: async (name, args) => {
        calls.push({ name, args });
        return name === 'gb_student_scores_summary'
          ? {
              semester1Count: 1,
              semester2Count: 0,
              totalCount: 1,
              semester1Published: true,
              semester2Published: false,
              fingerprint,
            }
          : { deletedCount: 1 };
      },
    },
  };
  const identity = {
    actor: '10000000-0000-4000-8000-000000000001',
    session: '20000000-0000-4000-8000-000000000001',
  };
  const summary = await executeAdmin({ op: 'student.scores.summary', ...base }, identity, context);
  const deleted = await executeAdmin(
    studentScoresClearAction(student, cid, fingerprint, true),
    identity,
    context,
  );
  assert.equal(summary.payload.totalCount, 1);
  assert.equal(deleted.payload.deletedCount, 1);
  assert.deepEqual(
    calls.map((call) => call.name),
    ['gb_student_scores_summary', 'gb_student_scores_clear'],
  );
  assert.equal(calls[1].args.expected_fingerprint, fingerprint);
  assert.equal(calls[1].args.acknowledged, true);
});
