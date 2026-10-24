// Phase-in format checks: unchanged legacy files are exempt until deliberately reformatted.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const baselineCommit = 'e075f0c81f06991daacead87ad09e7a63abf417b';
const shouldFormat = (file) =>
  ['index.html', 'vite.config.js', 'package.json', '.prettierrc.json'].includes(file) ||
  /^\.github\/workflows\/[^/]+\.ya?ml$/.test(file) ||
  /^(src|tests|scripts)\/.*\.(js|mjs|css|html|json)$/.test(file);

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

let baselineTree;
try {
  baselineTree = git('ls-tree', '-r', '-z', baselineCommit);
} catch {
  console.error('Formatting baseline unavailable. Fetch full Git history (git fetch --unshallow).');
  process.exit(2);
}

const baseline = new Map();
for (const entry of baselineTree.split('\0')) {
  if (!entry) continue;
  const match = entry.match(/^[0-9]+ blob ([0-9a-f]{40})\t(.+)$/);
  if (match) baseline.set(match[2], match[1]);
}

const trackedFiles = git('ls-files', '-z').split('\0').filter(Boolean);
const filesToCheck = trackedFiles.filter((file) => {
  if (!shouldFormat(file)) return false;

  const bytes = readFileSync(file);
  const header = `blob ${bytes.length}\0`;
  const sha = createHash('sha1').update(header).update(bytes).digest('hex');

  return baseline.get(file) !== sha;
});

if (filesToCheck.length === 0) {
  console.log('Prettier: no new or modified tracked code files.');
  process.exit(0);
}

console.log(`Prettier checking ${filesToCheck.length} new/modified files.`);
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(command, ['--yes', 'prettier@3.6.2', '--check', ...filesToCheck], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
