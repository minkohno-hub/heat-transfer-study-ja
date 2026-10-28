import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCacheName,stampServiceWorker} from '../scripts/public-cache-version.mjs';

const pdfHash='d318176a9cac997d415ec5ee95b30979dcdaed0392705185393735c7d59a447a';
const assets=[
  {path:'app.js',content:'let appVersion=1;'},
  {path:'data/questions.json',content:'[{"id":"q1"}]'},
  {path:'data/original-deep-lessons.json',content:'{"lessons":[]}'},
  {path:'sw.js',content:"const CACHE_NAME='heat-study-ja-v12';"}
];
test('public offline cache version is deterministic across asset order and changes for teaching edits',()=>{
 const version=publicCacheName(assets,pdfHash);
 assert.match(version,/^heat-study-ja-app-[0-9a-f]{16}$/);
 assert.equal(publicCacheName([...assets].reverse(),pdfHash),version);
 for(const path of ['app.js','data/questions.json','data/original-deep-lessons.json','sw.js']){
   const changed=assets.map(x=>x.path===path?{...x,content:x.content+' changed'}:x);
   assert.notEqual(publicCacheName(changed,pdfHash),version,'stale cache for '+path);
 }
 const differentPdf='0'.repeat(64);
 assert.notEqual(publicCacheName(assets,differentPdf),version);
});

test('stamping public worker is fail-closed and never mutates the source template',()=>{
 const source="const CACHE_NAME='heat-study-ja-v12';\nconst PDF_CACHE_NAME='heat-study-ja-pdf-v1';";
 const version=publicCacheName(assets,pdfHash);
 const stamped=stampServiceWorker(source,version);
 assert.ok(stamped.startsWith("const CACHE_NAME='"+version+"';"));
 assert.ok(stamped.includes("const PDF_CACHE_NAME='heat-study-ja-pdf-v1';"),
   'updating the app must not delete a PDF the user deliberately saved');
 assert.equal(source.startsWith("const CACHE_NAME='heat-study-ja-v12';"),true);
 assert.equal(stampServiceWorker(stamped,version),stamped);
 assert.throws(()=>stampServiceWorker(source+'\n'+source,version),/一意/);
 assert.throws(()=>stampServiceWorker('const WRONG_NAME=1;',version),/一意/);
 assert.throws(()=>stampServiceWorker(source,'heat-study-ja-v12'),/一意/);
 assert.throws(()=>publicCacheName([...assets,assets[0]],pdfHash),/不正/);
});
