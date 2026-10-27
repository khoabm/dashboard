/** Renders one student's semester and one on-demand aggregate chart; owns every private read/dialog. */
import { el, button } from '../utils/dom.js';
import { openDialog } from './primitives.js';
import { displayScore } from '../utils/gradebook/decimal.js';
import {
  studentCatalog,
  ownGrades,
  histogram,
  bucketFor,
  createStudentRead,
} from '../utils/student-gradeboard.js';

const messages = {
  loading: 'Đang tải…',
  denied: 'Học kỳ này hiện chưa thể xem.',
  expired: 'Phiên tra cứu đã hết hạn. Vui lòng xác minh lại.',
  limited: 'Vui lòng chờ trước khi thử lại.',
  unavailable: 'Chưa thể tải dữ liệu. Vui lòng thử lại sau.',
};

/** A verified context is server-issued presentation metadata, not a browser-selected student identity. */
export function StudentGradeboard({ context, read, onReset }) {
  const catalog = studentCatalog(context);
  let semester = context.class?.semester1Published ? 1 : 2,
    scores = [],
    disposed = false,
    modal = null;
  const element = el('section', { class: 'student-gradeboard', 'aria-label': 'Bảng điểm của bạn' });
  const tabs = el('div', { class: 'student-semesters', role: 'tablist', 'aria-label': 'Học kỳ' });
  const panel = el('div', { id: 'student-semester-panel', role: 'tabpanel', tabindex: '0' });
  const controls = [1, 2].map((value) =>
    button(`Học kỳ ${value === 1 ? 'I' : 'II'}`, () => select(value), 'button', {
      role: 'tab',
      id: `student-semester-${value}`,
      'aria-controls': panel.id,
    }),
  );
  tabs.append(...controls);
  tabs.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      select(event.key === 'Home' ? 1 : event.key === 'End' ? 2 : semester === 1 ? 2 : 1);
      controls[semester - 1].focus();
    }
  });
  element.append(
    el(
      'div',
      { class: 'student-board-heading' },
      el(
        'div',
        {},
        el('p', { class: 'eyebrow' }, 'HÀNH TRÌNH CỦA BẠN'),
        el('h2', {}, 'Từng nỗ lực, từng tiến bộ'),
      ),
      button('Xác minh lại', onReset, 'button subtle'),
    ),
    tabs,
    panel,
  );
  const grades = createStudentRead(read, (snapshot) => {
    if (disposed) return;
    scores = [];
    panel.replaceChildren();
    panel.setAttribute('aria-busy', String(snapshot.status === 'loading'));
    if (snapshot.status !== 'ready') {
      panel.append(el('p', { role: 'status' }, messages[snapshot.status]));
      if (['limited', 'unavailable'].includes(snapshot.status))
        panel.append(button('Thử lại', () => select(semester), 'button'));
      if (snapshot.status === 'expired') onReset();
      return;
    }
    scores = snapshot.value;
    const table = el(
      'table',
      { class: 'student-score-table' },
      el('caption', {}, 'Điểm hiển thị một chữ số thập phân. Chọn một ô để xem phân bố điểm.'),
    );
    const head = el(
      'tr',
      {},
      el('th', { scope: 'col' }, 'Môn học'),
      ...catalog.scoreColumns.map((c) => el('th', { scope: 'col' }, c.displayName)),
    );
    const body = el('tbody');
    for (const subject of catalog.subjects)
      body.append(
        el(
          'tr',
          {},
          el('th', { scope: 'row' }, subject.displayName),
          ...catalog.scoreColumns.map((column) => {
            const raw = personal(subject.code, column.code);
            return el(
              'td',
              {},
              button(
                raw === null ? '—' : displayScore(raw),
                () => openHistogram(subject.code, column.code),
                'student-score-cell',
                {
                  'aria-label': `${subject.displayName}, ${column.displayName}: ${raw === null ? 'chưa có điểm' : displayScore(raw)}. Xem phân bố điểm`,
                },
              ),
            );
          }),
        ),
      );
    table.append(el('thead', {}, head), body);
    panel.append(
      el(
        'div',
        {
          class: 'student-table-scroll',
          tabindex: '0',
          'aria-label': 'Cuộn ngang để xem đủ bảy cột điểm',
        },
        table,
      ),
    );
  });
  const personal = (subject, col) =>
    scores.find((s) => s.subjectCode === subject && s.columnCode === col)?.rawScore ?? null;
  /** Clears the old semester/chart immediately before requesting a different scope. */
  function select(value) {
    modal?.dispose();
    semester = value;
    scores = [];
    controls.forEach((control, index) => {
      control.setAttribute('aria-selected', String(index + 1 === semester));
      control.tabIndex = index + 1 === semester ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', controls[semester - 1].id);
    void grades.run({ op: 'grades', semester }, (value) => ownGrades(value, semester, catalog));
  }
  function openHistogram(subjectCode, columnCode) {
    modal?.dispose();
    const entry = openDialog('Phân bố điểm');
    entry.dialog.classList.add('student-chart-dialog');
    const subject = el(
      'select',
      { 'aria-label': 'Môn học' },
      ...catalog.subjects.map((s) => el('option', { value: s.code }, s.displayName)),
    );
    const column = el(
      'select',
      { 'aria-label': 'Cột điểm' },
      ...catalog.scoreColumns.map((c) => el('option', { value: c.code }, c.displayName)),
    );
    subject.value = subjectCode;
    column.value = columnCode;
    const chart = el('div', { 'aria-live': 'polite' });
    entry.content.append(
      el(
        'div',
        { class: 'student-chart-selectors' },
        el('label', {}, 'Môn học', subject),
        el('label', {}, 'Cột điểm', column),
      ),
      el(
        'p',
        {},
        'Mỗi cột là một nhóm điểm làm tròn đến 0,1 theo quy tắc half-up; không phải mọi bạn trong nhóm có cùng điểm gốc.',
      ),
      chart,
    );
    let closed = false;
    const channel = createStudentRead(read, (snapshot) => {
      if (closed || disposed) return;
      chart.replaceChildren();
      chart.setAttribute('aria-busy', String(snapshot.status === 'loading'));
      if (snapshot.status !== 'ready') {
        chart.append(el('p', { role: 'status' }, messages[snapshot.status]));
        if (snapshot.status === 'denied') {
          scores = [];
          panel.replaceChildren(el('p', { role: 'status' }, messages.denied));
        }
        if (['limited', 'unavailable'].includes(snapshot.status))
          chart.append(button('Thử lại', () => load(), 'button'));
        return;
      }
      const raw = personal(subject.value, column.value),
        highlight = bucketFor(raw),
        buckets = snapshot.value,
        max = Math.max(1, ...buckets.map((b) => b.studentCount));
      chart.append(
        el(
          'p',
          { class: 'student-exact-score' },
          raw === null
            ? 'Bạn chưa có điểm ở ô này.'
            : `Điểm gốc của bạn: ${raw} · Nhóm ${highlight}`,
        ),
      );
      if (!buckets.some((b) => b.studentCount))
        chart.append(el('p', {}, 'Chưa có điểm trong phân bố này.'));
      const bars = el('div', {
        class: 'student-histogram',
        role: 'list',
        'aria-label': 'Phân bố điểm từ 0 đến 10; chiều cao là số học sinh',
      });
      buckets.forEach((b, index) => {
        const bar = el('span', { class: 'histogram-bar', 'aria-hidden': 'true' });
        bar.style.height = `${(b.studentCount / max) * 100}%`;
        bars.append(
          el(
            'div',
            {
              class: `histogram-bucket${b.scoreBucket === highlight ? ' is-personal' : ''}`,
              role: 'listitem',
              'aria-label': `Nhóm ${b.scoreBucket}: ${b.studentCount} học sinh${b.scoreBucket === highlight ? ', nhóm điểm của bạn' : ''}`,
              title: `${b.scoreBucket}: ${b.studentCount}`,
              tabindex: '0',
            },
            el('span', { class: 'histogram-count' }, String(b.studentCount)),
            el('div', { class: 'histogram-track' }, bar),
            el(
              'span',
              { class: 'histogram-tick' },
              index % 10 === 0 || b.scoreBucket === highlight ? b.scoreBucket : '',
            ),
          ),
        );
      });
      chart.append(
        el('p', { class: 'muted' }, `Số học sinh · Trục dọc 0–${max}`),
        el(
          'div',
          {
            class: 'student-chart-scroll',
            tabindex: '0',
            'aria-label': 'Biểu đồ cuộn ngang: điểm 0 đến 10',
          },
          bars,
        ),
        el(
          'p',
          { class: 'muted' },
          'Trục ngang: điểm từ 0 đến 10 · Cột viền xanh là nhóm điểm của bạn.',
        ),
      );
      const scroll = chart.querySelector('.student-chart-scroll');
      const personalBar = bars.querySelector('.is-personal');
      if (personalBar)
        scroll.scrollLeft = Math.max(
          0,
          personalBar.offsetLeft - bars.offsetLeft - scroll.clientWidth / 2,
        );
    });
    const load = () => {
      const selection = { semester, subjectCode: subject.value, columnCode: column.value };
      void channel.run({ op: 'histogram', ...selection }, (value) => histogram(value, selection));
    };
    subject.addEventListener('change', load);
    column.addEventListener('change', load);
    const dispose = () => {
      if (closed) return;
      closed = true;
      channel.dispose();
      entry.content.replaceChildren();
      entry.dialog.close();
      if (modal?.dispose === dispose) modal = null;
    };
    modal = { dispose };
    entry.dialog.addEventListener('close', dispose, { once: true });
    subject.focus();
    load();
  }
  select(semester);
  return {
    element,
    dispose() {
      disposed = true;
      grades.dispose();
      modal?.dispose();
      scores = [];
      element.replaceChildren();
    },
  };
}
