/** Offline-only interaction faults for the actual live chat component; never calls external services. */
import '/src/styles/main.css';
import '/src/styles/board-assistant.css';
import { BoardAssistant } from '/src/components/board-assistant.js';
const heading = document.createElement('h1');
heading.textContent = 'Kiểm tra UI offline — không gọi AI';
const mode = document.createElement('select');
mode.setAttribute('aria-label', 'Kịch bản lỗi');
for (const value of ['unavailable', 'answer', 'rate_limit', 'provider_quota']) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  mode.append(option);
}
const stats = document.createElement('output');
stats.textContent = 'calls0';
let calls = 0;
const assistant = BoardAssistant({
  live: true,
  hosted: true,
  snapshot: () => ({ posts: [], sections: [] }),
  perform: () => true,
  request: async (query, _, options) => {
    calls++;
    stats.textContent = `calls${calls} history${options.history.length}`;
    if (mode.value !== 'answer') throw Error(mode.value);
    return {
      mode: 'ai',
      status: 'answered',
      answer: `Đã nhận: ${query}`,
      sources: [],
      knowledge: 'general',
    };
  },
});
document.body.append(heading, mode, stats, assistant.element);
