/** Controls one authorized pilot using existing Wrangler credentials, a fresh Free receipt and a finite ledger. */
import { spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  pilotBudgetName,
  ownerUatBudgetName,
  assistantBudgetPolicy,
} from '../workers/board-assistant/budget-policy.js';
import { validAssistantQuery } from '../src/utils/board-assistant.js';
import { publicAssistantCorpus, retrievePublicContent } from '../src/utils/public-retrieval.js';
import { previewFixture } from '../workers/board-assistant/preview-fixture.js';
import { assistantResponseDiagnostics } from '../src/utils/assistant-diagnostics.js';
export const pilotDirectory = resolve('tests/local/owner-ai-pilot');

/** Forwards bounded failure metadata so UI counters do not disguise completed model calls as zero. */
export function ownerFailureHeaders(response) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const calls = response.headers.get('X-Assistant-Model-Calls');
  if (/^[012]$/.test(calls || '')) headers['X-Assistant-Model-Calls'] = calls;
  const diagnostic = assistantResponseDiagnostics(response.headers);
  for (const [key, name] of Object.entries({
    stage: 'Stage',
    reason: 'Reason',
    reserved: 'Reserved',
    failureStop: 'Failure-Stop',
  }))
    if (Object.hasOwn(diagnostic, key)) headers[`X-Assistant-${name}`] = String(diagnostic[key]);
  return headers;
}
const account = '78913564ee11ed7d2648d8b09852f88f';
const worker = 'khtn8-board-assistant-mvp';
const origin = 'https://khtn8-board-assistant-mvp.joemckahn.workers.dev';
const namespace = 'a6b907897eef4f41a630b2920645e8c3';
const cli = resolve('tests/local/ai-tools/node_modules/wrangler/bin/wrangler.js');
const pilotProfile = Object.freeze({
  directory: pilotDirectory,
  identity: pilotBudgetName,
  limit: 40,
  qa: 3,
  owner: 2,
});
export const ownerUatProfile = Object.freeze({
  directory: resolve('tests/local/owner-ai-uat'),
  identity: ownerUatBudgetName,
  limit: 60,
  qa: 1,
  owner: 2,
  carry: 34,
  incidentHash: 'd416ba759f74953cde3f2dfc92c39d2a3a1cc35bebe86e8e44275f8a9f080d1b',
});

/** Rechecks query privacy and server-owned synthetic windows before any bytes leave localhost. */
export function assertPilotPayload(payload) {
  if (
    !payload ||
    Object.keys(payload).sort().join(',') !== 'catalog,context,grounding,query,version' ||
    payload.version !== 3 ||
    !validAssistantQuery(payload.query)
  )
    throw Error('local_privacy');
  let context = null;
  if (payload.context) {
    if (
      Object.keys(payload.context).sort().join(',') !== 'ids,query' ||
      !validAssistantQuery(payload.context.query) ||
      !Array.isArray(payload.context.ids)
    )
      throw Error('local_privacy');
    context = {
      query: payload.context.query,
      ids: payload.context.ids.map(
        (id) => payload.grounding.passages.find((p) => p.id === id)?.postId,
      ),
    };
  }
  const plan = retrievePublicContent(payload.query, publicAssistantCorpus(previewFixture), {
    context,
    now: payload.grounding.clock,
  });
  if (
    plan.reason ||
    JSON.stringify(plan.catalog) !== JSON.stringify(payload.catalog) ||
    JSON.stringify(plan.grounding) !== JSON.stringify(payload.grounding)
  )
    throw Error('local_provenance');
}

/** Validates a bounded Free receipt and remaining task budget before any network or activation. */
export function assertPilotCanStart(
  ledger,
  proof,
  { qa = false, now = Date.now(), profile = pilotProfile } = {},
) {
  if (ledger.blocked || ledger.receipts.some((r) => r.state !== 'observed'))
    throw Error('BLOCKED: previous uncertain/failed operation; no automatic continuation');
  if (
    (ledger[qa ? 'qaReservations' : 'ownerReservations'] || 0) >= (qa ? profile.qa : profile.owner)
  )
    throw Error('BLOCKED: role allowance used');
  if (
    proof.account !== account ||
    proof.plan !== 'free' ||
    !Number.isFinite(proof.remainingNeurons) ||
    proof.remainingNeurons < 2000 ||
    !Number.isFinite(Date.parse(proof.checkedAt)) ||
    now - Date.parse(proof.checkedAt) > 1800000 ||
    Date.parse(proof.checkedAt) > now
  )
    throw Error(
      'BLOCKED: Free/usage proof expired or insufficient; reverify Cloudflare before hosted Start',
    );
  if (profile.limit - ledger.operations < 12)
    throw Error('BLOCKED: insufficient operations including shutdown margin');
}

/** Latches a failed/uncertain model activity locally; a later Start cannot silently resume it. */
function blockPilot(profile = pilotProfile) {
  const value = readPilotLedger(profile);
  const ledgerPath = resolve(profile.directory, 'ledger.json');
  value.blocked = true;
  writeFileSync(ledgerPath, JSON.stringify(value, null, 2));
}

/** Loads the existing pilot ledger; missing/corrupt state never creates a fresh budget. */
export function readPilotLedger(profile = pilotProfile) {
  const ledgerPath = resolve(profile.directory, 'ledger.json');
  const value = JSON.parse(readFileSync(ledgerPath, 'utf8'));
  if (
    value.identity !== profile.identity ||
    value.limit !== profile.limit ||
    !Number.isSafeInteger(value.operations) ||
    value.operations < (profile.carry || 3) ||
    value.operations > profile.limit ||
    !Number.isSafeInteger(value.qaReservations) ||
    value.qaReservations < 0 ||
    value.qaReservations > profile.qa ||
    !Number.isSafeInteger(value.ownerReservations) ||
    value.ownerReservations < 0 ||
    value.ownerReservations > profile.owner ||
    !Array.isArray(value.receipts) ||
    (profile.incidentHash && value.incidentHash !== profile.incidentHash)
  )
    throw Error('BLOCKED: invalid/missing pilot ledger');
  return value;
}
/** Persists conservative precharges before network; unknown completion never restores a charge. */
function charge(operations, activity, profile = pilotProfile) {
  const value = readPilotLedger(profile);
  const ledgerPath = resolve(profile.directory, 'ledger.json');
  if (value.operations + operations > profile.limit)
    throw Error('BLOCKED: V2 operations exhausted');
  value.operations += operations;
  value.receipts.push({ at: new Date().toISOString(), activity, operations, state: 'reserved' });
  writeFileSync(ledgerPath, JSON.stringify(value, null, 2));
  return value.receipts.length - 1;
}
/** Records observed counts without retaining prompts, tokens or model reasoning. */
function settle(index, actual, detail, profile = pilotProfile) {
  const ledgerPath = resolve(profile.directory, 'ledger.json');
  const value = readPilotLedger(profile),
    item = value.receipts[index];
  if (actual > item.operations) throw Error('accounting');
  value.operations -= item.operations - actual;
  Object.assign(item, { operations: actual, state: 'observed', ...detail });
  writeFileSync(ledgerPath, JSON.stringify(value, null, 2));
}
/** Runs only the existing CLI, hiding credential output and keeping deployment logs local. */
function wrangler(args, auth = false, profile = pilotProfile) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: resolve(profile.directory, 'wrangler.log'),
    },
  });
  if (result.status !== 0) throw Error('BLOCKED: Wrangler operation failed; no automatic retry');
  if (!auth)
    writeFileSync(
      resolve(profile.directory, `deploy-${Date.now()}.txt`),
      result.stdout + '\n' + result.stderr,
    );
  return result.stdout;
}
/** Reads live settings with a memory-only credential returned by the official Wrangler command. */
async function settings(profile = pilotProfile) {
  const auth = JSON.parse(wrangler(['auth', 'token', '--json'], true, profile));
  if (!auth.token) throw Error('auth');
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}/settings`,
    {
      headers: { Authorization: `Bearer ${auth.token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw Error('BLOCKED: settings unavailable');
  const value = await response.json();
  if (!value.success) throw Error('settings');
  const bindings = value.result.bindings;
  if (
    !bindings.some((b) => b.type === 'ai' && b.name === 'AI') ||
    !bindings.some((b) => b.name === 'BUDGET' && b.namespace_id === namespace)
  )
    throw Error('bindings');
  return Object.fromEntries(
    bindings.filter((b) => b.type === 'plain_text').map((b) => [b.name, b.text]),
  );
}
/** Builds a deployment without creating classes, migrations, namespaces, identities or paid resources. */
function deploy(vars, profile = pilotProfile) {
  const config = {
    name: worker,
    account_id: account,
    main: resolve('workers/board-assistant/preview.js'),
    compatibility_date: '2026-10-28',
    workers_dev: true,
    preview_urls: false,
    ai: { binding: 'AI' },
    durable_objects: { bindings: [{ name: 'BUDGET', class_name: 'AssistantBudget' }] },
    migrations: [{ tag: 'v1', new_sqlite_classes: ['AssistantBudget'] }],
    observability: { enabled: false },
    vars: {
      BUDGET_RUN_ID: profile.identity,
      AI_ENABLED: 'false',
      PREVIEW_EXPIRES: '',
      PREVIEW_ACCESS_EXPIRES: '',
      PREVIEW_TOKEN_SHA256: '',
      ...vars,
    },
  };
  const path = resolve(profile.directory, 'deployment.json');
  writeFileSync(path, JSON.stringify(config, null, 2));
  const output = wrangler(
    [
      'deploy',
      '--config',
      path,
      '--no-autoconfig',
      '--message',
      'V2 explicit pilot; same namespace; finite owner preview',
    ],
    false,
    profile,
  );
  console.log(output.match(/Current Version ID: .+/)?.[0] || 'Worker settings updated');
}
/** Disables inference and access, then verifies settings; it never resets an allowance. */
export async function disablePilot({ uat = false } = {}) {
  const profile = uat ? ownerUatProfile : pilotProfile;
  deploy({}, profile);
  const value = await settings(profile);
  if (
    value.AI_ENABLED !== 'false' ||
    value.PREVIEW_EXPIRES ||
    value.PREVIEW_ACCESS_EXPIRES ||
    value.PREVIEW_TOKEN_SHA256
  )
    throw Error('CRITICAL: disable verification failed');
  console.log('Verified Worker disabled; preview access cleared.');
}

/** Starts a short authenticated session only after fresh Free evidence, live bindings and allowance checks. */
export async function startHostedPilot({ qa = false, uat = false } = {}) {
  const profile = uat ? ownerUatProfile : pilotProfile;
  const ledgerPath = resolve(profile.directory, 'ledger.json');
  const lockPath = resolve(profile.directory, 'active.lock');
  const ledger = readPilotLedger(profile);
  if (
    uat &&
    createHash('sha256')
      .update(readFileSync(resolve(pilotDirectory, 'ledger.json')))
      .digest('hex') !== profile.incidentHash
  )
    throw Error('BLOCKED: immutable incident ledger changed');
  const proof = JSON.parse(readFileSync(resolve(profile.directory, 'free-preflight.json'), 'utf8'));
  assertPilotCanStart(ledger, proof, { qa, profile });
  const lock = openSync(lockPath, 'wx');
  writeFileSync(lock, String(process.pid));
  closeSync(lock);
  let deployed = false,
    closed = false,
    used = 0,
    lastStatus = null,
    busy = false,
    stopping;
  const bearer = randomBytes(32).toString('hex');
  const expires = new Date(
    Math.min(Date.now() + 15 * 60000, Date.parse(proof.checkedAt) + 1800000),
  ).toISOString();
  const access = {
    PREVIEW_ACCESS_EXPIRES: expires,
    PREVIEW_TOKEN_SHA256: createHash('sha256').update(bearer).digest('hex'),
  };
  /** Makes one bounded data-plane call with a conservative local precharge; never retries. */
  async function call(path, options, cost) {
    const index = charge(cost, path, profile);
    const response = await fetch(origin + path, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${bearer}` },
      redirect: 'error',
      signal: AbortSignal.timeout(path === '/chat' ? 45000 : 15000),
    });
    const reader = response.body.getReader(),
      chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 24000) throw Error('response_size');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const result = JSON.parse(new TextDecoder().decode(bytes));
    const models = Number(response.headers.get('X-Assistant-Model-Calls') || 0);
    if (!Number.isSafeInteger(models) || models < 0 || models > 2) throw Error('model_accounting');
    const chat = path === '/chat',
      stage = response.headers.get('X-Assistant-Stage');
    const context = chat && Boolean(JSON.parse(options.body.toString()).context);
    const durableObject = chat
      ? models
        ? response.ok
          ? 1
          : 2
        : response.status === 429 || stage === 'budget'
          ? 1
          : 0
      : response.ok
        ? 1
        : 0;
    const actual = 1 + durableObject + models;
    settle(
      index,
      actual,
      {
        status: response.status,
        models,
        worker: 1,
        durableObject,
        bge: models && !context ? 1 : 0,
        qwen: context ? models : Math.max(0, models - 1),
        ...(!chat ? { accounting: result } : {}),
        ...(chat ? { diagnostics: assistantResponseDiagnostics(response.headers) } : {}),
      },
      profile,
    );
    return { response, result, bytes };
  }
  /** Restores disabled settings even after a failed request; old access is tested only once. */
  function stop() {
    if (stopping) return stopping;
    closed = true;
    stopping = (async () => {
      try {
        if (deployed) {
          let failedStatus;
          if (!busy && lastStatus && Date.now() < Date.parse(expires)) {
            try {
              const r = await call('/preview/status', { method: 'GET' }, 2);
              if (!r.response.ok) throw Error('status');
              lastStatus = r.result;
            } catch (error) {
              failedStatus = error;
            }
          }
          await disablePilot({ uat });
          if (failedStatus)
            throw Error('Hosted stopped; final status unavailable; Worker disabled verified');
          const r = await call('/preview/status', { method: 'GET' }, 1);
          if (r.response.status !== 403) throw Error('CRITICAL: old bearer still usable');
        }
      } finally {
        if (existsSync(lockPath)) unlinkSync(lockPath);
      }
    })();
    return stopping;
  }
  try {
    const pre = await settings(profile);
    if (pre.AI_ENABLED !== 'false') throw Error('BLOCKED: Worker already enabled');
    deployed = true;
    deploy(access, profile);
    const status = await call('/preview/status', { method: 'GET' }, 2);
    lastStatus = status.result;
    if (
      !status.response.ok ||
      lastStatus.identity !== profile.identity ||
      lastStatus.budget.limit !== assistantBudgetPolicy(profile.identity).limit ||
      lastStatus.budget.stopped ||
      lastStatus.budget.remaining < (qa ? profile.qa : 1)
    )
      throw Error('BLOCKED: pilot allowance unavailable');
    if (qa && !uat) {
      const legacy = await call('/preview/legacy-status', { method: 'GET' }, 2);
      if (legacy.result.budget.count !== 1 || !legacy.result.budget.stopped)
        throw Error('BLOCKED: legacy state mismatch');
    }
    deploy({ ...access, AI_ENABLED: 'true', PREVIEW_EXPIRES: expires }, profile);
    const post = await settings(profile);
    if (post.AI_ENABLED !== 'true' || post.BUDGET_RUN_ID !== profile.identity)
      throw Error('activation');
    console.log(
      `HOSTED synthetic pilot until ${expires}; remaining=${lastStatus.budget.remaining}; operations=${readPilotLedger(profile).operations}/${profile.limit}`,
    );
    return {
      expires,
      stop,
      get status() {
        return {
          mode: 'hosted',
          expires,
          used,
          sessionRemaining: closed ? 0 : Math.max(0, (qa ? profile.qa : profile.owner) - used),
          pilotRemainingEstimate: lastStatus
            ? Math.max(0, lastStatus.budget.remaining - used)
            : null,
          lastStatus,
          operations: readPilotLedger(profile).operations,
          limit: profile.limit,
          identity: profile.identity,
        };
      },
      async chat(req, res) {
        const ledger = readPilotLedger(profile),
          role = qa ? 'qaReservations' : 'ownerReservations';
        if (
          closed ||
          busy ||
          Date.now() >= Date.parse(expires) ||
          used >= Math.min(qa ? profile.qa : profile.owner, lastStatus.budget.remaining) ||
          (ledger[role] || 0) >= (qa ? profile.qa : profile.owner) ||
          profile.limit - ledger.operations < 8
        ) {
          res.writeHead(429).end('{"error":"local_budget"}');
          return;
        }
        busy = true;
        try {
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 64000) throw Error('body');
            chunks.push(chunk);
          }
          assertPilotPayload(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          used++;
          ledger[role] = (ledger[role] || 0) + 1;
          writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
          const result = await call(
            '/chat',
            {
              method: 'POST',
              headers: { Origin: 'http://127.0.0.1:4173', 'Content-Type': 'application/json' },
              body: Buffer.concat(chunks),
            },
            5,
          );
          if (!result.response.ok) {
            blockPilot(profile);
            res
              .writeHead(result.response.status, ownerFailureHeaders(result.response))
              .end(result.bytes);
            lastStatus = null;
            await stop();
            return;
          }
          res
            .writeHead(200, {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
              'X-Assistant-Clock': result.response.headers.get('X-Assistant-Clock'),
              'X-Assistant-Model-Calls': result.response.headers.get('X-Assistant-Model-Calls'),
            })
            .end(result.bytes);
        } catch {
          blockPilot(profile);
          if (!res.headersSent) res.writeHead(503).end('{"error":"unavailable"}');
          lastStatus = null;
          await stop();
        } finally {
          busy = false;
        }
      },
    };
  } catch (error) {
    lastStatus = null;
    await stop();
    throw error;
  }
}
