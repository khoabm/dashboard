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
  chartNeedsScroller,
  chartWindow,
  occupiedLevelIndex,
  occupiedScoreLevels,
  studentChartOptions,
} from '../utils/student-chart.js';

use([BarChart, GridComponent, TooltipComponent, DataZoomComponent, AriaComponent, SVGRenderer]);

/** Owns chart keyboard navigation, responsive zoom and disposal for one histogram request. */
export function StudentChart(container, buckets, highlight, onScrollerChange = () => {}) {
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
  let chartWidth = plot.clientWidth;
  let window = chartWindow(selected, chartWidth, occupied.length);
  chart.setOption(studentChartOptions(buckets, highlight, window, reduced));
  onScrollerChange(chartNeedsScroller(occupied.length, window));

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
    if (chartNeedsScroller(occupied.length, window))
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
    const nextWidth = plot.clientWidth;
    if (nextWidth === chartWidth) return;
    chartWidth = nextWidth;
    chart.resize();
    window = chartWindow(selected, chartWidth, occupied.length);
    // dataZoom is an ECharts component: dispatchAction cannot add/remove it after a resize.
    chart.setOption(studentChartOptions(buckets, highlight, window, reduced), { notMerge: true });
    onScrollerChange(chartNeedsScroller(occupied.length, window));
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
