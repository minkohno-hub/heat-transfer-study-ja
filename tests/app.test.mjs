import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as core from '../study-core.mjs';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const key='heat-study-ja:v1';
const question={id:'q1',prompt:'テスト用に作成した問題',choices:['答え','誤答1','誤答2','誤答3'],answer:0,field:'伝導',difficulty:'基礎',source:{section:'1.1'},explanation:'説明',distractors:['正解','理由1','理由2','理由3']};
function harness(initial) {
  const store=new Map(initial?[[key,initial]]:[]);let fail=false,rendered=0,submitted=0;
  const root={innerHTML:''},document={querySelector:s=>s==='#app'?root:s==='#quiz-answer-form'?{requestSubmit(){submitted++;}}:null,querySelectorAll:()=>Array.from({length:4},()=>({focus(){}})),documentElement:{dataset:{},style:{setProperty(){}}},body:{append(){}},createElement:()=>({setAttribute(){},remove(){}})};
  const context=vm.createContext({...core,structuredClone,JSON,Date,Math,Intl,Map,Set,Number,String,Array,Boolean,RegExp,Blob,URL,document,window:{matchMedia:()=>({matches:false}),scrollTo(){},confirm:()=>true},location:{hash:''},navigator:{onLine:true},setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>store.get(k)||null,setItem(k,v){if(fail&&k===key)throw Error('quota');store.set(k,v);}},FormData:class{constructor(v){this.values=v;}get(k){return this.values[k]??null;}}});
  vm.runInContext(source.replace(/^import .*?;\s*/,'').replace(/\nstartApp\(\);\s*$/,'')+`
    render=()=>{globalThis.renderCount=(globalThis.renderCount||0)+1;};showStatus=message=>{globalThis.statusMessage=message;};
    globalThis.api={get state(){return state;},set state(v){state=v;},get ui(){return ui;},set ui(v){ui={...ui,...v};},set questions(v){questionBank=v;},set book(v){book=v;},set terms(v){glossary=v;},submitQuizAnswer,reviewCandidates,validateImport,importData,saveState,setReviewDate,buildSearchIndex,onKeyDown,renderBookBlock,blockSourceLabel,figureZoomLink,renderSimulationSteps,get warning(){return storageIssue;}};`,context);
  const api=context.api;api.questions=[question];api.book={chapters:[{id:'ch1',title:'章',sections:[{id:'1.1',title:'本文',bookStart:3,bookEnd:4,pdfStart:17,pdfEnd:18,blocks:[{id:'b1',type:'paragraph',text:'検索する語',bookPage:3,pdfPage:17}]}]}]};api.terms=[{id:'term',ja:'熱',en:'heat',meaning:'温度による移動',source:{section:'1.1'}}];
  return {api,store,context,setFail:v=>fail=v,get submitted(){return submitted;}};
}
test('answer handling stores correctness, chosen text, confidence and next review exactly once',()=>{
  const h=harness();h.api.ui={quiz:{ids:['q1'],index:0,answers:[],selected:0,confidence:'low',mode:'single'}};
  h.api.submitQuizAnswer({});h.api.submitQuizAnswer({});
  assert.equal(h.api.state.attempts.length,1);assert.equal(h.api.state.attempts[0].correct,true);assert.equal(h.api.state.attempts[0].selectedText,'答え');assert.equal(h.api.state.reviews.q1.suggestedDays,1);assert.ok(h.api.reviewCandidates()[0].reasons.includes('正解したが自信が低い'));
});
test('incorrect and invalid selections cannot become correct records',()=>{
  const h=harness();h.api.ui={quiz:{ids:['q1'],index:0,answers:[],selected:7,confidence:'high'}};h.api.submitQuizAnswer({});assert.equal(h.api.state.attempts.length,0);
  h.api.ui.quiz.selected=1;h.api.submitQuizAnswer({});assert.equal(h.api.state.attempts[0].correct,false);assert.ok(h.api.reviewCandidates()[0].reasons.includes('直近の誤答'));
});
test('one successful high-confidence answer is not called a weak area',()=>{
  const h=harness();h.api.state.attempts=[{questionId:'q1',correct:true,confidence:'high',at:new Date().toISOString()}];assert.equal(h.api.reviewCandidates().length,0);
});

test('clearing a review date preserves valid saved data, and valid changes have a merge timestamp',()=>{
  const h=harness();h.api.state.reviews.q1={dueDate:'2026-10-22',suggestedDays:3};h.api.saveState();const before=JSON.stringify(h.api.state);
  h.api.setReviewDate('q1','');assert.equal(JSON.stringify(h.api.state),before);assert.equal(h.store.get(key),before);
  h.api.setReviewDate('q1','2026-10-30');assert.equal(h.api.state.reviews.q1.dueDate,'2026-10-30');assert.ok(h.api.state.reviews.q1.updatedAt);assert.equal(core.validateLearningData({...h.api.state,format:core.DATA_FORMAT}),'');
});
test('restore is atomic when storage fails and malformed nested data are rejected again',()=>{
  const h=harness();h.api.state.mistakeNotes.q1={reason:'keep'};const before=JSON.stringify(h.api.state);h.api.saveState();
  h.api.ui.importDraft={data:{...core.createEmptyState(),format:core.DATA_FORMAT,notes:null}};h.api.importData(false);assert.equal(JSON.stringify(h.api.state),before);
  h.api.ui.importDraft={data:{...core.createEmptyState(),format:core.DATA_FORMAT,mistakeNotes:{q1:{reason:'replace'}}}};h.setFail(true);h.api.importData(true);
  assert.equal(JSON.stringify(h.api.state),before);assert.equal(h.store.get(key),before);assert.ok(h.api.ui.importDraft.error.includes('中止'));
});
test('corrupt persisted data are retained for recovery rather than silently discarded',()=>{
  const h=harness('{bad-json');assert.equal(h.store.get(`${key}:recovery`),'{bad-json');assert.equal(h.store.get(key),'{bad-json');assert.ok(h.api.warning.includes('元データ'));
});
test('search index gives book blocks, terms, questions and notes consistent chapter keys',()=>{
  const h=harness();h.api.state.notes=[{id:'n',sectionId:'1.1',text:'熱のメモ',title:'メモ',createdAt:new Date().toISOString()}];const entries=h.api.buildSearchIndex();
  const found=core.searchEntries(entries,{query:'熱',chapter:'ch1'});assert.ok(found.some(e=>e.kind==='glossary'));assert.ok(found.some(e=>e.kind==='memo'));
  assert.equal(entries.find(e=>e.text==='検索する語').target.blockId,'b1');
});
test('formula meanings and Japanese figure descriptions appear in the reader',()=>{
  const h=harness();assert.match(h.api.renderBookBlock({type:'formula',expression:'Q=kAΔT/L',text:'厚さと熱伝導率の説明'}),/厚さと熱伝導率/);
  assert.match(h.api.renderBookBlock({type:'figure',src:'local.png',caption:'図',text:'日本語の図の説明'}),/日本語の図の説明/);
});
test('source ranges distinguish book and PDF pages, and figure links reject external or unsafe paths',()=>{
  const h=harness();assert.equal(h.api.blockSourceLabel({bookPage:418,endBookPage:419,pdfPage:432,endPdfPage:433}),'書籍 p.418–419 · PDF p.432–433');
  assert.match(h.api.figureZoomLink('data/local/figures/fig8-4-439.png'),/noopener noreferrer/);
  for(const src of ['https://example.com/a.png','javascript:alert(1)','data/local/figures/../../a.png','data/local/figures/a.png" onload="x'])assert.equal(h.api.figureZoomLink(src),'');
});
test('all simulator step displays retain finite values, units and supplemental labels',()=>{
  const h=harness(),inputs={conduction:{k:15,area:.5,thickness:.08,hot:80,cold:20},convection:{h:25,area:1,surface:80,fluid:20},radiation:{emissivity:.85,area:1,surface:150,surrounding:25},resistance:{area:1,hot:80,cold:20,hHot:10,hCold:20,k1:.5,k2:.1,L1:.1,L2:.05}};
  for(const [mode,values] of Object.entries(inputs)){const html=h.api.renderSimulationSteps(mode,core.calculateHeatTransfer(mode,values));assert.match(html,/補足説明/);assert.match(html,/W/);assert.doesNotMatch(html,/NaN|Infinity|undefined/);}
});
test('formula presentation retains source strings while typesetting simple indices, powers and mean bars safely',()=>{
  const h=harness(),block={type:'formula',expression:'N̅u̅_L = 0.678 Ra_L^(1/4) [Pr/(0.952+Pr)]^(−4/9)',alt:'平均ヌセルト数'};
  const original=block.expression,html=h.api.renderBookBlock(block);assert.match(html,/<span class="math-overline">Nu<\/span><sub>L<\/sub>/);assert.match(html,/<sup>1\/4<\/sup>/);assert.match(html,/<sup>−4\/9<\/sup>/);assert.equal(block.expression,original);
  assert.ok(!h.api.renderBookBlock({type:'formula',expression:'<img src=x onerror="x()">'}).includes('<img'));
});
test('quiz number keys work after focusing a choice and do not capture text editing',()=>{
  const h=harness();h.api.ui={route:'quiz',quiz:{ids:['q1'],index:0,answers:[],selected:0}};let prevented=0;
  const event={key:'3',target:{matches:s=>s.includes('choice')||s==='input,textarea,select,[contenteditable="true"]'},preventDefault(){prevented++;}};
  h.api.onKeyDown(event);assert.equal(h.api.ui.quiz.selected,2);assert.equal(prevented,1);
  h.api.onKeyDown({...event,key:'1',target:{matches:s=>s==='input,textarea,select,[contenteditable="true"]'}});assert.equal(h.api.ui.quiz.selected,2);
  h.api.onKeyDown({...event,key:'Enter',target:{matches:()=>false,closest:()=>null}});assert.equal(h.submitted,1);
});
