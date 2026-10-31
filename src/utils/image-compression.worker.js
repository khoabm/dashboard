/** One isolated browser Worker per high-resolution image. Never accesses Storage or the network. */

import {
  WEBP_QUALITIES,
  compressedImageName,
  shouldUseCompressedImage,
} from './image-compression-policy.js';

/** @param {MessageEvent<{file: File, pixelBudget: number}>} event */
self.onmessage = async (event) => {
  const { file, pixelBudget } = event.data;
  let bitmap;
  let canvas;
  let width;
  let height;
  try {
    self.postMessage({ type: 'progress', stage: 'decode' });
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
      self.postMessage({ type: 'result', reason: 'worker-unavailable' });
      return;
    }
    bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    if (!width || !height || width * height > pixelBudget) {
      self.postMessage({
        type: 'result',
        reason: 'pixel-limit',
        width,
        height,
        pixelBudget,
      });
      return;
    }
    canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      self.postMessage({ type: 'result', reason: 'worker-unavailable', width, height });
      return;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    // Drop the decoded source before encoding to reduce peak memory use.
    bitmap.close();
    bitmap = null;

    let bestCandidateBytes = Infinity;
    let encoded = false;
    for (const quality of WEBP_QUALITIES) {
      self.postMessage({ type: 'progress', stage: 'encode', quality });
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
      if (blob.type !== 'image/webp' || !blob.size) continue;
      encoded = true;
      bestCandidateBytes = Math.min(bestCandidateBytes, blob.size);
      if (!shouldUseCompressedImage(file.size, blob.size)) continue;
      self.postMessage({
        type: 'result',
        optimized: true,
        blob,
        name: compressedImageName(file.name),
        width,
        height,
      });
      return;
    }
    self.postMessage({
      type: 'result',
      reason: !encoded
        ? 'encode-unavailable'
        : bestCandidateBytes >= 2_000_000 && file.size >= 2_000_000
          ? 'still-too-large'
          : 'not-beneficial',
      bestCandidateBytes: encoded ? bestCandidateBytes : undefined,
      width,
      height,
    });
  } catch {
    self.postMessage({ type: 'result', reason: 'encoding-failed', width, height });
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
};
