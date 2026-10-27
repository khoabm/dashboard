/** On-demand modular ECharts renderer with a separate one-stop, exact-bucket keyboard interface. */
import { init, use } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  AriaComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { el, button } from '../utils/dom.js';
import { bucketIndex } from '../utils/student-gradeboard.js';
import { chartWindow, studentChartOptions } from '../utils/student-chart.js';

use([BarChart, GridComponent, TooltipComponent, DataZoomComponent, AriaComponent, SVGRenderer]);

export function StudentChart(container, buckets, highlight) {
  const personal = buckets.findIndex((row) => row.scoreBucket === highlight);
  const plot = el('div', {
    class: 'student-echart',
    role: 'img',
    'aria-label': 'Biểu đồ điểm của lớp',
  });
  const reader = el('input', {
    type: 'range',
    min: '0',
    max: '100',
    step: '1',
    value: String(Math.max(0, personal)),
    'aria-label': 'Chọn mức điểm',
  });
  const announcement = el('output', { class: 'student-chart-reading', 'aria-live': 'polite' });
  const home = button(
    'Về mức điểm của bạn',
    () => select(Math.max(0, personal)),
    'button subtle student-chart-return',
  );
  home.disabled = personal < 0;
  container.append(
    plot,
    el(
      'div',
      { class: 'student-chart-tools' },
      home,
      el('span', {}, 'Kéo thanh bên dưới biểu đồ để xem thêm'),
    ),
    el('label', { class: 'student-chart-reader' }, 'Khám phá từng mức điểm', reader, announcement),
  );
  const chart = init(plot, null, { renderer: 'svg' });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  chart.setOption(
    studentChartOptions(
      buckets,
      highlight,
      chartWindow(Math.max(0, personal), plot.clientWidth),
      reduced,
    ),
  );
  function describe(index) {
    const row = buckets[index];
    const message = `Mức ${row.scoreBucket} điểm · ${row.studentCount} học sinh${row.scoreBucket === highlight ? ' · Có điểm của bạn' : ''}`;
    announcement.textContent = message;
    reader.setAttribute('aria-valuetext', message);
  }
  function select(index) {
    reader.value = String(index);
    describe(index);
    const window = chartWindow(index, plot.clientWidth);
    chart.dispatchAction({ type: 'dataZoom', startValue: window.start, endValue: window.end });
    chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: index });
  }
  reader.addEventListener('input', () => select(Number(reader.value)));
  reader.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      select(bucketIndex(Number(reader.value), event.key));
    }
  });
  chart.on('click', (event) => {
    if (Number.isInteger(event.dataIndex)) select(event.dataIndex);
  });
  const observer = new ResizeObserver(() => {
    chart.resize();
    const window = chartWindow(Number(reader.value), plot.clientWidth);
    chart.dispatchAction({ type: 'dataZoom', startValue: window.start, endValue: window.end });
  });
  observer.observe(plot);
  describe(Math.max(0, personal));
  return {
    dispose() {
      observer.disconnect();
      chart.dispose();
      container.replaceChildren();
    },
  };
}
