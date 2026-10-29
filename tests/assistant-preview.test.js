/** Manual admission/provenance/clock/privacy regressions; fake bindings only, no external network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  previewFetch,
  previewBudgetName,
  AssistantBudget,
} from '../workers/board-assistant/preview.js';
import { assistantFetch } from '../workers/board-assistant/index.js';
import { previewFixture } from '../workers/board-assistant/preview-fixture.js';
import { publicAssistantCorpus, retrievePublicContent } from '../src/utils/public-retrieval.js';
import { publicTimeContext } from '../src/utils/public-temporal.js';
import { createBoardAssistantRequest } from '../src/services/board-assistant.js';
const token = 'a'.repeat(64);
const digest = Buffer.from(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
).toString('hex');
const query = 'So sánh Lực đẩy trong nước và Nếp gấp sao giấy';
const corpus = publicAssistantCorpus(previewFixture);
const plan = retrievePublicContent(query, corpus);
const body = () => ({
  query,
  catalog: plan.catalog,
  grounding: plan.grounding,
  context: null,
  version: 3,
});
const req = (
  payload = body(),
  authorization = `Bearer ${token}`,
  path = '/chat',
  method = 'POST',
) =>
  new Request(`https://worker.test${path}`, {
    method,
    headers: {
      Origin: 'http://localhost:4173',
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
  });
function fixture() {
  const models = [],
    budget = [],
    names = [];
  return {
    models,
    budget,
    names,
    env: {
      BUDGET_RUN_ID: previewBudgetName,
      AI_ENABLED: 'true',
      PREVIEW_EXPIRES: new Date(Date.now() + 60000).toISOString(),
      PREVIEW_ACCESS_EXPIRES: new Date(Date.now() + 60000).toISOString(),
      PREVIEW_TOKEN_SHA256: digest,
      BUDGET: {
        idFromName: (name) => {
          names.push(name);
          return name;
        },
        get: () => ({
          fetch: async (url) => {
            budget.push(url);
            return url.endsWith('/status')
              ? Response.json({ count: 1, stopped: true, limit: 5, remaining: 0 })
              : new Response(null, { status: 204 });
          },
        }),
      },
      AI: {
        run: async (model, input) => {
          models.push({ model, input });
          if (model.includes('bge')) return { data: input.text.map(() => [1, 0]) };
          const p = JSON.parse(input.messages[1].content.split('\n/no_think')[0]);
          return {
            response: {
              status: 'answered',
              answer: 'Lực đẩy hướng từ dưới lên.',
              ids: [p.sources.find((s) => s.title === 'Lực đẩy trong nước').id],
              coverage: 'provided_text',
            },
          };
        },
      },
    },
  };
}
test('admission denies absent/wrong/expired/overlong access before touching budget or model', async () => {
  for (const change of [
    { token: '' },
    { token: `Bearer ${'b'.repeat(64)}` },
    { expiry: '2000-01-01' },
    { expiry: new Date(Date.now() + 1900000).toISOString() },
  ]) {
    const h = fixture();
    if (change.expiry) h.env.PREVIEW_ACCESS_EXPIRES = change.expiry;
    assert.equal(
      (await previewFetch(req(body(), change.token ?? `Bearer ${token}`), h.env)).status,
      403,
    );
    assert.equal(h.models.length + h.budget.length, 0);
  }
});
test('only exact synthetic windows admitted; forged public/private data, coverage and alternate identity rejected', async () => {
  for (const change of ['body', 'title', 'metadata', 'coverage', 'identity', 'context']) {
    const h = fixture(),
      p = structuredClone(body());
    if (change === 'body') p.catalog[0].body = 'private backend grade sentinel';
    if (change === 'title') p.catalog[0].title = 'forged published';
    if (change === 'metadata') p.grounding.passages[0].secret = 'session';
    if (change === 'coverage') p.grounding.scope.totalPosts++;
    if (change === 'identity') h.env.BUDGET_RUN_ID = 'approved-synthetic-mvp-v99';
    if (change === 'context') p.context = { query: 'DOB 2010-01-01', ids: ['c0'] };
    assert.ok([422, 503].includes((await previewFetch(req(p), h.env)).status), change);
    assert.equal(h.models.length + h.budget.length, 0);
  }
  const h = fixture();
  assert.equal((await previewFetch(req(), h.env)).status, 200);
  assert.deepEqual(h.names, [previewBudgetName]);
  assert.equal(h.models.length, 2);
});
test('status reads same lifetime allowance without reserve/write/model; disabled chat touches none', async () => {
  const h = fixture();
  h.env.AI_ENABLED = 'false';
  const r = await previewFetch(req(null, `Bearer ${token}`, '/preview/status', 'GET'), h.env);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).budget.remaining, 0);
  assert.deepEqual(h.budget, ['https://budget/pilot/status']);
  assert.equal(h.models.length, 0);
  assert.equal((await previewFetch(req(), h.env)).status, 503);
  assert.equal(h.budget.length, 1);
});
test('DO status does not initialize/reset stopped, exhausted or absent state', async () => {
  for (const stored of [undefined, { count: 1, stopped: true }, { count: 4, stopped: false }]) {
    let writes = 0;
    const obj = new AssistantBudget({
      blockConcurrencyWhile: (f) => f(),
      storage: { get: async () => stored, put: async () => writes++ },
    });
    const res = await obj.fetch(new Request('https://budget/status', { method: 'POST' }));
    assert.equal(res.status, 200);
    assert.equal(writes, 0);
    assert.equal((await res.json()).remaining, stored ? 0 : 3);
  }
});
test('hosted prompt and response use server clock even when payload clock is forged; pure clock stays frozen', async () => {
  const h = fixture(),
    p = body();
  p.grounding = { ...p.grounding, clock: '2099-01-01T00:00:00Z' };
  const r = await assistantFetch(req(p), h.env);
  assert.equal(r.status, 200);
  const sent = JSON.parse(h.models[1].input.messages[1].content.split('\n/no_think')[0]);
  const actual = r.headers.get('X-Assistant-Clock');
  assert.ok(Math.abs(Date.parse(actual) - Date.now()) < 5000);
  assert.equal(sent.grounding.time.now, actual);
  assert.equal(sent.grounding.time.timeZone, 'Asia/Ho_Chi_Minh');
  assert.equal(publicTimeContext('hôm nay', '2026-11-09T17:00:00Z').today, '2026-11-10');
  assert.equal(publicTimeContext('hôm nay', '2026-11-09T16:59:59Z').today, '2026-11-09');
});
test('explicit personal identifiers in current/prior questions never fetch; private backend fields never project', async () => {
  let calls = 0;
  globalThis.location = { origin: 'http://localhost:4173' };
  const send = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/chat',
    fetcher: async () => {
      calls++;
      throw Error('unexpected');
    },
  });
  for (const q of [
    'CMND 012 345 678',
    'DOB 2010-01-01',
    'ngày sinh của tôi 01/01/2010',
    'Em sinh 20/11/2010, có hoạt động nào phù hợp?',
  ])
    await assert.rejects(send(q, corpus.posts, { version: 3 }));
  await assert.rejects(
    send('giải thích tiếp', corpus.posts, {
      version: 3,
      context: { query: 'DOB 2010-01-01', ids: ['lesson'] },
    }),
  );
  const snapshot = structuredClone(previewFixture);
  snapshot.Auth = { session: 'private-session' };
  snapshot.Gradebook = { dob: 'private-dob', scores: 'private-score' };
  snapshot.posts[0].cccd = 'private-id';
  snapshot.posts.push({
    ...snapshot.posts[0],
    id: 'private',
    status: 'draft',
    body: 'private-body',
  });
  assert.equal(JSON.stringify(publicAssistantCorpus(snapshot)).includes('private-'), false);
  assert.equal(calls, 0);
});

test('forged past clock cannot authorize an upcoming claim; transport requires server clock evidence', async () => {
  const old = structuredClone(previewFixture);
  old.posts = [{ ...old.posts[2], body: 'Hoạt động diễn ra ngày 20/11/2000.' }];
  const oldCorpus = publicAssistantCorpus(old);
  const question = 'Sắp tới có hoạt động gì?';
  const p = retrievePublicContent(question, oldCorpus, { now: '1999-01-01T00:00:00Z' });
  const completion = {
    status: 'answered',
    answer: 'Sắp tới hoạt động diễn ra ngày 20/11/2000.',
    ids: ['c0'],
    coverage: 'provided_text',
  };
  const h = fixture();
  h.env.AI.run = async (model, input) => {
    h.models.push(model);
    return model.includes('bge')
      ? { data: input.text.map(() => [1, 0]) }
      : { response: completion };
  };
  const response = await assistantFetch(
    req({ version: 3, query: question, catalog: p.catalog, grounding: p.grounding, context: null }),
    h.env,
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).stage, 'validation');
  assert.equal(h.budget.at(-1), 'https://budget/pilot/stop');
  const makeSend = (clock) =>
    createBoardAssistantRequest({
      enabled: true,
      endpoint: '/chat',
      fetcher: async () =>
        Response.json(
          {
            mode: 'ai',
            status: 'answered',
            answer: completion.answer,
            coverage: 'provided_text',
            sources: [{ id: 'c0', quote: p.catalog[0].body }],
          },
          { headers: clock ? { 'X-Assistant-Clock': clock } : {} },
        ),
    });
  await assert.rejects(
    makeSend(null)(question, oldCorpus.posts, { version: 3, now: '1999-01-01T00:00:00Z' }),
    /clock/,
  );
  await assert.rejects(
    makeSend(new Date().toISOString())(question, oldCorpus.posts, {
      version: 3,
      now: '1999-01-01T00:00:00Z',
    }),
    /unknown_future/,
  );
});
