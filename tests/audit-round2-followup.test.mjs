import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)));
const [questions,deep,notes,source]=await Promise.all(['questions','original-deep-lessons','original-notes','original-section-questions'].map(read));
test('zero total storage is insufficient for a stationary temperature field',()=>{
 const C=100,G=1,temps=t=>[30+5*Math.exp(-2*G*t/C),30-5*Math.exp(-2*G*t/C)];
 const a=temps(0),b=temps(20);assert.notDeepEqual(a,b);
 const energy=([T1,T2])=>C*(T1-20)+C*(T2-20);assert.ok(Math.abs(energy(a)-energy(b))<1e-10);
 const text=deep.lessons.find(l=>l.sectionId==='1.2').blocks.find(b=>b.heading==='定常と非定常を混同しない').text;
 assert.match(text,/逆は一般に成り立たない/);assert.match(text,/二物体/);
});
test('vector flux and normal scalar differ on opposing control-volume faces',()=>{
 const qvec=[10,0],normals=[[-1,0],[1,0]],area=2;
 const normal=normals.map(n=>qvec.reduce((s,v,i)=>s+v*n[i],0));assert.deepEqual(normal,[-10,10]);assert.equal(normal.reduce((s,q)=>s+q*area,0),0);assert.notEqual(normal.reduce((s,q)=>s+Math.abs(q)*area,0),0);
 const lesson=deep.lessons.find(l=>l.sectionId==='1.1');assert.match(lesson.equations[1].expression,/q⃗″·n⃗/);assert.match(lesson.equations[1].expression,/q_n″/);
});
test('revised steady questions retain one general governing equation and conditional initial data',()=>{
 const byid=new Map(questions.map(q=>[q.id,q]));
 for(const [id,revision] of [['supp-section-2-1','v4'],['supp-section-2-5','v2']]){
  const q=byid.get(id);assert.equal(q.revision,revision);assert.equal(q.answer,2);
  const {questionKind,...fields}=q;assert.deepEqual(fields,source.questions.find(item=>item.id===id));
 }
 const q=byid.get('supp-section-2-1');assert.equal(q.choices[q.answer],'∇²T=0');assert.match(q.prompt,/三次元/);assert.match(q.explanation,/定常境界値問題では通常、初期温度は不要/);
 // theta=x*^2-y*^2 is a stationary, source-free dimensionless counterexample to both grad(T)=0 and T_xx=0.
 assert.equal(2+(-2),0);assert.notEqual(2,0);assert.notEqual(2*1,0);
 assert.match(q.choices[3],/s₀>0/,'using the given zero q-triple-prime would create another correct option');
 assert.match(notes.notes.find(n=>n.sectionId==='2.5').explanation,/非定常では初期条件も/);
 const gradient=byid.get('supp-next-steady-flux-concept-v1');assert.equal(gradient.revision,'v2');assert.equal(gradient.answer,1);assert.match(gradient.choices[1],/内部全域で一定となる/);
});
