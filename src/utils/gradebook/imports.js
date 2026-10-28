/** Normalizes bounded roster/score input without matching records or performing UPSERT. */
import { allowFields, ContractError, documentNumber, requireContract } from './contracts.js';
import { birthDate, vietnamToday } from './dates.js';
import { normalizeScore } from './decimal.js';

// Default template labels only; data mapping never uses these strings.
export const ROSTER_HEADERS = Object.freeze({
  required: Object.freeze(['CMND/CCCD', 'Ngày sinh']),
  named: Object.freeze(['Họ tên', 'CMND/CCCD', 'Ngày sinh']),
});

/**
 * Preserves absent, blank and nonblank name intent; blank never represents a deletion.
 *
 * @param {string|undefined} value - The declared cell value.
 * @param {boolean} present - Whether the field was supplied.
 * @returns {object} An absent/blank/value intent record.
 */
export function importedName(value, present) {
  if (!present) {
    requireContract(value === undefined, 'name');
    return { state: 'absent' };
  }
  // Bound raw input before scanning; PostgreSQL char_length counts Unicode code points.
  requireContract(
    typeof value === 'string' &&
      value.length <= 4096 &&
      value.isWellFormed() &&
      !value.includes('\0'),
    'name',
  );
  const text = value.trim();
  if (!text) return { state: 'blank' };
  requireContract(Array.from(text).length <= 200, 'name');
  return { state: 'value', value: text };
}

/**
 * Distinguishes a skipped blank cell from an authoritative decimal-string score, including zero.
 *
 * @param {string|null} value - The raw cell.
 * @returns {object} A skip or canonical value record.
 */
export function importedScore(value) {
  if (value === null || value === '') return { state: 'skip' };
  return { state: 'value', value: normalizeScore(value) };
}

/**
 * Validates a complete declared roster batch; captures today once for all rows.
 *
 * @param {object} input - Exact headers and ordered transport rows.
 * @param {string} today - The captured Vietnam reference day.
 * @returns {object} A newly normalized roster; no matching or writes occur.
 */
export function normalizeRoster(input, today = vietnamToday()) {
  allowFields(input, ['headers', 'rows'], ['headers', 'rows']);
  requireContract(
    Array.isArray(input.headers) &&
      [2, 3].includes(input.headers.length) &&
      Array.from(input.headers).every(
        (header) =>
          typeof header === 'string' &&
          header.length <= 4096 &&
          header.isWellFormed() &&
          !header.includes('\0'),
      ),
    'headers',
  );
  requireContract(
    Array.isArray(input.rows) && input.rows.length > 0 && input.rows.length <= 2000,
    'rows',
  );
  const named = input.headers.length === 3;
  const seen = new Set();
  let previousRow = 1;
  const rows = Array.from(input.rows, (row) => {
    allowFields(
      row,
      ['row', 'documentNumber', 'birthDate', ...(named ? ['fullName'] : [])],
      ['row', 'documentNumber', 'birthDate'],
    );
    requireContract(Number.isSafeInteger(row.row) && row.row >= 2, 'row');
    if (row.row <= previousRow) throw Object.assign(new ContractError('row'), { row: row.row });
    previousRow = row.row;
    const identityColumn = named ? 2 : 1;
    const identity = rosterCell(row.row, identityColumn, () => documentNumber(row.documentNumber));
    rosterCell(row.row, identityColumn, () =>
      requireContract(!seen.has(identity), 'duplicate_identity'),
    );
    seen.add(identity);
    return {
      row: row.row,
      documentNumber: identity,
      birthDate: rosterCell(row.row, named ? 3 : 2, () => birthDate(row.birthDate, today)),
      name: rosterCell(row.row, 1, () =>
        importedName(row.fullName, Object.hasOwn(row, 'fullName')),
      ),
    };
  });
  return { headers: [...input.headers], rows };
}

/**
 * Maps already decoded calendar/identity cells by physical position, never by header labels.
 * Full CSV/XLSX extraction, date decoding and empty-row handling remain parser responsibilities.
 * @param {number} row - The original physical source row.
 * @param {Array<string>} cells - Dense ordered cells, retaining empty trailing values.
 * @param {number} columnCount - Declared physical width, exactly 2 or 3.
 * @returns {object} Stable internal transport fields; normalizeRoster validates their values.
 */
export function positionalRosterRow(row, cells, columnCount) {
  requireContract(Number.isSafeInteger(row) && row >= 2, 'row');
  requireContract(
    [2, 3].includes(columnCount) &&
      Array.isArray(cells) &&
      cells.length === columnCount &&
      Array.from(cells).every((cell) => typeof cell === 'string'),
    'columns',
  );
  const offset = columnCount === 3 ? 1 : 0;
  return {
    row,
    documentNumber: cells[offset],
    birthDate: cells[offset + 1],
    ...(offset ? { fullName: cells[0] } : {}),
  };
}

/**
 * Adds safe source coordinates to a contract failure without including the cell value.
 * @param {number} row - The validated physical row.
 * @param {number} column - The one-based physical column.
 * @param {Function} read - The cell validation operation.
 * @returns {*} The validated result; contract errors retain row/column coordinates.
 */
function rosterCell(row, column, read) {
  try {
    return read();
  } catch (error) {
    if (error instanceof ContractError) Object.assign(error, { row, column });
    throw error;
  }
}
