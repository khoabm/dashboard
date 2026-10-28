/** Calendar-only navigation; no timestamp or permissive Date parsing of a birthday. */
import { apiDate, uiDate, birthDate, vietnamToday } from './gradebook/dates.js';
export function monthLength(year, month) {
  for (let day = 31; day >= 28; day--) {
    try {
      apiDate(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${day}`);
      return day;
    } catch {
      /* Try the next valid month length. */
    }
  }
  throw Error('calendar');
}
export function calendarWeekday(year, month, day = 1) {
  const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  if (month < 3) y--;
  return (
    (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + offsets[month - 1] + day) %
    7
  );
}
export function calendarDay(year, month, day) {
  return apiDate(
    `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  );
}
export function typedBirthday(value, clock = Date.now) {
  try {
    return birthDate(uiDate(value), vietnamToday(clock));
  } catch {
    return null;
  }
}
export function shiftCalendarDay(value, delta) {
  let [year, month, day] = apiDate(value).split('-').map(Number);
  while (delta > 0) {
    day++;
    if (day > monthLength(year, month)) {
      day = 1;
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    delta--;
  }
  while (delta < 0) {
    day--;
    if (day < 1) {
      month--;
      if (month < 1) {
        month = 12;
        year--;
      }
      day = monthLength(year, month);
    }
    delta++;
  }
  return calendarDay(year, month, day);
}

/** Masks only presentation input; strict calendar validity still belongs to the date contract. */
export function formatBirthdayInput(value, caret = value.length) {
  if (typeof value !== 'string') return { text: value, caret };
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8);
  const prefix = value.slice(0, Math.max(0, caret));
  const before = Math.min(prefix.replace(/[^0-9]/g, '').length, 8);
  const firstSlash = digits.length > 2 || /^\d{2}\//.test(value);
  const secondSlash = digits.length > 4 || /^\d{2}\/\d{2}\//.test(value);
  const text =
    digits.slice(0, 2) +
    (firstSlash ? '/' : '') +
    digits.slice(2, 4) +
    (secondSlash ? '/' : '') +
    digits.slice(4);
  const position =
    before +
    Number(firstSlash && (before > 2 || (before === 2 && /^\d{2}\//.test(prefix)))) +
    Number(secondSlash && (before > 4 || (before === 4 && /^\d{2}\/\d{2}\//.test(prefix))));
  return { text, caret: Math.min(text.length, position) };
}
