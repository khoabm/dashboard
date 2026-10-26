/** Reads local roster files in memory; lazy XLSX dependencies never enter the initial Board graph. */
import { csvRecords, rosterBatch, ROSTER_LIMITS } from '../utils/roster.js';
import { excelDate, apiDate } from '../utils/gradebook/dates.js';

const elements = (node, name) => [...node.getElementsByTagNameNS('*', name)];

/** Rejects XML features that could hide formulas/external data; never renders file markup as HTML. */
function xml(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw Error('xml');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (elements(doc, 'parsererror').length) throw Error('xml');
  return doc;
}

/** Inspects layout/date metadata only; the library owns shared strings and XLSX value decoding. */
function prepareWorkbook(files) {
  for (const [name, bytes] of Object.entries(files)) {
    if (/externalLinks|vbaProject|\.bin$/i.test(name)) throw Error('external');
    if (/\.xml(?:\.rels)?$/.test(name)) {
      const doc = xml(bytes);
      if (elements(doc, 'Relationship').some((r) => r.getAttribute('TargetMode') === 'External'))
        throw Error('external');
    }
  }
  const workbook = xml(files['xl/workbook.xml']);
  const sheet = elements(workbook, 'sheet')[0];
  const relation =
    sheet?.getAttributeNS(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'id',
    ) || sheet?.getAttribute('r:id');
  const rel = elements(xml(files['xl/_rels/workbook.xml.rels']), 'Relationship').find(
    (r) => r.getAttribute('Id') === relation,
  );
  if (!rel) throw Error('sheet');
  const target = new URL(rel.getAttribute('Target'), 'https://xlsx.invalid/xl/workbook.xml');
  const name = target.pathname.slice(1);
  if (
    target.origin !== 'https://xlsx.invalid' ||
    !name.startsWith('xl/worksheets/') ||
    !files[name]
  )
    throw Error('sheet');
  const doc = xml(files[name]);
  const sheetData = elements(doc, 'sheetData')[0];
  if (!sheetData || elements(doc, 'mergeCell').length) throw Error('sheet');
  const rows = [],
    original = new Map();
  let width = 0,
    previous = 0;
  const dimension = elements(doc, 'dimension')[0]
    ?.getAttribute('ref')
    ?.split(':')
    .at(-1)
    ?.match(/^([A-Z]+)[0-9]+$/);
  if (dimension) width = [...dimension[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const emptyShared = new Set();
  if (files['xl/sharedStrings.xml'])
    elements(xml(files['xl/sharedStrings.xml']), 'si').forEach((item, i) => {
      if (!elements(item, 't').some((t) => t.textContent !== '')) emptyShared.add(i);
    });
  for (const row of elements(sheetData, 'row')) {
    const number = Number(row.getAttribute('r'));
    if (!Number.isSafeInteger(number) || number <= previous || number > 1048576) throw Error('row');
    previous = number;
    const metadata = [];
    for (const cell of elements(row, 'c')) {
      const match = /^([A-Z]+)([1-9][0-9]*)$/.exec(cell.getAttribute('r') || '');
      if (!match || Number(match[2]) !== number) throw Error('cell');
      const column = [...match[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
      if (column > 3 || metadata[column - 1]) throw Error('columns');
      width = Math.max(width, column);
      if (elements(cell, 'f').length)
        throw Object.assign(Error('formula'), { row: number, column });
      const type = cell.getAttribute('t') || 'n';
      const value = elements(cell, 'v')[0]?.textContent ?? '';
      metadata[column - 1] = { type, value };
    }
    const nonempty =
      metadata.some(
        (c) => c && c.value !== '' && !(c.type === 's' && emptyShared.has(Number(c.value))),
      ) || elements(row, 't').some((c) => c.textContent !== '');
    if (number === 1 || nonempty) {
      rows.push(row);
      original.set(number, metadata);
    }
  }
  if (![2, 3].includes(width) || rows.length > 2001) throw Error('columns');
  // Compact only gaps for the reader; preserve physical source rows separately, with no arbitrary row-number cap.
  if (!rows.length || Number(rows[0].getAttribute('r')) !== 1) {
    const header = doc.createElementNS(sheetData.namespaceURI, 'row');
    header.setAttribute('r', '1');
    rows.unshift(header);
    original.set(1, []);
  }
  const mapping = [];
  sheetData.replaceChildren();
  rows.forEach((row, index) => {
    const source = Number(row.getAttribute('r'));
    mapping.push({ row: source, cells: original.get(source) });
    row.setAttribute('r', String(index + 1));
    for (const cell of elements(row, 'c'))
      cell.setAttribute('r', cell.getAttribute('r').replace(/[0-9]+$/, String(index + 1)));
    sheetData.append(row);
  });
  elements(doc, 'dimension').forEach((d) => d.remove());
  files[name] = new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
  return {
    mapping,
    width,
    epoch: elements(workbook, 'workbookPr')[0]
      ?.getAttribute('date1904')
      ?.match(/^(1|true)$/)
      ? 1904
      : 1900,
    sheetName: sheet.getAttribute('name'),
  };
}

/** Terminates parsing on timeout/abort; raw file bytes and worker state are never persisted. */
async function xlsxRecords(bytes, signal) {
  const [{ rosterArchive }, { zipSync }] = await Promise.all([
    import('../utils/roster-archive.js'),
    import('fflate'),
  ]);
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const files = rosterArchive(bytes);
  const meta = prepareWorkbook(files);
  const packed = zipSync(files, { level: 0 });
  const values = await new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./roster-worker.js', import.meta.url), { type: 'module' });
    const abort = () => finish(null, new DOMException('Cancelled', 'AbortError'));
    const finish = (value, error) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
      error ? reject(error) : resolve(value);
    };
    const timer = setTimeout(() => finish(null, Error('timeout')), 15000);
    worker.onmessage = (e) => (e.data.error ? finish(null, Error('xlsx')) : finish(e.data.rows));
    worker.onerror = () => finish(null, Error('xlsx'));
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) return abort();
    worker.postMessage(packed.buffer, [packed.buffer]);
  });
  const records = meta.mapping.map((record, index) => ({
    row: record.row,
    cells: Array.from({ length: meta.width }, (_, col) => {
      const cell = record.cells[col];
      const value = values[index]?.[col] ?? '';
      if (index === 0) return typeof value === 'string' ? value : cell?.value || '';
      const idCol = meta.width === 3 ? 1 : 0;
      if (col === idCol && cell && !['s', 'inlineStr'].includes(cell.type) && cell.value !== '')
        return { kind: 'numeric-identity' };
      if (col === meta.width - 1 && cell?.value !== '') {
        if (cell?.type === 'n') {
          try {
            return { kind: 'date', value: excelDate(Number(cell.value), meta.epoch) };
          } catch {
            return { kind: 'date', value: 'invalid' };
          }
        }
        if (cell?.type === 'd') {
          if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:T00:00:00(?:\.0+)?Z?)?$/.test(cell.value))
            throw Error('date');
          return { kind: 'date', value: apiDate(cell.value.slice(0, 10)) };
        }
      }
      return value;
    }),
  }));
  return { records, sheetName: meta.sheetName };
}

export async function readRosterFile(file, { signal } = {}) {
  if (!file || file.size > ROSTER_LIMITS.bytes || file.size === 0) throw Error('file');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  let records,
    sheetName = null;
  if (/\.csv$/i.test(file.name))
    records = csvRecords(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  else if (/\.xlsx$/i.test(file.name)) ({ records, sheetName } = await xlsxRecords(bytes, signal));
  else throw Error('type');
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  return { ...rosterBatch(records), sheetName };
}
