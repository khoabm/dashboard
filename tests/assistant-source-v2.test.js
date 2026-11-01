/** Pure, offline regression against redacted public Board snapshot; no network or personal data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  routeAssistantIntent,
  matchPublishedTitle,
  localCalendarReply,
  directPublishedPostSummary,
} from '../src/utils/assistant-intent.js';
import { parseAssistantMarkdown } from '../src/utils/assistant-format.js';
import { publicAssistantCorpus, retrievePublicContent } from '../src/utils/public-retrieval.js';
import {
  publishedBoardFixture,
  publishedBoardSections,
} from './fixtures/assistant-published-20261101.js';

const corpus = publicAssistantCorpus({
  posts: publishedBoardFixture,
  sections: publishedBoardSections,
  publicCoverage: { complete: true },
});

test('actual November movement title is found before generic model inference', () => {
  const route = routeAssistantIntent('Phong trào tháng 11');
  assert.equal(route.mode, 'title-check');
  const post = matchPublishedTitle('Phong trào tháng 11', corpus.posts);
  assert.equal(post.title, 'Phong trào Tháng 11');
  assert.match(post.body, /Trang trí nón lá/);
  assert.match(post.body, /Viết văn tri ân thầy cô/);
  const retrieval = retrievePublicContent(post.title, { ...corpus, posts: [post] });
  assert.equal(retrieval.catalog[0].title, post.title);
  assert.equal(retrieval.lookup[0].postId, post.id);
});

test('explicit requests for website use Board even in natural phrasing', () => {
  const prompts = [
    'Dựa vào nội dung web cho biết phong trào tháng 11 có gì?',
    'Dùng web cho em biết phong trào tháng 11',
    'Theo bài đăng Phong trào Tháng 11, lớp làm gì?',
  ];
  for (const query of prompts) {
    assert.equal(routeAssistantIntent(query).mode, 'board', query);
    assert.equal(matchPublishedTitle(query, corpus.posts)?.title, 'Phong trào Tháng 11');
  }
});

test('short conversational messages do not trigger unnecessary Board title reads', () => {
  const history = [
    { role: 'user', content: 'Vì sao bầu trời xanh?' },
    { role: 'assistant', content: 'Do ánh sáng xanh tán xạ.', sourceIds: [] },
  ];
  assert.equal(routeAssistantIntent('Em chưa hiểu lắm', history).mode, 'general');
  assert.equal(routeAssistantIntent('Cảm ơn bạn', history).mode, 'general');
  assert.equal(routeAssistantIntent('Cho mình một ví dụ', history).mode, 'general');
  assert.equal(routeAssistantIntent('Em chưa hiểu lắm').mode, 'clarify');
});

test('general knowledge and practical instructions never become a matching school post', () => {
  for (const question of [
    'Chỉ tôi cách thiết kế nón lá đi',
    'Phong trào tháng 11 trong lịch sử Việt Nam là gì?',
    'Vì sao bầu trời màu xanh?',
  ]) {
    assert.equal(routeAssistantIntent(question).mode, 'general', question);
  }
  assert.equal(
    matchPublishedTitle('Phong trào tháng 11 trong lịch sử Việt Nam', corpus.posts),
    null,
  );
});

test('exact public movement title is answered entirely from the published body, no model', () => {
  const post = matchPublishedTitle('Phong trào tháng 11', corpus.posts);
  const summary = directPublishedPostSummary('Phong trào tháng 11', post);
  assert.match(summary, /Theo bài "Phong trào Tháng 11" trên website/);
  assert.match(summary, /Văn nghệ chào mừng 20\/11/);
  assert.equal(
    directPublishedPostSummary('Phong trào tháng 11 trong lịch sử Việt Nam', post),
    null,
  );
  assert.equal(directPublishedPostSummary('Chỉ cách làm nón lá', post), null);
});

test('a published title with only attachments is discoverable without inventing PDF content', () => {
  const post = matchPublishedTitle('Đáp án GK1 môn Toán', corpus.posts);
  assert.equal(post.title, 'Đáp án GK1 môn Toán');
  assert.equal(post.body, '');
  const summary = directPublishedPostSummary('Đáp án GK1 môn Toán', post);
  assert.match(summary, /chưa đọc được/);
});

test('weekday and Vietnamese clock are answered locally without models', () => {
  const clock = new Date('2026-11-01T02:24:00Z');
  assert.equal(routeAssistantIntent('Hôm nay thứ mấy?').mode, 'calendar');
  assert.match(localCalendarReply('Hôm nay thứ mấy?', clock), /Chủ Nhật|chủ nhật/i);
  assert.match(localCalendarReply('Bây giờ mấy giờ?', clock), /09:24|9:24/);
  assert.equal(localCalendarReply('Hôm nay có bài đăng nào?', clock), null);
});

test('Markdown parser keeps bold, paragraphs and ordered/bullet lists as semantic blocks', () => {
  const blocks = parseAssistantMarkdown(
    'Em nên **ôn kỹ** đề cương.\n\n1. Đọc bài\n2. Làm bài\n\n**Lưu ý**: nghỉ ngơi.',
  );
  assert.deepEqual(
    blocks.map((block) => block.kind),
    ['paragraph', 'list', 'paragraph'],
  );
  assert.equal(blocks[1].ordered, true);
  assert.deepEqual(blocks[1].items, ['Đọc bài', 'Làm bài']);
  assert.equal(
    parseAssistantMarkdown('<img src=x onerror=alert(1)>')[0].text,
    '<img src=x onerror=alert(1)>',
  );
});

test('temporary exact Prettier output for hosted QA script', async () => {
  const fs = await import('node:fs');
  const prettier = await import('prettier');
  const path = 'tests/assistant-v2-hosted-qa.mjs';
  const original = fs.readFileSync(path, 'utf8');
  const config = await prettier.resolveConfig(path);
  const formatted = await prettier.format(original, { ...config, filepath: path });
  if (original !== formatted) {
    console.log('HOSTED_FORMAT_START', path);
    console.log(formatted);
    console.log('HOSTED_FORMAT_END', path);
  }
});
