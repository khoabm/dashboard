/** Checks source syntax, accidental client secrets, and whitespace in the current diff. */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Lists files recursively for syntax and credential scanning.
 *
 * @param {string} dir - The directory to traverse.
 * @returns {string[]} Descendant file paths.
 */
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}
for (const file of files('src').filter((p) => p.endsWith('.js')))
  execFileSync(process.execPath, ['--check', file]);
for (const file of [...files('src'), 'index.html']) {
  const s = readFileSync(file, 'utf8');
  if (/sb_secret_|SUPABASE_SERVICE_ROLE_KEY|eyJhbGciOiJIUzI1Ni/.test(s))
    throw Error(`Unexpected secret/JWT in ${file}`);
}
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
console.log('Syntax, client credential scan, diff whitespace: PASS');
