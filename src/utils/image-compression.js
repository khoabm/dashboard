/** Compresses supported Board images in the browser without network or new dependencies. */

import { MAX_BYTES } from './validation.js';

export const MAX_SOURCE_IMAGE_BYTES = 12_000_000;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_IMAGE_EDGE = 1600;
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
 * Opens local pixels for Canvas drawing; releases any decoder or object URL afterward.
 *
 * @param {File} file - A signed-off image candidate.
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
      // Some Safari/iOS versions cannot create a bitmap from every supported image.
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
 * Re-encodes JPG, PNG or WebP locally if it substantially saves bytes.
 * Returns the untouched original when unsupported, unsafe or not smaller.
 * Callers must verify the result again before storing it.
 *
 * @param {File} file - Image selected in the existing FilePicker.
 * @returns {Promise<{file: File, optimized: boolean, originalBytes: number}>}
 */
export async function optimizeImage(file) {
  const unchanged = { file, optimized: false, originalBytes: file.size };
  if (
    !isOptimizableImage(file) ||
    file.size < 50_000 ||
    file.size > MAX_SOURCE_IMAGE_BYTES ||
    typeof document === 'undefined'
  ) {
    return unchanged;
  }

  let decoded;
  let canvas;
  try {
    decoded = await decodeImage(file);
    const { width, height } = decoded;
    if (!width || !height || width * height > MAX_IMAGE_PIXELS) return unchanged;
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return unchanged;
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
    if (blob?.type !== 'image/webp' || !shouldUseCompressedImage(file.size, blob.size)) {
      return unchanged;
    }
    return {
      file: new File([blob], compressedImageName(file.name), {
        type: 'image/webp',
        lastModified: file.lastModified,
      }),
      optimized: true,
      originalBytes: file.size,
    };
  } catch {
    // Codec errors must not destroy the selected original or trigger a remote upload.
    return unchanged;
  } finally {
    decoded?.release();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
