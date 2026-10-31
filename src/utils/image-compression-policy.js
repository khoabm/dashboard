/** Shared safe, pure policies for browser-local image compression. */

import { MAX_BYTES } from './validation.js';

export const MAX_SOURCE_IMAGE_BYTES = 12_000_000;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_HIGH_RES_IMAGE_PIXELS = 60_000_000;
export const WEBP_QUALITIES = [0.82, 0.72, 0.62, 0.5];

const IMAGE_MIME = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
]);

export function isOptimizableImage(file) {
  return IMAGE_MIME.get(file.name.toLowerCase().split('.').pop()) === file.type;
}

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

export function compressedImageName(name) {
  return name.replace(/\.(?:jpe?g|png|webp)$/i, '') + '.webp';
}

/**
 * A high-resolution encoding needs worker isolation AND enough reported capacity.
 * A missing memory estimate alone is not proof that a touch device can handle 49 MP.
 * All paths preserve at least the previous 24 MP bound.
 *
 * @param {object} capability - Browser support and advisory device capacity.
 * @returns {number} Maximum decoded pixels permitted for one encode.
 */
export function compressionPixelBudget({
  workerAvailable = false,
  memoryGB,
  cores,
  maxTouchPoints,
} = {}) {
  if (!workerAvailable) return MAX_IMAGE_PIXELS;
  if (Number.isFinite(memoryGB)) {
    if (memoryGB >= 8 && cores >= 4) return MAX_HIGH_RES_IMAGE_PIXELS;
    if (memoryGB >= 4 && cores >= 4) return 32_000_000;
    return MAX_IMAGE_PIXELS;
  }
  // Desktop Safari/Firefox may omit deviceMemory. Avoid assuming mobile RAM from CPU count.
  if (cores >= 8 && maxTouchPoints === 0) return MAX_HIGH_RES_IMAGE_PIXELS;
  return MAX_IMAGE_PIXELS;
}

/** Parse JPEG SOF / PNG IHDR without allocating decoded pixel memory. */
export function sniffImageDimensions(bytes, mime) {
  if (!(bytes instanceof Uint8Array)) return null;
  if (mime === 'image/png') {
    if (
      bytes.length < 24 ||
      bytes[0] !== 0x89 ||
      bytes[1] !== 0x50 ||
      bytes[2] !== 0x4e ||
      bytes[3] !== 0x47
    )
      return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    return width && height ? { width, height } : null;
  }
  if (mime !== 'image/jpeg' || bytes.length < 8 || bytes[0] !== 0xff || bytes[1] !== 0xd8)
    return null;

  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const size = (bytes[offset] << 8) | bytes[offset + 1];
    if (size < 2 || offset + size > bytes.length) break;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && size >= 7) {
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return width && height ? { width, height } : null;
    }
    offset += size;
  }
  return null;
}
