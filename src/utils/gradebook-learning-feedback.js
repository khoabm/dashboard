/** Turns validated own-score profiles into supportive, evidence-led Vietnamese feedback. */
import { requireContract } from './gradebook/contracts.js';

const trends = new Set(['rising', 'falling', 'steady', 'insufficient']);
const check = (condition) => requireContract(condition, 'learning-feedback');

/**
 * Creates an observation and one practical next step for the selected subject.
 * Advice is deterministic, does not infer motivation/ability and never predicts future grades.
 *
 * @param {object} profile - A per-subject summary from analyzeLearningInsights.
 * @returns {{heading: string, observation: string, advice: string}} User-facing Vietnamese feedback.
 */
export function subjectLearningFeedback(profile) {
  check(
    profile !== null &&
      typeof profile === 'object' &&
      typeof profile.name === 'string' &&
      profile.name.length > 0 &&
      profile.name.length <= 100 &&
      trends.has(profile.trend) &&
      Number.isInteger(profile.samples) &&
      profile.samples >= 0 &&
      profile.samples <= 4 &&
      (profile.median === null ||
        (Number.isFinite(profile.median) && profile.median >= 0 && profile.median <= 10)) &&
      typeof profile.medianLabel === 'string' &&
      /^(?:—|(?:10|[0-9])\.[0-9])$/.test(profile.medianLabel) &&
      Array.isArray(profile.points) &&
      profile.points.length === 4,
  );

  const observed = profile.points.filter((point, index) => {
    check(
      point !== null &&
        typeof point === 'object' &&
        point.index === index &&
        point.label === `Thường xuyên ${index + 1}` &&
        (point.value === null ||
          (Number.isFinite(point.value) && point.value >= 0 && point.value <= 10)) &&
        typeof point.display === 'string' &&
        /^(?:—|(?:10|[0-9])\.[0-9])$/.test(point.display) &&
        (point.value === null ? point.display === '—' : point.display !== '—'),
    );
    return point.value !== null;
  });
  check(observed.length === profile.samples);
  check(
    observed.length === 0
      ? profile.median === null && profile.medianLabel === '—'
      : profile.median !== null && profile.medianLabel !== '—',
  );
  check(observed.length < 3 === (profile.trend === 'insufficient'));

  const heading = `Nhìn lại môn ${profile.name}`;
  if (observed.length === 0) {
    return {
      heading,
      observation: 'Môn này chưa có điểm Thường xuyên, nên chưa thể nhận xét về xu hướng.',
      advice:
        'Bạn có thể ôn từng phần nhỏ, tự thử trả lời câu hỏi sau bài học và ghi lại điều chưa rõ để hỏi giáo viên.',
    };
  }

  const first = observed[0];
  const last = observed.at(-1);
  const bounds =
    observed.length === 1
      ? `Hiện có điểm ${first.display} ở lần Thường xuyên ${first.index + 1}.`
      : `Mốc có điểm đầu tiên là Thường xuyên ${first.index + 1} (${first.display}), mốc cuối là Thường xuyên ${last.index + 1} (${last.display}).`;
  const medianText = `Trung vị các điểm đã có là ${profile.medianLabel}.`;

  if (observed.length < 3) {
    return {
      heading,
      observation: `Bạn đã có ${observed.length}/4 điểm Thường xuyên. ${bounds} ${medianText} Chưa đủ ba mốc để nhận xét chiều hướng.`,
      advice:
        'Hãy xem lại các câu mình còn phân vân ở những lần đã có điểm và theo dõi thêm các lần tiếp theo. Chưa cần vội kết luận điểm đang tăng hay giảm.',
    };
  }

  const movement = {
    rising: 'Nhìn chung, các mức điểm có chiều hướng tăng.',
    falling: 'Nhìn chung, các mức điểm có chiều hướng giảm.',
    steady: 'Nhìn chung, các mức điểm đang giữ xu hướng ổn định.',
  }[profile.trend];
  const spread =
    Math.max(...observed.map((point) => point.value)) -
    Math.min(...observed.map((point) => point.value));
  const variation = spread >= 2.5 ? ' Tuy nhiên, các lần điểm vẫn có chênh lệch đáng chú ý.' : '';
  const observation = `Bạn đã có ${observed.length}/4 điểm Thường xuyên. ${bounds} ${medianText} ${movement}${variation}`;

  let advice;
  if (profile.trend === 'rising') {
    advice =
      profile.median < 5
        ? 'Bạn đã có tín hiệu tiến bộ. Hãy tiếp tục ôn đều và dành thêm thời gian làm lại những dạng bài từng khiến bạn mất điểm.'
        : profile.median >= 8
          ? 'Hãy phát huy cách học đang phù hợp với bạn. Thử tự giải lại một bài khó mà không xem lời giải để củng cố kiến thức.'
          : 'Hãy tiếp tục những cách ôn tập có hiệu quả với bạn. Sau mỗi lần luyện bài, ghi lại một lỗi dễ mắc để lần sau tránh lặp lại.';
  } else if (profile.trend === 'falling') {
    advice =
      first.value - last.value >= 2
        ? 'Bạn nên thử thay đổi cách ôn tập rõ ràng hơn: chia bài thành từng phần nhỏ, làm lại câu từng sai và hỏi giáo viên về phần còn vướng.'
        : 'Hãy xem lại các phần học gần đây, tìm dạng bài mình hay nhầm và điều chỉnh cách luyện tập trước lần đánh giá tiếp theo.';
  } else {
    advice =
      profile.median >= 8
        ? 'Hãy duy trì nhịp học đều đặn và thử thêm một số bài vận dụng để tiếp tục phát huy những gì bạn đã nắm.'
        : profile.median < 5
          ? 'Bạn có thể thử đổi cách ôn: học từng phần nhỏ, tự kiểm tra sau mỗi phần rồi hỏi giáo viên khi còn chỗ chưa hiểu.'
          : 'Hãy giữ thói quen ôn tập đều và đặt một mục tiêu nhỏ, chẳng hạn làm chắc hơn một dạng bài ở lần tiếp theo.';
  }
  return { heading, observation, advice };
}
