/** Normalizes bounded roster/score input without matching records or performing UPSERT. */
import { allowFields, documentNumber, requireContract } from './contracts.js';
import { birthDate, vietnamToday } from './dates.js';
import { normalizeScore } from './decimal.js';

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
  requireContract(typeof value === 'string' && value.length <= 200, 'name');
  const text = value.trim();
  return text ? { state: 'value', value: text } : { state: 'blank' };
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
      Object.values(ROSTER_HEADERS).some(
        (headers) =>
          headers.length === input.headers.length &&
          headers.every((header, index) => header === input.headers[index]),
      ),
    'headers',
  );
  requireContract(
    Array.isArray(input.rows) && input.rows.length > 0 && input.rows.length <= 2000,
    'rows',
  );
  const named = input.headers.length === 3;
  const seen = new Set();
  const rows = Array.from(input.rows, (row, index) => {
    allowFields(
      row,
      ['row', 'documentNumber', 'birthDate', ...(named ? ['fullName'] : [])],
      ['row', 'documentNumber', 'birthDate'],
    );
    requireContract(row.row === index + 2, 'row');
    const identity = documentNumber(row.documentNumber);
    requireContract(!seen.has(identity), 'duplicate_identity');
    seen.add(identity);
    return {
      row: row.row,
      documentNumber: identity,
      birthDate: birthDate(row.birthDate, today),
      name: importedName(row.fullName, Object.hasOwn(row, 'fullName')),
    };
  });
  return { headers: [...input.headers], rows };
}
