/** Exercises actual disposable GoTrue/PostgREST and the unchanged Edge handler, with no hosted transport. */
import assert from 'node:assert/strict';
import { randomBytes, createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { connect } from './native-adapter.mjs';
import { createHandler } from '../../supabase/functions/_shared/handler.js';
import { backendFactory } from '../../supabase/functions/_shared/backend.js';
import { createCrypto } from '../../supabase/functions/_shared/crypto.js';

const issuer = 'https://syntheticprojectref01.supabase.co/auth/v1';
const secret = randomBytes(48).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const encode = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
/** Signs only this runner's synthetic issuer, never a real project's signing key. */
function sign(claims) {
  const message = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}`;
  return `${message}.${createHmac('sha256', secret).update(message).digest('base64url')}`;
}
const roleKey = (role) => sign({ role, iss: issuer, iat: now, exp: now + 3600 });
const serviceKey = roleKey('service_role');
const password = randomBytes(24).toString('base64url');
let requests = 0,
  server,
  db;

/** Allows outbound HTTP only to explicitly allocated runner loopback services. */
async function localFetch(url, options) {
  const parsed = new URL(url);
  assert.equal(parsed.hostname, '127.0.0.1');
  assert.ok(['19999', '13000', '18899'].includes(parsed.port));
  requests++;
  return fetch(url, {
    ...options,
    signal: options?.signal || AbortSignal.timeout(10000),
    redirect: 'error',
  });
}

/** Bounds startup readiness only; failed business/API cases are never retried. */
async function ready(url) {
  for (let i = 0; i < 30; i++) {
    try {
      if ((await localFetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw Error('Disposable API startup unavailable');
}

/** Passes generated secrets through process environment, never command-line values or output. */
function docker(args, env) {
  execFileSync('docker', args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
}

try {
  const admin = await connect('postgres');
  await admin.query('CREATE DATABASE gbqa_auth');
  await admin.end();
  db = await connect('gbqa_auth');
  await db.query('CREATE SCHEMA auth');
  docker(
    [
      'run',
      '-d',
      '--name',
      'gb-auth',
      '--network',
      'gb-security',
      '--memory=512m',
      '--cpus=1',
      '-p',
      '127.0.0.1:19999:9999',
      ...[
        'GOTRUE_DB_DATABASE_URL',
        'GOTRUE_JWT_SECRET',
        'GOTRUE_JWT_ISSUER',
        'API_EXTERNAL_URL',
        'GOTRUE_API_HOST',
        'GOTRUE_API_PORT',
        'GOTRUE_DB_DRIVER',
        'GOTRUE_SITE_URL',
        'GOTRUE_EXTERNAL_EMAIL_ENABLED',
        'GOTRUE_MAILER_AUTOCONFIRM',
        'GOTRUE_JWT_ADMIN_ROLES',
        'GOTRUE_LOG_LEVEL',
      ].flatMap((key) => ['-e', key]),
      'supabase/gotrue:v2.197.0',
    ],
    {
      GOTRUE_DB_DATABASE_URL: `postgres://postgres:${process.env.PGPASSWORD}@gb-postgres:5432/gbqa_auth?search_path=auth`,
      GOTRUE_JWT_SECRET: secret,
      GOTRUE_JWT_ISSUER: issuer,
      API_EXTERNAL_URL: issuer,
      GOTRUE_API_HOST: '0.0.0.0',
      GOTRUE_API_PORT: '9999',
      GOTRUE_DB_DRIVER: 'postgres',
      GOTRUE_SITE_URL: 'http://localhost:4173',
      GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true',
      GOTRUE_MAILER_AUTOCONFIRM: 'true',
      GOTRUE_JWT_ADMIN_ROLES: 'service_role',
      GOTRUE_LOG_LEVEL: 'error',
    },
  );
  await ready('http://127.0.0.1:19999/health');
  let bootstrap = await readFile('tests/gradebook/b2-bootstrap.sql', 'utf8');
  bootstrap = bootstrap.replace(
    /CREATE SCHEMA auth;[\s\S]*?CREATE SCHEMA storage;/,
    `CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; CREATE SCHEMA storage;`,
  );
  bootstrap = bootstrap.replace(
    /CREATE ROLE (anon|authenticated|service_role) ([^;]+);/g,
    (_, role, flags) =>
      `DO $$ BEGIN CREATE ROLE ${role} ${flags}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  );
  await db.query(bootstrap);
  for (const file of (await readdir('supabase/migrations')).sort())
    await db.query(await readFile(`supabase/migrations/${file}`, 'utf8'));
  docker(
    [
      'run',
      '-d',
      '--name',
      'gb-rest',
      '--network',
      'gb-security',
      '--memory=256m',
      '--cpus=1',
      '-p',
      '127.0.0.1:13000:3000',
      ...['PGRST_DB_URI', 'PGRST_DB_SCHEMAS', 'PGRST_DB_ANON_ROLE', 'PGRST_JWT_SECRET'].flatMap(
        (key) => ['-e', key],
      ),
      'postgrest/postgrest:v14.18',
    ],
    {
      PGRST_DB_URI: `postgres://postgres:${process.env.PGPASSWORD}@gb-postgres:5432/gbqa_auth`,
      PGRST_DB_SCHEMAS: 'public',
      PGRST_DB_ANON_ROLE: 'anon',
      PGRST_JWT_SECRET: secret,
    },
  );
  await ready('http://127.0.0.1:13000/');

  const users = [];
  for (const name of ['teacher', 'nonadmin']) {
    const email = `${name}@synthetic.invalid`;
    const created = await localFetch('http://127.0.0.1:19999/admin/users', {
      method: 'POST',
      headers: { authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    assert.equal(created.status, 200);
    const user = await created.json();
    const login = await localFetch('http://127.0.0.1:19999/token?grant_type=password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    const session = await login.json();
    users.push({ id: user.id, token: session.access_token });
  }
  await db.query('INSERT INTO public.admin_profiles(user_id) VALUES($1)', [users[0].id]);
  const config = {
    url: 'https://syntheticprojectref01.supabase.co',
    project: 'syntheticprojectref01',
    issuer,
    anonKey: roleKey('anon'),
    serviceKey,
    origins: ['http://localhost:4173'],
  };
  const sdkFetch = (url, init) => {
    const value = new URL(url);
    assert.equal(value.origin, config.url);
    if (value.pathname.startsWith('/auth/v1/'))
      return localFetch('http://127.0.0.1:19999' + value.pathname.slice(8) + value.search, init);
    assert.ok(value.pathname.startsWith('/rest/v1/'));
    return localFetch('http://127.0.0.1:13000' + value.pathname.slice(8) + value.search, init);
  };
  const crypto = createCrypto(
    config.project,
    Object.fromEntries(
      ['identity', 'lookup', 'capability', 'preview'].map((purpose) => [
        purpose,
        { active: '1', keys: { 1: randomBytes(32).toString('base64url') } },
      ]),
    ),
  );
  const make = (offset) =>
    createHandler('admin', {
      config,
      backendFactory: backendFactory(createClient, config, sdkFetch),
      cryptography: crypto,
      clock: () => Date.now() + offset,
    });
  const normal = make(0),
    expiredPreview = make(301000);
  server = createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const request = new Request('http://localhost' + req.url, {
        method: req.method,
        headers: req.headers,
        body: Buffer.concat(chunks),
      });
      const result = await (req.url === '/expired-preview' ? expiredPreview : normal)(request);
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(18899, '127.0.0.1', resolve));
  async function call(token, body, expected, path = '/') {
    const response = await localFetch('http://127.0.0.1:18899' + path, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, expected);
    return response.json();
  }
  await call(users[1].token, { op: 'class.read' }, 403);
  await call(users[1].token, { op: 'class.create', name: 'DENIED', schoolYear: '2026' }, 403);
  const claims = JSON.parse(Buffer.from(users[0].token.split('.')[1], 'base64url'));
  await call(sign({ ...claims, exp: now - 1 }), { op: 'class.read' }, 401);
  await call(users[0].token.slice(0, -10) + 'AAAAAAAAAA', { op: 'class.read' }, 401);
  const created = await call(
    users[0].token,
    { op: 'class.create', name: 'Synthetic API', schoolYear: '2026' },
    200,
  );
  const cid = created.class.id;
  console.log('PASS G01 real GoTrue admin/non-admin, valid signed expiry and forgery via HTTP');
  const input = {
    op: 'roster.preview',
    classId: cid,
    headers: ['document', 'birthday'],
    rows: [{ row: 2, documentNumber: '000000000009', birthDate: '2012-04-12' }],
  };
  const preview = await call(users[0].token, input, 200);
  const apply = { ...input, op: 'roster.apply', previewToken: preview.previewToken };
  const before = (await db.query('SELECT count(*)::int n FROM public.audit_logs')).rows[0].n;
  await call(
    users[0].token,
    { ...apply, previewToken: apply.previewToken.slice(0, -8) + 'AAAAAAAA' },
    409,
  );
  await call(users[0].token, apply, 409, '/expired-preview');
  await db.query('UPDATE gradebook.classes SET revision=revision+1 WHERE id=$1', [cid]);
  await call(users[0].token, apply, 409);
  assert.equal((await db.query('SELECT count(*)::int n FROM gradebook.students')).rows[0].n, 0);
  assert.equal((await db.query('SELECT count(*)::int n FROM public.audit_logs')).rows[0].n, before);
  console.log(
    'PASS G04 real PostgREST PT409, signed preview tamper/expiry/stale: zero writes/audit',
  );
  const logout = await localFetch('http://127.0.0.1:19999/logout?scope=local', {
    method: 'POST',
    headers: { authorization: `Bearer ${users[0].token}` },
  });
  assert.equal(logout.status, 204);
  const denied = await localFetch('http://127.0.0.1:18899/', {
    method: 'POST',
    headers: { authorization: `Bearer ${users[0].token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ op: 'class.read', classId: cid }),
  });
  assert.ok([401, 403].includes(denied.status));
  console.log('PASS G01 real synthetic Auth logout invalidates old privileged session');
  console.log('Runner-only HTTP requests (including bounded readiness):', requests);
} catch (error) {
  console.error('BLOCKED/FAIL disposable Auth/API', error.code || error.name);
  process.exitCode = 1;
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (db) await db.end();
}
