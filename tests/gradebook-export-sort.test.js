/** Pure complete-dataset sorting, file round-trips and decoded DTO denial; no API or database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import readXlsxFile from 'read-excel-file/node';
import { sortGradebookRows } from '../src/components/gradebook-table-controls.js';
import { exportRows, csvBytes, xlsxBytes } from '../src/utils/gradebook-export.js';
import { snapshotStudents } from '../src/utils/gradebook-snapshot.js';
import { compareScoreCells } from '../src/utils/gradebook-scores.js';
import { adminPayload } from '../src/utils/gradebook-admin-responses.js';
import { fixtureContext } from './student-gradeboard-data.js';

const classId = '30000000-0000-4000-8000-000000000001';
const classroom = {
  id: classId,
  revision: '1',
  name: 'Synthetic',
  schoolYear: '2026',
  semester1Published: false,
  semester2Published: true,
};
const catalog = fixtureContext();
const entries = Array.from({ length: 43 }, (_, index) => ({
  id: String(9007199254740993n + BigInt(index)),
  classId,
  revision: '1',
  fullName: index % 2 ? 'An' : 'Bình',
  birthDate: index % 2 ? '2000-02-29' : '2001-01-01',
  documentOrder: 42 - index,
  documentNumber: `000000${100 + index}`,
  active: index !== 42,
  scores1: [
    {
      subjectCode: 'item_0',
      columnCode: 'item_0',
      rawScore: ['8.26', '8.24', '8.25'][index % 3],
      revision: '1',
    },
  ],
  scores2: [{ subjectCode: 'item_7', columnCode: 'item_6', rawScore: '8.12345', revision: '1' }],
}));
/** Reads the writer's quoted CSV with an independent token expression, including embedded newlines. */
const decodedCsv = (bytes, width) => {
  const cells = [...new TextDecoder().decode(bytes).matchAll(/"((?:""|[^"])*)"(?:,|\r\n)/g)].map(
    (match) => match[1].replaceAll('""', '"'),
  );
  return Array.from({ length: cells.length / width }, (_, i) =>
    cells.slice(i * width, (i + 1) * width),
  );
};
const envelope = (students) => ({
  class: classroom,
  students,
  requestId: '00000000-0000-4000-8000-000000000001',
});

test('full class default order crosses page boundaries; ASC/DESC and stable large IDs do not mutate input', () => {
  const before = structuredClone(entries);
  const sorted = sortGradebookRows(entries);
  assert.equal(sorted.length, 43);
  assert.equal(sorted[0].id, entries[41].id);
  assert.equal(sorted[21].id, entries[42].id);
  for (const key of ['name', 'document', 'birthDate', 'active']) {
    const asc = sortGradebookRows(entries, { key, direction: 'asc' });
    const desc = sortGradebookRows(entries, { key, direction: 'desc' });
    assert.equal(new Set(asc.map((row) => row.id)).size, 43);
    assert.notEqual(asc[0].id, desc[0].id);
  }
  assert.deepEqual(entries, before);
});

test('both semesters join beyond page 2; raw decimals sort distinctly, with missing last both ways', () => {
  const students = snapshotStudents({ students: entries }, 1, classId, catalog);
  const options = { subject: 'item_0', rawCompare: compareScoreCells };
  students.push({ ...students[0], id: '99999', cells: new Map() });
  for (const direction of ['asc', 'desc']) {
    const ordered = sortGradebookRows(students, { key: 'score:item_0', direction }, options);
    assert.equal(ordered.at(-1).id, '99999');
    assert.equal(
      ordered[0].cells.get('item_0|item_0').rawScore,
      direction === 'asc' ? '8.24' : '8.26',
    );
  }
  const second = snapshotStudents({ students: entries }, 2, classId, catalog);
  assert.equal(second[42].cells.get('item_7|item_6').rawScore, '8.12345');
});

test('snapshot decoded DTO rejects plaintext in sorting, wrong class, duplicate IDs/ranks and malformed points', () => {
  const body = { op: 'class.snapshot', classId, purpose: 'sort' };
  const rows = entries.map(({ documentNumber, ...row }) => row);
  const result = adminPayload(body, envelope(rows));
  assert.equal(result.students.length, 43);
  assert.equal(result.students[0].documentNumber, undefined);
  assert.throws(() => adminPayload(body, envelope(entries)));
  assert.throws(() => adminPayload(body, envelope([rows[0], rows[0]])));
  assert.throws(() =>
    adminPayload(body, envelope([{ ...rows[0], classId: '00000000-0000-4000-8000-000000000001' }])),
  );
  assert.throws(() =>
    adminPayload(
      body,
      envelope([
        {
          ...rows[0],
          documentOrder: 0,
          scores1: [{ ...rows[0].scores1[0], rawScore: '8.123456' }],
        },
      ]),
    ),
  );
  assert.throws(() => adminPayload({ ...body, purpose: 'export' }, envelope(entries)));
  assert.equal(
    adminPayload({ ...body, purpose: 'export', confirmed: true }, envelope(entries)).students[42]
      .documentNumber,
    entries[42].documentNumber,
  );
});

test('CSV and XLSX export all 43 students and 688 subject/semester rows, including inactive and exact points', async () => {
  for (const kind of ['students', 'scores']) {
    const rows = exportRows(kind, entries, catalog);
    assert.equal(rows.length, kind === 'students' ? 44 : 689);
    const decoded = decodedCsv(csvBytes(rows), rows[0].length);
    assert.equal(decoded.length, rows.length);
    assert.equal(decoded.at(-1)[1], entries[42].documentNumber);
    const workbook = (await readXlsxFile(Buffer.from(xlsxBytes(rows)), { sheet: 1 }))[0].data;
    assert.deepEqual(
      workbook.map((row) => Array.from({ length: rows[0].length }, (_, i) => row[i] ?? '')),
      rows,
    );
    assert.equal(workbook.at(-1)[1], entries[42].documentNumber);
    if (kind === 'scores') assert.equal(workbook.at(-1).at(-1), '8.12345');
  }
});

test('empty lists export headers only in both formats; unconfirmed identities and invalid formats fail closed', async () => {
  for (const kind of ['students', 'scores']) {
    const rows = exportRows(kind, [], catalog);
    assert.equal(rows.length, 1);
    assert.deepEqual(
      (await readXlsxFile(Buffer.from(xlsxBytes(rows)), { sheet: 1 }))[0].data,
      rows,
    );
    assert.equal(decodedCsv(csvBytes(rows), rows[0].length).length, 1);
  }
  assert.throws(() => exportRows('students', [{ ...entries[0], documentNumber: undefined }]));
  assert.throws(() => exportRows('unknown', entries, catalog));
});

test('CSV neutralizes formula prefixes; XLSX uses string cells without formulas or external links', () => {
  const values = [
    '=HYPERLINK("bad")',
    '+1',
    '-1',
    '@SUM(A1)',
    '\t=1',
    '000000009',
    '8.12345',
    'A,"B"\nC',
    '<name>&',
  ];
  const csv = new TextDecoder().decode(csvBytes([values]));
  assert.match(csv, /"'=HYPERLINK/);
  const files = unzipSync(xlsxBytes([values]));
  assert.equal(Object.keys(files).length, 5);
  const xml = strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.doesNotMatch(xml, /<f[ >]|externalLink/);
  assert.match(xml, /000000009/);
  assert.match(xml, /&lt;name&gt;&amp;/);
  const safe = strFromU8(
    unzipSync(xlsxBytes([['name\u0001\u000b\uffff']]))['xl/worksheets/sheet1.xml'],
  );
  assert.doesNotMatch(safe, /[\u0001\u000b\uffff]/u);
  assert.match(safe, /name���/u);
});
