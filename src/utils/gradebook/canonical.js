/** Encodes B1 input tuples and protocol vectors, not a live database fingerprint or signed token. */
import { allowFields, requireContract } from './contracts.js';
import { importedScore, normalizeRoster } from './imports.js';

/**
 * Frames null or UTF-8 text exactly as CP01-A §8.2; undefined and lossy surrogate text fail.
 *
 * @param {string|null} value - The protocol scalar.
 * @returns {string} The unambiguous N or V-byte-length encoding.
 */
export function frameScalar(value) {
  if (value === null) return 'N';
  requireContract(typeof value === 'string' && value.isWellFormed(), 'framing');
  return `V${new TextEncoder().encode(value).length}:${value}`;
}

/**
 * Frames one fixed-order tuple; each caller owns the explicit tag/field layout.
 *
 * @param {string} tag - The versioned protocol tag.
 * @param {Array<string|null>} fields - Fixed-order scalar fields.
 * @returns {string} The tuple transcript.
 */
export function frameTuple(tag, fields) {
  requireContract(
    typeof tag === 'string' &&
      /^[a-z][a-z0-9_:-]{0,63}$/.test(tag) &&
      Array.isArray(fields) &&
      fields.length <= 64 &&
      Array.from(fields).every((field) => field === null || typeof field === 'string'),
    'framing',
  );
  return frameScalar(tag) + fields.map(frameScalar).join('');
}

/**
 * Encodes the key/presence prefix from §8.2 for cross-runtime test vectors only.
 * B3 must append the complete fixed-order stored state before computing its DB hash.
 * @param {string} tag - Student (version, lookup hex) or score (ID, semester, subject, column).
 * @param {boolean} exists - The explicit presence marker.
 * @param {string[]} keys - The exact ordered textual key fields, prepared by trusted code.
 * @returns {string} An incomplete state prefix; never a full fingerprint.
 */
export function recordPresenceVector(tag, exists, keys) {
  requireContract(['student', 'score'].includes(tag) && typeof exists === 'boolean', 'framing');
  requireContract(
    Array.isArray(keys) &&
      keys.length === (tag === 'student' ? 2 : 4) &&
      Array.from(keys).every((field) => typeof field === 'string'),
    'framing',
  );
  return frameTuple(`${tag}_${exists ? 'existing' : 'missing'}`, [
    ...keys,
    exists ? 'EXISTS' : 'MISSING',
  ]);
}

/** Canonicalizes a roster input in source-row order with explicit layout and optional-name intent.
 * The caller passes raw declared input, not an already trusted client-normalized object.
 * Returns sensitive transient text: never log, cache or expose it as a preview token.
 * @param {object} input - The declared raw roster batch.
 * @param {string} today - The captured Vietnam reference day.
 * @returns {string} The input transcript only; actor/scope binding belongs to B4.
 */
export function canonicalRosterInput(input, today) {
  allowFields(input, ['headers', 'rows'], ['headers', 'rows']);
  const roster = normalizeRoster(input, today);
  return (
    frameTuple('gb:preview-input:v1', ['roster', String(roster.headers.length)]) +
    roster.headers.map((header) => frameScalar(header)).join('') +
    frameScalar(String(roster.rows.length)) +
    roster.rows
      .map((row) =>
        frameTuple('roster_row', [
          String(row.row),
          row.documentNumber,
          row.birthDate,
          row.name.state,
          row.name.state === 'value' ? row.name.value : null,
        ]),
      )
      .join('')
  );
}

/** Canonicalizes seven ordered raw score cells; catalog mapping and whole-file validation come later.
 * Explicit null/empty cells skip; holes/undefined fail rather than silently becoming blanks.
 * @param {Array<string|null>} cells - Seven cells in the declared catalog order.
 * @returns {string} The score-cell transcript, not a complete score-import envelope.
 */
export function canonicalScoreCells(cells) {
  requireContract(Array.isArray(cells) && cells.length === 7, 'structure');
  return (
    frameTuple('gb:preview-input:v1', ['score_cells', '7']) +
    Array.from(cells, (cell) => {
      const score = importedScore(cell);
      return frameTuple('score_cell', [score.state, score.state === 'value' ? score.value : null]);
    }).join('')
  );
}
