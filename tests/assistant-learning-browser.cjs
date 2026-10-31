/** Explicit V2 synthetic Chromium acceptance, outside curated CI; requires environment Playwright core. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  let external = 0;
  const output = 'tests/local/assistant-v2-correction';
  fs.mkdirSync(output, { recursive: true });
  await page.route('**/*', (route) =>
    route.request().url().startsWith('http://127.0.0.1:4173/')
      ? route.continue()
      : (external++, route.abort()),
  );
  const url = 'http://127.0.0.1:4173/tests/board-assistant-ui.html';
  const geometry = [];
  for (const [width, height] of [
    [360, 640],
    [390, 844],
    [667, 375],
    [768, 1024],
    [1024, 768],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(url);
    await page.locator('.assistant-trigger').focus();
    await page.keyboard.press('Enter');
    const ask = async (query) => {
      await page.locator('#assistant-query').fill(query);
      await page.locator('#assistant-query').press('Enter');
    };
    await page.locator('.assistant-consent input').check();
    await ask('Web này làm gì?');
    assert.match(
      await page.locator('.assistant-learning-answer').last().textContent(),
      /Vui học cùng cô Quỳnh/,
    );
    assert.match(
      await page.locator('.assistant-learning-answer').last().textContent(),
      /website tích hợp các ứng dụng/,
    );
    assert.equal(
      /KHTN|lớp 8/.test(await page.locator('.assistant-learning-answer').last().textContent()),
      false,
    );
    assert.equal(
      await page.locator('.assistant-result').last().locator('.assistant-filter-button').count(),
      0,
    );
    for (const question of [
      'Web có những gì?',
      'Trang này có bài học nào?',
      'Website có nội dung gì?',
      'Tóm tắt nội dung trang này.',
    ]) {
      await ask(question);
      assert.match(
        await page.locator('.assistant-learning-answer').last().textContent(),
        /1 học liệu/,
      );
      assert.equal(
        await page.locator('.assistant-result').last().locator('.assistant-filter-button').count(),
        0,
      );
    }
    for (const [question, expectation] of [
      ['Bảng điểm cá nhân dùng để làm gì?', '/personal-gradebook'],
      ['Tôi muốn xem điểm thì vào đâu?', '/personal-gradebook'],
      ['Quản lý bảng điểm và lớp ở đâu?', '/personal-gradebook/admin'],
      ['Vui học cùng cô Quỳnh có những ứng dụng gì?', 'Bảng điểm cá nhân'],
    ]) {
      await ask(question);
      assert.ok((await page.locator('.assistant-learning-answer').last().textContent()).includes(expectation));
      assert.equal(await page.locator('.assistant-result').last().locator('.assistant-filter-button').count(), 0);
    }
    await ask('Làm sao xem điểm của người khác?');
    assert.match(await page.locator('.assistant-learning-answer').last().textContent(), /không xem, sửa/);
    assert.equal(await page.evaluate(() => calls), 0);
    await ask('Có bao nhiêu học liệu?');
    assert.match(
      await page.locator('.assistant-learning-answer').last().textContent(),
      /1 học liệu.*1 chủ đề/,
    );
    assert.equal(await page.evaluate(() => calls), 0);
    await page.evaluate(
      () =>
        (window.mockReply = {
          mode: 'ai',
          status: 'answered',
          answer: 'Phản ứng tạo khí làm xuất hiện bọt khí. <img src=x onerror=alert(1)>',
          coverage: 'provided_text',
          sources: [{ id: 'p', quote: data.posts[0].body }],
        }),
    );
    await page.locator('.assistant-consent input').check();
    await ask('Giải thích bọt khí');
    await page.locator('.assistant-sources-toggle').last().click();
    await page.locator('.assistant-source').last().waitFor();
    assert.equal(await page.locator('.assistant-learning-answer img').count(), 0);
    await page.evaluate(
      () => (window.mockReply.answer = 'Phản ứng tạo ra khí nên bạn quan sát được bọt khí.'),
    );
    await ask('Nói đơn giản hơn nữa.');
    await page.waitForFunction(() => calls === 2);
    assert.deepEqual(await page.evaluate(() => lastRequest.context), {
      query: 'Giải thích bọt khí',
      ids: ['p'],
    });
    const g = await page.locator('.assistant-dialog').evaluate((d) => ({
      width: innerWidth,
      height: innerHeight,
      docWidth: document.documentElement.scrollWidth,
      composerBottom: d.querySelector('.assistant-composer').getBoundingClientRect().bottom,
      transcriptHeight: d.querySelector('.assistant-messages').clientHeight,
    }));
    assert.ok(
      g.docWidth <= width && g.composerBottom <= height + 1 && g.transcriptHeight > 30,
      JSON.stringify(g),
    );
    geometry.push(g);
    await page.screenshot({ path: `${output}/${width}x${height}.png` });
    await page.locator('.assistant-sources-toggle').last().click();
    await page.getByRole('button', { name: 'Mở học liệu', exact: true }).last().click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(30);
    assert.equal(
      await page.locator('.assistant-trigger').evaluate((e) => e === document.activeElement),
      true,
    );
    await page.locator('.assistant-trigger').click();
    await ask('khí');
    await page.locator('.assistant-sources-toggle').last().click();
    await page.locator('.assistant-filter-button').last().click();
    assert.deepEqual(await page.evaluate(() => actions.at(-1)), { type: 'filter', ids: ['p'] });
    await page.locator('.assistant-trigger').click();
    await ask('Giải thích theo cách dễ hiểu hơn.');
    assert.match(
      await page.locator('.assistant-learning-answer').last().textContent(),
      /chọn hoặc tìm/,
    );
    assert.equal(await page.evaluate(() => calls), 2);
    assert.equal(
      await page.evaluate(() => Object.keys(localStorage).some((k) => /assistant|chat/i.test(k))),
      false,
    );
  }
  await page.goto(url);
  await page.locator('.assistant-trigger').click();
  await page.locator('#assistant-query').fill('zzzzzzzz');
  await page.locator('#assistant-query').press('Enter');
  assert.equal(
    await page.locator('.assistant-result').last().locator('.assistant-filter-button').count(),
    0,
  );
  await page.evaluate(
    () =>
      (window.mockReply = {
        mode: 'ai',
        status: 'insufficient',
        answer: 'Chưa đủ nguồn.',
        coverage: 'insufficient',
        sources: [],
      }),
  );
  await page.locator('.assistant-consent input').check();
  await page.locator('#assistant-query').fill('Thủ đô của nước Pháp là gì?');
  await page.locator('#assistant-query').press('Enter');
  await page.waitForFunction(() => calls === 1);
  assert.equal(
    await page.locator('.assistant-result').last().locator('.assistant-filter-button').count(),
    0,
  );
  await page.evaluate(
    () => (window.mockReply.sources = [{ id: 'revoked', quote: 'Không hợp lệ' }]),
  );
  await page.locator('#assistant-query').fill('khí');
  await page.locator('#assistant-query').press('Enter');
  await page.getByRole('alert').filter({ hasText: 'Đã tắt AI' }).waitFor();
  assert.equal(await page.locator('.assistant-consent input').isDisabled(), true);
  await page.goto(url);
  await page.evaluate(() => (window.quota = true));
  await page.locator('.assistant-trigger').click();
  await page.locator('.assistant-consent input').check();
  await page.locator('#assistant-query').fill('khí');
  await page.locator('#assistant-query').press('Enter');
  await page.getByRole('alert').filter({ hasText: 'hết hạn mức' }).waitFor();
  assert.equal(await page.evaluate(() => calls), 1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await page.locator('.assistant-send').evaluate((e) => getComputedStyle(e).transitionDuration),
    '0s',
  );
  fs.writeFileSync(`${output}/geometry.json`, JSON.stringify({ geometry, external }, null, 2));
  assert.equal(external, 0);
  await browser.close();
  console.log(
    'PASS V2: six viewports, deterministic zero calls, generated safe text/citations, follow-up context, preview focus, close-reset context, quota/no retry, reduced motion, no external HTTP',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
