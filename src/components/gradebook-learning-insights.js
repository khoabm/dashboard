/** A collapsible, session-only student learning insights view with an accessible SVG trend chart. */
import { el, button } from '../utils/dom.js';
import { analyzeLearningInsights } from '../utils/gradebook-learning-insights.js';
import { subjectLearningFeedback } from '../utils/gradebook-learning-feedback.js';
import { weightedComparisonPlan, compareWeightedClass, weightedClassFeedback } from '../utils/gradebook-learning-comparison.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const trendLabels = {
  rising: 'Xu hướng tăng',
  falling: 'Xu hướng giảm',
  steady: 'Xu hướng ổn định',
  insufficient: 'Chưa đủ dữ liệu',
};
const trendPaths = {
  rising: 'M5 17 17 5 M8 5h9v9',
  falling: 'M5 7 17 19 M8 19h9v-9',
  steady: 'M4 12h16',
  insufficient: 'M12 18v-1 M9 9a3 3 0 1 1 4.6 2.5c-1.3.8-1.6 1.4-1.6 2.5',
  scores: 'M4 19V5 M4 19h16 M7 14l4-4 4 2 4-6',
  chart: 'M3 18h18 M5 15l5-5 4 2 5-7',
  sparkle: 'M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z',
  chevron: 'M7 10l5 5 5-5',
};

/** Creates only reviewed inline SVG geometry; all decorative icons stay out of tab order. */
function svgNode(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  for (const child of children) node.append(child);
  return node;
}

function icon(kind) {
  return svgNode(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '20',
      height: '20',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.8',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    [svgNode('path', { d: trendPaths[kind] })],
  );
}

/** Renders actual TX1–TX4 points and never connects a missing middle observation. */
function scoreChart(profile) {
  const svg = svgNode('svg', {
    viewBox: '0 0 620 238',
    class: 'learning-chart-svg',
    role: 'img',
    'aria-label': `Biểu đồ bốn mốc Thường xuyên môn ${profile.name}. Dữ liệu: ${profile.points.map((p) => `${p.label} ${p.display}`).join(', ')}`,
  });
  const coordinate = (point) => ({
    x: 65 + point.index * 165,
    y: 210 - point.value * 18,
  });
  for (const tick of [10, 5, 0]) {
    const y = 210 - tick * 18;
    svg.append(
      svgNode('line', {
        x1: '55',
        y1: y,
        x2: '567',
        y2: y,
        stroke: '#dbe8de',
        'stroke-dasharray': tick === 0 ? 'none' : '4 7',
      }),
      svgNode(
        'text',
        {
          x: '24',
          y: y + 4,
          'text-anchor': 'middle',
          fill: '#708476',
          'font-size': '13',
        },
        [document.createTextNode(String(tick))],
      ),
    );
  }
  for (let index = 0; index < profile.points.length - 1; index++) {
    const left = profile.points[index];
    const right = profile.points[index + 1];
    if (left.value === null || right.value === null) continue;
    const start = coordinate(left);
    const end = coordinate(right);
    svg.append(
      svgNode('line', {
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        stroke: '#388461',
        'stroke-width': '3.5',
        'stroke-linecap': 'round',
      }),
    );
  }
  for (const point of profile.points) {
    if (point.value === null) continue;
    const pos = coordinate(point);
    svg.append(
      svgNode('circle', {
        cx: pos.x,
        cy: pos.y,
        r: '7',
        fill: 'white',
        stroke: '#327d58',
        'stroke-width': '3',
      }),
      svgNode(
        'text',
        {
          x: pos.x,
          y: Math.max(17, pos.y - 14),
          'text-anchor': 'middle',
          fill: '#205742',
          'font-size': '14',
          'font-weight': '700',
        },
        [document.createTextNode(point.display)],
      ),
    );
  }
  const labels = el(
    'div',
    { class: 'learning-chart-markers' },
    ...profile.points.map((point) =>
      el(
        'div',
        { class: 'learning-chart-marker' },
        el('span', {}, `TX${point.index + 1}`),
        el('strong', {}, point.display),
      ),
    ),
  );
  return el(
    'figure',
    { class: 'learning-chart-figure' },
    el('figcaption', {}, 'Biến động điểm Thường xuyên 1–4'),
    svg,
    labels,
  );
}

/** Builds one personal subject detail without requesting more grades or class peer data. */
function subjectDetail(profile) {
  const hasEnough = profile.trend !== 'insufficient';
  const feedback = subjectLearningFeedback(profile);
  return el(
    'section',
    { class: 'learning-detail', 'aria-label': `Chi tiết môn ${profile.name}` },
    el(
      'div',
      { class: 'learning-detail-heading' },
      el(
        'div',
        {},
        el('h4', {}, profile.name),
        el('p', {}, 'Trung vị điểm Thường xuyên: ', profile.medianLabel),
      ),
      el(
        'span',
        { class: `learning-trend learning-trend--${profile.trend}` },
        icon(profile.trend),
        trendLabels[profile.trend],
      ),
    ),
    scoreChart(profile),
    el(
      'p',
      { class: 'learning-chart-note' },
      hasEnough
        ? 'Đường nối chỉ thể hiện các lần Thường xuyên liền kề có điểm; chưa có đủ thông tin thời gian để suy ra tốc độ tiến bộ.'
        : 'Cần tối thiểu ba điểm Thường xuyên để xác định xu hướng. Mốc chưa có điểm không được nối hoặc ước lượng.',
    ),
    el('h5', {}, 'Các lần kiểm tra khác'),
    el(
      'div',
      { class: 'learning-other-grid' },
      ...profile.assessments.map((item) =>
        el(
          'div',
          { class: 'learning-other-item' },
          el('span', {}, item.label),
          el('strong', {}, item.display),
        ),
      ),
    ),
    el(
      'p',
      { class: 'learning-chart-note' },
      'Các cột 1 tiết, Giữa kì và Cuối kì được hiển thị độc lập, không tham gia tính trung vị hoặc xu hướng Thường xuyên.',
    ),
  );
}

/**
 * Builds a locally derived, initially collapsed insights region using an existing own-grade DTO.
 * Called only after a verified semester read is ready; removing its DOM removes all sensitive views.
 *
 * @param {Array<object>} scores - Current semester's validated own score rows.
 * @param {object} catalog - The validated eight-subject/seven-column presentation catalog.
 * @returns {HTMLElement} An accessible expandable insights section.
 */
export function LearningInsights(scores, catalog, { read, semester } = {}) {
  const summary = analyzeLearningInsights(scores, catalog);
  const root = el('section', { class: 'learning-insights', 'aria-label': 'Góc nhìn học tập' });
  const titleId = 'student-learning-insights-heading';
  const detailsId = 'student-learning-insights-content';
  const toggle = button('', () => setExpanded(!expanded), 'learning-insights-toggle', {
    'aria-expanded': 'false',
    'aria-controls': detailsId,
    'aria-labelledby': titleId,
  });
  const heading = el(
    'span',
    { class: 'learning-insights-heading-copy' },
    el('span', { class: 'learning-insights-overline' }, icon('sparkle'), 'AI LEARNING INSIGHTS'),
    el('strong', { id: titleId }, 'Góc nhìn học tập'),
    el(
      'span',
      { class: 'learning-insights-subtitle' },
      'Cùng nhìn lại điểm số và tìm cách học phù hợp',
    ),
  );
  toggle.append(heading, el('span', { class: 'learning-chevron' }, icon('chevron')));
  const stats = [
    {
      iconName: 'scores',
      label: 'Điểm đã được ghi nhận',
      value: `${summary.recorded}/${summary.slots}`,
    },
    { iconName: 'chart', label: 'Môn có thể xem xu hướng', value: `${summary.analyzed}/8` },
    { iconName: 'rising', label: 'Môn đang tiến bộ', value: String(summary.rising) },
  ];
  const statGrid = el(
    'div',
    { class: 'learning-stat-grid' },
    ...stats.map((item) =>
      el(
        'div',
        { class: 'learning-stat' },
        el('span', { class: 'learning-stat-icon', 'aria-hidden': 'true' }, icon(item.iconName)),
        el('div', {}, el('strong', {}, item.value), el('span', {}, item.label)),
      ),
    ),
  );
  const profileGrid = el('div', {
    class: 'learning-subject-grid',
    role: 'group',
    'aria-label': 'Chọn môn học để xem chi tiết',
  });
  const detail = el('div', { class: 'learning-detail-slot', 'aria-live': 'off' });
  const feedbackHeading = el('h4', { class: 'learning-feedback-heading' });
  const feedbackObservation = el('p', { class: 'learning-feedback-observation' });
  const feedbackAdvice = el('p', { class: 'learning-feedback-advice' });

  const classTitle = el('h5', {}, 'So với mặt bằng chung của lớp');
  const classStatus = el('p', { class: 'learning-class-status', role: 'status' }, 'Chỉ tải thống kê khi bạn muốn so sánh.');
  const classAction = button('So sánh với lớp', () => void loadComparison(), 'learning-class-action');
  const classDetails = el('div', { class: 'learning-class-details' });
  const classSection = el('section', { class: 'learning-class-comparison', 'aria-label': 'So sánh điểm trung bình tham khảo với lớp' }, classTitle, classStatus, classDetails, classAction);
  let generation = 0;
  let controller = null;
  let disposed = false;
  const clearComparison = () => {
    generation++;
    controller?.abort();
    controller = null;
    classStatus.textContent = 'Chỉ tải thống kê khi bạn muốn so sánh.';
    classDetails.replaceChildren();
    classAction.hidden = false;
    classAction.disabled = false;
  };
  const loadComparison = async () => {
    if (disposed || classAction.disabled || typeof read !== 'function' || ![1, 2].includes(semester)) return;
    const selected = activeSubject;
    const ticket = ++generation;
    controller = new AbortController();
    classAction.disabled = true;
    classStatus.textContent = 'Đang tổng hợp điểm để so sánh…';
    const plan = weightedComparisonPlan(scores, catalog, selected);
    if (!plan.columns.length) {
      classStatus.textContent = weightedClassFeedback({ status: 'no-scores' });
      classAction.hidden = true;
      classAction.disabled = false;
      return;
    }
    try {
      const responses = [];
      for (const column of plan.columns) {
        const body = { op: 'histogram', semester, subjectCode: selected, columnCode: column.columnCode };
        responses.push(await read(body, { signal: controller.signal }));
        if (disposed || ticket !== generation) return;
      }
      const result = compareWeightedClass(plan, responses, semester);
      if (disposed || ticket !== generation) return;
      classDetails.replaceChildren();
      if (result.status === 'ready') {
        classDetails.append(el('div', { class: 'learning-class-metrics' },
          el('div', {}, el('span', {}, 'Trung bình tham khảo của bạn'), el('strong', {}, result.ownLabel)),
          el('div', {}, el('span', {}, 'Mặt bằng lớp ước tính'), el('strong', {}, result.classLabel)),
        ));
        classDetails.append(el('p', { class: 'learning-class-note' },
          'Tính từ ' + result.usedColumns + '/7 cột điểm, hệ số Thường xuyên ×1, 1 tiết ×2, Giữa kì ×2, Cuối kì ×3. ' +
          (result.incomplete ? 'Dữ liệu còn thiếu hoặc số bạn có điểm giữa các cột chưa đồng đều. ' : '') +
          'Đây là ước lượng từ các biểu đồ phân bố, không phải thứ hạng trong lớp.'));
      }
      classStatus.textContent = weightedClassFeedback(result);
      classAction.hidden = true;
    } catch (error) {
      if (disposed || ticket !== generation) return;
      classDetails.replaceChildren();
      classStatus.textContent = error?.status === 401
        ? 'Phiên xem điểm đã hết. Vui lòng xác minh lại.'
        : error?.status === 403
          ? 'Học kỳ này hiện không còn cho phép xem điểm.'
          : error?.status === 429
            ? 'Đã có nhiều yêu cầu. Vui lòng thử lại sau.'
            : 'Chưa thể tải dữ liệu lớp. Bạn vẫn có thể xem nhận xét cá nhân.';
      classAction.hidden = true;
    } finally {
      if (!disposed && ticket === generation) classAction.disabled = false;
    }
  };

  let activeSubject = summary.profiles[0].subjectCode;
  const selectSubject = (code) => {
    activeSubject = code;
    clearComparison();
    const profile = summary.profiles.find((subject) => subject.subjectCode === code);
    for (const item of profileGrid.children)
      item.setAttribute('aria-pressed', String(item.dataset.subject === code));
    detail.replaceChildren(subjectDetail(profile));
    const feedback = subjectLearningFeedback(profile);
    feedbackHeading.textContent = feedback.heading;
    feedbackObservation.textContent = feedback.observation;
    feedbackAdvice.textContent = feedback.advice;
  };
  for (const profile of summary.profiles) {
    const subjectButton = button(
      '',
      () => selectSubject(profile.subjectCode),
      `learning-subject learning-subject--${profile.trend}`,
      {
        'aria-pressed': 'false',
        'aria-label': `${profile.name}: ${trendLabels[profile.trend]}, trung vị ${profile.medianLabel}. Xem chi tiết`,
      },
    );
    subjectButton.dataset.subject = profile.subjectCode;
    subjectButton.append(
      el(
        'span',
        { class: 'learning-subject-name' },
        profile.name,
        el('span', { class: 'learning-subject-icon' }, icon(profile.trend)),
      ),
      el(
        'span',
        { class: 'learning-subject-median' },
        'Điểm giữa các lần',
        el('strong', {}, profile.medianLabel),
      ),
      el(
        'span',
        { class: 'learning-subject-footnote' },
        `${profile.samples}/4 điểm · ${trendLabels[profile.trend]}`,
      ),
    );
    profileGrid.append(subjectButton);
  }
  selectSubject(activeSubject);
  const body = el(
    'div',
    { class: 'learning-insights-body' },
    statGrid,
    el('p', { class: 'learning-section-title' }, 'Bạn muốn xem môn nào?'),
    profileGrid,
    detail,
    el(
      'section',
      { class: 'learning-feedback-panel', 'aria-label': 'Nhận xét và gợi ý cho môn đã chọn' },
      el('div', { class: 'learning-feedback-title' }, icon('sparkle'), feedbackHeading),
      feedbackObservation,
      classSection,
      el(
        'div',
        { class: 'learning-feedback-tip' },
        el('strong', {}, 'Bạn có thể thử'),
        feedbackAdvice,
      ),
    ),
    el(
      'p',
      { class: 'learning-disclaimer' },
      'Góc nhìn này chỉ dựa trên điểm Thường xuyên đã có, không đánh giá năng lực hay dự đoán kết quả. Hãy trao đổi với giáo viên nếu bạn cần hỗ trợ thêm.',
    ),
  );
  const animation = el(
    'div',
    { class: 'learning-insights-reveal', id: detailsId },
    el('div', { class: 'learning-insights-reveal-inner' }, body),
  );
  let expanded = false;
  animation.inert = true;
  const setExpanded = (value) => {
    expanded = value;
    root.classList.toggle('is-expanded', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    animation.inert = !expanded;
  };
  root.append(toggle, animation);
  root.dispose = () => { disposed = true; clearComparison(); };
  return root;
}
