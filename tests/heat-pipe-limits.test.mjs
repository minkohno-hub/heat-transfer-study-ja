import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,bank]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const lesson=deep.lessons.find(l=>l.sectionId==='9.11');
const get=key=>bank.find(q=>q.id==='supp-heatpipe-limit-'+key+'-v1');
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
const number=s=>{
 const match=s.match(/\d+(?:\.\d+)?(?:×10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)?/u);assert.ok(match,s);
 const [base,power]=match[0].split('×10'),digits={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
 return Number(base)*(power?10**Number([...power].map(x=>digits[x]).join('')):1);
};
const unique=(key,expected,t=.005)=>{
 const q=get(key);assert.ok(q);
 assert.deepEqual(q.choices.flatMap((s,i)=>Math.abs(number(s)-expected)<=t*Math.abs(expected)?[i]:[]),[q.answer]);
};

test('Darcy and Poiseuille pressure losses independently close the example capillary budget with valid vapor-flow checks',()=>{
 const latent=1e6,cap=4000,staticHead=800,rhol=800,mul=.001,Ll=1,K=1e-9,Aw=1e-5;
 const rv=.004,rhov=2,muv=2e-5,Lv=1;
 const pressure=heat=>{
  const mass=heat/latent,volumeLiquid=mass/rhol,j=volumeLiquid/Aw;
  // Integrating the parabolic velocity gives volume flow = pi*r^4*dp/(8*mu*L).
  const volumeVapor=mass/rhov,dpv=volumeVapor*8*muv*Lv/(Math.PI*rv**4);
  return {liquid:mul*Ll*j/K,vapor:dpv,mass};
 };
 // Solve the original pressure balance by bisection, not the printed quotient.
 let lo=0,hi=100;
 for(let i=0;i<80;i++){const mid=(lo+hi)/2,p=pressure(mid);if(p.liquid+p.vapor+staticHead>cap)hi=mid;else lo=mid;}
 const heat=(lo+hi)/2,p=pressure(heat),A=Math.PI*rv**2,v=p.mass/(rhov*A),Re=rhov*v*2*rv/muv;
 close(heat,25.579644365783263);close(p.liquid+p.vapor+staticHead,4000);
 close(p.vapor,2.544454277091973);close(v,.2544454277091973);close(Re,203.55634216735785);
 assert.ok(Re<2300);assert.ok(.05*Re*2*rv<Lv);assert.ok(p.vapor/2.5e5<1e-4);
 close(v/400,.0006361135692729933);
 const above=pressure(heat*1.01);assert.ok(above.liquid+above.vapor+staticHead>cap);
 unique('darcy',pressure(20).liquid);unique('capillary-load',(cap-staticHead)/125.10);
 assert.match(lesson.workedExample.answer,/25.6 W/);
});

test('operating Mach and a supplied Weber criterion are separate from an exact sonic limit or a universal entrainment law',()=>{
 const latent=1e6,rho=2,A=1e-4,heat=200,mass=heat/latent,v=mass/(rho*A),a=400;
 close(mass,.0002);close(v,1);unique('mach',v/a);
 const sigma=.04,length=.001,critical=.5,area=5e-5;
 const speed=Math.sqrt(critical*sigma/(rho*length)),candidate=rho*area*latent*speed;
 close(speed,Math.sqrt(10));close(rho*speed**2*length/sigma,critical);unique('entrainment',candidate);
 // Check every distractor against its specified error, including double-counting density.
 const item=get('entrainment'),cases=[candidate,rho*area*latent*Math.sqrt(sigma/(rho*length)),candidate*rho,rho*area*latent];
 item.choices.forEach((s,i)=>assert.ok(Math.abs(number(s)-cases[i])<.005*cases[i]));
 assert.ok(lesson.blocks.some(b=>b.text.includes('厳密な予測式を収録したとは扱わない')));
 assert.ok(lesson.equations.some(e=>e.meaning.includes('普遍定数ではない')));
});

test('evaporating surface and vapor cross-section cannot be substituted and all stated limits constrain a common operating point',()=>{
 const surface=.0005,core=.0001,flux=1e5;
 unique('evaporator-area',surface*flux);assert.notEqual(surface*flux,core*flux);
 const limits=[80,120,60,100],ceiling=Math.min(...limits);
 unique('combined',ceiling);assert.ok(limits.every(x=>ceiling<=x));assert.ok(limits.some(x=>80>x));
 assert.ok(lesson.blocks.some(b=>b.text.includes('異なる温度で計算した最大値だけを寄せ集めない')));
});

test('fluid merit number uses kinematic viscosity and carries kg per second cubed, rather than a device heat rating',()=>{
 const latent=1e6,surface=.04,mu=.001,rho=800,nu=mu/rho,merit=latent*surface/nu;
 close(nu,1.25e-6);close(merit,3.2e10);unique('merit',merit);
 // kg,m,s: latent [0,2,-2], surface tension [1,0,-2], inverse nu [0,-2,1].
 assert.deepEqual([[0,2,-2],[1,0,-2],[0,-2,1]].reduce((s,row)=>s.map((v,i)=>v+row[i]),[0,0,0]),[1,0,-3]);
 const selection=get('fluid-selection');assert.match(selection.choices[selection.answer],/作動温度・濡れ・材料適合性/);
 assert.ok(lesson.blocks.some(b=>b.text.includes('装置の最大輸送熱でもない')));
});

test('eight additional heat-pipe questions keep three skills, balanced original keys, distinct IDs and internal-only review',()=>{
 const items=bank.filter(q=>q.id.startsWith('supp-heatpipe-limit-'));
 assert.equal(items.length,8);assert.equal(new Set(items.map(q=>q.questionKind)).size,3);
 assert.deepEqual(items.map(q=>q.answer),[0,1,2,3,0,1,2,3]);
 for(const item of items){
  assert.equal(item.source.focusSectionId,'9.11');assert.equal(item.source.chapterId,'ch9');assert.equal(item.revision,'v1');
  assert.equal(item.expertReviewed,false);assert.match(item.reviewStatus,/外部専門家校閲前/);
  assert.equal(item.choices.length,4);assert.equal(item.distractors.filter(s=>s.startsWith('正解。')).length,1);
  assert.ok(item.distractors[item.answer].startsWith('正解。'));assert.equal(item.solutionSteps.length,4);
 }
});
