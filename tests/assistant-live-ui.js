/** Offline-only interaction faults for the actual live chat component; never calls external services. */
import '/src/styles/main.css';
import '/src/styles/board-assistant.css';
import { BoardAssistant } from '/src/components/board-assistant.js';
const heading = document.createElement('h1');
heading.textContent = 'Kiểm tra UI offline — không gọi AI';
const mode = document.createElement('select');
mode.setAttribute('aria-label', 'Kịch bản lỗi');
const scenarios = [
  'unavailable',
  'answer',
  'board',
  'board-many',
  'hybrid',
  'rate_limit',
  'provider_quota',
];
for (const value of scenarios) {
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
    {
      id: 'public-notice-two',
      section_id: 'subject',
      title: 'Kiểm tra GK môn LS-ĐL',
      body: 'Ôn kỹ đề cương và ghi nhớ lịch kiểm tra môn LS-ĐL.',
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
    const successful = ['answer', 'board', 'board-many', 'hybrid'].includes(mode.value);
    if (!successful) throw Error(mode.value);
    const cited = ['board', 'board-many', 'hybrid'].includes(mode.value);
    const knowledge = mode.value === 'board-many' ? 'board' : mode.value;
    return {
      mode: 'ai',
      status: 'answered',
      answer: cited
        ? `Theo bài Lịch thi GK1, Văn bắt đầu lúc 7g20. ${mode.value === 'hybrid' ? 'Giải thích thêm từ kiến thức chung.' : ''}`
        : `Đã nhận: ${query}`,
      sources: cited
        ? data.posts.slice(0, mode.value === 'board-many' ? 2 : 1).map((post) => ({
            id: post.id,
            quote: post.body,
          }))
        : [],
      knowledge: cited ? knowledge : 'general',
    };
  },
});
document.body.append(heading, mode, stats, assistant.element);
