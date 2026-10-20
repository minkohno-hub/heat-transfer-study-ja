import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {validateQuestion,searchRanges} from '../study-core.mjs';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
let hasLocal=true;try{await access(new URL('data/local-content-manifest.json',root));}catch{hasLocal=false;}
test('core question records have four distinct choices and reasons, and point to available images',async()=>{
  const qs=await read('data/questions.json');assert.equal(new Set(qs.map(q=>q.id)).size,qs.length);
  for(const q of qs){assert.equal(validateQuestion(q),'',q.id);if(q.figure?.src)await access(new URL(q.figure.src,root));}
});
test('normalized highlighting retains Unicode text and literal punctuation',()=>{
  assert.deepEqual(searchRanges('😀カ\u3099ラス１０[','ガラス10['),[[2,9]]);
});
test('reviewed local sections retain original page locations, both languages, and figure descriptions',{skip:!hasLocal},async()=>{
  const expected={'7.64':387,'7.65':390,'7.66':391,'7.67':391,'7.68':391,'7.69':393,'7.70':393,'7.71':393,'7.72':393,'7.73a':395,'7.73h':395,'7.74':396};
  for(const sid of ['7.6','7.7']) {
    const ja=await read(`data/local/sections/${sid}-ja.json`),en=await read(`data/local/sections/${sid}-en.json`);
    assert.deepEqual(ja.blocks.map(b=>b.id),en.blocks.map(b=>b.id));assert.equal(ja.expertReviewed,false);
    for(const b of ja.blocks){assert.equal(b.pdfPage,b.bookPage+14,b.id);if(b.type==='figure'){assert.equal(typeof b.alt,'string');assert.ok(b.description);await access(new URL(b.src,root));}if(expected[b.number])assert.equal(b.bookPage,expected[b.number],b.number);}
    for(const b of en.blocks)if(b.alt)assert.equal(typeof b.alt,'string',b.id);
    if(sid==='7.6'){assert.equal(ja.blocks.filter(b=>b.type==='figure').length,8);assert.ok(ja.blocks.find(b=>b.number==='7.74').expression.includes('C(P−D)/P'));}
    else {const lists=ja.blocks.filter(b=>b.type==='list');assert.equal(lists.flatMap(b=>b.items).length,11);assert.equal(lists.at(-1).bookPage,399);}
  }
});
test('18 reviewed Japanese questions have complete rationale and valid source pages',{skip:!hasLocal},async()=>{
  const qs=[...await read('data/local/questions/7.6-ja.json'),...await read('data/local/questions/7.7-ja.json')];assert.equal(qs.length,18);
  for(const q of qs){assert.equal(validateQuestion(q),'',q.id);assert.equal(q.reviewStatus,'source_checked');assert.equal(q.expertReviewed,false);assert.ok(q.solutionSteps.length>=3);assert.equal(q.distractors.length,4);}
  const get=id=>qs.find(q=>q.id===id);
  assert.equal(get('ch7-6-strouhal').source.bookPages,'387');assert.equal(get('ch7-6-tube-max-speed').source.bookPages,'393');assert.equal(get('ch7-6-peclet-velocity').source.bookPages,'396');assert.equal(get('ch7-7-primary-source').source.bookPages,'399');
});
