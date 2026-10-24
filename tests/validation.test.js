import test from 'node:test';
import assert from 'node:assert/strict';
import {
  safeUrl,
  youtubeId,
  validateFile,
  verifyFileSignature,
  matches,
  moveItem,
  canRestore,
} from '../src/utils/validation.js';
test('reject executable, credentialed and deceptive YouTube URLs', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,x',
    'http://example.org',
    'https://user:pass@example.org',
    'not a URL',
  ])
    assert.equal(safeUrl(url), null);
  assert.equal(
    safeUrl('https://docs.google.com/document/d/example'),
    'https://docs.google.com/document/d/example',
  );
  assert.equal(youtubeId('https://www.youtube.com.evil.org/watch?v=jNQXAC9IVRw'), null);
  assert.equal(youtubeId('https://youtu.be/jNQXAC9IVRw'), 'jNQXAC9IVRw');
});
test('exact upload boundary, MIME mismatch, count and signature validation', async () => {
  const file = { name: 'x.png', type: 'image/png', size: 1999999 };
  assert.equal(validateFile(file, 9), null);
  assert.ok(validateFile({ ...file, size: 2000000 }));
  assert.ok(validateFile(file, 10));
  assert.ok(validateFile({ ...file, type: 'text/html' }));
  assert.ok(validateFile({ ...file, name: 'x.svg' }));
  const spoof = new File(['<script>alert(1)</script>'], 'x.png', { type: 'image/png' });
  assert.equal(await verifyFileSignature(spoof), false);
  const pdf = new File(['%PDF-1.4 fixture'], 'x.pdf', { type: 'application/pdf' });
  assert.equal(await verifyFileSignature(pdf), true);
});
test('Vietnamese search spans topic, title and body', () => {
  const post = { title: 'Bản đồ', body: 'Tài liệu' },
    section = { title: 'Chủ đề 01', description: 'Khám phá' };
  assert.ok(matches(post, section, 'ban do'));
  assert.ok(matches(post, section, 'chu de'));
  assert.ok(matches(post, section, 'tai lieu'));
  assert.ok(!matches(post, section, 'zzz'));
});
test('reorder is bounded and does not mutate the editor attachments', () => {
  const a = ['one', 'two', 'three'];
  assert.deepEqual(moveItem(a, 1, -1), ['two', 'one', 'three']);
  assert.deepEqual(a, ['one', 'two', 'three']);
  assert.deepEqual(moveItem(a, 0, -1), a);
});
test('restore is limited to 30 days and deleted status', () => {
  const now = Date.now();
  assert.equal(
    canRestore({ status: 'deleted', deleted_at: new Date(now - 29 * 86400000).toISOString() }, now),
    true,
  );
  assert.equal(
    canRestore({ status: 'deleted', deleted_at: new Date(now - 31 * 86400000).toISOString() }, now),
    false,
  );
  assert.equal(
    canRestore({ status: 'hidden', deleted_at: new Date(now).toISOString() }, now),
    false,
  );
});
import { quotaLevel, assertUploadBudget } from '../src/utils/quota.js';
test('quota threshold blocks before 90%, unknown usage fails closed', () => {
  assert.equal(quotaLevel(700000000, 1000000000), 'warning');
  assert.equal(quotaLevel(900000000, 1000000000), 'critical');
  assert.throws(() => assertUploadBudget(899999999, 1));
  assert.throws(() => assertUploadBudget(undefined, 1));
  assert.doesNotThrow(() => assertUploadBudget(1000, 1000));
});
