/** Presentation-only OOXML workbook builder for administrator exports. No formulas or persistence. */
import { zipSync } from 'fflate';

const encoder = new TextEncoder();
const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relationshipNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageNs = 'http://schemas.openxmlformats.org/package/2006/relationships';
const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const escapeXml = (value) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/gu, '\uFFFD')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

function columnLetter(n) {
  let result = '';
  for (let i = n; i > 0; i = Math.floor((i - 1) / 26))
    result = String.fromCharCode(65 + ((i - 1) % 26)) + result;
  return result;
}

const widths = {
  students: [32, 20, 18, 22],
  scores: [29, 20, 18, 20, 26, 19, 19, 19, 19, 15, 15, 15],
};

function cell(value, x, y, style) {
  // Inline strings, including raw score decimals and identifiers, cannot execute formulas.
  return (
    '<c r="' +
    columnLetter(x + 1) +
    y +
    '" s="' +
    style +
    '" t="inlineStr"><is><t xml:space="preserve">' +
    escapeXml(value) +
    '</t></is></c>'
  );
}

function rowXml(index, cells, height) {
  return '<row r="' + index + '" ht="' + height + '" customHeight="1">' + cells.join('') + '</row>';
}

const fontXml = [
  '<font><sz val="10"/><color rgb="FF2B3C39"/><name val="Arial"/><family val="2"/></font>',
  '<font><b/><sz val="17"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font>',
  '<font><sz val="10"/><color rgb="FF235E4A"/><name val="Arial"/><family val="2"/></font>',
  '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font>',
  '<font><b/><sz val="10"/><color rgb="FF1F4C3C"/><name val="Arial"/><family val="2"/></font>',
  '<font><b/><sz val="9"/><color rgb="FF17663F"/><name val="Arial"/><family val="2"/></font>',
  '<font><b/><sz val="9"/><color rgb="FF9A4818"/><name val="Arial"/><family val="2"/></font>',
];
const fillColors = [
  'FF235E4A',
  'FF316B56',
  'FFE8F3ED',
  'FFFFFFFF',
  'FFF5FAF7',
  'FFE6F5E9',
  'FFFFF0E2',
];
const fillXml = [
  '<fill><patternFill patternType="none"/></fill>',
  '<fill><patternFill patternType="gray125"/></fill>',
  ...fillColors.map(
    (color) =>
      '<fill><patternFill patternType="solid"><fgColor rgb="' +
      color +
      '"/><bgColor indexed="64"/></patternFill></fill>',
  ),
];
const borderXml = [
  '<border><left/><right/><top/><bottom/><diagonal/></border>',
  '<border><left/><right/><top/><bottom style="hair"><color rgb="FFDCEAE2"/></bottom><diagonal/></border>',
  '<border><left style="thin"><color rgb="FFDCEAE2"/></left><right style="thin"><color rgb="FFDCEAE2"/></right><top style="thin"><color rgb="FFDCEAE2"/></top><bottom style="thin"><color rgb="FFDCEAE2"/></bottom><diagonal/></border>',
];
// style: [font, fill, border, alignment, wrap]. All data cells remain typed as text.
const formats = [
  [0, 0, 0, 'left', false],
  [1, 2, 0, 'left', false],
  [2, 4, 0, 'left', false],
  [3, 3, 2, 'center', true],
  [3, 2, 2, 'center', true],
  [0, 5, 1, 'left', false],
  [0, 6, 1, 'left', false],
  [4, 5, 1, 'left', false],
  [4, 6, 1, 'left', false],
  [0, 5, 1, 'center', false],
  [0, 6, 1, 'center', false],
  [0, 5, 1, 'center', false],
  [0, 6, 1, 'center', false],
  [5, 7, 1, 'center', false],
  [6, 8, 1, 'center', false],
  [0, 5, 1, 'left', false],
  [0, 6, 1, 'left', false],
];
const stylesXml =
  xmlDeclaration +
  '<styleSheet xmlns="' +
  ns +
  '"><fonts count="' +
  fontXml.length +
  '">' +
  fontXml.join('') +
  '</fonts><fills count="' +
  fillXml.length +
  '">' +
  fillXml.join('') +
  '</fills><borders count="' +
  borderXml.length +
  '">' +
  borderXml.join('') +
  '</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' +
  formats.length +
  '">' +
  formats
    .map(
      ([font, fill, border, horizontal, wrap]) =>
        '<xf numFmtId="49" fontId="' +
        font +
        '" fillId="' +
        fill +
        '" borderId="' +
        border +
        '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" quotePrefix="1" applyAlignment="1"><alignment horizontal="' +
        horizontal +
        '" vertical="center"' +
        (wrap ? ' wrapText="1"' : '') +
        '/></xf>',
    )
    .join('') +
  '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

function sheetXml({ name, title, columns, rows, kind, index }) {
  const lastColumn = columnLetter(columns.length);
  const end = Math.max(4, rows.length + 4);
  const frozenColumns = kind === 'scores' ? 3 : 2;
  const topLeft = columnLetter(frozenColumns + 1) + '5';
  const grid = [];
  grid.push(rowXml(1, [cell(title, 0, 1, 1)], 44));
  grid.push(
    rowXml(
      2,
      [
        cell(
          'NỘI BỘ  ·  ' +
            new Set(rows.map((entry) => entry[1])).size +
            ' học sinh  ·  ' +
            (kind === 'scores' ? rows.length + ' dòng môn học  ·  ' : '') +
            'Dữ liệu giữ nguyên, không làm tròn',
          0,
          2,
          2,
        ),
      ],
      28,
    ),
  );
  grid.push(rowXml(3, [], 12));
  grid.push(
    rowXml(
      4,
      columns.map((heading, x) => cell(heading, x, 4, kind === 'scores' && x >= 5 ? 4 : 3)),
      38,
    ),
  );
  let lastIdentity;
  let group = -1;
  rows.forEach((entry, index) => {
    if (index === 0 || lastIdentity !== entry[1]) group++;
    lastIdentity = entry[1];
    const even = group % 2 === 1;
    const cells = entry.map((value, x) => {
      let style = even ? 6 : 5;
      if (x === 0) style = even ? 8 : 7;
      else if (x === 1 || x === 2) style = even ? 10 : 9;
      else if (x === 3) style = value === 'Đã ngừng' ? 14 : 13;
      else if (kind === 'scores' && x === 4) style = even ? 16 : 15;
      else if (kind === 'scores' && x > 4) style = even ? 12 : 11;
      return cell(value, x, index + 5, style);
    });
    grid.push(rowXml(index + 5, cells, 25));
  });
  const columnXml = widths[kind]
    .map(
      (width, x) =>
        '<col min="' + (x + 1) + '" max="' + (x + 1) + '" width="' + width + '" customWidth="1"/>',
    )
    .join('');
  return (
    xmlDeclaration +
    '<worksheet xmlns="' +
    ns +
    '"><sheetPr><tabColor rgb="' +
    (index === 0 ? 'FF235E4A' : 'FF498675') +
    '"/><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:' +
    lastColumn +
    end +
    '"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane xSplit="' +
    frozenColumns +
    '" ySplit="4" topLeftCell="' +
    topLeft +
    '" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="' +
    topLeft +
    '" sqref="' +
    topLeft +
    '"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="22"/><cols>' +
    columnXml +
    '</cols><sheetData>' +
    grid.join('') +
    '</sheetData><mergeCells count="2"><mergeCell ref="A1:' +
    lastColumn +
    '1"/><mergeCell ref="A2:' +
    lastColumn +
    '2"/></mergeCells><autoFilter ref="A4:' +
    lastColumn +
    end +
    '"/><printOptions horizontalCentered="1"/><pageMargins left="0.35" right="0.35" top="0.55" bottom="0.55" header="0.2" footer="0.2"/><pageSetup orientation="' +
    (kind === 'scores' ? 'landscape' : 'portrait') +
    '" paperSize="' +
    (kind === 'scores' ? '8' : '9') +
    '" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;CTrang &amp;P / &amp;N</oddFooter></headerFooter></worksheet>'
  );
}

/** Formats roster as one sheet, or splits score rows into exactly two semester sheets. */
export function styledXlsxBytes(rows, kind) {
  if (
    !['students', 'scores'].includes(kind) ||
    !Array.isArray(rows) ||
    !rows.length ||
    rows.length > 32001
  )
    throw Error('export_size');

  const expectedWidth = kind === 'scores' ? 13 : 4;
  if (rows.some((row) => !Array.isArray(row) || row.length !== expectedWidth))
    throw Error('export_columns');

  let sheets;
  if (kind === 'scores') {
    const columns = rows[0].filter((_, index) => index !== 4);
    const data = rows.slice(1);
    if (data.some((row) => !['Học kỳ I', 'Học kỳ II'].includes(row[4])))
      throw Error('export_semester');
    const pick = (semester) =>
      data.filter((row) => row[4] === semester).map((row) => row.filter((_, index) => index !== 4));
    sheets = [
      {
        name: 'HKI',
        title: 'BẢNG ĐIỂM  ·  HỌC KỲ I',
        kind,
        columns,
        rows: pick('Học kỳ I'),
      },
      {
        name: 'HKII',
        title: 'BẢNG ĐIỂM  ·  HỌC KỲ II',
        kind,
        columns,
        rows: pick('Học kỳ II'),
      },
    ];
  } else {
    sheets = [
      {
        name: 'Học sinh',
        title: 'DANH SÁCH HỌC SINH',
        kind,
        columns: rows[0],
        rows: rows.slice(1),
      },
    ];
  }
  const sheetElements = sheets
    .map(
      (sheet, index) =>
        '<sheet name="' +
        escapeXml(sheet.name) +
        '" sheetId="' +
        (index + 1) +
        '" r:id="rId' +
        (index + 1) +
        '"/>',
    )
    .join('');
  const workbookXml =
    xmlDeclaration +
    '<workbook xmlns="' +
    ns +
    '" xmlns:r="' +
    relationshipNs +
    '"><bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
    sheetElements +
    '</sheets></workbook>';
  const relsXml =
    xmlDeclaration +
    '<Relationships xmlns="' +
    packageNs +
    '">' +
    sheets
      .map(
        (_, index) =>
          '<Relationship Id="rId' +
          (index + 1) +
          '" Type="' +
          relationshipNs +
          '/worksheet" Target="worksheets/sheet' +
          (index + 1) +
          '.xml"/>',
      )
      .join('') +
    '<Relationship Id="rId' +
    (sheets.length + 1) +
    '" Type="' +
    relationshipNs +
    '/styles" Target="styles.xml"/></Relationships>';
  const contentTypes =
    xmlDeclaration +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets
      .map(
        (_, index) =>
          '<Override PartName="/xl/worksheets/sheet' +
          (index + 1) +
          '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
      )
      .join('') +
    '</Types>';
  const files = {
    '[Content_Types].xml': contentTypes,
    '_rels/.rels':
      xmlDeclaration +
      '<Relationships xmlns="' +
      packageNs +
      '"><Relationship Id="rId1" Type="' +
      relationshipNs +
      '/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': workbookXml,
    'xl/_rels/workbook.xml.rels': relsXml,
    'xl/styles.xml': stylesXml,
  };
  sheets.forEach((sheet, index) => {
    files['xl/worksheets/sheet' + (index + 1) + '.xml'] = sheetXml({ ...sheet, index });
  });
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, contents]) => [name, encoder.encode(contents)]),
    ),
  );
}
