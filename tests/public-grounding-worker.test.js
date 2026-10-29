/** Explicit V3 transport/Worker integration with scripted model bindings; external HTTP is forbidden. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoardAssistantRequest } from '../src/services/board-assistant.js';
import { assistantFetch } from '../workers/board-assistant/index.js';
import { publicAssistantCorpus, retrievePublicContent } from '../src/utils/public-retrieval.js';
import { publicFixture, frozenClock } from './public-grounding-fixture.js';
const corpus = publicAssistantCorpus(publicFixture);
globalThis.location = { origin: 'http://localhost:4173' };
function harness({ answer, postIds = ['deep'], fail = false, semantic = false } = {}) {
  const calls = [],
    budget = [],
    wires = [];
  const env = {
    AI_ENABLED: 'true',
    PREVIEW_EXPIRES: new Date(Date.now() + 60000).toISOString(),
    BUDGET: {
      idFromName: (x) => x,
      get: () => ({
        fetch: async (u) => {
          budget.push(u);
          return new Response(null, { status: 204 });
        },
      }),
    },
    AI: {
      run: async (model, input) => {
        calls.push({ model, input });
        if (fail) throw Error('synthetic failure');
        if (model.includes('bge'))
          return {
            data: input.text.map((t, i) =>
              i === 0 ? [1, 0] : semantic && t.includes('từ dưới lên') ? [1, 0] : [0.9, 0.1],
            ),
          };
        const message = JSON.parse(input.messages[1].content.split('\n/no_think')[0]);
        const selected = message.sources
          .map((source) => ({
            ...source,
            metadata: message.grounding.sources.find((ref) => ref.id === source.id).metadata,
          }))
          .filter((s) => postIds.includes(s.metadata.postId))
          .slice(0, 3);
        const value = selected.length
          ? {
              status: 'answered',
              answer: answer || selected[0].body,
              ids: selected.map((p) => p.id),
              coverage: 'provided_text',
            }
          : { status: 'insufficient', answer: '', ids: [], coverage: 'insufficient' };
        return { response: JSON.stringify(value) };
      },
    },
  };
  const send = createBoardAssistantRequest({
    enabled: true,
    endpoint: '/chat',
    fetcher: async (url, o) => {
      const body = JSON.parse(o.body);
      wires.push(body);
      const headers = new Headers(o.headers);
      headers.set('Origin', location.origin);
      return assistantFetch(new Request(url, { ...o, headers }), env);
    },
  });
  return { send, calls, budget, wires, env };
}
const options = { version: 3, snapshotCoverage: 'complete', now: frozenClock };
test('U08/U09 V3 full pipeline cites native post beyond24 and quote beyond1200 with bounded model payload', async () => {
  const h = harness({ answer: 'Mật độ tinh thể xanh đo được là 7 đơn vị.' });
  const r = await h.send('Mật độ tinh thể xanh đo được là bao nhiêu?', corpus.posts, options);
  assert.equal(r.sources[0].id, 'deep');
  assert.match(r.sources[0].quote, /7 đơn vị/);
  assert.equal(r.answer, 'Mật độ tinh thể xanh đo được là 7 đơn vị.');
  assert.ok(r.evidence[0].start > 1200);
  assert.equal(h.calls.length, 2);
  assert.equal(h.wires[0].version, 3);
  assert.ok(h.wires[0].catalog.length <= 8);
  assert.ok(new TextEncoder().encode(JSON.stringify(h.wires[0])).length <= 64000);
  assert.equal(JSON.stringify(h.wires).includes('never-send-private-path'), false);
});
test('U07 fake semantic ranking retains paraphrase answer without lexical identity; not live semantic proof', async () => {
  const h = harness({
    postIds: ['lesson'],
    semantic: true,
    answer: 'Lực đẩy trong nước hướng từ dưới lên.',
  });
  const small = publicAssistantCorpus({ ...publicFixture, posts: publicFixture.posts.slice(0, 2) });
  const r = await h.send('Vì sao món đồ được nâng trong chất lỏng?', small.posts, options);
  assert.equal(r.sources[0].id, 'lesson');
  assert.match(r.answer, /từ dưới lên/);
  assert.match(h.calls[0].model, /bge/);
});
test('U04/U05 synthesis cites distinct sources and preserves preparation and revised schedule facts', async () => {
  const h = harness({
    postIds: ['b', 'c'],
    answer:
      'Nhóm A cần giấy tái chế và bút màu. Lịch Ngày hội Sao Xanh đã thay đổi sang 22/11/2026.',
  });
  const r = await h.send(
    'Ngày hội Sao Xanh cần chuẩn bị gì và thay đổi lịch thế nào?',
    corpus.posts,
    options,
  );
  assert.deepEqual(new Set(r.sources.map((s) => s.id)), new Set(['b', 'c']));
  assert.match(r.answer, /giấy tái chế và bút màu/);
  assert.match(r.answer, /thay đổi sang 22\/11\/2026/);
});
test('U18 follow-up uses only previous source IDs, one Qwen and no embedding', async () => {
  const h = harness({ postIds: ['lesson'], answer: 'Lực đẩy hướng từ dưới lên.' });
  const r = await h.send('Nói dễ hiểu hơn được không?', corpus.posts, {
    ...options,
    context: { query: 'Lực đẩy trong nước', ids: ['lesson'] },
  });
  assert.deepEqual(
    r.sources.map((s) => s.id),
    ['lesson'],
  );
  assert.equal(h.calls.length, 1);
  assert.match(h.calls[0].model, /qwen/);
  assert.equal(h.wires[0].context.query, 'Lực đẩy trong nước');
});
test('U12/U15/U16 ambiguous, file-only and partial snapshots do not pretend complete AI processing', async () => {
  const h = harness();
  const r = await h.send('zzzxxyy', corpus.posts, options);
  assert.equal(r.status, 'insufficient');
  assert.match(r.answer, /làm rõ|nêu thêm/);
  assert.equal(h.calls.length, 0);
  const files = corpus.posts.filter((p) => p.id === 'file');
  const f = await h.send('Tóm tắt Tệp hướng dẫn độc lập', files, options);
  assert.match(f.answer, /chưa đọc PDF/);
  assert.equal(h.calls.length, 0);
  const u = harness({ postIds: ['lesson'], answer: 'Lực đẩy hướng từ dưới lên.' });
  const unknown = await u.send('Lực đẩy trong nước', corpus.posts, {
    ...options,
    snapshotCoverage: 'unknown',
  });
  assert.match(unknown.note, /chưa xác minh/);
});
test('T06/T08 valid citations cannot justify invented date/year or using creation time as event', async () => {
  for (const [id, answer] of [
    ['yearless', 'Buổi gặp mặt diễn ra ngày 20/11/2026.'],
    ['a', 'Ngày hội diễn ra ngày 01/09/2026.'],
    ['deep', 'Mật độ tinh thể là 999 đơn vị.'],
  ]) {
    const h = harness({ postIds: [id], answer });
    await assert.rejects(
      h.send(
        id === 'deep'
          ? 'mật độ tinh thể xanh'
          : id === 'a'
            ? 'Ngày hội Sao Xanh'
            : 'Gặp mặt chưa rõ năm',
        corpus.posts,
        options,
      ),
    );
    assert.equal(h.budget.at(-1), 'https://budget/stop');
    assert.equal(h.calls.length, 2);
  }
});
test('T01/T09 cannot call unknown-year or cancelled event upcoming without acknowledging uncertainty', async () => {
  const h = harness({ postIds: ['yearless'], answer: 'Sắp tới diễn ra buổi gặp mặt ngày 20/11.' });
  await assert.rejects(h.send('Sắp tới có gặp mặt gì?', corpus.posts, options));
  const c = harness({
    postIds: ['cancel'],
    answer: 'Chuyến tham quan sẽ diễn ra ngày 25/11/2026.',
  });
  await assert.rejects(c.send('Chuyến tham quan mô phỏng khi nào?', corpus.posts, options));
  const safe = harness({
    postIds: ['cancel'],
    answer: 'Chuyến tham quan đã bị hủy; lịch cũ ngày 25/11/2026 không còn hiệu lực.',
  });
  const r = await safe.send('Chuyến tham quan mô phỏng khi nào?', corpus.posts, options);
  assert.match(r.answer, /bị hủy/);
});
test('T04 deadline cannot be relabelled as event time', async () => {
  const h = harness({ postIds: ['a'], answer: 'Ngày hội diễn ra ngày 15/11/2026.' });
  await assert.rejects(h.send('Ngày hội Sao Xanh khi nào diễn ra?', corpus.posts, options));
});
test('typed creation timestamp is allowed as creation, never inferred publication', async () => {
  const h = harness({ postIds: ['a'], answer: 'Bài được tạo ngày 01/09/2026.' });
  const r = await h.send('Ngày hội Sao Xanh được tạo khi nào?', corpus.posts, options);
  assert.match(r.answer, /được tạo/);
});
test('V3 malformed metadata rejects before admission, no raw private fields or unsupported citations pass', async () => {
  const h = harness();
  const p = retrievePublicContent('tinh thể xanh', corpus, { now: frozenClock });
  const bad = {
    ...p.grounding,
    passages: p.grounding.passages.map((r, i) => (i === 0 ? { ...r, secret: 'no' } : r)),
  };
  const req = new Request('https://worker.test/chat', {
    method: 'POST',
    headers: { Origin: location.origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: 3,
      query: 'tinh thể xanh',
      catalog: p.catalog,
      context: null,
      grounding: bad,
    }),
  });
  assert.equal((await assistantFetch(req, h.env)).status, 422);
  assert.equal(h.calls.length, 0);
  assert.equal(h.budget.length, 0);
  await assert.rejects(h.send('x', [{ ...corpus.posts[0], secret: 'no' }], options));
});
test('V3 abort and model failure never retry or issue extra calls', async () => {
  const h = harness({ fail: true });
  await assert.rejects(h.send('mật độ tinh thể xanh', corpus.posts, options));
  assert.equal(h.calls.length, 1);
  assert.equal(h.budget.at(-1), 'https://budget/stop');
  const controller = new AbortController();
  controller.abort();
  const pre = harness();
  await assert.rejects(
    pre.send('mật độ tinh thể xanh', corpus.posts, { ...options, signal: controller.signal }),
  );
  assert.equal(pre.wires.length, 0);
});

test('past start date cannot prove ended, latest cannot claim unbounded website scope', async () => {
  const h = harness({ postIds: ['other'], answer: 'Ngày hội Sao Đỏ đã kết thúc.' });
  await assert.rejects(h.send('Ngày hội Sao Đỏ đã kết thúc chưa?', corpus.posts, options));
  const l = harness({ postIds: ['a'], answer: 'Ngày hội Sao Xanh là thông báo mới nhất.' });
  await assert.rejects(l.send('Thông báo mới nhất về Ngày hội Sao Xanh?', corpus.posts, options));
});

test('comparison answer keeps the distinct supported facts of two arbitrary posts', async () => {
  const h = harness({
    postIds: ['lesson', 'nodate'],
    answer: 'Bài lực đẩy nói hướng từ dưới lên; bài sao giấy hướng dẫn gấp mép theo đường chéo.',
  });
  const r = await h.send('So sánh Lực đẩy trong nước và Nếp gấp sao giấy', corpus.posts, options);
  assert.deepEqual(new Set(r.sources.map((s) => s.id)), new Set(['lesson', 'nodate']));
  assert.match(r.answer, /từ dưới lên/);
  assert.match(r.answer, /đường chéo/);
  assert.equal(r.answer.includes('nhóm B'), false);
});
test('semantic abstention in small corpus has no fabricated source, revoked follow-up never fetches', async () => {
  const small = publicAssistantCorpus({ ...publicFixture, posts: publicFixture.posts.slice(0, 2) }),
    h = harness({ postIds: [] });
  const r = await h.send('một nội dung hoàn toàn chưa rõ', small.posts, options);
  assert.equal(r.status, 'insufficient');
  assert.deepEqual(r.sources, []);
  const revoked = harness();
  await assert.rejects(
    revoked.send(
      'giải thích tiếp',
      corpus.posts.filter((p) => p.id !== 'deep'),
      { ...options, context: { query: 'tinh thể', ids: ['deep'] } },
    ),
  );
  assert.equal(revoked.wires.length, 0);
});
