// Regression tests for audit phase B-1 (register batches 1 and 2):
// A2-FUN-01/02/03/04/05/06, A2-UXS-01/02/03/04/05/06/07/08/15.
// Each test names the finding it pins. App-level tests reuse the vm harness
// pattern from tests/app.test.mjs with a slightly wider exposed api.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as core from '../study-core.mjs';
import * as guide from '../guide.mjs';
import * as curriculum from '../chapter-curriculum.mjs';
import * as originalNotesModule from '../original-notes.mjs';
import * as deepNotesModule from '../original-deep-lessons.mjs';
import * as termModule from '../term-links.mjs';
import * as visualModule from '../sim-diagrams.mjs';
import {pdfCacheName, stampServiceWorker} from '../scripts/public-cache-version.mjs';

const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const key='heat-study-ja:v1';
const question={id:'q1',prompt:'テスト用に作成した問題',choices:['答え','誤答1','誤答2','誤答3'],answer:0,field:'伝導',difficulty:'基礎',source:{section:'1.1'},explanation:'説明',distractors:['正解','理由1','理由2','理由3']};
function harness(initial) {
  const store=new Map(initial?[[key,initial]]:[]);
  const root={innerHTML:''},document={querySelector:s=>s==='#app'?root:null,querySelectorAll:()=>[],documentElement:{dataset:{},style:{setProperty(){}}},body:{append(){}},createElement:()=>({setAttribute(){},remove(){}})};
  const context=vm.createContext({...core,...guide,...curriculum,...originalNotesModule,...deepNotesModule,...termModule,...visualModule,structuredClone,JSON,Date,Math,Intl,Map,Set,Number,String,Array,Boolean,RegExp,Blob,URL,crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},document,window:{matchMedia:()=>({matches:false}),scrollTo(){},confirm:()=>true,location:{reload(){}}},location:{hash:''},navigator:{onLine:true},setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>store.get(k)||null,setItem(k,v){store.set(k,v);},removeItem(k){store.delete(k);}},FormData:class{constructor(v){this.values=v.values??v;}get(k){return this.values[k]??null;}}});
  vm.runInContext(source.replace(/^import .*?;\s*/gm,'').replace(/\nstartApp\(\);\s*$/,'')+`
    render=()=>{};showStatus=message=>{globalThis.statusMessage=message;};
    globalThis.api={get state(){return state;},set state(v){state=v;},get ui(){return ui;},set ui(v){ui={...ui,...v};},set questions(v){questionBank=v;},set book(v){book=v;},set terms(v){glossary=v;},set deepLessons(v){deepLessons=v;},set originalNotes(v){originalNotes=v;},submitQuizAnswer,reviewCandidates,buildSearchIndex,renderGlossary,renderHome,renderSearch,searchNow};`,context);
  const api=context.api;api.questions=[question];api.book={pdfPageCount:810,chapters:[{id:'ch1',title:'章',sections:[{id:'1.1',title:'本文',bookStart:3,bookEnd:4,pdfStart:17,pdfEnd:18,blocks:[{id:'b1',type:'paragraph',text:'検索する語',bookPage:3,pdfPage:17}]}]}]};api.terms=[{id:'term',ja:'熱',en:'heat',meaning:'温度による移動',source:{section:'1.1'}}];
  return {api,store,context};
}
const T=day=>`2026-10-${day}T00:00:00Z`;
const attempt=(over={})=>({questionId:'q1',correct:true,confidence:'high',at:T('20'),...over});

// ---- A2-FUN-03: nextReviewDays must order the streak by answer time ----
test('A2-FUN-03: review streak follows answer time, not array order',()=>{
  const shuffled=[attempt({correct:false,at:T('23')}),attempt({at:T('22')}),attempt({at:T('21')})];
  assert.equal(core.nextReviewDays(shuffled,attempt({at:T('24')})),7,
    'the newest prior answer is wrong, so the streak is zero even if older correct answers sit later in the array');
  const ordered=[attempt({at:T('21')}),attempt({at:T('22')}),attempt({at:T('23')})];
  assert.equal(core.nextReviewDays(ordered,attempt({at:T('24')})),60);
  assert.equal(core.nextReviewDays([...ordered].reverse(),attempt({at:T('24')})),60,
    'the same history in reverse array order must give the same interval');
});

// ---- A2-FUN-02: duplicate attempts must not survive restore/merge ----
const withId={id:'a1',questionId:'q1',correct:true,selected:0,confidence:'high',at:T('20'),selectedText:'答え',correctText:'答え'};
const idLessCopy={...withId}; delete idLessCopy.id;
test('A2-FUN-02: normalize drops duplicate attempts and duplicate question bookmarks',()=>{
  const base=core.createEmptyState();
  const one=core.normalizeLearningData({...base,attempts:[withId,idLessCopy]});
  assert.equal(one.attempts.length,1); assert.equal(one.attempts[0].id,'a1');
  const two=core.normalizeLearningData({...base,attempts:[idLessCopy,withId]});
  assert.equal(two.attempts.length,1); assert.equal(two.attempts[0].id,'a1','the copy carrying an id wins');
  const distinct=core.normalizeLearningData({...base,attempts:[withId,{...withId,id:'a2',selected:1,correct:false}]});
  assert.equal(distinct.attempts.length,2,'genuinely different answers are kept');
  assert.deepEqual(core.normalizeLearningData({...base,questionBookmarks:['q1','q1','q2']}).questionBookmarks,['q1','q2']);
});
test('A2-FUN-02: merge collapses an id-less copy of an existing attempt instead of double counting',()=>{
  const base=core.createEmptyState();
  const current={...base,attempts:[withId]};
  const incoming={...base,format:core.DATA_FORMAT,attempts:[idLessCopy,{...withId,id:'a2',at:T('21')}]};
  const merged=core.mergeLearningData(current,incoming);
  assert.equal(merged.attempts.length,2);
  assert.equal(core.mergeLearningData(merged,incoming).attempts.length,2,'merging the same backup twice stays idempotent');
});
test('A2-FUN-02: import validation rejects duplicate attempts; stored data is healed, never locked out',()=>{
  const base=core.createEmptyState();
  const dup={...base,format:core.DATA_FORMAT,attempts:[withId,idLessCopy]};
  assert.match(core.validateLearningData(dup),/重複/);
  assert.equal(core.validateLearningData(dup,{stored:true}),'','already-saved data must remain loadable');
  assert.equal(core.validateLearningData({...base,format:core.DATA_FORMAT,attempts:[withId,{...withId,id:'a2',selected:1,correct:false}]}),'');
});

// ---- A2-FUN-06 / A2-UXS-15: import validation needs size and count caps ----
test('A2-FUN-06/A2-UXS-15: oversized strings and entry counts are rejected on import only',()=>{
  const base=core.createEmptyState(),at=T('20');
  const longNote={...base,format:core.DATA_FORMAT,notes:[{id:'n1',sectionId:'1.1',text:'あ'.repeat(10001),createdAt:at}]};
  assert.match(core.validateLearningData(longNote),/長すぎ/);
  assert.equal(core.validateLearningData(longNote,{stored:true}),'');
  const manyNotes={...base,format:core.DATA_FORMAT,notes:Array.from({length:20001},(_,i)=>({id:'n'+i,sectionId:'1.1',text:'x',createdAt:at}))};
  assert.match(core.validateLearningData(manyNotes),/上限/);
  const longMistake={...base,format:core.DATA_FORMAT,mistakeNotes:{q1:{reason:'x'.repeat(10001)}}};
  assert.match(core.validateLearningData(longMistake),/長すぎ/);
  const manyReports={...base,format:core.DATA_FORMAT,questionReports:{q1:Array.from({length:1001},()=>({category:'c',message:'m',at}))}};
  assert.match(core.validateLearningData(manyReports),/上限/);
  const ok={...base,format:core.DATA_FORMAT,notes:[{id:'n1',sectionId:'1.1',text:'通常のメモ',createdAt:at}]};
  assert.equal(core.validateLearningData(ok),'');
});

// ---- A2-UXS-01: multi-keyword AND search (entries and guide) ----
test('A2-UXS-01: cross search combines space-separated keywords with AND',()=>{
  const entries=[
    {kind:'book',chapter:'ch1',field:'伝導',title:'熱伝達の基礎',text:'対流と放射を扱う'},
    {kind:'book',chapter:'ch1',field:'伝導',title:'熱伝導',text:'フーリエの法則'}];
  assert.equal(core.searchEntries(entries,{query:'熱伝達 放射'}).length,1);
  assert.equal(core.searchEntries(entries,{query:'熱伝達　放射'}).length,1,'a full-width space also separates keywords');
  assert.equal(core.searchEntries(entries,{query:'熱伝達 沸騰'}).length,0);
  assert.equal(core.searchEntries(entries,{query:'熱伝導'}).length,1,'single-keyword behaviour is unchanged');
});
test('A2-UXS-01: guide search combines keywords with AND as well',()=>{
  assert.ok(guide.searchGuide('レイノルズ数 ヌセルト数').some(s=>s.id==='learn-convection-dimensionless'));
  assert.equal(guide.searchGuide('レイノルズ数 そんざいしない').length,0);
  assert.ok(guide.searchGuide('放射率').length>0,'single-keyword behaviour is unchanged');
});

// ---- A2-FUN-01: stale wrong-answer reasons must clear after recovery ----
test('A2-FUN-01: wrong-answer reasons clear once the learner recovers',()=>{
  const h=harness();
  h.api.state.attempts=[
    attempt({correct:false,at:T('20')}),attempt({correct:false,at:T('21')}),
    attempt({at:T('22')}),attempt({at:T('23')}),attempt({at:T('24')})];
  assert.equal(h.api.reviewCandidates().filter(c=>c.question.id==='q1').length,0,
    'two or more solid correct answers after the mistakes clear the stale reasons');
});
test('A2-FUN-01: reasons still fire before recovery, and a review completion resets the window',()=>{
  const h=harness();
  h.api.state.attempts=[attempt({correct:false,at:T('20')}),attempt({correct:false,at:T('21')})];
  assert.ok(h.api.reviewCandidates()[0].reasons.includes('誤答2回'));
  h.api.state.attempts.push(attempt({at:T('22')}));
  assert.ok(h.api.reviewCandidates()[0].reasons.includes('誤答2回'),'a single correct answer does not clear the reason yet');
  const h2=harness();
  h2.api.state.attempts=[attempt({correct:false,at:T('20')}),attempt({correct:false,at:T('21')}),attempt({at:T('23')})];
  h2.api.state.reviews.q1={dueDate:'2099-01-01',lastReviewedAt:T('22')};
  assert.equal(h2.api.reviewCandidates().filter(c=>c.question.id==='q1').length,0,
    'after a completed review, one more answer must not revive the pre-review mistakes');
});

// ---- A2-FUN-04: fallback due date must follow the nextReviewDays table ----
test('A2-FUN-04: fallback review due date uses the shared interval table',()=>{
  const h=harness();
  h.api.state.attempts=[attempt({correct:true,confidence:'low',at:T('20')})];
  const candidate=h.api.reviewCandidates()[0];
  assert.ok(candidate.reasons.includes('正解したが自信が低い'));
  assert.equal(candidate.due,core.localDay(new Date(T('21'))),'a low-confidence correct answer is due the next day, not after a fixed 3 days');
});

// ---- A2-FUN-05: home "today" count is distinct questions ----
test('A2-FUN-05: home today count counts distinct questions, not raw answers',()=>{
  const h=harness(),now=new Date().toISOString();
  h.api.state.attempts=[attempt({at:now}),attempt({correct:false,at:now})];
  const home=h.api.renderHome();
  assert.match(home,/1問回答/);
  assert.doesNotMatch(home,/2問回答/);
});

// ---- A2-UXS-02: search results are staged instead of rendered all at once ----
test('A2-UXS-02: search renders at most 100 cards with a way to show more',()=>{
  const h=harness();
  const results=Array.from({length:250},(_,i)=>({kind:'book',kindLabel:'本文',chapter:'ch1',chapterTitle:'第1章',title:'結果'+i,text:'熱の説明'+i,source:'出典',target:{route:'reader',section:'1.1'}}));
  h.api.ui={search:{query:'熱',kind:'all',chapter:'all',field:'all'},searchResults:results};
  const html=h.api.renderSearch();
  assert.equal((html.match(/result-card/g)||[]).length,100);
  assert.match(html,/全250件中 100件を表示/);
  assert.match(html,/data-action="search-more"/);
  h.api.ui={searchLimit:200};
  assert.equal((h.api.renderSearch().match(/result-card/g)||[]).length,200,'raising the limit reveals the next batch');
  h.api.searchNow({values:{query:'熱',kind:'all',chapter:'all',field:'all'}});
  assert.equal(h.api.ui.searchLimit,100,'a new search resets the staged limit');
});

// ---- A2-UXS-06: glossary search shares the NFKC normalization ----
test('A2-UXS-06: glossary search hits English names typed in full-width Latin',()=>{
  const h=harness();
  h.api.terms=[{id:'nusselt-number',ja:'ヌセルト数',en:'Nusselt number',meaning:'対流の無次元数',source:{section:'1.1'}}];
  h.api.ui={glossaryQuery:'Ｎｕｓｓｅｌｔ'};
  const html=h.api.renderGlossary();
  assert.match(html,/ヌセルト数/);
  assert.doesNotMatch(html,/一致する用語がありません/);
});

// ---- A2-UXS-07/08: search index guards and note targets ----
test('A2-UXS-08: memos for sections that no longer exist stay out of the search index',()=>{
  const h=harness(),at=new Date().toISOString();
  h.api.state.notes=[
    {id:'n1',sectionId:'99.9',text:'存在しない節へのメモ',title:'メモ',createdAt:at},
    {id:'n2',sectionId:'1.1',text:'実在する節へのメモ',title:'メモ',createdAt:at}];
  h.api.state.bookmarks=[{id:'b1',sectionId:'98.7',note:'しおりメモ',createdAt:at}];
  const entries=h.api.buildSearchIndex();
  assert.ok(!entries.some(e=>String(e.text).includes('存在しない節へのメモ')));
  assert.ok(entries.some(e=>String(e.text).includes('実在する節へのメモ')));
  assert.ok(!entries.some(e=>e.kindLabel==='本文のしおり'));
});
test('A2-UXS-07: original-note search targets carry the note anchor flag',()=>{
  const h=harness();
  h.api.originalNotes={notes:[{sectionId:'1.1',chapterId:'ch1',title:'ノート',objective:'目標',explanation:'説明',relation:'関係',example:'例',limits:'注意',selfCheck:'確認',answer:'答え',pdfStart:17}]};
  const entry=h.api.buildSearchIndex().find(e=>e.kind==='original-note');
  assert.ok(entry);
  assert.equal(entry.target.section,'1.1');
  assert.equal(entry.target.note,true,'the reader must scroll to #reader-original-note for note hits');
});

// ---- A2-UXS-03: dimensionless symbols become term links ----
test('A2-UXS-03: Nu/Re/Pr/Bi/Fo are registered aliases and link with word boundaries',async()=>{
  const glossary=JSON.parse(await readFile(new URL('../data/glossary.json',import.meta.url),'utf8'));
  const byId=new Map(glossary.map(t=>[t.id,t]));
  for(const [id,symbol] of [['nusselt-number','Nu'],['reynolds-number','Re'],['prandtl-number','Pr'],['biot-number','Bi'],['fourier-number','Fo']])
    assert.ok((byId.get(id).aliases||[]).includes(symbol),`${id} must list ${symbol}`);
  const hits=termModule.matchTerms('Nu = 100 のとき',glossary);
  assert.ok(hits.some(m=>m.id==='nusselt-number'));
  assert.ok(!termModule.matchTerms('Result and Practice',glossary).some(m=>['reynolds-number','prandtl-number'].includes(m.id)),
    'symbols inside English words must not become links');
});

// ---- A2-UXS-04: the offline shell covers every direct import of app.js ----
test('A2-UXS-04: APP_SHELL lists the modules app.js imports directly',async()=>{
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  for(const file of ['./term-links.mjs','./transient-ui.mjs','./sim-diagrams.mjs'])
    assert.ok(sw.includes(`'${file}'`),`${file} must be precached for the offline-start guarantee`);
});

// ---- A2-UXS-05: the PDF cache name follows the shipped PDF ----
test('A2-UXS-05: PDF cache name derives from the PDF hash and stamps fail-closed',()=>{
  const hash='d318176a9cac997d415ec5ee95b30979dcdaed0392705185393735c7d59a447a';
  assert.equal(pdfCacheName(hash),'heat-study-ja-pdf-d318176a9cac997d');
  assert.throws(()=>pdfCacheName('not-a-hash'));
  const src="const CACHE_NAME='heat-study-ja-v12';\nconst PDF_CACHE_NAME='heat-study-ja-pdf-v1';";
  const stamped=stampServiceWorker(src,'heat-study-ja-app-0123456789abcdef',pdfCacheName(hash));
  assert.ok(stamped.includes("const CACHE_NAME='heat-study-ja-app-0123456789abcdef';"));
  assert.ok(stamped.includes("const PDF_CACHE_NAME='heat-study-ja-pdf-d318176a9cac997d';"));
  assert.ok(stampServiceWorker(src,'heat-study-ja-app-0123456789abcdef').includes("const PDF_CACHE_NAME='heat-study-ja-pdf-v1';"),
    'without a PDF change the two-argument stamp leaves the PDF cache alone');
  assert.throws(()=>stampServiceWorker("const CACHE_NAME='heat-study-ja-v12';",'heat-study-ja-app-0123456789abcdef','heat-study-ja-pdf-d318176a9cac997d'),
    'a missing PDF cache marker must fail the build, not silently ship');
});
