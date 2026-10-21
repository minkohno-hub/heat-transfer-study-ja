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

  await page.locator('.reader-toc [data-section="1.2"]').click();
  await page.locator('.book-figure img').first().waitFor();
  assert.equal(await page.locator('.book-figure img').count(), 2);
  assert.equal(await page.locator('.book-figure .figure-zoom').count(), 2);
  assert.ok(await page.locator('.book-figure img').first().evaluate(image => image.complete && image.naturalWidth > 0));
  const [figurePage] = await Promise.all([page.waitForEvent('popup'), page.locator('.book-figure .figure-zoom').first().click()]);
  await figurePage.waitForLoadState('load');
  assert.match(figurePage.url(),/fig1-1-021\.png$/);
  await figurePage.close();
  await page.locator('.reader-toc [data-section="1.1"]').click();
  check('書籍図の表示と別タブ拡大');

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
  const secondValue = Number(await page.locator('.answer-choice input').nth(1).getAttribute('value'));
  await page.keyboard.press('2');
  assert.equal(await page.locator('.answer-choice input').nth(1).isChecked(), true);
  await page.reload();
  await page.locator('[data-action="resume-quiz"]').click();
  assert.equal(Number(await page.locator('.answer-choice input').nth(1).getAttribute('value')), secondValue);
  assert.equal(await page.locator('.answer-choice input').nth(1).isChecked(), true);
  await page.keyboard.press('Enter');
  assert.equal((await stored()).attempts.length, 1);
  assert.equal((await stored()).attempts[0].selected, secondValue);
  assert.equal(typeof (await stored()).attempts[0].correct, 'boolean');
  assert.equal(await page.locator('.distractor-details li').count(), 4);
  const attempt = (await stored()).attempts[0];
  const question = await page.evaluate(async id => (await (await fetch('./data/questions.json')).json()).find(item => item.id === id), attempt.questionId);
  for (let position = 0; position < 4; position++) {
    const index = Number(await page.locator('.answer-choice input').nth(position).getAttribute('value'));
    assert.match(await page.locator('.distractor-details li').nth(position).innerText(), new RegExp(question.distractors[index].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
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

  await page.locator('#profile-create-form [name="profileName"]').fill('別の学習者');
  await Promise.all([page.waitForEvent('load'), page.locator('#profile-create-form button[type="submit"]').click()]);
  await page.locator('#profile-switch-form').waitFor();
  const profile = await page.evaluate(() => {
    const id = localStorage.getItem('heat-study-ja:active-profile:v1');
    return {id, data: JSON.parse(localStorage.getItem(`heat-study-ja:profile:${id}:v1`))};
  });
  assert.notEqual(profile.id, 'legacy');
  assert.equal(profile.data.attempts.length, 0);
  assert.deepEqual(profile.data.readSections, {});
  assert.equal((await stored()).attempts.length, 1);
  await nav('reader');
  await page.locator('#bookmark-note').fill('別の利用者のメモ');
  await page.locator('#bookmark-form button[type="submit"]').click();
  assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem(`heat-study-ja:profile:${id}:v1`)).bookmarks.length, profile.id), 1);
  assert.equal((await stored()).bookmarks.length, 0);
  await nav('settings');
  await page.locator('#profile-switch-form select').selectOption('legacy');
  await Promise.all([page.waitForEvent('load'), page.locator('#profile-switch-form button[type="submit"]').click()]);
  await page.locator('#profile-switch-form').waitFor();
  assert.equal((await stored()).attempts.length, 1);
  assert.equal((await stored()).readSections['1.1'], true);
  assert.equal((await stored()).bookmarks.length, 0);
  check('既存記録を保持した利用者追加と記録の分離・切り替え');

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

  const secondPage = await context.newPage();
  secondPage.on('pageerror', error => errors.push(error.message));
  await secondPage.goto(`${base}/#settings`);
  await secondPage.locator('#profile-switch-form').waitFor();
  await nav('reader');
  await page.locator('[data-action="toggle-read"]').click();
  assert.equal((await stored()).readSections['1.1'], false);
  await secondPage.locator('input[name="theme"][value="light"]').check();
  assert.equal((await stored()).readSections['1.1'], false);
  assert.match(await secondPage.locator('.storage-warning').innerText(), /別のタブ/);
  await secondPage.close();
  await page.locator('[data-action="toggle-read"]').click();
  check('複数タブで古い記録からの上書きを拒否');

  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.locator('.app-shell').waitFor();
  await nav('reader');
  await page.locator('.reader-title').waitFor();
  assert.equal((await stored()).attempts.length, 1);
  check('オフライン再読込と学習記録');

  const invalidContext = await browser.newContext({serviceWorkers: 'block'});
  const invalidPage = await invalidContext.newPage();
  invalidPage.on('pageerror', error => errors.push(error.message));
  await invalidPage.route('**/data/local-content-manifest.json', route => route.fulfill({contentType: 'application/json', body: JSON.stringify({files: ['./data/local/sections/invalid.json']})}));
  await invalidPage.route('**/data/local/sections/invalid.json', route => route.fulfill({contentType: 'application/json', body: JSON.stringify({sectionId: '1.1', language: 'ja', sourceReview: 'source_checked', blocks: [{type: 'unknown', text: '検査用の不正なブロック'}]})}));
  await invalidPage.goto(`${base}/#reader`);
  await invalidPage.locator('.reader-title').waitFor();
  assert.match(await invalidPage.locator('.storage-warning, .notice-card').first().innerText(), /追加のローカル教材/);
  assert.match(await invalidPage.locator('.app-footer').innerText(), /2節/);
  assert.ok(await invalidPage.locator('.book-paragraph').count() > 0);
  assert.doesNotMatch(await invalidPage.locator('.reader-status-row').innerText(), /原本照合済み/);
  await invalidContext.close();
  check('不正な追加教材を拒否し、収録済み本文を保持');
  assert.deepEqual(errors, []);
  console.log(`結果: ${passed.length}組成功、ブラウザー実行時エラー0件`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
