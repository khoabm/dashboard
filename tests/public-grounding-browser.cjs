/** Explicit Gate B browser evidence; actual local Vite/Chromium, scripted models only, outside CI. */
const assert = require('node:assert/strict'),
  fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  let external = 0;
  const output = 'tests/local/public-grounding';
  fs.mkdirSync(output, { recursive: true });
  await page.route('**/*', (route) =>
    route.request().url().startsWith('http://127.0.0.1:4173/')
      ? route.continue()
      : (external++, route.abort()),
  );
  const url = 'http://127.0.0.1:4173/tests/public-grounding-ui.html';
  const evidence = [];
  const ask = async (q) => {
    await page.locator('#assistant-query').fill(q);
    await page.locator('#assistant-query').press('Enter');
    await page.waitForFunction(() => !document.querySelector('#assistant-query')?.disabled);
  };
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
    await page.locator('.assistant-trigger').click();
    await page.locator('.assistant-consent input').check();
    assert.match(
      await page.locator('#assistant-privacy').textContent(),
      /ngữ cảnh nguồn.*đoạn văn bản công khai/,
    );
    await ask('Tôi muốn xem điểm thì vào đâu?');
    assert.match(
      await page.locator('.assistant-learning-answer').last().textContent(),
      /\/personal-gradebook/,
    );
    assert.equal(await page.evaluate(() => calls.length), 0);
    await ask('Mật độ tinh thể xanh đo được là bao nhiêu?');
    await page.locator('.assistant-source').last().waitFor();
    assert.match(await page.locator('.assistant-learning-answer').last().textContent(), /7 đơn vị/);
    assert.match(
      await page.locator('.assistant-source blockquote').last().textContent(),
      /7 đơn vị/,
    );
    assert.equal(await page.evaluate(() => calls.length), 2);
    assert.equal(await page.evaluate(() => wires[0].catalog.length <= 8), true);
    assert.equal(await page.locator('.assistant-consent input').isDisabled(), false);
    await ask('Nói dễ hiểu hơn được không?');
    assert.equal(await page.evaluate(() => calls.length), 3);
    assert.match(await page.locator('.assistant-learning-answer').last().textContent(), /7 đơn vị/);
    const g = await page.locator('.assistant-dialog').evaluate((d) => ({
      width: innerWidth,
      height: innerHeight,
      docWidth: document.documentElement.scrollWidth,
      bottom: d.querySelector('.assistant-composer').getBoundingClientRect().bottom,
      transcript: d.querySelector('.assistant-messages').clientHeight,
      scroll: d.querySelector('.assistant-messages').scrollHeight,
    }));
    assert.ok(
      g.docWidth <= width && g.bottom <= height + 1 && g.transcript > 30,
      JSON.stringify(g),
    );
    evidence.push(g);
    await page.screenshot({ path: `${output}/${width}x${height}.png` });
    await page.getByRole('button', { name: 'Mở học liệu', exact: true }).last().click();
    await page.locator('.preview-body').waitFor();
    assert.match(await page.locator('.preview-body').textContent(), /7 đơn vị/);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(30);
    assert.equal(
      await page.locator('.assistant-trigger').evaluate((e) => document.activeElement === e),
      true,
    );
    await page.locator('.assistant-trigger').click();
    await ask('mật độ tinh thể xanh');
    await page.locator('.assistant-filter-button').last().click();
    assert.deepEqual(await page.evaluate(() => selectedIds), ['deep']);
    assert.equal(await page.locator('.post-card').count(), 1);
    await page.locator('.assistant-trigger').click();
    const toggle = page.locator('.assistant-utilities-toggle');
    if (await toggle.isVisible()) await toggle.click();
    await page.getByRole('button', { name: /Bộ lọc trang/ }).click();
    assert.equal(await page.evaluate(() => selectedIds), null);
  }
  await page.goto(url);
  await page.locator('.assistant-trigger').click();
  await page.locator('.assistant-consent input').check();
  await page.evaluate(() => (window.html = true));
  await ask('mật độ tinh thể xanh');
  assert.equal(await page.locator('.assistant-learning-answer img').count(), 0);
  assert.match(await page.locator('.assistant-learning-answer').last().textContent(), /<img/);
  await page.evaluate(() => (window.insufficient = true));
  await ask('zzzz không rõ nội dung');
  assert.equal(
    await page.locator('.assistant-result').last().locator('.assistant-filter-button').count(),
    0,
  );
  await page.goto(url);
  await page.evaluate(() => (data.publicCoverage.complete = false));
  await page.locator('.assistant-trigger').click();
  await ask('Web này làm gì?');
  assert.match(await page.locator('.assistant-result').last().textContent(), /chưa xác minh/i);
  await page.goto(url);
  await page.locator('.assistant-trigger').click();
  await page.locator('.assistant-consent input').check();
  await page.evaluate(() => (window.hold = true));
  await page.locator('#assistant-query').fill('mật độ tinh thể xanh');
  await page.locator('#assistant-query').press('Enter');
  await page.waitForFunction(() => typeof release === 'function');
  await page.locator('.assistant-stop').click();
  await page.evaluate(() => {
    hold = false;
    release();
  });
  await page.waitForTimeout(40);
  assert.equal(await page.locator('.assistant-source').count(), 0);
  await page.locator('#assistant-query').fill('mật độ tinh thể xanh');
  await page.locator('#assistant-query').press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.assistant-source').length > 0);
  await page.evaluate(() => (data.posts.find((p) => p.id === 'deep').status = 'hidden'));
  await page.getByRole('button', { name: 'Mở học liệu', exact: true }).last().click();
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(await page.evaluate(() => actions.length), 0);
  await page.goto(url);
  await page.locator('.assistant-trigger').click();
  await page.locator('.assistant-consent input').check();
  await page.evaluate(() => (window.hold = true));
  await page.locator('#assistant-query').fill('mật độ tinh thể xanh');
  await page.locator('#assistant-query').press('Enter');
  await page.waitForFunction(() => typeof release === 'function');
  await page.evaluate(() => {
    data.posts.find((p) => p.id === 'deep').body += ' Nội dung đã đổi.';
    hold = false;
    release();
  });
  await page.waitForFunction(() => document.querySelectorAll('dialog').length === 0);
  assert.equal(await page.locator('.assistant-source').count(), 0);
  await page.goto(url);
  await page.locator('.assistant-trigger').click();
  await page.locator('.assistant-consent input').check();
  await page.evaluate(() => (window.hold = true));
  await page.locator('#assistant-query').fill('mật độ tinh thể xanh');
  await page.locator('#assistant-query').press('Enter');
  await page.waitForFunction(() => typeof release === 'function');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    hold = false;
    release();
  });
  await page.waitForTimeout(40);
  assert.equal(await page.locator('dialog').count(), 0);
  assert.equal(await page.evaluate(() => calls.length), 1);
  assert.equal(
    await page.evaluate(() => Object.keys(localStorage).some((k) => /assistant|chat/i.test(k))),
    false,
  );
  assert.equal(external, 0);
  fs.writeFileSync(`${output}/geometry.json`, JSON.stringify({ evidence, external }, null, 2));
  await browser.close();
  console.log(
    'PASS Gate B Chromium6 viewport: large corpus/deep quote, actual service+Worker fake bindings, follow-up, native open/filter/reset, unknown coverage, cancel/revoke, safe HTML, external HTTP0',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
