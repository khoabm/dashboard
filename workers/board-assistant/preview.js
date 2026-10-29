/** Admits only an expiring owner bearer and server-approved synthetic passages to hosted inference. */
import { assistantFetch } from './index.js';
import { pilotBudgetName, legacyBudgetName, assistantBudgetPolicy } from './budget-policy.js';
import { previewFixture } from './preview-fixture.js';
import { publicAssistantCorpus, retrievePublicContent } from '../../src/utils/public-retrieval.js';
import { validAssistantQuery } from '../../src/utils/board-assistant.js';
export { AssistantBudget } from './index.js';
export const previewBudgetName = pilotBudgetName;

/** Compares the digest of a bounded ephemeral bearer; raw tokens never enter logs or browser code. */
async function authorized(request, env) {
  const expiry = Date.parse(env.PREVIEW_ACCESS_EXPIRES || '');
  if (!Number.isFinite(expiry) || Date.now() >= expiry || expiry - Date.now() > 1800000)
    return false;
  const bearer = request.headers.get('Authorization') || '';
  if (
    !/^Bearer [a-f0-9]{64}$/.test(bearer) ||
    !/^[a-f0-9]{64}$/.test(env.PREVIEW_TOKEN_SHA256 || '')
  )
    return false;
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bearer.slice(7))),
  );
  const expected = Uint8Array.from(env.PREVIEW_TOKEN_SHA256.match(/../g), (b) => parseInt(b, 16));
  let different = 0;
  for (let i = 0; i < digest.length; i++) different |= digest[i] ^ expected[i];
  return different === 0;
}

/** Reads a finite JSON body without trusting Content-Length. */
async function previewBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw Error('body');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64000) throw Error('body');
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
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Verifies exact public fixture windows; a client publication claim never authorizes arbitrary content. */
function approvedPayload(payload) {
  if (payload?.version !== 3 || !validAssistantQuery(payload.query)) throw Error('input');
  if (Object.keys(payload).sort().join(',') !== 'catalog,context,grounding,query,version')
    throw Error('input');
  const corpus = publicAssistantCorpus(previewFixture);
  let context = null;
  if (payload.context) {
    if (
      !Array.isArray(payload.context.ids) ||
      !payload.context.ids.length ||
      payload.context.ids.length > 3 ||
      !validAssistantQuery(payload.context.query) ||
      Object.keys(payload.context).sort().join(',') !== 'ids,query'
    )
      throw Error('context');
    const ids = payload.context.ids.map(
      (id) => payload.grounding.passages.find((p) => p.id === id)?.postId,
    );
    if (ids.some((id) => !corpus.posts.some((p) => p.id === id))) throw Error('context');
    context = { query: payload.context.query, ids: [...new Set(ids)] };
  }
  const plan = retrievePublicContent(payload.query, corpus, {
    context,
    now: payload.grounding.clock,
  });
  if (
    plan.reason ||
    JSON.stringify(plan.catalog) !== JSON.stringify(payload.catalog) ||
    JSON.stringify(plan.grounding) !== JSON.stringify(payload.grounding)
  )
    throw Error('provenance');
  return payload;
}

/** Routes authenticated status without inference; enabled chat remains lifetime-capped and synthetic-only. */
export async function previewFetch(request, env) {
  const json = (status, value) =>
    Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!(await authorized(request, env))) return json(403, { error: 'preview_access' });
  const policy = assistantBudgetPolicy(env.BUDGET_RUN_ID);
  if (!policy || policy.name === legacyBudgetName) return json(503, { error: 'identity' });
  const path = new URL(request.url).pathname;
  if (['/preview/status', '/preview/legacy-status'].includes(path) && request.method === 'GET') {
    if (!env.BUDGET) return json(503, { error: 'budget' });
    try {
      const legacy = path === '/preview/legacy-status';
      const identity = legacy ? legacyBudgetName : policy.name;
      const res = await env.BUDGET.get(env.BUDGET.idFromName(identity)).fetch(
        `https://budget${legacy ? '' : policy.prefix}/status`,
        { method: 'POST' },
      );
      if (!res.ok) return json(503, { error: 'budget' });
      return json(200, {
        budget: await res.json(),
        enabled: env.AI_ENABLED === 'true',
        identity,
        limit: legacy ? 3 : policy.limit,
      });
    } catch {
      return json(503, { error: 'budget' });
    }
  }
  if (path !== '/chat' || request.method !== 'POST') return json(405, { error: 'method' });
  // Disabled previews cannot even parse a prompt or touch the allowance.
  if (env.AI_ENABLED !== 'true') return json(503, { error: 'disabled' });
  try {
    const payload = approvedPayload(await previewBody(request));
    const checked = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(payload),
      signal: request.signal,
    });
    return assistantFetch(checked, env);
  } catch {
    return json(422, { error: 'input' });
  }
}
export default { fetch: previewFetch };
