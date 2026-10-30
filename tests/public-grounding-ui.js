/** Browser-only synthetic UI -> transport -> Worker -> scripted models; no external fetch is used. */
import '/src/styles/main.css';
import '/src/styles/board-assistant.css';
import { BoardAssistant } from '/src/components/board-assistant.js';
import { BoardContainer, PostPreviewModal } from '/src/components/board.js';
import { createBoardAssistantRequest } from '/src/services/board-assistant.js';
import { assistantFetch } from '/workers/board-assistant/index.js';
import { publicFixture, frozenClock } from './public-grounding-fixture.js';
window.data = structuredClone(publicFixture);
for (const post of data.posts) post.attachments ??= [];
window.calls = [];
window.budget = [];
window.wires = [];
window.actions = [];
window.selectedIds = null;
const region = document.createElement('div');
region.className = 'board-shell';
document.body.append(region);
function render() {
  region.replaceChildren(
    BoardContainer(
      {
        ...data,
        posts: data.posts.filter((p) => selectedIds === null || selectedIds.includes(p.id)),
      },
      {
        admin: false,
        onOpen: (post) =>
          PostPreviewModal(
            post,
            data.sections.find((s) => s.id === post.section_id),
          ),
      },
    ),
  );
}
render();
const env = {
  AI_ENABLED: 'true',
  PREVIEW_EXPIRES: new Date(Date.now() + 60000).toISOString(),
  BUDGET: {
    idFromName: (x) => x,
    get: () => ({
      fetch: async (url) => {
        budget.push(url);
        return new Response(null, { status: 204 });
      },
    }),
  },
  AI: {
    run: async (model, input) => {
      calls.push(model);
      if (window.hold) await new Promise((resolve) => (window.release = resolve));
      if (model.includes('bge'))
        return { data: input.text.map((_, i) => (i === 0 ? [1, 0] : [0.9, 0.1])) };
      const prompt = JSON.parse(input.messages[1].content.split('\n/no_think')[0]);
      if (window.insufficient)
        return {
          response: { status: 'insufficient', answer: '', ids: [], coverage: 'insufficient' },
        };
      const refs = prompt.sources
        .map((source) => ({
          ...source,
          metadata: prompt.grounding.sources.find((ref) => ref.id === source.id).metadata,
        }))
        .filter(
          (p) =>
            (window.answerPostIds || ['deep']).includes(p.metadata.postId) &&
            (p.metadata.postId !== 'deep' || p.body.includes('7 đơn vị')),
        )
        .slice(0, 3);
      return {
        response: refs.length
          ? {
              status: 'answered',
              answer: window.html
                ? "Mật độ tinh thể xanh là 7 đơn vị. <img src=x onerror=alert('x')>"
                : window.answer || 'Mật độ tinh thể xanh đo được là 7 đơn vị.',
              ids: refs.map((p) => p.id),
              coverage: 'provided_text',
            }
          : { status: 'insufficient', answer: '', ids: [], coverage: 'insufficient' },
      };
    },
  },
};
const request = createBoardAssistantRequest({
  enabled: true,
  endpoint: '/chat',
  fetcher: async (url, options) => {
    wires.push(JSON.parse(options.body));
    const headers = new Headers(options.headers);
    headers.set('Origin', location.origin);
    // A browser Request strips the forbidden Origin header before fetch; supply the synthetic
    // worker-facing envelope explicitly without making an HTTP request.
    const request = new Request(url, options);
    return assistantFetch(
      {
        url: request.url,
        method: request.method,
        body: request.body,
        signal: request.signal,
        headers,
      },
      env,
    );
  },
});
window.assistant = BoardAssistant({
  snapshot: () => data,
  hosted: true,
  request: (query, catalog, options) => request(query, catalog, { ...options, now: frozenClock }),
  perform: (action) => {
    actions.push(action);
    if (action.type === 'open') {
      const p = data.posts.find((p) => p.id === action.id && p.status === 'published');
      if (!p) return false;
      PostPreviewModal(
        p,
        data.sections.find((s) => s.id === p.section_id),
      );
    } else {
      selectedIds = action.type === 'filter' ? action.ids : null;
      render();
    }
    return true;
  },
});
document.body.append(assistant.element);
