// Regression tests for audit phase D finding D-01.
// The settings screen recommends saving the stored pre-import copy
// ("必要なら先に書き出してください"), but exportBackup wrote the internal
// stored state verbatim — no `format` envelope — so the app's own file
// importer rejected the file as "対応する学習データ形式ではありません".
// The fix wraps the before-import copy in the same envelope as a normal
// export. The recovery copy is a different case: it preserves data the
// app could not read, so it must stay byte-for-byte verbatim (an
// inspection copy for manual repair, not a restorable backup).
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
function harness() {
  const store=new Map();
  const root={innerHTML:''},document={querySelector:s=>s==='#app'?root:null,querySelectorAll:()=>[],documentElement:{dataset:{},style:{setProperty(){}}},body:{append(){}},createElement:()=>({setAttribute(){},remove(){}})};
  const context=vm.createContext({...core,...guide,...curriculum,...originalNotesModule,...deepNotesModule,...termModule,...visualModule,structuredClone,JSON,Date,Math,Intl,Map,Set,Number,String,Array,Boolean,RegExp,Blob,URL,crypto:{randomUUID:()=>'11111111-1111-4111-8111-111111111111'},document,window:{matchMedia:()=>({matches:false}),scrollTo(){},confirm:()=>true,location:{reload(){}}},location:{hash:''},navigator:{onLine:true},setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>store.get(k)||null,setItem(k,v){store.set(k,v);},removeItem(k){store.delete(k);}},FormData:class{constructor(v){this.values=v.values??v;}get(k){return this.values[k]??null;}}});
  vm.runInContext(source.replace(/^import .*?;\s*/gm,'').replace(/\nstartApp\(\);\s*$/,'')+`
    render=()=>{};showStatus=message=>{globalThis.statusMessage=message;};
    globalThis.api={get state(){return state;},set state(v){state=v;},get ui(){return ui;},set ui(v){ui={...ui,...v};},set questions(v){questionBank=v;},set book(v){book=v;},set terms(v){glossary=v;},validateImport,exportData,exportPayload,exportBackup,get status(){return globalThis.statusMessage;}};`,context);
  const api=context.api;
  api.questions=[{id:'q1',prompt:'テスト問題',choices:['答え','誤答1','誤答2','誤答3'],answer:0,field:'伝導',difficulty:'基礎',source:{section:'1.1'},explanation:'説明',distractors:['正解','理由1','理由2','理由3']}];
  api.book={pdfPageCount:810,chapters:[{id:'ch1',title:'章',sections:[{id:'1.1',title:'本文',bookStart:3,bookEnd:4,pdfStart:17,pdfEnd:18,blocks:[{id:'b1',type:'paragraph',text:'検索する語',bookPage:3,pdfPage:17}]}]}]};
  api.terms=[{id:'term',ja:'熱',en:'heat',meaning:'温度による移動',source:{section:'1.1'}}];
  return {api,store};
}
// A stored state exactly as the app keeps it internally (and as importData
// snapshots into the before-import copy): schemaVersion but no envelope.
function storedState() {
  const s=core.createEmptyState();
  s.attempts=[{id:'a1',questionId:'q1',correct:true,selected:0,selectedText:'答え',correctText:'答え',confidence:'high',at:'2026-10-30T00:00:00.000Z',mode:'all'}];
  s.bookmarks=[{id:'b1',sectionId:'1.1',note:'控えのしおり',createdAt:'2026-10-30T00:00:00.000Z'}];
  s.mistakeNotes={q1:{reason:'理由',memory:'覚え方',nextTime:'次',updatedAt:'2026-10-30T00:00:00.000Z'}};
  return s;
}
test('D-01: exported pre-import copy carries the learning-data envelope and passes file-import validation',()=>{
  const h=harness();
  const seeded=storedState();
  h.store.set(`${key}:before-import`,JSON.stringify(seeded));
  h.api.exportBackup('before-import');
  // In this harness downloads fall back to the manual export area.
  const text=h.api.ui.exportJSON;
  assert.equal(typeof text,'string','export must produce file text');
  const parsed=JSON.parse(text);
  assert.equal(parsed.format,'heat-study-ja-learning-data');
  assert.equal(parsed.schemaVersion,1);
  assert.equal(typeof parsed.exportedAt,'string');
  assert.equal(h.api.validateImport(parsed),'','the exported copy must be importable through the file importer');
  assert.deepEqual(parsed.attempts,seeded.attempts);
  assert.deepEqual(parsed.bookmarks,seeded.bookmarks);
  assert.deepEqual(parsed.mistakeNotes,seeded.mistakeNotes);
});
test('D-01: recovery copy stays byte-for-byte verbatim (preservation of unreadable data, not a restorable backup)',()=>{
  const h=harness();
  const raw='{"schemaVersion":1,"attempts":[{"questionId":'; // truncated, unreadable
  h.store.set(`${key}:recovery`,raw);
  h.api.exportBackup('recovery');
  assert.equal(h.api.ui.exportJSON,raw);
});
test('D-01: with no stored copy, export reports so and produces no file',()=>{
  const h=harness();
  h.api.exportBackup('before-import');
  assert.equal(h.api.status,'書き出せる控えがありません。');
  assert.equal(h.api.ui.exportJSON,undefined);
});
