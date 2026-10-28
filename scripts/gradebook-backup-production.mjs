/** Exports and authenticates bounded recovery packages from operator-staged snapshots, without a DB client. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createCrypto } from '../supabase/functions/_shared/crypto.js';
import { sha256, backupFiles } from './gradebook-backup.mjs';

export const limits = Object.freeze({ archive: 32 * 1024 * 1024, json: 4 * 1024 * 1024 });
const purposes = ['identity', 'lookup', 'capability', 'preview'];
export const tableNames = Object.freeze([
  'classes',
  'students',
  'student_scores',
  'subjects',
  'score_columns',
  'lookup_attempts',
]);
const digestPattern = /^[0-9a-f]{64}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Rejects extra/missing object fields before they can enter a secret-bearing manifest.
 * @param {object} value - The candidate record.
 * @param {string[]} names - The complete field allowlist.
 */
function fields(value, names) {
  assert(value && Object.getPrototypeOf(value) === Object.prototype);
  assert.deepEqual(Object.keys(value).sort(), [...names].sort());
}

/** Canonicalizes records and sorts keys without changing array order or decimal strings.
 * @param {*} value - JSON-compatible data.
 * @returns {string} Stable JSON for trusted local comparisons.
 */
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + canonical(value[key]))
        .join(',') +
      '}'
    );
  }
  assert(value === null || ['string', 'boolean', 'number'].includes(typeof value));
  if (typeof value === 'number') assert(Number.isSafeInteger(value));
  return JSON.stringify(value);
}

/** Bounds structured inputs before crypto, and avoids coercing score/ID strings to floating point.
 * @param {object} value - The input object.
 * @returns {Buffer} Bounded UTF-8 bytes.
 */
function jsonBytes(value) {
  const bytes = Buffer.from(canonical(value));
  assert(bytes.length > 0 && bytes.length <= limits.json);
  return bytes;
}

/** Captures all native output and supplies only minimal OS variables; no libpq/age plugin environment leaks.
 * @param {string} executable - A trusted local absolute executable path.
 * @param {string[]} args - Fixed options and public recipients or credential paths, never secret contents.
 * @param {Buffer} input - Bounded binary stdin.
 * @param {number} maxBuffer - Maximum subprocess output bytes.
 * @returns {Buffer} Complete stdout only after successful exit and empty stderr.
 */
export function native(executable, args, input, maxBuffer = limits.archive + 65536) {
  let result;
  try {
    assert(typeof executable === 'string' && /^(?:[A-Za-z]:[\\/]|\/)/.test(executable));
    const env = Object.fromEntries(
      ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH']
        .filter((key) => process.env[key])
        .map((key) => [key, process.env[key]]),
    );
    env.LC_ALL = 'C';
    result = spawnSync(executable, args, {
      input,
      env,
      timeout: 30000,
      maxBuffer,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    assert(
      !result.error && result.status === 0 && result.signal === null && result.stderr.length === 0,
    );
    return result.stdout;
  } catch {
    result?.stdout?.fill(0);
    throw new Error('backup_native_failed');
  } finally {
    result?.stderr?.fill(0);
  }
}

/** Checks a custom archive with native pg_restore without connecting to any database or executing SQL.
 * @param {Buffer} dump - The complete custom-format archive.
 * @param {object} tools - Trusted absolute pgRestore executable path.
 * @returns {void} Returns after TOC and complete SQL decoding; SQL execution still requires an isolated restore.
 */
export function inspectArchive(dump, tools) {
  assert(Buffer.isBuffer(dump) && dump.length > 32 && dump.length <= limits.archive);
  assert.equal(dump.subarray(0, 5).toString(), 'PGDMP');
  const version = native(tools.pgRestore, ['--version'], undefined, 4096).toString();
  assert.match(version, /\b17\.\d+/);
  const listing = native(tools.pgRestore, ['--list'], dump, limits.json).toString();
  assert.match(listing, /Format: CUSTOM/);
  assert.match(listing, /Dumped from database version: 17\./);
  for (const name of tableNames) {
    assert(new RegExp(' TABLE gradebook ' + name + ' ').test(listing));
  }
  // Decode every data block without executing SQL; list-only parsing cannot detect truncated row blocks.
  const decoded = native(tools.pgRestore, ['--file=-'], dump, limits.archive);
  decoded.fill(0);
}

/** Builds a reproducible inventory from all six tables and normalized permission metadata.
 * @param {object} state - Bounded tables with string-or-null column values, and ordered security metadata.
 * @returns {object} Private row counts, hashes and referenced key versions; no plaintext identities.
 */
export function inventory(state) {
  fields(state, ['tables', 'security']);
  fields(state.tables, tableNames);
  fields(state.security, ['objects', 'schemas', 'routines', 'policies', 'defaults']);
  jsonBytes(state);
  const tables = {};
  for (const name of tableNames) {
    const rows = state.tables[name];
    assert(Array.isArray(rows) && rows.length <= 10000);
    for (const row of rows) {
      assert(row && !Array.isArray(row) && Object.keys(row).length > 0);
      for (const value of Object.values(row)) assert(value === null || typeof value === 'string');
    }
    const sorted = rows.map(canonical).sort();
    assert.equal(new Set(sorted).size, sorted.length);
    tables[name] = { count: rows.length, sha256: sha256(Buffer.from(canonical(sorted))) };
  }
  const identity = [...new Set(state.tables.students.map((row) => row.identity_enc_kid))].sort();
  const lookup = [
    ...new Set(
      [...state.tables.students, ...state.tables.classes].map((row) => row.lookup_key_version),
    ),
  ].sort();
  for (const kid of identity) assert(typeof kid === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(kid));
  for (const kid of lookup)
    assert(typeof kid === 'string' && /^[1-9][0-9]{0,9}$/.test(kid) && Number(kid) <= 2147483647);
  const security = Object.fromEntries(
    Object.entries(state.security).map(([name, rows]) => {
      assert(Array.isArray(rows));
      return [name, sha256(Buffer.from(canonical(rows.map(canonical).sort())))];
    }),
  );
  return { tables, security, referenced: { identity, lookup } };
}

/** Validates reviewed source correspondence and complete active/retained keyrings.
 * @param {object} manifest - The authenticated private recovery contract.
 * @param {object} expected - Independently reviewed project, source SHA and exact ledger/file mapping.
 * @returns {Promise<void>} Rejects incomplete or mismatched inputs with no caller values in its error.
 */
export async function validateManifest(manifest, expected) {
  try {
    fields(expected, ['project', 'sourceCommit', 'migrations', 'keyInventory']);
    fields(manifest, [
      'format',
      'backupId',
      'createdAt',
      'project',
      'sourceCommit',
      'postgresMajor',
      'migrations',
      'snapshot',
      'dumpSha256',
      'settings',
      'required',
      'inventory',
    ]);
    assert.equal(manifest.format, 'gb-recovery-v1');
    assert.match(manifest.backupId, uuidPattern);
    assert.equal(new Date(manifest.createdAt).toISOString(), manifest.createdAt);
    assert.match(manifest.project, /^[a-z0-9]{1,64}$/);
    assert.match(manifest.sourceCommit, /^[0-9a-f]{40}$/);
    assert.equal(manifest.postgresMajor, 17);
    assert.match(manifest.dumpSha256, digestPattern);
    assert.equal(manifest.project, expected.project);
    assert.equal(manifest.sourceCommit, expected.sourceCommit);
    assert.equal(canonical(manifest.migrations), canonical(expected.migrations));
    assert(
      Array.isArray(manifest.migrations) &&
        manifest.migrations.length > 0 &&
        manifest.migrations.length <= 128,
    );
    const ledger = new Set(),
      files = new Set();
    for (const migration of manifest.migrations) {
      fields(migration, ['ledgerVersion', 'file', 'sha256']);
      assert.match(migration.ledgerVersion, /^[0-9]{14}$/);
      assert.match(migration.file, /^[0-9]{14}_[a-z0-9_]+\.sql$/);
      assert.match(migration.sha256, digestPattern);
      assert(!ledger.has(migration.ledgerVersion) && !files.has(migration.file));
      ledger.add(migration.ledgerVersion);
      files.add(migration.file);
    }
    fields(manifest.snapshot, ['id', 'method', 'keysFrozen', 'evidenceId']);
    assert.match(manifest.snapshot.id, /^[0-9A-F]{8}-[0-9A-F]{8}-[0-9]+$/);
    assert.equal(manifest.snapshot.method, 'pg_export_snapshot');
    assert.equal(manifest.snapshot.keysFrozen, true);
    assert.match(manifest.snapshot.evidenceId, uuidPattern);
    fields(manifest.settings, purposes);
    fields(manifest.required, purposes);
    fields(expected.keyInventory, purposes);
    await createCrypto(manifest.project, manifest.settings);
    for (const purpose of purposes) {
      const keys = Object.keys(manifest.settings[purpose].keys).sort();
      const trusted = expected.keyInventory[purpose];
      fields(trusted, ['active', 'kids', 'sha256']);
      assert.equal(manifest.settings[purpose].active, trusted.active);
      assert.equal(canonical(keys), canonical(trusted.kids));
      assert.equal(sha256(jsonBytes(manifest.settings[purpose])), trusted.sha256);
      assert(Array.isArray(manifest.required[purpose]));
      // Preserve every supplied retained version, including versions needed only by previous backups.
      assert.equal(canonical(manifest.required[purpose]), canonical(keys));
    }
    fields(manifest.inventory, ['tables', 'security', 'referenced']);
    fields(manifest.inventory.tables, tableNames);
    fields(manifest.inventory.security, ['objects', 'schemas', 'routines', 'policies', 'defaults']);
    fields(manifest.inventory.referenced, ['identity', 'lookup']);
    for (const value of Object.values(manifest.inventory.tables)) {
      fields(value, ['count', 'sha256']);
      assert(Number.isSafeInteger(value.count) && value.count >= 0 && value.count <= 10000);
      assert.match(value.sha256, digestPattern);
    }
    for (const digest of Object.values(manifest.inventory.security))
      assert.match(digest, digestPattern);
    for (const purpose of ['identity', 'lookup']) {
      const refs = manifest.inventory.referenced[purpose];
      assert(Array.isArray(refs) && refs.length <= 16 && new Set(refs).size === refs.length);
      for (const kid of refs) assert(manifest.required[purpose].includes(kid));
    }
    jsonBytes(manifest);
  } catch {
    throw new Error('backup_manifest_failed');
  }
}

/** Packages a reviewed custom archive and private manifest under independent native age recipients.
 * @param {Buffer} dump - An operator-staged archive from the recorded exported snapshot.
 * @param {object} manifest - Reviewed snapshot metadata, inventory and existing four keyrings.
 * @param {object} expected - Independent project/source/migration expectations.
 * @param {object} recipients - Separate database and keyrings native X25519 public recipients.
 * @param {object} tools - Trusted absolute age and pgRestore executable paths.
 * @returns {Promise<object>} Ciphertexts plus a CANDIDATE receipt; never a recovery PASS.
 */
export async function exportBackup(dump, manifest, expected, recipients, tools) {
  try {
    await validateManifest(manifest, expected);
    fields(recipients, ['database', 'keyrings']);
    for (const value of Object.values(recipients)) assert.match(value, /^age1[0-9a-z]{58}$/);
    assert.notEqual(recipients.database, recipients.keyrings);
    assert.equal(sha256(dump), manifest.dumpSha256);
    inspectArchive(dump, tools);
    const bytes = jsonBytes(manifest);
    let files;
    try {
      files = {
        'database.dump.age': native(tools.age, ['--encrypt', '-r', recipients.database], dump),
        'keyrings.json.age': native(tools.age, ['--encrypt', '-r', recipients.keyrings], bytes),
      };
    } finally {
      bytes.fill(0);
    }
    const receipt = {
      format: 'gb-receipt-v1',
      backupId: manifest.backupId,
      files: Object.fromEntries(
        backupFiles.map((name) => [
          name,
          { bytes: files[name].length, sha256: sha256(files[name]) },
        ]),
      ),
      verification: 'CANDIDATE_UNVERIFIED',
      remoteVerification: 'NOT_RUN',
      databaseRecoveryVerification: 'NOT_RUN',
    };
    return { files, receipt };
  } catch {
    throw new Error('backup_export_failed');
  }
}

/** Authenticates both ciphertexts against an independent receipt before exposing any restore bytes.
 * @param {object} files - Exactly two complete ciphertext buffers.
 * @param {object} receipt - Independently trusted immutable candidate receipt.
 * @param {object} identities - Separate restricted local database/keyrings identity paths.
 * @param {object} expected - Reviewed project/source/migration expectations.
 * @param {object} tools - Trusted absolute age and pgRestore executable paths.
 * @returns {Promise<object>} Authenticated dump and manifest; no SQL is executed and receipt is unchanged.
 */
export async function authenticateBackup(files, receipt, identities, expected, tools) {
  let dump, bytes;
  try {
    fields(files, backupFiles);
    fields(identities, ['database', 'keyrings']);
    assert.notEqual(identities.database, identities.keyrings);
    fields(receipt, [
      'format',
      'backupId',
      'files',
      'verification',
      'remoteVerification',
      'databaseRecoveryVerification',
    ]);
    assert.equal(receipt.format, 'gb-receipt-v1');
    assert.equal(receipt.verification, 'CANDIDATE_UNVERIFIED');
    assert.equal(receipt.remoteVerification, 'NOT_RUN');
    assert.equal(receipt.databaseRecoveryVerification, 'NOT_RUN');
    fields(receipt.files, backupFiles);
    for (const name of backupFiles) {
      fields(receipt.files[name], ['bytes', 'sha256']);
      assert(
        Buffer.isBuffer(files[name]) &&
          files[name].length > 0 &&
          files[name].length <= limits.archive + 65536,
      );
      assert.equal(files[name].length, receipt.files[name].bytes);
      assert.equal(sha256(files[name]), receipt.files[name].sha256);
    }
    bytes = native(
      tools.age,
      ['--decrypt', '-i', identities.keyrings],
      files['keyrings.json.age'],
      limits.json,
    );
    const manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    await validateManifest(manifest, expected);
    assert.equal(manifest.backupId, receipt.backupId);
    dump = native(
      tools.age,
      ['--decrypt', '-i', identities.database],
      files['database.dump.age'],
      limits.archive,
    );
    assert.equal(sha256(dump), manifest.dumpSha256);
    inspectArchive(dump, tools);
    return { dump, manifest };
  } catch {
    dump?.fill(0);
    throw new Error('backup_authentication_failed');
  } finally {
    bytes?.fill(0);
  }
}

/** Verifies restored private inventory and every identifier with the unchanged application crypto contract.
 * @param {object} manifest - Previously authenticated private manifest.
 * @param {object} expected - Independent reviewed source mapping.
 * @param {object} restored - Fresh read-only extraction from the authorized isolated restored DB.
 * @returns {Promise<object>} A narrow data/crypto result; effective-role checks and cutover remain separate.
 */
export async function verifyRestored(manifest, expected, restored) {
  try {
    await validateManifest(manifest, expected);
    assert.equal(canonical(inventory(restored)), canonical(manifest.inventory));
    const cryptography = await createCrypto(manifest.project, manifest.settings);
    for (const row of restored.tables.students) {
      const envelope = {
        classId: row.class_id,
        ciphertext: row.identity_ciphertext?.replace(/^\\x/, ''),
        nonce: row.identity_nonce?.replace(/^\\x/, ''),
        encKid: row.identity_enc_kid,
        algVersion: Number(row.identity_alg_version),
        identityLookup: row.identity_lookup?.replace(/^\\x/, ''),
        lookupKeyVersion: Number(row.lookup_key_version),
      };
      // reveal also recomputes the stored generation's blind index; never log the returned identifier.
      await cryptography.reveal(envelope, row.class_id);
    }
    return {
      dataVerification: 'RESTORED_DATA_CRYPTO_VERIFIED',
      permissionVerification: 'NOT_RUN',
      managedRecoveryVerification: 'NOT_RUN',
    };
  } catch {
    throw new Error('backup_restore_verification_failed');
  }
}
