/** Routes a natural Vietnamese question before any public Board read or embedding. */
import { normalizeAssistantText } from './board-assistant.js';

const boardSignals =
  /\b(?:bai dang|thong bao|bang hoc lieu|website|web nay|trang nay|tren web|tren trang|trong bai|theo bai|bai cua co|co dang|co co dang|co thong bao|lop minh|lop em|lop chung minh|trong lop|lich thi|lich kiem tra|thoi khoa bieu)\b/;
const generalSignals =
  /^(?:tai sao|vi sao|do dau|nguyen nhan|dinh nghia|khai niem|the nao la|la gi|giai thich|phan biet|vi du ve|cho vi du ve|cong thuc|cach tinh)\b/;
const explicitGeneral = /\b(?:kien thuc chung|theo khoa hoc|noi chung|khong lien quan (?:web|website|bai dang))\b/;
const hybridSignals =
  /\b(?:giai thich them|lien he thuc te|ung dung thuc te|theo khoa hoc|tai sao|vi sao)\b/;
const referring =
  /^(?:vay|the|con|the con|noi them|giai thich them|noi ro|cho em biet them|chi tiet|can chuan bi|em can|bao gio|khi nao|may gio|o dau|ai tham gia)\b|\b(?:bai do|noi dung do|hoat dong do|thong bao do|lich do|mon do|viec do)\b/;
const ambiguousSignals =
  /\b(?:co|lop|bai hoc|hoc lieu|chu de|chuan bi|hoat dong|thong tin|lich|ngay mai|tuan nay|hom nay)\b/;

/**
 * Separates topic intent from lexical similarity. Ambiguous requests may be classified
 * by Qwen without sending any Board text; citations never determine intent alone.
 */
export function routeAssistantIntent(query, history = []) {
  const text = normalizeAssistantText(query).trim().replace(/\s+/g, ' ');
  const lastAssistant = [...history].reverse().find((turn) => turn.role === 'assistant');
  const lastBoard = Boolean(lastAssistant?.sourceIds?.length);
  const reference = referring.test(text);
  const asksBoard = boardSignals.test(text);
  const asksGeneral = explicitGeneral.test(text);
  const clearScience = generalSignals.test(text);
  if (asksGeneral && !asksBoard) return { mode: 'general', followup: false };
  if (asksBoard)
    return {
      mode: hybridSignals.test(text) ? 'hybrid' : 'board',
      followup: reference && lastBoard,
    };
  // A complete new explanatory question must not inherit an unrelated Board citation.
  if (clearScience && !/\b(?:bai do|noi dung do|hoat dong do)\b/.test(text))
    return { mode: 'general', followup: false };
  if (reference && lastAssistant)
    return { mode: lastBoard ? 'board' : 'general', followup: lastBoard };
  if (reference && !lastAssistant && /^(?:vay|the|con|the con|bai do|hoat dong do)\b/.test(text))
    return { mode: 'clarify', followup: false };
  if (ambiguousSignals.test(text)) return { mode: 'uncertain', followup: false };
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
