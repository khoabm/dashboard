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

/** Formats a partially typed birthday without changing its calendar validity or dropping leading zeroes. */
export function formatBirthdayInput(value, caret = value.length) {
  if (typeof value !== 'string' || !/^[0-9/]*$/.test(value)) return { text: value, caret };

  const digits = value.replace(/\D/g, '').slice(0, 8);
  const before = value.slice(0, caret).replace(/\D/g, '').length;
  const text = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
  const position =
    before + Number(before > 2 && digits.length > 2) + Number(before > 4 && digits.length > 4);
  return { text, caret: Math.min(text.length, position) };
}
