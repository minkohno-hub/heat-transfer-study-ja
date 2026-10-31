import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('Fick frame conversion conserves total molar flux and distinguishes stationary B',async()=>{
 const qs=JSON.parse(await readFile(new URL('../data/questions.json',import.meta.url)));
 const numeric=qs.find(q=>q.id==='supp-fick-frame-total-flux-v1');
 const model=qs.find(q=>q.id==='supp-fick-stagnant-versus-equimolar-v1');
 assert.equal(numeric.answer,2);assert.equal(model.answer,3);
 const total=.010,y=.30,ja=.002;
 const na=ja+y*total,nb=-ja+(1-y)*total;
 assert.ok(Math.abs(na-.005)<1e-12);
 assert.ok(Math.abs(na+nb-total)<1e-12);
 // For stationary B, its diffusion cancels bulk carriage rather than vanishing.
 const stationaryNa=.01,stationaryJb=-(1-y)*stationaryNa;
 assert.equal(stationaryJb+(1-y)*stationaryNa,0);
 for(const q of [numeric,model]){
  assert.equal(q.source.focusSectionId,'11.3');
  assert.equal(q.expertReviewed,false);
  assert.equal(q.distractors.length,4);
  assert.ok(q.distractors[q.answer].startsWith('正解。'));
 }
});
