// Checks the exact public Pages artifact, where book text and original figures are absent.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {startServer} from '../scripts/serve.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=join(dirname(fileURLToPath(import.meta.url)),'../dist');
const server=await startServer({root,port:0});
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const errors=[],external=[];
  const base=`http://127.0.0.1:${server.address().port}`;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(!request.url().startsWith(base))external.push(request.url());});
  const nav=route=>page.locator(`.main-nav a[href="#${route}"]`).click();
  await page.goto(base);
  await page.locator('.app-shell').waitFor();
  assert.match(await page.locator('.app-footer').innerText(),/0節/);
  await nav('reader');
  assert.equal(await page.locator('.reader-toc .toc-item:not(.not-ready)').count(),0);
  assert.match(await page.locator('.not-translated').innerText(),/公開していません/);
  for(const path of ['data/sections/1-1-en.json','data/sections/1-1-ja.json','data/figures/fig1-1-021.png']){
    const status=await page.evaluate(async path=>(await fetch(path)).status,path);
    assert.equal(status,404,path);
  }
  await nav('guide');
  assert.equal(await page.locator('.guide-section').count(),17);
  await page.locator('#guide-query').fill('放射率');
  await page.locator('#guide-search-form button').click();
  assert.ok(await page.locator('#guide-sim-radiation').count());
  await nav('simulator');
  assert.match(await page.locator('.result-number').innerText(),/5,625/);
  await page.locator('[data-sim-mode="radiation"]').click();
  assert.match(await page.locator('.result-number').innerText(),/W/);
  await nav('quiz');
  await page.locator('#quiz-start-form button[type="submit"]').click();
  await page.locator('.answer-choice input').first().check();
  await page.locator('#quiz-answer-form button[type="submit"]').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('heat-study-ja:v1')).attempts.length),1);
  assert.ok(await page.locator('.solution-steps li').count()>=3);
  assert.match(await page.locator('.answer-source a').getAttribute('href'),/^#guide\//);
  await nav('settings');
  await page.locator('[data-action="export-preview"]').click();
  assert.equal(JSON.parse(await page.locator('#export-json').inputValue()).attempts.length,1);
  for(const width of [320,390,760,1365]){
    await page.setViewportSize({width,height:844});
    for(const route of ['home','reader','guide','quiz','simulator','settings']){
      await nav(route);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth)<=width+2,`${route}@${width}`);
    }
  }
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.locator('.app-shell').waitFor();
  await nav('guide');
  assert.ok(await page.locator('#guide-sim-radiation').count());
  assert.deepEqual(errors,[]);
  assert.deepEqual(external,[]);
  console.log('公開配信物：本文・原図なし、ガイド・演習・計算・保存・画面幅・オフラインを確認。');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
