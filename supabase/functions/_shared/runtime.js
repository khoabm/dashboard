/** Reads only named server secrets; imports no frontend configuration or user session state. */
import { createCrypto } from './crypto.js';
import { backendFactory } from './backend.js';
import { createHandler } from './handler.js';
import { failureResponse, Failure } from './http.js';

/** Configuration validation is local; it provisions or inspects no hosted secret. */
export function runtimeConfig(get) {
  const url = get('SUPABASE_URL')?.replace(/\/$/, '');
  const parsed = new URL(url);
  const project = parsed.hostname.split('.')[0];
  if (!/^[a-z0-9]{1,64}$/.test(project) || url !== `https://${project}.supabase.co`) throw Error();
  const origins = JSON.parse(get('GB_ALLOWED_ORIGINS'));
  if (
    !Array.isArray(origins) ||
    origins.length < 1 ||
    origins.length > 16 ||
    !origins.every((origin) => {
      if (typeof origin !== 'string' || origin.includes('*')) return false;
      const value = new URL(origin);
      return (
        value.origin === origin &&
        (value.protocol === 'https:' ||
          (value.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(value.hostname)))
      );
    })
  )
    throw Error();
  const anonKey = get('SUPABASE_ANON_KEY');
  const serviceKey = get('SUPABASE_SERVICE_ROLE_KEY');
  if (
    typeof anonKey !== 'string' ||
    !anonKey ||
    typeof serviceKey !== 'string' ||
    !serviceKey ||
    serviceKey === anonKey
  )
    throw Error();
  return { url, project, issuer: `${url}/auth/v1`, anonKey, serviceKey, origins };
}

/** Pinned SDK is supplied by the entrypoint; tests inject it without Deno or network imports. */
export function createEdgeRuntime(kind, get, createClient, fetchImpl = globalThis.fetch) {
  try {
    const config = runtimeConfig(get);
    const cryptography = createCrypto(config.project, {
      identity: get('GB_ID_ENC_KEYS'),
      lookup: get('GB_LOOKUP_KEYS'),
      capability: get('GB_CAP_KEYS'),
      preview: get('GB_PREVIEW_KEYS'),
    });
    // Keep a rejected startup promise handled until a request receives a safe unavailable response.
    cryptography.catch(() => {});
    return createHandler(kind, {
      config,
      backendFactory: backendFactory(createClient, config, fetchImpl),
      cryptography,
    });
  } catch {
    return async () =>
      failureResponse(new Failure(503, 'configuration_unavailable'), crypto.randomUUID(), null);
  }
}
