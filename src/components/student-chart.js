/** Renders only occupied score categories from the validated 101-level class aggregate. */
import { init, use } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  AriaComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { el } from '../utils/dom.js';
import {
  chartWindow,
  occupiedLevelIndex,
  occupiedScoreLevels,
  studentChartOptions,
} from '../utils/student-chart.js';

use([BarChart, GridComponent, TooltipComponent, DataZoomComponent, AriaComponent, SVGRenderer]);

/** Owns chart keyboard navigation, responsive zoom and disposal for one histogram request. */
export function StudentChart(container, buckets, highlight) {
  const occupied = occupiedScoreLevels(buckets);
  const personal = occupied.findIndex((row) => row.scoreBucket === highlight);
  let selected = Math.max(0, personal);
  const plot = el('div', {
    class: 'student-echart',
    role: 'slider',
    tabindex: '0',
    'aria-label': 'Duyệt các mức điểm có học sinh bằng phím trái và phải',
    'aria-valuemin': '0',
    'aria-valuemax': String(Math.max(0, occupied.length - 1)),
    'aria-valuenow': String(selected),
  });
  // Keep the original 101 buckets for DTO validation; plot only occupied categories.
  // A small number of bars uses a compact centered chart instead of spreading across the dialog.
  plot.style.maxWidth = `${Math.min(1200, Math.max(300, occupied.length * 96 + 94))}px`;
  container.replaceChildren(plot);
  if (!occupied.length) {
    container.replaceChildren(
      el('p', { class: 'student-chart-loading', role: 'status' }, 'Lớp chưa có điểm ở mục này.'),
    );
    return { dispose() { container.replaceChildren(); } };
  }
  const chart = init(plot, null, { renderer: 'svg' });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let window = chartWindow(selected, plot.clientWidth, occupied.length);
  chart.setOption(studentChartOptions(buckets, highlight, window, reduced));

  function describe(index) {
    const row = occupied[index];
    plot.setAttribute('aria-valuenow', String(index));
    plot.setAttribute(
      'aria-valuetext',
      `Mức ${row.scoreBucket} điểm, ${row.studentCount} học sinh${row.scoreBucket === highlight ? ', có điểm của bạn' : ''}`,
    );
  }
  function select(index) {
    selected = index;
    describe(index);
    window = chartWindow(index, plot.clientWidth, occupied.length);
    if (occupied.length > window.end - window.start + 1)
      chart.dispatchAction({ type: 'dataZoom', startValue: window.start, endValue: window.end });
    chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: index });
  }
  plot.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    select(occupiedLevelIndex(selected, event.key, occupied.length));
  });
  plot.addEventListener('focus', () => select(selected));
  chart.on('click', (event) => {
    if (Number.isInteger(event.dataIndex)) select(event.dataIndex);
  });
  const observer = new ResizeObserver(() => {
    chart.resize();
    window = chartWindow(selected, plot.clientWidth, occupied.length);
    if (occupied.length > window.end - window.start + 1)
      chart.dispatchAction({ type: 'dataZoom', startValue: window.start, endValue: window.end });
  });
  observer.observe(plot);
  describe(selected);
  return {
    dispose() {
      observer.disconnect();
      chart.dispose();
      container.replaceChildren();
    },
  };
}
