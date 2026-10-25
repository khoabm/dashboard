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
      assert(/^(assets|placeholders)(\/|$)/.test(name), `Unexpected output directory: ${name}`);
      await checkDirectory(file, name);
    } else if (name.startsWith('placeholders/')) {
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
console.log('Production output: application assets only; no test/source directories: PASS');
