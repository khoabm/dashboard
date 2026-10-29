/** Sends one bounded public-text request; never retries, stores history or sends Board credentials. */
import {
  assistantLimits,
  validateAssistantCatalog,
  validAssistantQuery,
  validateAssistantSources,
} from '../utils/board-assistant.js';

import {
  validateLearningAnswer,
  validateLearningContext,
  websiteLearningAnswer,
} from '../utils/assistant-learning.js';

import {
  retrievePublicContent,
  mapPublicSources,
  publicLocalResult,
  publicCoverageNote,
  validatePublicGrounding,
} from '../utils/public-retrieval.js';

/** Creates a disabled-by-default local-preview adapter; endpoint configuration contains no secrets. */
export function createBoardAssistantRequest({
  endpoint = '',
  enabled = false,
  fetcher = fetch,
} = {}) {
  const send = async (
    query,
    catalog,
    { signal, version = 1, context = null, grounding = null } = {},
  ) => {
    if (!enabled || !endpoint) throw Error('disabled');
    const url = new URL(endpoint, location.origin);
    if (
      !(
        url.origin === location.origin ||
        (url.protocol === 'https:' && url.hostname.endsWith('.workers.dev'))
      )
    )
      throw Error('configuration');
    catalog = validateAssistantCatalog(catalog);
    if (!validAssistantQuery(query) || catalog.length > assistantLimits.posts) throw Error('input');
    if (![1, 2, 3].includes(version)) throw Error('version');
    const checkedContext = version >= 2 ? validateLearningContext(context, catalog) : null;
    if (version === 3) validatePublicGrounding(grounding, catalog);
    const abort = new AbortController();
    const cancel = () => abort.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    if (abort.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const timer = setTimeout(cancel, 45000);
    try {
      const response = await fetcher(url, {
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          version >= 2
            ? {
                query,
                catalog,
                version,
                context: checkedContext,
                ...(version === 3 ? { grounding } : {}),
              }
            : { query, catalog },
        ),
        signal: abort.signal,
      });
      if (!response.ok) throw Error(response.status === 429 ? 'quota' : 'unavailable');
      const reader = response.body.getReader();
      const chunks = [];
      let length = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > assistantLimits.response) throw Error('response_size');
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const result = JSON.parse(new TextDecoder().decode(bytes));
      if (version === 2 && result.mode === 'deterministic') {
        const expected = websiteLearningAnswer(query, catalog);
        if (
          !expected ||
          Object.keys(result).sort().join(',') !== Object.keys(expected).sort().join(',') ||
          Object.entries(expected).some(
            ([key, value]) => JSON.stringify(result[key]) !== JSON.stringify(value),
          )
        )
          throw Error('response');
        return expected;
      }
      if (result.mode !== 'ai') throw Error('response');
      if (version >= 2) {
        if (Object.keys(result).sort().join(',') !== 'answer,coverage,mode,sources,status')
          throw Error('response');
        const sources = validateAssistantSources(result.sources, catalog);
        return validateLearningAnswer(
          {
            status: result.status,
            answer: result.answer,
            coverage: result.coverage,
            ids: sources.map((source) => source.id),
          },
          catalog,
        );
      }
      return { mode: 'ai', sources: validateAssistantSources(result.sources, catalog) };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  };
  return async (query, catalog, options = {}) => {
    if (options.version !== 3) return send(query, catalog, options);
    if (options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (!validAssistantQuery(query)) throw Error('input');
    // Only the local public projection may enter the planner; reject unexpected private fields.
    for (const p of catalog)
      if (
        Object.keys(p).sort().join(',') !==
        'body,createdAt,hasAttachments,id,sectionId,sectionTitle,title,updatedAt'
      )
        throw Error('catalog');
    const corpus = {
      posts: catalog,
      coverage: options.snapshotCoverage || 'unknown',
      invalid:
        catalog.some((p) => typeof p.body !== 'string' || Array.from(p.body).length > 20000) ||
        new Set(catalog.map((p) => p.id)).size !== catalog.length,
    };
    const context = validateLearningContext(options.context, catalog);
    const plan = retrievePublicContent(query, corpus, { context, now: options.now || new Date() });
    if (plan.reason) return publicLocalResult(plan, corpus);
    const wireContext = context
      ? { query: context.query, ids: plan.catalog.map((p) => p.id) }
      : null;
    const result = await send(query, plan.catalog, {
      ...options,
      context: wireContext,
      grounding: plan.grounding,
    });
    const sources = mapPublicSources(result.sources, plan, corpus);
    return {
      ...result,
      sources,
      note: publicCoverageNote(plan.scope),
      retrieval: plan.scope,
      evidence: result.sources.map((s) => ({
        ...plan.lookup.find((p) => p.id === s.id),
        quote: s.quote,
      })),
    };
  };
}
