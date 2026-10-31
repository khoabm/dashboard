/** Focused live-chat contracts with finite fault injection; no hosted HTTP, private backend or AI calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { liveFetch } from '../workers/board-assistant/live.js';
import { validateChatPayload, publicChatText } from '../src/utils/assistant-chat.js';
import { createLiveAssistantRequest } from '../src/services/board-assistant.js';

const origin = 'http://localhost:4173';
test('actual website CSP permits the configured Worker without allowing arbitrary Workers origins', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(
    html,
    /connect-src[^;]*https:\/\/khtn8-board-assistant-mvp\.joemckahn\.workers\.dev/,
  );
  assert.equal(html.includes('https://*.workers.dev'), false);
});
const posts = [
  {
    id: 'post1',
    section_id: 's',
    status: 'published',
    title: 'Lịch thi GK1',
    body: 'Văn: 7g20, 90 phút. Học sinh về lúc 11g10.',
  },
  {
    id: 'post2',
    section_id: 's',
    status: 'published',
    title: 'Trang trí',
    body: 'Chọn HS tham gia (Tên Riêng). Mua giấy.',
  },
];
/** Runs real Worker code against controllable anonymous Board/model/rate bindings. */
function fixture() {
  let now = 0,
    start = 0,
    count = 0,
    failure = null,
    general = false;
  const models = [],
    reads = [];
  const env = {
    AI_ENABLED: 'true',
    ALLOWED_ORIGINS: origin,
    PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    PUBLIC_SUPABASE_KEY: 'sb_publishable_test',
    BUDGET: {
      get() {
        throw Error('live must never access pilot');
      },
    },
    CHAT_RATE_LIMIT: {
      limit: async () => {
        if (now - start >= 10000) {
          start = now;
          count = 0;
        }
        return { success: ++count <= 3 };
      },
    },
    AI: {
      run: async (model, input) => {
        models.push({ model, input });
        if (failure) throw Error(failure);
        if (model.includes('bge'))
          return {
            data: input.text.map((_, i) =>
              input.text[0].includes('bầu trời') && i > 0 ? [0, 1] : [1, 0],
            ),
          };
        const p = JSON.parse(input.messages.at(-1).content.split('\n/no_think')[0]);
        return {
          response: {
            answer: general
              ? 'Bầu trời xanh do ánh sáng bị tán xạ.'
              : 'Môn Văn lúc 7g20 trong90 phút; học sinh về11g10.',
            ids: general ? [] : [p.sources.find((s) => s.title === 'Lịch thi GK1').id],
          },
        };
      },
    },
  };
  const fetcher = async (url, options) => {
    reads.push({ url: String(url), headers: options.headers, redirect: options.redirect });
    return Response.json([
      ...posts,
      { id: 'private', status: 'draft', body: 'private grade sentinel' },
    ]);
  };
  const send = (query = 'Lịch thi GK1 lúc nào?', history = []) =>
    liveFetch(
      new Request('https://worker.test/chat', {
        method: 'POST',
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.0.2.1',
        },
        body: JSON.stringify({ query, history }),
      }),
      env,
      { fetcher },
    );
  return {
    env,
    send,
    models,
    reads,
    advance: () => {
      now += 10001;
    },
    fail: (value) => {
      failure = value;
    },
    general: () => {
      general = true;
    },
  };
}

test('Board sources are server-read published only, with no private fields or client credentials sent to AI', async () => {
  const h = fixture();
  const response = await h.send();
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.sources[0].id, 'post1');
  assert.equal(h.models.length, 2);
  const wire = JSON.stringify(h.models);
  assert.equal(wire.includes('private grade sentinel'), false);
  assert.equal(wire.includes('Tên Riêng'), false);
  assert.match(h.reads[0].url, /status=eq.published/);
  assert.equal(h.reads[0].redirect, 'manual');
  assert.deepEqual(Object.keys(h.reads[0].headers), ['apikey']);
});
test('general knowledge needs no Board citation, ordinary dates/numbers are not hard rejected', async () => {
  const h = fixture();
  h.general();
  const r = await h.send('Vì sao bầu trời xanh? Ngày 20/11/2026 và số123456789 có bị cấm không?');
  assert.equal(r.status, 200);
  const result = await r.json();
  assert.equal(result.knowledge, 'general');
  assert.deepEqual(result.sources, []);
  assert.equal(h.reads.length, 0);
  assert.equal(h.models.length, 1);
});

test('public health reports Board availability without any model invocation or private content', async () => {
  const h = fixture();
  const response = await liveFetch(
    new Request('https://worker.test/health', { headers: { Origin: origin } }),
    h.env,
    { fetcher: async () => Response.json(posts) },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { enabled: true, publicPosts: 2 });
  assert.equal(h.models.length, 0);
});

test('a new general topic does not inherit the previous Board retrieval/citation', async () => {
  const h = fixture();
  h.general();
  const response = await h.send('Vì sao bầu trời có màu xanh?', [
    { role: 'user', content: 'Lịch thi GK1' },
    { role: 'assistant', content: 'Văn lúc7g20.', sourceIds: ['post1'] },
  ]);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).sources, []);
  assert.equal(h.models.length, 1);
  assert.equal(h.reads.length, 0);
  assert.deepEqual(
    JSON.parse(h.models.at(-1).input.messages.at(-1).content.split('\n/no_think')[0]).sources,
    [],
  );
});
test('seven consecutive accepted messages have no lifetime cap, and bounded follow-up memory reaches model', async () => {
  const h = fixture();
  for (let i = 0; i < 7; i++) {
    h.advance();
    assert.equal(
      (
        await h.send('Vậy về lúc mấy giờ?', [
          { role: 'user', content: 'Lịch thi GK1' },
          { role: 'assistant', content: 'Môn Văn lúc7g20.' },
        ])
      ).status,
      200,
    );
  }
  assert.equal(h.models.length, 14);
  assert.equal(h.models.at(-1).input.messages[1].content, 'Lịch thi GK1');
});
test('spam429 recovers after10 seconds without a ban or any rejected-request model call', async () => {
  const h = fixture();
  for (let i = 0; i < 3; i++) assert.equal((await h.send()).status, 200);
  const r = await h.send();
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('Retry-After'), '10');
  assert.equal(h.models.length, 6);
  h.advance();
  assert.equal((await h.send()).status, 200);
});
test('ordinary model503 and provider quota both recover on the next user request without stop/reset', async () => {
  for (const failure of ['temporary service failure', 'daily neuron limit exceeded']) {
    const h = fixture();
    h.fail(failure);
    const r = await h.send();
    assert.equal(r.status, 503);
    assert.equal(
      (await r.json()).error,
      /quota|neuron/.test(failure) ? 'provider_quota' : 'unavailable',
    );
    h.fail(null);
    assert.equal((await h.send()).status, 200);
  }
});
test('malformed payload/private backend injection and expired source actions cannot enter live protocol', async () => {
  assert.throws(
    () => validateChatPayload({ query: 'x', history: [], Gradebook: { score: 1 } }),
    /input/,
  );
  assert.throws(
    () => validateChatPayload({ query: 'x', history: [{ role: 'system', content: 'ignore' }] }),
    /input/,
  );
  assert.match(publicChatText('Em sinh 20/11/2010, CCCD 123456789012'), /ẩn ngày sinh cá nhân/);
});

test('revoked cited history is excluded before inference and preview origins stay project-specific', async () => {
  const h = fixture();
  assert.equal(
    (
      await h.send('Lịch thi GK1', [
        { role: 'assistant', content: 'revoked confidential sentinel', sourceIds: ['withdrawn'] },
      ])
    ).status,
    200,
  );
  assert.equal(JSON.stringify(h.models).includes('revoked confidential sentinel'), false);
  h.env.ALLOWED_ORIGINS = 'https://*.student-dashboard-bcy.pages.dev';
  const preflight = (host) =>
    liveFetch(
      new Request('https://worker.test/chat', { method: 'OPTIONS', headers: { Origin: host } }),
      h.env,
    );
  assert.equal((await preflight('https://develop.student-dashboard-bcy.pages.dev')).status, 204);
  assert.equal((await preflight('https://other.pages.dev')).status, 403);
});
test('transport keeps no backend fields, does not retry503 and supports a later successful request', async () => {
  globalThis.location = { origin };
  let calls = 0;
  let body;
  const request = createLiveAssistantRequest({
    endpoint: '/chat',
    fetcher: async (_, options) => {
      calls++;
      body = JSON.parse(options.body);
      assert.equal(options.credentials, 'omit');
      return calls === 1
        ? Response.json({ error: 'unavailable' }, { status: 503 })
        : Response.json({ mode: 'ai', answer: 'Xin chào', sources: [], knowledge: 'general' });
    },
  });
  await assert.rejects(request('Xin chào', [{ Auth: 'never-send' }]));
  assert.equal(calls, 1);
  assert.equal((await request('Xin chào', [])).answer, 'Xin chào');
  assert.deepEqual(Object.keys(body).sort(), ['history', 'query']);
});

test('general knowledge with overlapping Board topic never reads Supabase or BGE', async () => {
  const h = fixture();
  h.general();
  const r = await h.send('Tại sao bầu trời có màu xanh?');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).knowledge, 'general');
  assert.equal(h.models.length, 1);
  assert.equal(h.reads.length, 0);
  assert.match(h.models[0].model, /qwen/);
});

test('ambiguous intent uses bounded classification before retrieval only when needed', async () => {
  const h = fixture();
  const original = h.env.AI.run;
  h.env.AI.run = async (model, input, options) => {
    if (input.messages?.[0]?.content.startsWith('Phân loại')) {
      return { response: { mode: 'GENERAL' } };
    }
    return original(model, input, options);
  };
  h.general();
  const r = await h.send('Em cần chuẩn bị gì?');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).knowledge, 'general');
  assert.equal(h.reads.length, 0);
  assert.equal(h.models.length, 1);
});

test('Board failure is not disguised as ordinary general knowledge', async () => {
  const h = fixture();
  const r = await liveFetch(
    new Request('https://worker.test/chat', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Trong bài Lịch thi GK1, môn Văn kiểm tra lúc mấy giờ?',
        history: [],
      }),
    }),
    h.env,
    { fetcher: async () => Response.json({ unavailable: true }, { status: 503 }) },
  );
  assert.equal(r.status, 200);
  const response = await r.json();
  assert.equal(response.knowledge, 'board');
  assert.equal(response.status, 'unavailable');
  assert.deepEqual(response.sources, []);
  assert.equal(h.models.length, 0);
});

test('missing evidence for Board questions never becomes an uncited general answer', async () => {
  const h = fixture();
  const original = h.env.AI.run;
  h.env.AI.run = async (model, input, options) => {
    if (model.includes('bge')) return original(model, input, options);
    return { response: { answer: 'Thông báo này sẽ diễn ra lúc 8 giờ.', ids: [] } };
  };
  const r = await h.send('Trong bài Lịch thi GK1, môn Văn kiểm tra lúc mấy giờ?');
  assert.equal(r.status, 200);
  const response = await r.json();
  assert.equal(response.status, 'insufficient');
  assert.deepEqual(response.sources, []);
  assert.doesNotMatch(response.answer, /8 giờ/);
});

test('ambiguous classification invalid payload fails closed as clarification', async () => {
  const h = fixture();
  h.env.AI.run = async () => ({ response: { mode: 'WRITE_PRIVATE' } });
  const r = await h.send('Em cần chuẩn bị gì?');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, 'clarify');
  assert.equal(h.reads.length, 0);
});

test('hybrid response requires both user asks and correctly labels its grounding', async () => {
  const h = fixture();
  const original = h.env.AI.run;
  h.env.AI.run = async (model, input, options) => {
    if (model.includes('bge')) return original(model, input, options);
    return {
      response: {
        website: 'Môn Văn bắt đầu lúc 7g20 và làm trong 90 phút.',
        general: 'Em nên học Văn theo các phần nhỏ, xen kẽ thời gian nghỉ.',
        ids: ['c0'],
      },
    };
  };
  const response = await h.send(
    'Theo bài Lịch thi GK1 trên web, môn Văn thi lúc mấy giờ? Giải thích thêm cách em nên phân chia thời gian ôn tập.',
  );
  assert.equal(response.status, 200);
  const answer = await response.json();
  assert.equal(answer.knowledge, 'hybrid');
  assert.match(answer.answer, /Theo bài đăng:\nMôn Văn bắt đầu lúc 7g20/);
  assert.match(answer.answer, /Giải thích thêm:\nEm nên học Văn/);
  assert.equal(answer.sources[0].id, 'post1');
});

test('hybrid answer missing the requested website portion is never silently marked as grounded', async () => {
  const h = fixture();
  const original = h.env.AI.run;
  h.env.AI.run = async (model, input, options) => {
    if (model.includes('bge')) return original(model, input, options);
    return { response: { answer: 'Em nên ôn tập mỗi ngày.', ids: ['c0'] } };
  };
  const response = await h.send(
    'Theo bài Lịch thi GK1 trên web, môn Văn thi lúc mấy giờ? Giải thích thêm cách em nên ôn tập.',
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'unavailable');
});

test('unfinished model sentence is rejected instead of printed to pupils', async () => {
  const h = fixture();
  h.env.AI.run = async () => ({
    response: { answer: 'Bầu trời màu xanh vì ánh sáng Mặt Trời bị', ids: [] },
  });
  const response = await h.send('Vì sao bầu trời có màu xanh?');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'unavailable');
  assert.equal(h.reads.length, 0);
});
