/** Tests B1 exact contracts with synthetic inputs only; no API, DB or crypto acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { normalizeScore, compareScores, displayScore } from '../src/utils/gradebook/decimal.js';
import {
  documentNumber,
  bigintId,
  compareBigintIds,
  allowFields,
  ContractError,
} from '../src/utils/gradebook/contracts.js';
import {
  apiDate,
  uiDate,
  displayDate,
  birthDate,
  vietnamToday,
  excelDate,
} from '../src/utils/gradebook/dates.js';
import {
  positionalRosterRow,
  importedScore,
  importedName,
  normalizeRoster,
} from '../src/utils/gradebook/imports.js';
import {
  frameScalar,
  frameTuple,
  recordPresenceVector,
  canonicalRosterInput,
  canonicalScoreCells,
} from '../src/utils/gradebook/canonical.js';

const today = '2026-10-26';
// These are synthetic parser vectors, never real student records.
const roster = () => ({
  headers: ['CMND/CCCD', 'Ngày sinh'],
  rows: [{ row: 2, documentNumber: '000000001', birthDate: '2012-04-12' }],
});

for (const value of ['8', '8.1', '8.12345', '0', '10', '10.00000']) {
  test(`accepts documented decimal vector ${value}`, () =>
    assert.equal(compareScores(normalizeScore(value), value), 0));
}
for (const value of [
  '8.123456',
  '8.123450',
  '10.00001',
  '-1',
  '8e0',
  8.1,
  '+1',
  'NaN',
  'Infinity',
  '1,2',
  '.1',
  '1.',
  '',
  null,
  undefined,
  ' 1',
  '１',
  '0.000000',
  '0'.repeat(33),
]) {
  test(`rejects malformed decimal vector ${String(value)}`, () =>
    assert.throws(() => normalizeScore(value), ContractError));
}
test('normalization, numeric ordering, JSON and half-up retain exact raw values', () => {
  assert.equal(normalizeScore('0008.10000'), '8.1');
  assert.equal(compareScores('8.1', '8.10000'), 0);
  assert.deepEqual(['10', '8.26', '2', '8.24', '8.25'].sort(compareScores), [
    '2',
    '8.24',
    '8.25',
    '8.26',
    '10',
  ]);
  assert.deepEqual(
    ['8.24', '8.25', '8.26', '0', '10', '0.04999', '0.05000', '9.99999'].map(displayScore),
    ['8.2', '8.3', '8.3', '0.0', '10.0', '0.0', '0.1', '10.0'],
  );
  assert.equal(JSON.parse(JSON.stringify({ score: normalizeScore('8.12345') })).score, '8.12345');
  for (let scaled = 0; scaled <= 1000000; scaled += 997) {
    const raw = `${Math.floor(scaled / 100000)}.${String(scaled % 100000).padStart(5, '0')}`;
    assert.equal(compareScores(raw, normalizeScore(raw)), 0);
  }
});
test('identity syntax and BIGINT text never coerce significant digits', () => {
  for (const value of ['123456789', '123456789012', '000000001'])
    assert.equal(documentNumber(value), value);
  for (const value of [
    '12345678',
    '1234567890123',
    '１２３４５６７８９',
    '١٢٣٤٥٦٧٨٩',
    ' 123456789',
    '123456789\n',
    '123-56789',
    123456789,
  ])
    assert.throws(() => documentNumber(value));
  for (const value of ['1', '9007199254740993', '9223372036854775807'])
    assert.equal(bigintId(value), value);
  for (const value of [1, '01', '0', '-1', '9223372036854775808', '1e2'])
    assert.throws(() => bigintId(value));
});
test('strict Gregorian date codecs preserve calendar components', () => {
  assert.equal(uiDate('29/02/2000'), '2000-02-29');
  assert.equal(displayDate(uiDate('12/04/2012')), '12/04/2012');
  for (const value of ['29/02/1900', '29/02/2100', '31/04/2012', '1/04/2012', '01/01/0000'])
    assert.throws(() => uiDate(value));
  for (const value of ['2012-04-12T00:00:00Z', '2012-4-12', '2012-02-30', '0000-01-01'])
    assert.throws(() => apiDate(value));
  assert.equal(apiDate('0001-01-01'), '0001-01-01');
  assert.equal(apiDate('9999-12-31'), '9999-12-31');
});
test('Vietnam midnight and injected reference govern future dates', () => {
  const before = () => Date.UTC(2026, 9, 25, 16, 59, 59);
  const after = () => Date.UTC(2026, 9, 25, 17);
  assert.equal(vietnamToday(before), '2026-10-25');
  assert.equal(vietnamToday(after), today);
  assert.throws(() => birthDate(today, vietnamToday(before)));
  assert.equal(birthDate(today, vietnamToday(after)), today);
  assert.throws(() => birthDate('2026-10-27', today));
  assert.equal(birthDate('2012-04-12', vietnamToday(before)), '2012-04-12');
  assert.equal(birthDate('2012-04-12', vietnamToday(after)), '2012-04-12');
  assert.throws(() => vietnamToday(() => NaN));
});
test('date-only values remain identical in UTC−12, UTC and UTC+14 runtimes', () => {
  const moduleUrl = new URL('../src/utils/gradebook/dates.js', import.meta.url).href;
  for (const TZ of ['Etc/GMT+12', 'UTC', 'Pacific/Kiritimati']) {
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import {uiDate,vietnamToday} from ${JSON.stringify(moduleUrl)}; process.stdout.write(uiDate('12/04/2012')+'|'+vietnamToday(()=>1792947600000));`,
      ],
      { env: { ...process.env, TZ }, encoding: 'utf8' },
    );
    assert.equal(output, '2012-04-12|2026-10-26');
  }
});
test('Excel 1900/1904 serials use calendar arithmetic and reject fictitious days/times', () => {
  for (const [serial, system, date] of [
    [1, 1900, '1900-01-01'],
    [59, 1900, '1900-02-28'],
    [61, 1900, '1900-03-01'],
    [0, 1904, '1904-01-01'],
    [59, 1904, '1904-02-29'],
    [60, 1904, '1904-03-01'],
    [2958465, 1900, '9999-12-31'],
  ])
    assert.equal(excelDate(serial, system), date);
  assert.equal(excelDate(1462, 1900), excelDate(0, 1904));
  for (const [serial, system] of [
    [60, 1900],
    [0, 1900],
    [-1, 1904],
    [1.5, 1900],
    ['1', 1900],
    [1, 1901],
    [2958466, 1900],
    [2958465, 1904],
  ])
    assert.throws(() => excelDate(serial, system));
});
test('roster headers and name intent preserve absent/blank/value without database updates', () => {
  assert.deepEqual(normalizeRoster(roster(), today).rows[0].name, { state: 'absent' });
  const input = roster();
  input.headers.unshift('Họ tên');
  input.rows[0].fullName = '';
  assert.deepEqual(normalizeRoster(input, today).rows[0].name, { state: 'blank' });
  input.rows[0].fullName = '  Synthetic  ';
  assert.deepEqual(normalizeRoster(input, today).rows[0].name, {
    state: 'value',
    value: 'Synthetic',
  });
  assert.deepEqual(importedName('  ', true), { state: 'blank' });
  assert.deepEqual(importedScore(''), { state: 'skip' });
  assert.deepEqual(importedScore(null), { state: 'skip' });
  assert.deepEqual(importedScore('0'), { state: 'value', value: '0' });
  assert.throws(() => importedScore(undefined));
});
test('untrusted structures, hidden names, duplicates and excessive batches fail without leaking input', () => {
  const cases = [];
  let input = roster();
  input.rows[0].fullName = 'hidden';
  cases.push(input);
  input = roster();
  input.rows.push({ ...input.rows[0], row: 3 });
  cases.push(input);
  input = roster();
  input.rows[0].birthDate = '2027-01-01';
  cases.push(input);
  input = roster();
  input.rows[0].row = 1;
  cases.push(input);
  input = roster();
  input.headers.push('extra');
  input.headers.push('extra');
  cases.push(input);
  input = roster();
  input.rows = new Array(1);
  cases.push(input);
  input = roster();
  input.rows = new Array(2001);
  cases.push(input);
  input = roster();
  input.actor = 'forged';
  cases.push(input);
  for (const value of cases) assert.throws(() => normalizeRoster(value, today), ContractError);
  assert.throws(
    () =>
      allowFields(
        Object.defineProperty({}, 'value', {
          get() {
            throw Error('getter executed');
          },
          enumerable: true,
        }),
        ['value'],
      ),
    { code: 'fields' },
  );
  assert.throws(
    () => normalizeRoster({ ...roster(), secret: 'canary' }, today),
    (error) => !error.message.includes('canary'),
  );
});
test('framing uses UTF-8 byte lengths and fixed tuple order, not JSON object order', () => {
  assert.equal(frameScalar(null), 'N');
  assert.equal(frameScalar(''), 'V0:');
  assert.equal(frameScalar('ế'), 'V3:ế');
  assert.equal(frameTuple('score', ['8.1', null]), 'V5:scoreV3:8.1N');
  assert.throws(() => frameScalar(undefined));
  assert.throws(() => frameScalar('\ud800'));
  assert.notEqual(frameTuple('x', ['ab', 'c']), frameTuple('x', ['a', 'bc']));
  assert.notEqual(
    recordPresenceVector('score', false, ['9007199254740993', '1', 'math', 'final']),
    recordPresenceVector('score', true, ['9007199254740993', '1', 'math', 'final']),
  );
  assert.equal(frameScalar(normalizeScore('8.1')), frameScalar(normalizeScore('8.10000')));
  assert.notEqual(frameScalar(normalizeScore('8.24')), frameScalar(normalizeScore('8.25')));
});
test('canonical roster binds layout, source row order, optional intent and every input field', () => {
  const input = roster();
  const reorderedKeys = {
    rows: [{ birthDate: '2012-04-12', documentNumber: '000000001', row: 2 }],
    headers: input.headers,
  };
  const canonical = canonicalRosterInput(input, today);
  assert.equal(canonical, canonicalRosterInput(reorderedKeys, today));
  assert.equal(
    canonical,
    'V19:gb:preview-input:v1V6:rosterV1:2V9:CMND/CCCDV10:Ngày sinhV1:1V10:roster_rowV1:2V9:000000001V10:2012-04-12V6:absentN',
  );
  const changed = roster();
  changed.rows[0].birthDate = '2012-04-13';
  assert.notEqual(canonical, canonicalRosterInput(changed, today));
  changed.headers.unshift('Họ tên');
  changed.rows[0].fullName = '';
  assert.notEqual(canonical, canonicalRosterInput(changed, today));
  changed.rows.push({
    row: 3,
    documentNumber: '000000002',
    birthDate: '2012-04-12',
    fullName: 'Synthetic',
  });
  const reversed = {
    headers: changed.headers,
    rows: [...changed.rows].reverse().map((row, index) => ({ ...row, row: index + 2 })),
  };
  assert.notEqual(canonicalRosterInput(changed, today), canonicalRosterInput(reversed, today));
});

test('BIGINT ordering and framing holes cannot collapse distinct states', () => {
  assert.deepEqual(['9007199254740993', '10', '2', '9007199254740992'].sort(compareBigintIds), [
    '2',
    '10',
    '9007199254740992',
    '9007199254740993',
  ]);
  assert.throws(() => frameTuple('x', new Array(1)));
  assert.throws(() => recordPresenceVector('student', true, 'not-an-array'));
  assert.notEqual(frameTuple('x', [null]), frameTuple('x', ['']));
});

test('ordered score-cell input canonicalization preserves skip/zero and numeric equivalence', () => {
  const cells = ['8.1', null, '', '0', '8.24', '8.25', '10'];
  const canonical = canonicalScoreCells(cells);
  assert.equal(
    canonical,
    canonicalScoreCells(['8.10000', '', null, '0.00000', '8.24', '8.25', '10.00000']),
  );
  assert.notEqual(canonical, canonicalScoreCells(['8.1', null, '', null, '8.24', '8.25', '10']));
  assert.notEqual(canonical, canonicalScoreCells(['8.1', null, '', '0', '8.25', '8.24', '10']));
  assert.throws(() => canonicalScoreCells(new Array(7)));
  assert.throws(() => canonicalScoreCells(cells.slice(1)));
});

test('GB-B1-REV-001 trims before Unicode code-point length validation', () => {
  for (const name of ['x'.repeat(200), '😀'.repeat(200)]) {
    assert.deepEqual(importedName(name, true), { state: 'value', value: name });
    assert.deepEqual(importedName(`  ${name}  `, true), { state: 'value', value: name });
  }
  assert.throws(() => importedName('😀'.repeat(201), true));
  assert.equal(importedName('e\u0301'.repeat(100), true).value.length, 200);
  assert.throws(() => importedName('e\u0301'.repeat(101), true));
  assert.throws(() => importedName('x'.repeat(201), true));
  assert.throws(() => importedName('a\ud800', true));
  assert.throws(() => importedName('a\0b', true));
  assert.throws(() => importedName(' '.repeat(4097), true));
  assert.throws(() => importedName(null, true));
  assert.deepEqual(importedName(' \t\n ', true), { state: 'blank' });
  assert.deepEqual(importedName(undefined, false), { state: 'absent' });
  const a = roster();
  a.headers.unshift('Name');
  a.rows[0].fullName = '  Synthetic  ';
  const b = structuredClone(a);
  b.rows[0].fullName = 'Synthetic';
  assert.equal(canonicalRosterInput(a, today), canonicalRosterInput(b, today));
});

test('GB-B1-REV-002 preserves increasing source positions and rejects unsafe/unordered rows', () => {
  for (const positions of [[2, 3, 4], [2, 4, 7], [2, 100, 101], [Number.MAX_SAFE_INTEGER]]) {
    const batch = roster();
    batch.rows = positions.map((row, i) => ({
      row,
      documentNumber: String(i + 1).padStart(9, '0'),
      birthDate: '2012-04-12',
    }));
    assert.deepEqual(
      normalizeRoster(batch, today).rows.map((row) => row.row),
      positions,
    );
    assert.equal(batch.rows.length, positions.length);
  }
  for (const positions of [
    [2, 2],
    [4, 3],
    [1, 2],
    [-1],
    [2.5],
    ['2'],
    [NaN],
    [Infinity],
    [Number.MAX_SAFE_INTEGER + 1],
  ]) {
    const batch = roster();
    batch.rows = positions.map((row, i) => ({
      row,
      documentNumber: String(i + 1).padStart(9, '0'),
      birthDate: '2012-04-12',
    }));
    assert.throws(() => normalizeRoster(batch, today), { code: 'row' });
  }
  const full = roster();
  full.rows = Array.from({ length: 2000 }, (_, index) => ({
    row: 2 + index * 2,
    documentNumber: String(index + 1).padStart(9, '0'),
    birthDate: '2012-04-12',
  }));
  assert.equal(normalizeRoster(full, today).rows.length, 2000);
  full.rows.push({ row: 4002, documentNumber: '000002001', birthDate: '2012-04-12' });
  assert.throws(() => normalizeRoster(full, today), { code: 'rows' });
  const a = roster(),
    b = roster();
  b.rows[0].row = 7;
  assert.notEqual(canonicalRosterInput(a, today), canonicalRosterInput(b, today));
  b.rows[0].birthDate = 'invalid';
  assert.throws(() => normalizeRoster(b, today), { code: 'date', row: 7, column: 2 });
});

test('GB-B1-REV-003 maps physical positions independently of custom or duplicate headers', () => {
  for (const headers of [
    ['Document', 'Birthday'],
    ['same', 'same'],
    ['__proto__', '__proto__'],
    ['', ''],
    ['Ngày sinh', 'CMND/CCCD'],
  ]) {
    const row = positionalRosterRow(4, ['000000001', '2012-04-12'], headers.length);
    const batch = { headers, rows: [row] };
    assert.deepEqual(normalizeRoster(batch, today).rows[0], {
      ...roster().rows[0],
      row: 4,
      name: { state: 'absent' },
    });
    assert.deepEqual(batch.rows[0], row);
    assert.equal(
      canonicalRosterInput(batch, today),
      canonicalRosterInput(structuredClone(batch), today),
    );
  }
  const headers = ['same', 'same', 'same'];
  const row = positionalRosterRow(7, ['Synthetic', '000000001', '2012-04-12'], 3);
  assert.deepEqual(normalizeRoster({ headers, rows: [row] }, today).rows[0].name, {
    state: 'value',
    value: 'Synthetic',
  });
  assert.throws(() => normalizeRoster({ headers, rows: [{ ...row, birthDate: 'bad' }] }, today), {
    row: 7,
    column: 3,
  });
  for (const count of [0, 1, 4, 10])
    assert.throws(
      () => normalizeRoster({ headers: new Array(count).fill('x'), rows: roster().rows }, today),
      { code: 'headers' },
    );
  assert.throws(() => normalizeRoster({ headers: new Array(2), rows: roster().rows }, today));
  assert.throws(() => positionalRosterRow(2, ['000000001'], 2));
  assert.throws(() => positionalRosterRow(2, ['', '000000001', '2012-04-12'], 2));
  assert.throws(() => positionalRosterRow(2, new Array(3), 3));
  assert.throws(() => normalizeRoster({ headers: ['a', 'a'], rows: [row] }, today));
  const a = roster(),
    b = roster();
  b.headers = ['Custom', 'Custom'];
  assert.notEqual(canonicalRosterInput(a, today), canonicalRosterInput(b, today));
});
