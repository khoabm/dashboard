/** Builds a presentation-only ECharts option from the already validated 101 aggregate buckets. */
import { histogramScale } from './student-gradeboard.js';

/** Fits readable bar widths to the plot rather than showing a fixed 20/40 levels at any width. */
export function chartWindow(index, width) {
  const usableWidth = Number.isFinite(width) ? Math.max(0, width - 60) : 0;
  // Never force a minimum rendered bar width: the user may zoom out to see all 101 levels.
  const span = Math.max(8, Math.min(32, Math.floor(usableWidth / 38)));
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
        barMaxWidth: 34,
        // Positive category gap prevents bars touching as the visible range or plot width changes.
        barCategoryGap: '45%',
        data: buckets.map((row) => {
          const isPersonal = row.scoreBucket === highlight;
          const color = isPersonal ? '#d28a44' : '#80b49b';
          return {
            value: row.studentCount,
            itemStyle: {
              color,
              borderRadius: [5, 5, 0, 0],
              ...(isPersonal ? { borderColor: '#915b27', borderWidth: 1 } : {}),
            },
            // ECharts' old series-wide green hover obscured the orange personal bucket.
            emphasis: {
              itemStyle: {
                color,
                borderColor: isPersonal ? '#915b27' : '#407f61',
                borderWidth: isPersonal ? 2 : 1,
                shadowBlur: isPersonal ? 8 : 4,
                shadowColor: isPersonal ? '#915b2740' : '#205a3c20',
              },
            },
            label: {
              show: isPersonal && row.studentCount > 0,
              position: 'top',
              color: '#915b27',
              fontWeight: 700,
            },
          };
        }),
      },
    ],
  };
}
