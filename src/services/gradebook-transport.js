/** Owns opt-in Edge JSON requests; injected transports never become a production fallback. */
import { config } from '../config/public.js';

export const gradebookEnabled = import.meta.env?.VITE_GRADEBOOK_ENABLED === 'true';

/** Maps transport failures without retaining server diagnostics or sensitive input. */
export class TransportError extends Error {
  constructor(status = 503) {
    super('Gradebook request unavailable');
    this.status = status;
  }
}

/** Sends once, bounds the complete body read, and rejects late results even if fetch ignores abort. */
export function createGradebookTransport({
  enabled = false,
  url = config.url,
  key = config.key,
  fetcher = (...args) => globalThis.fetch(...args),
  timeout = 14000,
} = {}) {
  return async (endpoint, body, { signal, token, capability } = {}) => {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (
      enabled !== true ||
      !['grades-admin', 'student-lookup'].includes(endpoint) ||
      !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) ||
      typeof key !== 'string' ||
      !key.startsWith('sb_publishable_') ||
      !Number.isInteger(timeout) ||
      timeout < 1 ||
      timeout > 15000
    )
      throw new TransportError();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    let timer, interrupted;
    try {
      const stopped = new Promise((_, reject) => {
        interrupted = () =>
          reject(
            signal?.aborted ? new DOMException('Cancelled', 'AbortError') : new TransportError(),
          );
        controller.signal.addEventListener('abort', interrupted, { once: true });
        timer = setTimeout(abort, timeout);
      });
      const work = async () => {
        const headers = { 'content-type': 'application/json', apikey: key };
        if (endpoint === 'grades-admin') {
          if (typeof token !== 'string' || !/^[!-~]{1,8192}$/.test(token))
            throw new TransportError(401);
          headers.authorization = `Bearer ${token}`;
        } else if (capability) {
          if (typeof capability !== 'string' || !/^[!-~]{1,8192}$/.test(capability))
            throw new TransportError(401);
          headers['x-gradebook-capability'] = capability;
        }
        const encoded = JSON.stringify(body);
        if (new TextEncoder().encode(encoded).length > 4194304) throw new TransportError(413);
        const response = await fetcher(`${url}/functions/v1/${endpoint}`, {
          method: 'POST',
          headers,
          body: encoded,
          signal: controller.signal,
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'error',
          referrerPolicy: 'no-referrer',
        });
        if (controller.signal.aborted) throw new TransportError();
        const status = [200, 400, 401, 403, 409, 413, 415, 422, 429, 503].includes(response.status)
          ? response.status
          : 503;
        // Ordinary errors need no body: never decode/log backend diagnostics.
        if (status !== 200 && !(status === 422 && body.op?.endsWith('.preview')))
          throw new TransportError(status);
        if (!response.headers.get('content-type')?.includes('application/json'))
          throw new TransportError();
        const reader = response.body?.getReader();
        if (!reader) throw new TransportError();
        const chunks = [];
        let size = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (controller.signal.aborted || size > 2097152) throw new TransportError();
            chunks.push(value);
          }
        } finally {
          void reader.cancel().catch(() => {});
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        return {
          status,
          payload: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
        };
      };
      const result = await Promise.race([work(), stopped]);
      if (controller.signal.aborted) throw new TransportError();
      return result;
    } catch (error) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      throw error instanceof TransportError ? error : new TransportError();
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      controller.signal.removeEventListener('abort', interrupted);
      controller.abort();
    }
  };
}

export const requestGradebook = createGradebookTransport({ enabled: gradebookEnabled });
