/** Projects public Board text and validates read-only assistant results without DOM or network. */
export const assistantLimits = Object.freeze({
  posts: 24,
  query: 400,
  body: 1200,
  response: 24000,
});

/** Normalizes Vietnamese text for lexical matching without changing displayed source text. */
export function normalizeAssistantText(value) {
  return String(value).normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();
}

/** Rejects obvious identifiers; this guard is not a complete personal-data classifier. */
export function validAssistantQuery(value) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= assistantLimits.query &&
    !/\d{9,}|\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b|\S+@\S+/.test(value)
  );
}

/** Copies only public text, excluding attachments, draft fields, identity and backend metadata. */
export function assistantCatalog(snapshot) {
  const sections = new Map((snapshot?.sections || []).map((s) => [s.id, s.title]));
  return (snapshot?.posts || [])
    .filter((p) => p.status === 'published' && sections.has(p.section_id))
    .map((p) => ({
      id: String(p.id),
      sectionId: String(p.section_id),
      sectionTitle: String(sections.get(p.section_id)).slice(0, 160),
      title: String(p.title || '').slice(0, 200),
      body: String(p.body || '').slice(0, assistantLimits.body),
    }));
}

/** Scores exact query tokens against titles, topic labels and summaries. */
export function lexicalAssistantScore(query, post) {
  const words = [...new Set(normalizeAssistantText(query).match(/[\p{L}\p{N}]+/gu) || [])];
  if (!words.length) return 0;
  const title = normalizeAssistantText(`${post.title} ${post.sectionTitle}`);
  const body = normalizeAssistantText(post.body);
  return (
    words.reduce((sum, word) => sum + (title.includes(word) ? 2 : body.includes(word) ? 1 : 0), 0) /
    (2 * words.length)
  );
}

/** Returns keyword fallback sources, without claiming a semantic AI answer. */
export function localAssistantResults(query, catalog) {
  return catalog
    .map((post) => ({ post, score: lexicalAssistantScore(query, post) }))
    .filter((item) => item.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ post }) => ({ id: post.id, quote: post.body || post.title }));
}

/** Validates model excerpts as exact source substrings; rejects invented or duplicate citations. */
export function validateAssistantSources(value, catalog) {
  if (!Array.isArray(value) || value.length > 3) throw Error('invalid_sources');
  const seen = new Set();
  return value.map((item) => {
    const post = catalog.find((p) => p.id === item?.id);
    if (
      !post ||
      seen.has(item.id) ||
      typeof item.quote !== 'string' ||
      !item.quote.trim() ||
      item.quote.length > assistantLimits.body ||
      !(post.body.includes(item.quote) || post.title.includes(item.quote))
    )
      throw Error('invalid_sources');
    seen.add(item.id);
    return { id: item.id, quote: item.quote };
  });
}

/** Resolves only explicit read-only actions against a fresh public catalog. */
export function resolveAssistantAction(action, catalog) {
  if (action?.type === 'reset') return { type: 'reset' };
  if (
    action?.type === 'filter' &&
    Array.isArray(action.ids) &&
    action.ids.length > 0 &&
    action.ids.length <= 3 &&
    action.ids.every((id) => catalog.some((post) => post.id === id))
  )
    return { type: 'filter', ids: [...new Set(action.ids)] };
  if (action?.type === 'open' && catalog.some((p) => p.id === action.id))
    return { type: 'open', id: action.id };
  if (action?.type === 'topic' && catalog.some((p) => p.sectionId === action.id))
    return { type: 'topic', id: action.id };
  return null;
}

/** Validates the entire wire catalog rather than trusting arbitrary browser objects. */
export function validateAssistantCatalog(value) {
  if (!Array.isArray(value) || value.length > assistantLimits.posts) throw Error('catalog');
  const seen = new Set();
  return value.map((post) => {
    if (!post || Object.keys(post).sort().join(',') !== 'body,id,sectionId,sectionTitle,title')
      throw Error('catalog');
    for (const [key, max] of Object.entries({
      id: 100,
      sectionId: 100,
      sectionTitle: 160,
      title: 200,
      body: 1200,
    })) {
      if (
        typeof post[key] !== 'string' ||
        post[key].length > max ||
        (key !== 'body' && !post[key].trim())
      )
        throw Error('catalog');
    }
    if (seen.has(post.id)) throw Error('catalog');
    seen.add(post.id);
    return { ...post };
  });
}
