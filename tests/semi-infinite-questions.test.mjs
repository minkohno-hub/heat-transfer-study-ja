import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const close=(a,b,tol)=>assert.ok(Math.abs(a-b)<tol,a+' vs '+b);
test('four added semi-infinite exercise answers agree with separately evaluated exact solutions',async()=>{
 const source=(await read('data/deep-physics-practice.json')).questions;
 const bank=await read('data/questions.json');
 const qs=source.filter(q=>q.source.focusSectionId==='5.6');
 assert.equal(qs.length,4);
 const correct=id=>{
   const q=qs.find(q=>q.id==='supp-deep-semi-'+id+'-v1');assert.ok(q,id);
   assert.deepEqual(bank.find(item=>item.id===q.id),q);
   return q.choices[q.answer];
 };
 const a=1e-6,t=100,x=.01,k=2,Ti=20,Ts=80;
 const eta=x/(2*Math.sqrt(a*t));
 const temperature=Ti+(Ts-Ti)*0.4795001221869535;
 const flux=k*(Ts-Ti)/Math.sqrt(Math.PI*a*t);
 const energy=2*k*(Ts-Ti)*Math.sqrt(t/(Math.PI*a));
 close(eta,.5,1e-12);close(temperature,48.7700073312,1e-8);
 close(flux,6770.27500257,1e-8);close(energy,1354055.0005,1e-4);
 close(energy/(flux*t),2,1e-12);
 assert.equal(correct('similarity'),'0.50（無次元）');
 assert.equal(correct('profile'),'48.77 ℃');
 assert.equal(correct('surface-flux'),'+6.77×10³ W/m²');
 assert.equal(correct('energy-integral'),'+1.354×10⁶ J/m²');
});
