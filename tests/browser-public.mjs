// Browser checks for the content actually included in the public checkout.
// Uses a disposable profile and does not require the private local content pack.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startServer } from '../scripts/serve.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const server = await startServer({port: 0});
let browser;
const passed = [];
const errors = [];
const check = name => { passed.push(name); console.log(`確認済み: ${name}`); };
try {
  browser = await chromium.launch({headless: true, executablePath: process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox']});
  const context = await browser.newContext({viewport: {width: 1365, height: 900}, colorScheme: 'light', timezoneId: 'Asia/Tokyo'});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const base = `http://127.0.0.1:${server.address().port}`;
  const nav = route => page.locator(`.main-nav a[href="#${route}"]`).click();
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('heat-study-ja:v1')));

  await page.goto(base);
  await page.locator('.app-shell').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'ja');
  for (const route of ['home', 'reader', 'quiz', 'review', 'search', 'glossary', 'map', 'simulator', 'plan', 'calendar', 'settings']) {
    await nav(route);
    assert.ok((await page.locator('#main-content').innerText()).trim(), route);
  }
  check('日本語初期表示と全11画面');

  await nav('reader');
  assert.equal(await page.locator('[data-language="ja"]').first().getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.reader-toc .toc-item:not(.not-ready)').count(), 2);
  await page.locator('[data-language="en"]').first().click();
  assert.equal(await page.locator('[data-language="en"]').first().getAttribute('aria-pressed'), 'true');
  await page.locator('[data-language="ja"]').first().click();
  await page.locator('[data-action="toggle-read"]').click();
  assert.equal((await stored()).readSections['1.1'], true);
  await page.reload();
  await page.locator('.reader-title').waitFor();
  assert.equal((await stored()).readSections['1.1'], true);
  check('収録2節、日英切り替え、読了記録の再読込');

  await nav('search');
  await page.locator('#search-query').fill('熱移動');
  await page.locator('#search-form button[type="submit"]').click();
  assert.ok(await page.locator('.result-card').count() > 0);
  assert.ok(await page.locator('.result-card mark').count() > 0);
  await page.locator('.result-link').first().click();
  assert.equal(new URL(page.url()).hash, '#reader');
  check('日本語検索、強調、本文への移動');

  await nav('quiz');
  await page.locator('#quiz-start-form [name="count"]').selectOption('3');
  await page.locator('#quiz-start-form button[type="submit"]').click();
  await page.locator('.answer-choice input').first().focus();
  await page.keyboard.press('2');
  assert.equal(await page.locator('input[name="choice"][value="1"]').isChecked(), true);
  await page.keyboard.press('Enter');
  assert.equal((await stored()).attempts.length, 1);
  assert.equal(typeof (await stored()).attempts[0].correct, 'boolean');
  assert.equal(await page.locator('.distractor-details li').count(), 4);
  await nav('review');
  assert.ok((await page.locator('#main-content').innerText()).includes('復習'));
  check('キーボード回答、正誤保存、全4択理由、復習');

  await nav('settings');
  await page.locator('[data-action="export-preview"]').click();
  const exported = JSON.parse(await page.locator('#export-json').inputValue());
  assert.equal(exported.attempts.length, 1);
  const before = await stored();
  await page.locator('#import-file').setInputFiles({name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({...exported, notes: null}))});
  await page.locator('.import-feedback .inline-error').waitFor();
  assert.deepEqual(await stored(), before);
  await page.locator('#import-file').setInputFiles({name: 'learning.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported))});
  await page.locator('[data-action="import-merge"]').click();
  assert.equal((await stored()).attempts.length, 1);
  check('JSON書き出し、不正復元の拒否、重複しない追加復元');

  await nav('simulator');
  assert.match(await page.locator('.result-number').innerText(), /5,625|5625/);
  await page.locator('[data-sim-mode="radiation"]').click();
  await page.locator('.simulation-steps summary').nth(1).click();
  assert.match(await page.locator('.simulation-steps').innerText(), /K|ケルビン/);
  await page.locator('[data-sim-mode="resistance"]').click();
  assert.match(await page.locator('.result-number').innerText(), /70\.588/);
  check('伝導・放射・直列熱抵抗の表示と単位');

  await page.locator('[data-action="toggle-theme"]').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  for (const width of [320, 390, 760, 1365]) {
    await page.setViewportSize({width, height: 844});
    for (const route of ['home', 'reader', 'quiz', 'search', 'simulator', 'settings']) {
      await nav(route);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(scrollWidth <= width + 2, `${route}@${width}: ${scrollWidth}`);
    }
  }
  check('ライト・ダーク、320〜1365pxの主要画面の横はみ出し');

  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.locator('.app-shell').waitFor();
  await nav('reader');
  await page.locator('.reader-title').waitFor();
  assert.equal((await stored()).attempts.length, 1);
  check('オフライン再読込と学習記録');
  assert.deepEqual(errors, []);
  console.log(`結果: ${passed.length}組成功、ブラウザー実行時エラー0件`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
