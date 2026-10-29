/** Renders actual Board/chat components with labelled synthetic data; scripted mode is never hosted evidence. */
import '/src/styles/main.css';
import '/src/styles/board-assistant.css';
import { BoardAssistant } from '/src/components/board-assistant.js';
import { BoardContainer, PostPreviewModal } from '/src/components/board.js';
import { createBoardAssistantRequest } from '/src/services/board-assistant.js';
import { assistantFetch } from '/workers/board-assistant/index.js';
import { previewFixture } from '/workers/board-assistant/preview-fixture.js';
const hosted = import.meta.env.VITE_BOARD_ASSISTANT_AI === 'true';
const data = structuredClone(previewFixture);
const heading = document.createElement('h1');
heading.textContent = 'Vui học cùng cô Quỳnh · OWNER AI PREVIEW';
const disclosure = document.createElement('p');
disclosure.setAttribute('role', 'status');
disclosure.textContent = hosted
  ? 'DỮ LIỆU GIẢ · Cloudflare thật qua proxy local; mỗi câu mới dùng BGE-M3 + Qwen3. Lượt dùng có giới hạn.'
  : 'DỮ LIỆU GIẢ · SCRIPTED OFFLINE — không gọi Qwen3 thật, không gọi Supabase. Hosted đang BLOCKED đến khi xác minh allowance.';
const controls = document.createElement('div');
let scenario = 'answer';
const select = document.createElement('select');
select.setAttribute('aria-label', 'Kịch bản offline');
for (const [value, label] of [
  ['answer', 'Trả lời mô phỏng'],
  ['insufficient', 'Thiếu nguồn'],
  ['error', 'Lỗi mô phỏng'],
  ['hold', 'Chờ để kiểm tra Dừng'],
  ['revoke', 'Thu hồi nguồn khi đang chờ'],
  ['html', 'Văn bản HTML vô hại'],
]) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.append(option);
}
select.disabled = hosted;
select.addEventListener('change', () => {
  scenario = select.value;
});
const mutate = document.createElement('button');
mutate.textContent = 'Thu hồi / khôi phục bài lực đẩy (mẫu)';
mutate.disabled = hosted;
const reset = document.createElement('button');
reset.textContent = 'Bỏ lọc Board';
controls.append(select, mutate, reset);
const board = document.createElement('main');
board.className = 'board-shell';
let selectedIds = null;
/** Renders current published fixture rows using the website's real Board component. */
function render() {
  board.replaceChildren(
    BoardContainer(
      {
        ...data,
        posts: data.posts.filter(
          (p) => p.status === 'published' && (!selectedIds || selectedIds.includes(p.id)),
        ),
      },
      {
        admin: false,
        onOpen: (p) =>
          PostPreviewModal(
            p,
            data.sections.find((s) => s.id === p.section_id),
          ),
      },
    ),
  );
}
render();
const request = createBoardAssistantRequest({
  enabled: true,
  endpoint: hosted ? import.meta.env.VITE_BOARD_ASSISTANT_ENDPOINT : '/chat',
  ...(hosted
    ? {
        fetcher: async (url, options) => {
          const response = await fetch(url, options);
          disclosure.dataset.workerStatus = String(response.status);
          disclosure.dataset.modelCalls = response.headers.get('X-Assistant-Model-Calls') || '0';
          disclosure.textContent = `DỮ LIỆU GIẢ · Cloudflare thật · HTTP ${response.status} · model calls ${disclosure.dataset.modelCalls}. Không gửi lại tự động; lượt dùng có giới hạn.`;
          return response;
        },
      }
    : {
        fetcher: async (url, options) => {
          disclosure.dataset.modelCalls = '0';
          if (scenario === 'revoke')
            setTimeout(() => {
              data.posts[0].status = 'hidden';
              assistant.invalidate();
              render();
            }, 500);
          if (scenario === 'error') return new Response(null, { status: 503 });
          const headers = new Headers(options.headers);
          headers.set('Origin', location.origin);
          const localRequest = new Request(url, options);
          // Browsers strip Origin from constructed Requests; this offline binding envelope is explicit.
          const response = await assistantFetch(
            {
              url: localRequest.url,
              method: localRequest.method,
              body: localRequest.body,
              signal: localRequest.signal,
              headers,
            },
            {
              AI_ENABLED: 'true',
              PREVIEW_EXPIRES: new Date(Date.now() + 60000).toISOString(),
              BUDGET: {
                idFromName: (x) => x,
                get: () => ({ fetch: async () => new Response(null, { status: 204 }) }),
              },
              AI: {
                run: async (model, input) => {
                  disclosure.dataset.modelCalls = String(Number(disclosure.dataset.modelCalls) + 1);
                  if (scenario === 'hold' || scenario === 'revoke')
                    await new Promise((resolve, reject) => {
                      const t = setTimeout(resolve, 6000);
                      options.signal.addEventListener(
                        'abort',
                        () => {
                          clearTimeout(t);
                          reject(new DOMException('Cancelled', 'AbortError'));
                        },
                        { once: true },
                      );
                    });
                  if (model.includes('bge')) return { data: input.text.map(() => [1, 0]) };
                  const p = JSON.parse(input.messages[1].content.split('\n/no_think')[0]);
                  const sources = p.sources.filter((s) =>
                    ['Lực đẩy trong nước', 'Nếp gấp sao giấy'].includes(s.title),
                  );
                  return {
                    response:
                      scenario === 'insufficient' || !sources.length
                        ? { status: 'insufficient', answer: '', ids: [], coverage: 'insufficient' }
                        : {
                            status: 'answered',
                            answer:
                              scenario === 'html'
                                ? "Văn bản thử: <img src=x onerror=alert('x')>."
                                : sources.map((s) => `${s.title}: ${s.body}`).join('\n'),
                            ids: sources.map((s) => s.id),
                            coverage: 'provided_text',
                          },
                  };
                },
              },
            },
          );
          disclosure.dataset.workerStatus = String(response.status);
          disclosure.dataset.workerStage = response.headers.get('X-Assistant-Stage') || 'complete';
          return response;
        },
      }),
});
const assistant = BoardAssistant({
  snapshot: () => data,
  hosted: true,
  request,
  perform: (action) => {
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
mutate.addEventListener('click', () => {
  const p = data.posts[0];
  p.status = p.status === 'published' ? 'hidden' : 'published';
  assistant.invalidate();
  render();
});
reset.addEventListener('click', () => {
  selectedIds = null;
  render();
});
document.body.append(heading, disclosure, controls, board, assistant.element);
