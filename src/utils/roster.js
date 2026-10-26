/** Decodes bounded positional roster data; no matching, storage, network or mutation occurs here. */
import { normalizeRoster, positionalRosterRow } from './gradebook/imports.js';
import { uiDate, birthDate, vietnamToday } from './gradebook/dates.js';

export const ROSTER_LIMITS = Object.freeze({ bytes: 1048576, rows: 2000 });

/** Parses RFC-style quoted CSV while retaining trailing cells and original physical line numbers. */
export function csvRecords(text, maxColumns = 3) {
  if (![3, 10].includes(maxColumns)) throw Error('columns');
  if (typeof text !== 'string' || text.length > ROSTER_LIMITS.bytes || text.includes('\0'))
    throw Error('file');
  text = text.replace(/^\uFEFF/, '');
  const records = [];
  let cells = [],
    value = '',
    quoted = false,
    closed = false,
    line = 1,
    start = 1;
  const cell = () => {
    cells.push(value);
    if (cells.length > maxColumns)
      throw Object.assign(Error('columns'), { row: start, column: cells.length });
    value = '';
    closed = false;
  };
  const row = () => {
    cell();
    if (!records.length || cells.some((value) => value !== '')) records.push({ row: start, cells });
    if (records.length > ROSTER_LIMITS.rows + 1) throw Error('rows');
    cells = [];
    start = line;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        value += '\n';
        line++;
      } else value += ch;
    } else if (ch === '"' && !value && !closed) quoted = true;
    else if (ch === ',') cell();
    else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      line++;
      row();
      start = line;
    } else {
      if (closed || ch === '"') throw Error('csv');
      value += ch;
    }
    if (cells.length > maxColumns || value.length > 4096) throw Error('columns');
  }
  if (quoted) throw Error('csv');
  if (value || cells.length || closed || !records.length) row();
  return records;
}

/** Validates every declared row with B1 contracts and returns safe coordinates, never cell payloads. */
export function rosterBatch(records, today = vietnamToday()) {
  const headers = records[0]?.cells;
  if (!headers || ![2, 3].includes(headers.length)) throw Error('columns');
  const width = headers.length,
    rows = [],
    errors = [],
    seen = new Set();
  let count = 0;
  for (const record of records.slice(1)) {
    if (record.cells.every((v) => v === '' || v === null)) continue;
    if (++count > ROSTER_LIMITS.rows) throw Error('rows');
    const row = record.row,
      idColumn = width === 3 ? 2 : 1;
    if (record.cells.length !== width) {
      errors.push({ row, column: Math.min(record.cells.length + 1, width + 1), code: 'columns' });
      continue;
    }
    try {
      const values = record.cells.map((v) => v ?? '');
      if (typeof values[idColumn - 1] !== 'string')
        throw Object.assign(Error('identity'), { row, column: idColumn });
      const dateCell = values[width - 1];
      try {
        values[width - 1] = birthDate(
          dateCell?.kind === 'date' ? dateCell.value : uiDate(dateCell),
          today,
        );
      } catch {
        throw Object.assign(Error('date'), { row, column: width });
      }
      const mapped = positionalRosterRow(row, values, width);
      normalizeRoster({ headers, rows: [mapped] }, today);
      if (seen.has(mapped.documentNumber))
        throw Object.assign(Error('duplicate'), {
          row,
          column: idColumn,
          code: 'duplicate_identity',
        });
      seen.add(mapped.documentNumber);
      rows.push(mapped);
    } catch (error) {
      errors.push({ row, column: error.column || idColumn, code: error.code || 'invalid' });
    }
  }
  if (!count) throw Error('empty');
  return { headers: [...headers], rows, errors, count, width };
}
