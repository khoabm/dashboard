/** Encrypts bounded synthetic recovery inputs with age; contains no database or upload client. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createCrypto } from '../supabase/functions/_shared/crypto.js';

export const syntheticProject = 'syntheticprojectref01';
export const backupFiles = ['database.dump.age', 'keyrings.json.age'];
const maxBytes = 32 * 1024 * 1024;
const purposes = ['identity', 'lookup', 'capability', 'preview'];

/** Computes a transport checksum; callers must keep the expected value in trusted custody.
 * @param {Buffer} bytes - The complete encrypted or plaintext input.
 * @returns {string} A lowercase SHA-256 digest.
 */
export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Captures all age diagnostics so a failure cannot print decrypted material or credentials.
 * @param {string[]} args - Explicit CLI arguments; private identity contents never enter argv.
 * @param {Buffer} input - Bounded stdin bytes.
 * @returns {Buffer} Complete output, available only after successful authentication.
 */
function age(args, input) {
  try {
    assert(Buffer.isBuffer(input) && input.length > 0 && input.length <= maxBytes);
    return execFileSync(process.env.GB_AGE_BIN || 'age', args, {
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
      maxBuffer: maxBytes,
    });
  } catch {
    throw new Error('recovery_failed');
  }
}

/** Checks retained versions and the unchanged runtime crypto contract before encryption/restore.
 * @param {object} manifest - Synthetic key export with all four keyrings and version inventory.
 * @returns {Promise<void>} Resolves only for a complete synthetic recovery contract.
 */
async function validate(manifest) {
  assert.equal(manifest.format, 'gb-synthetic-recovery-v1');
  assert.equal(manifest.synthetic, true);
  assert.equal(manifest.project, syntheticProject);
  assert.match(manifest.backupId, /^[0-9a-f-]{36}$/);
  assert.match(manifest.sourceCommit, /^[0-9a-f]{40}$/);
  assert.match(manifest.dumpSha256, /^[0-9a-f]{64}$/);
  assert.equal(manifest.postgresMajor, 17);
  assert(Object.keys(manifest.migrations).length > 0);
  for (const digest of Object.values(manifest.migrations)) assert.match(digest, /^[0-9a-f]{64}$/);
  assert.deepEqual(Object.keys(manifest.settings).sort(), [...purposes].sort());
  assert.deepEqual(Object.keys(manifest.required).sort(), [...purposes].sort());
  await createCrypto(syntheticProject, manifest.settings);
  for (const purpose of purposes) {
    const ring = manifest.settings[purpose];
    assert(Array.isArray(manifest.required[purpose]) && manifest.required[purpose].length > 0);
    for (const kid of manifest.required[purpose]) assert(Object.hasOwn(ring.keys, kid));
    assert(Object.hasOwn(ring.keys, ring.active));
  }
}

/** Produces two separately encrypted files; never writes plaintext or contacts a service.
 * @param {Buffer} dump - A newly generated synthetic PostgreSQL custom archive.
 * @param {object} manifest - Synthetic keyrings, snapshot binding and required versions.
 * @param {{database: string, keyrings: string}} recipients - Separate native age recipients.
 * @returns {Promise<object>} Encrypted buffers and their transport checksums.
 */
export async function sealBackup(dump, manifest, recipients) {
  await validate(manifest);
  assert.equal(dump.subarray(0, 5).toString(), 'PGDMP');
  assert.equal(sha256(dump), manifest.dumpSha256);
  for (const recipient of Object.values(recipients)) assert.match(recipient, /^age1[0-9a-z]{58}$/);
  assert.notEqual(recipients.database, recipients.keyrings);
  const files = {
    'database.dump.age': age(['--encrypt', '--recipient', recipients.database], dump),
    'keyrings.json.age': age(
      ['--encrypt', '--recipient', recipients.keyrings],
      Buffer.from(JSON.stringify(manifest)),
    ),
  };
  return {
    files,
    expected: Object.fromEntries(backupFiles.map((name) => [name, sha256(files[name])])),
  };
}

/** Validates the upload candidate locally; this function has no upload mode or network access.
 * @param {object} files - Exactly two complete encrypted buffers.
 * @param {object} expected - Checksums obtained from a trusted backup receipt.
 * @param {number} availableBytes - Owner-reserved free storage budget, never a purchased fallback.
 * @returns {object[]} Safe file names, byte counts and encrypted checksums only.
 */
export function planTransfer(files, expected, availableBytes) {
  assert.deepEqual(Object.keys(files).sort(), [...backupFiles].sort());
  assert(Number.isSafeInteger(availableBytes) && availableBytes >= 0);
  const plan = backupFiles.map((name) => {
    const bytes = files[name];
    assert(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= maxBytes);
    assert(bytes.subarray(0, 64).toString().startsWith('age-encryption.org/v1\n'));
    assert.equal(sha256(bytes), expected[name]);
    return { name, bytes: bytes.length, sha256: expected[name] };
  });
  assert(plan.reduce((sum, file) => sum + file.bytes, 0) <= availableBytes);
  return plan;
}

/** Authenticates both entire files before releasing a dump to a restore caller.
 * @param {object} files - Encrypted buffers from the approved receipt.
 * @param {{database: string, keyrings: string}} identities - Independently held identity file paths.
 * @param {object} expected - Independently recorded encrypted-file digests.
 * @returns {Promise<{dump: Buffer, manifest: object}>} Fully authenticated synthetic restore input.
 * @throws {Error} A generic failure with no subprocess diagnostics or secret values.
 */
export async function openBackup(files, identities, expected) {
  try {
    planTransfer(files, expected, maxBytes * 2);
    const manifest = JSON.parse(
      age(['--decrypt', '--identity', identities.keyrings], files['keyrings.json.age']).toString(),
    );
    await validate(manifest);
    const dump = age(['--decrypt', '--identity', identities.database], files['database.dump.age']);
    assert.equal(dump.subarray(0, 5).toString(), 'PGDMP');
    assert.equal(sha256(dump), manifest.dumpSha256);
    return { dump, manifest };
  } catch {
    throw new Error('recovery_failed');
  }
}
