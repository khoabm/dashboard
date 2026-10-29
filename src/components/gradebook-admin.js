/** Renders CP03 administration against an injected B4-shaped adapter; no synthetic or hosted data source. */
import { el, button, field, checkboxField, restrictNumericInput } from '../utils/dom.js';
import { openDialog, ConfirmDialog } from './primitives.js';
import { PulseIndicator, setPendingMessage } from './pending.js';
import { GradebookScores } from './gradebook-scores.js';
import { displayDate, uiDate, vietnamToday } from '../utils/gradebook/dates.js';
import { formatBirthdayInput } from '../utils/birth-calendar.js';
import { bigintId, documentNumber } from '../utils/gradebook/contracts.js';
import {
  AdminError,
  adminMessage,
  classInput,
  studentInput,
  studentAction,
  studentRecord,
  createAdminGate,
  createRosterPreview,
} from '../utils/gradebook-admin.js';

/** Owns all private DOM, dialogs, pagination and import confirmation until route/session disposal. */
export function GradebookAdmin({
  request,
  readFile,
  readScores,
  loadCatalog,
  onLogin,
  clock = Date.now,
}) {
  let session = { status: 'loading', generation: -1 },
    disposed = false,
    operation = 0,
    busy = false,
    dirty = false;
  let currentClass = null,
    classKnown = false,
    students = [],
    cursor = null,
    cursors = [null],
    nextCursor = null;
  const dialogs = new Set();
  let scoreView = null,
    mode = 'students';
  let confirmations = new AbortController();
  const preview = createRosterPreview(clock);
  const gate = createAdminGate(
    (payload, options) => {
      const labels = {
        'class.read': 'Đang tải thông tin lớp…',
        'class.create': 'Đang tạo lớp…',
        'class.patch': 'Đang lưu thông tin lớp…',
        'students.list': `Đang tải trang học sinh ${cursors.length}…`,
        'student.read': 'Đang tải hồ sơ học sinh…',
        'student.create': 'Đang thêm học sinh…',
        'student.patch': 'Đang lưu hồ sơ học sinh…',
        'student.reveal': 'Đang mở định danh đã xác nhận…',
        'student.deactivate': 'Đang ngừng sử dụng hồ sơ…',
        'student.reactivate': 'Đang kích hoạt lại hồ sơ…',
        'student.delete': 'Đang xóa hồ sơ học sinh…',
        'roster.preview': 'Đang kiểm tra bản xem trước danh sách…',
        'roster.apply': 'Đang áp dụng danh sách học sinh…',
      };
      pending(labels[payload.op] || 'Đang cập nhật hồ sơ học sinh…');
      return request(payload, options);
    },
    () => session,
  );
  const heading = el('h1', { tabindex: '-1' }, 'Quản lý bảng điểm');
  const progress = PulseIndicator();
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'admin-feedback' });
  const body = el('div', { class: 'gradebook-admin-body' });
  const element = el(
    'main',
    { id: 'main', class: 'gradebook-admin' },
    heading,
    progress,
    status,
    body,
  );

  /** Cancels waits without claiming a previously sent mutation was rolled back. */
  function cancel() {
    operation++;
    gate.cancel();
    busy = false;
    body.inert = false;
    for (const entry of dialogs) entry.content.inert = false;
    pending();
  }

  /** Removes sensitive fields even when a test/tool retains an old detached DOM reference. */
  function clearDialog(entry) {
    setPendingMessage(entry.progress, '');
    entry.cancel?.();
    entry.dialog.querySelectorAll('input,textarea').forEach((input) => {
      input.value = '';
    });
    entry.content.querySelectorAll('*').forEach((node) => {
      if (!node.childElementCount) node.textContent = '';
    });
    entry.content.replaceChildren();
    dialogs.delete(entry);
    dirty = false;
  }

  function closePrivate() {
    scoreView?.dispose();
    scoreView = null;
    mode = 'students';
    cancel();
    confirmations.abort();
    confirmations = new AbortController();
    preview.clear();
    dirty = false;
    for (const entry of [...dialogs]) {
      clearDialog(entry);
      entry.dialog.close();
    }
    currentClass = null;
    classKnown = false;
    students = [];
    cursor = null;
    cursors = [null];
    nextCursor = null;
    body.querySelectorAll('td').forEach((node) => {
      node.textContent = '';
    });
    body.querySelectorAll('input').forEach((node) => {
      node.value = '';
    });
    body.replaceChildren();
    status.textContent = '';
  }

  /** Cancels unresolved decisions on route/session exit, before their callbacks can retain private state. */
  function confirm(message, description) {
    return ConfirmDialog(message, description, { signal: confirmations.signal });
  }

  /** Uses the existing dialog focus/escape behavior, adding memory-only private cleanup. */
  function dialog(title) {
    const entry = openDialog(title);
    entry.progress = PulseIndicator();
    entry.progress.classList.add('dialog-progress');
    entry.dialog.querySelector('.dialog-heading').append(entry.progress);
    dialogs.add(entry);
    entry.dialog.addEventListener('input', () => {
      dirty = true;
    });
    entry.dialog.addEventListener(
      'close',
      () => {
        if (dialogs.has(entry)) {
          cancel();
          clearDialog(entry);
        }
      },
      { once: true },
    );
    const dismiss = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void confirm(
        'Bỏ thông tin đang nhập?',
        'Thông tin và tệp trong hộp thoại chỉ nằm trong bộ nhớ.',
      ).then((ok) => {
        if (ok && entry.dialog.open) {
          dirty = false;
          entry.dialog.close();
        }
      });
    };
    entry.close.addEventListener('click', dismiss, { capture: true });
    entry.dialog.addEventListener('cancel', dismiss);
    return entry;
  }

  /** Mirrors operation feedback into the active modal outside inert content. */
  function pending(message = '') {
    body.setAttribute('aria-busy', String(!!message));
    setPendingMessage(progress, dialogs.size ? '' : message);
    for (const entry of dialogs) {
      entry.content.setAttribute('aria-busy', String(!!message));
      setPendingMessage(entry.progress, message);
    }
  }

  /** Serializes work and fences every render against cancellation, logout and route exit. */
  async function run(task, failed = () => {}) {
    if (disposed || busy || session.status !== 'admin') return;
    const ticket = ++operation;
    busy = true;
    body.inert = true;
    for (const entry of dialogs) entry.content.inert = true;
    status.textContent = '';
    pending('Đang tải dữ liệu lớp…');
    try {
      await task(() => !disposed && ticket === operation && session.status === 'admin');
    } catch (error) {
      if (!disposed && ticket === operation) {
        if ([401, 403].includes(error?.status))
          setSession({ status: 'anonymous', generation: session.generation + 1 });
        else {
          status.textContent = adminMessage(error);
          failed(error);
        }
      }
    } finally {
      if (!disposed && ticket === operation) {
        busy = false;
        body.inert = false;
        for (const entry of dialogs) entry.content.inert = false;
        pending();
      }
    }
  }

  /** Reads only the selected page; search/filter explicitly applies to that page, with no hidden fetch loop. */
  async function list(isCurrent) {
    const result = await gate.call({
      op: 'students.list',
      classId: currentClass.id,
      limit: 20,
      ...(cursor ? { cursor } : {}),
    });
    if (!isCurrent()) return;
    if (!Array.isArray(result.students) || result.students.length > 20) throw new AdminError();
    students = result.students.map((value) => studentRecord(value, currentClass.id));
    nextCursor = result.nextCursor === null ? null : bigintId(result.nextCursor);
    render();
  }

  function load() {
    if (mode === 'scores' && scoreView) return scoreView.reload();
    return run(async (isCurrent) => {
      preview.clear();
      const result = await gate.call({ op: 'class.read' });
      if (!isCurrent()) return;
      currentClass = result.class;
      classKnown = true;
      if (currentClass) {
        bigintId(currentClass.revision);
        classInput({ name: currentClass.name, schoolYear: currentClass.schoolYear }, null);
        if (typeof currentClass.id !== 'string') throw new AdminError();
        await list(isCurrent);
      } else {
        students = [];
        render();
      }
    });
  }

  /** Edits class metadata only; optimistic revisions prevent overwriting a newer teacher change. */
  function editClass() {
    if (scoreView?.pending()) return;
    const entry = dialog(currentClass ? 'Chỉnh sửa lớp' : 'Tạo lớp đang hoạt động');
    const name = el('input', {
      required: true,
      maxlength: 100,
      value: currentClass?.name || '',
      autocomplete: 'off',
    });
    const year = el('input', {
      required: true,
      maxlength: 32,
      value: currentClass?.schoolYear || '',
      autocomplete: 'off',
    });
    const error = el('p', { role: 'alert', class: 'form-error' });
    const submit = el('button', { type: 'submit', class: 'button primary' }, 'Lưu lớp');
    const form = el(
      'form',
      {},
      field('Tên lớp', name),
      field('Năm học', year),
      el(
        'p',
        { class: 'muted' },
        'Đây là thông tin mô tả. Sửa năm học không di chuyển điểm hoặc tạo bản sao học sinh.',
      ),
      error,
      submit,
    );
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let payload;
      try {
        payload = classInput({ name: name.value, schoolYear: year.value }, currentClass);
      } catch {
        error.textContent = 'Nhập tên lớp, năm học hợp lệ và ít nhất một thay đổi.';
        return;
      }
      void run(
        async (isCurrent) => {
          const result = await gate.call(payload);
          if (!isCurrent()) return;
          currentClass = result.class;
          scoreView?.dispose();
          scoreView = null;
          preview.clear();
          dirty = false;
          clearDialog(entry);
          entry.dialog.close();
          // Refresh only by an explicit completed mutation, never replay the write.
          body.replaceChildren();
          if (mode === 'scores') render();
          else await list(isCurrent);
          status.textContent = 'Đã cập nhật lớp.';
        },
        (e) => {
          error.textContent = adminMessage(e);
          if (e.status === 409) submit.disabled = true;
        },
      );
    });
    entry.content.append(form);
    name.focus();
  }

  function studentForm(current = null) {
    const entry = dialog(current ? 'Chỉnh sửa học sinh' : 'Thêm học sinh');
    const name = el('input', {
      value: current?.fullName || '',
      autocomplete: 'off',
      maxlength: 4096,
    });
    const identity = el('input', {
      type: 'text',
      inputmode: 'numeric',
      maxlength: 12,
      autocomplete: 'off',
      placeholder: current ? 'Để trống để giữ nguyên CMND/CCCD' : 'Nhập 9–12 chữ số',
    });
    const dob = el('input', {
      value: current ? displayDate(current.birthDate) : '',
      placeholder: 'DD/MM/YYYY',
      required: true,
      autocomplete: 'off',
      inputmode: 'numeric',
      maxlength: 10,
    });
    restrictNumericInput(identity);
    const correct = el('input', { type: 'checkbox' });
    const picker = el('input', {
      type: 'date',
      class: 'lookup-date-picker',
      max: vietnamToday(),
      min: '0001-01-01',
      'aria-label': 'Chọn ngày sinh từ lịch',
      value: current?.birthDate || '',
    });
    picker.disabled = !!current;
    picker.addEventListener('change', () => {
      if (picker.value) dob.value = displayDate(picker.value);
    });
    dob.addEventListener('beforeinput', (event) => {
      if (event.data && /[^0-9/]/.test(event.data)) event.preventDefault();
    });
    dob.addEventListener('input', () => {
      const formatted = formatBirthdayInput(dob.value, dob.selectionStart ?? dob.value.length);
      if (formatted.text !== dob.value) {
        dob.value = formatted.text;
        dob.setSelectionRange(formatted.caret, formatted.caret);
      }
      try {
        picker.value = uiDate(dob.value);
      } catch {
        picker.value = '';
      }
    });
    identity.disabled = !!current;
    dob.readOnly = !!current;
    correct.addEventListener('change', () => {
      identity.disabled = !correct.checked;
      dob.readOnly = !correct.checked;
      picker.disabled = !correct.checked;
      if (!correct.checked) {
        identity.value = '';
        dob.value = displayDate(current.birthDate);
        picker.value = current.birthDate;
      }
    });
    const error = el('p', { class: 'form-error', role: 'alert' });
    const submit = el('button', { type: 'submit', class: 'button primary' }, 'Lưu học sinh');
    const form = el(
      'form',
      {},
      field('Họ tên (không bắt buộc)', name),
      current && checkboxField('Điều chỉnh thông tin xác minh (thao tác riêng)', correct),
      field('CMND/CCCD', identity),
      field('Ngày sinh — DD/MM/YYYY', el('div', { class: 'lookup-date-control' }, dob, picker)),
      el(
        'p',
        { class: 'muted' },
        'Định danh luôn giữ dạng văn bản. Thông tin đang nhập không lưu trên thiết bị.',
      ),
      error,
      submit,
    );
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      let payload;
      try {
        payload = studentInput(
          { fullName: name.value, documentNumber: identity.value, birthDate: dob.value },
          currentClass.id,
          current,
          correct.checked,
        );
      } catch {
        error.textContent =
          'Kiểm tra họ tên, CMND/CCCD và ngày sinh hợp lệ; cần có thay đổi khi sửa.';
        return;
      }
      if (
        payload.confirmed &&
        !(await confirm(
          'Xác nhận điều chỉnh hồ sơ?',
          'Thay đổi thông tin xác minh có thể yêu cầu học sinh xác minh lại. Xóa tên là thao tác thủ công, không phải quy tắc import.',
        ))
      )
        return;
      if (!entry.dialog.open || disposed) return;
      void run(
        async (isCurrent) => {
          await gate.call(payload);
          if (!isCurrent()) return;
          dirty = false;
          clearDialog(entry);
          entry.dialog.close();
          await list(isCurrent);
          status.textContent = 'Đã lưu học sinh.';
        },
        (e) => {
          error.textContent = adminMessage(e);
          if (e.status === 409) submit.disabled = true;
        },
      );
    });
    entry.content.append(form);
    name.focus();
  }

  function readStudent(student, editing) {
    void run(async (isCurrent) => {
      const result = await gate.call({
        op: 'student.read',
        classId: currentClass.id,
        studentId: student.id,
      });
      if (!isCurrent()) return;
      const value = studentRecord(result.student, currentClass.id);
      if (editing) studentForm(value);
      else {
        const entry = dialog('Thông tin học sinh');
        entry.content.append(
          el('p', {}, value.fullName || 'Chưa có tên'),
          el('p', {}, `Ngày sinh: ${displayDate(value.birthDate)}`),
          el('p', {}, 'CMND/CCCD: đã ẩn'),
          el('p', {}, value.active ? 'Đang sử dụng' : 'Đã ngừng sử dụng'),
        );
      }
    });
  }

  function reveal(student) {
    const entry = dialog('Hiện CMND/CCCD');
    const output = el(
      'p',
      { role: 'status', class: 'identity-reveal' },
      'Chỉ tiết lộ một hồ sơ sau khi bạn xác nhận.',
    );
    const ask = button(
      'Xác nhận hiện định danh',
      () =>
        void run(async (isCurrent) => {
          const result = await gate.call({
            op: 'student.reveal',
            classId: currentClass.id,
            studentId: student.id,
          });
          if (!isCurrent() || !entry.dialog.open) return;
          output.textContent = documentNumber(result.documentNumber);
          ask.hidden = true;
          const timer = setTimeout(() => {
            if (entry.dialog.open) entry.dialog.close();
          }, 30000);
          entry.cancel = () => clearTimeout(timer);
        }),
      'button primary',
    );
    entry.content.append(
      output,
      el(
        'p',
        { class: 'muted' },
        'Không sao chép vào bản xuất hoặc nhật ký. Đóng hộp thoại để xóa; tự ẩn sau 30 giây.',
      ),
      ask,
    );
  }

  async function changeStudent(student, kind) {
    const labels = {
      deactivate: 'Ngừng sử dụng',
      reactivate: 'Sử dụng lại',
      delete: 'Xóa học sinh',
    };
    const ok = await confirm(
      `${labels[kind]}?`,
      kind === 'delete'
        ? 'Chỉ xóa được hồ sơ chưa có điểm. Nếu đã có điểm, hãy ngừng sử dụng để giữ quan hệ dữ liệu.'
        : 'Thao tác giữ nguyên điểm và quan hệ lớp. Học sinh có thể phải xác minh lại.',
    );
    if (!ok || disposed || session.status !== 'admin') return;
    void run(async (isCurrent) => {
      await gate.call(studentAction(student, currentClass.id, kind, true));
      if (!isCurrent()) return;
      await list(isCurrent);
      status.textContent = 'Đã cập nhật hồ sơ.';
    });
  }

  /** Keeps imported identities/token in this modal only; changed files cancel and invalidate confirmation. */
  function importRoster() {
    const entry = dialog('Nhập danh sách học sinh');
    let batch = null,
      reading = null,
      serial = 0;
    const file = el('input', {
      type: 'file',
      accept: '.csv,.xlsx',
      'aria-label': 'Chọn tệp danh sách',
    });
    const fileProgress = PulseIndicator();
    const detail = el('div', { class: 'import-detail', 'aria-live': 'polite' });
    const errors = el('div', { role: 'alert', class: 'form-error' });
    const projected = el('div', { class: 'import-counts', role: 'status' });
    const confirm = el('input', { type: 'checkbox', disabled: true });
    const inspect = button('Lấy bản xem trước', () => {
      if (!batch || batch.errors.length) return;
      const ticket = preview.set(batch, currentClass.id);
      confirm.checked = false;
      confirm.disabled = true;
      apply.disabled = true;
      void run(
        async (isCurrent) => {
          const result = await gate.call({
            op: 'roster.preview',
            classId: currentClass.id,
            headers: batch.headers,
            rows: batch.rows,
          });
          if (!isCurrent() || !entry.dialog.open) return;
          showCounts(result);
          if (preview.accept(result, ticket)) confirm.disabled = false;
        },
        () => {
          preview.clear();
          confirm.checked = false;
          confirm.disabled = true;
          apply.disabled = true;
        },
      );
    });
    const apply = button(
      'Áp dụng danh sách',
      () => {
        if (!confirm.checked) return;
        let payload;
        try {
          payload = preview.apply(currentClass.id);
        } catch {
          errors.textContent = 'Bản xem trước đã hết hạn hoặc thay đổi. Hãy lấy lại bản xem trước.';
          confirm.disabled = true;
          apply.disabled = true;
          return;
        }
        apply.disabled = true;
        confirm.disabled = true;
        void run(
          async (isCurrent) => {
            const result = await gate.call(payload);
            if (!isCurrent() || !entry.dialog.open) return;
            if (result.committed !== true || result.counts?.error !== 0) throw new AdminError();
            showCounts(result);
            preview.clear();
            batch = null;
            file.value = '';
            dirty = false;
            inspect.disabled = true;
            status.textContent =
              'Đã áp dụng danh sách. Đóng hộp thoại và tải lại danh sách học sinh.';
          },
          (e) => {
            preview.clear();
            confirm.checked = false;
            confirm.disabled = true;
            apply.disabled = true;
            errors.textContent = adminMessage(e);
          },
        );
      },
      'button primary',
    );
    inspect.disabled = apply.disabled = true;
    confirm.addEventListener('change', () => {
      apply.disabled = !confirm.checked || confirm.disabled;
    });
    function showCounts(result) {
      projected.replaceChildren();
      errors.replaceChildren();
      for (const [key, label] of [
        ['insert', 'INSERT'],
        ['update', 'UPDATE'],
        ['unchanged', 'Không đổi'],
        ['error', 'Lỗi'],
      ]) {
        const count = result.counts?.[key];
        if (!Number.isSafeInteger(count) || count < 0 || count > 2000) throw new AdminError();
        projected.append(el('p', {}, `${label}: ${count}`));
      }
      for (const error of result.errors || [])
        if (Number.isSafeInteger(error.row) && Number.isInteger(error.column))
          errors.append(
            el('p', {}, `Dòng ${error.row}, cột ${error.column}: thông tin chưa hợp lệ.`),
          );
    }
    file.addEventListener('change', async () => {
      const ticket = ++serial;
      reading?.abort();
      reading = new AbortController();
      cancel();
      preview.clear();
      batch = null;
      confirm.checked = false;
      confirm.disabled = true;
      inspect.disabled = apply.disabled = true;
      setPendingMessage(fileProgress, '');
      detail.setAttribute('aria-busy', 'false');
      detail.replaceChildren();
      errors.replaceChildren();
      projected.replaceChildren();
      dirty = true;
      const selected = file.files[0];
      if (!selected) return;
      setPendingMessage(fileProgress, 'Đang đọc và kiểm tra tệp trên thiết bị…');
      detail.setAttribute('aria-busy', 'true');
      try {
        const result = await readFile(selected, { signal: reading.signal });
        if (ticket !== serial || disposed || !entry.dialog.open) return;
        batch = result;
        detail.replaceChildren(
          el(
            'p',
            {},
            `Tệp: ${selected.name}${result.sheetName ? ` · Trang tính: ${result.sheetName}` : ''}`,
          ),
        );
        const fields =
          result.width === 2 ? ['CMND/CCCD', 'Ngày sinh'] : ['Họ tên', 'CMND/CCCD', 'Ngày sinh'];
        detail.append(
          el('h3', {}, 'Kiểm tra vị trí cột trước khi xác nhận'),
          ...fields.map((label, i) =>
            el(
              'p',
              {},
              `${String.fromCharCode(65 + i)} → ${label} · Tiêu đề: ${result.headers[i] || '(trống)'}`,
            ),
          ),
          el('p', {}, `${result.count} dòng dữ liệu; tên trống/thiếu không xóa tên đã lưu.`),
        );
        for (const error of result.errors)
          errors.append(
            el(
              'p',
              {},
              `Dòng ${error.row}, cột ${error.column}: ${error.code === 'duplicate' || error.code === 'duplicate_identity' ? 'trùng định danh trong tệp' : 'thông tin chưa hợp lệ'}.`,
            ),
          );
        inspect.disabled = result.errors.length > 0;
      } catch (error) {
        if (ticket !== serial || disposed || !entry.dialog.open) return;
        detail.replaceChildren();
        errors.textContent = `${error.row ? `Dòng ${error.row}, cột ${error.column}: ` : ''}Không đọc được tệp. Dùng CSV UTF-8 hoặc XLSX tối đa 1 MiB/2.000 dòng, đúng 2 hoặc 3 cột; định danh dạng text, ngày DD/MM/YYYY; không có công thức/ô gộp/liên kết ngoài.`;
      } finally {
        if (ticket === serial && !disposed && entry.dialog.open) {
          setPendingMessage(fileProgress, '');
          detail.setAttribute('aria-busy', 'false');
        }
      }
    });
    entry.cancel = () => {
      setPendingMessage(fileProgress, '');
      detail.setAttribute('aria-busy', 'false');
      serial++;
      reading?.abort();
      batch = null;
      preview.clear();
    };
    entry.content.append(
      el(
        'p',
        {},
        'Hàng đầu là tiêu đề tùy chỉnh. A–B: định danh/ngày sinh; hoặc A–C: họ tên/định danh/ngày sinh. XLSX đọc trang tính đầu tiên. Tệp chỉ được đọc trong bộ nhớ.',
      ),
      file,
      fileProgress,
      detail,
      errors,
      projected,
      inspect,
      field('Tôi đã kiểm tra mapping và bản xem trước', confirm),
      apply,
    );
  }

  function render() {
    body.setAttribute('aria-busy', String(busy || session.status === 'loading'));
    body.replaceChildren();
    if (session.status === 'loading') {
      body.append(PulseIndicator('Đang xác minh phiên quản trị…'));
      return;
    }
    if (session.status !== 'admin') {
      body.append(
        el('p', {}, 'Cần phiên quản trị đã được xác minh để mở danh sách.'),
        button('Đăng nhập quản trị', onLogin),
      );
      return;
    }
    const toolbar = el('div', { class: 'admin-actions' }, button('Tải lại', load));
    body.append(toolbar);
    if (!currentClass) {
      body.append(
        el(
          'p',
          {},
          classKnown
            ? 'Chưa có lớp đang hoạt động.'
            : 'Thông tin lớp sẽ hiển thị sau khi tải và xác minh.',
        ),
        ...(classKnown ? [button('Tạo lớp', editClass, 'button primary')] : []),
      );
      return;
    }
    body.append(
      el(
        'section',
        { class: 'admin-class' },
        el('h2', {}, currentClass.name),
        el('p', {}, `Năm học: ${currentClass.schoolYear}`),
        button('Chỉnh sửa lớp', editClass),
      ),
    );
    const changeMode = async (next) => {
      if (mode === next || (scoreView && !(await scoreView.prepareExit()))) return;
      scoreView?.dispose();
      scoreView = null;
      mode = next;
      if (mode === 'scores') render();
      else void load();
    };
    body.append(
      el(
        'div',
        { class: 'admin-actions', 'aria-label': 'Khu vực quản trị' },
        button('Lớp và học sinh', () => void changeMode('students'), 'button', {
          'aria-pressed': String(mode === 'students'),
        }),
        button('Quản lý điểm', () => void changeMode('scores'), 'button', {
          'aria-pressed': String(mode === 'scores'),
        }),
      ),
    );
    if (mode === 'scores') {
      if (!scoreView)
        scoreView = GradebookScores({
          request,
          readFile: readScores,
          loadCatalog,
          classroom: currentClass,
          session,
          clock,
          onClass: (value) => {
            currentClass = value;
            const title = body.querySelector('.admin-class h2'),
              year = body.querySelector('.admin-class p');
            if (title) title.textContent = value.name;
            if (year) year.textContent = `Năm học: ${value.schoolYear}`;
          },
          onUnauthorized: () =>
            setSession({ status: 'anonymous', generation: session.generation + 1 }),
        });
      body.append(scoreView.element);
      return;
    }
    const search = el('input', {
      type: 'search',
      placeholder: 'Tìm tên trong trang hiện tại',
      'aria-label': 'Tìm tên trong trang',
      autocomplete: 'off',
    });
    const filter = el(
      'select',
      { 'aria-label': 'Trạng thái trong trang' },
      el('option', { value: 'all' }, 'Tất cả'),
      el('option', { value: 'active' }, 'Đang sử dụng'),
      el('option', { value: 'inactive' }, 'Đã ngừng'),
    );
    body.append(
      el(
        'div',
        { class: 'admin-actions' },
        button('Thêm học sinh', () => studentForm(), 'button primary'),
        button('Nhập CSV/XLSX', importRoster),
        search,
        filter,
      ),
    );
    const tableBody = el('tbody');
    const table = el(
      'table',
      { class: 'admin-table' },
      el('caption', {}, 'Học sinh — định danh được ẩn; tìm/lọc chỉ áp dụng trang hiện tại'),
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          ...['Họ tên', 'Ngày sinh', 'Định danh', 'Trạng thái', 'Thao tác'].map((text) =>
            el('th', { scope: 'col' }, text),
          ),
        ),
      ),
      tableBody,
    );
    const paint = () => {
      tableBody.replaceChildren();
      const visible = students.filter(
        (s) =>
          (s.fullName || '')
            .toLocaleLowerCase('vi')
            .includes(search.value.toLocaleLowerCase('vi')) &&
          (filter.value === 'all' || s.active === (filter.value === 'active')),
      );
      for (const student of visible)
        tableBody.append(
          el(
            'tr',
            {},
            el('td', {}, student.fullName || 'Chưa có tên'),
            el('td', {}, displayDate(student.birthDate)),
            el('td', {}, 'Đã ẩn'),
            el('td', {}, student.active ? 'Đang sử dụng' : 'Đã ngừng'),
            el(
              'td',
              {},
              el(
                'div',
                { class: 'admin-actions' },
                button('Xem', () => readStudent(student, false)),
                button('Sửa', () => readStudent(student, true)),
                button('Hiện CMND/CCCD', () => reveal(student)),
                button(
                  student.active ? 'Ngừng sử dụng' : 'Sử dụng lại',
                  () => void changeStudent(student, student.active ? 'deactivate' : 'reactivate'),
                ),
                button('Xóa', () => void changeStudent(student, 'delete'), 'button danger'),
              ),
            ),
          ),
        );
      if (!visible.length)
        tableBody.append(
          el('tr', {}, el('td', { colspan: 5 }, 'Không có học sinh phù hợp trong trang này.')),
        );
    };
    search.addEventListener('input', paint);
    filter.addEventListener('change', paint);
    paint();
    body.append(
      el(
        'div',
        {
          class: 'admin-table-scroll',
          tabindex: '0',
          role: 'region',
          'aria-label': 'Danh sách học sinh, cuộn ngang khi cần',
        },
        table,
      ),
    );
    const previous = button('Trang trước', () => {
      const original = cursors;
      cursors = cursors.slice(0, -1);
      cursor = cursors.at(-1);
      void run(list, () => {
        cursors = original;
        cursor = cursors.at(-1);
      });
    });
    previous.disabled = cursors.length <= 1;
    const next = button('Trang sau', () => {
      const original = cursors;
      cursor = nextCursor;
      cursors = [...cursors, cursor];
      void run(list, () => {
        cursors = original;
        cursor = cursors.at(-1);
      });
    });
    next.disabled = !nextCursor;
    body.append(
      el(
        'div',
        { class: 'admin-actions' },
        previous,
        el('span', {}, `Trang ${cursors.length}`),
        next,
      ),
    );
  }

  function setSession(value) {
    if (
      disposed ||
      value.generation < session.generation ||
      (value.status === session.status && value.generation === session.generation)
    )
      return;
    closePrivate();
    session = { status: value.status, generation: value.generation };
    render();
    if (session.status === 'admin') void load();
  }
  const beforeUnload = (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  const hideReveal = () => {
    if (document.hidden)
      for (const entry of [...dialogs])
        if (entry.dialog.getAttribute('aria-label') === 'Hiện CMND/CCCD') entry.dialog.close();
  };
  window.addEventListener('beforeunload', beforeUnload);
  document.addEventListener('visibilitychange', hideReveal);
  render();
  return {
    element,
    setSession,
    focus: () => heading.focus(),
    async prepareExit() {
      if (scoreView && !(await scoreView.prepareExit())) return false;
      return (
        !dirty ||
        (await confirm(
          'Rời quản lý điểm?',
          'Dữ liệu đang nhập và tệp chỉ nằm trong bộ nhớ, sẽ bị xóa khi rời trang.',
        ))
      );
    },
    dispose() {
      if (disposed) return;
      closePrivate();
      disposed = true;
      element.replaceChildren();
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('visibilitychange', hideReveal);
    },
  };
}
