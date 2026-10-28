/** Checks frontend/Edge syntax, scoped credential literals, and diff whitespace. */

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
const edgeFiles = files('supabase/functions').filter((p) => p.endsWith('.js'));
for (const file of [...files('src'), ...edgeFiles].filter((p) => p.endsWith('.js')))
  execFileSync(process.execPath, ['--check', file]);
for (const file of [...files('src'), 'index.html']) {
  const s = readFileSync(file, 'utf8');
  if (/sb_secret_|SUPABASE_SERVICE_ROLE_KEY|eyJhbGciOiJIUzI1Ni/.test(s))
    throw Error(`Unexpected secret/JWT in ${file}`);
}
// Server env names are legitimate; literal secret keys or complete JWTs are not.
for (const file of edgeFiles) {
  const source = readFileSync(file, 'utf8');
  if (/sb_secret_[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(source))
    throw Error(`Unexpected credential literal in ${file}`);
}
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
console.log(
  `Frontend/Edge syntax (${edgeFiles.length} Edge modules), scoped credential scan, diff whitespace: PASS`,
);
