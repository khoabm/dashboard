/** Bounds actual ZIP output before an XLSX reader sees it; no archive entry is written to disk. */
import { Unzip, UnzipInflate } from 'fflate';

export function rosterArchive(input) {
  if (input.length < 22 || input[0] !== 80 || input[1] !== 75) throw Error('archive');
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  let end = -1;
  for (let i = input.length - 22; i >= Math.max(0, input.length - 65557); i--) {
    if (
      view.getUint32(i, true) === 0x06054b50 &&
      i + 22 + view.getUint16(i + 20, true) === input.length
    ) {
      end = i;
      break;
    }
  }
  if (
    end < 0 ||
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    view.getUint16(end + 10, true) > 200 ||
    view.getUint32(end + 16, true) + view.getUint32(end + 12, true) > end
  )
    throw Error('archive');
  const files = Object.create(null);
  let entries = 0,
    total = 0,
    failure;
  const fail = () => {
    failure = Error('archive');
    throw failure;
  };
  const unzip = new Unzip((file) => {
    if (
      ++entries > 200 ||
      /(^|[\\/])\.\.([\\/]|$)|^[/\\]|\0/.test(file.name) ||
      file.originalSize > 8388608 ||
      Object.hasOwn(files, file.name)
    )
      fail();
    const chunks = [];
    let size = 0;
    file.ondata = (error, chunk, final) => {
      if (error) fail();
      size += chunk.length;
      total += chunk.length;
      if (size > 8388608 || total > 16777216) {
        file.terminate();
        fail();
      }
      chunks.push(chunk);
      if (final) {
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const part of chunks) {
          bytes.set(part, offset);
          offset += part.length;
        }
        files[file.name] = bytes;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < input.length; offset += 512) {
    unzip.push(input.subarray(offset, offset + 512), offset + 512 >= input.length);
    if (failure) throw failure;
  }
  if (
    entries !== view.getUint16(end + 10, true) ||
    !files['xl/workbook.xml'] ||
    !files['xl/_rels/workbook.xml.rels']
  )
    throw Error('workbook');
  return files;
}
