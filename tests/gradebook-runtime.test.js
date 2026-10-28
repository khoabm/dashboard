/** Loads the actual Edge graph in a Node adapter; this is not a native Deno/bundle test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';

test('B5: actual Edge entrypoints resolve pinned SDK/B1 graph without starting a service or network', async () => {
  const originalDeno = globalThis.Deno;
  const originalFetch = globalThis.fetch;
  const served = [];
  const reads = new Set();
  let requests = 0;
  const ring = (kid, value) =>
    JSON.stringify({
      active: kid,
      keys: { [kid]: Buffer.alloc(32, value).toString('base64url') },
    });
  const env = {
    SUPABASE_URL: 'https://syntheticprojectref01.supabase.co',
    SUPABASE_ANON_KEY: 'synthetic-public-key',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-key',
    GB_ALLOWED_ORIGINS: '["https://board.example.invalid"]',
    GB_ID_ENC_KEYS: ring('enc', 1),
    GB_LOOKUP_KEYS: ring('1', 2),
    GB_CAP_KEYS: ring('cap', 3),
    GB_PREVIEW_KEYS: ring('preview', 4),
  };
  const sdk = JSON.parse(await readFile('node_modules/@supabase/supabase-js/package.json', 'utf8'));
  assert.equal(sdk.version, '2.118.0');
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'npm:@supabase/supabase-js@2.118.0') {
        return next('@supabase/supabase-js', context);
      }
      return next(specifier, context);
    },
  });
  try {
    globalThis.fetch = async () => {
      requests += 1;
      throw Error('Network forbidden in runtime adapter');
    };
    globalThis.Deno = {
      env: {
        get(name) {
          assert.ok(Object.hasOwn(env, name));
          reads.add(name);
          return env[name];
        },
      },
      serve(handler) {
        served.push(handler);
      },
    };
    for (const name of ['grades-admin', 'student-lookup']) {
      await import(`../supabase/functions/${name}/index.js`);
    }
    assert.equal(served.length, 2);
    assert.deepEqual([...reads].sort(), Object.keys(env).sort());
    for (const handler of served) {
      const result = await handler(
        new Request('https://edge.example.invalid/synthetic', {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://board.example.invalid',
            'Access-Control-Request-Method': 'POST',
          },
        }),
      );
      assert.equal(result.status, 204);
    }
    // These requests exercise the captured handlers without authenticating or reading data.
    const admin = await served[0](
      new Request('https://edge.example.invalid/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"op":"class.read"}',
      }),
    );
    assert.equal(admin.status, 401);
    const student = await served[1](
      new Request('https://edge.example.invalid/student', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"op":"unknown"}',
      }),
    );
    assert.equal(student.status, 400);
    assert.equal(requests, 0);
  } finally {
    hooks.deregister();
    globalThis.fetch = originalFetch;
    if (originalDeno === undefined) delete globalThis.Deno;
    else globalThis.Deno = originalDeno;
  }
});
