/** Restores only newly generated synthetic keyrings from stdin in a fresh Linux process. */
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { connect } from './native-adapter.mjs';
import { createCrypto } from '../../supabase/functions/_shared/crypto.js';

try {
  let input = '';
  for await (const part of process.stdin) input += part;
  const envelope = JSON.parse(input);
  input = '';
  const wrapping = await webcrypto.subtle.importKey(
    'raw',
    Buffer.from(envelope.wrapping, 'base64'),
    'AES-GCM',
    false,
    ['decrypt'],
  );
  const settings = JSON.parse(
    Buffer.from(
      await webcrypto.subtle.decrypt(
        { name: 'AES-GCM', iv: Buffer.from(envelope.iv, 'base64') },
        wrapping,
        Buffer.from(envelope.wrapped, 'base64'),
      ),
    ).toString(),
  );
  const cryptography = await createCrypto('syntheticprojectref01', settings);
  const db = await connect('gbqa_recovery');
  try {
    const student = (
      await db.query(
        'SELECT encode(identity_ciphertext,\'hex\') ciphertext,encode(identity_nonce,\'hex\') nonce,identity_enc_kid AS "encKid",identity_alg_version AS "algVersion",encode(identity_lookup,\'hex\') AS "identityLookup",lookup_key_version AS "lookupKeyVersion",class_id::text AS "classId" FROM gradebook.students WHERE id=$1 AND class_id=$2',
        [envelope.sid, envelope.cid],
      )
    ).rows[0];
    assert.equal(await cryptography.reveal(student, envelope.cid), '000000000009');
    assert.equal(
      await cryptography.lookup(envelope.cid, 1, '000000000009'),
      student.identityLookup,
    );
    assert.equal(
      (await db.query('SELECT count(*)::int n FROM gradebook.student_scores')).rows[0].n,
      1,
    );
    assert.equal(
      (await db.query('SELECT score::text value FROM gradebook.student_scores')).rows[0].value,
      '8.25',
    );
    for (const purpose of ['identity', 'lookup', 'capability', 'preview'])
      assert.deepEqual(
        [settings[purpose].active, Object.keys(settings[purpose].keys)],
        ['2', ['1', '2']],
      );
    assert.equal(
      (await cryptography.capability(envelope.capability, envelope.time)).studentId,
      envelope.sid,
    );
    await cryptography.preview(
      envelope.signedPreview,
      envelope.binding,
      'synthetic-input',
      envelope.time,
    );
    assert.equal((await cryptography.encryptIdentity(envelope.cid, 1, '000000000009')).encKid, '2');
  } finally {
    await db.end();
  }
} catch {
  console.error('FAIL isolated synthetic restore; sensitive details suppressed');
  process.exitCode = 1;
}
