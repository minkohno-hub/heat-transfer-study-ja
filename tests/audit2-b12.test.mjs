// Regression tests for audit phase B-12 (round-2 findings A2-R2-05..07:
// cross-tab save blockage, map link and short-session buttons dead behind a
// native confirm gate). Behavioural tests run app.js in the same VM harness
// style as tests/app.test.mjs; the real-browser verification (two tabs,
// churn, force-save recovery, dialog flow, full quick session) is recorded
// in audit2-fix-b12-log.md.
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
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const key='heat-study-ja:v1';
const question={id:'q1',prompt:'テスト用に作成した問題',choices:['答え','誤答1','誤答2','誤答3'],answer:0,field:'伝導',difficulty:'基礎',source:{section:'1.1'},explanation:'説明',distractors:['正解','理由1','理由2','理由3']};
function harness(initial) {
  const store=new Map(initial?[[key,initial]]:[]);let fail=false,failKey='';
  const root={innerHTML:''},document={querySelector:s=>s==='#app'?root:null,querySelectorAll:()=>[],documentElement:{dataset:{},style:{setProperty(){}}},body:{append(){}},createElement:()=>({setAttribute(){},remove(){}})};
  const context=vm.createContext({...core,...guide,...curriculum,...originalNotesModule,...deepNotesModule,...termModule,...visualModule,structuredClone,JSON,Date,Math,Intl,Map,Set,Number,String,Array,Boolean,RegExp,Blob,URL,crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},document,window:{matchMedia:()=>({matches:false}),scrollTo(){},confirm:()=>true,location:{reload(){}}},location:{hash:''},navigator:{onLine:true},setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>store.get(k)||null,setItem(k,v){if((fail&&k===key)||k===failKey)throw Error('quota');store.set(k,v);},removeItem(k){store.delete(k);}},FormData:class{constructor(v){this.values=v.values??v;}get(k){return this.values[k]??null;}}});
  vm.runInContext(source.replace(/^import .*?;\s*/gm,'').replace(/\nstartApp\(\);\s*$/,'')+`
    render=()=>{};showStatus=message=>{globalThis.statusMessage=message;};
    globalThis.api={get state(){return state;},set state(v){state=v;},get ui(){return ui;},set ui(v){ui={...ui,...v};},set questions(v){questionBank=v;},set book(v){book=v;},set terms(v){glossary=v;},startQuiz,startQuickSession,confirmQuizStart,cancelQuizStart,persistQuiz,saveState,forceSave,get warning(){return storageIssue;},get conflict(){return storageConflict;},get status(){return globalThis.statusMessage;}};`,context);
  const api=context.api;api.questions=[question];api.book={pdfPageCount:810,chapters:[{id:'ch1',title:'章',sections:[{id:'1.1',title:'本文',bookStart:3,bookEnd:4,pdfStart:17,pdfEnd:18,blocks:[{id:'b1',type:'paragraph',text:'検索する語',bookPage:3,pdfPage:17}]}]}]};api.terms=[];
  return {api,store,setFail:v=>fail=v,setFailKey:v=>failKey=v};
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// ---------- A2-R2-05: idle persist must not rewrite the draft stamp ----------
test('A2-R2-05: persistQuiz keeps the stored draft untouched while the quiz is unchanged',async()=>{
  const h=harness();
  h.api.ui={quiz:{id:'s1',ids:['q1'],index:0,answers:[],selected:null,confidence:'medium',hintCount:0,mode:'all',startedAt:1}};
  h.api.persistQuiz();
  const first=h.api.state.quizDraft;
  assert.ok(first&&first.updatedAt,'first persist stores a stamped draft');
  await sleep(15);
  h.api.persistQuiz();
  assert.equal(h.api.state.quizDraft,first,'unchanged quiz must not replace the draft (no storage churn)');
  assert.equal(h.api.state.quizDraft.updatedAt,first.updatedAt,'stamp must not advance while idle');
  h.api.ui.quiz.selected=2;
  h.api.persistQuiz();
  assert.notEqual(h.api.state.quizDraft,first,'a real change replaces the draft');
  assert.notEqual(h.api.state.quizDraft.updatedAt,first.updatedAt,'a real change advances the stamp');
});

// ---------- A2-R2-05: conflict is recoverable in-app via force save ----------
test('A2-R2-05: a diverged tab is blocked once, then forceSave adopts the stored baseline and saves',()=>{
  const h=harness();
  assert.equal(h.api.saveState(),true,'baseline save succeeds');
  // Another tab writes newer data.
  h.store.set(key,JSON.stringify({...h.api.state,plan:{goal:'別のタブの目標',active:true}}));
  assert.equal(h.api.saveState(),false,'diverged tab must not silently overwrite the other tab');
  assert.match(h.api.warning,/別のタブで学習記録が更新されました/);
  assert.equal(h.api.conflict,true,'conflict flag drives the recovery button in the banner');
  h.api.forceSave();
  assert.equal(h.api.status,'このタブの内容で上書き保存しました。');
  assert.equal(h.api.conflict,false,'successful force save clears the conflict');
  const stored=JSON.parse(h.store.get(key));
  assert.equal(stored.plan.goal,h.api.state.plan.goal,'stored data is now this tab\'s state');
  assert.equal(h.api.saveState(),true,'saves work normally again after recovery');
});

// ---------- A2-R2-06/07: starting over a draft asks in-app, never natively ----------
test('A2-R2-06: startQuiz over a draft defers to the in-app confirmation instead of window.confirm',()=>{
  assert.equal(source.includes("window.confirm('中断している演習を"),false,
    'the native confirm gate must be gone from the quiz-start path');
  assert.ok(source.includes('data-action="confirm-quiz-start"')&&source.includes('data-action="cancel-quiz-start"'),
    'the in-app dialog offers replace and cancel actions');
  const h=harness();
  const draft={id:'old',ids:['q1'],index:0,answers:[],startedAt:1};
  h.api.state.quizDraft=draft;
  h.api.startQuiz({mode:'all',field:'伝導',count:8});
  assert.equal(h.api.ui.quiz,null,'no session starts before the user chooses');
  const pending=h.api.ui.pendingQuizStart;
  assert.ok(pending&&pending.mode==='all'&&pending.field==='伝導'&&pending.count===8,'the requested start is kept for the dialog');
  h.api.cancelQuizStart();
  assert.equal(h.api.ui.pendingQuizStart,null,'cancel clears the pending start');
  assert.equal(h.api.ui.quiz,null,'cancel does not start a session');
  assert.equal(h.api.state.quizDraft,draft,'cancel keeps the interrupted draft untouched');
  h.api.startQuiz({mode:'all',field:'伝導',count:8});
  h.api.confirmQuizStart();
  assert.ok(h.api.ui.quiz,'confirm starts the session');
  assert.equal(JSON.stringify(h.api.ui.quiz.ids),'["q1"]','the field-scoped set is used (map link carries its field)');
  assert.equal(h.api.ui.quiz.field,'伝導');
  assert.equal(h.api.ui.pendingQuizStart,null,'pending start is consumed');
});
test('A2-R2-07: startQuickSession over a draft also defers, then starts a quick session on confirm',()=>{
  const h=harness();
  h.api.state.quizDraft={id:'old',ids:['q1'],index:0,answers:[],startedAt:1};
  h.api.startQuickSession(5);
  assert.equal(h.api.ui.quiz,null,'quick session must not start silently over a draft');
  assert.equal(h.api.ui.pendingQuizStart?.mode,'quick');
  assert.equal(h.api.ui.pendingQuizStart?.quickMinutes,5);
  h.api.confirmQuizStart();
  assert.ok(h.api.ui.quiz,'confirm starts the quick session');
  assert.equal(h.api.ui.quiz.mode,'quick');
  assert.equal(h.api.ui.quiz.quickMinutes,5);
});
test('A2-R2-06/07: with no draft, starts proceed immediately as before',()=>{
  const h=harness();
  h.api.startQuiz({mode:'all',count:1});
  assert.ok(h.api.ui.quiz,'no draft -> direct start');
  assert.equal(h.api.ui.pendingQuizStart,null,'no dialog is queued');
});
