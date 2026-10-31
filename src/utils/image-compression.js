/** Re-encodes Board images locally at their original pixel dimensions, without network access. */

import { MAX_BYTES } from './validation.js';

export const MAX_SOURCE_IMAGE_BYTES = 12_000_000;
export const MAX_IMAGE_PIXELS = 24_000_000;
const WEBP_QUALITIES = [0.82, 0.72, 0.62, 0.5];
const IMAGE_MIME = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
]);

/**
 * Recognizes only declared image formats whose filename matches their MIME type.
 *
 * @param {File} file - The user-selected original file.
 * @returns {boolean} Whether this file is eligible for local image optimization.
 */
export function isOptimizableImage(file) {
  const extension = file.name.toLowerCase().split('.').pop();
  return IMAGE_MIME.get(extension) === file.type;
}

/**
 * Keeps only useful, valid, smaller re-encodings; never widens the Storage size limit.
 *
 * @param {number} originalSize - Original file bytes.
 * @param {number} candidateSize - Re-encoded WebP bytes.
 * @returns {boolean} Whether to use the encoded image instead of the original.
 */
export function shouldUseCompressedImage(originalSize, candidateSize) {
  return (
    Number.isFinite(originalSize) &&
    Number.isFinite(candidateSize) &&
    originalSize > 0 &&
    candidateSize > 0 &&
    candidateSize < MAX_BYTES &&
    candidateSize < originalSize &&
    (originalSize >= MAX_BYTES ||
      (candidateSize <= originalSize * 0.9 && originalSize - candidateSize >= 20_000))
  );
}

/**
 * Produces an extension matching a WebP re-encoding without altering the source name.
 *
 * @param {string} name - Original image filename.
 * @returns {string} The filename used for the optimized image.
 */
export function compressedImageName(name) {
  return name.replace(/\.(?:jpe?g|png|webp)$/i, '') + '.webp';
}

/**
 * Opens local pixels for Canvas drawing; releases its decoder and object URL afterward.
 *
 * @param {File} file - An image whose existing signature check passed.
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
      // Some Safari/iOS versions cannot decode every image through createImageBitmap.
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
 * Re-encodes JPG, PNG or WebP at the exact decoded pixel resolution.
 * Tries progressively lower WebP quality only when necessary to meet the existing
 * size requirement; never scales, crops or stretches the original pixels.
 * Callers must validate the returned file and its signature before storage.
 *
 * @param {File} file - Original image selected in the existing FilePicker.
 * @returns {Promise<{file: File, optimized: boolean, originalBytes: number, reason?: string, bestCandidateBytes?: number, width?: number, height?: number}>}
 */
export async function optimizeImage(file) {
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
  if (typeof document === 'undefined') return unchanged('browser-unavailable');

  let decoded;
  let canvas;
  try {
    decoded = await decodeImage(file);
    const { width, height } = decoded;
    if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
      return unchanged('pixel-limit', { width, height });
    }
    canvas = document.createElement('canvas');
    // Keep the decoded image's original width and height; quality is the only tuning knob.
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return unchanged('browser-unavailable', { width, height });
    context.drawImage(decoded.source, 0, 0, width, height);

    let bestCandidateBytes = Infinity;
    let encoded = false;
    for (const quality of WEBP_QUALITIES) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
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
      bestCandidateBytes >= MAX_BYTES && file.size >= MAX_BYTES
        ? 'still-too-large'
        : 'not-beneficial',
      { width, height, bestCandidateBytes },
    );
  } catch {
    // Codec or memory errors must not destroy the original or bypass the size policy.
    return unchanged('encoding-failed');
  } finally {
    decoded?.release();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
