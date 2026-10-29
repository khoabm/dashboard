/** Renders one student's semester and one on-demand aggregate chart; owns every private read/dialog. */
import { el, button } from '../utils/dom.js';
import { PulseIndicator } from './pending.js';
import { openDialog } from './primitives.js';
import { displayScore } from '../utils/gradebook/decimal.js';
import { StudentLearningInsights } from './student-learning-insights.js';
import {
  studentContext,
  ownGrades,
  histogram,
  bucketFor,
  createStudentRead,
} from '../utils/student-gradeboard.js';

const messages = {
  loading: 'Đang tải điểm…',
  denied: 'Hiện chưa thể xem điểm của học kỳ này.',
  expired: 'Thời gian xem bảng điểm đã hết. Vui lòng xác minh lại.',
  limited: 'Vui lòng đợi một lúc trước khi thử lại.',
  unavailable: 'Tạm thời chưa tải được thông tin. Vui lòng thử lại sau.',
};

/** A verified context is server-issued presentation metadata, not a browser-selected student identity. */
export function StudentGradeboard({ context, read, onReset }) {
  const catalog = studentContext(context);
  let semester = context.class?.semester1Published ? 1 : 2,
    scores = [],
    disposed = false,
    modal = null,
    insightsGeneration = 0;
  const element = el('section', { class: 'student-gradeboard', 'aria-label': 'Bảng điểm của bạn' });
  const tabs = el('div', { class: 'student-semesters', role: 'tablist', 'aria-label': 'Học kỳ' });
  const panel = el('div', {
    id: 'student-semester-panel',
    class: 'student-board-panel',
    role: 'tabpanel',
    tabindex: '0',
  });
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
  // Keep the accepted student routes and publication controls; change only this private view.
  element.append(
    el(
      'div',
      { class: 'student-board-heading' },
      el(
        'div',
        { class: 'student-board-title' },
        el('span', { class: 'student-overline' }, 'KẾT QUẢ HỌC TẬP'),
        el('h2', {}, 'Bảng điểm của bạn'),
        el(
          'p',
          { class: 'student-classline' },
          context.class.name,
          ' · Năm học ',
          context.class.schoolYear,
        ),
      ),
      el(
        'div',
        { class: 'student-board-counter', 'aria-label': '8 môn học và 2 học kỳ' },
        '8 môn học',
        el('span', {}, '·'),
        '2 học kỳ',
      ),
    ),
    el(
      'div',
      { class: 'student-semester-row' },
      tabs,
      button('Xác minh lại', onReset, 'button subtle student-reset-button'),
    ),
    el(
      'p',
      { class: 'student-board-guide' },
      el('span', { 'aria-hidden': 'true' }, '↗'),
      'Chọn một ô điểm để xem có bao nhiêu bạn trong lớp đạt từng mức điểm. Dấu — nghĩa là chưa có điểm.',
    ),
    panel,
  );
  // Insights are strictly derived from already authorized semester scores; no additional reads.
  const insightsRegion = el('div', { class: 'student-learning-region' });
  element.append(insightsRegion);
  const grades = createStudentRead(read, (snapshot) => {
    insightsRegion.replaceChildren();
    if (disposed) return;
    scores = [];
    insightsGeneration++;
    panel.replaceChildren();
    panel.setAttribute('aria-busy', String(snapshot.status === 'loading'));
    if (snapshot.status !== 'ready') {
      panel.append(
        snapshot.status === 'loading'
          ? PulseIndicator(messages.loading)
          : el('p', { role: 'status' }, messages[snapshot.status]),
      );
      if (['limited', 'unavailable'].includes(snapshot.status))
        panel.append(button('Thử lại', () => select(semester), 'button'));
      if (snapshot.status === 'expired') onReset();
      return;
    }
    scores = snapshot.value;
    insightsRegion.replaceChildren(StudentLearningInsights(scores, catalog));
    // An already verified, published own-grade response drives session-only insights.
    const insightHost = el('div', { class: 'learning-insights-host', 'aria-busy': 'true' });
    panel.append(insightHost);
    const insightTicket = ++insightsGeneration;
    void import('./gradebook-learning-insights.js')
      .then(({ LearningInsights }) => {
        if (disposed || insightTicket !== insightsGeneration) return;
        insightHost.setAttribute('aria-busy', 'false');
        insightHost.replaceChildren(LearningInsights(scores, catalog));
      })
      .catch(() => {
        if (disposed || insightTicket !== insightsGeneration) return;
        insightHost.setAttribute('aria-busy', 'false');
        insightHost.replaceChildren(el('p', { role: 'status' }, 'Chưa mở được phần góc nhìn học tập. Bảng điểm vẫn có thể sử dụng.'));
      });
    const table = el(
      'table',
      { class: 'student-score-table' },
      el('caption', {}, 'Điểm được làm tròn đến một chữ số thập phân khi hiển thị.'),
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
                  'aria-label': `${subject.displayName}, ${column.displayName}: ${raw === null ? 'chưa có điểm' : displayScore(raw)}. Xem số học sinh theo từng mức điểm`,
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
        { class: 'student-table-card' },
        el(
          'div',
          {
            class: 'student-table-scroll',
            tabindex: '0',
            'aria-label': 'Cuộn ngang để xem đủ bảy cột điểm',
          },
          table,
        ),
        el(
          'p',
          { class: 'student-table-footnote' },
          'Chọn một ô điểm để xem biểu đồ của lớp. Các điểm trong bảng đã được làm tròn.',
        ),
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
    insightsGeneration++;
    insightsRegion.replaceChildren();
    controls.forEach((control, index) => {
      control.setAttribute('aria-selected', String(index + 1 === semester));
      control.tabIndex = index + 1 === semester ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', controls[semester - 1].id);
    void grades.run({ op: 'grades', semester }, (value) => ownGrades(value, semester, catalog));
  }
  function openHistogram(subjectCode, columnCode) {
    modal?.dispose();
    const entry = openDialog('Biểu đồ điểm của lớp');
    entry.dialog.classList.add('student-chart-dialog');
    const subject = el(
      'select',
      { 'aria-label': 'Môn học' },
      ...catalog.subjects.map((s) => el('option', { value: s.code }, s.displayName)),
    );
    const column = el(
      'select',
      { 'aria-label': 'Loại điểm' },
      ...catalog.scoreColumns.map((c) => el('option', { value: c.code }, c.displayName)),
    );
    subject.value = subjectCode;
    column.value = columnCode;
    const chart = el('div', { class: 'student-chart-stage', 'aria-live': 'polite' });
    const insight = el('div', { class: 'student-insight-grid', 'aria-live': 'polite' });
    const contextLine = el('p', { class: 'student-chart-context' });
    const scrollHint = el(
      'span',
      { class: 'student-chart-scroll-hint', hidden: true },
      'Kéo thanh cuộn bên dưới biểu đồ để xem các mức điểm khác',
    );
    entry.content.append(
      el(
        'div',
        { class: 'student-chart-lead' },
        el('span', { class: 'student-overline' }, 'CÙNG XEM ĐIỂM CỦA LỚP'),
        contextLine,
      ),
      el(
        'div',
        { class: 'student-chart-selectors' },
        el('label', {}, 'Môn học', subject),
        el('label', {}, 'Loại điểm', column),
      ),
      insight,
      el(
        'section',
        { class: 'student-chart-surface', 'aria-label': 'Biểu đồ phân bố điểm của lớp' },
        el(
          'div',
          { class: 'student-chart-surface-heading' },
          el('strong', {}, 'Mỗi mức điểm có bao nhiêu học sinh?'),
          el('span', {}, 'Chỉ hiển thị mức điểm có học sinh'),
        ),
        chart,
      ),
      el(
        'p',
        { class: 'student-chart-explanation' },
        'Điểm trên biểu đồ được làm tròn đến một chữ số thập phân. ',
        'Ví dụ, 8.25 được xếp vào mức 8.3; các bạn trong cùng cột có thể có điểm chưa làm tròn khác nhau.',
      ),
      el(
        'div',
        { class: 'student-chart-footer' },
        scrollHint,
        button('Đóng biểu đồ', () => entry.dialog.close(), 'button subtle student-chart-close'),
      ),
    );
    let closed = false,
      plotView = null,
      plotGeneration = 0;
    const channel = createStudentRead(read, (snapshot) => {
      if (closed || disposed) return;
      const plotTicket = ++plotGeneration;
      plotView?.dispose();
      plotView = null;
      chart.replaceChildren();
      scrollHint.hidden = true;
      chart.setAttribute('aria-busy', String(snapshot.status === 'loading'));
      if (snapshot.status !== 'ready') {
        chart.append(
          snapshot.status === 'loading'
            ? PulseIndicator('Đang tải dữ liệu biểu đồ…')
            : el('p', { role: 'status' }, messages[snapshot.status]),
        );
        if (snapshot.status === 'denied') {
          scores = [];
          insightsRegion.replaceChildren();
          panel.replaceChildren(el('p', { role: 'status' }, messages.denied));
        }
        if (['limited', 'unavailable'].includes(snapshot.status))
          chart.append(button('Thử lại', () => load(), 'button'));
        return;
      }
      const raw = personal(subject.value, column.value),
        highlight = bucketFor(raw),
        buckets = snapshot.value;
      const count =
        highlight === null ? null : buckets.find((b) => b.scoreBucket === highlight)?.studentCount;
      insight.replaceChildren(
        el(
          'div',
          { class: 'student-insight-primary' },
          el('span', { class: 'student-insight-label' }, 'ĐIỂM CHƯA LÀM TRÒN'),
          el('strong', { class: 'student-insight-value' }, raw === null ? '—' : raw),
          el(
            'span',
            { class: 'student-insight-detail' },
            raw === null ? 'Chưa có điểm ở mục này' : `Trên biểu đồ: mức ${highlight}`,
          ),
        ),
        el(
          'div',
          { class: 'student-insight-secondary' },
          el('span', { class: 'student-insight-label' }, 'SỐ HỌC SINH Ở MỨC ĐIỂM NÀY'),
          el('strong', { class: 'student-insight-value' }, count === null ? '—' : String(count)),
          el(
            'span',
            { class: 'student-insight-detail' },
            count === null ? 'Chưa có mức điểm để đánh dấu' : `Mức điểm ${highlight}`,
          ),
        ),
      );
      if (!buckets.some((b) => b.studentCount)) {
        chart.append(el('p', { role: 'status' }, 'Lớp chưa có điểm ở mục này.'));
        return;
      }
      chart.setAttribute('aria-busy', 'true');
      chart.append(PulseIndicator('Đang chuẩn bị biểu đồ…'));
      void import('./student-chart.js')
        .then(({ StudentChart }) => {
          if (closed || disposed || plotTicket !== plotGeneration) return;
          chart.setAttribute('aria-busy', 'false');
          plotView = StudentChart(chart, buckets, highlight, (needsScroller) => {
            if (!closed && !disposed && plotTicket === plotGeneration)
              scrollHint.hidden = !needsScroller;
          });
        })
        .catch(() => {
          if (!closed && !disposed && plotTicket === plotGeneration) {
            chart.setAttribute('aria-busy', 'false');
            chart.replaceChildren(
              el('p', { role: 'status' }, 'Chưa mở được biểu đồ. Bạn có thể đóng và thử lại.'),
            );
          }
        });
    });
    const load = () => {
      const selection = { semester, subjectCode: subject.value, columnCode: column.value };
      const chosenSubject = catalog.subjects.find((item) => item.code === selection.subjectCode);
      const chosenColumn = catalog.scoreColumns.find((item) => item.code === selection.columnCode);
      contextLine.textContent = `Học kỳ ${semester === 1 ? 'I' : 'II'} · ${chosenSubject.displayName} · ${chosenColumn.displayName}`;
      insight.replaceChildren();
      void channel.run({ op: 'histogram', ...selection }, (value) => histogram(value, selection));
    };
    subject.addEventListener('change', load);
    column.addEventListener('change', load);
    const dispose = () => {
      if (closed) return;
      closed = true;
      channel.dispose();
      plotGeneration++;
      plotView?.dispose();
      plotView = null;
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
      insightsRegion.replaceChildren();
      element.replaceChildren();
    },
  };
}
