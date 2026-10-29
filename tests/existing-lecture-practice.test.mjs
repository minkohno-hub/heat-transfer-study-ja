import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const questions=JSON.parse(await readFile(new URL('../data/questions.json',import.meta.url)));
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('local heat storage follows divergence and generation signs even during net cooling',()=>{
 close((5e4-8e4)/2e6,-.015);
 const q=questions.find(q=>q.id==='supp-existing-heat-local-storage-v1');
 assert.match(q.choices[q.answer],/−0.015 K\/s/);
});
test('heat exchanger practice checks spatial endpoints, both energy balances and correction-factor area',()=>{
 const hot=250*(100-40),cold=375*(60-20),d1=100-60,d2=40-20;
 close(hot,cold);assert.ok(d1>0&&d2>0);assert.ok(60>40);
 const mean=(d1-d2)/Math.log(d1/d2);assert.ok(d2<mean&&mean<d1);
 close(10000/(200*.80*40),1.5625);
 // Evaluate the equal-end limit using log1p to avoid loss near equality.
 const eps=1e-7;close(eps/Math.log1p(eps/30),30,1e-6);
});
test('lumped examples verify heating bounds, released energy, half-time inversion and variable-h integration',()=>{
 close(1*500/(20*.10),250);
 const T=80+(20-80)*Math.exp(-1);close(T,57.92723352971346);assert.ok(T>20&&T<80);
 close(1*500*(100-49.4),25300);close(600*Math.log(2)/(.050*120),69.31471805599453);
 const mc=600,A=.05,h0=20,a=.10,t=100;
 const theta=Math.exp(-A*(h0*t+a*t*t/2)/mc);
 const slope=-A*(h0+a*t)/mc*theta;
 close(mc*slope,-A*(h0+a*t)*theta);
 assert.ok(theta>0&&theta<1);
});
test('twenty targeted additions fill the five existing-lecture gaps without granting expert approval',()=>{
 const counts={'2.1':3,'3.2':6,'4.5':2,'5.2':7,'5.6':2};
 const added=questions.filter(q=>q.id.startsWith('supp-existing-'));assert.equal(added.length,20);
 for(const [id,count] of Object.entries(counts)){
  assert.equal(added.filter(q=>q.source.focusSectionId===id).length,count);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);
  assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
 for(const q of added){assert.equal(q.expertReviewed,false);assert.match(q.reviewStatus,/包括的品質監査待ち/);assert.ok(q.source.guideId);assert.equal(q.distractors.filter(s=>s.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));}
});
