/** Minimal Edge request lifecycle shared by both entrypoints, with injected offline boundaries. */
import { vietnamToday } from './contracts.js';
import { bodyJson, bounded, checkpoint, Failure, response, failureResponse } from './http.js';
import { authenticate } from './auth.js';
import { validateAdmin, executeAdmin } from './admin.js';
import { validateStudent, executeStudent } from './student.js';

/** Every request owns a deadline, backend clients and verified context; no global user state. */
export function createHandler(
  kind,
  { config, backendFactory, cryptography, clock = Date.now, deadlineMs = 15000 },
) {
  return async (request) => {
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.signal.addEventListener('abort', abort, { once: true });
    if (request.signal.aborted) abort();
    const timer = setTimeout(abort, Math.min(deadlineMs, 15000));
    let origin = null;
    try {
      const providedOrigin = request.headers.get('origin');
      if (providedOrigin && !config.origins.includes(providedOrigin))
        throw new Failure(403, 'forbidden');
      origin = providedOrigin;
      if (request.method === 'OPTIONS') {
        if (!origin || new URL(request.url).search) throw new Failure(400, 'request');
        return new Response(null, {
          status: 204,
          headers: {
            'Cache-Control': 'no-store',
            Vary: 'Origin',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers':
              'authorization, apikey, content-type, x-client-info, x-gradebook-capability',
          },
        });
      }
      const signal = controller.signal;
      const body = await bodyJson(request, signal);
      const today = vietnamToday(() => clock());
      if (kind === 'admin') validateAdmin(body, today);
      else validateStudent(body);
      const raw = await bounded(() => backendFactory(signal), signal);
      const backend = {
        user: (jwt) => bounded(() => raw.user(jwt), signal),
        admin: (actor) => bounded(() => raw.admin(actor), signal),
        rpc: (name, args, student = false) => bounded(() => raw.rpc(name, args, student), signal),
      };
      const identity =
        kind === 'admin'
          ? await authenticate(request, backend, config, Math.floor(clock() / 1000))
          : null;
      const cryptoApi = await bounded(() => cryptography, signal);
      const context = {
        backend,
        cryptography: cryptoApi,
        today,
        now: () => Math.floor(clock() / 1000),
        checkpoint: () => checkpoint(signal),
      };
      const result = await bounded(
        () =>
          kind === 'admin'
            ? executeAdmin(body, identity, context)
            : executeStudent(body, request, context),
        signal,
      );
      checkpoint(signal);
      return response(result.payload, requestId, origin, result.status);
    } catch (error) {
      return failureResponse(error, requestId, origin);
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener('abort', abort);
    }
  };
}
