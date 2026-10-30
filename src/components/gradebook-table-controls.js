/** Shared accessible sorting contract for both gradebook tables. */
import { el, button } from '../utils/dom.js';

const collator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true });

export const DEFAULT_TABLE_SORT = Object.freeze({ key: 'name', direction: 'asc' });

/** A header is one keyboard-reachable button with aria-sort on its owning column. */
export function SortableHeader(label, key, current, onChange) {
  const selected = current?.key === key;
  const direction = selected ? current.direction : null;
  const next = selected && direction === 'asc' ? 'desc' : 'asc';
  const heading = el(
    'th',
    { scope: 'col', 'aria-sort': selected ? (direction === 'asc' ? 'ascending' : 'descending') : 'none' },
    button(
      label,
      () => onChange({ key, direction: next }),
      'table-sort-button',
      {
        'aria-label': `Sắp xếp theo ${label}, ${next === 'asc' ? 'tăng dần' : 'giảm dần'}`,
      },
    ),
  );
  heading.querySelector('button').append(
    el('span', { class: 'table-sort-indicator', 'aria-hidden': 'true' }, selected ? (direction === 'asc' ? '↑' : '↓') : '↕'),
  );
  return heading;
}

/** Default hierarchy: name → underlying CCCD numeric-text rank → birth date → stable ID. */
export function compareIdentity(a, b) {
  return (
    collator.compare(a.fullName || '', b.fullName || '') ||
    (a.documentOrder ?? Number.MAX_SAFE_INTEGER) - (b.documentOrder ?? Number.MAX_SAFE_INTEGER) ||
    collator.compare(a.birthDate || '', b.birthDate || '') ||
    stableId(a, b)
  );
}

function stableId(a, b) {
  const first = BigInt(a.id);
  const second = BigInt(b.id);
  return first > second ? 1 : first < second ? -1 : 0;
}

/** Sorts the entire loaded class (never just the current 20-row page). */
export function sortGradebookRows(items, sort = DEFAULT_TABLE_SORT, { subject, rawCompare } = {}) {
  const sign = sort?.direction === 'desc' ? -1 : 1;
  const key = sort?.key || 'name';
  return [...items].sort((a, b) => {
    let value = 0;
    if (key === 'name') value = collator.compare(a.fullName || '', b.fullName || '');
    else if (key === 'document') value = (a.documentOrder || 0) - (b.documentOrder || 0);
    else if (key === 'birthDate') value = collator.compare(a.birthDate || '', b.birthDate || '');
    else if (key === 'active') value = Number(a.active) - Number(b.active);
    else if (key.startsWith('score:') && subject && rawCompare) {
      const code = key.slice(6);
      value = rawCompare(a.cells?.get(`${subject}|${code}`), b.cells?.get(`${subject}|${code}`));
    }
    return value ? sign * value : compareIdentity(a, b) || stableId(a, b);
  });
}

/** Human-readable selection without introducing a second loader or modal. */
export function ExportSelector(onExport, { label = 'Xuất dữ liệu' } = {}) {
  const format = el(
    'select',
    { 'aria-label': 'Định dạng tệp xuất', class: 'gradebook-export-select' },
    el('option', { value: 'xlsx' }, 'Excel (.xlsx)'),
    el('option', { value: 'csv' }, 'CSV (.csv)'),
  );
  const action = button(label, () => void onExport(format.value), 'button gradebook-export-button', {
    'aria-label': `${label} toàn bộ danh sách`,
  });
  return el('div', { class: 'gradebook-export-controls' }, format, action);
}
