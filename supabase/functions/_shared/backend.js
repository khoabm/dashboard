/** Creates isolated SDK clients per request, with fixed credentials and zero SDK retries. */
import { bounded, checkpoint, Failure, rpcFailure } from './http.js';

/** Factory injection lets offline tests inspect the real SDK's outgoing synthetic headers. */
export function backendFactory(createClient, config, fetchImpl = globalThis.fetch) {
  return (signal) => {
    const options = {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (url, init = {}) => {
          checkpoint(signal);
          return fetchImpl(url, { ...init, signal, redirect: 'error' });
        },
      },
    };
    const auth = createClient(config.url, config.anonKey, options);
    // No incoming headers are accepted by this factory or forwarded to this client.
    const server = createClient(config.url, config.serviceKey, options);
    return {
      async user(jwt) {
        const { data, error } = await bounded(() => auth.auth.getUser(jwt), signal);
        if (error && (!error.status || error.status === 429 || error.status >= 500))
          throw new Failure(503, 'unavailable');
        if (error || !data?.user) throw new Failure(401, 'verification');
        return data.user;
      },
      async admin(actor) {
        const { data, error } = await bounded(
          () =>
            server
              .from('admin_profiles')
              .select('active,role')
              .eq('user_id', actor)
              .maybeSingle()
              .retry(false)
              .abortSignal(signal),
          signal,
        );
        if (error) throw new Failure(503, 'unavailable');
        return data?.active === true && data?.role === 'admin';
      },
      async rpc(name, args, student = false) {
        const { data, error } = await bounded(
          () => server.rpc(name, args).retry(false).abortSignal(signal),
          signal,
        );
        if (error) throw rpcFailure(error, student);
        return data;
      },
    };
  };
}
