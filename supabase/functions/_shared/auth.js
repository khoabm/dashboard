/** Binds teacher identity only after supported Supabase Auth verification. */
import { uuid } from './contracts.js';
import { Failure } from './http.js';
import { decode64, decodeJson } from './crypto.js';

/** Decoding supplies claim constraints; getUser is the signature/user verification boundary. */
export async function authenticate(request, backend, config, now) {
  const authorization = request.headers.get('authorization') || '';
  if (authorization.length > 8192 || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization)) throw new Failure(401, 'verification');
  const jwt = authorization.slice(7);
  let claims;
  try {
    const parts = jwt.split('.');
    const header = decodeJson(decode64(parts[0]));
    claims = decodeJson(decode64(parts[1]));
    if (!['ES256', 'RS256', 'HS256'].includes(header.alg) || claims.iss !== config.issuer ||
      !(claims.aud === 'authenticated' || (Array.isArray(claims.aud) && claims.aud.length <= 4 && claims.aud.includes('authenticated'))) ||
      claims.role !== 'authenticated' || !Number.isSafeInteger(claims.exp) || claims.exp <= now ||
      !Number.isSafeInteger(claims.iat) || claims.iat > now + 5 ||
      (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > now))) throw Error();
    uuid(claims.sub); uuid(claims.session_id);
  } catch { throw new Failure(401, 'verification'); }
  const user = await backend.user(jwt);
  if (user.id !== claims.sub || user.is_anonymous === true) throw new Failure(401, 'verification');
  if (!(await backend.admin(user.id))) throw new Failure(403, 'forbidden');
  // Every subsequent admin RPC independently rechecks this actor/session in B3.
  return { actor: user.id, session: claims.session_id };
}
