/** Shared presentation controls. Native form elements remain the value and event source. */

import { el, button } from '../utils/dom.js';

let selectCounter = 0;
let dismissOpenSelect = null;

/**
 * Presents a native select as a keyboard-operable, themed listbox.
 * The original select keeps its options, value, and change listeners.
 *
 * @param {HTMLSelectElement} select - The existing data-bound select.
 * @param {object} options - An accessible label and optional layout class.
 * @returns {HTMLElement} A wrapper with refresh() and focusControl() helpers.
 */
export function SelectControl(select, { label = '', className = '' } = {}) {
  const id = `ui-select-list-${++selectCounter}`;
  const name = label || select.getAttribute('aria-label') || 'Chọn mục';
  const root = el('span', { class: `ui-select ${className}`.trim() });
  const text = el('span', { class: 'ui-select-value', 'aria-hidden': 'true' });
  const trigger = button('', () => (popup ? close() : open()), 'ui-select-trigger', {
    role: 'combobox',
    'aria-label': name,
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-controls': id,
    'aria-required': String(select.required),
  });
  trigger.append(text, el('span', { class: 'ui-select-chevron', 'aria-hidden': 'true' }));
  let popup = null;
  let entries = [];
  let activeIndex = -1;
  let observer = null;
  const dialog = () => root.closest('dialog');

  // Preserve the existing value and change contract; expose one accessible control.
  select.classList.add('ui-select-source');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  root.append(select, trigger);

  function refresh() {
    text.textContent = select.selectedOptions[0]?.textContent || 'Chọn mục';
    trigger.disabled = select.disabled;
    trigger.setAttribute('aria-required', String(select.required));
    if (popup) {
      entries.forEach((node, index) => {
        node.setAttribute('aria-selected', String(index === select.selectedIndex));
      });
    }
  }

  function position() {
    if (!popup) return;
    if (!root.isConnected) {
      close();
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(
      Math.max(rect.width, Math.min(300, window.innerWidth - 24)),
      window.innerWidth - 24,
    );
    const height = Math.min(popup.scrollHeight, 320, window.innerHeight - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const down = rect.bottom + 6;
    const top =
      down + height > window.innerHeight - 12 && rect.top > window.innerHeight - rect.bottom
        ? Math.max(12, rect.top - height - 6)
        : Math.min(down, window.innerHeight - height - 12);
    popup.style.width = `${width}px`;
    popup.style.left = `${left}px`;
    popup.style.top = `${Math.max(12, top)}px`;
  }

  function close() {
    if (!popup) return;
    if (popup.matches(':popover-open')) popup.hidePopover();
    popup.remove();
    popup = null;
    entries = [];
    observer?.disconnect();
    observer = null;
    document.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
    dialog()?.removeEventListener('close', close);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    if (dismissOpenSelect === close) dismissOpenSelect = null;
  }

  function onOutside(event) {
    if (!root.contains(event.target) && !popup?.contains(event.target)) close();
  }

  function activate(index) {
    if (!entries[index] || select.options[index]?.disabled) return;
    activeIndex = index;
    trigger.setAttribute('aria-activedescendant', entries[index].id);
    entries.forEach((node, i) => node.classList.toggle('is-active', i === index));
    entries[index].scrollIntoView({ block: 'nearest' });
  }

  function choose(index) {
    if (!select.options[index] || select.options[index].disabled) return;
    const changed = select.selectedIndex !== index;
    close();
    select.selectedIndex = index;
    refresh();
    trigger.focus();
    if (changed) {
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function open() {
    refresh();
    if (trigger.disabled || !select.options.length) return;
    dismissOpenSelect?.();
    popup = el('div', {
      id,
      class: 'ui-select-listbox',
      role: 'listbox',
      'aria-label': name,
      popover: 'manual',
    });
    entries = Array.from(select.options, (option, index) => {
      const node = el(
        'div',
        {
          id: `${id}-option-${index}`,
          class: 'ui-select-option',
          role: 'option',
          'aria-selected': String(index === select.selectedIndex),
          'aria-disabled': String(option.disabled),
        },
        option.textContent,
      );
      if (!option.disabled) {
        node.addEventListener('pointerdown', (event) => event.preventDefault());
        node.addEventListener('click', () => choose(index));
      }
      popup.append(node);
      return node;
    });
    // Calendar controls keep the popup in the calendar subtree for its outside-click rule.
    (root.closest('.birthday-calendar') || dialog() || document.body).append(popup);
    try {
      popup.showPopover();
    } catch {
      popup.removeAttribute('popover');
    }
    trigger.setAttribute('aria-expanded', 'true');
    dismissOpenSelect = close;
    position();
    activeIndex = Math.max(0, select.selectedIndex);
    if (select.options[activeIndex]?.disabled)
      activeIndex = Array.from(select.options).findIndex((option) => !option.disabled);
    activate(activeIndex);
    document.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    dialog()?.addEventListener('close', close);
    observer = new MutationObserver(() => {
      if (!root.isConnected) close();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  trigger.addEventListener('keydown', (event) => {
    const key = event.key;
    if (!popup) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        event.preventDefault();
        open();
        if (key === 'ArrowUp') {
          const last = Array.from(select.options).findLastIndex((option) => !option.disabled);
          activate(last);
        }
      }
      return;
    }
    if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (key === 'Tab') {
      close();
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      choose(activeIndex);
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      const available = Array.from(select.options)
        .map((option, index) => (!option.disabled ? index : -1))
        .filter((index) => index !== -1);
      if (!available.length) return;
      const current = Math.max(0, available.indexOf(activeIndex));
      const next =
        key === 'Home'
          ? 0
          : key === 'End'
            ? available.length - 1
            : (current + (key === 'ArrowDown' ? 1 : -1) + available.length) % available.length;
      activate(available[next]);
    } else if (key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const query = key.toLocaleLowerCase('vi');
      const found = Array.from(select.options).findIndex(
        (option) =>
          !option.disabled && option.textContent.toLocaleLowerCase('vi').startsWith(query),
      );
      if (found !== -1) activate(found);
    }
  });
  trigger.addEventListener('blur', () => {
    if (popup) close();
  });
  select.addEventListener('change', refresh);
  root.refresh = refresh;
  root.focusControl = () => trigger.focus();
  refresh();
  return root;
}

/**
 * Styles an existing file input as a common picker without intercepting FileList.
 *
 * @param {HTMLInputElement} input - The original file input and listeners.
 * @param {object} options - Visible action and empty-selection labels.
 * @returns {HTMLElement} The wrapper with refresh() for programmatic input resets.
 */
export function FilePicker(input, { label = 'Chọn tệp', empty = 'Chưa chọn tệp' } = {}) {
  const root = el('span', { class: 'ui-file-picker' });
  const action = el('span', { class: 'ui-file-action', 'aria-hidden': 'true' }, label);
  const selected = el('span', { class: 'ui-file-name', 'aria-hidden': 'true' }, empty);
  input.classList.add('ui-file-source');
  root.append(input, action, selected);

  function refresh() {
    const files = Array.from(input.files || []);
    selected.textContent = files.length
      ? files.length === 1
        ? files[0].name
        : `${files.length} tệp đã chọn`
      : empty;
    root.classList.toggle('has-file', files.length > 0);
  }

  input.addEventListener('change', refresh);
  root.refresh = refresh;
  refresh();
  return root;
}
