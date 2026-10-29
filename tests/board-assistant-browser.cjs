/** Runs explicit synthetic browser acceptance outside test:ci; requires external Playwright core and Chromium. */
const assert = require('node:assert/strict');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage();
  let external = 0;
  await p.route('**/*', (r) =>
    r.request().url().startsWith('http://127.0.0.1:4173/') ? r.continue() : (external++, r.abort()),
  );
  const url = 'http://127.0.0.1:4173/tests/board-assistant-ui.html';
  let evidence = [];
  for (const [w, h] of [
    [360, 640],
    [390, 844],
    [667, 375],
    [768, 1024],
    [1024, 768],
    [1440, 900],
    [1024, 375],
    [720, 450],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(url);
    await p.locator('.assistant-trigger').focus();
    await p.keyboard.press('Enter');
    assert.equal(
      await p.locator('#assistant-query').evaluate((e) => e === document.activeElement),
      true,
    );
    await p.keyboard.press('Tab');
    await p.keyboard.press('Shift+Tab');
    await p.locator('#assistant-query').fill('khí');
    await p.locator('#assistant-query').press('Shift+Enter');
    assert.ok((await p.locator('#assistant-query').inputValue()).includes('\n'));
    await p.locator('#assistant-query').press('Enter');
    await p.locator('.assistant-source').waitFor();
    const g = await p.locator('.assistant-dialog').evaluate((d) => {
      let c = d.querySelector('.assistant-composer').getBoundingClientRect(),
        m = d.querySelector('.assistant-messages');
      return {
        width: innerWidth,
        height: innerHeight,
        docWidth: document.documentElement.scrollWidth,
        dialogRight: d.getBoundingClientRect().right,
        composerBottom: c.bottom,
        transcript: m.clientHeight,
        scrollable: m.scrollHeight > m.clientHeight,
      };
    });
    assert.ok(
      g.docWidth <= w && g.dialogRight <= w + 1 && g.composerBottom <= h + 1 && g.transcript > 30,
      JSON.stringify(g),
    );
    evidence.push(g);
    await p.screenshot({ path: `tests/local/assistant-e2e/after-${w}x${h}.png` });
    await p.getByRole('button', { name: 'Mở học liệu', exact: true }).click();
    assert.equal(await p.locator('dialog[open]').count(), 1);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(30);
    assert.equal(
      await p.locator('.assistant-trigger').evaluate((e) => document.activeElement === e),
      true,
    );
  }
  await p.goto(url);
  await p.locator('.assistant-trigger').click();
  await p.locator('.assistant-utilities-toggle').click();
  await p.locator('.assistant-suggestion').first().click();
  assert.equal(await p.evaluate(() => calls), 0);
  await p.getByRole('button', { name: /Cuộc trò chuyện mới/ }).click();
  assert.equal(await p.locator('.assistant-message').count(), 1);
  await p.locator('.assistant-consent input').check();
  await p.locator('#assistant-query').fill('khí');
  await p.locator('#assistant-query').press('Enter');
  await p.locator('#assistant-error').filter({ hasText: 'Đã tắt AI' }).waitFor();
  assert.match(await p.locator('#assistant-privacy').textContent(), /AI đang tắt/);
  assert.equal(await p.evaluate(() => calls), 1);
  await p.keyboard.press('Escape');
  await p.locator('.assistant-trigger').click();
  assert.equal(await p.locator('.assistant-consent input').isDisabled(), true);
  await p.goto(url);
  await p.evaluate(() => (window.delay = true));
  await p.locator('.assistant-trigger').click();
  await p.locator('.assistant-consent input').check();
  await p.locator('#assistant-query').fill('khí');
  await p.locator('#assistant-query').press('Enter');
  await p.locator('.assistant-stop').click();
  await p.evaluate(() => release());
  assert.equal(await p.locator('.assistant-source').count(), 0);
  await p.locator('.assistant-consent input').check();
  await p.locator('#assistant-query').press('Enter');
  await p.keyboard.press('Escape');
  await p.evaluate(() => release());
  await p.waitForTimeout(30);
  assert.equal(await p.locator('dialog').count(), 0);
  fs.writeFileSync(
    'tests/local/assistant-e2e/geometry.json',
    JSON.stringify({ evidence, external }, null, 2),
  );
  await b.close();
  console.log(
    'PASS: 8 viewport geometries, keyboard preview focus, suggestions/new, cloud failure/reopen, stop/close late responses; external requests blocked=' +
      external,
  );
})();
