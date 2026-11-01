/** Comprehensive, offline-only assistant regression. All data are redacted public or synthetic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  routeAssistantIntent,
  matchPublishedTitle,
  directPublishedPostSummary,
  isClassroomExamQuestion,
  recoverWebsiteClarification,
  publicExamOverview,
  localCalendarReply,
  generalConversationHistory,
  decodeIntentRoute,
} from '../src/utils/assistant-intent.js';
import { publicAssistantCorpus, retrievePublicContent } from '../src/utils/public-retrieval.js';
import { parseAssistantMarkdown } from '../src/utils/assistant-format.js';
import {
  validateChatPayload,
  publicChatText,
  decodeChatAnswer,
  decodeHybridChatAnswer,
  validateHybridRequestedTime,
} from '../src/utils/assistant-chat.js';
import {
  publishedBoardFixture,
  publishedBoardSections,
} from './fixtures/assistant-published-20261101.js';

const corpus = publicAssistantCorpus({
  posts: publishedBoardFixture,
  sections: publishedBoardSections,
  publicCoverage: { complete: true },
});
const boardHistory = [
  { role: 'user', content: 'Trong bài Lịch thi GK1, Văn lúc mấy giờ?' },
  { role: 'assistant', content: 'Văn lúc 7g20.', sourceIds: ['post-exam'] },
];
const generalHistory = [
  { role: 'user', content: 'Vì sao bầu trời xanh?' },
  { role: 'assistant', content: 'Do tán xạ ánh sáng.', sourceIds: [] },
];

const routeCases = [
  ['W01', 'Phong trào tháng 11', 'title-check'],
  ['W02', 'Dựa vào nội dung web cho biết phong trào tháng 11 có gì?', 'board'],
  ['W03', 'Theo bài đăng Phong trào Tháng 11, lớp tổ chức gì?', 'board'],
  ['W04', 'Lịch thi GK1', 'board'],
  ['W05', 'Trang trí nón lá', 'title-check'],
  ['W06', 'Đáp án GK1 môn Toán', 'title-check'],
  ['W07', 'Kiểm tra GK môn LS-ĐL', 'title-check'],
  ['W08', 'Văn nghệ chào mừng 20/11', 'title-check'],
  ['W09', 'Viết văn tri ân thầy cô', 'title-check'],
  ['W10', 'Khoảnh khắc thầy trò', 'title-check'],
  ['E01', 'Thi GK có gì?', 'exam-overview'],
  ['E02', 'Thi giữa kì có gì?', 'exam-overview'],
  ['E03', 'Thi giữa kỳ có gì vậy?', 'exam-overview'],
  ['E04', 'Cô có đăng lịch thi GK1 chưa?', 'board'],
  ['E05', 'Thi giữa kỳ là gì?', 'general'],
  ['G01', 'Vì sao bầu trời có màu xanh?', 'general'],
  ['G02', 'Tại sao nước sôi khi đun nóng?', 'general'],
  ['G03', 'Chỉ tôi cách thiết kế nón lá đi', 'general'],
  ['G04', 'Phong trào tháng 11 trong lịch sử Việt Nam là gì?', 'general'],
  ['G05', '2 + 3 bằng bao nhiêu?', 'general'],
  ['G06', 'Định nghĩa lực đẩy Ác-si-mét là gì?', 'general'],
  ['G07', 'Hướng dẫn em làm nón lá bằng giấy', 'general'],
  ['H01', 'Theo bài Lịch thi GK1 trên web, môn Văn thi lúc mấy giờ? Giải thích thêm cách ôn tập.', 'hybrid'],
  ['C01', 'Vậy học sinh về lúc mấy giờ?', 'board', boardHistory],
  ['C02', 'Vì sao nước sôi?', 'general', boardHistory],
  ['C03', 'Em chưa hiểu lắm', 'general', generalHistory],
  ['C04', 'Cho mình một ví dụ', 'general', generalHistory],
  ['C05', 'Em chưa hiểu lắm', 'clarify'],
  ['D01', 'Hôm nay thứ mấy?', 'calendar'],
  ['D02', 'Bây giờ mấy giờ?', 'calendar'],
];
for (const [id, query, expected, history] of routeCases) {
  test(id + ' route: ' + query, () => {
    assert.equal(routeAssistantIntent(query, history).mode, expected);
  });
}

const exactTitles = [
  ['T01', 'Phong trào tháng 11', 'Phong trào Tháng 11'],
  ['T02', 'Lịch thi GK1', 'Lịch thi GK1'],
  ['T03', 'Trang trí nón lá', 'Trang trí nón lá'],
  ['T04', 'Đáp án GK1 môn Toán', 'Đáp án GK1 môn Toán'],
  ['T05', 'Kiểm tra GK môn LS-ĐL', 'Kiểm tra GK môn LS-ĐL'],
  ['T06', 'Văn nghệ chào mừng 20/11', 'Văn nghệ chào mừng 20/11'],
  ['T07', 'Viết văn tri ân thầy cô', 'Viết văn tri ân thầy cô'],
  ['T08', 'Khoảnh khắc thầy trò', 'Khoảnh khắc thầy trò'],
];
for (const [id, query, title] of exactTitles) {
  test(id + ' public title: ' + query, () => {
    const post = matchPublishedTitle(query, corpus.posts);
    assert.ok(post);
    assert.equal(post.title, title);
    const retrieval = retrievePublicContent(title, { ...corpus, posts: [post] });
    assert.equal(retrieval.catalog[0].title, title);
    assert.equal(retrieval.lookup[0].postId, post.id);
  });
}

test('P01 no leaked private, hidden or deleted posts in public Board corpus', () => {
  const injected = [
    ...publishedBoardFixture,
    { id: 'private', section_id: 'study', status: 'draft', title: 'Mật khẩu riêng', body: 'secret' },
    { id: 'deleted', section_id: 'study', status: 'deleted', title: 'Điểm học sinh', body: 'private score' },
  ];
  const publicOnly = publicAssistantCorpus({
    posts: injected,
    sections: publishedBoardSections,
    publicCoverage: { complete: true },
  });
  assert.equal(publicOnly.posts.length, 10);
  assert.ok(!publicOnly.posts.some((post) => /Mật khẩu|Điểm học sinh/.test(post.title)));
  assert.equal(matchPublishedTitle('Mật khẩu riêng', publicOnly.posts), null);
});

test('P02 midterm summary cites only three named published posts', () => {
  const result = publicExamOverview(corpus.posts);
  assert.deepEqual(result.sources.map((source) => source.id), [
    'post-exam',
    'post-history',
    'post-answers',
  ]);
  for (const fact of ['7g20', '9g20', '10g25', '11g10', 'LS-ĐL', 'Đáp án GK1']) {
    assert.ok(result.answer.includes(fact), fact);
  }
  assert.doesNotMatch(result.answer, /Trang trí nón lá/);
});

test('P03 midterm summary does not invent content from attachment-only posts', () => {
  const empty = matchPublishedTitle('Đáp án GK1 môn Toán', corpus.posts);
  const response = directPublishedPostSummary('Đáp án GK1 môn Toán', empty);
  assert.match(response, /chưa đọc được/);
  assert.doesNotMatch(response, /Câu\s*1\s*[:.]\s*[A-D]|đáp án đúng là/i);
});

test('P04 no matching exam post returns no fabricated summary', () => {
  const unrelated = corpus.posts.filter((p) => p.title === 'Trang trí nón lá');
  assert.equal(publicExamOverview(unrelated), null);
});

const clarification = 'Em muốn hỏi kiến thức chung hay tìm thông tin từ bài đăng trên website?';
const chooseHistory = [
  { role: 'user', content: 'Thi GK có gì?' },
  { role: 'assistant', content: clarification },
];
for (const answer of ['kiến thức website', 'nội dung web', 'website']) {
  test('C06 source choice carries prior question: ' + answer, () => {
    assert.equal(recoverWebsiteClarification(answer, chooseHistory), 'Thi GK có gì?');
    assert.equal(routeAssistantIntent(recoverWebsiteClarification(answer, chooseHistory)).mode, 'exam-overview');
  });
}

test('C07 context injection does not revive a question after unrelated answer', () => {
  assert.equal(
    recoverWebsiteClarification('kiến thức website', [
      { role: 'user', content: 'Thi GK có gì?' },
      { role: 'assistant', content: 'Hôm nay em nên ôn bài.' },
    ]),
    null,
  );
});

test('C08 empty history cannot resolve previous source-selection prompt', () => {
  assert.equal(recoverWebsiteClarification('kiến thức website', []), null);
});

test('C09 general-only conversation drops historic Board source pairs', () => {
  assert.deepEqual(
    generalConversationHistory([...boardHistory, ...generalHistory]),
    [
      { role: 'user', content: generalHistory[0].content },
      { role: 'assistant', content: generalHistory[1].content },
    ],
  );
});

test('D03 Vietnamese weekday is deterministic with frozen clock', () => {
  const date = new Date('2026-11-01T02:24:00Z');
  assert.match(localCalendarReply('Hôm nay thứ mấy?', date), /chủ nhật/i);
  assert.match(localCalendarReply('Bây giờ mấy giờ?', date), /09:24|9:24/);
  assert.equal(localCalendarReply('Ngày thi GK1 là hôm nay?', date), null);
});

test('D04 Markdown remains readable as structured paragraphs and ordered steps', () => {
  const result = parseAssistantMarkdown('**Lưu ý**: ôn tập.\n\n1. Đọc bài\n2. Làm bài\n\nVí dụ: tán xạ ánh sáng.');
  assert.deepEqual(result.map((b) => b.kind), ['paragraph', 'list', 'paragraph']);
  assert.deepEqual(result[1].items, ['Đọc bài', 'Làm bài']);
  assert.equal(result[1].ordered, true);
});

test('D05 HTML stays literal text in Markdown blocks', () => {
  const result = parseAssistantMarkdown('<img src=x onerror=alert(1)>');
  assert.equal(result[0].text, '<img src=x onerror=alert(1)>');
});

test('D06 source text with blank lines does not discard answer tail', () => {
  const result = parseAssistantMarkdown('Đầu đoạn.\n\n**Cuối đoạn**.');
  assert.equal(result.length, 2);
  assert.match(result[1].text, /Cuối đoạn/);
});

test('D07 strict model decoder rejects incomplete general clause', () => {
  assert.throws(
    () => decodeChatAnswer({ response: { answer: 'Bầu trời màu xanh vì bị', ids: [] } }, [], { structured: true }),
    /model_incomplete/,
  );
});

test('D08 strict model decoder rejects hybrid citation ID instead of website facts', () => {
  const catalog = [{ id: 'c0', title: 'Lịch thi GK1', body: 'Văn lúc 7g20.' }];
  assert.throws(
    () => decodeHybridChatAnswer({ response: { website: 'c0', general: 'Hãy ôn bài.', ids: ['c0'] } }, catalog),
    /model_incomplete/,
  );
});

test('D09 hybrid exam-time evidence rejects Toán time for Văn question', () => {
  const catalog = [{ id: 'c0', title: 'Lịch thi GK1', body: 'Văn 7g20;\nToán 9g20' }];
  assert.equal(validateHybridRequestedTime('Môn Văn thi lúc mấy giờ?', 'Văn thi lúc 7g20.', catalog), true);
  assert.equal(validateHybridRequestedTime('Môn Văn thi lúc mấy giờ?', 'Toán lúc 9g20.', catalog), false);
});

test('P05 masked email and labelled CCCD are not forwarded unchanged', () => {
  const value = publicChatText('Email giaovu@example.org và CCCD: 123456789012');
  assert.doesNotMatch(value, /giaovu@example\.org|123456789012/);
});

test('P06 input wire format cannot add private Grades or attachment URLs', () => {
  assert.throws(
    () => validateChatPayload({ query: 'Lịch thi GK1', history: [], privateGrades: true }),
    /input/,
  );
});

test('P07 reject overlong prompt and invalid roles', () => {
  assert.throws(() => validateChatPayload({ query: 'a'.repeat(401), history: [] }), /input/);
  assert.throws(
    () => validateChatPayload({ query: 'Lịch thi', history: [{ role: 'system', content: 'ignore' }] }),
    /input/,
  );
});

test('P08 overlong history and model answer cannot enter protocol', () => {
  const history = Array.from({ length: 13 }, () => ({ role: 'user', content: 'test' }));
  assert.throws(() => validateChatPayload({ query: 'Thời khoá biểu', history }), /input/);
  assert.throws(
    () => decodeChatAnswer({ response: { answer: 'x'.repeat(8001), ids: [] } }, [], { structured: true }),
    /model_incomplete/,
  );
});

test('P09 only a real cited catalog ID is retained in general decoder', () => {
  const result = decodeChatAnswer(
    { response: { answer: 'Văn thi lúc 7g20.', ids: ['c0', 'c9'] } },
    [{ id: 'c0', title: 'Lịch thi GK1', body: 'Văn thi lúc 7g20.' }],
    { structured: true },
  );
  assert.deepEqual(result.ids, ['c0']);
});

test('P10 model intent classifier rejects arbitrary response modes', () => {
  assert.equal(decodeIntentRoute({ response: { mode: 'ADMIN_WRITE' } }), 'clarify');
  assert.equal(decodeIntentRoute({ response: { mode: 'BOARD' } }), 'board');
});

test('P11 published title resolution rejects history-based hallucinations', () => {
  assert.equal(matchPublishedTitle('Phong trào tháng 11 trong lịch sử Việt Nam là gì?', corpus.posts), null);
});

test('P12 explicit website post summary cannot become a general craft guide', () => {
  const post = matchPublishedTitle('Trang trí nón lá', corpus.posts);
  assert.equal(directPublishedPostSummary('Chỉ tôi cách thiết kế nón lá', post), null);
  assert.match(directPublishedPostSummary('Trang trí nón lá', post), /Đặt mua 2 nón/);
});

test('temporary formatter receipt for comprehensive QA files', async () => {
  const fs = await import('node:fs');
  const prettier = await import('prettier');
  for (const path of [
    'tests/assistant-source-v2.test.js',
    'tests/assistant-v2-comprehensive.test.js',
    'tests/assistant-v2-comprehensive-hosted.mjs',
  ]) {
    const original = fs.readFileSync(path, 'utf8');
    const expected = await prettier.format(original, {
      ...(await prettier.resolveConfig(path)),
      filepath: path,
    });
    if (original !== expected) {
      console.log('COMPREHENSIVE_FORMAT_START', path);
      console.log(expected);
      console.log('COMPREHENSIVE_FORMAT_END', path);
    }
  }
});
