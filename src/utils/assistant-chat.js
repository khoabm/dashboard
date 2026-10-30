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

/** Reads model output without inspecting dates/numbers or demanding citations for general knowledge. */
export function decodeChatAnswer(generated, catalog) {
  let value = generated?.response ?? generated?.choices?.[0]?.message?.content;
  if (typeof value === 'string') {
    let text = value.replace(/^\s*<think>[\s\S]*?<\/think>\s*/, '').trim();
    if (text.startsWith('<think>') || text.length > 16000) throw Error('model');
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    value = text.startsWith('{') ? JSON.parse(text) : { answer: text, ids: [] };
  }
  if (
    !value ||
    typeof value.answer !== 'string' ||
    !value.answer.trim() ||
    value.answer.length > chatLimits.answer ||
    !Array.isArray(value.ids) ||
    value.ids.length > 3
  )
    throw Error('model');
  return {
    answer: value.answer.trim(),
    ids: [...new Set(value.ids)].filter((id) => catalog.some((p) => p.id === id)),
  };
}
