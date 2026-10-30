/** Manual specialist transport checks with local Response objects and no HTTP traffic; outside CI. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoardAssistantRequest } from '../src/services/board-assistant.js';

globalThis.location = { origin: 'http://localhost:4174' };
const catalog = [
  { id: 'p', title: 'MẪU THỬ', body: 'Nội dung giả.', sectionId: 's', sectionTitle: 'MẪU THỬ' },
];

test('disabled or invalid input makes zero fetch calls', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    throw Error('unexpected');
  };
  await assert.rejects(createBoardAssistantRequest({ fetcher })('khí', catalog));
  const request = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/assistant/chat',
    fetcher,
  });
  await assert.rejects(request('012345678901', catalog));
  assert.equal(calls, 0);
});

test('one successful call omits credentials, does not persist history and validates source text', async () => {
  let calls = 0;
  const request = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/assistant/chat',
    fetcher: async (_, options) => {
      calls++;
      assert.equal(options.credentials, 'omit');
      assert.equal(options.redirect, 'error');
      assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(), ['catalog', 'query']);
      assert.equal(new Headers(options.headers).has('Authorization'), false);
      return Response.json({ mode: 'ai', sources: [{ id: 'p', quote: 'Nội dung giả.' }] });
    },
  });
  assert.deepEqual(await request('MẪU', catalog), {
    mode: 'ai',
    sources: [{ id: 'p', quote: 'Nội dung giả.' }],
  });
  assert.equal(calls, 1);
});

test('upstream 429 has exactly one attempt and no implicit fallback', async () => {
  let calls = 0;
  const request = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/assistant/chat',
    fetcher: async () => {
      calls++;
      return new Response(null, { status: 429 });
    },
  });
  await assert.rejects(request('MẪU', catalog), /quota/);
  assert.equal(calls, 1);
});

test('oversized or fabricated responses are rejected without retries', async () => {
  for (const response of [
    new Response('x'.repeat(24001)),
    Response.json({ mode: 'ai', sources: [{ id: 'p', quote: 'invented' }] }),
  ]) {
    let calls = 0;
    const request = createBoardAssistantRequest({
      enabled: true,
      endpoint: '/assistant/chat',
      fetcher: async () => {
        calls++;
        return response;
      },
    });
    await assert.rejects(request('MẪU', catalog));
    assert.equal(calls, 1);
  }
});

test('caller cancellation reaches the single underlying fetch and rejects', async () => {
  let signal;
  const request = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/assistant/chat',
    fetcher: async (_, options) => {
      signal = options.signal;
      return new Promise((_, reject) =>
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Cancelled', 'AbortError')),
          { once: true },
        ),
      );
    },
  });
  const controller = new AbortController();
  const pending = request('MẪU', catalog, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(signal.aborted, true);
});
