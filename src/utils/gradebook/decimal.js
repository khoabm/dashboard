/** Validates raw score strings and computes exact bounded comparison/display values. */
import { requireContract } from './contracts.js';

/**
 * Returns an exact score in hundred-thousandths after lexical precision validation.
 *
 * @param {string} value - The untrusted raw decimal.
 * @returns {number} An exact integer in 0–1000000.
 */
function scaledScore(value) {
  requireContract(
    typeof value === 'string' && value.length <= 32 && /^[0-9]+(?:\.[0-9]{1,5})?$/.test(value),
    'decimal',
  );
  const [whole, fraction = ''] = value.split('.');
  const integer = whole.replace(/^0+/, '') || '0';
  requireContract(integer.length <= 2, 'range');
  // Conversion is exact only after bounding both parts; no binary decimal arithmetic occurs.
  const scaled = Number(integer) * 100000 + Number(fraction.padEnd(5, '0'));
  requireContract(scaled <= 1000000, 'range');
  return scaled;
}

/**
 * Returns a minimal exact decimal string; rejects excess precision before normalization.
 *
 * @param {string} value - The untrusted raw decimal.
 * @returns {string} The exact canonical score.
 */
export function normalizeScore(value) {
  const scaled = scaledScore(value);
  const fraction = String(scaled % 100000)
    .padStart(5, '0')
    .replace(/0+$/, '');
  return `${Math.floor(scaled / 100000)}${fraction ? `.${fraction}` : ''}`;
}

/**
 * Compares validated score strings numerically, preserving every accepted fractional place.
 *
 * @param {string} left - The first score.
 * @param {string} right - The second score.
 * @returns {number} Negative, zero or positive comparison.
 */
export function compareScores(left, right) {
  return Math.sign(scaledScore(left) - scaledScore(right));
}

/**
 * Returns one display decimal using exact nonnegative half-up rounding, without changing raw data.
 *
 * @param {string} value - The raw score.
 * @returns {string} The display value and histogram bucket.
 */
export function displayScore(value) {
  const tenths = Math.floor((scaledScore(value) + 5000) / 10000);
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}
