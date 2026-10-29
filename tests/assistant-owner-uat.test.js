/** Finite offline replay of owner UAT; bindings are fake and no external fetch is allowed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantFetch } from '../workers/board-assistant/index.js';
import { previewFixture } from '../workers/board-assistant/preview-fixture.js';
import { publicAssistantCorpus, retrievePublicContent } from '../src/utils/public-retrieval.js';
import { assistantResponseDiagnostics } from '../src/utils/assistant-diagnostics.js';
import { validatePublicAnswerFacts } from '../src/utils/public-temporal.js';
import { ownerFailureHeaders } from '../scripts/owner-ai-hosted.mjs';

const question = 'Xưởng mô hình giấy diễn ra khi nào? Có thay đổi lịch không?';
const plan = retrievePublicContent(question, publicAssistantCorpus(previewFixture), {
  now: '2026-10-29T14:00:00Z',
});

test('owner preparation/audience question does not require an unrelated schedule reminder', () => {
  const result = {
    status: 'answered',
    answer: 'Em cần giấy tái chế và bút màu. Hoạt động dành cho nhóm thực hành A.',
    sources: plan.grounding.passages
      .filter((p) => ['notice', 'update'].includes(p.postId))
      .map((p) => ({ id: p.id })),
  };
  assert.equal(
    validatePublicAnswerFacts(
      result,
      plan.catalog,
      plan.grounding,
      'Vậy em cần chuẩn bị những gì và hoạt động dành cho ai?',
    ),
    result,
  );
});

test('owner503 forwards actual model calls and bounded diagnostics, never credentials', () => {
  const response = new Response(null, {
    status: 503,
    headers: {
      'X-Assistant-Model-Calls': '2',
      'X-Assistant-Stage': 'validation',
      'X-Assistant-Reason': 'revision',
      Authorization: 'private sentinel',
    },
  });
  const headers = ownerFailureHeaders(response);
  assert.equal(headers['X-Assistant-Model-Calls'], '2');
  assert.equal(headers['X-Assistant-Reason'], 'revision');
  assert.equal(headers.Authorization, undefined);
  assert.equal(ownerFailureHeaders(new Response(null))['X-Assistant-Model-Calls'], undefined);
});

test('preparation question cannot bypass revision guard when the answer asserts a date', () => {
  const result = {
    status: 'answered',
    answer: 'Xưởng diễn ra ngày 22/11/2026.',
    sources: plan.grounding.passages
      .filter((p) => ['notice', 'update'].includes(p.postId))
      .map((p) => ({ id: p.id })),
  };
  assert.throws(
    () => validatePublicAnswerFacts(result, plan.catalog, plan.grounding, 'Cần chuẩn bị những gì?'),
    /^Error: revision$/,
  );
});

/** Exercises the actual Worker pipeline with controlled completion and budget responses. */
function replay({ answer, ids = ['notice', 'update'], generated, failure, stopStatus = 204 } = {}) {
  const calls = [],
    budget = [];
  const env = {
    AI_ENABLED: 'true',
    PREVIEW_EXPIRES: new Date(Date.now() + 60000).toISOString(),
    BUDGET: {
      idFromName: (x) => x,
      get: () => ({
        fetch: async (url) => {
          budget.push(url);
          if (url.endsWith('/stop') && stopStatus === 'throw') throw Error('private storage error');
          return new Response(null, { status: url.endsWith('/stop') ? stopStatus : 204 });
        },
      }),
    },
    AI: {
      run: async (model, input, options) => {
        calls.push(model);
        if (model.includes('bge')) return { data: input.text.map(() => [1, 0]) };
        if (failure === 'timeout')
          return new Promise((_, reject) => {
            options.signal.addEventListener('abort', () => reject(Error('private upstream text')), {
              once: true,
            });
          });
        if (failure) throw Error('private upstream text');
        if (generated !== undefined) return generated;
        const sources = JSON.parse(input.messages[1].content.split('\n/no_think')[0]);
        const wireIds = sources.grounding.sources
          .filter((s) => ids.includes(s.metadata.postId))
          .map((s) => s.id);
        return {
          response: JSON.stringify({
            status: 'answered',
            answer,
            ids: wireIds,
            coverage: 'provided_text',
          }),
        };
      },
    },
  };
  const run = () =>
    assistantFetch(
      new Request('https://worker.test/chat', {
        method: 'POST',
        headers: { Origin: 'http://localhost:4173', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 3,
          query: question,
          catalog: plan.catalog,
          context: null,
          grounding: plan.grounding,
        }),
      }),
      env,
    );
  return { run, calls, budget };
}

for (const wording of ['đổi lịch', 'dời lịch', 'chuyển sang', 'đã được điều chỉnh']) {
  test(`owner exact question accepts supported revision: ${wording}`, async () => {
    const h = replay({
      answer: `Xưởng mô hình giấy ${wording} ngày 22/11/2026; lịch cũ là 20/11/2026.`,
    });
    assert.equal((await h.run()).status, 200);
    assert.equal(h.calls.length, 2);
    assert.equal(h.budget.length, 1);
  });
}
test('natural adjusted wording alone acknowledges the supported revision', async () => {
  const h = replay({
    answer: 'Xưởng mô hình giấy diễn ra ngày 22/11/2026; lịch đã được điều chỉnh.',
  });
  assert.equal((await h.run()).status, 200);
});

test('captured successful Qwen UAT wording passes without weakening dates or citations', async () => {
  // Captured from the newly authorized successful retest, never the lost historical completion.
  const h = replay({
    answer:
      'Xưởng mô hình giấy được điều chỉnh diễn ra vào ngày 22/11/2026 tại sân mô phỏng. Trước đó, hoạt động dự kiến diễn ra ngày 20/11/2026. Vật dụng cần mang vẫn là giấy tái chế và bút màu.',
  });
  assert.equal((await h.run()).status, 200);
  assert.equal(h.calls.length, 2);
});
for (const [name, options, reason] of [
  [
    'missing necessary update citation',
    { answer: 'Xưởng diễn ra ngày 22/11/2026, đổi lịch.', ids: ['notice'] },
    'unsupported_date',
  ],
  ['invented date', { answer: 'Xưởng đổi lịch sang 25/11/2026.' }, 'unsupported_date'],
  [
    'invented number',
    { answer: 'Xưởng đổi lịch sang 22/11/2026, cần 99 tờ giấy.' },
    'unsupported_number',
  ],
  ['unacknowledged revision', { answer: 'Xưởng diễn ra ngày 22/11/2026.' }, 'revision'],
  ['corrupt JSON', { generated: { response: '{broken' } }, 'model_json'],
  ['missing envelope', { generated: {} }, 'model_envelope'],
  [
    'invalid answer contract',
    { generated: { response: { answer: 'incomplete' } } },
    'answer_contract',
  ],
  [
    'unsupported citation',
    {
      generated: {
        response: { status: 'answered', answer: 'x', ids: ['unknown'], coverage: 'provided_text' },
      },
    },
    'unsupported_citation',
  ],
  ['Qwen failure', { failure: 'model' }, 'generation_failure'],
]) {
  test(`owner replay rejects ${name}, stops once and never retries`, async () => {
    const h = replay(options);
    const response = await h.run();
    assert.equal(response.status, 503);
    assert.deepEqual(assistantResponseDiagnostics(response.headers), {
      stage: reason === 'generation_failure' ? 'answer' : 'validation',
      reason,
      reserved: true,
      failureStop: 'confirmed',
    });
    assert.equal(h.calls.length, 2);
    assert.equal(h.budget.length, 2);
    assert.ok(h.budget.at(-1).endsWith('/stop'));
    assert.equal((await response.text()).includes('private upstream text'), false);
  });
}
test('Qwen timeout after embedding stops once without retry', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = replay({ failure: 'timeout' });
  const pending = h.run();
  await new Promise((resolve) => setImmediate(resolve));
  t.mock.timers.tick(40001);
  const response = await pending;
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('X-Assistant-Reason'), 'inference_timeout');
  assert.equal(h.calls.length, 2);
  assert.equal(h.budget.length, 2);
});

test('update source alone supports both dates; no arbitrary two-citation requirement', async () => {
  const h = replay({
    ids: ['update'],
    answer: 'Xưởng chuyển sang ngày 22/11/2026; thông báo thay thế lịch 20/11/2026.',
  });
  assert.equal((await h.run()).status, 200);
});

test('failed stop is reported as rejected rather than confirmed', async () => {
  const h = replay({ failure: 'model', stopStatus: 503 });
  const response = await h.run();
  assert.equal(response.headers.get('X-Assistant-Failure-Stop'), 'rejected');
  assert.equal(h.budget.length, 2);
});

test('storage exception leaves failure-stop unconfirmed and never retries', async () => {
  const h = replay({ failure: 'model', stopStatus: 'throw' });
  const response = await h.run();
  assert.equal(response.headers.get('X-Assistant-Failure-Stop'), 'unconfirmed');
  assert.equal(h.budget.length, 2);
  assert.equal((await response.text()).includes('private storage error'), false);
});

test('diagnostic projection discards arbitrary headers and raw model contents', () => {
  const headers = new Headers({
    'X-Assistant-Stage': 'private prompt',
    'X-Assistant-Reason': 'Bearer secret',
    'X-Assistant-Reserved': 'unknown',
    'X-Assistant-Failure-Stop': 'untrusted source body',
  });
  assert.deepEqual(assistantResponseDiagnostics(headers), {});
  assert.deepEqual(assistantResponseDiagnostics(new Headers()), {});
});
