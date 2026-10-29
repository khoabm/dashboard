/** Manual specialist HTTP/AI boundary tests with finite in-memory failure injection; never test:ci. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assistantFetch,
  AssistantBudget,
  cosine,
  rankAssistantCatalog,
  validateCatalog,
  decodeAssistantCompletion,
} from '../workers/board-assistant/index.js';
import { assistantCatalog } from '../src/utils/board-assistant.js';

const catalog = assistantCatalog({
  sections: [{ id: 's', title: 'Mẫu thử' }],
  posts: [
    {
      id: 'gas',
      section_id: 's',
      title: 'Khí · MẪU THỬ',
      body: 'Mô tả giả: có bọt khí.',
      status: 'published',
    },
    {
      id: 'light',
      section_id: 's',
      title: 'Ánh sáng · MẪU THỬ',
      body: 'Mô tả giả về ánh sáng.',
      status: 'published',
    },
  ],
});

/** Models one serialized object, including storage failure, without emulating successful hosted AI. */
function budgetFixture() {
  const values = new Map();
  let queue = Promise.resolve();
  const state = {
    storage: {
      get: async (key) => structuredClone(values.get(key)),
      put: async (key, value) => {
        values.set(key, structuredClone(value));
      },
    },
    blockConcurrencyWhile: (task) => {
      const result = queue.then(task);
      queue = result.catch(() => {});
      return result;
    },
  };
  return { object: new AssistantBudget(state), state, values };
}

/** Builds one synthetic request and spies on explicit binding invocation counts. */
function setup({ fail = false, invalid = false } = {}) {
  const { object, values } = budgetFixture();
  const calls = [];
  const env = {
    AI_ENABLED: 'true',
    PREVIEW_EXPIRES: new Date(Date.now() + 60000).toISOString(),
    BUDGET: {
      idFromName: (name) => name,
      get: () => ({ fetch: (url, options) => object.fetch(new Request(url, options)) }),
    },
    AI: {
      run: async (model) => {
        calls.push(model);
        if (fail) throw Error('private upstream detail');
        return model.includes('bge')
          ? {
              data: [
                [1, 0],
                [1, 0],
                [0, 1],
              ],
            }
          : {
              response: JSON.stringify({
                ids: [invalid ? 'invented' : 'gas'],
              }),
            };
      },
    },
  };
  return { env, calls, values };
}

/** Creates a local Request object only; this helper never sends HTTP traffic. */
function request(payload = { query: 'khí', catalog }, origin = 'http://localhost:4173') {
  return new Request('https://worker.test/chat', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

test('semantic rank retains paraphrase candidates and validates vectors', () => {
  assert.equal(
    rankAssistantCatalog('sủi bọt', catalog, [
      [1, 0],
      [1, 0],
      [0, 1],
    ])[0].id,
    'gas',
  );
  assert.throws(() => cosine([0], [1]));
  assert.throws(() => cosine([NaN], [1]));
  assert.throws(() => cosine([1], [1, 2]));
  assert.throws(() => validateCatalog([{ ...catalog[0], attachments: [] }]));
});

test('completion envelopes accept JSON mode objects and choices but reject extra model commands', () => {
  const value = { ids: ['gas'] };
  const expected = [{ id: 'gas', quote: catalog[0].body }];
  assert.deepEqual(decodeAssistantCompletion({ response: value }, catalog), expected);
  assert.deepEqual(
    decodeAssistantCompletion(
      { response: '<think>Untrusted model reasoning</think>\n' + JSON.stringify(value) },
      catalog,
    ),
    expected,
  );
  assert.throws(() => decodeAssistantCompletion({ response: '<think>unfinished' }, catalog));
  assert.deepEqual(
    decodeAssistantCompletion(
      { choices: [{ message: { content: JSON.stringify(value) } }] },
      catalog,
    ),
    expected,
  );
  assert.throws(() =>
    decodeAssistantCompletion({ response: { ...value, command: 'publish' } }, catalog),
  );
});

test('origin, disabled, expired, private-key and oversize input reject before inference', async () => {
  const { env, calls } = setup();
  assert.equal((await assistantFetch(request(undefined, 'https://evil.test'), env)).status, 403);
  assert.equal((await assistantFetch(request(), { ...env, AI_ENABLED: 'false' })).status, 503);
  assert.equal(
    (await assistantFetch(request(), { ...env, PREVIEW_EXPIRES: 'invalid' })).status,
    503,
  );
  assert.equal(
    (await assistantFetch(request({ query: 'khí', catalog, token: 'private' }), env)).status,
    422,
  );
  assert.equal(
    (await assistantFetch(request({ query: 'a'.repeat(65000), catalog }), env)).status,
    422,
  );
  assert.equal(calls.length, 0);
});

test('success performs exactly two binding calls and returns only validated quotes', async () => {
  const { env, calls } = setup();
  const response = await assistantFetch(request(), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    mode: 'ai',
    sources: [{ id: 'gas', quote: catalog[0].body }],
  });
  assert.equal(calls.length, 2);
});

test('model failure stops global allowance and never retries or leaks diagnostics', async () => {
  const { env, calls, values } = setup({ fail: true });
  const response = await assistantFetch(request(), env);
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('private'), false);
  assert.equal(calls.length, 1);
  assert.equal(values.get('allowance').stopped, true);
  assert.equal((await assistantFetch(request(), env)).status, 429);
  assert.equal(calls.length, 1);
});

test('invented model citations fail closed rather than reaching the chat', async () => {
  const { env, values } = setup({ invalid: true });
  assert.equal((await assistantFetch(request(), env)).status, 503);
  assert.equal(values.get('allowance').stopped, true);
});

test('two final-slot reservations serialize; lifetime cap is retained across object restart', async () => {
  const { object, state, values } = budgetFixture();
  values.set('allowance', { count: 2, stopped: false });
  const reserve = () => object.fetch(new Request('https://budget/reserve', { method: 'POST' }));
  assert.deepEqual(
    (await Promise.all([reserve(), reserve()])).map((r) => r.status),
    [204, 429],
  );
  const restarted = new AssistantBudget(state);
  assert.equal(
    (await restarted.fetch(new Request('https://budget/reserve', { method: 'POST' }))).status,
    429,
  );
});

test('storage failure cannot authorize inference', async () => {
  const { env, calls } = setup();
  env.BUDGET.get = () => ({
    fetch: async () => {
      throw Error('storage');
    },
  });
  assert.equal((await assistantFetch(request(), env)).status, 503);
  assert.equal(calls.length, 0);
});

test('tightened cap preserves exhausted/stopped legacy state and rejects corrupt allowance', async () => {
  for (const stored of [
    { count: 3, stopped: false },
    { count: 4, stopped: false },
    { count: 1, stopped: true },
    { count: -1, stopped: false },
    { count: '0', stopped: false },
    null,
    false,
    0,
  ]) {
    const { object, values } = budgetFixture();
    values.set('allowance', stored);
    const response = await object.fetch(new Request('https://budget/reserve', { method: 'POST' }));
    assert.equal(
      response.status,
      Number.isSafeInteger(stored?.count) && stored.count >= 0 ? 429 : 503,
    );
    assert.deepEqual(values.get('allowance'), stored);
  }
});
