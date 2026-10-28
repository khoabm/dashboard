/** Private student-only insight view; receives validated grades and never queries a service. */
import { el } from '../utils/dom.js';
import { analyzeLearningInsights } from '../utils/gradebook-learning-insights.js';

const trends = {
  rising: ['Tiến triển tích cực', '↑'],
  steady: ['Tương đối ổn định', '→'],
  falling: ['Nên xem lại cách ôn tập', '↓'],
  insufficient: ['Chưa đủ điểm để nhận xét', '—'],
};

/**
 * Renders an optional descriptive pattern summary, not an AI prediction or school ranking.
 * Caller replaces the view at each semester read; no local persistence or peer data.
 * @param {Array<object>} scores - Validated ownGrade rows.
 * @param {object} catalog - Validated semester catalog.
 * @returns {HTMLElement} Accessible, bounded summary section.
 */
export function StudentLearningInsights(scores, catalog) {
  const report = analyzeLearningInsights(scores, catalog);
  const section = el('section', {
    class: 'student-learning-insights',
    'aria-label': 'Gợi ý học tập từ điểm thường xuyên',
  });
  const headline = el(
    'div',
    { class: 'student-learning-heading' },
    el(
      'div',
      {},
      el('span', { class: 'student-overline' }, 'GÓC NHÌN HỌC TẬP'),
      el('h3', {}, 'Nhìn lại tiến độ của bạn'),
      el(
        'p',
        {},
        'Phân tích minh bạch từ các cột Thường xuyên 1–4; không dự đoán điểm hay xếp loại học lực.',
      ),
    ),
    el('span', { class: 'student-learning-tag' }, 'Thống kê trên thiết bị'),
  );
  section.append(headline);
  if (!report.recorded) {
    section.append(
      el('p', { class: 'student-learning-empty', role: 'status' }, 'Chưa có điểm để phân tích. Bảng điểm vẫn có thể được xem bình thường.'),
    );
    return section;
  }
  section.append(
    el(
      'div',
      { class: 'student-learning-overview' },
      el(
        'div',
        { class: 'student-learning-stat' },
        el('span', {}, 'Ô điểm đã có'),
        el('strong', {}, `${report.recorded}/${report.slots}`),
      ),
      el(
        'div',
        { class: 'student-learning-stat' },
        el('span', {}, 'Môn đủ dữ liệu xu hướng'),
        el('strong', {}, `${report.analyzed}/8`),
      ),
      el(
        'div',
        { class: 'student-learning-stat' },
        el('span', {}, 'Môn có chiều hướng tăng'),
        el('strong', {}, String(report.rising)),
      ),
    ),
  );
  const cards = el('div', { class: 'student-learning-list' });
  for (const profile of report.profiles) {
    const [message, symbol] = trends[profile.trend];
    cards.append(
      el(
        'article',
        { class: `student-learning-item is-${profile.trend}` },
        el('div', { class: 'student-learning-symbol', 'aria-hidden': 'true' }, symbol),
        el(
          'div',
          { class: 'student-learning-item-body' },
          el('strong', {}, profile.name),
          el('span', {}, message),
          el(
            'small',
            {},
            profile.samples
              ? `${profile.samples}/4 điểm thường xuyên · Trung vị ${profile.median.toFixed(1)}`
              : 'Chưa có điểm thường xuyên',
          ),
        ),
      ),
    );
  }
  section.append(
    cards,
    el(
      'p',
      { class: 'student-learning-disclaimer' },
      'Nhận xét dùng trung vị và xu hướng giữa các cột đánh giá thường xuyên, không phản ánh thời điểm thực tế của từng bài kiểm tra. Dữ liệu ít hoặc thiếu có thể làm kết quả kém tin cậy. Hãy trao đổi với giáo viên khi cần.',
    ),
  );
  return section;
}
