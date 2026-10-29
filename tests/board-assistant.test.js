/** Exercises public projection, grounded citations and read-only actions as pure data; no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assistantCatalog,
  localAssistantResults,
  validAssistantQuery,
  validateAssistantSources,
  resolveAssistantAction,
} from '../src/utils/board-assistant.js';

export const assistantFixture = {
  sections: [
    { id: 'chemistry', title: 'Hóa học · MẪU THỬ' },
    { id: 'physics', title: 'Vật lý · MẪU THỬ' },
  ],
  posts: [
    {
      id: 'gas',
      section_id: 'chemistry',
      title: 'Thí nghiệm khí · MẪU THỬ',
      body: 'Mẫu mô tả: phản ứng tạo khí có thể quan sát bọt khí. Đây là dữ liệu giả để kiểm thử tìm học liệu.',
      status: 'published',
      attachments: [{ storage_path: 'private-object' }],
      secret: 'private-fixture-only',
    },
    {
      id: 'force',
      section_id: 'physics',
      title: 'Lực đẩy · MẪU THỬ',
      body: 'Mẫu mô tả lực đẩy Ác-si-mét trong chất lỏng. Đây là dữ liệu giả để kiểm thử.',
      status: 'published',
    },
    {
      id: 'hidden',
      section_id: 'chemistry',
      title: 'Bí mật',
      body: 'không được gửi',
      status: 'hidden',
    },
    {
      id: 'draft',
      section_id: 'chemistry',
      title: 'Nháp',
      body: 'không được gửi',
      status: 'draft',
    },
    {
      id: 'deleted',
      section_id: 'chemistry',
      title: 'Xóa',
      body: 'không được gửi',
      status: 'deleted',
    },
    {
      id: 'orphan',
      section_id: 'missing',
      title: 'Mồ côi',
      body: 'không được gửi',
      status: 'published',
    },
  ],
};

test('projection excludes private statuses, orphaned posts, attachments and arbitrary keys', () => {
  const catalog = assistantCatalog(assistantFixture);
  assert.deepEqual(
    catalog.map((p) => p.id),
    ['gas', 'force'],
  );
  assert.equal(JSON.stringify(catalog).includes('private'), false);
  assert.deepEqual(Object.keys(catalog[0]).sort(), [
    'body',
    'id',
    'sectionId',
    'sectionTitle',
    'title',
  ]);
  catalog[0].title = 'changed';
  assert.notEqual(catalog[0].title, assistantFixture.posts[0].title);
});

test('Vietnamese accent-insensitive fallback does not claim results for unrelated tokens', () => {
  const catalog = assistantCatalog(assistantFixture);
  assert.equal(localAssistantResults('luc day', catalog)[0].id, 'force');
  assert.deepEqual(
    localAssistantResults('lực đẩy', catalog).map((source) => source.id),
    ['force'],
  );
  assert.equal(localAssistantResults('khí', catalog)[0].id, 'gas');
  assert.deepEqual(localAssistantResults('zzzzzzzz', catalog), []);
});

test('obvious identifiers and unbounded queries are rejected before transport', () => {
  for (const value of [
    '',
    ' ',
    'a'.repeat(401),
    '012345678901',
    'Ngày sinh 01/01/2010',
    'a@example.test',
  ])
    assert.equal(validAssistantQuery(value), false);
  assert.equal(validAssistantQuery('Tìm tài liệu CO2'), true);
});

test('V2-REV-01/02 accepts public dates regardless of topic or year, blocks explicit identifiers', () => {
  for (const query of [
    '20/11 có hoạt động gì?',
    '20/11/2026 có hoạt động gì?',
    '20/11/2026 có phong trào gì?',
    'Ngày 20/11/2026 có phong trào gì?',
    'Tháng 11/2026 có thông báo gì?',
    'Ngày 20/11/2026 có thông báo gì?',
    'Những sự kiện từ 15/11/2026 đến 20/11/2026 là gì?',
    'Giải thích bài lịch sử ngày 02/09/1945',
    '01/01/2010',
    'So sánh các ngày 2026-11-15 2026-11-20',
    'Ngày sinh là gì trong hướng dẫn xác minh công khai?',
  ])
    assert.equal(validAssistantQuery(query), true, query);
  for (const query of [
    'CMND: 012 345 678',
    'Ngày sinh của tôi là 01/01/2010',
    'DOB 2010-01-01',
    'sinh ngày 1 tháng 1 năm 2010',
    'a@example.test',
    'Em sinh 20/11/2010, có hoạt động nào phù hợp?',
    'Ngày sinh của tôi là 20/11/2010.',
  ])
    assert.equal(validAssistantQuery(query), false, query);
});

test('model output must cite an existing source with exact text and no duplicate citations', () => {
  const catalog = assistantCatalog(assistantFixture);
  const quote = 'phản ứng tạo khí có thể quan sát bọt khí';
  assert.deepEqual(validateAssistantSources([{ id: 'gas', quote }], catalog), [
    { id: 'gas', quote },
  ]);
  for (const sources of [
    [{ id: 'hidden', quote }],
    [{ id: 'gas', quote: 'Invented answer' }],
    [
      { id: 'gas', quote },
      { id: 'gas', quote },
    ],
    [{ id: 'gas', quote: '' }],
  ])
    assert.throws(() => validateAssistantSources(sources, catalog));
});

test('actions reject writes, JavaScript, missing IDs and revoked published status', () => {
  const catalog = assistantCatalog(assistantFixture);
  for (const action of [
    { type: 'publish', id: 'gas' },
    { type: 'eval', code: 'x' },
    { type: 'open', id: 'hidden' },
    { type: 'topic', id: 'missing' },
  ])
    assert.equal(resolveAssistantAction(action, catalog), null);
  assert.deepEqual(resolveAssistantAction({ type: 'open', id: 'gas' }, catalog), {
    type: 'open',
    id: 'gas',
  });
  const revoked = structuredClone(assistantFixture);
  revoked.posts[0].status = 'hidden';
  assert.equal(
    resolveAssistantAction({ type: 'open', id: 'gas' }, assistantCatalog(revoked)),
    null,
  );
});

test('source filters use validated IDs, never raw paraphrases, and fail closed after revocation', () => {
  const catalog = assistantCatalog(assistantFixture);
  for (const query of ['lực trong chất lỏng', 'khí tạo bọt']) {
    const ids = localAssistantResults(query, catalog).map((source) => source.id);
    assert.ok(ids.length);
    assert.deepEqual(resolveAssistantAction({ type: 'filter', ids }, catalog), {
      type: 'filter',
      ids,
    });
  }
  assert.equal(resolveAssistantAction({ type: 'filter', ids: [] }, catalog), null);
  assert.equal(resolveAssistantAction({ type: 'filter', query: 'raw question' }, catalog), null);
  assert.equal(resolveAssistantAction({ type: 'filter', ids: ['hidden'] }, catalog), null);
  assert.equal(resolveAssistantAction({ type: 'filter', ids: ['gas'] }, catalog.slice(1)), null);
});
