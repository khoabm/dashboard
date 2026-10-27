/** Builds a presentation-only ECharts option from the already validated 101 aggregate buckets. */
import { histogramScale } from './student-gradeboard.js';

export function chartWindow(index, width) {
  const span = width < 600 ? 20 : 40;
  const start = Math.max(0, Math.min(100 - span, index - Math.floor(span / 2)));
  return { start, end: start + span };
}

export function studentChartOptions(buckets, highlight, window, reduced = false) {
  const scale = histogramScale(buckets.map((row) => row.studentCount));
  return {
    animation: !reduced,
    animationDuration: 250,
    animationDurationUpdate: 150,
    textStyle: { fontFamily: 'Inter, Segoe UI, Arial, sans-serif', color: '#476255' },
    aria: {
      enabled: true,
      label: {
        description:
          'Biểu đồ số học sinh ở từng mức điểm từ 0 đến 10. Dùng thanh Chọn mức điểm bên dưới để đọc bằng bàn phím.',
      },
    },
    grid: { left: 48, right: 18, top: 36, bottom: 86 },
    tooltip: {
      trigger: 'item',
      confine: true,
      renderMode: 'html',
      borderWidth: 0,
      backgroundColor: '#173f32',
      textStyle: { color: '#fff' },
      formatter: (p) =>
        `Mức ${buckets[p.dataIndex].scoreBucket} điểm<br/>${buckets[p.dataIndex].studentCount} học sinh${buckets[p.dataIndex].scoreBucket === highlight ? '<br/>Có điểm của bạn' : ''}`,
    },
    xAxis: {
      type: 'category',
      data: buckets.map((row) => row.scoreBucket),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dbe6df' } },
      axisLabel: {
        interval: (index) => index % 5 === 0 || buckets[index].scoreBucket === highlight,
        color: '#718779',
        fontSize: 11,
      },
      name: 'Điểm',
      nameLocation: 'end',
      nameTextStyle: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: scale.maximum,
      minInterval: 1,
      splitNumber: 4,
      name: 'Số học sinh',
      nameTextStyle: { align: 'left', padding: [0, 0, 0, 25], fontSize: 11 },
      axisLabel: { fontSize: 11 },
      splitLine: { lineStyle: { color: '#e8eeea', type: 'dashed' } },
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        startValue: window.start,
        endValue: window.end,
        zoomOnMouseWheel: false,
        moveOnMouseWheel: true,
        preventDefaultMouseMove: false,
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'none',
        startValue: window.start,
        endValue: window.end,
        bottom: 12,
        height: 24,
        showDetail: false,
        brushSelect: false,
        borderColor: 'transparent',
        backgroundColor: '#eef4f0',
        fillerColor: '#b6d0c0',
        handleSize: '110%',
        handleStyle: { color: '#367d5c', borderWidth: 0 },
      },
    ],
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        barCategoryGap: '32%',
        data: buckets.map((row) => ({
          value: row.studentCount,
          itemStyle: {
            color: row.scoreBucket === highlight ? '#d28a44' : '#80b49b',
            borderRadius: [5, 5, 0, 0],
            ...(row.scoreBucket === highlight ? { borderColor: '#915b27', borderWidth: 1 } : {}),
          },
          label: {
            show: row.scoreBucket === highlight && row.studentCount > 0,
            position: 'top',
            color: '#915b27',
            fontWeight: 700,
          },
        })),
        emphasis: { itemStyle: { color: '#276a4e' } },
      },
    ],
  };
}
