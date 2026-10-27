/** Feature-local accessible birthday calendar; the manual text field remains the sole selected value. */
import { el, button } from '../utils/dom.js';
import { displayDate, vietnamToday } from '../utils/gradebook/dates.js';
import {
  monthLength,
  calendarWeekday,
  calendarDay,
  typedBirthday,
  shiftCalendarDay,
} from '../utils/birth-calendar.js';

export function BirthDatePicker(input, clock = Date.now) {
  let year,
    month,
    disposed = false;
  const trigger = button('▦', () => toggle(), 'birthday-trigger', {
    'aria-label': 'Chọn ngày sinh từ lịch',
    'aria-expanded': 'false',
    'aria-controls': 'birthday-calendar',
  });
  trigger.textContent = '';
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({
    width: '21',
    height: '21',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.7',
    'aria-hidden': 'true',
  }))
    icon.setAttribute(key, value);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M7 3v4M17 3v4M3 10h18M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z');
  icon.append(path);
  trigger.append(icon);
  const panel = el('div', {
    id: 'birthday-calendar',
    class: 'birthday-calendar',
    role: 'dialog',
    'aria-label': 'Chọn ngày sinh',
    hidden: true,
  });
  const monthSelect = el(
    'select',
    { 'aria-label': 'Tháng sinh' },
    ...Array.from({ length: 12 }, (_, i) =>
      el('option', { value: String(i + 1) }, `Tháng ${i + 1}`),
    ),
  );
  const yearInput = el('input', {
    type: 'number',
    min: '1',
    max: vietnamToday(clock).slice(0, 4),
    'aria-label': 'Năm sinh',
    inputmode: 'numeric',
  });
  const grid = el('div', {
    class: 'birthday-grid',
    role: 'grid',
    'aria-label': 'Ngày trong tháng',
  });
  const caption = el(
    'p',
    { class: 'birthday-caption' },
    'Chọn tháng và nhập năm sinh để tìm ngày nhanh hơn.',
  );
  const previous = button('‹', () => changeMonth(-1), 'birthday-month-step', {
    'aria-label': 'Tháng trước',
  });
  const next = button('›', () => changeMonth(1), 'birthday-month-step', {
    'aria-label': 'Tháng sau',
  });
  panel.append(
    el(
      'div',
      { class: 'birthday-heading' },
      el('strong', {}, 'Ngày sinh của bạn'),
      button('×', () => hide(true), 'birthday-close', { 'aria-label': 'Đóng lịch' }),
    ),
    caption,
    el('div', { class: 'birthday-navigation' }, previous, monthSelect, yearInput, next),
    grid,
    el('p', { class: 'birthday-footer' }, 'Bạn cũng có thể nhập ngày theo DD/MM/YYYY.'),
  );
  const element = el('div', { class: 'birthday-field' }, input, trigger, panel);
  function hide(focus = false) {
    panel.hidden = true;
    grid.replaceChildren();
    trigger.setAttribute('aria-expanded', 'false');
    if (focus && !disposed) trigger.focus();
  }
  function render(focusDate = null) {
    if (disposed) return;
    const today = vietnamToday(clock);
    const [currentYear, currentMonth] = today.split('-').map(Number);
    // Future months cannot contain an eligible birthday: disable them instead of displaying dead cells.
    if (year === currentYear && month > currentMonth) month = currentMonth;
    monthSelect.querySelectorAll('option').forEach((option) => {
      option.disabled = year === currentYear && Number(option.value) > currentMonth;
    });
    monthSelect.value = String(month);
    yearInput.value = String(year);
    yearInput.max = String(currentYear);
    const selected = typedBirthday(input.value, clock),
      days = monthLength(year, month),
      offset = (calendarWeekday(year, month) + 6) % 7;
    previous.disabled = year === 1 && month === 1;
    next.disabled = calendarDay(year, month, 1) >= today.slice(0, 7) + '-01';
    grid.replaceChildren();
    const labels = el('div', { role: 'row', class: 'birthday-weekdays' });
    ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].forEach((name) =>
      labels.append(el('span', { role: 'columnheader' }, name)),
    );
    grid.append(labels);
    const target =
      focusDate ||
      (selected?.startsWith(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`)
        ? selected
        : calendarDay(year, month, 1));
    for (let start = 0; start < offset + days; start += 7) {
      const row = el('div', { role: 'row', class: 'birthday-week' });
      for (let column = 0; column < 7; column++) {
        const day = start + column - offset + 1;
        if (day < 1 || day > days) {
          row.append(el('span', { role: 'gridcell' }));
          continue;
        }
        const date = calendarDay(year, month, day);
        const cell = button(
          String(day),
          () => {
            input.value = displayDate(date);
            hide();
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
          },
          `birthday-day${date === selected ? ' is-selected' : ''}`,
          {
            role: 'gridcell',
            'aria-label': `${day} tháng ${month} năm ${year}`,
            'aria-selected': String(date === selected),
            tabindex: date === target ? '0' : '-1',
            'data-date': date,
          },
        );
        cell.disabled = date > today;
        row.append(cell);
      }
      grid.append(row);
    }
    if (focusDate) grid.querySelector(`[data-date="${focusDate}"]`)?.focus();
  }
  function toggle() {
    if (!panel.hidden) {
      hide(true);
      return;
    }
    const date = typedBirthday(input.value, clock) || vietnamToday(clock);
    [year, month] = date.split('-').map(Number);
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    render();
    grid.querySelector('[tabindex="0"]')?.focus();
  }
  function changeMonth(delta) {
    const total = (year - 1) * 12 + month - 1 + delta;
    const y = Math.floor(total / 12) + 1,
      m = (total % 12) + 1;
    if (y < 1 || calendarDay(y, m, 1) > vietnamToday(clock)) return;
    year = y;
    month = m;
    render();
  }
  monthSelect.addEventListener('change', () => {
    const today = vietnamToday(clock).split('-').map(Number);
    month =
      year === today[0] ? Math.min(Number(monthSelect.value), today[1]) : Number(monthSelect.value);
    render();
  });
  yearInput.addEventListener('input', () => {
    const value = Number(yearInput.value);
    if (Number.isInteger(value) && value >= 1 && value <= Number(vietnamToday(clock).slice(0, 4))) {
      year = value;
      render();
    }
  });
  yearInput.addEventListener('change', () => {
    const value = Number(yearInput.value);
    if (Number.isInteger(value) && value >= 1 && value <= Number(vietnamToday(clock).slice(0, 4)))
      year = value;
    render();
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      hide(true);
      return;
    }
    if (event.key === 'Enter' && event.target === yearInput) {
      event.preventDefault();
      render();
      grid.querySelector('[tabindex="0"]')?.focus();
      return;
    }
    const date = event.target.dataset.date;
    if (!date) return;
    if (['PageUp', 'PageDown'].includes(event.key)) {
      event.preventDefault();
      changeMonth((event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
      grid.querySelector('[tabindex="0"]')?.focus();
      return;
    }
    const weekday = (calendarWeekday(...date.split('-').map(Number)) + 6) % 7;
    const delta = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -weekday,
      End: 6 - weekday,
    }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    try {
      const target = shiftCalendarDay(date, delta);
      if (target > vietnamToday(clock)) return;
      [year, month] = target.split('-').map(Number);
      render(target);
    } catch {
      /* Calendar boundary keeps the current focus. */
    }
  });
  const synchronize = () => {
    if (panel.hidden) return;
    const selected = typedBirthday(input.value, clock);
    if (selected) [year, month] = selected.split('-').map(Number);
    render();
  };
  input.addEventListener('input', synchronize);
  const outside = (event) => {
    if (!element.contains(event.target)) hide();
  };
  document.addEventListener('pointerdown', outside);
  return {
    element,
    trigger,
    clear() {
      input.value = '';
      hide();
      year = month = null;
      yearInput.value = '';
      monthSelect.value = '1';
    },
    setDisabled(value) {
      trigger.disabled = value;
      if (value) hide();
    },
    dispose() {
      disposed = true;
      input.value = '';
      hide();
      year = month = null;
      yearInput.value = '';
      monthSelect.value = '1';
      document.removeEventListener('pointerdown', outside);
      input.removeEventListener('input', synchronize);
      panel.remove();
    },
  };
}
