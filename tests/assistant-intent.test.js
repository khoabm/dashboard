/** Pure Vietnamese topic-routing tests; no hosted endpoint, backend or model binding. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeAssistantIntent, generalConversationHistory } from '../src/utils/assistant-intent.js';

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
