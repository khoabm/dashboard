/** Manual finite allowance/identity and privacy regressions; no network, outside curated CI. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { AssistantBudget, assistantFetch } from '../workers/board-assistant/index.js';
import {
  assistantBudgetPolicy,
  pilotBudgetName,
  legacyBudgetName,
} from '../workers/board-assistant/budget-policy.js';
import { validAssistantQuery } from '../src/utils/board-assistant.js';
import { learningIntent } from '../src/utils/assistant-learning.js';
import { publicAssistantCorpus } from '../src/utils/public-retrieval.js';
import { previewFixture } from '../workers/board-assistant/preview-fixture.js';
import { assertPilotCanStart, assertPilotPayload } from '../scripts/owner-ai-hosted.mjs';
import { retrievePublicContent } from '../src/utils/public-retrieval.js';
/** Models the same namespace with isolated storage for each stable identity. */
function binding() {
  const objects = new Map(),
    states = new Map();
  return {
    states,
    idFromName: (n) => n,
    get(name) {
      if (!objects.has(name)) {
        const values = new Map();
        states.set(name, values);
        let queue = Promise.resolve();
        const state = {
          storage: {
            get: async (k) => structuredClone(values.get(k)),
            put: async (k, v) => values.set(k, structuredClone(v)),
          },
          blockConcurrencyWhile(task) {
            const result = queue.then(task);
            queue = result.catch(() => {});
            return result;
          },
        };
        objects.set(name, new AssistantBudget(state));
      }
      return { fetch: (url, options) => objects.get(name).fetch(new Request(url, options)) };
    },
  };
}
test('only two fixed identities exist; pilot5 never changes legacy3/stopped storage', async () => {
  assert.deepEqual(assistantBudgetPolicy(pilotBudgetName), {
    name: pilotBudgetName,
    limit: 5,
    prefix: '/pilot',
  });
  assert.equal(assistantBudgetPolicy('approved-synthetic-v2-pilot-v2'), null);
  const ns = binding(),
    old = ns.get(legacyBudgetName),
    fresh = ns.get(pilotBudgetName);
  ns.states.get(legacyBudgetName).set('allowance', { count: 1, stopped: true });
  const status = await fresh.fetch('https://budget/pilot/status', { method: 'POST' });
  assert.deepEqual(await status.json(), { count: 0, stopped: false, limit: 5, remaining: 5 });
  assert.equal(ns.states.get(pilotBudgetName).has('allowance'), false);
  ns.states.get(pilotBudgetName).set('allowance', { count: 4, stopped: false });
  assert.deepEqual(
    (
      await Promise.all([
        fresh.fetch('https://budget/pilot/reserve', { method: 'POST' }),
        fresh.fetch('https://budget/pilot/reserve', { method: 'POST' }),
      ])
    ).map((r) => r.status),
    [204, 429],
  );
  assert.deepEqual(ns.states.get(pilotBudgetName).get('allowance'), { count: 5, stopped: false });
  assert.equal((await old.fetch('https://budget/reserve', { method: 'POST' })).status, 429);
  assert.deepEqual(ns.states.get(legacyBudgetName).get('allowance'), { count: 1, stopped: true });
});
test('pilot failure-stop persists and cannot be replenished by status or restart', async () => {
  const ns = binding(),
    stub = ns.get(pilotBudgetName);
  ns.states.get(pilotBudgetName).set('allowance', { count: 2, stopped: false });
  await stub.fetch('https://budget/pilot/stop', { method: 'POST' });
  assert.equal((await stub.fetch('https://budget/pilot/reserve', { method: 'POST' })).status, 429);
  assert.equal(
    (await (await stub.fetch('https://budget/pilot/status', { method: 'POST' })).json()).remaining,
    0,
  );
});
test('requested public dates accepted, self DOB blocked, other student grades unsupported', () => {
  for (const q of [
    'Ngày 20/11/2026 có phong trào gì?',
    'Tháng 11/2026 có thông báo gì?',
    'Bài sinh học ngày 20/11/2026 nói gì?',
  ])
    assert.equal(validAssistantQuery(q), true, q);
  for (const q of [
    'Em sinh 20/11/2010, có hoạt động nào phù hợp?',
    'Ngày sinh của tôi là 20/11/2010.',
    'Tôi sinh vào 20/11/2010',
  ])
    assert.equal(validAssistantQuery(q), false, q);
  assert.equal(
    learningIntent(
      'Tôi muốn xem điểm của học sinh khác.',
      publicAssistantCorpus(previewFixture).posts,
    ).kind,
    'unsupported',
  );
});
test('unknown pilot identity fails before budget and inference', async () => {
  let calls = 0;
  const r = await assistantFetch(
    new Request('https://worker.test/chat', {
      method: 'POST',
      headers: { Origin: 'http://127.0.0.1:4173', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Lực đẩy',
        catalog: [
          { id: 'p', sectionId: 's', sectionTitle: 'S', title: 'Lực đẩy', body: 'Từ dưới lên.' },
        ],
      }),
    }),
    {
      AI_ENABLED: 'true',
      PREVIEW_EXPIRES: new Date(Date.now() + 60000).toISOString(),
      BUDGET_RUN_ID: 'approved-synthetic-v2-pilot-v2',
      AI: { run: () => calls++ },
      BUDGET: { idFromName: () => calls++ },
    },
  );
  assert.equal(r.status, 503);
  assert.equal(calls, 0);
});

test('owner preflight refuses stale/paid/unknown Free proof, uncertain or failed ledger, role and shutdown budget exhaustion', () => {
  const ledger = {
      operations: 23,
      qaReservations: 2,
      ownerReservations: 0,
      receipts: [{ state: 'observed' }],
    },
    now = Date.now();
  const proof = {
    account: '78913564ee11ed7d2648d8b09852f88f',
    plan: 'free',
    remainingNeurons: 9980,
    checkedAt: new Date(now).toISOString(),
  };
  assert.doesNotThrow(() => assertPilotCanStart(ledger, proof, { now }));
  for (const change of [
    { plan: 'paid' },
    { account: 'other' },
    { checkedAt: 'invalid' },
    { checkedAt: new Date(now - 1800001).toISOString() },
    { checkedAt: new Date(now + 1).toISOString() },
    { remainingNeurons: 1999 },
  ])
    assert.throws(() => assertPilotCanStart(ledger, { ...proof, ...change }, { now }), /BLOCKED/);
  for (const change of [
    { blocked: true },
    { receipts: [{ state: 'reserved' }] },
    { ownerReservations: 2 },
    { operations: 29 },
  ])
    assert.throws(() => assertPilotCanStart({ ...ledger, ...change }, proof, { now }), /BLOCKED/);
  assert.throws(
    () => assertPilotCanStart({ ...ledger, qaReservations: 3 }, proof, { now, qa: true }),
    /BLOCKED/,
  );
});

test('localhost gate rejects private identifiers/backend fields or forged publication before cloud', () => {
  const query = 'Lực đẩy trong nước có hướng nào?',
    plan = retrievePublicContent(query, publicAssistantCorpus(previewFixture));
  const p = { query, version: 3, context: null, catalog: plan.catalog, grounding: plan.grounding };
  assert.doesNotThrow(() => assertPilotPayload(p));
  const nextQuery = 'Nói dễ hiểu hơn về bài này được không?';
  const nextPlan = retrievePublicContent(nextQuery, publicAssistantCorpus(previewFixture), {
    context: { query, ids: ['lesson'] },
  });
  assert.doesNotThrow(() =>
    assertPilotPayload({
      query: nextQuery,
      version: 3,
      context: { query, ids: nextPlan.catalog.map((p) => p.id) },
      catalog: nextPlan.catalog,
      grounding: nextPlan.grounding,
    }),
  );
  assert.throws(
    () => assertPilotPayload({ ...p, query: 'Em sinh 20/11/2010, có hoạt động nào phù hợp?' }),
    /local_privacy/,
  );
  assert.throws(() => assertPilotPayload({ ...p, session: 'private-backend' }), /local_privacy/);
  const bad = structuredClone(p);
  bad.catalog[0].body = 'private backend grade record';
  assert.throws(() => assertPilotPayload(bad), /local_provenance/);
  assert.throws(
    () => assertPilotPayload({ ...p, context: { query: 'DOB 2010-01-01', ids: ['c0'] } }),
    /local_privacy/,
  );
});
