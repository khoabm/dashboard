/** Keeps birth dates as Gregorian calendar components; only the reference clock is an instant. */
import { requireContract } from './contracts.js';

/**
 * Returns whether a Gregorian year has February 29.
 *
 * @param {number} year - The calendar year.
 * @returns {boolean} Whether the year is leap.
 */
function leap(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/**
 * Validates components in the finite PostgreSQL DATE contract (years 0001–9999).
 *
 * @param {number} year - The year.
 * @param {number} month - The month.
 * @param {number} day - The day.
 * @returns {string} Canonical calendar text.
 */
function calendar(year, month, day) {
  const lengths = [31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  requireContract(
    year >= 1 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= lengths[month - 1],
    'date',
  );
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Validates an API calendar string without timestamps, timezone conversion or future-day policy.
 *
 * @param {string} value - The YYYY-MM-DD input.
 * @returns {string} The validated calendar text.
 */
export function apiDate(value) {
  requireContract(typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value), 'date');
  return calendar(...value.split('-').map(Number));
}

/**
 * Converts strict UI DD/MM/YYYY text to a calendar-only API string.
 *
 * @param {string} value - The UI input.
 * @returns {string} The YYYY-MM-DD value.
 */
export function uiDate(value) {
  requireContract(
    typeof value === 'string' && /^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/.test(value),
    'date',
  );
  const [day, month, year] = value.split('/').map(Number);
  return calendar(year, month, day);
}

/**
 * Formats a validated API date for UI; it never constructs a Date from the birth date.
 *
 * @param {string} value - The API date.
 * @returns {string} The DD/MM/YYYY text.
 */
export function displayDate(value) {
  const [year, month, day] = apiDate(value).split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Derives Vietnam's current calendar day from an injected epoch-millisecond clock.
 *
 * @param {Function} clock - Returns epoch milliseconds.
 * @returns {string} The Vietnam calendar reference day.
 */
export function vietnamToday(clock = Date.now) {
  const instant = clock();
  requireContract(typeof instant === 'number' && Number.isFinite(instant), 'clock');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    era: 'short',
  }).formatToParts(new Date(instant));
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  requireContract(fields.era === 'AD', 'clock');
  return calendar(Number(fields.year), Number(fields.month), Number(fields.day));
}

/**
 * Enforces the future-date rule against one captured, injectable Vietnam reference day.
 *
 * @param {string} value - The API birth date.
 * @param {string} today - One captured Vietnam reference day.
 * @returns {string} The accepted date; future dates throw ContractError.
 */
export function birthDate(value, today = vietnamToday()) {
  const normalized = apiDate(value);
  requireContract(normalized <= apiDate(today), 'future_date');
  return normalized;
}

/**
 * Converts integral Excel calendar serials; rejects serial 60 in the 1900 system and times.
 *
 * @param {number} serial - The integral workbook day serial.
 * @param {number} system - Exactly 1900 or 1904.
 * @returns {string} The API date; caller separately applies birthDate future policy.
 */
export function excelDate(serial, system) {
  requireContract(
    (system === 1900 || system === 1904) &&
      Number.isSafeInteger(serial) &&
      serial >= (system === 1900 ? 1 : 0) &&
      serial <= 2958465,
    'excel_date',
  );
  requireContract(system !== 1900 || serial !== 60, 'excel_date');
  let days = serial - (system === 1900 && serial > 60 ? 1 : 0);
  let year = system === 1900 ? 1900 : 1904;
  if (system === 1900) days--;
  // Bounded calendar-day arithmetic deliberately avoids epoch/timestamp conversions.
  while (days >= (leap(year) ? 366 : 365)) {
    days -= leap(year) ? 366 : 365;
    year++;
  }
  let month = 1;
  const lengths = [31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  while (days >= lengths[month - 1]) days -= lengths[month++ - 1];
  return calendar(year, month, days + 1);
}
