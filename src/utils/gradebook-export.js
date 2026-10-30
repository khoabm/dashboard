/** Pure, offline-safe CSV and minimal OOXML writer; no hidden persistence or spreadsheet formulas. */
import { zipSync } from 'fflate';

const encoder = new TextEncoder();
const headers = {
  students: ['Họ tên', 'CMND/CCCD', 'Ngày sinh', 'Trạng thái'],
  scores: [
    'Họ tên', 'CMND/CCCD', 'Ngày sinh', 'Trạng thái', 'Học kỳ', 'Môn',
    'Thường xuyên 1', 'Thường xuyên 2', 'Thường xuyên 3', 'Thường xuyên 4',
    '1 tiết', 'Giữa kì', 'Cuối kì',
  ],
};
const status = (entry) => entry.active ? 'Đang sử dụng' : 'Đã ngừng';
const safeCell = (value) => {
  const text = String(value ?? '');
  // Protect when a CSV file is opened in spreadsheet software; neutralize active formula prefixes.
  return /^[\s\u0000-\u001f]*[=+@\-\t\r]/u.test(text) ? `'${text}` : text;
};
const csvCell = (value) => `"${safeCell(value).replaceAll('"', '""')}"`;
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export function exportRows(kind, entries, catalog) {
  if (!Object.hasOwn(headers, kind) || !Array.isArray(entries) || entries.length > 300) {
    throw Error('export_scope');
  }
  // The export must be explicitly authorized; empty identifiers would create a misleading file.
  for (const entry of entries) {
    if (!/^\d{9,12}$/.test(entry.documentNumber)) throw Error('export_identity');
  }
  if (kind === 'students') return [headers.students, ...entries.map((entry) => [
    entry.fullName ?? '', entry.documentNumber, entry.birthDate, status(entry),
  ])];
  if (!Array.isArray(catalog?.subjects) || !Array.isArray(catalog?.scoreColumns)) {
    throw Error('export_catalog');
  }
  const rows = [headers.scores];
  for (const entry of entries) {
    for (const semester of [1, 2]) {
      for (const subject of catalog.subjects) {
        const scores = entry[semester === 1 ? 'scores1' : 'scores2'] || [];
        rows.push([
          entry.fullName ?? '', entry.documentNumber, entry.birthDate, status(entry),
          `Học kỳ ${semester === 1 ? 'I' : 'II'}`, subject.displayName,
          ...catalog.scoreColumns.map((column) =>
            scores.find((score) => score.subjectCode === subject.code &&
              score.columnCode === column.code)?.rawScore ?? ''),
        ]);
      }
    }
  }
  return rows;
}

export function csvBytes(rows) {
  return encoder.encode('\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n');
}
const col = (n) => {
  let out = '';
  for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) out = String.fromCharCode(65 + (i - 1) % 26) + out;
  return out;
};
export function xlsxBytes(rows, sheetName = 'Du lieu') {
  if (!Array.isArray(rows) || rows.length > 10000) throw Error('export_size');
  const sheet = rows.map((row, y) => `<row r="${y + 1}">${row.map((value, x) => {
    // Always inline strings: no unsafe formulas, and dates/IDs/raw decimals keep exact lexical form.
    const text = xml(safeCell(value));
    return `<c r="${col(x + 1)}${y + 1}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
  }).join('')}</row>`).join('');
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`,
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([name, content]) => [name, encoder.encode(content)])));
}
export function downloadExport(kind, format, entries, catalog) {
  if (!['csv', 'xlsx'].includes(format)) throw Error('export_format');
  const rows = exportRows(kind, entries, catalog);
  const bytes = format === 'csv' ? csvBytes(rows) : xlsxBytes(rows, kind === 'scores' ? 'Bang diem' : 'Hoc sinh');
  const mime = format === 'csv' ? 'text/csv;charset=utf-8' :
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `lop-hoc-${kind}-${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
