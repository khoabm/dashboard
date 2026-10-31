/** Covers URL, upload, search, ordering, restore, and quota boundary cases offline. */

import test from 'node:test';
import {
  placementPeers,
  initialPlacement,
  saveSortOrder,
  orderedPlacement,
  needsReorder,
} from '../src/utils/post-placement.js';
import assert from 'node:assert/strict';
import {
  compressedImageName,
  isOptimizableImage,
  shouldUseCompressedImage,
  optimizeImage,
  MAX_SOURCE_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  MAX_HIGH_RES_IMAGE_PIXELS,
  compressionPixelBudget,
  sniffImageDimensions,
} from '../src/utils/image-compression.js';
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

test('post placement includes only eligible topic peers and stable order', () => {
  const posts = [
    { id: 'c', section_id: 'A', status: 'published', sort_order: 2, created_at: '2020' },
    { id: 'a', section_id: 'A', status: 'draft', sort_order: 0, created_at: '2020' },
    { id: 'b', section_id: 'A', status: 'hidden', sort_order: 1, created_at: '2020' },
    { id: 'deleted', section_id: 'A', status: 'deleted', sort_order: -3 },
    { id: 'other', section_id: 'B', status: 'published', sort_order: -2 },
  ];
  assert.deepEqual(
    placementPeers(posts, 'A').map((post) => post.id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    placementPeers(posts, 'A', 'b').map((post) => post.id),
    ['a', 'c'],
  );
  assert.deepEqual(
    posts.map((post) => post.id),
    ['c', 'a', 'b', 'deleted', 'other'],
  );
  assert.deepEqual(initialPlacement(posts, posts[2], 'A'), { mode: 'custom', index: 1 });
  assert.deepEqual(initialPlacement(posts, null, 'A'), { mode: 'end', index: 3 });
  assert.deepEqual(initialPlacement(posts, posts[2], 'B'), { mode: 'end', index: 1 });
});

test('new post at head or tail preserves existing IDs and correct numeric order', () => {
  const peers = [
    { id: 'a', sort_order: -3 },
    { id: 'b', sort_order: 4 },
    { id: 'c', sort_order: 9 },
  ];
  assert.equal(saveSortOrder(peers, 'start', 0), -4);
  assert.equal(saveSortOrder(peers, 'end', 3), 10);
  assert.equal(saveSortOrder([], 'start', 0), 0);
  assert.equal(saveSortOrder([], 'end', 0), 0);
  assert.equal(saveSortOrder(peers, 'custom', 0), -4);
  assert.equal(saveSortOrder(peers, 'custom', 3), 10);
});

test('middle placement uses the existing reorder contract after save', () => {
  const peers = [
    { id: 'a', sort_order: 0, version: 1 },
    { id: 'b', sort_order: 1, version: 1 },
    { id: 'c', sort_order: 2, version: 1 },
  ];
  const post = { id: 'new', sort_order: 3, version: 1 };
  assert.equal(saveSortOrder(peers, 'custom', 1), 3);
  assert.equal(needsReorder('custom', 1, peers.length), true);
  assert.deepEqual(
    orderedPlacement(peers, post, 1).map((item) => item.id),
    ['a', 'new', 'b', 'c'],
  );
  assert.deepEqual(
    peers.map((item) => item.id),
    ['a', 'b', 'c'],
  );
  assert.equal(needsReorder('custom', 0, 3), false);
  assert.equal(needsReorder('custom', 3, 3), false);
  assert.equal(needsReorder('end', 2, 3), false);
});

test('existing post placement reuses the previous integer for a middle reorder', () => {
  const current = { id: 'b', section_id: 'A', sort_order: 8, version: 2 };
  const peers = [
    { id: 'a', section_id: 'A', sort_order: 0, version: 1 },
    { id: 'c', section_id: 'A', sort_order: 15, version: 1 },
  ];
  assert.equal(saveSortOrder(peers, 'custom', 1, current, 'A'), 8);
  assert.equal(saveSortOrder(peers, 'custom', 1, current, 'B'), 16);
  assert.deepEqual(
    orderedPlacement(peers, current, 1).map((item) => item.id),
    ['a', 'b', 'c'],
  );
  assert.throws(() => orderedPlacement(peers, current, -1));
  assert.throws(() => orderedPlacement(peers, current, 3));
});

test('numeric post-order boundaries reject unsafe range before uploading', () => {
  const peers = [{ id: 'x', sort_order: 2147483647 }];
  assert.throws(() => saveSortOrder(peers, 'end', 1));
  assert.throws(() => saveSortOrder([{ id: 'x', sort_order: -2147483648 }], 'start', 0));
});

test('image optimizer recognizes only the existing three exact image formats', () => {
  assert.equal(isOptimizableImage({ name: 'activity.JPG', type: 'image/jpeg' }), true);
  assert.equal(isOptimizableImage({ name: 'diagram.png', type: 'image/png' }), true);
  assert.equal(isOptimizableImage({ name: 'preview.webp', type: 'image/webp' }), true);
  assert.equal(isOptimizableImage({ name: 'clip.mp4', type: 'video/mp4' }), false);
  assert.equal(isOptimizableImage({ name: 'notes.pdf', type: 'application/pdf' }), false);
  assert.equal(isOptimizableImage({ name: 'sheet.xlsx', type: 'application/pdf' }), false);
  assert.equal(isOptimizableImage({ name: 'fake.jpg', type: 'image/png' }), false);
});

test('image optimizer never stores larger output or bypasses the 2 MB Storage boundary', () => {
  assert.equal(shouldUseCompressedImage(1_000_000, 300_000), true);
  assert.equal(shouldUseCompressedImage(2_500_000, 1_700_000), true);
  assert.equal(shouldUseCompressedImage(2_500_000, 2_000_000), false);
  assert.equal(shouldUseCompressedImage(1_000_000, 950_000), false);
  assert.equal(shouldUseCompressedImage(1_000_000, 990_000), false);
  assert.equal(shouldUseCompressedImage(1_000_000, 1_100_000), false);
  assert.equal(shouldUseCompressedImage(0, 100), false);
  assert.equal(shouldUseCompressedImage(1_000_000, Number.NaN), false);
});

test('compressed image names retain the basename and match the real WebP MIME', () => {
  assert.equal(compressedImageName('Hình hoạt động.JPG'), 'Hình hoạt động.webp');
  assert.equal(compressedImageName('workshop.backup.png'), 'workshop.backup.webp');
  assert.equal(compressedImageName('demo.webp'), 'demo.webp');
  assert.equal(MAX_SOURCE_IMAGE_BYTES, 12_000_000);
});

test('optimizer does not touch Office/PDF or fetch remote resources in a non-DOM runtime', async () => {
  const documentFile = { name: 'plan.pdf', type: 'application/pdf', size: 120_000 };
  const imageFile = { name: 'lesson.jpg', type: 'image/jpeg', size: 1_000_000 };
  assert.deepEqual(await optimizeImage(documentFile), {
    file: documentFile,
    optimized: false,
    originalBytes: documentFile.size,
    reason: 'unsupported',
  });
  assert.deepEqual(await optimizeImage(imageFile), {
    file: imageFile,
    optimized: false,
    originalBytes: imageFile.size,
    reason: 'browser-unavailable',
  });
});

test('Canvas quality optimization preserves original pixel width and height', async () => {
  const originalDocument = globalThis.document;
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  let canvas;
  let released = false;
  const qualities = [];
  try {
    globalThis.createImageBitmap = async () => ({
      width: 2800,
      height: 1800,
      close() {
        released = true;
      },
    });
    globalThis.document = {
      createElement(name) {
        assert.equal(name, 'canvas');
        canvas = {
          width: 0,
          height: 0,
          getContext() {
            return {
              drawImage(_bitmap, x, y, width, height) {
                assert.deepEqual([x, y, width, height], [0, 0, 2800, 1800]);
                assert.deepEqual([canvas.width, canvas.height], [2800, 1800]);
              },
            };
          },
          toBlob(callback, type, quality) {
            assert.equal(type, 'image/webp');
            qualities.push(quality);
            const length = quality === 0.82 ? 2_350_000 : 1_650_000;
            callback(new Blob([new Uint8Array(length)], { type }));
          },
        };
        return canvas;
      },
    };
    const source = new File([new Uint8Array(2_700_000)], 'picture.jpg', {
      type: 'image/jpeg',
    });
    const result = await optimizeImage(source);
    assert.equal(result.optimized, true);
    assert.equal(result.file.size, 1_650_000);
    assert.equal(result.file.name, 'picture.webp');
    assert.deepEqual([result.width, result.height], [2800, 1800]);
    assert.deepEqual(qualities, [0.82, 0.72]);
    assert.equal(released, true);
    assert.deepEqual([canvas.width, canvas.height], [0, 0]);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalCreateImageBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = originalCreateImageBitmap;
  }
});

test('quality-only encoding reports the best failed candidate without altering source', async () => {
  const originalDocument = globalThis.document;
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  try {
    globalThis.createImageBitmap = async () => ({
      width: 2200,
      height: 1600,
      close() {},
    });
    globalThis.document = {
      createElement() {
        return {
          width: 0,
          height: 0,
          getContext() {
            return { drawImage() {} };
          },
          toBlob(callback, type, quality) {
            const length = quality >= 0.72 ? 2_300_000 : 2_090_000;
            callback(new Blob([new Uint8Array(length)], { type }));
          },
        };
      },
    };
    const source = new File([new Uint8Array(2_700_000)], 'oversize.jpg', {
      type: 'image/jpeg',
    });
    const result = await optimizeImage(source);
    assert.equal(result.optimized, false);
    assert.equal(result.file, source);
    assert.equal(result.reason, 'still-too-large');
    assert.equal(result.bestCandidateBytes, 2_090_000);
    assert.deepEqual([result.width, result.height], [2200, 1600]);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalCreateImageBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = originalCreateImageBitmap;
  }
});

test('file validation preserves the size boundary but uses concise Vietnamese text', () => {
  assert.equal(
    validateFile({ name: 'image.jpg', size: 2_000_000, type: 'image/jpeg' }),
    'Mỗi tệp phải nhỏ hơn 2 MB.',
  );
});

test('oversized pixel count reports the real dimensions instead of an unnamed failure', async () => {
  const originalDocument = globalThis.document;
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  let closed = false;
  try {
    globalThis.createImageBitmap = async () => ({
      width: 6500,
      height: 4200,
      close() {
        closed = true;
      },
    });
    globalThis.document = {
      createElement() {
        throw Error('Encoder must not run for an over-limit image.');
      },
    };
    const source = new File([new Uint8Array(2_830_000)], 'photo.jpg', {
      type: 'image/jpeg',
    });
    const result = await optimizeImage(source);
    assert.equal(result.file, source);
    assert.equal(result.optimized, false);
    assert.equal(result.reason, 'pixel-limit');
    assert.deepEqual([result.width, result.height], [6500, 4200]);
    assert.equal(result.bestCandidateBytes, undefined);
    assert.equal(closed, true);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalCreateImageBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = originalCreateImageBitmap;
  }
});

test('high-resolution processing budget considers worker support and actual device capacity', () => {
  assert.equal(MAX_IMAGE_PIXELS, 24_000_000);
  assert.equal(MAX_HIGH_RES_IMAGE_PIXELS, 60_000_000);
  assert.equal(
    compressionPixelBudget({ workerAvailable: false, memoryGB: 8, cores: 8 }),
    24_000_000,
  );
  assert.equal(
    compressionPixelBudget({ workerAvailable: true, memoryGB: 8, cores: 8 }),
    60_000_000,
  );
  assert.equal(
    compressionPixelBudget({ workerAvailable: true, memoryGB: 4, cores: 8 }),
    32_000_000,
  );
  assert.equal(
    compressionPixelBudget({ workerAvailable: true, memoryGB: 2, cores: 8 }),
    24_000_000,
  );
  assert.equal(
    compressionPixelBudget({ workerAvailable: true, cores: 8, maxTouchPoints: 0 }),
    60_000_000,
  );
  assert.equal(
    compressionPixelBudget({ workerAvailable: true, cores: 8, maxTouchPoints: 5 }),
    24_000_000,
  );
});

test('JPEG header preflight reads the original 8064×6048 resolution without decoding pixels', () => {
  const jpeg = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x17, 0xa0, 0x1f,
    0x80, 0x03, 0x01, 0x11, 0x00, 0, 0, 0, 0, 0, 0,
  ]);
  assert.deepEqual(sniffImageDimensions(jpeg, 'image/jpeg'), {
    width: 8064,
    height: 6048,
  });
  assert.equal(8064 * 6048, 48_771_072);
  assert.equal(sniffImageDimensions(jpeg, 'image/webp'), null);
  const png = new Uint8Array(24);
  png.set([0x89, 0x50, 0x4e, 0x47], 0);
  new DataView(png.buffer).setUint32(16, 3200);
  new DataView(png.buffer).setUint32(20, 2400);
  assert.deepEqual(sniffImageDimensions(png, 'image/png'), {
    width: 3200,
    height: 2400,
  });
});

test('eligible 48.77 MP image is encoded in a cancellable worker, not main-thread Canvas', async () => {
  const oldWorker = globalThis.Worker;
  const oldCanvas = globalThis.OffscreenCanvas;
  const oldBitmap = globalThis.createImageBitmap;
  const oldDocument = globalThis.document;
  const navDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let terminated = false;
  let workerMessages = 0;
  const progress = [];
  try {
    globalThis.Worker = class {
      postMessage({ pixelBudget }) {
        workerMessages++;
        assert.equal(pixelBudget, 60_000_000);
        queueMicrotask(() => {
          this.onmessage({ data: { type: 'progress', stage: 'decode' } });
          this.onmessage({
            data: {
              type: 'result',
              optimized: true,
              blob: new Blob([new Uint8Array(1_350_000)], { type: 'image/webp' }),
              width: 8064,
              height: 6048,
            },
          });
        });
      }
      terminate() {
        terminated = true;
      }
    };
    globalThis.OffscreenCanvas = class {};
    globalThis.createImageBitmap = () => {
      throw Error('Main thread must not decode this large image.');
    };
    globalThis.document = {
      createElement() {
        throw Error('Main thread must not allocate a Canvas.');
      },
    };
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { deviceMemory: 8, hardwareConcurrency: 8, maxTouchPoints: 0 },
    });
    const head = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0x17, 0xa0, 0x1f, 0x80]);
    const file = new File([head, new Uint8Array(2_829_094 - head.length)], 'photo.jpg', {
      type: 'image/jpeg',
    });
    const result = await optimizeImage(file, { onProgress: (stage) => progress.push(stage) });
    assert.equal(result.optimized, true);
    assert.equal(result.file.type, 'image/webp');
    assert.equal(result.file.name, 'photo.webp');
    assert.equal(result.file.size, 1_350_000);
    assert.deepEqual([result.width, result.height], [8064, 6048]);
    assert.equal(workerMessages, 1);
    assert.equal(terminated, true);
    assert.ok(progress.includes('large-image'));
  } finally {
    if (oldWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = oldWorker;
    if (oldCanvas === undefined) delete globalThis.OffscreenCanvas;
    else globalThis.OffscreenCanvas = oldCanvas;
    if (oldBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = oldBitmap;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
    if (navDescriptor) Object.defineProperty(globalThis, 'navigator', navDescriptor);
    else delete globalThis.navigator;
  }
});

test('abort immediately terminates the large-image worker without changing the original', async () => {
  const oldWorker = globalThis.Worker;
  const oldCanvas = globalThis.OffscreenCanvas;
  const oldBitmap = globalThis.createImageBitmap;
  const oldDocument = globalThis.document;
  const navDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let terminated = false;
  try {
    globalThis.Worker = class {
      postMessage() {
        // Simulate a long encode with no response until cancelled.
      }
      terminate() {
        terminated = true;
      }
    };
    globalThis.OffscreenCanvas = class {};
    globalThis.createImageBitmap = () => {};
    globalThis.document = {};
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { deviceMemory: 8, hardwareConcurrency: 8, maxTouchPoints: 0 },
    });
    const head = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0x17, 0xa0, 0x1f, 0x80]);
    const file = new File([head, new Uint8Array(2_829_094 - head.length)], 'photo.jpg', {
      type: 'image/jpeg',
    });
    const signal = new AbortController();
    const pending = optimizeImage(file, { signal: signal.signal });
    await new Promise((resolve) => setImmediate(resolve));
    signal.abort();
    const result = await pending;
    assert.equal(result.optimized, false);
    assert.equal(result.reason, 'cancelled');
    assert.equal(result.file, file);
    assert.equal(terminated, true);
  } finally {
    if (oldWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = oldWorker;
    if (oldCanvas === undefined) delete globalThis.OffscreenCanvas;
    else globalThis.OffscreenCanvas = oldCanvas;
    if (oldBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = oldBitmap;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
    if (navDescriptor) Object.defineProperty(globalThis, 'navigator', navDescriptor);
    else delete globalThis.navigator;
  }
});
