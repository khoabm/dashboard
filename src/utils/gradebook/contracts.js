/** Defines safe validation failures and narrow scalar/object boundaries for Gradebook. */

/**
 * Reports only a category, never the rejected personal value.
 *
 * @param {string} code - The safe validation category.
 */
export class ContractError extends Error {
  constructor(code) {
    super(`Gradebook contract: ${code}`);
    this.name = 'ContractError';
    this.code = code;
  }
}

/**
 * Rejects a failed boundary check without copying its input into errors.
 *
 * @param {boolean} condition - Whether the contract holds.
 * @param {string} code - The safe failure category.
 */
export function requireContract(condition, code) {
  if (!condition) throw new ContractError(code);
}

/**
 * Accepts a plain data record with only the named own, enumerable data fields.
 *
 * @param {object} value - The untrusted record.
 * @param {string[]} allowed - The permitted field names.
 * @param {string[]} required - The mandatory own fields.
 * @returns {object} The validated record; throws ContractError on failure.
 */
export function allowFields(value, allowed, required = []) {
  requireContract(
    value !== null &&
      typeof value === 'object' &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value)),
    'structure',
  );
  const keys = Reflect.ownKeys(value);
  requireContract(
    keys.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return allowed.includes(key) && descriptor.enumerable && 'value' in descriptor;
    }) && required.every((key) => Object.hasOwn(value, key)),
    'fields',
  );
  return value;
}

/**
 * Returns an unchanged 9–12 ASCII-digit identifier; no trimming or numeric coercion.
 *
 * @param {string} value - The untrusted identifier.
 * @returns {string} The unchanged validated text.
 */
export function documentNumber(value) {
  requireContract(typeof value === 'string' && /^[0-9]{9,12}$/.test(value), 'identity');
  return value;
}

/**
 * Returns a positive PostgreSQL BIGINT as canonical text, without Number conversion.
 *
 * @param {string} value - The canonical decimal ID.
 * @returns {string} The unchanged validated ID.
 */
export function bigintId(value) {
  requireContract(
    typeof value === 'string' &&
      /^[1-9][0-9]{0,18}$/.test(value) &&
      (value.length < 19 || value <= '9223372036854775807'),
    'bigint',
  );
  return value;
}

/**
 * Compares canonical BIGINT ID strings numerically without losing high bits.
 *
 * @param {string} left - The first ID.
 * @param {string} right - The second ID.
 * @returns {number} Negative, zero or positive comparison.
 */
export function compareBigintIds(left, right) {
  bigintId(left);
  bigintId(right);
  return Math.sign(left.length - right.length) || (left < right ? -1 : left > right ? 1 : 0);
}
