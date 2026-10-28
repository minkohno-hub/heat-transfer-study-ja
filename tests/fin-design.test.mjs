import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateQuestion} from '../study-core.mjs';
import {deepLessonForSection} from '../original-deep-lessons.mjs';
const load=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const close=(actual,expected,tol=1e-4)=>assert.ok(Math.abs(actual-expected)<=tol,actual+' differs from '+expected);

test('fin equation, insulated tip temperature and two independent heat-balance forms agree',async()=>{
 const k=200,h=25,P=.04,A=1e-4,L=.1,Tb=80,Tinf=20;
 const theta=Tb-Tinf,m=Math.sqrt(h*P/(k*A)),z=m*L;
 const eta=Math.tanh(z)/z;
 const qb=k*A*m*theta*Math.tanh(z);
 const ideal=h*P*L*theta;
 close(m,7.0710678118655,1e-11);
 close(qb,5.1663430294833,1e-10);
 close(qb,eta*ideal,1e-12);
 close(eta,.8610571715805,1e-11);
 close(qb/(h*A*theta),34.442286863222,1e-10);
 const tip=Tinf+theta/Math.cosh(z);
 close(tip,67.5966909047832,1e-10);
 // Exact convection at the tip with Atip=A; no fitting factors.
 const beta=h/(m*k);
 const qtip=k*A*m*theta*(Math.sinh(z)+beta*Math.cosh(z))/(Math.cosh(z)+beta*Math.sinh(z));
 close(qtip,5.25973141132938,1e-10);
 assert.ok(qtip>qb);
 const limit=k*A*m*theta;
 assert.ok(qb<limit&&eta<1);
 const [bundle,bank,deep]=await Promise.all(['data/deep-physics-practice.json','data/questions.json','data/original-deep-lessons.json'].map(load));
 const lesson=deepLessonForSection(deep,'4.5');
 assert.ok(lesson);
 assert.match(lesson.workedExample.answer,/5.166/);
 assert.match(lesson.workedExample.answer,/67.60/);
 assert.match(lesson.workedExample.answer,/34.44/);
 assert.match(lesson.reviewStatus,/外部学術専門家校閲前/);
 const items=bundle.questions.filter(q=>q.source.focusSectionId==='4.5');
 assert.equal(items.length,4);
 for(const q of items){
   assert.equal(validateQuestion(q),'',q.id);
   assert.deepEqual(bank.find(x=>x.id===q.id),q);
   assert.equal(q.source.guideId,'chapter4-fin-design');
   const lengths=q.choices.map(c=>c.length);
   assert.ok(lengths[q.answer]!==Math.min(...lengths)||lengths.filter(n=>n===lengths[q.answer]).length>1);
   assert.ok(lengths[q.answer]!==Math.max(...lengths)||lengths.filter(n=>n===lengths[q.answer]).length>1);
 }
 const keyed=new Map(items.map(q=>[q.id,q.choices[q.answer]]));
 assert.equal(keyed.get('supp-deep-fin-base-heat-v1'),'5.166 W');
 assert.equal(keyed.get('supp-deep-fin-effectiveness-v1'),'34.44 倍');
 assert.equal(keyed.get('supp-deep-fin-tip-temperature-v1'),'67.60 ℃');
 assert.equal(keyed.get('supp-deep-fin-convective-tip-v1'),'5.260 W');
});
