/** Renders CP04 teacher scores/import/publication with injected adapters and memory-only ownership. */
import { el, button, field } from '../utils/dom.js';
import { openDialog, ConfirmDialog } from './primitives.js';
import { PulseIndicator, setPendingMessage } from './pending.js';
import {
  AdminError,
  adminMessage,
  createAdminGate,
  createRosterPreview,
} from '../utils/gradebook-admin.js';
import {
  teacherCatalog,
  teacherPage,
  scoreMutation,
  publicationMutation,
  compareScoreCells,
  SCORE_HEADERS,
} from '../utils/gradebook-scores.js';
import { displayScore } from '../utils/gradebook/decimal.js';

/** Displays one semester/subject and at most twenty students; all writes retain server preconditions. */
export function GradebookScores({
  request,
  loadCatalog,
  readFile,
  classroom,
  session,
  onClass,
  onUnauthorized,
  clock = Date.now,
}) {
  let currentClass = { ...classroom },
    owner = { ...session },
    catalog = null,
    students = [],
    nextCursor = null,
    loadingPage = 1;
  let semester = 1,
    subject = null,
    selected = '',
    sorting = null,
    cursors = [null],
    loaded = false,
    busy = false,
    dirty = false,
    disposed = false,
    generation = 0,
    lastOperation = null;
  let confirmations = new AbortController();
  const dialogs = new Set(),
    gate = createAdminGate(
      (body, options) => {
        lastOperation = body.op;
        const labels = {
          'class.read': 'Đang tải thông tin học kỳ…',
          'students.list': 'Đang tải danh sách học sinh của trang điểm…',
          'scores.read': `Đang tải trang điểm ${loadingPage} của học kỳ đã chọn…`,
          'score.put': 'Đang lưu ô điểm…',
          'score.delete': 'Đang xóa ô điểm…',
          'scores.preview': 'Đang kiểm tra bản xem trước điểm…',
          'scores.apply': 'Đang áp dụng bảng điểm…',
          'semester.publish': 'Đang công bố học kỳ…',
          'semester.unpublish': 'Đang tạm ẩn học kỳ…',
        };
        pending(labels[body.op] || 'Đang tải bảng điểm…');
        return request(body, options);
      },
      () => owner,
    ),
    catalogGate = createAdminGate(
      (_body, options) => loadCatalog({ ...options, classId: currentClass.id }),
      () => owner,
    );
  const preview = createRosterPreview(clock, 'scores');
  // Tabs remain available during reads; the private workspace and dialogs are inert during an operation.
  const heading = el('h2', { tabindex: '-1' }, 'Quản lý điểm');
  const progress = PulseIndicator(),
    status = el('p', { role: 'status', class: 'admin-feedback', 'aria-live': 'polite' });
  const tabs = el('div', { role: 'tablist', 'aria-label': 'Học kỳ' });
  const panel = el('div', { role: 'tabpanel', id: 'teacher-semester', class: 'score-panel' });
  const element = el(
    'section',
    { class: 'teacher-scores', 'aria-label': 'Quản lý điểm giáo viên' },
    heading,
    tabs,
    progress,
    status,
    panel,
  );

  /** Scrubs detached DOM too; private input/score labels never enter persistent storage or logs. */
  function wipe(node) {
    node.querySelectorAll('input,textarea').forEach((n) => {
      n.value = '';
    });
    node.querySelectorAll('[aria-label]').forEach((n) => n.removeAttribute('aria-label'));
    node.querySelectorAll('*').forEach((n) => {
      if (!n.childElementCount) n.textContent = '';
    });
    node.replaceChildren();
  }
  /** Distinguishes an in-flight write from a cancellable read/preview. */
  function writing() {
    return (
      busy &&
      [
        'score.put',
        'score.delete',
        'scores.apply',
        'semester.publish',
        'semester.unpublish',
      ].includes(lastOperation)
    );
  }
  /** Stops waiting, without asserting rollback of any already-sent mutation. */
  function cancel() {
    const uncertain = writing();
    generation++;
    gate.cancel();
    catalogGate.cancel();
    busy = false;
    panel.inert = false;
    pending();
    for (const d of dialogs) d.content.inert = false;
    if (uncertain) {
      loaded = false;
      students = [];
      wipe(panel);
      render();
      status.textContent =
        'Đã dừng chờ kết quả ghi. Thao tác có thể đã hoàn tất; hãy tải lại điểm trước khi thao tác tiếp.';
    }
  }
  /** Clears an owned modal before releasing its detached controls. */
  function closeDialog(entry) {
    setPendingMessage(entry.progress, '');
    entry.stop?.();
    wipe(entry.content);
    dialogs.delete(entry);
    dirty = false;
    entry.dialog.close();
  }
  /** Cancels both editor and confirmation lifetimes. */
  function clearDialogs() {
    confirmations.abort();
    confirmations = new AbortController();
    for (const d of [...dialogs]) closeDialog(d);
    preview.clear();
    dirty = false;
  }
  /** Binds shared confirmation primitives to this workspace. */
  function confirm(title, description) {
    return ConfirmDialog(title, description, { signal: confirmations.signal });
  }
  /** Retains edits on dismissal until explicitly discarded; closes sensitive work on route/session disposal. */
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
          closeDialog(entry);
        }
      },
      { once: true },
    );
    const dismiss = (event) => {
      if (!dirty && !writing()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void confirm(
        'Bỏ thông tin điểm đang nhập?',
        writing()
          ? 'Yêu cầu ghi đã gửi có thể vẫn hoàn tất. Dừng chờ không bảo đảm hủy ghi; hãy tải lại điểm để kiểm tra.'
          : 'Tệp và nội dung chưa áp dụng chỉ nằm trong bộ nhớ.',
      ).then((ok) => {
        if (ok && entry.dialog.open) {
          cancel();
          closeDialog(entry);
        }
      });
    };
    entry.close.addEventListener('click', dismiss, { capture: true });
    entry.dialog.addEventListener('cancel', dismiss);
    return entry;
  }
  /** Mirrors operation feedback into the active modal outside inert content. */
  function pending(message = '') {
    panel.setAttribute('aria-busy', String(!!message));
    setPendingMessage(progress, dialogs.size ? '' : message);
    for (const entry of dialogs) {
      entry.content.setAttribute('aria-busy', String(!!message));
      setPendingMessage(entry.progress, message);
    }
  }

  /** Uses the shared cancellable gate; failed/ambiguous writes are never automatically replayed. */
  async function run(work, failed = () => {}) {
    if (busy || disposed || owner.status !== 'admin') return;
    const ticket = ++generation;
    busy = true;
    panel.inert = true;
    for (const d of dialogs) d.content.inert = true;
    status.textContent = '';
    pending('Đang tải bảng điểm…');
    const current = () => !disposed && generation === ticket && owner.status === 'admin';
    try {
      await work(current);
    } catch (error) {
      if (current()) {
        if ([401, 403].includes(error?.status)) onUnauthorized();
        else {
          status.textContent =
            error?.code === 'catalog_unavailable'
              ? 'Danh mục môn/cột điểm chưa kết nối. Quản lý điểm chưa sẵn sàng.'
              : adminMessage(error);
          failed(error);
        }
      }
    } finally {
      if (current()) {
        busy = false;
        panel.inert = false;
        for (const d of dialogs) d.content.inert = false;
        pending();
      }
    }
  }
  /** Reads only the requested page; mismatched roster/score snapshots fail without guessing identity joins. */
  async function readPage(current, cursor = cursors.at(-1), history = cursors) {
    loadingPage = history.length;
    preview.clear();
    loaded = false;
    students = [];
    wipe(panel);
    render();
    pending(`Đang tải trang điểm ${history.length}…`);
    if (!catalog) {
      pending('Đang tải danh mục môn và cột điểm…');
      const value = await catalogGate.call({});
      if (!current()) return;
      catalog = teacherCatalog(value);
      subject = catalog.subjects[0].code;
    }
    const value = await gate.call({ op: 'class.read' });
    if (!current()) return;
    if (value.class?.id !== currentClass.id) throw new AdminError(409);
    currentClass = value.class;
    onClass({ ...currentClass });
    const scope = { classId: currentClass.id, limit: 20, ...(cursor ? { cursor } : {}) };
    const roster = await gate.call({ op: 'students.list', ...scope });
    const grades = await gate.call({ op: 'scores.read', semester, ...scope });
    if (!current()) return;
    const page = teacherPage(roster, grades, currentClass.id, catalog);
    students = page.students;
    nextCursor = page.nextCursor;
    cursors = [...history];
    selected = students.some((s) => s.id === selected) ? selected : '';
    loaded = true;
    render();
  }
  /** Refreshes only this workspace's class and selected page. */
  function reload() {
    return run((current) => readPage(current));
  }

  /** Discards the prior semester before accepting a new read; old results cannot paint the selected tab. */
  async function selectSemester(value) {
    if (value === semester || !(await prepareExit())) return;
    cancel();
    clearDialogs();
    students = [];
    loaded = false;
    cursors = [null];
    sorting = null;
    selected = '';
    semester = value;
    paintTabs();
    void reload();
  }
  /** Maintains native tab semantics and keyboard focus independently of page reads. */
  function paintTabs() {
    tabs.replaceChildren(
      ...[1, 2].map((n) => {
        const tab = button(
          n === 1 ? 'Học kỳ I' : 'Học kỳ II',
          () => void selectSemester(n),
          'button',
          {
            role: 'tab',
            id: `teacher-semester-${n}`,
            'aria-controls': panel.id,
            'aria-selected': String(n === semester),
            tabindex: n === semester ? '0' : '-1',
          },
        );
        tab.addEventListener('keydown', (event) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next = event.key === 'Home' ? 1 : event.key === 'End' ? 2 : n === 1 ? 2 : 1;
            void selectSemester(next).then(() =>
              tabs.querySelector(`[aria-selected="true"]`)?.focus(),
            );
          }
        });
        return tab;
      }),
    );
    panel.setAttribute('aria-labelledby', `teacher-semester-${semester}`);
  }

  /** Edits one exact cell, retaining the original revision and decimal string until server confirmation. */
  function editScore(student, column) {
    const existing = student.cells.get(`${subject}|${column.code}`),
      selectedSubject = catalog.subjects.find((s) => s.code === subject);
    const published = currentClass[`semester${semester}Published`];
    const entry = dialog('Chỉnh sửa điểm');
    const input = el('input', {
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      maxlength: 32,
      value: existing?.rawScore ?? '',
      required: true,
      'aria-label': 'Điểm gốc',
    });
    const ack = el('input', { type: 'checkbox' }),
      error = el('p', { role: 'alert', class: 'form-error' });
    const save = el('button', { type: 'submit', class: 'button primary' }, 'Lưu điểm');
    const remove = button(
      'Xóa điểm',
      async () => {
        if (
          !(await confirm(
            'Xóa điểm?',
            `${published ? 'Học kỳ đã công bố; học sinh sẽ thấy thay đổi ngay. ' : ''}Xóa ô điểm này, không thay bằng 0.`,
          )) ||
          !entry.dialog.open
        )
          return;
        mutate(true);
      },
      'button danger',
    );
    const update = () => {
      save.disabled = published && !ack.checked;
      remove.disabled = !existing || (published && !ack.checked);
    };
    ack.addEventListener('change', update);
    update();
    const form = el(
      'form',
      {},
      el(
        'p',
        {},
        `${student.fullName || 'Chưa có tên'} · ${selectedSubject.displayName} · ${column.displayName}`,
      ),
      field('Điểm gốc — 0–10, tối đa 5 chữ số thập phân', input),
      el(
        'p',
        { class: 'muted' },
        'Giữ nguyên giá trị gốc; chỉ phần hiển thị được làm tròn một chữ số. Ô trống không phải lệnh xóa.',
      ),
      published &&
        el(
          'div',
          { class: 'publication-warning' },
          el('p', {}, 'Học kỳ đã công bố. Sửa/xóa sẽ ảnh hưởng ngay đến điểm học sinh nhìn thấy.'),
          field('Tôi hiểu ảnh hưởng của thay đổi điểm đã công bố', ack),
        ),
      error,
      el('div', { class: 'admin-actions' }, save, existing && remove),
    );
    const mutate = (deleting) => {
      let payload;
      try {
        payload = scoreMutation({
          classroom: currentClass,
          student,
          semester,
          subjectCode: subject,
          columnCode: column.code,
          existing,
          score: input.value,
          deleting,
          confirmed: deleting,
          acknowledged: ack.checked,
        });
      } catch {
        error.textContent =
          'Nhập điểm từ 0 đến 10 với tối đa 5 chữ số thập phân; không dùng dấu âm, số mũ hoặc dấu phẩy.';
        return;
      }
      void run(
        async (current) => {
          const result = await gate.call(payload);
          if (!current()) return;
          if (deleting ? result.deleted !== true : typeof result.changed !== 'boolean')
            throw new AdminError();
          closeDialog(entry);
          await readPage(current);
          if (current()) status.textContent = 'Đã cập nhật ô điểm.';
        },
        (failure) => {
          error.textContent = adminMessage(failure);
          if ([409, 503].includes(failure.status) || failure.name === 'AbortError') {
            save.disabled = true;
            remove.disabled = true;
          }
        },
      );
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      mutate(false);
    });
    entry.content.append(form);
    input.focus();
  }

  /** Warns conservatively about missing data because current B4 does not expose a publication preflight count. */
  function publication() {
    const publishing = !currentClass[`semester${semester}Published`],
      entry = dialog(publishing ? 'Công bố học kỳ?' : 'Tạm ẩn học kỳ?');
    const ack = el('input', { type: 'checkbox' }),
      error = el('p', { role: 'alert', class: 'form-error' });
    const submit = button(
      publishing ? 'Xác nhận công bố' : 'Xác nhận tạm ẩn',
      () => {
        if (publishing && !ack.checked) return;
        const payload = publicationMutation(currentClass, semester, publishing, true, ack.checked);
        void run(
          async (current) => {
            const result = await gate.call(payload);
            if (!current()) return;
            if (result.class?.id !== currentClass.id) throw new AdminError();
            currentClass = result.class;
            onClass({ ...currentClass });
            closeDialog(entry);
            await readPage(current);
            if (current())
              status.textContent = publishing
                ? 'Đã công bố học kỳ đã chọn.'
                : 'Đã tạm ẩn học kỳ đã chọn.';
          },
          (failure) => {
            error.textContent = adminMessage(failure);
            submit.disabled = true;
          },
        );
      },
      'button primary',
    );
    submit.disabled = publishing;
    ack.addEventListener('change', () => {
      submit.disabled = !ack.checked;
    });
    entry.content.append(
      el(
        'p',
        {},
        `${currentClass.name} · Học kỳ ${semester === 1 ? 'I' : 'II'}. Học kỳ còn lại giữ nguyên.`,
      ),
      publishing
        ? el(
            'div',
            { class: 'publication-warning' },
            el(
              'p',
              {},
              'Có thể còn ô điểm chưa nhập. Chưa có số lượng thiếu được backend xác nhận; không suy từ trang hiện tại thành toàn lớp.',
            ),
            field('Tôi đã kiểm tra và đồng ý công bố kể cả khi còn điểm thiếu', ack),
          )
        : el(
            'p',
            {},
            'Các yêu cầu đọc mới của học sinh phải bị backend từ chối cho học kỳ này; điểm đã lưu không bị xóa.',
          ),
      error,
      submit,
    );
  }

  /** Binds a single server-owned batch to class/semester/file/token; no per-row writes exist. */
  function importScores() {
    if (!loaded || currentClass[`semester${semester}Published`]) return;
    const entry = dialog('Nhập bảng điểm'),
      file = el('input', { type: 'file', accept: '.csv,.xlsx', 'aria-label': 'Chọn tệp điểm' });
    const fileProgress = PulseIndicator();
    const detail = el('div', { class: 'import-detail', 'aria-live': 'polite' }),
      errors = el('div', { role: 'alert', class: 'form-error' }),
      counts = el('div', { class: 'import-counts', role: 'status' });
    const ack = el('input', { type: 'checkbox', disabled: true });
    let batch = null,
      reading = null,
      serial = 0;
    const show = (result) => {
      counts.replaceChildren();
      errors.replaceChildren();
      for (const [key, label] of [
        ['insert', 'INSERT'],
        ['update', 'UPDATE'],
        ['unchanged', 'Không đổi'],
        ['error', 'Lỗi'],
        ['skippedBlank', 'Bỏ qua ô trống'],
      ]) {
        const n = result.counts?.[key];
        if (!Number.isSafeInteger(n) || n < 0 || n > 14000) throw new AdminError();
        counts.append(el('p', {}, `${label}: ${n}`));
      }
      for (const issue of result.errors || [])
        if (
          Number.isSafeInteger(issue.row) &&
          issue.row >= 2 &&
          Number.isInteger(issue.column) &&
          issue.column >= 1 &&
          issue.column <= 10
        )
          errors.append(
            el('p', {}, `Dòng ${issue.row}, cột ${issue.column}: thông tin chưa hợp lệ.`),
          );
    };
    const invalidate = () => {
      preview.clear();
      ack.checked = false;
      ack.disabled = true;
      apply.disabled = true;
    };
    const inspect = button('Lấy bản xem trước điểm', () => {
      if (!batch || batch.errors.length) return;
      invalidate();
      const ticket = preview.set(batch, currentClass.id, semester);
      void run(async (current) => {
        const result = await gate.call({
          op: 'scores.preview',
          classId: currentClass.id,
          semester,
          headers: batch.headers,
          rows: batch.rows,
        });
        if (!current() || !entry.dialog.open) return;
        show(result);
        if (preview.accept(result, ticket)) ack.disabled = false;
      }, invalidate);
    });
    const apply = button(
      'Áp dụng bảng điểm',
      () => {
        if (!ack.checked) return;
        let payload;
        try {
          payload = preview.apply(currentClass.id, semester);
        } catch {
          invalidate();
          errors.textContent = 'Bản xem trước hết hạn hoặc đã thay đổi. Hãy lấy lại và xác nhận.';
          return;
        }
        ack.disabled = true;
        apply.disabled = true;
        void run(
          async (current) => {
            const result = await gate.call(payload);
            if (!current()) return;
            if (result.committed !== true || result.counts?.error !== 0) throw new AdminError();
            closeDialog(entry);
            await readPage(current);
            if (current()) status.textContent = 'Đã áp dụng bảng điểm.';
          },
          (failure) => {
            invalidate();
            errors.textContent = adminMessage(failure);
          },
        );
      },
      'button primary',
    );
    inspect.disabled = apply.disabled = true;
    ack.addEventListener('change', () => {
      apply.disabled = !ack.checked || ack.disabled;
    });
    file.addEventListener('change', async () => {
      const ticket = ++serial;
      reading?.abort();
      reading = new AbortController();
      cancel();
      invalidate();
      batch = null;
      inspect.disabled = true;
      setPendingMessage(fileProgress, '');
      detail.setAttribute('aria-busy', 'false');
      detail.replaceChildren();
      counts.replaceChildren();
      errors.replaceChildren();
      dirty = true;
      const selectedFile = file.files[0];
      if (!selectedFile) return;
      setPendingMessage(fileProgress, 'Đang đọc và kiểm tra tệp trên thiết bị…');
      detail.setAttribute('aria-busy', 'true');
      try {
        const result = await readFile(selectedFile, { signal: reading.signal, catalogs: catalog });
        if (ticket !== serial || disposed || !entry.dialog.open) return;
        batch = result;
        detail.replaceChildren(
          el(
            'p',
            {},
            `Tệp: ${selectedFile.name}${result.sheetName ? ` · ${result.sheetName}` : ''}`,
          ),
          el('p', {}, 'Mapping A–J (không dựa vào tiêu đề):'),
          ...SCORE_HEADERS.map((label, i) =>
            el(
              'p',
              {},
              `${String.fromCharCode(65 + i)} → ${label} · Tiêu đề: ${result.headers[i] || '(trống)'}`,
            ),
          ),
          el(
            'p',
            {},
            `${result.count} dòng; ${result.skippedBlank} ô trống bỏ qua. Số bản ghi trong preview là số ô điểm, không phải số học sinh.`,
          ),
        );
        for (const issue of result.errors)
          errors.append(
            el(
              'p',
              {},
              `Dòng ${issue.row}, cột ${issue.column}: thông tin chưa hợp lệ hoặc trùng ô điểm.`,
            ),
          );
        inspect.disabled = result.errors.length > 0;
      } catch (error) {
        if (ticket !== serial || disposed || !entry.dialog.open) return;
        detail.replaceChildren();
        errors.textContent = `${error.row ? `Dòng ${error.row}, cột ${error.column}: ` : ''}Không đọc được tệp. Dùng CSV UTF-8/XLSX tối đa 1 MiB, 2.000 dòng và đúng 10 cột A–J; định danh text, ngày hợp lệ, điểm tối đa 5 số thập phân; không công thức/ô gộp/liên kết ngoài.`;
      } finally {
        if (ticket === serial && !disposed && entry.dialog.open) {
          setPendingMessage(fileProgress, '');
          detail.setAttribute('aria-busy', 'false');
        }
      }
    });
    entry.stop = () => {
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
        `${currentClass.name} · Học kỳ ${semester === 1 ? 'I' : 'II'} · ${currentClass.schoolYear}`,
      ),
      el(
        'p',
        {},
        'Chỉ đọc trang tính đầu tiên. Ô điểm trống bỏ qua; 0 là một giá trị. Server kiểm tra lại toàn bộ batch trước khi áp dụng.',
      ),
      file,
      fileProgress,
      detail,
      errors,
      counts,
      inspect,
      field('Tôi đã kiểm tra mapping và bản xem trước điểm', ack),
      apply,
    );
  }

  /** Shows catalog-ordered subjects/columns, exact page sorting and accessible individual score controls. */
  function render() {
    panel.replaceChildren();
    panel.inert = busy;
    const templates = el(
      'div',
      { class: 'admin-actions' },
      el(
        'a',
        { href: '/templates/score-template.csv', download: 'mau-bang-diem.csv', class: 'button' },
        'Mẫu CSV điểm',
      ),
      el(
        'a',
        { href: '/templates/score-template.xlsx', download: 'mau-bang-diem.xlsx', class: 'button' },
        'Mẫu Excel điểm',
      ),
    );
    if (!loaded) {
      panel.append(
        button('Tải lại điểm', reload),
        el('p', {}, 'Chỉ dữ liệu đã tải và xác minh mới xuất hiện trong bảng điểm.'),
        templates,
      );
      return;
    }
    const published = currentClass[`semester${semester}Published`];
    const upload = button('Nhập CSV/XLSX điểm', importScores);
    upload.disabled = published;
    const subjectSelect = el(
      'select',
      { 'aria-label': 'Môn học' },
      ...catalog.subjects.map((s) =>
        el('option', { value: s.code, selected: subject === s.code }, s.displayName),
      ),
    );
    subjectSelect.addEventListener('change', () => {
      subject = subjectSelect.value;
      sorting = null;
      render();
      panel.querySelector('[aria-label="Môn học"]')?.focus();
    });
    const pupil = el(
      'select',
      { 'aria-label': 'Học sinh trong trang' },
      el('option', { value: '', selected: !selected }, 'Tất cả học sinh trang này'),
      ...students.map((s, i) =>
        el(
          'option',
          { value: s.id, selected: selected === s.id },
          s.fullName || `Học sinh ${i + 1} (chưa có tên)`,
        ),
      ),
    );
    pupil.addEventListener('change', () => {
      selected = pupil.value;
      render();
      panel.querySelector('[aria-label="Học sinh trong trang"]')?.focus();
    });
    panel.append(
      el(
        'p',
        { class: published ? 'publication-warning' : 'muted' },
        `Học kỳ ${semester === 1 ? 'I' : 'II'}: ${published ? 'Đã công bố — tạm ẩn trước khi import.' : 'Chưa công bố'}`,
      ),
      el(
        'p',
        { class: 'muted' },
        `Học kỳ I: ${currentClass.semester1Published ? 'Đã công bố' : 'Chưa công bố'} · Học kỳ II: ${currentClass.semester2Published ? 'Đã công bố' : 'Chưa công bố'}`,
      ),
      el(
        'div',
        { class: 'admin-actions' },
        subjectSelect,
        pupil,
        upload,
        button(published ? 'Tạm ẩn học kỳ' : 'Công bố học kỳ', publication),
        button('Tải lại điểm', reload),
      ),
      templates,
      el(
        'p',
        { class: 'muted' },
        'Nhấn ô để thêm/sửa điểm. Nhấn tên cột để sắp xếp điểm gốc trong trang hiện tại; ô thiếu luôn ở cuối.',
      ),
    );
    const list = students.filter((s) => !selected || s.id === selected);
    if (sorting)
      list.sort((a, b) =>
        compareScoreCells(
          a.cells.get(`${subject}|${sorting.column}`),
          b.cells.get(`${subject}|${sorting.column}`),
          sorting.descending,
        ),
      );
    const table = el(
      'table',
      { class: 'admin-table scores-grid' },
      el(
        'caption',
        {},
        `${catalog.subjects.find((s) => s.code === subject).displayName} · Học kỳ ${semester === 1 ? 'I' : 'II'} · Trang ${cursors.length}`,
      ),
    );
    const head = el('tr', {}, el('th', { scope: 'col' }, 'Học sinh'));
    for (const column of catalog.scoreColumns)
      head.append(
        el(
          'th',
          {
            scope: 'col',
            'aria-sort':
              sorting?.column === column.code
                ? sorting.descending
                  ? 'descending'
                  : 'ascending'
                : 'none',
          },
          button(column.displayName, () => {
            sorting = {
              column: column.code,
              descending: sorting?.column === column.code && !sorting.descending,
            };
            render();
            panel.querySelectorAll('thead button')[catalog.scoreColumns.indexOf(column)]?.focus();
          }),
        ),
      );
    const rows = el('tbody');
    for (const student of list)
      rows.append(
        el(
          'tr',
          {},
          el('th', { scope: 'row' }, student.fullName || 'Chưa có tên'),
          ...catalog.scoreColumns.map((column) => {
            const score = student.cells.get(`${subject}|${column.code}`),
              display = score ? displayScore(score.rawScore) : '—';
            return el(
              'td',
              {},
              button(display, () => editScore(student, column), 'button score-cell', {
                'aria-label': `${student.fullName || 'Chưa có tên'} · ${column.displayName}: ${display}`,
              }),
            );
          }),
        ),
      );
    if (!list.length)
      rows.append(el('tr', {}, el('td', { colspan: 8 }, 'Không có học sinh trong trang này.')));
    table.append(el('thead', {}, head), rows);
    const prev = button(
      'Trang điểm trước',
      () => void run((current) => readPage(current, cursors.at(-2), cursors.slice(0, -1))),
    );
    prev.disabled = cursors.length <= 1;
    const next = button(
      'Trang điểm sau',
      () => void run((current) => readPage(current, nextCursor, [...cursors, nextCursor])),
    );
    next.disabled = !nextCursor;
    panel.append(
      el(
        'div',
        {
          class: 'admin-table-scroll',
          role: 'region',
          tabindex: '0',
          'aria-label': 'Bảng điểm, cuộn ngang khi cần',
        },
        table,
      ),
      el(
        'div',
        { class: 'admin-actions' },
        prev,
        el('span', {}, `Trang điểm ${cursors.length}`),
        next,
      ),
    );
  }
  /** Requires an explicit discard decision before abandoning an unsent form/file. */
  async function prepareExit() {
    return (
      (!dirty && !writing()) ||
      (await confirm(
        'Rời bảng điểm?',
        writing()
          ? 'Yêu cầu ghi đã gửi có thể vẫn hoàn tất. Khi quay lại, hãy tải lại điểm để kiểm tra.'
          : 'Điểm đang nhập và tệp chưa áp dụng sẽ bị xóa khỏi bộ nhớ.',
      ))
    );
  }
  const unload = (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', unload);
  paintTabs();
  render();
  void reload();
  return {
    element,
    reload,
    pending: () => busy,
    prepareExit,
    dispose() {
      if (disposed) return;
      cancel();
      clearDialogs();
      disposed = true;
      owner = { status: 'anonymous', generation: owner.generation + 1 };
      students = [];
      catalog = null;
      currentClass = null;
      wipe(element);
      window.removeEventListener('beforeunload', unload);
    },
  };
}
