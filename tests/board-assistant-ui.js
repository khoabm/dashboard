/** Mounts synthetic public data only; browser QA never imports the production Board client. */

import '/src/styles/main.css';
import '/src/styles/board-assistant.css';
import { BoardAssistant } from '/src/components/board-assistant.js';
import { PostPreviewModal } from '/src/components/board.js';
window.data = {
  sections: [{ id: 's', title: 'Chủ đề mẫu' }],
  posts: [
    {
      id: 'p',
      section_id: 's',
      status: 'published',
      title: 'Khí mẫu',
      body: 'Khí mẫu bọt khí',
      attachments: [],
    },
  ],
};
window.actions = [];
window.calls = 0;
window.assistant = BoardAssistant({
  snapshot: () => data,
  hosted: true,
  request: async (q, c, { signal, context, version }) => {
    window.lastRequest = { query: q, context, version };
    calls++;
    if (window.delay) await new Promise((r) => (window.release = r));
    if (window.mockReply) return structuredClone(window.mockReply);
    throw Error(window.quota ? 'quota' : 'synthetic');
  },
  perform: (a) => {
    actions.push(a);
    if (a.type === 'open') PostPreviewModal(data.posts[0], data.sections[0]);
    return true;
  },
});
document.body.append(assistant.element);
