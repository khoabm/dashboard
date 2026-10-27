/** Renders 101 exact aggregate levels with one keyboard stop on the chart itself. */
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
import { bucketIndex } from '../utils/student-gradeboard.js';
import { chartWindow, studentChartOptions } from '../utils/student-chart.js';

use([BarChart, GridComponent, TooltipComponent, DataZoomComponent, AriaComponent, SVGRenderer]);

/** Initializes a lazy chart and exposes score/count details from a single keyboard focus target. */
export function StudentChart(container, buckets, highlight) {
  const personal = buckets.findIndex((row) => row.scoreBucket === highlight);
  let selected = Math.max(0, personal);
  const plot = el('div', {
    class: 'student-echart',
    role: 'slider',
    tabindex: '0',
    'aria-label': 'Duyệt các mức điểm của lớp bằng phím trái và phải',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': String(selected),
  });
  // This is the sole visible chart control: ECharts already provides a horizontal scroll bar.
  container.replaceChildren(plot);
  const chart = init(plot, null, { renderer: 'svg' });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  chart.setOption(
    studentChartOptions(buckets, highlight, chartWindow(selected, plot.clientWidth), reduced),
  );

  function describe(index) {
    const row = buckets[index];
    plot.setAttribute('aria-valuenow', String(index));
    plot.setAttribute(
      'aria-valuetext',
      `Mức ${row.scoreBucket} điểm, ${row.studentCount} học sinh${row.scoreBucket === highlight ? ', có điểm của bạn' : ''}`,
    );
  }
  function select(index) {
    selected = index;
    describe(index);
    const window = chartWindow(index, plot.clientWidth);
    chart.dispatchAction({ type: 'dataZoom', startValue: window.start, endValue: window.end });
    chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: index });
  }
  plot.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    select(bucketIndex(selected, event.key));
  });
  plot.addEventListener('focus', () => select(selected));
  chart.on('click', (event) => {
    if (Number.isInteger(event.dataIndex)) select(event.dataIndex);
  });
  const observer = new ResizeObserver(() => {
    chart.resize();
    const window = chartWindow(selected, plot.clientWidth);
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
