/** Re-encodes Board images at their original pixel dimensions, without network access. */

import {
  MAX_SOURCE_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  MAX_HIGH_RES_IMAGE_PIXELS,
  WEBP_QUALITIES,
  compressedImageName,
  compressionPixelBudget,
  isOptimizableImage,
  shouldUseCompressedImage,
  sniffImageDimensions,
} from './image-compression-policy.js';

export {
  MAX_SOURCE_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  MAX_HIGH_RES_IMAGE_PIXELS,
  compressedImageName,
  compressionPixelBudget,
  isOptimizableImage,
  shouldUseCompressedImage,
  sniffImageDimensions,
};

const WORKER_TIMEOUT_MS = 90_000;

/**
 * Read image headers without decoding pixels, to reject unsafe JPEG/PNG dimensions
 * before Canvas or ImageBitmap allocates hundreds of megabytes.
 *
 * @param {File} file - Original image file.
 * @returns {Promise<{width:number,height:number}|null>} Decoded header dimensions, when known.
 */
async function imageHeaderSize(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return null;
  try {
    const bytes = new Uint8Array(await file.slice(0, 262_144).arrayBuffer());
    return sniffImageDimensions(bytes, file.type);
  } catch {
    return null;
  }
}

/**
 * Runs the large-image encode in an isolated Worker, so cancellation can terminate
 * the computation and so the page remains interactive while encoding.
 *
 * @param {File} file - Source image.
 * @param {number} pixelBudget - Maximum decoded pixel count.
 * @param {object} options - Optional AbortSignal and progress callback.
 * @returns {Promise<object>} An optimizer result with the original file on failure.
 */
function encodeInWorker(file, pixelBudget, { signal, onProgress } = {}) {
  const unchanged = (reason, extras = {}) => ({
    file,
    optimized: false,
    originalBytes: file.size,
    reason,
    ...extras,
  });
  if (signal?.aborted) return Promise.resolve(unchanged('cancelled'));

  let worker;
  try {
    worker = new Worker(new URL('./image-compression.worker.js', import.meta.url), {
      type: 'module',
    });
  } catch {
    return Promise.resolve(unchanged('worker-unavailable'));
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
      resolve(result);
    };
    const abort = () => finish(unchanged('cancelled'));
    const timeout = setTimeout(() => finish(unchanged('timeout')), WORKER_TIMEOUT_MS);

    worker.onmessage = ({ data }) => {
      if (data?.type === 'progress') {
        onProgress?.(data.stage);
        return;
      }
      if (data?.type !== 'result') return;
      if (
        data.optimized &&
        data.blob?.type === 'image/webp' &&
        shouldUseCompressedImage(file.size, data.blob.size)
      ) {
        finish({
          file: new File([data.blob], compressedImageName(file.name), {
            type: 'image/webp',
            lastModified: file.lastModified,
          }),
          optimized: true,
          originalBytes: file.size,
          width: data.width,
          height: data.height,
        });
      } else {
        finish(
          unchanged(data.reason || 'worker-unavailable', {
            width: data.width,
            height: data.height,
            pixelBudget: data.pixelBudget || pixelBudget,
            bestCandidateBytes: data.bestCandidateBytes,
          }),
        );
      }
    };
    worker.onerror = () => finish(unchanged('worker-unavailable'));
    signal?.addEventListener('abort', abort, { once: true });
    onProgress?.('large-image');
    try {
      worker.postMessage({ file, pixelBudget });
    } catch {
      finish(unchanged('worker-unavailable'));
    }
  });
}

/**
 * Opens local pixels for Canvas drawing; releases its decoder and object URL afterward.
 *
 * @param {File} file - Image whose existing signature check passed.
 * @returns {Promise<{source: CanvasImageSource, width: number, height: number, release: Function}>}
 */
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Older Safari may not decode every supported file through createImageBitmap.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(Error('Không thể giải mã ảnh.'));
      image.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * Keeps source pixel dimensions. Low-resolution encoding retains the established
 * Canvas behavior; qualifying >24 MP images use an independently cancellable Worker.
 * Never widens the existing <2 MB Storage/validation constraint.
 *
 * @param {File} file - Original image chosen in the existing FilePicker.
 * @param {object} options - Optional AbortSignal and progress callback.
 * @returns {Promise<{file: File, optimized: boolean, originalBytes: number, reason?: string, bestCandidateBytes?: number, width?: number, height?: number, pixelBudget?: number}>}
 */
export async function optimizeImage(file, { signal, onProgress } = {}) {
  const unchanged = (reason, extras = {}) => ({
    file,
    optimized: false,
    originalBytes: file.size,
    reason,
    ...extras,
  });
  if (!isOptimizableImage(file)) return unchanged('unsupported');
  if (file.size < 50_000) return unchanged('already-small');
  if (file.size > MAX_SOURCE_IMAGE_BYTES) return unchanged('source-too-large');
  if (signal?.aborted) return unchanged('cancelled');
  if (typeof document === 'undefined') return unchanged('browser-unavailable');

  const browser = typeof navigator === 'undefined' ? {} : navigator;
  const workerAvailable =
    typeof Worker === 'function' &&
    typeof OffscreenCanvas === 'function' &&
    typeof createImageBitmap === 'function';
  const pixelBudget = compressionPixelBudget({
    workerAvailable,
    memoryGB: browser.deviceMemory,
    cores: browser.hardwareConcurrency,
    maxTouchPoints: browser.maxTouchPoints,
  });
  const dimensions = await imageHeaderSize(file);
  if (signal?.aborted) return unchanged('cancelled');
  if (dimensions && dimensions.width * dimensions.height > pixelBudget) {
    return unchanged('pixel-limit', { ...dimensions, pixelBudget });
  }

  // Large-image work is never attempted on the main UI thread. If no header
  // dimension is available, delegate decoding/guarding to the worker if eligible.
  if (pixelBudget > MAX_IMAGE_PIXELS && (!dimensions || dimensions.width * dimensions.height > MAX_IMAGE_PIXELS)) {
    return encodeInWorker(file, pixelBudget, { signal, onProgress });
  }

  let decoded;
  let canvas;
  try {
    decoded = await decodeImage(file);
    const { width, height } = decoded;
    if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
      return unchanged('pixel-limit', { width, height, pixelBudget: MAX_IMAGE_PIXELS });
    }
    if (signal?.aborted) return unchanged('cancelled', { width, height });
    canvas = document.createElement('canvas');
    // No resize: encoder quality is the only adjustment.
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return unchanged('browser-unavailable', { width, height });
    context.drawImage(decoded.source, 0, 0, width, height);
    let bestCandidateBytes = Infinity;
    let encoded = false;
    for (const quality of WEBP_QUALITIES) {
      if (signal?.aborted) return unchanged('cancelled', { width, height });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
      if (signal?.aborted) return unchanged('cancelled', { width, height });
      if (blob?.type !== 'image/webp' || !blob.size) continue;
      encoded = true;
      bestCandidateBytes = Math.min(bestCandidateBytes, blob.size);
      if (!shouldUseCompressedImage(file.size, blob.size)) continue;
      return {
        file: new File([blob], compressedImageName(file.name), {
          type: 'image/webp',
          lastModified: file.lastModified,
        }),
        optimized: true,
        originalBytes: file.size,
        width,
        height,
      };
    }
    if (!encoded) return unchanged('encode-unavailable', { width, height });
    return unchanged(
      bestCandidateBytes >= 2_000_000 && file.size >= 2_000_000
        ? 'still-too-large'
        : 'not-beneficial',
      { width, height, bestCandidateBytes },
    );
  } catch {
    return unchanged('encoding-failed');
  } finally {
    decoded?.release();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
