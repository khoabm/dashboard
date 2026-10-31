/** Manual synthetic Chromium QA of live response labels; blocked external traffic, outside curated CI. */
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
    const ask = async (text) => {
      await page.locator('#assistant-query').fill(text);
      await page.locator('#assistant-query').press('Enter');
      await page.locator('.assistant-result').last().waitFor();
    };
    await page.getByRole('combobox', { name: 'Kịch bản lỗi' }).selectOption('answer');
    await ask('Tại sao bầu trời màu xanh?');
    assert.match(
      await page.locator('.assistant-result').last().textContent(),
      /Kiến thức chung do AI tạo/,
    );
    assert.equal(await page.locator('.assistant-result').last().locator('.assistant-source').count(), 0);

    await page.getByRole('combobox', { name: 'Kịch bản lỗi' }).selectOption('board');
    await ask('Trong bài Lịch thi GK1, Văn thi lúc mấy giờ?');
    assert.match(
      await page.locator('.assistant-result').last().textContent(),
      /Thông tin từ bài đăng công khai/,
    );
    assert.equal(await page.locator('.assistant-result').last().locator('.assistant-source').count(), 1);
    await page.getByRole('combobox', { name: 'Kịch bản lỗi' }).selectOption('hybrid');
    await ask('Giải thích thêm về bài đăng của cô');
    assert.match(
      await page.locator('.assistant-result').last().textContent(),
      /Kết hợp bài đăng công khai và giải thích từ AI/,
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

    await page.getByRole('combobox', { name: 'Kịch bản lỗi' }).selectOption('rate_limit');
    await page.locator('#assistant-query').fill('Xin chào');
    await page.locator('#assistant-query').press('Enter');
    await page.getByRole('alert').filter({ hasText: '10 giây' }).waitFor();
    assert.equal(await page.locator('.assistant-consent input').isDisabled(), false);

    await page.getByRole('combobox', { name: 'Kịch bản lỗi' }).selectOption('answer');
    await ask('Em hỏi lại nhé');
    assert.match(await page.locator('.assistant-result').last().textContent(), /Kiến thức chung/);
    await page.keyboard.press('Escape');
    await page.locator('.assistant-trigger').focus();
    assert.equal(await page.locator('#assistant-dialog').count(), 0);
  }
  assert.equal(external, 0);
  fs.writeFileSync(`${output}/browser-results.json`, JSON.stringify({ captures, external }, null, 2));
  await browser.close();
  console.log('PASS: synthetic general/Board/hybrid labels, source actions, 429 recovery, mobile/desktop no overflow');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
