/** Renders a date-only student lookup form; private inputs and capability never leave this view's memory. */
import { el, button } from '../utils/dom.js';
import { uiDate, displayDate, vietnamToday } from '../utils/gradebook/dates.js';
import { StudentGradeboard } from './student-gradeboard.js';
import { createLookupState } from '../utils/gradebook-ui.js';

const messages = {
  idle: 'Nhập thông tin để xác minh và xem bảng điểm của riêng bạn.',
  loading: 'Đang xác minh thông tin…',
  neutral: 'Thông tin chưa khớp. Bạn hãy kiểm tra và thử lại.',
  limited: 'Vui lòng đợi một lúc trước khi thử lại.',
  unavailable: 'Chức năng xem bảng điểm hiện chưa sẵn sàng. Vui lòng quay lại sau.',
  verified: 'Bạn đã xác minh thành công.',
  expired: 'Thời gian xem bảng điểm đã hết. Vui lòng nhập lại thông tin.',
};

/** Creates a disposable form around an explicitly supplied verification adapter. */
export function StudentLookup({ verify, request, navigate, clock = Date.now }) {
  const heading = el(
    'h1',
    { id: 'gradebook-title', tabindex: '-1' },
    'Bảng điểm ',
    el('span', {}, 'cá nhân'),
  );
  const documentInput = el('input', {
    id: 'lookup-document',
    type: 'text',
    inputmode: 'numeric',
    maxlength: 12,
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: 'Nhập 9–12 chữ số',
    'aria-describedby': 'lookup-document-help lookup-document-error',
  });
  const dateInput = el('input', {
    id: 'lookup-birth-date',
    type: 'text',
    inputmode: 'numeric',
    maxlength: 10,
    autocomplete: 'off',
    placeholder: 'DD/MM/YYYY',
    'aria-describedby': 'lookup-date-help lookup-date-error',
  });
  const picker = el('input', {
    type: 'date',
    class: 'lookup-date-picker',
    min: '0001-01-01',
    max: vietnamToday(clock),
    'aria-label': 'Chọn ngày sinh từ lịch',
    autocomplete: 'off',
  });
  const documentError = el('p', { id: 'lookup-document-error', class: 'field-error' });
  const dateError = el('p', { id: 'lookup-date-error', class: 'field-error' });
  const status = el('div', {
    class: 'lookup-status',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });
  const submit = button('Xác minh thông tin', () => {}, 'button primary lookup-submit', {
    type: 'submit',
  });
  const reset = button(
    'Nhập lại',
    () => {
      state.reset();
      documentInput.focus();
    },
    'button subtle lookup-reset',
  );
  const form = el(
    'form',
    { class: 'lookup-form', novalidate: true, autocomplete: 'off', 'aria-labelledby': heading.id },
    el('label', { class: 'lookup-label', for: documentInput.id }, 'CMND/CCCD'),
    documentInput,
    el(
      'p',
      { id: 'lookup-document-help', class: 'field-help' },
      'Giữ nguyên số 0 ở đầu, không thêm khoảng trắng.',
    ),
    documentError,
    el('label', { class: 'lookup-label', for: dateInput.id }, 'Ngày sinh'),
    el('div', { class: 'lookup-date-control' }, dateInput, picker),
    el(
      'p',
      { id: 'lookup-date-help', class: 'field-help' },
      'Ngày / tháng / năm · Bạn có thể nhập hoặc chọn từ lịch.',
    ),
    dateError,
    submit,
    status,
    reset,
  );
  const element = el(
    'main',
    { class: 'gradebook-page', id: 'main', 'aria-labelledby': heading.id },
    el(
      'section',
      { class: 'gradebook-intro' },
      el('div', { class: 'eyebrow' }, 'GÓC HỌC TẬP CỦA BẠN'),
      heading,
      el('p', { class: 'gradebook-lead' }, 'Mỗi nỗ lực đều xứng đáng được ghi nhận.'),
      el(
        'p',
        { class: 'gradebook-description' },
        'Theo dõi hành trình học tập, từng môn học và từng học kỳ — trong một không gian dành riêng cho bạn.',
      ),
      el(
        'div',
        { class: 'gradebook-illustration', 'aria-hidden': 'true' },
        el('span', {}, 'A'),
        el('span', {}, '✦'),
        el('span', {}, 'abc'),
        el('i'),
        el('i'),
        el('i'),
        el('i'),
      ),
      el(
        'a',
        {
          href: '/',
          class: 'gradebook-back',
          onClick: (event) => {
            if (
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              !event.altKey &&
              event.button === 0
            ) {
              event.preventDefault();
              void navigate('/');
            }
          },
        },
        '← Về bảng học liệu',
      ),
    ),
    el(
      'section',
      { class: 'lookup-card', 'aria-label': 'Xác minh thông tin học sinh' },
      el(
        'div',
        { class: 'lookup-card-heading' },
        el('span', { class: 'lookup-icon', 'aria-hidden': 'true' }, '✧'),
        el('div', {}, el('h2', {}, 'Bắt đầu từ đây'), el('p', {}, 'Xác minh thông tin của bạn')),
      ),
      form,
      el(
        'p',
        { class: 'lookup-privacy' },
        el('span', { 'aria-hidden': 'true' }, '◈ '),
        'Thông tin chỉ được giữ trong trang này và được xóa khi bạn rời đi.',
      ),
      el(
        'p',
        { class: 'lookup-availability' },
        'Chức năng tra cứu đang được chuẩn bị. Ở phiên bản này, thông tin chưa được gửi tới hệ thống.',
      ),
    ),
    el('footer', { class: 'gradebook-footer' }, 'Một hành trình nhỏ, một tiến bộ mỗi ngày.'),
  );
  let disposed = false,
    gradeboard = null;
  /** Drops sensitive controls on every completed/cancelled generation, including native date state. */
  function clearInputs() {
    documentInput.value = '';
    dateInput.value = '';
    picker.value = '';
  }
  /** Projects only public state categories; input, token and backend diagnostics are never rendered. */
  function render(snapshot) {
    if (disposed) return;
    const returningFromPrivate = !!gradeboard;
    gradeboard?.dispose();
    gradeboard = null;
    element.querySelector('.student-gradeboard')?.remove();
    form.closest('.lookup-card').hidden = snapshot.status === 'verified';
    element.querySelector('.gradebook-intro').hidden = snapshot.status === 'verified';
    if (snapshot.status === 'verified' && state.context()) {
      try {
        gradeboard = StudentGradeboard({
          context: state.context(),
          read: state.read,
          onReset: () => state.reset(),
        });
        element.prepend(gradeboard.element);
        const title = gradeboard.element.querySelector('h2');
        title.setAttribute('tabindex', '-1');
        title.focus();
      } catch {
        queueMicrotask(() => state.reset());
      }
    }
    const loading = snapshot.status === 'loading';
    form.setAttribute('aria-busy', String(loading));
    documentInput.disabled =
      dateInput.disabled =
      picker.disabled =
      submit.disabled =
        loading || snapshot.status === 'verified';
    submit.textContent = loading ? 'Đang xác minh…' : 'Xác minh thông tin';
    documentError.textContent = snapshot.errors.documentNumber || '';
    dateError.textContent = snapshot.errors.birthDate || '';
    documentInput.setAttribute('aria-invalid', String(!!snapshot.errors.documentNumber));
    dateInput.setAttribute('aria-invalid', String(!!snapshot.errors.birthDate));
    status.dataset.state = snapshot.status;
    status.textContent = messages[snapshot.status] || 'Vui lòng kiểm tra thông tin đã nhập.';
    reset.hidden = snapshot.status === 'idle' || snapshot.status === 'invalid';
    reset.textContent = loading
      ? 'Hủy và nhập lại'
      : snapshot.status === 'verified'
        ? 'Xác minh lại'
        : 'Nhập lại';
    if (snapshot.status !== 'invalid') clearInputs();
    if (snapshot.status === 'invalid')
      (snapshot.errors.documentNumber ? documentInput : dateInput).focus();
    else if (returningFromPrivate) documentInput.focus();
  }
  const state = createLookupState({ verify, request, clock, onChange: render });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void state.submit({ documentNumber: documentInput.value, birthDate: dateInput.value });
  });
  documentInput.addEventListener('beforeinput', (event) => {
    if (event.data && /[^0-9]/.test(event.data)) {
      event.preventDefault();
      documentError.textContent = 'Chỉ nhập chữ số từ 0 đến 9.';
      documentInput.setAttribute('aria-invalid', 'true');
    }
  });
  documentInput.addEventListener('paste', (event) => {
    if (!/^[0-9]{1,12}$/.test(event.clipboardData.getData('text'))) {
      event.preventDefault();
      documentError.textContent = 'Vui lòng nhập từ 9 đến 12 chữ số.';
    }
  });
  picker.addEventListener('click', () => {
    picker.max = vietnamToday(clock);
    picker.showPicker?.();
  });
  picker.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      picker.max = vietnamToday(clock);
      picker.showPicker?.();
    }
  });
  picker.addEventListener('change', () => {
    dateInput.value = picker.value ? displayDate(picker.value) : '';
  });
  dateInput.addEventListener('input', () => {
    if (/^[0-9]+$/.test(dateInput.value)) {
      const digits = dateInput.value.slice(0, 8);
      dateInput.value = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
        .filter(Boolean)
        .join('/');
    }
    try {
      picker.value = uiDate(dateInput.value);
    } catch {
      picker.value = '';
    }
  });
  const checkExpiry = () => state.checkExpiry();
  document.addEventListener('visibilitychange', checkExpiry);
  render(state.snapshot());
  return {
    element,
    focus: () => heading.focus(),
    dispose() {
      disposed = true;
      state.dispose();
      gradeboard?.dispose();
      clearInputs();
      form.reset();
      element.replaceChildren();
      document.removeEventListener('visibilitychange', checkExpiry);
    },
  };
}
