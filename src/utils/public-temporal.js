/** Extracts labelled date evidence from public text; timestamps never become event dates. */
import { normalizeAssistantText } from './board-assistant.js';
export const publicTimeZone = 'Asia/Ho_Chi_Minh';

/** Returns civil query ranges from an injected instant, independent of the execution timezone. */
export function publicTimeContext(query, now = new Date()) {
  const instant = new Date(now);
  if (!Number.isFinite(instant.getTime())) throw Error('clock');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: publicTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
  const text = normalizeAssistantText(query);
  const day = new Date(`${today}T00:00:00Z`);
  let start = today,
    end = today,
    kind = 'none';
  const iso = (value) => value.toISOString().slice(0, 10);
  if (/thang nay/.test(text)) {
    kind = 'month';
    start = today.slice(0, 7) + '-01';
    end = iso(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)));
  } else if (/tuan nay/.test(text)) {
    kind = 'week';
    day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
    start = iso(day);
    day.setUTCDate(day.getUTCDate() + 6);
    end = iso(day);
  } else if (/hom nay/.test(text)) kind = 'today';
  else if (/sap toi|sap dien ra/.test(text)) {
    kind = 'upcoming';
    end = null;
  } else if (/da ket thuc|da qua/.test(text)) {
    kind = 'past';
    start = null;
  } else if (/moi nhat|gan day/.test(text)) kind = 'recent';
  const date = publicDateEvidence(query).dates[0];
  return {
    now: instant.toISOString(),
    timeZone: publicTimeZone,
    today,
    kind,
    start,
    end,
    requestedDate: date ? { day: date.day, month: date.month, year: date.year } : null,
  };
}

/** Keeps explicit dates, uncertain year, deadlines and cancellation text as separate evidence. */
export function publicDateEvidence(text) {
  const normalized = normalizeAssistantText(text);
  const dates = [];
  const pattern =
    /\b(?:(?<iy>\d{4})-(?<im>\d{1,2})-(?<id>\d{1,2})|(?<dd>\d{1,2})[/-](?<dm>\d{1,2})(?:[/-](?<dy>\d{4}))?|(?:ngay\s+)?(?<vd>\d{1,2})\s+thang\s+(?<vm>\d{1,2})(?:\s+nam\s+(?<vy>\d{4}))?)\b/g;
  for (const match of normalized.matchAll(pattern)) {
    const groups = match.groups;
    const day = Number(groups.id || groups.dd || groups.vd),
      month = Number(groups.im || groups.dm || groups.vm),
      yearValue = groups.iy || groups.dy || groups.vy,
      year = yearValue ? Number(yearValue) : null;
    const check = new Date(Date.UTC(year ?? 2000, month - 1, day));
    if (
      check.getUTCDate() !== day ||
      check.getUTCMonth() !== month - 1 ||
      (year !== null && check.getUTCFullYear() !== year)
    )
      continue;
    const prefix = normalized
      .slice(Math.max(0, match.index - 100), match.index)
      .split(/[\n.;!?]/)
      .at(-1);
    const cues = [
      ...prefix.matchAll(
        /dien ra|to chuc|bat dau|ket thuc|han dang ky|dang ky|chuan bi|ngay dang|dang bai|chinh sua|cap nhat|ngay tao|duoc tao|tao bai/g,
      ),
    ];
    const cue = cues.at(-1)?.[0] || '';
    const kind = /dang ky/.test(cue)
      ? 'registration'
      : /chuan bi/.test(cue)
        ? 'preparation'
        : /ngay dang|dang bai/.test(cue)
          ? 'publication_text'
          : /ngay tao|duoc tao|tao bai/.test(cue)
            ? 'creation_text'
            : /chinh sua|cap nhat/.test(cue)
              ? 'edit_text'
              : /dien ra|to chuc|bat dau|ket thuc/.test(cue)
                ? 'event'
                : 'unknown';
    dates.push({
      text: match[0],
      day,
      month,
      year,
      iso:
        year === null
          ? null
          : `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      kind,
      cue,
    });
  }
  return {
    dates,
    cancelled: /\b(huy|huy bo|tam hoan)\b/.test(normalized),
    revised: /doi lich|thay doi|dinh chinh|thay the/.test(normalized),
  };
}

/** Scores only explicit event/notice-text dates for a query range; missing years never imply future. */
export function publicTemporalScore(query, text, clock) {
  const ctx = publicTimeContext(query, clock),
    evidence = publicDateEvidence(text);
  let score = 0;
  for (const date of evidence.dates) {
    if (
      ctx.requestedDate &&
      date.day === ctx.requestedDate.day &&
      date.month === ctx.requestedDate.month &&
      (!ctx.requestedDate.year || date.year === ctx.requestedDate.year)
    )
      score += 3;
    if (
      date.iso &&
      date.kind === 'event' &&
      ctx.kind !== 'none' &&
      ctx.kind !== 'recent' &&
      (!ctx.start || date.iso >= ctx.start) &&
      (!ctx.end || date.iso <= ctx.end)
    )
      score += 2;
  }
  return score;
}

/** Rejects obvious temporal/numeric inventions; this is not a semantic entailment proof. */
export function validatePublicAnswerFacts(result, catalog, grounding, query) {
  if (result.status !== 'answered') return result;
  const cited = catalog.filter((p) => result.sources.some((s) => s.id === p.id));
  const original = cited.map((p) => `${p.title}\n${p.body}`).join('\n');
  const evidence = publicDateEvidence(original),
    answer = publicDateEvidence(result.answer);
  const normalized = normalizeAssistantText(result.answer);
  const metaDates = [];
  for (const meta of grounding.passages.filter((p) => result.sources.some((s) => s.id === p.id))) {
    for (const [field, kind] of [
      ['createdAt', 'creation_text'],
      ['updatedAt', 'edit_text'],
    ])
      if (meta[field]) {
        const civil = publicTimeContext('', meta[field]).today.split('-').map(Number);
        metaDates.push({ year: civil[0], month: civil[1], day: civil[2], kind });
      }
  }
  for (const date of answer.dates) {
    const allowed = [...evidence.dates, ...metaDates.filter((d) => d.kind === date.kind)];
    if (
      !allowed.some(
        (source) =>
          source.day === date.day &&
          source.month === date.month &&
          (!date.year || source.year === date.year) &&
          (date.kind === 'unknown' || source.kind === date.kind),
      )
    )
      throw Error('unsupported_date');
  }
  const numericKey = (value) => String(Number(value.replace(',', '.')));
  const numbers = new Set((original.match(/\d+(?:[.,]\d+)?/g) || []).map(numericKey));
  for (const d of metaDates)
    if (answer.dates.some((a) => a.kind === d.kind))
      for (const value of [d.year, d.month, d.day]) numbers.add(String(value));
  for (const value of result.answer.match(/\d+(?:[.,]\d+)?/g) || [])
    if (!numbers.has(numericKey(value))) throw Error('unsupported_number');
  if (
    evidence.cancelled &&
    !/\bhuy\b|\bhoan\b|khong con hieu luc|chua the|chua du/.test(normalized)
  )
    throw Error('cancellation');
  // Schedule changes constrain temporal questions/claims, not unrelated preparation or audience facts.
  const revisionRelevant =
    answer.dates.length > 0 ||
    publicDateEvidence(query).dates.length > 0 ||
    /\blich\b|khi nao|bao gio|thoi gian|thoi diem|sap toi|se dien ra|da ket thuc/.test(
      `${normalizeAssistantText(query)} ${normalized}`,
    );
  if (
    evidence.revised &&
    revisionRelevant &&
    !/thay doi|doi lich|dinh chinh|dieu chinh|thay the|chuyen sang|mau thuan|chua the/.test(
      normalized,
    )
  )
    throw Error('revision');
  const ctx = publicTimeContext(query, grounding.clock);
  if (
    (ctx.kind === 'upcoming' || /sap toi|sap dien ra|se dien ra/.test(normalized)) &&
    !evidence.dates.some((d) => d.kind === 'event' && d.iso && d.iso >= ctx.today) &&
    !/chua ro|thieu nam|khong du|chua du|chua the|khong xac dinh/.test(normalized)
  )
    throw Error('unknown_future');
  if (
    /da ket thuc/.test(normalized) &&
    !evidence.dates.some((d) => d.cue === 'ket thuc' && d.iso && d.iso <= ctx.today) &&
    !/da ket thuc/.test(normalizeAssistantText(original)) &&
    !/chua ro|chua du|chua the|khong xac dinh/.test(normalized)
  )
    throw Error('unknown_end');
  if (
    ctx.kind === 'recent' &&
    /moi nhat/.test(normalized) &&
    !/trong snapshot|trong tap|trong cac nguon|duoc cung cap/.test(normalized)
  )
    throw Error('unknown_latest');
  return result;
}
