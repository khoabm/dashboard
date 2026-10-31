/** Manual localhost Chromium QA: response content and collapsed sources; no external HTTP. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  const output = 'tests/local/ai-intent-ui';
  fs.mkdirSync(output, { recursive: true });
  const page = await browser.newPage();
  const captures = [];
  let external = 0;
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:4173/')) return route.continue();
    external++;
    return route.abort();
  });

  for (const [width, height] of [
    [390, 844],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:4173/tests/assistant-live-ui.html');
    await page.locator('.assistant-trigger').click();
    const ask = async (question) => {
      await page.locator('#assistant-query').fill(question);
      await page.locator('#assistant-query').press('Enter');
      await page.locator('.assistant-result').last().waitFor();
    };

    const mode = page.getByRole('combobox', { name: 'Kịch bản lỗi' });
    await mode.selectOption('answer');
    await ask('Chỉ tôi cách thiết kế nón lá đi');
    assert.match(await page.locator('.assistant-result').last().textContent(), /Đã nhận/);
    assert.equal(await page.locator('.assistant-answer-note').count(), 0);
    assert.equal(await page.locator('.assistant-source').count(), 0);

    await mode.selectOption('board');
    await ask('Theo bài Lịch thi GK1, môn Văn thi lúc mấy giờ?');
    const result = page.locator('.assistant-result').last();
    const toggle = result.locator('.assistant-sources-toggle');
    const panel = result.locator('.assistant-sources-panel');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await panel.getAttribute('aria-hidden'), 'true');
    assert.equal(await panel.evaluate((el) => el.inert), true);
    assert.equal(await result.locator('.assistant-source').count(), 1);
    assert.equal(await result.locator('.assistant-answer-note').count(), 0);
    assert.equal(await result.getByRole('button', { name: 'Mở học liệu' }).count(), 0);

    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await panel.evaluate((el) => el.inert), false);
    await result.getByRole('button', { name: 'Mở học liệu' }).waitFor();
    await toggle.click();
    assert.equal(await panel.getAttribute('aria-hidden'), 'true');
    assert.equal(await panel.evaluate((el) => el.inert), true);
    assert.equal(await result.getByRole('button', { name: 'Mở học liệu' }).count(), 0);

    await mode.selectOption('hybrid');
    await ask('Theo bài Lịch thi GK1, giải thích thêm cách ôn tập.');
    assert.equal(await page.locator('.assistant-answer-note').count(), 0);
    assert.equal(
      await page.locator('.assistant-result').last().locator('.assistant-sources-toggle').count(),
      1,
    );

    const geometry = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      composerBottom: document.querySelector('.assistant-composer').getBoundingClientRect().bottom,
      viewportHeight: innerHeight,
    }));
    assert.ok(
      geometry.documentWidth <= width && geometry.composerBottom <= height + 1,
      JSON.stringify(geometry),
    );
    captures.push({ width, height, ...geometry });
    await page.screenshot({ path: `${output}/chat-${width}x${height}.png` });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(
      await page.locator('.assistant-sources-panel').last().evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      ),
      '0s',
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    await mode.selectOption('rate_limit');
    await page.locator('#assistant-query').fill('Xin chào');
    await page.locator('#assistant-query').press('Enter');
    await page.getByRole('alert').filter({ hasText: '10 giây' }).waitFor();
    assert.equal(await page.locator('.assistant-consent input').isDisabled(), false);

    await mode.selectOption('answer');
    await ask('Em hỏi lại nhé');
    assert.match(await page.locator('.assistant-result').last().textContent(), /Đã nhận/);
    await page.keyboard.press('Escape');
    await page.locator('.assistant-trigger').focus();
    assert.equal(await page.locator('#assistant-dialog').count(), 0);
  }
  assert.equal(external, 0);
  fs.writeFileSync(`${output}/browser-results.json`, JSON.stringify({ captures, external }, null, 2));
  await browser.close();
  console.log('PASS: synthetic Board/general/hybrid, initially collapsed citations, keyboard/accessibility, reduced motion, 429 recovery, mobile and desktop');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
