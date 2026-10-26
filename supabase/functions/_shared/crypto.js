/** Purpose-separated Web Crypto keyrings, identity envelopes and short-lived tokens. */
import { allowFields, bigintId, documentNumber, frameTuple, uuid, requireContract } from './contracts.js';
import { Failure } from './http.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const kidPattern = /^[A-Za-z0-9_-]{1,32}$/;

/** Canonical unpadded base64url avoids ambiguous token spellings. */
export function encode64(bytes) {
  let binary = '';
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** Decodes only bounded, canonical base64url text. */
export function decode64(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 16384) throw Error();
  const bytes = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
  if (encode64(bytes) !== value) throw Error();
  return bytes;
}

/** Strict UTF-8 is shared by JWT and token decoding. */
export function decodeJson(bytes) { return JSON.parse(decoder.decode(bytes)); }

/** Digests and identity bytes use lowercase hex at the trusted SQL boundary. */
export function hex(bytes) { return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''); }

/** Validates length before allocating binary identity material. */
function unhex(value, min, max = min) {
  if (typeof value !== 'string' || value.length < min * 2 || value.length > max * 2 || !/^([0-9a-f]{2})+$/.test(value)) throw Error();
  return Uint8Array.from(value.match(/../g), (byte) => parseInt(byte, 16));
}

/** The DB key generation selects the lookup key, never a browser field or current active kid. */
function generation(value) {
  if (!Number.isInteger(value) || value < 1 || value > 2147483647) throw Error();
  return String(value);
}

/** Imports finite independent 256-bit keys; malformed/absent configuration fails closed. */
export async function createCrypto(project, settings) {
  const rings = {};
  const used = new Set();
  try {
    if (!/^[a-z0-9]{1,64}$/.test(project)) throw Error();
    for (const [purpose, setting] of Object.entries(settings)) {
      const ring = typeof setting === 'string' ? JSON.parse(setting) : setting;
      allowFields(ring, ['active', 'keys'], ['active', 'keys']);
      requireContract(typeof ring.active === 'string' && kidPattern.test(ring.active), 'keys');
      requireContract(ring.keys && typeof ring.keys === 'object' && !Array.isArray(ring.keys), 'keys');
      const entries = Object.entries(ring.keys);
      requireContract(entries.length >= 1 && entries.length <= 16, 'keys');
      const keys = new Map();
      for (const [kid, value] of entries) {
        if (!kidPattern.test(kid) || (purpose === 'lookup' && generation(Number(kid)) !== kid)) throw Error();
        const bytes = decode64(value);
        if (bytes.length !== 32 || used.has(value)) throw Error();
        used.add(value);
        keys.set(kid, await crypto.subtle.importKey('raw', bytes,
          purpose === 'identity' || purpose === 'capability' ? { name: 'AES-GCM' } : { name: 'HMAC', hash: 'SHA-256' },
          false, purpose === 'identity' || purpose === 'capability' ? ['encrypt', 'decrypt'] : ['sign', 'verify']));
        bytes.fill(0);
      }
      if (!keys.has(ring.active)) throw Error();
      rings[purpose] = { active: ring.active, keys };
    }
    for (const name of ['identity', 'lookup', 'capability', 'preview']) if (!rings[name]) throw Error();
  } catch { throw new Failure(503, 'keys_unavailable'); }

  /** Unknown retained kid/generation is never replaced by the active key. */
  function key(purpose, kid) {
    const result = rings[purpose].keys.get(kid);
    if (!result) throw Error();
    return result;
  }
  function lookupMessage(cid, version, digits) {
    return encoder.encode(`gb:lookup:v1|${project}|${uuid(cid)}|${generation(version)}|${documentNumber(digits)}`);
  }
  function aad(cid, lookup) { unhex(lookup, 32); return encoder.encode(`gb:id:v1|${project}|${uuid(cid)}|${lookup}`); }
  async function mac(kid, transcript) {
    return encode64(new Uint8Array(await crypto.subtle.sign('HMAC', key('preview', kid), encoder.encode(transcript))));
  }
  function scope(binding) { return frameTuple('scope', [binding.classId, binding.kind, binding.semester === null ? null : String(binding.semester)]); }
  function previewTranscript(kid, payload) {
    return frameTuple('gb:preview-token:v1', ['v1', kid, payload.project, payload.purpose, payload.actor, payload.session,
      payload.classId, payload.kind, payload.semester === null ? null : String(payload.semester), String(payload.exp), payload.inputDigest, payload.stateDigest]);
  }
  function capsule(claims, now) {
    allowFields(claims, ['project', 'audience', 'classId', 'studentId', 'classEpoch', 'studentEpoch', 'iat', 'exp'],
      ['project', 'audience', 'classId', 'studentId', 'classEpoch', 'studentEpoch', 'iat', 'exp']);
    uuid(claims.classId); bigintId(claims.studentId); bigintId(claims.classEpoch); bigintId(claims.studentEpoch);
    if (claims.project !== project || claims.audience !== 'student-lookup' || !Number.isSafeInteger(claims.iat) ||
      !Number.isSafeInteger(claims.exp) || claims.iat > now + 5 || claims.exp <= now || claims.exp - claims.iat !== 600) throw Error();
    return claims;
  }

  return {
    async lookup(cid, version, digits) {
      try { return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key('lookup', generation(version)), lookupMessage(cid, version, digits)))); }
      catch { throw new Failure(503, 'keys_unavailable'); }
    },
    async encryptIdentity(cid, version, digits) {
      const lookup = await this.lookup(cid, version, digits);
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const kid = rings.identity.active;
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad(cid, lookup), tagLength: 128 }, key('identity', kid), encoder.encode(digits));
      return { lookup, lookupKeyVersion: version, ciphertext: hex(new Uint8Array(ciphertext)), nonce: hex(nonce), encKid: kid };
    },
    async reveal(envelope, cid) {
      try {
        if (envelope.classId !== uuid(cid) || envelope.algVersion !== 1) throw Error();
        const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unhex(envelope.nonce, 12),
          additionalData: aad(cid, envelope.identityLookup), tagLength: 128 }, key('identity', envelope.encKid), unhex(envelope.ciphertext, 25, 28)));
        let digits;
        try { digits = documentNumber(decoder.decode(plaintext)); } finally { plaintext.fill(0); }
        const version = generation(envelope.lookupKeyVersion);
        if (!(await crypto.subtle.verify('HMAC', key('lookup', version), unhex(envelope.identityLookup, 32), lookupMessage(cid, envelope.lookupKeyVersion, digits)))) throw Error();
        return digits;
      } catch { throw new Failure(503, 'identity_unavailable'); }
    },
    async issueCapability(claims, now) {
      const payload = capsule({ project, audience: 'student-lookup', ...claims, iat: now, exp: now + 600 }, now);
      const kid = rings.capability.active;
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce,
        additionalData: encoder.encode(`gb:cap:v1|${project}|student-lookup|v1|${kid}`), tagLength: 128 }, key('capability', kid), encoder.encode(JSON.stringify(payload))));
      const bytes = new Uint8Array(nonce.length + encrypted.length); bytes.set(nonce); bytes.set(encrypted, nonce.length);
      return { token: `v1.${kid}.${encode64(bytes)}`, expiresAt: payload.exp };
    },
    async capability(token, now) {
      try {
        if (typeof token !== 'string' || token.length > 2048) throw Error();
        const [version, kid, data, extra] = token.split('.');
        if (version !== 'v1' || !kidPattern.test(kid) || extra !== undefined) throw Error();
        const bytes = decode64(data); if (bytes.length < 29) throw Error();
        const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12),
          additionalData: encoder.encode(`gb:cap:v1|${project}|student-lookup|v1|${kid}`), tagLength: 128 }, key('capability', kid), bytes.slice(12)));
        try { return capsule(decodeJson(plaintext), now); } finally { plaintext.fill(0); }
      } catch { throw new Failure(401, 'verification'); }
    },
    async commitments(kid, binding, input, state) {
      if (typeof state !== 'string' || !/^[0-9a-f]{64}$/.test(state)) throw new Failure(503, 'unavailable');
      return {
        inputDigest: await mac(kid, frameTuple('gb:preview-input:v1', [project, scope(binding), input])),
        stateDigest: await mac(kid, frameTuple('gb:preview-state:v1', [project, scope(binding), state])),
      };
    },
    async issuePreview(binding, input, state, now) {
      const kid = rings.preview.active;
      const payload = { project, purpose: 'import', ...binding, exp: now + 300, ...await this.commitments(kid, binding, input, state) };
      const signature = await mac(kid, previewTranscript(kid, payload));
      return { token: `v1.${kid}.${encode64(encoder.encode(JSON.stringify(payload)))}.${signature}`, expiresAt: payload.exp };
    },
    async preview(token, binding, input, now) {
      try {
        if (typeof token !== 'string' || token.length > 4096) throw Error();
        const [version, kid, data, signature, extra] = token.split('.');
        if (version !== 'v1' || !kidPattern.test(kid) || extra !== undefined) throw Error();
        const payload = decodeJson(decode64(data));
        allowFields(payload, ['project', 'purpose', 'actor', 'session', 'classId', 'kind', 'semester', 'exp', 'inputDigest', 'stateDigest'],
          ['project', 'purpose', 'actor', 'session', 'classId', 'kind', 'semester', 'exp', 'inputDigest', 'stateDigest']);
        if (payload.project !== project || payload.purpose !== 'import' || !Number.isSafeInteger(payload.exp) || payload.exp <= now || payload.exp > now + 300 ||
          !/^[A-Za-z0-9_-]{43}$/.test(payload.inputDigest) || !/^[A-Za-z0-9_-]{43}$/.test(payload.stateDigest)) throw Error();
        for (const field of ['actor', 'session', 'classId', 'kind', 'semester']) if (payload[field] !== binding[field]) throw Error();
        if (!(await crypto.subtle.verify('HMAC', key('preview', kid), decode64(signature), encoder.encode(previewTranscript(kid, payload))))) throw Error();
        // Verify the input MAC in native crypto as well; do not compare secret digests with JS equality.
        if (!(await crypto.subtle.verify('HMAC', key('preview', kid), decode64(payload.inputDigest), encoder.encode(frameTuple('gb:preview-input:v1', [project, scope(binding), input]))))) throw Error();
        return { kid, stateDigest: payload.stateDigest };
      } catch { throw new Failure(409, 'preview_conflict'); }
    },
    async stateMatches(kid, binding, state, digest) {
      try { return await crypto.subtle.verify('HMAC', key('preview', kid), decode64(digest), encoder.encode(frameTuple('gb:preview-state:v1', [project, scope(binding), state]))); }
      catch { return false; }
    },
  };
}
