/** Explicit V2 specialist contracts using local Request/Response and fake bindings; no external traffic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantFetch, decodeLearningCompletion } from '../workers/board-assistant/index.js';
import { createBoardAssistantRequest } from '../src/services/board-assistant.js';
const catalog = [
  {
    id: 'p',
    sectionId: 's',
    sectionTitle: 'Hóa học',
    title: 'Bọt khí',
    body: 'Phản ứng tạo khí làm xuất hiện bọt khí.',
  },
  { id: 'q', sectionId: 's', sectionTitle: 'Hóa học', title: 'Khác', body: 'Chất khác.' },
];
const answer = {
  status: 'answered',
  answer: 'Phản ứng tạo khí làm xuất hiện bọt khí.',
  ids: ['p'],
  coverage: 'provided_text',
};
const req = (extra = {}) =>
  new Request('https://worker.test/chat', {
    method: 'POST',
    headers: { Origin: 'http://localhost:4173', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Giải thích bọt khí',
      catalog,
      version: 2,
      context: null,
      ...extra,
    }),
  });
function fixture(completion = answer) {
  const calls = [];
  const budgets = [];
  return {
    calls,
    budgets,
    env: {
      AI_ENABLED: 'true',
      PREVIEW_EXPIRES: new Date(Date.now() + 60000).toISOString(),
      BUDGET: {
        idFromName: (x) => x,
        get: () => ({
          fetch: async (url) => {
            budgets.push(url);
            return new Response(null, { status: 204 });
          },
        }),
      },
      AI: {
        run: async (model, input) => {
          calls.push({ model, input });
          return model.includes('bge')
            ? {
                data: [
                  [1, 0],
                  [1, 0],
                  [0, 1],
                ],
              }
            : { response: completion };
        },
      },
    },
  };
}

test('V2 generated answer uses exactly BGE+Qwen, validates IDs and treats sources as data', async () => {
  const f = fixture();
  const response = await assistantFetch(req(), f.env);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.answer, answer.answer);
  assert.equal(result.sources[0].id, 'p');
  assert.equal(f.calls.length, 2);
  assert.equal(f.budgets.length, 1);
  assert.match(f.calls[1].input.messages[0].content, /UNTRUSTED DATA/);
  assert.equal(f.calls[1].input.max_tokens, 1600);
});
test('follow-up restricts allowed sources to prior selection and embeds prior question', async () => {
  const f = fixture();
  assert.equal(
    (
      await assistantFetch(
        req({ query: 'Giải thích dễ hiểu hơn', context: { query: 'Bọt khí', ids: ['p'] } }),
        f.env,
      )
    ).status,
    200,
  );
  const user = JSON.parse(f.calls[0].input.messages[1].content.split('\n/no_think')[0]);
  assert.deepEqual(
    user.sources.map((p) => p.id),
    ['p'],
  );
  assert.equal(user.priorQuestion, 'Bọt khí');
  const bad = fixture({ ...answer, ids: ['q'] });
  assert.equal(
    (await assistantFetch(req({ context: { query: 'Bọt khí', ids: ['p'] } }), bad.env)).status,
    503,
  );
  assert.equal(bad.budgets.length, 2);
});
test('empty catalog and invalid context do not invoke inference', async () => {
  const f = fixture();
  const r = await assistantFetch(req({ catalog: [] }), f.env);
  assert.equal((await r.json()).status, 'insufficient');
  assert.equal(
    (await assistantFetch(req({ context: { query: 'x', ids: ['revoked'] } }), f.env)).status,
    422,
  );
  assert.equal(f.calls.length, 0);
});
test('unsupported answers abstain; malformed generated output stops allowance without retry', async () => {
  const f = fixture({
    status: 'insufficient',
    answer: 'Invented capital',
    ids: [],
    coverage: 'insufficient',
  });
  assert.equal(
    (await (await assistantFetch(req(), f.env)).json()).answer.includes('Invented'),
    false,
  );
  for (const value of [
    { ...answer, tools: ['write'] },
    { ...answer, answer: 'x'.repeat(1801) },
    '<think>unfinished',
  ]) {
    const bad = fixture(value);
    assert.equal((await assistantFetch(req(), bad.env)).status, 503);
    assert.equal(bad.calls.length, 2);
    assert.equal(bad.budgets.at(-1), 'https://budget/stop');
  }
  assert.throws(() =>
    decodeLearningCompletion({ response: { ...answer, ids: ['invented'] } }, catalog),
  );
});
test('V2 transport sends only bounded public context and checks strict response', async () => {
  globalThis.location = { origin: 'http://localhost:4173' };
  let calls = 0;
  const request = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/chat',
    fetcher: async (_, o) => {
      calls++;
      const body = JSON.parse(o.body);
      assert.equal(body.version, 2);
      assert.deepEqual(body.context, { query: 'Bọt khí', ids: ['p'] });
      assert.equal(o.credentials, 'omit');
      return Response.json({
        mode: 'ai',
        ...answer,
        sources: [{ id: 'p', quote: catalog[0].body }],
        ids: undefined,
      });
    },
  });
  const result = await request('Dễ hiểu hơn', catalog, {
    version: 2,
    context: { query: 'Bọt khí', ids: ['p'] },
  });
  assert.equal(result.answer, answer.answer);
  assert.equal(calls, 1);
  await assert.rejects(
    request('x', catalog, { version: 2, context: { query: 'x', ids: ['revoked'] } }),
  );
  assert.equal(calls, 1);
});

test('deadline stops allowance; late embedding never launches Qwen', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture();
  let resolveEmbedding;
  f.env.AI.run = async (model) => {
    f.calls.push({ model });
    return new Promise((resolve) => {
      resolveEmbedding = resolve;
    });
  };
  const pending = assistantFetch(req(), f.env);
  await new Promise((resolve) => setImmediate(resolve));
  t.mock.timers.tick(40001);
  assert.equal((await pending).status, 503);
  resolveEmbedding({
    data: [
      [1, 0],
      [1, 0],
      [0, 1],
    ],
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.calls.length, 1);
  assert.equal(f.budgets.at(-1), 'https://budget/stop');
});
test('pre-aborted request cannot start model inference', async () => {
  const f = fixture();
  const controller = new AbortController();
  controller.abort();
  const base = req();
  const cancelled = new Request(base, { signal: controller.signal });
  assert.equal((await assistantFetch(cancelled, f.env)).status, 503);
  assert.equal(f.calls.length, 0);
});

test('transport rejects extra private catalog fields before any fetch', async () => {
  let calls = 0;
  const send = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/chat',
    fetcher: async () => {
      calls++;
      throw Error('unexpected');
    },
  });
  await assert.rejects(send('khí', [{ ...catalog[0], attachments: ['private'] }], { version: 2 }));
  assert.equal(calls, 0);
});

test('frontend transport -> Worker -> model contract -> validated response works end to end offline', async () => {
  const f = fixture();
  globalThis.location = { origin: 'http://localhost:4173' };
  const send = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/chat',
    fetcher: async (url, options) => {
      const headers = new Headers(options.headers);
      headers.set('Origin', location.origin);
      return assistantFetch(new Request(url, { ...options, headers }), f.env);
    },
  });
  const result = await send('Giải thích bọt khí', catalog, { version: 2 });
  assert.equal(result.status, 'answered');
  assert.equal(result.answer, answer.answer);
  assert.equal(result.sources[0].id, 'p');
  assert.equal(f.calls.length, 2);
});

test('validated follow-up spends one Qwen call and zero embeddings', async () => {
  const f = fixture();
  const response = await assistantFetch(
    req({ query: 'Nói đơn giản hơn nữa.', context: { query: 'Bọt khí', ids: ['p'] } }),
    f.env,
  );
  assert.equal(response.status, 200);
  assert.equal(f.calls.length, 1);
  assert.match(f.calls[0].model, /qwen/);
  assert.equal(response.headers.get('X-Assistant-Model-Calls'), '1');
});
test('direct V2 website metadata request reserves no budget and invokes no model', async () => {
  const f = fixture();
  const response = await assistantFetch(req({ query: 'Web có những gì?' }), f.env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).mode, 'deterministic');
  assert.equal(f.calls.length, 0);
  assert.equal(f.budgets.length, 0);
});

test('deterministic transport accepts semantic key order but rejects fabricated profile', async () => {
  globalThis.location = { origin: 'http://localhost:4173' };
  const f = fixture();
  const send = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/chat',
    fetcher: async (url, o) => {
      const h = new Headers(o.headers);
      h.set('Origin', location.origin);
      const r = await assistantFetch(new Request(url, { ...o, headers: h }), f.env);
      const value = await r.json();
      return Response.json(Object.fromEntries(Object.entries(value).reverse()));
    },
  });
  const result = await send('Web có những gì?', catalog, { version: 2 });
  assert.equal(result.mode, 'deterministic');
  assert.equal(f.calls.length, 0);
  assert.equal(f.budgets.length, 0);
  const bad = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/chat',
    fetcher: async () => Response.json({ ...result, answer: 'Có 999 học liệu' }),
  });
  await assert.rejects(bad('Web có những gì?', catalog, { version: 2 }));
});

test('operation ceiling reserves failure margin and follow-up failure never retries embeddings', async () => {
  const { assistantReservationLimit } = await import('../workers/board-assistant/index.js');
  assert.equal(assistantReservationLimit, 3);
  assert.ok(assistantReservationLimit * (1 + 1 + 2 + 1) + 2 + 1 + 2 <= 20);
  const f = fixture();
  f.env.AI.run = async (model) => {
    f.calls.push({ model });
    throw Error('synthetic failure');
  };
  const r = await assistantFetch(req({ context: { query: 'Bọt khí', ids: ['p'] } }), f.env);
  assert.equal(r.status, 503);
  assert.equal(f.calls.length, 1);
  assert.match(f.calls[0].model, /qwen/);
  assert.equal(f.budgets.length, 2);
  assert.equal(r.headers.get('X-Assistant-Model-Calls'), '1');
});
