/** Pure Vietnamese topic-routing tests; no hosted endpoint, backend or model binding. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeAssistantIntent, generalConversationHistory } from '../src/utils/assistant-intent.js';
import {
  decodeChatAnswer,
  decodeHybridChatAnswer,
  validateHybridRequestedTime,
} from '../src/utils/assistant-chat.js';

const boardHistory = [
  { role: 'user', content: 'Trong bài Lịch thi GK1, môn Văn thi lúc mấy giờ?' },
  { role: 'assistant', content: '7 giờ 20 phút.', sourceIds: ['published-1'] },
];
const generalHistory = [
  { role: 'user', content: 'Vì sao bầu trời xanh?' },
  { role: 'assistant', content: 'Do tán xạ ánh sáng.', sourceIds: [] },
];

test('science explanations route to general even when post topics share keywords', () => {
  for (const question of [
    'Tại sao bầu trời có màu xanh?',
    'Định nghĩa lực đẩy Ác-si-mét là gì?',
    'Giải thích hiện tượng cầu vồng',
    'Vì sao nước sôi?',
    'Tại sao bầu trời xanh?',
  ])
    assert.equal(routeAssistantIntent(question, boardHistory).mode, 'general', question);
});

test('ordinary step-by-step how-to is general, even beside a matching Board post', () => {
  for (const question of [
    'Chỉ tôi cách thiết kế nón lá đi',
    'Hướng dẫn em làm nón lá bằng giấy',
    'Làm sao để thiết kế nón lá?',
    'Cách làm nón lá đẹp cho học sinh',
    'Chỉ cho em cách trang trí nón lá',
  ]) {
    assert.deepEqual(routeAssistantIntent(question, boardHistory), {
      mode: 'general',
      followup: false,
    }, question);
  }
  assert.equal(routeAssistantIntent('Theo bài đăng Trang trí nón lá, cô dặn gì?').mode, 'board');
  assert.equal(routeAssistantIntent('Trong bài cô đăng hướng dẫn làm nón lá thế nào?').mode, 'board');
});

test('explicit website questions and real timetable queries route to Board', () => {
  for (const question of [
    'Cô có đăng lịch thi GK1 chưa?',
    'Trong bài lực đẩy, cô nói gì?',
    'Trên website có bài thông báo nào?',
    'Lớp mình thi Văn lúc mấy giờ?',
    'Lịch kiểm tra tuần này là gì?',
  ])
    assert.equal(routeAssistantIntent(question).mode, 'board', question);
});

test('mixed questions keep an explicit hybrid mode', () => {
  assert.equal(
    routeAssistantIntent('Từ bài lực đẩy trên web, giải thích thêm ứng dụng thực tế?').mode,
    'hybrid',
  );
});

test('Board follow-ups preserve sources but new science topics change to general', () => {
  assert.deepEqual(routeAssistantIntent('Vậy học sinh về lúc mấy giờ?', boardHistory), {
    mode: 'board',
    followup: true,
  });
  assert.deepEqual(routeAssistantIntent('Vậy sao bầu trời xanh?', generalHistory), {
    mode: 'general',
    followup: false,
  });
  assert.equal(routeAssistantIntent('Vậy lúc mấy giờ?', generalHistory).mode, 'general');
  assert.equal(routeAssistantIntent('Vì sao bầu trời xanh?', boardHistory).mode, 'general');
  assert.deepEqual(routeAssistantIntent('Môn Văn ạ', boardHistory), {
    mode: 'board',
    followup: true,
  });
});

test('elliptical requests without context require clarification or bounded classification', () => {
  assert.equal(routeAssistantIntent('Vậy bài đó diễn ra lúc nào?').mode, 'clarify');
  assert.equal(routeAssistantIntent('Em cần chuẩn bị gì?').mode, 'uncertain');
});

test('general conversation removes pairs tied to revoked or unrelated Board sources', () => {
  assert.deepEqual(generalConversationHistory([...boardHistory, ...generalHistory]), [
    { role: 'user', content: 'Vì sao bầu trời xanh?' },
    { role: 'assistant', content: 'Do tán xạ ánh sáng.' },
  ]);
});

test('rejects unfinished model clauses and explicit output token truncation', () => {
  const unfinished = { response: { answer: 'Bầu trời màu xanh vì ánh sáng bị', ids: [] } };
  const capped = {
    response: { answer: 'Bầu trời xanh.', ids: [] },
    finish_reason: 'length',
  };
  const plain = { response: 'Bầu trời xanh vì', finish_reason: 'stop' };
  for (const generated of [unfinished, capped, plain]) {
    const decode = () => decodeChatAnswer(generated, [], { structured: true });
    assert.throws(decode, /model_incomplete/);
  }
});

test('hybrid answer requires factual website part and separate explanation', () => {
  const catalog = [{ id: 'c0', title: 'Lịch thi GK1', body: 'Môn Văn thi lúc 7g20, 90 phút.' }];
  const model = {
    response: {
      website: 'Môn Văn thi lúc 7g20.',
      general: 'Em nên chia thời gian ôn tập thành những khoảng ngắn.',
      ids: ['c0'],
    },
  };
  const answer = decodeHybridChatAnswer(model, catalog);
  assert.match(answer.answer, /Theo bài đăng:\nMôn Văn thi lúc 7g20/);
  assert.match(answer.answer, /Giải thích thêm:\nEm nên chia thời gian/);
  assert.deepEqual(answer.ids, ['c0']);
  const omitted = { response: { answer: 'Em hãy ôn tập đều.', ids: ['c0'] } };
  const blank = { response: { website: 'Văn 7g20.', general: '', ids: ['c0'] } };
  const fabricated = { response: { website: 'Văn 7g20.', general: 'Ôn bài.', ids: ['fake'] } };
  for (const generated of [omitted, blank])
    assert.throws(() => decodeHybridChatAnswer(generated, catalog), /model_incomplete/);
  assert.throws(() => decodeHybridChatAnswer(fabricated, catalog), /model/);
});

test('TC-06 requires a requested exam time to appear in the cited subject evidence', () => {
  const catalog = [
    {
      id: 'c0',
      title: 'Lịch thi GK1',
      body: 'Văn: 7g20, 90 phút; Toán: 9g20, 60 phút.',
    },
  ];
  const question = 'Theo bài Lịch thi GK1, môn Văn thi lúc mấy giờ? Giải thích thêm cách ôn.';
  assert.equal(validateHybridRequestedTime(question, 'Văn thi lúc 7g20.', catalog), true);
  const matching = validateHybridRequestedTime(question, 'Môn Văn thi lúc 7 giờ 20 phút.', catalog);
  const unrelated = validateHybridRequestedTime(question, 'Ngày 26/10 và em nên ôn Toán.', catalog);
  assert.equal(matching, true);
  assert.equal(unrelated, false);
  assert.equal(validateHybridRequestedTime(question, 'Toán thi lúc 9g20.', catalog), false);
  assert.equal(
    validateHybridRequestedTime('Tóm tắt bài Lịch thi GK1.', 'Lịch có 3 môn.', catalog),
    true,
  );
});
