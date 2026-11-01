/** Read-only hosted GK regression: 3 finite HTTP calls, never retry on failure. */
import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = 'https://khtn8-assistant-v2-qa-20261101.joemckahn.workers.dev/chat';
const origin = 'https://f2c2953c.student-dashboard-bcy.pages.dev';
const originalQuestion = 'Thi GK có gì?';
const clarification = 'Em muốn hỏi kiến thức chung hay tìm thông tin từ bài đăng trên website?';
const scenarios = [
  { id: 'GK-01', query: originalQuestion, history: [] },
  { id: 'GK-02', query: 'Thi giữa kì có gì?', history: [] },
  {
    id: 'GK-03',
    query: 'kiến thức website',
    history: [
      { role: 'user', content: originalQuestion },
      { role: 'assistant', content: clarification },
    ],
  },
];
const output = 'tests/local/assistant-gk-qa';
const report = { executedAt: new Date().toISOString(), endpoint, cases: [] };
await mkdir(output, { recursive: true });
try {
  for (const item of scenarios) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: item.query, history: item.history }),
      signal: AbortSignal.timeout(25000),
    });
    const raw = await response.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      throw Error(item.id + ': non-JSON response, status ' + response.status);
    }
    const result = {
      id: item.id,
      query: item.query,
      history: item.history,
      status: response.status,
      knowledge: json.knowledge,
      responseStatus: json.status,
      answer: String(json.answer || ''),
      sources: Array.isArray(json.sources)
        ? json.sources.map((source) => ({ id: source.id, quote: source.quote }))
        : [],
      modelCalls: Number(response.headers.get('X-Assistant-Model-Calls') ?? -1),
      passed: false,
      failures: [],
    };
    report.cases.push(result);
    if (response.status !== 200) result.failures.push('HTTP ' + response.status);
    if (json.status !== 'answered') result.failures.push('answer status=' + json.status);
    if (json.knowledge !== 'board') result.failures.push('route=' + json.knowledge);
    if (result.modelCalls !== 0)
      result.failures.push('unexpected model calls=' + result.modelCalls);
    if (result.sources.length !== 3) result.failures.push('expected 3 cited public posts');
    for (const phrase of [
      'Lịch thi GK1',
      '7g20 Kiểm tra môn Văn',
      'Kiểm tra GK môn LS-ĐL',
      'Đáp án GK1 môn Toán',
    ]) {
      if (!result.answer.includes(phrase)) result.failures.push('missing ' + phrase);
    }
    if (/1940|kháng chiến|Trang trí nón lá/i.test(result.answer))
      result.failures.push('unrelated source or hallucination');
    result.passed = result.failures.length === 0;
    console.log('\n### ' + item.id);
    console.log('Question:', item.query);
    console.log('History:', JSON.stringify(item.history));
    console.log('HTTP:', result.status, 'Knowledge:', result.knowledge);
    console.log('Sources:', result.sources.length, 'Model calls:', result.modelCalls);
    console.log('Exact answer:\n' + result.answer);
    console.log('PASS:', result.passed, result.failures.join('; '));
    if (!result.passed) break;
  }
} catch (error) {
  report.error = String(error?.message || error);
  console.error('QA aborted:', report.error);
} finally {
  await writeFile(output + '/results.json', JSON.stringify(report, null, 2));
  await writeFile(
    output + '/report.txt',
    report.cases
      .map((item) =>
        [
          item.id + ' — ' + (item.passed ? 'PASS' : 'FAIL'),
          'Question: ' + item.query,
          'Route: ' + item.knowledge,
          'Answer:\n' + item.answer,
          'Failures: ' + item.failures.join(', '),
        ].join('\n'),
      )
      .join('\n\n'),
  );
}
const success = report.cases.length === scenarios.length && report.cases.every((c) => c.passed);
console.log('GK TOTAL:', report.cases.length + '/' + scenarios.length, success ? 'PASS' : 'FAIL');
if (!success) process.exitCode = 1;
