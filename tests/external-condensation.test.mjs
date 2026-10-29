import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,bank]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const lesson=deep.lessons.find(l=>l.sectionId==='9.9'),q=key=>bank.find(q=>q.id==='supp-condensation-external-'+key+'-v1');
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
const rho=900,mu=.0003,k=.6,D=.02,latent=2.3e6,dt=20,g=9.81;
const Vg2=1.69*g*latent*mu*D/(k*dt);
const stable=u=>.64*Math.sqrt((rho*D/mu)*(u+Math.hypot(u,Math.sqrt(Vg2))));

test('external cylinder correlation agrees with a no-division equivalent and closes heat over the side area',()=>{
 const u=.1,Re=rho*u*D/mu,B=Vg2/u**2;
 const original=.64*Math.sqrt(Re*(1+Math.sqrt(1+B)));
 close(Re,6000);close(B,1906.5735);close(stable(u),original);close(original,331.35357196227636);
 const h=stable(u)*k/D,heat=h*dt*Math.PI*D*.5;
 close(h,9940.60715886829);close(heat,6245.867684504545);
 assert.match(lesson.workedExample.answer,/6.25 kW/);
 const coefficient=q('mean-coefficient');
 // Reordered choices are deliberately checked independently of their label.
 const numeric=s=>{const [a,b]=s.split(' ')[0].split('×10');const ex={'²':2,'³':3,'⁴':4};return Number(a)*10**ex[b];};
 assert.deepEqual(coefficient.choices.map(numeric),[19900,9940,2100,331]);
 assert.deepEqual(coefficient.choices.flatMap((s,i)=>Math.abs(numeric(s)-h)/h<.005?[i]:[]),[coefficient.answer]);
});

test('low speed and shear dominated limits are continuous, dimensionless, and obey the original Reynolds bound',()=>{
 // u -> 0: recover the gravity-film fourth-root form using liquid dynamic viscosity.
 const gravityLimit=.64*Math.pow(1.69,.25)*Math.pow(rho**2*g*latent*D**3/(mu*k*dt),.25);
 close(stable(0),gravityLimit);close(stable(1e-12),gravityLimit,1e-10);
 const fast=stable(10),Re=rho*10*D/mu,approx=.64*Math.sqrt(2*Re);
 close(fast,716.886703169677);close(approx,701.0848736066126);assert.ok((fast-approx)/fast<.023);
 assert.ok(Re<1e6);assert.ok(rho*20*D/mu>1e6);
 const fastItem=q('high-speed-limit');assert.equal(fastItem.choices[fastItem.answer],'128（無次元）');
 assert.equal(fastItem.revision,'v2');
 const R=20000,expected=[Math.sqrt(2*R),.64*2*Math.sqrt(R),.64*Math.sqrt(2*R),.64*Math.sqrt(R)];
 fastItem.choices.forEach((choice,i)=>assert.ok(Math.abs(parseFloat(choice)-expected[i])/expected[i]<.005,'each distractor must match its stated numerical misconception'));
 // kg,m,s exponents for V_g^2 = g * latent * mu * D / (k * deltaT).
 const units=[[0,1,-2],[0,2,-2],[1,-1,-1],[0,1,0],[-1,-1,3]];
 assert.deepEqual(units.reduce((sum,row)=>sum.map((n,i)=>n+row[i]),[0,0,0]),[0,2,-2]);
 assert.ok(lesson.equations.some(e=>e.meaning.includes('Re_D≤10⁶')));
 assert.ok(lesson.blocks.some(b=>b.text.includes('高速極限へ置き換えるだけでは範囲外の問題は解消しない')));
});

test('fixed-film zero mass flow and zero integrated closure are not interchangeable under opposing shear',()=>{
 // Scale rho/mu, delta and buoyancy to one for a clean counterexample.
 const gamma=tau=>1/3+tau/2,closure=tau=>1+4*tau/3;
 close(gamma(-2/3),0);close(closure(-3/4),0);close(gamma(-3/4),-1/24);
 assert.notEqual(gamma(-3/4),0);
 assert.match(lesson.blocks.map(b=>b.text).join(' '),/解の存在条件.*正味流量ゼロを同じ判定式だとみなさない/);
 assert.match(lesson.reviewStatus,/停止条件の原本解釈は確認事項/);
});

test('four distinct new questions keep liquid properties, limits, keyed reasons and internal-only review',()=>{
 const items=bank.filter(q=>q.id.startsWith('supp-condensation-external-'));
 assert.equal(items.length,4);assert.deepEqual(items.map(q=>q.questionKind),['numerical','numerical','numerical','applied']);
 const sectionItems=bank.filter(q=>q.source.focusSectionId==='9.9'||q.source.sectionNoteId==='9.9');
 assert.deepEqual([...new Set(sectionItems.map(q=>q.questionKind))].sort(),['applied','conceptual','numerical']);
 assert.deepEqual(items.map(q=>q.answer),[0,1,2,3]);
 const Re=q('liquid-reynolds');assert.equal(Re.choices[Re.answer],'6.00×10³');
 const range=q('range-selection');assert.equal(range.choices[range.answer],'上限外なので、適合する別相関を探す');
 for(const item of items){
  assert.equal(item.source.focusSectionId,'9.9');assert.equal(item.revision,item.id.includes('high-speed-limit')?'v2':'v1');assert.equal(item.expertReviewed,false);
  assert.match(item.reviewStatus,/外部専門家校閲前/);assert.equal(item.distractors.filter(s=>s.startsWith('正解。')).length,1);
  assert.ok(item.distractors[item.answer].startsWith('正解。'));assert.equal(item.solutionSteps.length,4);
 }
});
