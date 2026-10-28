/** Finite pure file/ZIP contracts; no endpoint, browser, Auth, SQL or hosted traffic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { csvRecords, rosterBatch } from '../src/utils/roster.js';
import { rosterArchive } from '../src/utils/roster-archive.js';
const today = '2026-10-26';

test('CP03-T05 two physical columns accept renamed/blank/duplicate headers and preserve identifier text', () => {
  for (const header of [',', 'custom,custom', '\uFEFFID,DOB']) {
    const result = rosterBatch(csvRecords(header + '\r\n000000009,29/02/2000'), today);
    assert.equal(result.errors.length, 0);
    assert.equal(result.width, 2);
    assert.deepEqual(result.rows[0], {
      row: 2,
      documentNumber: '000000009',
      birthDate: '2000-02-29',
    });
    assert.equal(Object.hasOwn(result.rows[0], 'fullName'), false);
  }
});

test('CP03-T06 three-column blank name preserves blank intent; quoting/commas/newlines retain source row', () => {
  const records = csvRecords(',,\n"Tên,\n giả lập",000000009,29/02/2000\n,000000010,01/03/2000');
  const result = rosterBatch(records, today);
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[0].fullName, 'Tên,\n giả lập');
  assert.equal(result.rows[1].row, 4);
  assert.equal(result.rows[1].fullName, '');
  assert.equal(result.width, 3);
});

test('CP03-T07 XLSX typed dates use B1 calendar value; numeric identities, impossible dates and extra trailing columns reject', () => {
  const header = { row: 1, cells: ['', ''] };
  const result = rosterBatch(
    [header, { row: 9, cells: ['000000009', { kind: 'date', value: '2000-02-29' }] }],
    today,
  );
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[0].row, 9);
  for (const cells of [
    [{ kind: 'number', value: '123456789' }, '29/02/2000'],
    ['000000009', '29/02/1900'],
    ['000000009', '29/02/2000', ''],
  ]) {
    assert.equal(rosterBatch([header, { row: 2, cells }], today).errors.length, 1);
  }
  assert.throws(() => csvRecords('a,b\n"unterminated,cell'));
  assert.throws(() => csvRecords('a,b\n"quoted"junk,date'));
});

test('CP03-T08 duplicates and partial rows report original physical row/column; only entirely empty rows skip', () => {
  const result = rosterBatch(
    csvRecords('a,b\n\n000000009,29/02/2000\n,\n000000009,01/01/2001\n ,01/01/2001'),
    today,
  );
  assert.equal(result.count, 3);
  assert.deepEqual(
    result.errors.map((e) => [e.row, e.column]),
    [
      [5, 1],
      [6, 1],
    ],
  );
  assert.equal(result.rows[0].row, 3);
  assert.equal(result.errors[0].code, 'duplicate_identity');
  assert.throws(() => rosterBatch(csvRecords('a,b\n,'), today));
});

test('CP03-T07 archive rejects traversal/missing workbook and enforces finite entry count before XLSX parsing', () => {
  const base = {
    'xl/workbook.xml': strToU8('<workbook/>'),
    'xl/_rels/workbook.xml.rels': strToU8('<Relationships/>'),
  };
  assert.ok(rosterArchive(zipSync(base))['xl/workbook.xml']);
  assert.throws(() => rosterArchive(zipSync({ '../escape': new Uint8Array() })));
  assert.throws(() => rosterArchive(new Uint8Array([1, 2, 3])));
  const entries = {
    ...base,
    ...Object.fromEntries(Array.from({ length: 199 }, (_, i) => [`entry${i}`, new Uint8Array()])),
  };
  assert.throws(() => rosterArchive(zipSync(entries, { level: 0 })));
});
