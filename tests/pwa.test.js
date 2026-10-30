/** Pure PWA file checks: no browser, network, backend or service worker execution. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async (path) => readFile(path, 'utf8');
const manifest = JSON.parse(await read('public/manifest.webmanifest'));

test('manifest declares root-scoped install identity and distinct standard/maskable icons', () => {
  assert.equal(manifest.name, 'Vui học cùng cô Quỳnh');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.id, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'));
});

test('all PNG icons have valid headers and declared dimensions', async () => {
  for (const icon of manifest.icons) {
    const bytes = await readFile('public' + icon.src);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
  }
});

test('offline page is anonymous and SW only caches a static fallback', async () => {
  const html = await read('index.html');
  const offline = await read('public/offline.html');
  const worker = await read('public/sw.js');
  const client = await read('src/utils/pwa.js');
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(offline, /Không có kết nối mạng/);
  assert.doesNotMatch(offline, /<script|<form|fetch\(/i);
  assert.match(worker, /event\.request\.mode !== 'navigate'/);
  assert.match(worker, /event\.request\.method !== 'GET'/);
  assert.match(worker, /fetch\(event\.request\)\.catch/);
  assert.match(worker, /cache\.match\(OFFLINE_URL\)/);
  assert.doesNotMatch(worker, /cache\.put\(|caches\.match\(event\.request\)|skipWaiting\(/);
  assert.match(client, /serviceWorker\.register\('\/sw\.js'/);
  assert.doesNotMatch(client, /location\.reload\(|skipWaiting\(/);
});
