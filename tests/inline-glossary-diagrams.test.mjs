import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {termCandidates,matchTerms,renderTermLinks,renderTermSheet} from '../term-links.mjs';
import {renderSimulationDiagram} from '../sim-diagrams.mjs';
const glossary=JSON.parse(await readFile(new URL('../data/glossary.json',import.meta.url),'utf8'));
test('expanded glossary has unique canonical Japanese labels and categorical, accurate supplement notes',()=>{
 assert.equal(glossary.length,109);
 assert.equal(new Set(glossary.map(x=>x.id)).size,109);
 assert.equal(new Set(glossary.map(x=>x.ja)).size,109);
 assert.ok(glossary.filter(x=>x.source.type==='supplement').length>=80);
 for(const x of glossary){
  assert.ok(x.en&&x.brief&&x.beginner&&x.detail&&Array.isArray(x.aliases),x.id);
  assert.ok(x.meaning&&x.source&&x.source.type!=='book_translation',x.id);
 }
 for(const name of ['フーリエの法則','熱伝達率の単位','照射量','射度','放射発散度','フィン有効度','偏微分','積分','SI単位系','半無限固体'])
  assert.ok(glossary.some(x=>x.ja===name),name);
});
test('longest glossary match wins and generic one-letter units do not wreck readability',()=>{
 const text='熱伝導率と温度勾配とフーリエの法則、熱流束。';
 const hits=matchTerms(text,glossary,6);
 assert.deepEqual(hits.map(x=>x.label),['熱伝導率','温度勾配','フーリエの法則','熱流束']);
 assert.deepEqual(matchTerms('W J K ℃ と熱',glossary,4),[]);
 assert.deepEqual(matchTerms('熱伝達率と対流熱伝達率',glossary,4).map(x=>x.id),['convection-coefficient','convection-coefficient']);
 assert.ok(termCandidates(glossary).length>=95);
 assert.ok(matchTerms('Nu Pr and Biot number',glossary,5).some(x=>x.id==='biot-number'));
});
test('term markup escapes content, is keyboard focusable, and avoids false nested scripts',()=>{
 const markup=renderTermLinks('熱流束を確認し、温度勾配を調べる',glossary);
 assert.match(markup,/data-term-id="heat-flux"/);
 assert.match(markup,/data-term-id="temperature-gradient"/);
 assert.match(markup,/tabindex="0"/);
 assert.match(markup,/aria-haspopup="dialog"/);
 const escaped=renderTermLinks('<img src=x onerror=alert(1)> 熱流束',glossary);
 assert.ok(!escaped.includes('<img'));
 assert.ok(escaped.includes('&lt;img'));
 const sheet=renderTermSheet(glossary.find(x=>x.id==='heat-flux'));
 assert.match(sheet,/aria-modal="true"/);assert.match(sheet,/data-close-term/);
 assert.match(sheet,/data-term-detail="heat-flux"/);
 assert.equal(matchTerms('熱流束が熱流束に比例',glossary,1).length,1);
});
test('model diagrams have live labels, accessible non-color arrows and distinct physically meaningful models',()=>{
 const cases=[
  ['conduction',{hot:80,cold:20,thickness:.08,area:.5},{watts:100},/左から右/],
  ['convection',{surface:30,fluid:80,h:25},{watts:-50},/流体から表面へ/],
  ['radiation',{surface:150,surrounding:25,emissivity:.8},{watts:35},/423\.15K/],
  ['resistance',{hot:40,cold:20,L1:.01,L2:.05},{watts:40},/層1/],
  ['transient',{initial:60,ambient:20,time:2000},{temperature:34.72,biot:.02},/Bi=0\.02/]
 ];
 for(const [mode,values,result,pattern] of cases){
   const svg=renderSimulationDiagram(mode,values,result);
   assert.match(svg,/<svg /);assert.match(svg,/<title>/);assert.match(svg,/<desc>/);
   assert.match(svg,/role="img"/);assert.match(svg,/アプリ作成の図/);
   assert.match(svg,pattern);
   assert.ok(!svg.includes('NaN'));
 }
 const left=renderSimulationDiagram('conduction',{hot:20,cold:80,thickness:.1,area:1},{watts:-20});
 assert.match(left,/右から左/);
 assert.match(left,/M182 104 L168 113 L182 122/);
 assert.ok(!renderSimulationDiagram('radiation',{surface:'<img>',surrounding:20,emissivity:1},{}).includes('<img>'));
});
