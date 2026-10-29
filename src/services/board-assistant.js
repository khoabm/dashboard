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

/** Creates a disabled-by-default local-preview adapter; endpoint configuration contains no secrets. */
export function createBoardAssistantRequest({
  endpoint = '',
  enabled = false,
  fetcher = fetch,
} = {}) {
  return async (query, catalog, { signal, version = 1, context = null } = {}) => {
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
    if (![1, 2].includes(version)) throw Error('version');
    const checkedContext = version === 2 ? validateLearningContext(context, catalog) : null;
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
          version === 2
            ? { query, catalog, version: 2, context: checkedContext }
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
      if (version === 2) {
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
}
