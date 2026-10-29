/** Indexes all eligible public text locally, then produces bounded, traceable model passages. */
import {
  normalizeAssistantText,
  validateAssistantCatalog,
  validateAssistantSources,
} from './board-assistant.js';
import { publicTimeContext, publicTemporalScore, publicDateEvidence } from './public-temporal.js';
export const retrievalLimits = Object.freeze({
  chunk: 1000,
  overlap: 160,
  candidates: 8,
  characters: 2000000,
  generatorBytes: 24000,
});
const stop = new Set(
  'co nhung gi nao mot cac cua va la ve trong tren nay do toi minh ban hay giup cho voi khong duoc noi dung tom tat giai thich thong tin quan trong so sanh hai bai hoc can'.split(
    ' ',
  ),
);
const tokens = (value) => [
  ...new Set(
    (normalizeAssistantText(value).match(/[\p{L}\p{N}]+/gu) || []).filter((t) => !stop.has(t)),
  ),
];
const timestamp = (value) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;

/** Projects full public body and safe metadata; never copies attachment URLs, identities or arbitrary fields. */
export function publicAssistantCorpus(snapshot) {
  const sections = new Map((snapshot?.sections || []).map((s) => [s.id, s.title]));
  const posts = (snapshot?.posts || [])
    .filter((p) => p.status === 'published' && sections.has(p.section_id))
    .map((p) => ({
      id: String(p.id),
      sectionId: String(p.section_id),
      sectionTitle: String(sections.get(p.section_id)),
      title: String(p.title || ''),
      body: String(p.body || ''),
      createdAt: timestamp(p.created_at),
      updatedAt: timestamp(p.updated_at),
      hasAttachments: Array.isArray(p.attachments) && p.attachments.length > 0,
    }));
  const invalid =
    posts.some(
      (p) =>
        Array.from(p.body).length > 20000 || p.title.length > 200 || p.sectionTitle.length > 160,
    ) || new Set(posts.map((p) => p.id)).size !== posts.length;
  return {
    posts,
    coverage: invalid
      ? 'partial'
      : snapshot?.publicCoverage?.complete === true
        ? 'complete'
        : 'unknown',
    invalid,
  };
}

/** Produces overlapping passages for every post, preserving exact character offsets for citation checks. */
export function indexPublicCorpus(corpus) {
  const total = corpus.posts.reduce((n, p) => n + p.body.length + p.title.length, 0);
  if (corpus.invalid || total > retrievalLimits.characters)
    return { chunks: [], df: new Map(), limited: true };
  const chunks = [],
    df = new Map();
  for (const post of corpus.posts) {
    for (
      let start = 0;
      start < Math.max(1, post.body.length);
      start += retrievalLimits.chunk - retrievalLimits.overlap
    ) {
      // Preserve UTF-16 pairs so a quoted passage survives JSON round-trip exactly.
      if (start > 0 && /[\uDC00-\uDFFF]/.test(post.body[start])) start--;
      let end = Math.min(post.body.length, start + retrievalLimits.chunk);
      if (end < post.body.length && /[\uDC00-\uDFFF]/.test(post.body[end])) end--;
      const body = post.body.slice(start, end);
      const terms = tokens(`${post.title} ${post.sectionTitle} ${body}`);
      chunks.push({ post, start, body, terms });
      for (const term of terms) df.set(term, (df.get(term) || 0) + 1);
      if (end >= post.body.length) break;
    }
  }
  return { chunks, df, limited: false };
}

/** Scans the full local index and shortlists passages without using input order or topic-name rules. */
export function retrievePublicContent(query, corpus, { context = null, now = new Date() } = {}) {
  const index = indexPublicCorpus(corpus),
    clock = publicTimeContext(query, now);
  const scope = {
    snapshot: corpus.coverage,
    lexical: index.limited ? 'partial' : 'full',
    totalPosts: corpus.posts.length,
    totalChunks: index.chunks.length,
    candidateChunks: 0,
    semantic: 'shortlist',
  };
  if (index.limited) return { catalog: [], grounding: null, scope, reason: 'limit', lookup: [] };
  const terms = tokens(context ? `${context.query} ${query}` : query);
  const scores = index.chunks
    .filter((c) => !context || context.ids.includes(c.post.id))
    .map((chunk) => {
      const content = normalizeAssistantText(chunk.body),
        title = normalizeAssistantText(chunk.post.title);
      let score = terms.reduce(
        (n, t) =>
          n +
          (chunk.terms.includes(t)
            ? Math.log(1 + (index.chunks.length + 1) / (1 + index.df.get(t))) *
              (title.includes(t) ? 3 : 1)
            : 0),
        0,
      );
      if (title.length >= 4 && normalizeAssistantText(query).includes(title)) score += 12;
      const temporalScore = publicTemporalScore(query, `${chunk.post.title}\n${chunk.body}`, now);
      score += temporalScore;
      if (clock.kind === 'recent' && chunk.post.createdAt)
        score += Date.parse(chunk.post.createdAt) / 1e15;
      const hits = terms.filter((term) => chunk.terms.includes(term)).length;
      return {
        ...chunk,
        score,
        keywordMatch:
          temporalScore > 0 || (terms.length > 0 && hits >= Math.ceil(terms.length * 0.75)),
      };
    })
    .sort((a, b) => b.score - a.score || a.post.id.localeCompare(b.post.id) || a.start - b.start);
  const positive = scores.filter((c) => c.score > 0),
    max = context ? 3 : retrievalLimits.candidates;
  if (!context && !positive.length && scores.length > max)
    return { catalog: [], grounding: null, scope, reason: 'ambiguous', lookup: [] };
  const pool = context || scores.length <= max ? scores : positive.length ? positive : scores;
  const chosen = [],
    seen = new Set();
  // Diversity prevents one long keyword-heavy post from excluding related updates or comparison sources.
  for (const chunk of pool)
    if (!seen.has(chunk.post.id) && chosen.length < max) {
      chosen.push(chunk);
      seen.add(chunk.post.id);
    }
  for (const chunk of pool) if (chosen.length < max && !chosen.includes(chunk)) chosen.push(chunk);
  scope.candidateChunks = chosen.length;
  const catalog = chosen.map((c, i) => ({
    id: `c${i}`,
    sectionId: c.post.sectionId,
    sectionTitle: c.post.sectionTitle,
    title: c.post.title,
    body: c.body,
  }));
  const lookup = chosen.map((c, i) => ({
    id: `c${i}`,
    postId: c.post.id,
    start: c.start,
    textLength: c.post.body.length,
    createdAt: c.post.createdAt,
    updatedAt: c.post.updatedAt,
    hasAttachments: c.post.hasAttachments,
  }));
  const grounding = { clock: clock.now, scope, passages: lookup };
  validatePublicGrounding(grounding, catalog);
  return {
    catalog,
    grounding,
    scope,
    lookup,
    keywordIds: chosen.map((c, i) => (c.keywordMatch ? `c${i}` : null)).filter(Boolean),
    reason: !chosen.length
      ? 'empty'
      : chosen.every((c) => !c.body.trim() && c.post.hasAttachments)
        ? 'files'
        : null,
  };
}

/** Checks V3 public wire metadata independently; it is still client-asserted, not server provenance. */
export function validatePublicGrounding(value, catalog) {
  validateAssistantCatalog(catalog);
  if (
    !value ||
    Object.keys(value).sort().join(',') !== 'clock,passages,scope' ||
    !timestamp(value.clock) ||
    !Array.isArray(value.passages) ||
    value.passages.length !== catalog.length ||
    catalog.length > retrievalLimits.candidates
  )
    throw Error('grounding');
  const s = value.scope;
  if (
    !s ||
    Object.keys(s).sort().join(',') !==
      'candidateChunks,lexical,semantic,snapshot,totalChunks,totalPosts' ||
    !['complete', 'unknown', 'partial'].includes(s.snapshot) ||
    !['full', 'partial'].includes(s.lexical) ||
    s.semantic !== 'shortlist' ||
    s.candidateChunks !== catalog.length
  )
    throw Error('coverage');
  for (const key of ['totalPosts', 'totalChunks', 'candidateChunks'])
    if (!Number.isSafeInteger(s[key]) || s[key] < 0 || s[key] > 10000000) throw Error('coverage');
  if (s.totalChunks < s.candidateChunks) throw Error('coverage');
  const seen = new Set();
  for (const p of value.passages) {
    if (
      !p ||
      Object.keys(p).sort().join(',') !==
        'createdAt,hasAttachments,id,postId,start,textLength,updatedAt' ||
      !catalog.some((c) => c.id === p.id) ||
      seen.has(p.id) ||
      typeof p.postId !== 'string' ||
      !p.postId.length ||
      p.postId.length > 100 ||
      !Number.isSafeInteger(p.start) ||
      p.start < 0 ||
      p.start > 40000 ||
      !Number.isSafeInteger(p.textLength) ||
      p.textLength < 0 ||
      p.textLength > 40000 ||
      p.start > p.textLength ||
      typeof p.hasAttachments !== 'boolean' ||
      [p.createdAt, p.updatedAt].some((t) => t !== null && !timestamp(t))
    )
      throw Error('grounding');
    if (p.start + catalog.find((c) => c.id === p.id).body.length > p.textLength)
      throw Error('grounding');
    seen.add(p.id);
  }
  if (s.totalPosts < new Set(value.passages.map((p) => p.postId)).size) throw Error('coverage');
  return value;
}

/** Maps model passage citations back to current native posts and exact quoted text, deduplicating cards. */
export function mapPublicSources(sources, plan, corpus) {
  validateAssistantSources(sources, plan.catalog);
  const result = [];
  for (const source of sources) {
    const ref = plan.lookup.find((p) => p.id === source.id),
      post = corpus.posts.find((p) => p.id === ref?.postId);
    if (!post || !(post.body.includes(source.quote) || post.title.includes(source.quote)))
      throw Error('revoked');
    if (!result.some((p) => p.id === post.id)) result.push({ id: post.id, quote: source.quote });
  }
  return result;
}

/** Describes the actual search boundary instead of claiming complete semantic or attachment coverage. */
export function publicCoverageNote(scope) {
  return `${scope.snapshot === 'complete' ? 'Đã tải đủ các bài hiện thấy ở lần tải này; bảng có thể thay đổi sau đó.' : 'Chưa xác minh đã tải đủ bài công khai.'} ${scope.lexical === 'full' ? `Đã tìm từ khóa trong văn bản của ${scope.totalPosts} bài đã tải.` : 'Chưa tìm đủ văn bản do giới hạn xử lý hiện tại.'} Trợ lý chỉ đối chiếu các đoạn được chọn, chưa phải toàn bộ web hay toàn bộ mọi bài. Chưa đọc nội dung tệp.`;
}

/** Builds temporal evidence only from supplied passages, retaining edit/publication uncertainty. */
export function publicGroundingPrompt(query, catalog, grounding) {
  return {
    time: publicTimeContext(query, grounding.clock),
    coverage: grounding.scope,
    sources: catalog.map((p) => {
      const evidence = publicDateEvidence(`${p.title}\n${p.body}`);
      return {
        id: p.id,
        metadata: grounding.passages.find((ref) => ref.id === p.id),
        temporal: {
          ...evidence,
          dates: evidence.dates.slice(0, 4),
          dateEvidenceLimited: evidence.dates.length > 4,
        },
      };
    }),
    limits:
      'Only these public text passages were supplied. createdAt/updatedAt are creation/edit timestamps, NOT publication/event/deadline dates. No published_at verified. A past start date does not establish that an activity has ended. Latest is only within supplied evidence; state creation/edit criterion and missing publication/coverage. Never infer a year for yearless dates. Keep event, registration and preparation dates separate. Conflicting/cancelled/revised notices stay attributed to their own source; do not assume keyword overlap means the same event or that edit time proves effectiveness. Offsets/textLength show partial post coverage. Do not claim a complete post summary when supplied windows do not cover its whole text. At most3 passage citations; state incomplete coverage when needed. No file bytes were read.',
  };
}

/** Returns explicit local fallback/clarification with valid native sources and coverage disclosure. */
export function publicLocalResult(plan, corpus, { keyword = false } = {}) {
  const answer =
    plan.reason === 'limit'
      ? 'Tập văn bản vượt giới hạn xử lý cục bộ hoặc không hợp lệ. Chưa rà đủ nội dung; hãy thu hẹp câu hỏi theo bài hoặc chủ đề.'
      : plan.reason === 'ambiguous'
        ? 'Chưa xác định được nguồn trong tập văn bản lớn. Bạn hãy nêu thêm tên bài, chủ đề hoặc chi tiết; chưa thực hiện tìm ngữ nghĩa toàn bộ.'
        : plan.reason === 'files'
          ? 'Nguồn hiện chỉ có tiêu đề hoặc tệp đính kèm. Trợ lý chưa đọc PDF, ảnh, slide, bảng tính hay video nên chưa đủ văn bản để kết luận.'
          : plan.reason === 'empty'
            ? 'Chưa có nguồn công khai phù hợp trong snapshot được tải.'
            : null;
  const sources =
    keyword || plan.reason === 'files'
      ? mapPublicSources(
          plan.catalog
            .filter((p) => !keyword || plan.keywordIds?.includes(p.id))
            .slice(0, 3)
            .map((p) => ({ id: p.id, quote: p.body || p.title })),
          plan,
          corpus,
        )
      : [];
  return {
    mode: keyword ? 'keyword' : 'deterministic',
    status: 'insufficient',
    answer,
    coverage: 'insufficient',
    sources,
    note: publicCoverageNote(plan.scope),
    retrieval: plan.scope,
  };
}

/** Bounds generator JSON bytes without duplicating passage text; every removal remains partial coverage. */
export function boundedPublicPrompt(query, candidates, grounding, context = null) {
  const selected = [...candidates];
  while (selected.length) {
    const content =
      JSON.stringify({
        question: query,
        ...(context ? { priorQuestion: context.query } : {}),
        sources: selected,
        grounding: publicGroundingPrompt(query, selected, grounding),
      }) + '\n/no_think';
    if (new TextEncoder().encode(content).length <= retrievalLimits.generatorBytes)
      return { candidates: selected, content };
    selected.pop();
  }
  throw Error('prompt_size');
}
