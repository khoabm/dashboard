/** Routes a natural Vietnamese question before any public Board read or embedding. */
import { normalizeAssistantText } from './board-assistant.js';

const boardSignals =
  /\b(?:bai dang|thong bao|bang hoc lieu|website|noi dung web|noi dung tren web|dung web|tu web|web nay|trang nay|tren web|tren trang|trong bai|theo bai|bai cua co|co dang|co co dang|co thong bao|lop minh|lop em|lop chung minh|trong lop|lich thi|lich kiem tra|thoi khoa bieu)\b/;
const generalSignals =
  /^(?:tai sao|vi sao|do dau|nguyen nhan|dinh nghia|khai niem|the nao la|la gi|giai thich|phan biet|vi du ve|cho vi du ve|cong thuc|cach tinh)\b/;
const explicitGeneral =
  /\b(?:kien thuc chung|theo khoa hoc|noi chung|khong lien quan (?:web|website|bai dang))\b/;
// Practical how-to requests stay general unless they explicitly point to Board content.
const practicalHowTo =
  /^(?:(?:em|toi|minh|ban)\s+)?(?:chi|huong dan|day|giup)\s+(?:(?:em|toi|minh)\s+)?(?:cach|lam|thiet ke|ve|tao)\b|^(?:lam sao|cach nao|cach|huong dan cach|lam the nao|thiet ke the nao)\b/;
const hybridSignals =
  /\b(?:giai thich them|lien he thuc te|ung dung thuc te|theo khoa hoc|tai sao|vi sao)\b/;
const referring =
  /^(?:vay|the|con|the con|noi them|giai thich them|noi ro|cho em biet them|chi tiet|can chuan bi|em can|bao gio|khi nao|may gio|o dau|ai tham gia)\b|\b(?:bai do|noi dung do|hoat dong do|thong bao do|lich do|mon do|viec do)\b/;
const generalContext =
  /\b(?:trong lich su|lich su viet nam|tren the gioi|trong khoa hoc|ban chat|theo khoa hoc)\b/;
const shortTopic = /^(?:[\p{L}\p{N}]+\s*){2,7}$/u;

/** Compare actual publication titles, never arbitrary overlapping words in a post body. */
export function matchPublishedTitle(query, posts = []) {
  const clean = (value) => normalizeAssistantText(value).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const text = clean(query);
  if (!text || generalContext.test(text)) return null;
  const matches = posts
    .filter((post) => post.status === 'published')
    .map((post) => ({ post, title: clean(post.title) }))
    .filter(({ title }) => title.length >= 7 && (text === title || text.includes(title)))
    .sort((a, b) => b.title.length - a.title.length);
  return matches[0]?.post || null;
}

/** Reliable local-only calendar answer; no Board or model is needed. */
export function localCalendarReply(query, now = new Date()) {
  const text = normalizeAssistantText(query).trim();
  const today = /\b(?:hom nay|ngay hom nay|bay gio|hien tai)\b/.test(text);
  if (!today || /\b(?:trong (?:bai|web)|tren (?:web|website)|theo bai)\b/.test(text))
    return null;
  const day = /\b(?:thu may|thu gi|ngay may|ngay bao nhieu|ngay gi|ngay thang may|ngay thang nam)\b/.test(text);
  const hour = /\b(?:may gio|gio may|bao nhieu gio|bay gio la)\b/.test(text);
  if (!day && !hour) return null;
  const date = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(now);
  const time = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
  return hour ? `Bây giờ là ${time}, ${date} (giờ Việt Nam).` : `Hôm nay là ${date}.`;
}

const ambiguousSignals =
  /\b(?:co|lop|bai hoc|hoc lieu|chu de|chuan bi|hoat dong|thong tin|lich|ngay mai|tuan nay|hom nay)\b/;

/**
 * Separates topic intent from lexical similarity. Ambiguous requests may be classified
 * by Qwen without sending any Board text; citations never determine intent alone.
 */
export function routeAssistantIntent(query, history = []) {
  const text = normalizeAssistantText(query).trim().replace(/\s+/g, ' ');
  const lastAssistant = [...history].reverse().find((turn) => turn.role === 'assistant');
  const previousUser = [...history].reverse().find((turn) => turn.role === 'user');
  const previousBoard = previousUser
    ? boardSignals.test(normalizeAssistantText(previousUser.content))
    : false;
  const lastBoard = Boolean(lastAssistant && (lastAssistant.sourceIds?.length || previousBoard));
  const reference = referring.test(text);
  const asksBoard = boardSignals.test(text);
  const asksGeneral = explicitGeneral.test(text);
  const clearScience = generalSignals.test(text);
  if (localCalendarReply(query)) return { mode: 'calendar', followup: false };
  if (asksGeneral && !asksBoard) return { mode: 'general', followup: false };
  if (/^(?:vay|the) (?:tai sao|vi sao|sao|do dau|giai thich)\b/.test(text) && !asksBoard)
    return { mode: 'general', followup: false };
  if (practicalHowTo.test(text) && !asksBoard) return { mode: 'general', followup: false };
  if (asksBoard)
    return {
      mode: hybridSignals.test(text) ? 'hybrid' : 'board',
      followup: reference && lastBoard,
    };
  // A complete new explanatory question must not inherit an unrelated Board citation.
  if (clearScience && !/\b(?:bai do|noi dung do|hoat dong do)\b/.test(text))
    return { mode: 'general', followup: false };
  // Short subject replies often answer a Board-specific clarification, not a new question.
  if (lastBoard && text.startsWith('mon ')) return { mode: 'board', followup: true };
  if (reference && lastAssistant)
    return { mode: lastBoard ? 'board' : 'general', followup: lastBoard };
  if (reference && !lastAssistant && /^(?:vay|the|con|the con|bai do|hoat dong do)\b/.test(text))
    return { mode: 'clarify', followup: false };
  if (ambiguousSignals.test(text)) return { mode: 'uncertain', followup: false };
  // Short noun-phrase queries may be exact published titles; check once before inference.
  if (shortTopic.test(text) && !generalContext.test(text))
    return { mode: 'title-check', followup: false };
  return { mode: 'general', followup: false };
}

/** Keeps only general-knowledge exchanges when starting a new unrelated topic. */
export function generalConversationHistory(history = []) {
  const clean = [];
  for (let i = 0; i < history.length; i++) {
    const turn = history[i];
    if (turn.role === 'assistant' && turn.sourceIds?.length) {
      if (clean.at(-1)?.role === 'user') clean.pop();
      continue;
    }
    clean.push({ role: turn.role, content: turn.content });
  }
  return clean.slice(-12);
}

/** Returns a safe route for bounded classifier JSON, or clarification on malformed output. */
export function decodeIntentRoute(generated) {
  let value = generated?.response ?? generated?.choices?.[0]?.message?.content;
  if (typeof value === 'string') {
    const text = value.replace(/^\s*<think>[\s\S]*?<\/think>\s*/, '').trim();
    if (text.length > 500 || text.startsWith('<think>')) return 'clarify';
    try {
      value = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    } catch {
      return 'clarify';
    }
  }
  const modes = {
    BOARD: 'board',
    GENERAL: 'general',
    HYBRID: 'hybrid',
    CLARIFY: 'clarify',
  };
  return modes[value?.mode] || 'clarify';
}
