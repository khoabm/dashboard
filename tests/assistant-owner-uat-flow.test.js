/** Manual bounded UAT policy/admission regressions; no external network or production storage. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { AssistantBudget, previewFetch } from '../workers/board-assistant/preview.js';
import {
  ownerUatBudgetName,
  pilotBudgetName,
  assistantBudgetPolicy,
} from '../workers/board-assistant/budget-policy.js';
import { assertPilotCanStart, ownerUatProfile } from '../scripts/owner-ai-hosted.mjs';
import { ownerUatInitialLedger } from '../scripts/owner-uat-setup.mjs';
import { previewFixture } from '../workers/board-assistant/preview-fixture.js';
import { publicAssistantCorpus, retrievePublicContent } from '../src/utils/public-retrieval.js';

/** Provides actual DO code with isolated ephemeral serialized storage per fixed identity. */
function namespace() {
  const states = new Map([[pilotBudgetName, { count: 3, stopped: true }]]);
  const objects = new Map();
  return {
    states,
    idFromName: (name) => name,
    get(name) {
      if (!objects.has(name))
        objects.set(
          name,
          new AssistantBudget({
            storage: {
              get: async () => structuredClone(states.get(name)),
              put: async (_, value) => states.set(name, structuredClone(value)),
            },
            blockConcurrencyWhile: async (task) => task(),
          }),
        );
      return { fetch: (url, options) => objects.get(name).fetch(new Request(url, options)) };
    },
  };
}

test('UAT has fixed3 lifetime slots and cannot reopen stopped pilot or replenish itself', async () => {
  assert.deepEqual(assistantBudgetPolicy(ownerUatBudgetName), {
    name: ownerUatBudgetName,
    limit: 3,
    prefix: '',
  });
  assert.equal(assistantBudgetPolicy(`${ownerUatBudgetName}-next`), null);
  const ns = namespace();
  const old = ns.get(pilotBudgetName),
    fresh = ns.get(ownerUatBudgetName);
  assert.equal((await old.fetch('https://budget/pilot/reserve', { method: 'POST' })).status, 429);
  for (let i = 0; i < 3; i++)
    assert.equal((await fresh.fetch('https://budget/reserve', { method: 'POST' })).status, 204);
  assert.equal((await fresh.fetch('https://budget/reserve', { method: 'POST' })).status, 429);
  assert.deepEqual(ns.states.get(pilotBudgetName), { count: 3, stopped: true });
  assert.deepEqual(ns.states.get(ownerUatBudgetName), { count: 3, stopped: false });
  await fresh.fetch('https://budget/stop', { method: 'POST' });
  assert.equal((await fresh.fetch('https://budget/reserve', { method: 'POST' })).status, 429);
});

test('UAT local role/cumulative caps and fail-closed guards preserve reserved owner turns', () => {
  const now = Date.now(),
    ledger = {
      operations: 34,
      qaReservations: 0,
      ownerReservations: 0,
      receipts: [{ state: 'observed' }],
    };
  const proof = {
    account: '78913564ee11ed7d2648d8b09852f88f',
    plan: 'free',
    remainingNeurons: 9000,
    checkedAt: new Date(now).toISOString(),
  };
  const options = { profile: ownerUatProfile, qa: true, now };
  assert.doesNotThrow(() => assertPilotCanStart(ledger, proof, options));
  for (const change of [
    { qaReservations: 1 },
    { blocked: true },
    { operations: 49 },
    { receipts: [{ state: 'reserved' }] },
  ])
    assert.throws(() => assertPilotCanStart({ ...ledger, ...change }, proof, options), /BLOCKED/);
  assert.doesNotThrow(() =>
    assertPilotCanStart({ ...ledger, qaReservations: 1 }, proof, { ...options, qa: false }),
  );
  assert.throws(
    () =>
      assertPilotCanStart({ ...ledger, ownerReservations: 2 }, proof, { ...options, qa: false }),
    /BLOCKED/,
  );
  assert.throws(() => ownerUatInitialLedger(Buffer.from('{}'), {}), /incident ledger changed/);
});

test('authenticated UAT status and exact-question inference route only to fixed UAT object', async () => {
  const token = 'c'.repeat(64);
  const hash = Buffer.from(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
  ).toString('hex');
  const ns = namespace(),
    models = [];
  const env = {
    BUDGET_RUN_ID: ownerUatBudgetName,
    BUDGET: ns,
    AI_ENABLED: 'true',
    PREVIEW_EXPIRES: new Date(Date.now() + 60000).toISOString(),
    PREVIEW_ACCESS_EXPIRES: new Date(Date.now() + 60000).toISOString(),
    PREVIEW_TOKEN_SHA256: hash,
    AI: {
      run: async (model, input) => {
        models.push(model);
        if (model.includes('bge')) return { data: input.text.map(() => [1, 0]) };
        const prompt = JSON.parse(input.messages[1].content.split('\n/no_think')[0]);
        return {
          response: {
            status: 'answered',
            coverage: 'provided_text',
            answer: 'Xưởng chuyển sang ngày 22/11/2026; thông báo thay thế lịch 20/11/2026.',
            ids: [prompt.sources.find((s) => s.title === 'Điều chỉnh Xưởng mô hình giấy').id],
          },
        };
      },
    },
  };
  const headers = {
    Authorization: `Bearer ${token}`,
    Origin: 'http://localhost:4173',
    'Content-Type': 'application/json',
  };
  const status = await previewFetch(
    new Request('https://worker.test/preview/status', { headers }),
    env,
  );
  assert.deepEqual((await status.json()).budget, {
    count: 0,
    stopped: false,
    limit: 3,
    remaining: 3,
  });
  assert.equal(models.length, 0);
  const query = 'Xưởng mô hình giấy diễn ra khi nào? Có thay đổi lịch không?';
  const plan = retrievePublicContent(query, publicAssistantCorpus(previewFixture));
  const payload = {
    version: 3,
    query,
    context: null,
    catalog: plan.catalog,
    grounding: plan.grounding,
  };
  const request = (value) =>
    new Request('https://worker.test/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(value),
    });
  assert.equal((await previewFetch(request(payload), env)).status, 200);
  assert.equal(models.length, 2);
  assert.deepEqual(ns.states.get(ownerUatBudgetName), { count: 1, stopped: false });
  const bad = structuredClone(payload);
  bad.catalog[0].body = 'private backend sentinel';
  assert.equal((await previewFetch(request(bad), env)).status, 422);
  assert.equal(models.length, 2);
  assert.deepEqual(ns.states.get(pilotBudgetName), { count: 3, stopped: true });
  assert.equal(
    (await previewFetch(request(payload), { ...env, PREVIEW_ACCESS_EXPIRES: '2000-01-01' })).status,
    403,
  );
});
