/** Rejects source, fixtures and unexpected files in the deployable static directory. */

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/** Validates each output file and compares public placeholders with their source bytes. */
async function checkDirectory(directory = 'dist', relative = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    const file = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), `Unexpected production symlink: ${name}`);
    if (entry.isDirectory()) {
      assert(
        /^(assets|placeholders|icons)(\/|$)/.test(name),
        `Unexpected output directory: ${name}`,
      );
      await checkDirectory(file, name);
    } else if (name.startsWith('placeholders/') || name.startsWith('icons/')) {
      assert.deepEqual(await readFile(file), await readFile(path.join('public', name)));
    } else if (
      ['third-party-notices.txt', 'manifest.webmanifest', 'offline.html', 'sw.js'].includes(name)
    ) {
      assert.deepEqual(await readFile(file), await readFile(path.join('public', name)));
    } else {
      assert(
        name === 'index.html' || /^assets\/[^/]+-[\w-]+\.(js|css)$/.test(name),
        `Unexpected production file: ${name}`,
      );
    }
  }
}

await checkDirectory();
await readFile('dist/index.html');
for (const file of [
  'manifest.webmanifest',
  'sw.js',
  'offline.html',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
])
  await readFile(path.join('dist', file));
console.log('Production output: application assets only; no test/source directories: PASS');
