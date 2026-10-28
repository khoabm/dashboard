/** Runs local staged export/authentication/verifier operations; never connects to a DB or uploads files. */
import { constants } from 'node:fs';
import { open, mkdir, lstat, readdir, unlink, rmdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { sha256, backupFiles } from './gradebook-backup.mjs';
import {
  limits,
  inventory,
  validateManifest,
  exportBackup,
  authenticateBackup,
  verifyRestored,
} from './gradebook-backup-production.mjs';

const checkoutRoot = await realpath(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
);

/** Refuses private data paths inside the actual checkout, including junction/symlink ancestors.
 * @param {string} candidate - An existing canonical path.
 */
function outsideCheckout(candidate) {
  const relative = path.relative(checkoutRoot, candidate);
  assert(relative.startsWith('..' + path.sep) || path.isAbsolute(relative));
}

/** Reads one bounded regular file; no symlink, device, stdout path or unconstrained allocation.
 * @param {string} file - The owner-controlled local path.
 * @param {number} maximum - Maximum bytes before allocation.
 * @returns {Promise<Buffer>} The exact file bytes, or a fixed failure.
 */
async function readBounded(file, maximum) {
  assert(typeof file === 'string' && path.isAbsolute(file));
  outsideCheckout(await realpath(file));
  const info = await lstat(file);
  assert(info.isFile() && !info.isSymbolicLink() && info.size > 0 && info.size <= maximum);
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const stat = await handle.stat();
    assert(stat.isFile() && stat.size === info.size && stat.size <= maximum);
    const buffer = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      assert(bytesRead > 0);
      offset += bytesRead;
    }
    const extra = Buffer.alloc(1);
    assert.equal((await handle.read(extra, 0, 1, offset)).bytesRead, 0);
    return buffer;
  } finally {
    await handle.close();
  }
}

/** Parses only bounded, strict UTF-8 JSON and clears its input byte buffer afterward.
 * @param {string} file - A private local JSON path.
 * @returns {Promise<object>} Parsed configuration or structured snapshot evidence.
 */
async function readJson(file) {
  const bytes = await readBounded(file, limits.json);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } finally {
    bytes.fill(0);
  }
}

/** Writes an exclusive result directory outside the checkout; receipt/result is the final completion marker.
 * @param {string} directory - A nonexistent directory under pre-approved private staging.
 * @param {object} files - Fixed output basenames and complete bytes.
 */
async function writeResult(directory, files) {
  assert(typeof directory === 'string' && path.isAbsolute(directory));
  outsideCheckout(path.resolve(directory));
  outsideCheckout(await realpath(path.dirname(directory)));
  // The existing parent must already have owner-only ACLs, including on Windows where modes are insufficient.
  const parent = await lstat(path.dirname(directory));
  assert(parent.isDirectory() && !parent.isSymbolicLink());
  await mkdir(directory, { mode: 0o700 });
  const created = [];
  try {
    for (const [name, bytes] of Object.entries(files)) {
      assert(name === path.basename(name));
      const handle = await open(path.join(directory, name), 'wx', 0o600);
      created.push(name);
      try {
        await handle.writeFile(bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
    }
  } catch {
    for (const name of created) await unlink(path.join(directory, name)).catch(() => {});
    await rmdir(directory).catch(() => {});
    throw new Error('backup_output_failed');
  }
}

/** Executes a single operation from an absolute control-file path, never from raw secret command arguments.
 * @param {string} operation - export, authenticate, open or verify-restored.
 * @param {object} control - Reviewed private paths, public recipients and native tool paths.
 * @returns {Promise<string>} A fixed scope-specific success category, without metadata or row values.
 */
async function run(operation, control) {
  const expected = await readJson(control.expectedFile);
  if (operation === 'export') {
    const dump = await readBounded(control.dumpFile, limits.archive);
    try {
      const staged = await readJson(control.metadataFile);
      assert.deepEqual(
        Object.keys(staged).sort(),
        [
          'format',
          'backupId',
          'createdAt',
          'project',
          'sourceCommit',
          'postgresMajor',
          'migrations',
          'snapshot',
        ].sort(),
      );
      const settings = await readJson(control.keyringsFile);
      const state = await readJson(control.stateFile);
      const manifest = {
        ...staged,
        settings,
        required: Object.fromEntries(
          Object.entries(settings).map(([purpose, ring]) => [
            purpose,
            Object.keys(ring.keys).sort(),
          ]),
        ),
        inventory: inventory(state),
        dumpSha256: sha256(dump),
      };
      // A staged source-key mismatch must fail before producing a candidate, not first at restore time.
      await verifyRestored(manifest, expected, state);
      const result = await exportBackup(
        dump,
        manifest,
        expected,
        control.recipients,
        control.tools,
      );
      await writeResult(control.outputDirectory, {
        ...result.files,
        'receipt.json': Buffer.from(JSON.stringify(result.receipt)),
      });
      return 'CANDIDATE_CREATED';
    } finally {
      dump.fill(0);
    }
  }
  if (operation === 'verify-restored') {
    const manifest = await readJson(control.manifestFile);
    await validateManifest(manifest, expected);
    await verifyRestored(manifest, expected, await readJson(control.stateFile));
    await writeResult(control.outputDirectory, {
      'verification.json': Buffer.from(
        JSON.stringify({
          dataVerification: 'RESTORED_DATA_CRYPTO_VERIFIED',
          permissionVerification: 'NOT_RUN',
          managedRecoveryVerification: 'NOT_RUN',
        }),
      ),
    });
    return 'RESTORED_DATA_CRYPTO_VERIFIED';
  }
  assert(['authenticate', 'open'].includes(operation));
  // Keep receipt separately trusted; the transfer directory must contain ciphertext only.
  const names = (await readdir(control.ciphertextDirectory)).sort();
  assert.deepEqual(names, [...backupFiles].sort());
  const files = {};
  for (const name of backupFiles)
    files[name] = await readBounded(
      path.join(control.ciphertextDirectory, name),
      limits.archive + 65536,
    );
  for (const file of Object.values(control.identities)) {
    const bytes = await readBounded(file, 4096);
    try {
      const lines = new TextDecoder('utf-8', { fatal: true })
        .decode(bytes)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
      assert.equal(lines.length, 1);
      assert.match(lines[0], /^AGE-SECRET-KEY-1[0-9A-Z]{58}$/);
    } finally {
      bytes.fill(0);
    }
  }
  const result = await authenticateBackup(
    files,
    await readJson(control.receiptFile),
    control.identities,
    expected,
    control.tools,
  );
  try {
    if (operation === 'open') {
      await writeResult(control.outputDirectory, {
        'authenticated.dump': result.dump,
        'manifest.private.json': Buffer.from(JSON.stringify(result.manifest)),
      });
      return 'AUTHENTICATED_STAGING_CREATED';
    }
    return 'AUTHENTICATED_PAIR_VERIFIED';
  } finally {
    result.dump.fill(0);
  }
}

try {
  assert.equal(process.argv.length, 4);
  const result = await run(process.argv[2], await readJson(process.argv[3]));
  console.log('PASS G07 ' + result + '; database recovery/cutover NOT APPROVED');
} catch {
  console.error('FAIL G07 backup operation; sensitive diagnostics suppressed; STOP without retry');
  process.exitCode = 1;
}
