/** CP04 pure/component contracts only: no HTTP, SDK, Edge, SQL, browser runtime or hosted requests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  teacherCatalog,
  teacherPage,
  compareScoreCells,
  scoreMutation,
  publicationMutation,
  excelScore,
  scoreBatch,
  SCORE_HEADERS,
} from '../src/utils/gradebook-scores.js';
import { csvRecords } from '../src/utils/roster.js';
import { displayScore, normalizeScore } from '../src/utils/gradebook/decimal.js';
import { createAdminGate, createRosterPreview } from '../src/utils/gradebook-admin.js';

const names = ['Toán', 'Văn', 'Anh', 'KHTN', 'LS / ĐL', 'Công Nghệ', 'Tin Học', 'GDCD'];
const catalog = {
  subjects: names.map((displayName, i) => ({
    code: `subject_${i}`,
    displayName,
    sortOrder: i + 1,
    active: true,
  })),
  scoreColumns: SCORE_HEADERS.slice(3).map((displayName, i) => ({
    code: `column_${i}`,
    displayName,
    sortOrder: i + 1,
    active: true,
  })),
};
const classroom = {
  id: '00000000-0000-4000-8000-000000000001',
  revision: '9007199254740993',
  semester1Published: false,
  semester2Published: true,
};
const student = {
  id: '9007199254740993',
  classId: classroom.id,
  revision: '9007199254740994',
  fullName: 'Học sinh giả lập',
  birthDate: '2000-02-29',
  active: true,
};
const base = {
  classroom,
  student,
  semester: 1,
  subjectCode: 'subject_0',
  columnCode: 'column_0',
  existing: null,
};
const row = (
  subject = 'Toán',
  scores = ['8.12345', null, null, null, null, null, '0'],
  number = 2,
) => ({
  row: number,
  cells: ['000000000001', '29/02/2000', subject, ...scores.map((v) => v ?? '')],
});
const batch = (...rows) =>
  scoreBatch([{ row: 1, cells: [...SCORE_HEADERS] }, ...rows], catalog, '2026-10-27');

test('CP04-T01 ordered active catalogs remain the single code/label source; malformed catalog fails closed', () => {
  assert.deepEqual(
    teacherCatalog({ ...catalog, subjects: [...catalog.subjects].reverse() }).subjects.map(
      (s) => s.displayName,
    ),
    names,
  );
  assert.deepEqual(
    teacherCatalog(catalog).scoreColumns.map((s) => s.displayName),
    [
      'Thường xuyên 1',
      'Thường xuyên 2',
      'Thường xuyên 3',
      'Thường xuyên 4',
      '1 tiết',
      'Giữa kì',
      'Cuối kì',
    ],
  );
  assert.throws(() => teacherCatalog({ ...catalog, subjects: catalog.subjects.slice(1) }));
  assert.throws(() =>
    teacherCatalog({
      ...catalog,
      scoreColumns: catalog.scoreColumns.map((s) => ({ ...s, sortOrder: 1 })),
    }),
  );
});
test('CP04-T02 exact INSERT/UPDATE/DELETE preconditions; absence is null, IDs/revisions stay strings', () => {
  assert.deepEqual(scoreMutation({ ...base, score: '8.12345' }), {
    op: 'score.put',
    classId: classroom.id,
    studentId: student.id,
    semester: 1,
    subjectCode: 'subject_0',
    columnCode: 'column_0',
    expectedRevision: null,
    score: '8.12345',
  });
  const existing = { rawScore: '8.24', revision: '9007199254740995' };
  assert.equal(
    scoreMutation({ ...base, existing, score: '8.25' }).expectedRevision,
    existing.revision,
  );
  assert.throws(() => scoreMutation({ ...base, existing, deleting: true }));
  assert.equal(
    scoreMutation({ ...base, existing, deleting: true, confirmed: true }).confirmed,
    true,
  );
  assert.throws(() => scoreMutation({ ...base, student: { id: 123 }, score: '8' }));
});
test('CP04-T03 lexical precision/range is validated before canonicalization; zero is a write, blank is invalid', () => {
  for (const value of ['8', '8.1', '8.12345', '0', '10.00000', '8.24', '8.25', '8.26'])
    assert.equal(scoreMutation({ ...base, score: value }).score, normalizeScore(value));
  for (const value of ['8.123456', '10.00001', '-1', '1e0', '1E-5', '', ' ', 'NaN', '8,25', 8.25])
    assert.throws(() => scoreMutation({ ...base, score: value }));
  assert.equal(scoreMutation({ ...base, score: '0' }).score, '0');
});
test('CP04-T04 display and sorting use different contracts without changing raw values; absent sorts last', () => {
  const cells = ['8.26', '8.24', '8.25', '0'].map((rawScore) => ({ rawScore }));
  assert.deepEqual(
    [...cells].sort(compareScoreCells).map((s) => s.rawScore),
    ['0', '8.24', '8.25', '8.26'],
  );
  assert.deepEqual(
    cells.slice(0, 3).map((c) => displayScore(c.rawScore)),
    ['8.3', '8.2', '8.3'],
  );
  assert.equal(cells[0].rawScore, '8.26');
  assert.equal(compareScoreCells(null, cells[0], true), 1);
  assert.equal(displayScore('0'), '0.0');
});
test('CP04-T05 published manual mutation requires acknowledgement; delete also requires confirmation', () => {
  assert.throws(() => scoreMutation({ ...base, semester: 2, score: '9' }));
  assert.equal(
    scoreMutation({ ...base, semester: 2, score: '9', acknowledged: true }).acknowledged,
    true,
  );
  assert.throws(() =>
    scoreMutation({
      ...base,
      semester: 2,
      existing: { revision: '2' },
      deleting: true,
      confirmed: true,
    }),
  );
});
test('CP04-T06 ten physical columns accept blank/repeated/custom headers and retain trailing slots and source rows', () => {
  const input = csvRecords(
    Array(10).fill('custom').join(',') + '\r\n\r\n000000000001,29/02/2000,Toán,0,,,,,,',
    10,
  );
  const result = scoreBatch(input, catalog, '2026-10-27');
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[0].row, 3);
  assert.equal(result.rows[0].scores[0], '0');
  assert.equal(result.skippedBlank, 6);
  assert.throws(() => scoreBatch([{ row: 1, cells: ['', ''] }], catalog));
  assert.equal(batch({ row: 3, cells: [...row().cells, ''] }).errors[0].column, 11);
  assert.throws(() => csvRecords('a,b,c,d'));
});
test('CP04-T07 XLSX raw numeric decimal text remains exact; binary tails/exponents/excess scale cannot be rounded into validity', () => {
  assert.equal(excelScore({ kind: 'excel-number', value: '8.12345' }), '8.12345');
  for (const value of ['8.123456', '8.240000000000001', '1e-5', '10.00001'])
    assert.throws(() => excelScore({ kind: 'excel-number', value }));
  const r = row();
  r.cells[1] = { kind: 'date', value: '2000-02-29' };
  r.cells[3] = { kind: 'excel-number', value: '8.12345' };
  assert.equal(batch(r).rows[0].scores[0], '8.12345');
  r.cells[0] = { kind: 'numeric-identity' };
  assert.equal(batch(r).errors[0].column, 1);
});
test('CP04-T08 same pupil/different subject and disjoint slots are valid; repeated nonblank coordinates reject', () => {
  assert.equal(batch(row(), row('Văn', undefined, 4)).errors.length, 0);
  const duplicate = batch(row(), row('Toán', undefined, 5));
  assert.equal(duplicate.errors[0].row, 5);
  assert.equal(duplicate.errors[0].column, 4);
  assert.equal(
    batch(
      row('Toán', ['8', null, null, null, null, null, null]),
      row('Toán', [null, '9', null, null, null, null, null], 4),
    ).errors.length,
    0,
  );
});
test('CP04-T09 malformed partial/invalid subject/date/decimal rows block confirmation with safe physical errors', () => {
  const bad = row('Ngữ văn', ['8.123456', null, null, null, null, null, null], 9);
  bad.cells[1] = '29/02/1900';
  const result = batch(row(), bad);
  assert.deepEqual(
    result.errors.map((e) => [e.row, e.column]),
    [
      [9, 2],
      [9, 3],
      [9, 4],
    ],
  );
  assert.ok(result.errors.every((e) => !JSON.stringify(e).includes('000000000001')));
  assert.throws(() => batch({ row: 2, cells: Array(10).fill('') }));
});
test('CP04-T10 signed preview ownership includes semester/input/class/expiry; changed file or invalid plan grants no apply', () => {
  let now = 1000000;
  const preview = createRosterPreview(() => now, 'scores'),
    data = batch(row()),
    ticket = preview.set(data, classroom.id, 1);
  const token = { counts: { error: 0 }, previewToken: 'synthetic', expiresAt: 1100 };
  assert.equal(preview.accept(token, ticket), true);
  assert.equal(preview.apply(classroom.id, 1).op, 'scores.apply');
  assert.throws(() => preview.apply(classroom.id, 2));
  preview.clear();
  assert.equal(preview.accept(token, ticket), false);
  assert.throws(() => preview.apply(classroom.id, 1));
  const renewed = preview.set(data, classroom.id, 1);
  assert.equal(preview.accept(token, renewed), true);
  now = 1100001;
  assert.throws(() => preview.apply(classroom.id, 1));
});
test('CP04-T11 structured 422 preview retains safe counts/coordinates only, never authorizes apply or swallows mutation errors', async () => {
  let calls = 0;
  const owner = () => ({ status: 'admin', generation: 1 });
  const payload = {
    counts: { insert: 1, update: 1, unchanged: 1, error: 1, skippedBlank: 10 },
    errors: [{ row: 9, column: 4, code: 'invalid', private: 'never render' }],
    previewToken: 'must discard',
    internalStateHash: 'private',
  };
  const gate = createAdminGate(async () => {
    calls++;
    throw { status: 422, payload };
  }, owner);
  const result = await gate.call({ op: 'scores.preview' });
  assert.equal(result.counts.skippedBlank, 10);
  assert.equal(result.previewToken, null);
  assert.deepEqual(result.errors, [{ row: 9, column: 4, code: 'invalid' }]);
  assert.equal(result.internalStateHash, undefined);
  await assert.rejects(gate.call({ op: 'score.put' }), { status: 422 });
  assert.equal(calls, 2);
  const roster = await gate.call({ op: 'roster.preview' });
  assert.equal(roster.counts.error, 1);
  const conflict = createAdminGate(async () => {
    throw { status: 409, payload };
  }, owner);
  await assert.rejects(conflict.call({ op: 'scores.apply' }), { status: 409 });
});
test('CP04-T12 publication targets one semester with class revision and explicit missing acknowledgement, never score payload', () => {
  assert.deepEqual(publicationMutation(classroom, 1, true, true, true), {
    op: 'semester.publish',
    classId: classroom.id,
    semester: 1,
    expectedRevision: classroom.revision,
    confirmed: true,
    acknowledgeMissing: true,
  });
  assert.equal(publicationMutation(classroom, 2, false, true).op, 'semester.unpublish');
  assert.equal(classroom.semester2Published, true);
  assert.equal(classroom.semester1Published, false);
  assert.throws(() => publicationMutation(classroom, 1, true, false));
});
test('CP04-T13 late reads after cancellation/logout cannot expose a previous semester', async () => {
  const held = Promise.withResolvers(),
    state = { status: 'admin', generation: 1 };
  let calls = 0;
  const gate = createAdminGate(
    () => {
      calls++;
      return held.promise;
    },
    () => state,
  );
  const pending = gate.call({ op: 'scores.read' }),
    rejected = assert.rejects(pending, { name: 'AbortError' });
  gate.cancel();
  state.status = 'anonymous';
  state.generation++;
  held.resolve({ students: [{ private: 'discard' }] });
  await rejected;
  assert.equal(calls, 1);
});
test('CP04-T14 joins only matching paged identities and projects validated score data; shipped template has exact labels', () => {
  const roster = { students: [{ ...student, documentNumber: 'must discard' }], nextCursor: null },
    grades = {
      students: [
        {
          studentId: student.id,
          scores: [
            {
              subjectCode: 'subject_0',
              columnCode: 'column_0',
              rawScore: '8.12345',
              revision: '9007199254740995',
            },
          ],
        },
      ],
      nextCursor: null,
    };
  const page = teacherPage(roster, grades, classroom.id, teacherCatalog(catalog));
  assert.equal(page.students[0].documentNumber, undefined);
  assert.equal(page.students[0].cells.get('subject_0|column_0').rawScore, '8.12345');
  assert.throws(() =>
    teacherPage(
      roster,
      { ...grades, students: [{ studentId: '999', scores: [] }] },
      classroom.id,
      catalog,
    ),
  );
  const header = csvRecords(readFileSync('public/templates/score-template.csv', 'utf8'), 10)[0]
    .cells;
  assert.deepEqual(header, [...SCORE_HEADERS]);
});
