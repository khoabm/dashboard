/** Offline-only interaction faults for the actual live chat component; never calls external services. */
import '/src/styles/main.css';
import '/src/styles/board-assistant.css';
import { BoardAssistant } from '/src/components/board-assistant.js';
const heading = document.createElement('h1');
heading.textContent = 'Kiểm tra UI offline — không gọi AI';
const mode = document.createElement('select');
mode.setAttribute('aria-label', 'Kịch bản lỗi');
for (const value of ['unavailable', 'answer', 'board', 'hybrid', 'rate_limit', 'provider_quota']) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  mode.append(option);
}
const stats = document.createElement('output');
stats.textContent = 'calls0';
let calls = 0;
const data = {
  sections: [{ id: 'subject', title: 'Thông báo' }],
  posts: [
    {
      id: 'public-notice',
      section_id: 'subject',
      title: 'Lịch thi GK1',
      body: 'Môn Văn thi lúc 7g20 và làm bài trong 90 phút.',
      status: 'published',
    },
  ],
};
const assistant = BoardAssistant({
  live: true,
  hosted: true,
  snapshot: () => data,
  perform: () => true,
  request: async (query, _, options) => {
    calls++;
    stats.textContent = `calls${calls} history${options.history.length}`;
    if (mode.value !== 'answer') throw Error(mode.value);
    const cited = mode.value === 'board' || mode.value === 'hybrid';
    return {
      mode: 'ai',
      status: 'answered',
      answer: cited
        ? `Theo bài Lịch thi GK1, Văn bắt đầu lúc 7g20. ${mode.value === 'hybrid' ? 'Giải thích thêm từ kiến thức chung.' : ''}`
        : `Đã nhận: ${query}`,
      sources: cited ? [{ id: 'public-notice', quote: data.posts[0].body }] : [],
      knowledge: cited ? mode.value : 'general',
    };
  },
});
document.body.append(heading, mode, stats, assistant.element);
