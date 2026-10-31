import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url)));
const [deep,all,terms]=await Promise.all(['data/original-deep-lessons.json','data/questions.json','data/glossary.json'].map(read));
const lesson=deep.lessons.find(l=>l.sectionId==='10.2');
const get=id=>all.find(q=>q.id===`supp-kirchhoff-${id}-v1`);
const close=(x,y)=>assert.ok(Math.abs(x-y)<1e-10);
test('Kirchhoff lecture distinguishes incident partition, mode equilibrium and spectral averages',()=>{
 assert.ok(lesson);assert.ok(lesson.blocks.length>=8&&lesson.equations.length>=5);
 const body=lesson.blocks.map(b=>b.text).join(' ');
 for(const pattern of [/全エネルギーの定常収支がゼロ/,/光源のスペクトルを変える/,/同じ一定値を積分の外へ/,/反射項へ無条件/])assert.match(body,pattern);
 assert.match(lesson.reviewStatus,/外部学術専門家校閲前/);
 assert.equal(deep.translation,false);assert.equal(deep.expertReviewed,false);
});
test('two-band worked example independently conserves emission, absorption, reflection and net exchange',()=>{
 const epsilon=.9*.2+.1*.8,alpha=.9*.8+.1*.2,G=500,Eb=1000;
 const E=epsilon*Eb,abs=alpha*G,reflect=(1-alpha)*G,J=E+reflect;
 close(epsilon,.26);close(alpha,.74);close(abs+reflect,G);
 close(J,390);close(J-G,-110);close(.020*(J-G),-2.20);
 assert.match(lesson.workedExample.answer,/J=390 W\/m²/);
 assert.match(lesson.workedExample.answer,/−110 W\/m²/);
 assert.match(lesson.workedExample.answer,/−2.20 W/);
 assert.match(lesson.workedExample.limitations,/仮想例/);
});
test('incident-weight question uses the incident spectral fractions rather than an equal average',()=>{
 const q=get('incident-weight'),values=q.choices.map(Number),expected=.90*.80+.10*.20;
 assert.deepEqual(values.flatMap((v,i)=>Math.abs(v-expected)<1e-12?[i]:[]),[q.answer]);
 assert.equal(q.choices[q.answer],'0.74');
});
test('emission-weight question uses the surface blackbody spectrum and excludes reflection',()=>{
 const q=get('emission-weight');close(.60*.25+.20*.75,.30);
 close((.60*.25+.20*.75)*1000,300);
 assert.equal(q.choices[q.answer],'ε=0.30、E=300 W/m²');
 assert.match(q.explanation,/射度ではない/);
});
test('selective-surface question subtracts absorbed input and applies area with consistent sign',()=>{
 const q=get('selective-net-flux'),net=.26*1000-.74*500;
 close(net,-110);close(net*.020,-2.20);
 assert.equal(q.choices[q.answer],'q″=−110 W/m²、Q̇=−2.20 W');
 assert.match(q.explanation,/反射は130 W\/m²/);
});
test('two spectral measurements provide one physically admissible inverse solution',()=>{
 const det=.8*.8-.2*.2,a=(.74*.8-.2*.26)/det,b=(.8*.26-.2*.74)/det;
 close(det,.60);close(a,.90);close(b,.10);
 const candidates=[[.9,.1],[.1,.9],[.74,.26],[.5,.5]];
 assert.deepEqual(candidates.filter(([a,b])=>Math.abs(.8*a+.2*b-.74)<1e-12&&Math.abs(.2*a+.8*b-.26)<1e-12),[[.9,.1]]);
 const q=get('two-illumination-inverse');assert.equal(q.choices[q.answer],'a=0.90、b=0.10');
});
test('same-temperature cavity radiation has zero net exchange while emission and reflection persist',()=>{
 for(const epsilon of [0,.1,.6,1])close(epsilon*1000+(1-epsilon)*1000,1000);
 const q=get('equilibrium-radiosity');
 assert.equal(q.choices[q.answer],'自己放出と反射でJ=E_bとなり、正味流束はゼロとなる');
 assert.match(q.explanation,/放射しない.*意味ではない/);
});
test('intensity scaling alone does not identify two bands and a steady cooled surface need not be in radiative equilibrium',()=>{
 close(.8*.4-.2*1.6,0);
 const inverse=get('spectral-identifiability');assert.match(inverse.choices[inverse.answer],/独立な測定情報/);
 // All energy terms are nonzero, but storage can still be zero.
 close(370-260-110,0);
 const steady=get('steady-versus-equilibrium');assert.match(steady.choices[steady.answer],/熱平衡とは限らない/);
 assert.match(steady.explanation,/蓄熱率がゼロ/);
});
test('seven new questions cover three skills and the original partition question retains its identity with a revision',()=>{
 const qs=all.filter(q=>q.id.startsWith('supp-kirchhoff-'));assert.equal(qs.length,7);
 assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 for(const q of qs){
  assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);
  assert.equal(q.distractors.filter(r=>r.startsWith('正解。')).length,1);
  assert.ok(q.distractors[q.answer].startsWith('正解。'));
  assert.equal(q.source.focusSectionId,'10.2');assert.equal(q.expertReviewed,false);
  assert.ok(q.hints.length>=2&&q.solutionSteps.length>=3);
 }
 const old=all.find(q=>q.id==='supp-section-10-2');
 assert.equal(old.revision,'v3');assert.equal(old.choices[old.answer],'0.3');
 assert.match(old.explanation,/別の収支|入射エネルギーの収支/);
 const term=terms.find(t=>t.id==='kirchhoff-radiation-law');
 assert.ok(term);assert.equal(term.reviewStatus,'needs_review');
 assert.ok(term.relatedQuestions.every(link=>all.some(q=>q.id===link.id)));
});
