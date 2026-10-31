/** Defines the live chat protocol and minimal public-text privacy boundary; no lifetime policy. */
export const chatLimits = Object.freeze({ query: 400, history: 12, answer: 8000 });

/** Redacts explicitly labelled student lists and obvious identifiers without a topic allowlist. */
export function publicChatText(text) {
  return String(text)
    .replace(/((?:HS|học sinh)[^\n(]*)(\([^\n)]*\))/giu, '$1[ẩn danh sách cá nhân]')
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, '[ẩn email]')
    .replace(/\b(?:CCCD|CMND)\s*[:#-]?\s*[\d .-]{9,}/gi, '[ẩn định danh]')
    .replace(
      /(?:ngày sinh|sinh ngày|(?:em|tôi|mình)\s+sinh(?:\s+ngày|\s+vào)?)\s*[:]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{4}/gi,
      '[ẩn ngày sinh cá nhân]',
    );
}

/** Accepts ordinary dates/numbers and bounded user text; never accepts arbitrary backend fields. */
export function validateChatPayload(value) {
  if (
    !value ||
    Object.keys(value).sort().join(',') !== 'history,query' ||
    typeof value.query !== 'string' ||
    !value.query.trim() ||
    value.query.length > chatLimits.query ||
    !Array.isArray(value.history) ||
    value.history.length > chatLimits.history
  )
    throw Error('input');
  const history = value.history.map((turn) => {
    if (
      !turn ||
      !['content,role', 'content,role,sourceIds'].includes(Object.keys(turn).sort().join(',')) ||
      !['user', 'assistant'].includes(turn.role) ||
      typeof turn.content !== 'string' ||
      turn.content.length > (turn.role === 'user' ? chatLimits.query : chatLimits.answer)
    )
      throw Error('input');
    if (
      turn.sourceIds !== undefined &&
      (turn.role !== 'assistant' ||
        !Array.isArray(turn.sourceIds) ||
        turn.sourceIds.length > 3 ||
        turn.sourceIds.some((id) => typeof id !== 'string' || id.length > 100))
    )
      throw Error('input');
    return {
      role: turn.role,
      content: publicChatText(turn.content),
      ...(turn.sourceIds ? { sourceIds: turn.sourceIds } : {}),
    };
  });
  return { query: publicChatText(value.query.trim()), history };
}

/** Parses strict live JSON while retaining legacy plaintext for callers that explicitly allow it. */
function modelValue(generated, structured) {
  const stoppedEarly = generated?.finish_reason === 'length';
  const choiceStoppedEarly = generated?.choices?.[0]?.finish_reason === 'length';
  if (stoppedEarly || choiceStoppedEarly) throw Error('model_incomplete');
  let value = generated?.response ?? generated?.choices?.[0]?.message?.content;
  if (typeof value === 'string') {
    let text = value.replace(/^\s*<think>[\s\S]*?<\/think>\s*/, '').trim();
    if (text.startsWith('<think>') || text.length > 16000) throw Error('model');
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    if (structured && (!text.startsWith('{') || !text.endsWith('}')))
      throw Error('model_incomplete');
    value = text.startsWith('{') ? JSON.parse(text) : { answer: text, ids: [] };
  }
  return value;
}

/** Rejects an obviously unfinished Vietnamese clause without another model call. */
function incompleteChatSentence(value) {
  const end = String(value)
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/\s+/)
    .at(-1);
  return ['vi', 'bi', 'khi', 'do', 'va', 'hoac', 'de', 'cua', 'tu', 'trong', 'ma'].includes(end);
}

/** Validates one natural response and its cited public passages. */
export function decodeChatAnswer(generated, catalog, { structured = false } = {}) {
  const value = modelValue(generated, structured);
  if (
    !value ||
    typeof value.answer !== 'string' ||
    !value.answer.trim() ||
    value.answer.length > chatLimits.answer ||
    (structured && incompleteChatSentence(value.answer)) ||
    !Array.isArray(value.ids) ||
    value.ids.length > 3
  )
    throw Error('model_incomplete');
  return {
    answer: value.answer.trim(),
    ids: [...new Set(value.ids)].filter((id) => catalog.some((p) => p.id === id)),
  };
}

/**
 * Requires distinct grounded website facts and general advice for hybrid questions.
 * The Worker composes the final sections; the model cannot omit one silently.
 */
export function decodeHybridChatAnswer(generated, catalog) {
  const value = modelValue(generated, true);
  if (
    !value ||
    typeof value.website !== 'string' ||
    !value.website.trim() ||
    value.website.length > 3000 ||
    incompleteChatSentence(value.website) ||
    typeof value.general !== 'string' ||
    !value.general.trim() ||
    value.general.length > 3000 ||
    incompleteChatSentence(value.general) ||
    !Array.isArray(value.ids) ||
    !value.ids.length ||
    value.ids.length > 3
  )
    throw Error('model_incomplete');
  const ids = [...new Set(value.ids)];
  const containsUnknown = ids.some((id) => !catalog.some((post) => post.id === id));
  if (ids.length !== value.ids.length || containsUnknown) throw Error('model');
  return {
    answer: `Theo bài đăng:\n${value.website.trim()}\n\nGiải thích thêm:\n${value.general.trim()}`,
    website: value.website.trim(),
    ids,
  };
}

/**
 * Prevents a hybrid answer about an explicit exam time from substituting a date
 * or a study plan for the requested hour. No extra AI inference is needed.
 */
export function validateHybridRequestedTime(query, answer, catalog) {
  const plain = (value) => {
    const base = String(value).normalize('NFD');
    return base.replace(/\p{M}/gu, '').toLowerCase();
  };
  const normalized = plain(query);
  if (!/\b(?:may gio|luc nao|gio nao)\b/.test(normalized)) return true;
  const clocks = (value) => {
    const result = [];
    const matches = plain(value).matchAll(/\b(\d{1,2})\s*(?:g|h|gio|:)\s*(\d{1,2})\b/g);
    for (const [, hour, minute] of matches)
      if (+hour <= 23 && +minute <= 59) result.push(`${+hour}:${+minute}`);
    return result;
  };
  const responseClocks = clocks(answer);
  if (!responseClocks.length) return false;
  const evidence = catalog.map((post) => post.body).join('\n');
  const subject = ['van', 'toan', 'anh', 'vat ly', 'hoa hoc', 'sinh hoc'].find(
    (name) => new RegExp(`\\b${name}\\b`).test(normalized),
  );
  const segments = plain(evidence).split(/[;\n]/);
  const matching = subject
    ? segments.filter((segment) => new RegExp(`\\b${subject}\\b`).test(segment))
    : [];
  const subjectClocks = matching.flatMap(clocks);
  const allowed = subjectClocks.length ? subjectClocks : clocks(evidence);
  return responseClocks.some((time) => allowed.includes(time));
}
