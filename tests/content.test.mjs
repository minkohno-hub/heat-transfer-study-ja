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
test('chapter 8 opening retains both languages, eight equations, dimensional annotations, and the original figure',{skip:!hasLocal},async()=>{
  for(const sid of ['8.1','8.2']){
    const ja=await read(`data/local/sections/${sid}-ja.json`),en=await read(`data/local/sections/${sid}-en.json`);
    assert.deepEqual(ja.blocks.map(b=>b.id),en.blocks.map(b=>b.id));assert.equal(ja.expertReviewed,false);
    assert.ok(ja.blocks.every(b=>b.pdfPage===b.bookPage+14&&b.pdfPage>=427&&b.pdfPage<=430));
    if(sid==='8.1'){assert.ok(ja.blocks.some(b=>b.type==='quote'&&b.attribution));assert.ok(ja.blocks.some(b=>b.text.includes('滴状凝縮')));}
    else{
      const formulas=ja.blocks.filter(b=>b.type==='formula');assert.deepEqual(formulas.map(b=>b.number),['8.1','8.2','8.3','8.4','8.5','8.6a','8.6b','6.40']);
      assert.match(formulas.find(b=>b.number==='8.2').expression,/\+ g/);assert.match(formulas.find(b=>b.number==='8.5').expression,/ρ_g\/ρ_f/);
      assert.equal(ja.blocks.filter(b=>b.type==='footnote').length,1);assert.equal(ja.blocks.find(b=>b.type==='table').rows.length,3);
      const fig=ja.blocks.find(b=>b.type==='figure');assert.equal(fig.pdfPage,428);assert.equal(fig.figureNumber,'8.1');assert.ok(fig.alt.includes('最大'));await access(new URL(fig.src,root));
    }
    const qs=await read(`data/local/questions/${sid}-ja.json`);assert.equal(qs.length,sid==='8.1'?2:6);
    for(const q of qs){assert.equal(validateQuestion(q),'',q.id);assert.equal(q.source.section,sid);assert.equal(q.reviewStatus,'source_checked');assert.ok(q.solutionSteps.length>=3);if(q.figure)await access(new URL(q.figure.src,root));}
  }
});
test('vertical natural convection retains source caveats, mean-value overbars, all figures and ten question rationales',{skip:!hasLocal},async()=>{
  const ja=await read('data/local/sections/8.3-ja.json'),en=await read('data/local/sections/8.3-en.json');assert.equal(ja.blocks.length,116);assert.deepEqual(ja.blocks.map(b=>b.id),en.blocks.map(b=>b.id));
  const formula=n=>ja.blocks.find(b=>b.type==='formula'&&b.number===n);
  for(const n of ['8.7','8.8','8.9','8.10','8.11','8.12','8.13a','8.13b','8.14','8.15','8.16','8.17','8.18','8.19','8.20','8.21','8.22','8.23','8.24','8.25','8.26','8.27','6.47'])assert.ok(formula(n),n);
  assert.match(formula('8.13b').expression,/8\/27.*²/);assert.match(formula('8.27').expression,/N̅u̅/);assert.match(formula('8.25').text,/W\/m²/);
  assert.equal(ja.blocks.filter(b=>b.type==='footnote').length,4);assert.ok(ja.blocks.filter(b=>b.type==='sourceNote').length>=2);assert.ok(ja.blocks.some(b=>b.type==='sourceNote'&&b.text.includes('0.04357')));
  for(const b of ja.blocks){assert.equal(b.pdfPage,b.bookPage+14);if(b.type==='figure'){await access(new URL(b.src,root));assert.ok(b.alt&&b.caption);}}
  assert.deepEqual(ja.blocks.filter(b=>b.type==='figure').map(b=>b.figureNumber),['8.2','8.3','8.4','8.5']);
  const qs=await read('data/local/questions/8.3-ja.json');assert.equal(qs.length,10);
  for(const q of qs){assert.equal(validateQuestion(q),'',q.id);assert.equal(q.source.section,'8.3');assert.equal(q.expertReviewed,false);assert.ok(q.beginnerPitfall);assert.ok(q.solutionSteps.length>=3);if(q.figure)await access(new URL(q.figure.src,root));}
  assert.equal(qs.find(q=>q.id==='ch8-3-mean-h-calculation').answer,3);
});
