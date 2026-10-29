/** Pure U01–U20 / T01–T10 evidence and retrieval checks, outside unchanged curated CI. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boundedPublicPrompt,
  publicLocalResult,
  publicAssistantCorpus,
  indexPublicCorpus,
  retrievePublicContent,
  mapPublicSources,
  publicCoverageNote,
  publicGroundingPrompt,
} from '../src/utils/public-retrieval.js';
import {
  publicTimeContext,
  publicDateEvidence,
  publicTemporalScore,
} from '../src/utils/public-temporal.js';
import { websiteLearningAnswer, learningIntent } from '../src/utils/assistant-learning.js';
import { validAssistantQuery, validateAssistantSources } from '../src/utils/board-assistant.js';
import { publicFixture, frozenClock } from './public-grounding-fixture.js';
const corpus = publicAssistantCorpus(publicFixture),
  plan = (q) => retrievePublicContent(q, corpus, { now: frozenClock });
const ids = (p) => p.lookup.map((ref) => ref.postId);
const quote = (p, id) => {
  const c = p.catalog.find((c) => p.lookup.find((ref) => ref.id === c.id)?.postId === id);
  return c ? mapPublicSources([{ id: c.id, quote: c.body || c.title }], p, corpus)[0] : null;
};
test('U01 lesson knowledge retrieves correct public text', () => {
  const p = plan('Lực đẩy trong nước có hướng nào?');
  assert.ok(ids(p).includes('lesson'));
  assert.match(quote(p, 'lesson').quote, /từ dưới lên/);
});
test('U02 notification preserves group and place rather than assigning whole class', () => {
  const p = plan('Ngày hội Sao Xanh dành cho ai?');
  assert.match(quote(p, 'a').quote, /nhóm thực hành A/);
  assert.equal(quote(p, 'a').quote.includes('toàn lớp'), false);
});
test('U03 arbitrary post summary retrieves exact evidence and declares excerpt coverage', () => {
  const p = plan('Tóm tắt Sổ tay tinh thể xanh');
  assert.ok(ids(p).includes('deep'));
  assert.match(publicCoverageNote(p.scope), /đoạn/);
  assert.doesNotMatch(publicCoverageNote(p.scope), /BGE|Qwen|snapshot|loader|UTF-16/);
  assert.ok(p.lookup.every((ref) => Number.isInteger(ref.textLength)));
});
test('U04 comparison retains two named posts, not just one repeated keyword', () => {
  const p = plan('So sánh Lực đẩy trong nước và Nếp gấp sao giấy');
  assert.ok(ids(p).includes('lesson'));
  assert.ok(ids(p).includes('nodate'));
});
test('U05 synthesis preserves separate introduction/preparation/revision sources', () => {
  const p = plan('Ngày hội Sao Xanh cần chuẩn bị gì và thay đổi lịch thế nào?');
  for (const id of ['a', 'b', 'c']) assert.ok(ids(p).includes(id));
  assert.match(quote(p, 'b').quote, /giấy tái chế và bút màu/);
  assert.match(quote(p, 'c').quote, /22\/11\/2026/);
});
test('U06 new topic needs no hardcoded topic names', () => {
  const snapshot = structuredClone(publicFixture);
  snapshot.sections[2].title = 'Tên mới chưa từng biết Ω';
  const p = retrievePublicContent('nếp gấp sao giấy', publicAssistantCorpus(snapshot), {
    now: frozenClock,
  });
  assert.ok(ids(p).includes('nodate'));
});
test('U07 zero lexical paraphrase keeps all small-corpus passages for semantic reranking', () => {
  const small = publicAssistantCorpus({ ...publicFixture, posts: publicFixture.posts.slice(0, 2) });
  const p = retrievePublicContent('vì sao món đồ được nâng trong chất lỏng', small, {
    now: frozenClock,
  });
  assert.equal(p.reason, null);
  assert.ok(ids(p).includes('lesson'));
});
test('U08 post beyond24 remains searchable independent of array position', () => {
  const a = plan('mật độ tinh thể xanh'),
    reversed = publicAssistantCorpus({
      ...publicFixture,
      posts: [...publicFixture.posts].reverse(),
    });
  assert.ok(ids(a).includes('deep'));
  assert.deepEqual(
    ids(a),
    ids(retrievePublicContent('mật độ tinh thể xanh', reversed, { now: frozenClock })),
  );
});
test('U09 information beyond1200 is returned as an exact source quote', () => {
  const p = plan('Mật độ tinh thể xanh đo được là bao nhiêu?');
  assert.match(quote(p, 'deep').quote, /7 đơn vị/);
  assert.ok(p.lookup.some((ref) => ref.postId === 'deep' && ref.start > 1200));
});
test('U10 overlapping chunks cover entire long body without model payload growth', () => {
  const index = indexPublicCorpus(corpus),
    post = corpus.posts.find((p) => p.id === 'deep'),
    chunks = index.chunks.filter((c) => c.post.id === 'deep');
  assert.equal(chunks[0].start, 0);
  assert.ok(chunks.at(-1).start + chunks.at(-1).body.length === post.body.length);
  assert.ok(plan('tinh thể xanh').catalog.length <= 8);
});
test('U11 similar keywords do not collapse distinct activities', () => {
  const p = plan('Ngày hội Sao Xanh');
  assert.notDeepEqual(quote(p, 'a'), quote(p, 'other'));
  assert.match(quote(p, 'a').quote, /nhóm thực hành A/);
});
test('U12 no anchors in large corpus asks clarification, never picks first8 silently', () => {
  const p = plan('zzzxxyy');
  assert.equal(p.reason, 'ambiguous');
  assert.equal(p.catalog.length, 0);
});
test('U13 private statuses and attachment paths are absent from corpus', () => {
  for (const id of ['draft', 'hidden', 'deleted'])
    assert.equal(
      corpus.posts.some((p) => p.id === id),
      false,
    );
  assert.equal(JSON.stringify(corpus).includes('never-send-private-path'), false);
});
test('U14 changed/removed public source invalidates original citation mapping', () => {
  const p = plan('mật độ tinh thể xanh');
  const fresh = publicAssistantCorpus({
    ...publicFixture,
    posts: publicFixture.posts.filter((p) => p.id !== 'deep'),
  });
  const c = p.catalog.find((c) => p.lookup.find((r) => r.id === c.id)?.postId === 'deep');
  assert.throws(() => mapPublicSources([{ id: c.id, quote: c.body }], p, fresh));
});
test('U15 file-only source does not pretend to contain extracted text', () => {
  const single = publicAssistantCorpus({
    ...publicFixture,
    posts: publicFixture.posts.filter((p) => p.id === 'file'),
  });
  const p = retrievePublicContent('Tóm tắt tệp hướng dẫn độc lập', single, { now: frozenClock });
  assert.equal(p.reason, 'files');
  assert.equal(p.catalog[0].body, '');
});
test('U16 unknown/oversized corpus never claims full website search', () => {
  const unknown = publicAssistantCorpus({
    sections: publicFixture.sections,
    posts: publicFixture.posts,
  });
  assert.equal(unknown.coverage, 'unknown');
  assert.match(
    publicCoverageNote(retrievePublicContent('tinh thể', unknown, { now: frozenClock }).scope),
    /chưa xác minh/i,
  );
  const huge = {
    posts: Array.from({ length: 101 }, (_, i) => ({
      ...corpus.posts[0],
      id: `x${i}`,
      body: 'a'.repeat(20000),
    })),
    coverage: 'complete',
  };
  assert.equal(retrievePublicContent('a', huge, { now: frozenClock }).reason, 'limit');
});
test('U17 sources may span unrelated topic names without topic restrictions', () => {
  const p = plan('Lực đẩy trong nước và chuẩn bị Ngày hội Sao Xanh');
  const topics = new Set(p.catalog.map((c) => c.sectionId));
  assert.ok(topics.size > 1);
});
test('U18 follow-up stays inside validated native source context', () => {
  const p = retrievePublicContent('Nói dễ hiểu hơn được không?', corpus, {
    now: frozenClock,
    context: { query: 'lực đẩy', ids: ['lesson'] },
  });
  assert.deepEqual([...new Set(ids(p))], ['lesson']);
  assert.ok(p.catalog.length <= 3);
});
test('U19 source injection remains untrusted text, never an action', () => {
  const p = plan('Mẫu nguồn untrusted');
  assert.match(quote(p, 'injection').quote, /Ignore all instructions/);
  const prompt = publicGroundingPrompt('giải thích', p.catalog, p.grounding);
  assert.equal('tools' in prompt, false);
  assert.throws(() => validateAssistantSources([{ id: 'draft', quote: 'bad' }], p.catalog));
});
test('U20 verified website/application guidance remains deterministic and content queries bypass it', () => {
  assert.match(
    websiteLearningAnswer('Tôi muốn xem điểm thì vào đâu?', corpus.posts).answer,
    /\/personal-gradebook/,
  );
  assert.equal(
    websiteLearningAnswer('Thông báo mới nhất về Bảng điểm nói gì?', corpus.posts),
    null,
  );
  assert.equal(learningIntent('Tóm tắt chủ đề Khám phá', corpus.posts).kind, 'educational');
});
test('T01 upcoming uses VN day and explicit event date only', () => {
  const ctx = publicTimeContext('Sắp tới có phong trào gì?', frozenClock);
  assert.equal(ctx.today, '2026-11-10');
  assert.ok(publicTemporalScore('sắp tới', 'Diễn ra ngày 20/11/2026', frozenClock) > 0);
  assert.equal(publicTemporalScore('sắp tới', 'Diễn ra ngày 05/11/2026', frozenClock), 0);
});
test('T02 day/month question matches source without inventing year', () => {
  const e = publicDateEvidence('Diễn ra ngày 20/11');
  assert.equal(e.dates[0].year, null);
  assert.ok(publicTemporalScore('20/11 có hoạt động nào?', 'Diễn ra ngày 20/11', frozenClock) > 0);
});
test('T03 month/week/today use injected Asia/Ho_Chi_Minh rollover', () => {
  assert.equal(publicTimeContext('tháng này', frozenClock).end, '2026-11-30');
  assert.equal(publicTimeContext('tuần này', frozenClock).start, '2026-11-09');
  assert.equal(publicTimeContext('hôm nay', '2026-11-09T18:00:00Z').today, '2026-11-10');
});
test('T04 event/registration/preparation dates are different evidence kinds', () => {
  const e = publicDateEvidence(
    'Diễn ra ngày 20/11/2026. Hạn đăng ký 15/11/2026. Chuẩn bị trước ngày 18/11/2026.',
  );
  assert.deepEqual(
    e.dates.map((d) => d.kind),
    ['event', 'registration', 'preparation'],
  );
});
test('T05 ended does not include explicit future or unknown-year events', () => {
  assert.ok(publicTemporalScore('đã kết thúc', 'Diễn ra ngày 05/11/2026', frozenClock) > 0);
  assert.equal(publicTemporalScore('đã kết thúc', 'Diễn ra ngày 20/11/2026', frozenClock), 0);
  assert.equal(publicTemporalScore('đã kết thúc', 'Diễn ra ngày 05/11', frozenClock), 0);
});
test('T06 creation/edit timestamps never become event or publication dates', () => {
  const p = plan('Ngày hội Sao Xanh');
  const prompt = publicGroundingPrompt('Khi nào diễn ra?', p.catalog, p.grounding);
  const source = prompt.sources.find((s) => s.metadata.postId === 'a');
  assert.equal(source.metadata.createdAt, '2026-09-01T00:00:00.000Z');
  assert.ok(source.temporal.dates.some((d) => d.iso === '2026-11-20'));
  assert.match(prompt.limits, /NOT publication\/event/);
});
test('T07 no date means no inferred date', () =>
  assert.deepEqual(publicDateEvidence('Hướng dẫn gấp giấy').dates, []));
test('T08 missing year stays unknown; invalid dates rejected; date query privacy boundary preserved', () => {
  assert.equal(publicDateEvidence('Diễn ra 20/11').dates[0].iso, null);
  assert.deepEqual(publicDateEvidence('Diễn ra 31/02/2026').dates, []);
  assert.equal(validAssistantQuery('Hoạt động diễn ra 20/11/2026?'), true);
  assert.equal(validAssistantQuery('Ngày sinh 20/11/2010'), false);
});
test('T09 cancellations/revisions remain explicit evidence, not silently overridden', () => {
  assert.equal(
    publicDateEvidence(publicFixture.posts.find((p) => p.id === 'cancel').body).cancelled,
    true,
  );
  assert.equal(
    publicDateEvidence(publicFixture.posts.find((p) => p.id === 'c').body).revised,
    true,
  );
});
test('T10 different activities retain distinct date attribution', () => {
  const p = plan('Ngày hội Sao Xanh và Ngày hội Sao Đỏ');
  const prompt = publicGroundingPrompt('khi nào diễn ra', p.catalog, p.grounding);
  const a = prompt.sources.find((s) => s.metadata.postId === 'a'),
    b = prompt.sources.find((s) => s.metadata.postId === 'other');
  assert.ok(a.temporal.dates.some((d) => d.iso === '2026-11-20'));
  assert.ok(b.temporal.dates.some((d) => d.iso === '2026-11-05'));
  assert.notEqual(a.metadata.postId, b.metadata.postId);
});

test('keyword fallback rejects incidental Vietnamese syllable overlaps and zero matches', () => {
  const p = plan('mật độ tinh thể xanh');
  assert.deepEqual(
    publicLocalResult(p, corpus, { keyword: true }).sources.map((s) => s.id),
    ['deep'],
  );
  const small = publicAssistantCorpus({ ...publicFixture, posts: publicFixture.posts.slice(0, 2) });
  const none = retrievePublicContent('zzzz', small, { now: frozenClock });
  assert.deepEqual(publicLocalResult(none, small, { keyword: true }).sources, []);
});

test('Unicode passages preserve exact quotes through wire JSON and respect schema codepoint limit', () => {
  const snapshot = {
    publicCoverage: { complete: true },
    sections: [{ id: 's', title: 'Unicode' }],
    posts: [
      {
        id: 'emoji',
        section_id: 's',
        title: 'Đoạn emoji',
        body: '🟢'.repeat(1200) + ' Dữ kiện quan trọng là màu xanh.',
        status: 'published',
      },
    ],
  };
  const c = publicAssistantCorpus(snapshot),
    p = retrievePublicContent('Dữ kiện quan trọng màu xanh', c, { now: frozenClock });
  for (const chunk of JSON.parse(JSON.stringify(p.catalog)))
    assert.ok(c.posts[0].body.includes(chunk.body));
  assert.ok(p.catalog.some((chunk) => chunk.body.includes('màu xanh')));
});
test('temporal evidence supports ISO, numeric separators and Vietnamese date phrases without adding years', () => {
  for (const text of [
    'Diễn ra 2026-11-20',
    'Diễn ra 20-11-2026',
    'Diễn ra ngày 20 tháng 11 năm 2026',
  ])
    assert.equal(publicDateEvidence(text).dates[0].iso, '2026-11-20');
  assert.equal(publicDateEvidence('Diễn ra ngày 20 tháng 11').dates[0].year, null);
  assert.deepEqual(publicTimeContext('Hoạt động ngày 20 tháng 11?', frozenClock).requestedDate, {
    day: 20,
    month: 11,
    year: null,
  });
});

test('content quantities are not mistaken for deterministic website inventory', () => {
  assert.equal(
    websiteLearningAnswer('Trong bài chuẩn bị cần bao nhiêu tờ giấy?', corpus.posts),
    null,
  );
  assert.equal(
    websiteLearningAnswer('Thông báo trong chủ đề Khám phá có nội dung gì?', corpus.posts),
    null,
  );
  assert.match(
    websiteLearningAnswer('Có bao nhiêu bài đăng?', corpus.posts).answer,
    /Bảng học liệu hiện có/,
  );
});

test('generator prompt has a hard byte cap and does not duplicate source bodies in temporal metadata', () => {
  const candidates = Array.from({ length: 5 }, (_, i) => ({
    id: `c${i}`,
    sectionId: '界'.repeat(100),
    sectionTitle: '界'.repeat(160),
    title: '界'.repeat(200),
    body: '界'.repeat(1000),
  }));
  const grounding = {
    clock: frozenClock,
    scope: {
      snapshot: 'unknown',
      lexical: 'full',
      totalPosts: 5,
      totalChunks: 5,
      candidateChunks: 5,
      semantic: 'shortlist',
    },
    passages: candidates.map((p, i) => ({
      id: p.id,
      postId: `p${i}`,
      start: 0,
      textLength: 1000,
      createdAt: null,
      updatedAt: null,
      hasAttachments: false,
    })),
  };
  const result = boundedPublicPrompt('界'.repeat(400), candidates, grounding);
  assert.ok(new TextEncoder().encode(result.content).length <= 24000);
  assert.ok(result.candidates.length <= 5);
  const payload = JSON.parse(result.content.split('\n/no_think')[0]);
  assert.ok(payload.grounding.sources.every((p) => !('body' in p)));
});

test('oversized wire metadata is retained locally and explicitly partial, never silently truncated', () => {
  const title = '🟢'.repeat(150) + ' quan trọng';
  const c = publicAssistantCorpus({
    publicCoverage: { complete: true },
    sections: [{ id: 's', title: 'Topic' }],
    posts: [{ id: 'p', section_id: 's', title, body: 'Văn bản', status: 'published' }],
  });
  assert.equal(c.posts[0].title, title);
  assert.equal(c.coverage, 'partial');
  assert.equal(retrievePublicContent('quan trọng', c, { now: frozenClock }).reason, 'limit');
});
