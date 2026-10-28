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
  for (const value of ['', ' ', 'a'.repeat(401), '012345678901', '01/01/2010', 'a@example.test'])
    assert.equal(validAssistantQuery(value), false);
  assert.equal(validAssistantQuery('Tìm tài liệu CO2'), true);
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
