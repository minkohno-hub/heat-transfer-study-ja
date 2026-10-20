// Real-browser regression suite. Uses its own disposable browser profile, never the user's learning storage.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {startServer} from '../scripts/serve.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=resolve('test-results');await mkdir(output,{recursive:true});
await mkdir(resolve(output,'browser-temp'),{recursive:true});process.env.TEMP=resolve(output,'browser-temp');process.env.TMP=process.env.TEMP;
const server=await startServer({port:0}),base=`http://127.0.0.1:${server.address().port}`;
console.log('確認用サーバーを開始しました。');
const browser=await chromium.launch({headless:true,timeout:20000,downloadsPath:resolve(output,'downloads'),...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
console.log('確認専用のブラウザーを開始しました。');
const context=await browser.newContext({viewport:{width:1365,height:900},colorScheme:'light',timezoneId:'Asia/Tokyo',acceptDownloads:true});
const page=await context.newPage(),errors=[],passed=[],limitations=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(15000);
const nav=async route=>{await page.locator(`.main-nav a[href="#${route}"]`).click();};
const store=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('heat-study-ja:v1')||'{}'));
const check=(name)=>{passed.push(name);console.log(`確認済み: ${name}`);};
const shot=async name=>page.screenshot({path:resolve(output,`${name}.png`),fullPage:false});
try {
  await page.goto(base);await page.locator('.app-shell').waitFor();assert.equal((await store()).settings?.contentLanguage||'ja','ja');check('日本語初期表示と教材読み込み');
  await shot('desktop-light-home');
  await nav('reader');await page.locator('.reader-toc details').filter({has:page.locator('[data-section="7.6"]')}).locator('summary').click();
  await page.locator('.reader-toc [data-section="7.6"]').click();await page.locator('#reader-block-7\\.6-b005').waitFor();
  assert.match(await page.locator('.reader-title').innerText(),/7\.6/);assert.equal(await page.locator('[data-block-id="7.6-b005"]').getAttribute('data-book-page'),'387');
  assert.ok((await page.locator('.formula-block').first().innerText()).includes('ストローハル'));
  for(const img of await page.locator('.book-figure img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(img=>img.decode());assert.ok(await img.evaluate(img=>img.naturalWidth>0));}
  assert.equal(await page.locator('.book-figure img').count(),8);check('§7.6の8図、式の説明、原本ページ');
  await page.locator('[data-block-id="7.6-b039"]').scrollIntoViewIfNeeded();await page.waitForTimeout(400);
  await page.locator('[data-action="prepare-bookmark"]').click();await page.locator('#bookmark-note').fill('自動確認用の管群メモ');await page.locator('#bookmark-form button').click();
  let saved=await store();assert.equal(saved.bookmarks.length,1);assert.ok(saved.bookmarks[0].blockId);const bookmark=saved.bookmarks[0];
  await page.locator(`[data-bookmark-note="${bookmark.id}"]`).fill('更新したしおり');await page.locator(`[data-bookmark-note="${bookmark.id}"]`).press('Tab');
  assert.equal((await store()).bookmarks[0].note,'更新したしおり');
  await page.locator(`.bookmark-list [data-bookmark="${bookmark.id}"]`).click();await page.waitForTimeout(400);assert.ok(await page.evaluate(()=>window.scrollY>200));
  await page.reload();await page.locator('.reader-title').waitFor();await page.waitForTimeout(450);assert.match(await page.locator('.reader-title').innerText(),/7\.6/);assert.ok(await page.evaluate(()=>window.scrollY>200));check('本文のしおり、メモ編集、読書位置の再読込');
  await nav('search');await page.locator('#search-query').fill('直径 D=0.20');await page.locator('[name="kind"]').selectOption('question');await page.locator('[name="chapter"]').selectOption('ch7');await page.locator('#search-form button[type="submit"]').click();
  assert.equal(await page.locator('.result-card').count(),1);await page.locator('.result-link').click();
  assert.match(await page.locator('.question-card h2').innerText(),/0\.20/);check('章を指定した問題検索と該当問題への移動');
  const questions=JSON.parse(await readFile(resolve('data/local/questions/7.6-ja.json'),'utf8')),q=questions.find(q=>q.id==='ch7-6-strouhal'),wrong=(q.answer+1)%4;
  await page.locator('.answer-options input').first().focus();await page.keyboard.press(String(wrong+1));await page.locator('input[name="confidence"][value="low"]').check();await page.locator('#quiz-answer-form button[type="submit"]').click();
  assert.match(await page.locator('.feedback-title').innerText(),/不正解/);assert.equal((await store()).attempts.at(-1).correct,false);
  assert.equal(await page.locator('.distractor-details li').count(),4);
  await page.locator('[data-question-bookmark]').click();await page.locator('#mistake-note-form [name="reason"]').fill('直径を取り違えた');await page.locator('#mistake-note-form [name="memory"]').fill('fD/u を先に書く');await page.locator('#mistake-note-form button[type="submit"]').click();
  await page.locator('[data-action="open-report"]').click();assert.equal(await page.locator('.modal-close').evaluate(el=>document.activeElement===el),true);await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#report-form button').evaluate(el=>document.activeElement===el),true);await page.keyboard.press('Escape');assert.equal(await page.locator('.report-modal').count(),0);
  await page.locator('[data-action="open-report"]').click();await page.locator('#report-form [name="message"]').fill('自動確認用の報告');await page.locator('#report-form button[type="submit"]').click();
  saved=await store();assert.equal(saved.questionBookmarks.length,1);assert.equal(saved.mistakeNotes[q.id].reason,'直径を取り違えた');assert.equal(saved.questionReports[q.id].length,1);
  await page.locator('[data-action="next-question"]').click();assert.equal((await store()).sessions.length,1);assert.match(await page.locator('.main-content').innerText(),/ふり返|振り返/);
  await nav('review');assert.match(await page.locator('.review-list').innerText(),/直近の誤答/);check('回答・4択理由・自信度・ブックマーク・間違いノート・報告・振り返り・復習');
  await nav('settings');const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="export-data"]').click();const download=await downloadPromise;
  let exported;const failure=await download.failure();
  if(failure){limitations.push(`この実行環境でファイルダウンロードが中止された：${failure}。最小の独立したBlobダウンロードも同様。JSON表示経由で内容と復元を確認。`);await page.locator('[data-action="export-preview"]').click();exported=JSON.parse(await page.locator('#export-json').inputValue());}
  else exported=JSON.parse(await readFile(await download.path(),'utf8'));
  await page.locator('[data-action="export-preview"]').click();assert.equal(JSON.parse(await page.locator('#export-json').inputValue()).attempts.length,1);
  assert.equal(exported.attempts.length,1);const before=await store();await page.locator('#import-file').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...exported,notes:null}))});await page.locator('.import-feedback').getByText(/形式/).waitFor();assert.deepEqual(await store(),before);
  await page.locator('#import-file').setInputFiles({name:'learning.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.locator('[data-action="import-merge"]').click();assert.equal((await store()).attempts.length,1);check('JSON書き出し、不正な復元の拒否、重複しない追加復元');
  await nav('plan');await page.locator('#plan-form [name="goal"]').fill('熱の移動を説明する');await page.locator('#plan-form [name="minutesPerDay"]').selectOption('5');await page.locator('#plan-form button[type="submit"]').click();assert.equal((await store()).plan.active,true);assert.match(await page.locator('.suggested-steps').innerText(),/目安 2 分/);await page.locator('[data-action="stop-plan"]').click();assert.equal((await store()).plan.active,false);
  await nav('calendar');assert.match(await page.locator('.day-detail').innerText(),/円柱横流れ/);assert.equal(await page.locator('.calendar-day').count(),42);
  await nav('map');assert.match(await page.locator('.map-grid').innerText(),/記録不足/);
  await nav('glossary');await page.locator('#glossary-query').fill('ストローハル');assert.match(await page.locator('.glossary-grid').innerText(),/ストローハル/);check('学習計画の保存・停止、カレンダー、記録不足の分野表示、用語検索');
  await nav('simulator');assert.match(await page.locator('.sim-output-card').innerText(),/5,625|5625|5\.625/);
  await page.locator('#sim-form [name="thickness"]').fill('');assert.match(await page.locator('.sim-output-card').innerText(),/空欄/);await page.locator('#sim-form [name="thickness"]').fill('0.08');
  await page.locator('[data-sim-mode="radiation"]').click();await page.locator('[data-action="save-comparison"]').click();await page.locator('#sim-form [name="surface"]').fill('10');
  assert.match(await page.locator('.sim-chart').getAttribute('aria-label'),/負の値/);assert.ok(!(await page.locator('.sim-chart').innerHTML()).match(/NaN|Infinity/));check('伝導・放射計算、空欄拒否、負方向と保存条件のグラフ');
  await page.locator('[data-action="toggle-theme"]').click();await shot('desktop-dark-simulator');
  for(const width of [320,390,760,1365]) {
    await page.setViewportSize({width,height:844});
    for(const route of ['home','reader','search','quiz','review','simulator','glossary','map','plan','calendar','settings']) {
      await nav(route);const overflow=await page.evaluate(()=>({body:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(overflow.body<=overflow.width+2,`${route}@${width}: ${JSON.stringify(overflow)}`);
      if(width===390&&['reader','quiz','simulator'].includes(route))await shot(`mobile-dark-${route}`);
    }
  }
  check('320・390・760・1365pxで全11画面の横はみ出し');
  await nav('quiz');await page.locator('.wrong-retry-list [data-start-question]').first().click();assert.match(await page.locator('.question-card h2').innerText(),/0\.20/);await page.setViewportSize({width:390,height:844});await shot('mobile-dark-active-question');
  await page.setViewportSize({width:390,height:844});await page.locator('[data-action="toggle-theme"]').click();await nav('reader');await shot('mobile-light-reader');
  await page.locator('[data-language="en"]').click();assert.match(await page.locator('.reader-title').innerText(),/Crossflow|cylinders/i);await page.locator('[data-language="ja"]').click();assert.equal((await store()).settings.contentLanguage,'ja');await page.locator('[data-block-id="7.6-b005"]').scrollIntoViewIfNeeded();await page.waitForTimeout(350);await shot('mobile-light-reader-formula');check('日英切り替えと日本語への保存、本文中の式表示');
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(async()=>Boolean(await caches.match('./data/local/sections/7.6-ja.json')));
  await context.setOffline(true);await page.reload();await page.locator('.reader-title').waitFor();assert.match(await page.locator('.reader-title').innerText(),/7\.6/);assert.equal((await store()).attempts.length,1);await nav('quiz');check('オフラインでの教材・演習再読込と履歴保持');await context.setOffline(false);
  assert.deepEqual(errors,[]);check('ブラウザー実行時エラーなし');
  const publicContext=await browser.newContext({serviceWorkers:'block'}),publicPage=await publicContext.newPage();await publicPage.route('**/data/local-content-manifest.json',route=>route.fulfill({status:404,body:''}));await publicPage.goto(base);await publicPage.locator('.app-shell').waitFor();assert.match(await publicPage.locator('.app-footer').innerText(),/2節/);await publicContext.close();check('ローカル教材がない公開版の起動');
  const report={date:'2026-10-20',browser:await browser.version(),passed,limitations,screenshots:['desktop-light-home','desktop-dark-simulator','mobile-dark-reader','mobile-dark-quiz','mobile-dark-active-question','mobile-dark-simulator','mobile-light-reader','mobile-light-reader-formula'],externalExpertReview:false};
  await writeFile(resolve(output,'browser-report.json'),JSON.stringify(report,null,2));
}catch(error){await shot('failure').catch(()=>{});await writeFile(resolve(output,'browser-failure.txt'),`${error.stack}\n\n${await page.locator('body').innerText().catch(()=> '')}`);console.error(error);process.exitCode=1;}
finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
