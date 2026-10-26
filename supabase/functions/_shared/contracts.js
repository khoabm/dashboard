/** Reuses B1 exact-value contracts and supplies narrow Edge transport shapes. */
export { allowFields, bigintId, documentNumber, requireContract, ContractError } from '../../../src/utils/gradebook/contracts.js';
export { birthDate, vietnamToday, apiDate } from '../../../src/utils/gradebook/dates.js';
export { normalizeScore } from '../../../src/utils/gradebook/decimal.js';
export { normalizeRoster, importedName, importedScore } from '../../../src/utils/gradebook/imports.js';
export { frameScalar, frameTuple, canonicalRosterInput, canonicalScoreCells } from '../../../src/utils/gradebook/canonical.js';

import { requireContract } from '../../../src/utils/gradebook/contracts.js';

/** Canonical UUID text is the only accepted class/actor/session selector. */
export function uuid(value) {
  requireContract(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value), 'uuid');
  return value;
}

/** Semester is a small JSON integer, never coerced from user text. */
export function semester(value) {
  requireContract(value === 1 || value === 2, 'semester');
  return value;
}

/** Codes are transport selectors; B3 additionally checks active catalog membership. */
export function code(value) {
  requireContract(typeof value === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(value), 'code');
  return value;
}

/** Small metadata text has PostgreSQL-compatible code-point bounds. */
export function text(value, limit) {
  requireContract(typeof value === 'string' && value.isWellFormed() && !value.includes('\0') && value.length <= limit * 2 && Array.from(value).length <= limit && value.trim().length > 0, 'text');
  return value;
}
