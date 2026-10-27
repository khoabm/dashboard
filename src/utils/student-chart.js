/** Builds readable chart options from the validated 101-level class aggregate. */
import { histogramScale } from './student-gradeboard.js';

/** Returns only occupied levels, retaining their numeric order and underlying counts. */
export function occupiedScoreLevels(buckets) {
  return buckets.filter((row) => row.studentCount > 0);
}

/** Moves the one keyboard selection among visible levels, without stopping on empty ones. */
export function occupiedLevelIndex(current, key, count) {
  if (count <= 0) return 0;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowLeft') return Math.max(0, current - 1);
  if (key === 'ArrowRight') return Math.min(count - 1, current + 1);
  return current;
}

/** Fits occupied levels to the plot width; the remaining levels stay reachable via dataZoom. */
export function chartWindow(index, width, count = 101) {
  if (count <= 0) return { start: 0, end: 0 };
  const usableWidth = Number.isFinite(width) ? Math.max(0, width - 76) : 0;
  const visible = Math.min(count, Math.max(4, Math.min(18, Math.floor(usableWidth / 66))));
  const start = Math.max(0, Math.min(count - visible, index - Math.floor(visible / 2)));
  return { start, end: start + visible - 1 };
}

/** True only when some occupied levels cannot fit into the current visible window. */
export function chartNeedsScroller(count, window) {
  return count > window.end - window.start + 1;
}

/** Presents only occupied categories without modifying or re-binning the source aggregate. */
export function studentChartOptions(buckets, highlight, window, reduced = false) {
  const occupied = occupiedScoreLevels(buckets);
  const scale = histogramScale(buckets.map((row) => row.studentCount));
  const hasZoom = chartNeedsScroller(occupied.length, window);
  const series = occupied.map((row) => {
    const isPersonal = row.scoreBucket === highlight;
    const color = isPersonal ? '#d28a44' : '#80b49b';
    return {
      value: row.studentCount,
      itemStyle: {
        color,
        borderRadius: [7, 7, 0, 0],
        ...(isPersonal ? { borderColor: '#915b27', borderWidth: 1 } : {}),
      },
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
        show: isPersonal,
        position: 'top',
        color: '#915b27',
        fontWeight: 700,
      },
    };
  });
  return {
    animation: !reduced,
    animationDuration: 250,
    animationDurationUpdate: 150,
    textStyle: { fontFamily: 'Inter, Segoe UI, Arial, sans-serif', color: '#476255' },
    aria: {
      enabled: true,
      label: {
        description:
          'Biểu đồ chỉ hiển thị các mức điểm có học sinh. Các mức điểm không có học sinh được ẩn. Dùng phím trái và phải để đọc từng mức điểm.',
      },
    },
    grid: { left: 48, right: 18, top: 36, bottom: hasZoom ? 86 : 44 },
    tooltip: {
      trigger: 'item',
      confine: true,
      renderMode: 'html',
      borderWidth: 0,
      backgroundColor: '#173f32',
      textStyle: { color: '#fff' },
      formatter: (p) => {
        const row = occupied[p.dataIndex];
        return `Mức ${row.scoreBucket} điểm<br/>${row.studentCount} học sinh${row.scoreBucket === highlight ? '<br/>Có điểm của bạn' : ''}`;
      },
    },
    xAxis: {
      type: 'category',
      data: occupied.map((row) => row.scoreBucket),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dbe6df' } },
      axisLabel: {
        interval: 0,
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
    dataZoom: hasZoom
      ? [
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
        ]
      : [],
    series: [
      {
        type: 'bar',
        barMaxWidth: 64,
        // Reserve a gap even when a smaller number of wider bars is displayed.
        barCategoryGap: '36%',
        data: series,
      },
    ],
  };
}
