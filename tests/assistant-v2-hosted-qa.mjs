/**
 * Read-only hosted acceptance. Runs only when the QA workflow changes on a Draft PR.
 * Maximum 4 requests, no retry, no private credentials. Persist answer evidence locally
 * as a CI artifact; never send private history or arbitrary client input.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = 'https://khtn8-assistant-v2-qa-20261101.joemckahn.workers.dev/chat';
const origin = 'https://f2c2953c.student-dashboard-bcy.pages.dev';
const cases = [
  {
    id: 'P0-EXACT-TITLE',
    query: 'Phong trào tháng 11',
    mode: 'board',
    expected: ['Phong trào Tháng 11', 'Trang trí nón lá', '20/11'],
    forbidden: [/1940/i, /kháng chiến/i],
    calls: 0,
  },
  {
    id: 'P0-EXPLICIT-WEB',
    query: 'Dựa vào nội dung web cho biết phong trào tháng 11 có gì?',
    mode: 'board',
    expected: ['Phong trào Tháng 11', 'Khoảnh khắc thầy trò'],
    forbidden: [/1940/i, /kháng chiến/i],
    calls: 0,
  },
  {
    id: 'P0-GENERAL-HOWTO',
    query: 'Chỉ tôi cách thiết kế nón lá',
    mode: 'general',
    expected: ['nón lá'],
    forbidden: [/Chọn học sinh tham gia/i, /Đặt mua 2 nón/i],
    calls: 1,
  },
  {
    id: 'P1-DATE',
    query: 'Hôm nay thứ mấy?',
    mode: 'general',
    expected: [],
    forbidden: [],
    calls: 0,
  },
];
const summary = {
  timestamp: new Date().toISOString(),
  endpoint,
  origin,
  requestCount: 0,
  cases: [],
};
const log = [];
await mkdir('tests/local/ai-v2-hosted', { recursive: true });
try {
  for (const item of cases) {
    summary.requestCount++;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: item.query, history: [] }),
      signal: AbortSignal.timeout(25000),
    });
    const raw = await response.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      throw Error(item.id + ': invalid JSON, HTTP ' + response.status);
    }
    const actual = {
      id: item.id,
      query: item.query,
      httpStatus: response.status,
      knowledge: json.knowledge,
      status: json.status,
      modelCalls: Number(response.headers.get('X-Assistant-Model-Calls') ?? -1),
      sourceCount: Array.isArray(json.sources) ? json.sources.length : -1,
      answer: String(json.answer || ''),
      passed: false,
    };
    summary.cases.push(actual);
    const errors = [];
    if (!response.ok) errors.push('HTTP ' + response.status);
    if (json.status !== 'answered') errors.push('unexpected status: ' + json.status);
    if (json.knowledge !== item.mode) errors.push('knowledge=' + json.knowledge);
    if (actual.modelCalls !== item.calls) errors.push('modelCalls=' + actual.modelCalls);
    if (item.mode === 'board' && actual.sourceCount < 1) errors.push('missing Board source');
    if (item.mode === 'general' && actual.sourceCount !== 0)
      errors.push('unexpected Board citation');
    if (!item.expected.every((term) => actual.answer.toLowerCase().includes(term.toLowerCase())))
      errors.push('missing expected content');
    if (item.forbidden.some((pattern) => pattern.test(actual.answer)))
      errors.push('unrelated article/general content');
    if (item.id === 'P1-DATE') {
      const localDate = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date());
      if (!actual.answer.includes(localDate)) errors.push('wrong current Vietnamese day/date');
    }
    actual.passed = errors.length === 0;
    actual.errors = errors;
    // Output is only the four owner-selected, anonymous public/general QA prompts.
    console.log('\n### ' + item.id + '\nQuestion: ' + item.query);
    console.log(
      'HTTP: ' +
        actual.httpStatus +
        ', route: ' +
        actual.knowledge +
        ', models: ' +
        actual.modelCalls +
        ', source count: ' +
        actual.sourceCount,
    );
    console.log('Answer: ' + actual.answer);
    console.log('Outcome: ' + (actual.passed ? 'PASS' : 'FAIL (' + errors.join('; ') + ')'));
    log.push(actual.passed ? 'PASS ' + item.id : 'FAIL ' + item.id + ': ' + errors.join('; '));
    if (!actual.passed) break; // no further neuron use after first failure
  }
} catch (error) {
  summary.error = String(error?.message || error);
  console.error('QA ERROR:', summary.error);
} finally {
  await writeFile('tests/local/ai-v2-hosted/results.json', JSON.stringify(summary, null, 2));
  await writeFile('tests/local/ai-v2-hosted/report.txt', log.join('\n') + '\n');
}
const success = summary.cases.length === cases.length && summary.cases.every((test) => test.passed);
console.log(
  'TOTAL: ' + summary.cases.length + '/' + cases.length + ', ' + (success ? 'PASS' : 'FAIL'),
);
if (!success) process.exitCode = 1;
