import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateDeepLessons,deepLessonForSection} from '../original-deep-lessons.mjs';
import {checkPublicContent} from '../public-content-contract.mjs';
import {GUIDE_SECTIONS} from '../guide.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
test('advanced original Japanese instruction includes 1.1 and 3.1 alongside the existing topics without claiming an unlicensed translation',async()=>{
 const [book,deep]=await Promise.all(['data/book.json','data/original-deep-lessons.json'].map(read));
 assert.deepEqual(validateDeepLessons(book,deep),[]);
 assert.equal(deep.lessons.length,59);
 assert.deepEqual(deep.lessons.map(x=>x.sectionId),['1.1','1.2','1.3','1.4','1.5','2.1','2.2','2.3','2.4','2.5','3.1','3.2','3.3','3.4','4.1','4.2','4.3','4.4','4.5','5.1','5.2','5.3','5.4','5.5','5.6','5.7','5.8','6.1','7.2','8.4','8.5','9.1','9.2','9.3','9.4','9.5','9.6','9.7','9.8','9.9','9.10','9.11','10.1','10.2','10.3','10.4','10.5','10.6','11.1','11.2','11.3','11.4','11.5','11.6','11.7','11.8','11.9','11.10','11.11']);
 assert.equal(deep.translation,false);
 assert.equal(deep.expertReviewed,false);
 for(const l of deep.lessons){
  assert.equal(deepLessonForSection(deep,l.sectionId),l);
  assert.ok(l.blocks.length>=6);
  assert.ok(l.blocks.reduce((n,b)=>n+b.text.length,0)>=750);
  assert.ok(l.equations.every(e=>e.expression&&e.meaning&&e.label));
  assert.ok(l.pitfalls.length>=4);
  assert.ok(l.references.every(r=>r.url.startsWith('https://')));
  assert.ok(l.reviewStatus.includes('外部学術専門家校閲前'));
  assert.ok(l.workedExample.steps.length>=4);
 }
 assert.equal(deepLessonForSection(deep,'12.1'),null);
});
test('natural convection and film condensation independently recompute the two worked examples',()=>{
 const Ra=(9.81*.003*10*.2**3)/(1.5e-5*2e-5);
 const Nu=.59*Ra**.25,h=Nu*.026/.2,Q=h*.5*10;
 const close=(x,y,tol)=>assert.ok(Math.abs(x-y)<tol,x+' vs '+y);
 close(Ra,7.848e6,1e-4);close(Nu,31.23,.01);close(h,4.06,.01);close(Q,20.3,.03);
 const rho=950,rhov=.60,k=.68,mu=2.8e-4,g=9.81,latent=2.25e6,L=.020,b=.50,dT=10;
 const hc=.943*(rho*(rho-rhov)*g*latent*k**3/(mu*L*dT))**.25;
 const heat=hc*(L*b)*dT,m=heat/latent,filmRe=4*m/(b*mu);
 close(hc,17242.59,1);close(heat,1724.26,1);close(m,.00076634,1e-7);
 close(filmRe,21.9,.1);
 assert.ok(filmRe<30,'Worked example should remain within the approximate smooth-film regime');
 // h~L^(-1/4), and q''~(T_sat-T_w)^(3/4), within the same Nusselt-film idealization.
 close((hc*(2**(-.25)))/hc,2**(-.25),1e-10);
 close((hc*(2**(-.25))*(2*dT))/(hc*dT),2**(.75),1e-10);
});
test('LMTD and lumped transient Japanese worked examples are independently recalculated',()=>{
  // Counterflow: heat-capacity-rate consistency as well as LMTD/UA consistency.
  const heatHot=250*(100-60);
  const heatCold=500*(40-20);
  assert.equal(heatHot,10_000);
  assert.equal(heatHot,heatCold);
  const dt1=100-40,dt2=60-20;
  const lm=(dt1-dt2)/Math.log(dt1/dt2);
  assert.ok(Math.abs(lm-49.326069)<0.001);
  const ua=heatHot/lm,u=ua/2;
  assert.ok(Math.abs(ua-202.732554)<0.01);
  assert.ok(Math.abs(u-101.366277)<0.01);
  assert.ok(Math.abs(ua*lm-heatCold)<1e-8);
  // Lumped thermal capacitance: independently calculate Biot, tau and lost sensible heat.
  const m=1,c=500,rho=5000,as=.10,h=20,ks=50,T0=100,Tinf=20;
  const V=m/rho,Lc=V/as,Bi=h*Lc/ks,tau=m*c/(h*as);
  const t=tau,T=Tinf+(T0-Tinf)*Math.exp(-t/tau),heatReleased=m*c*(T0-T);
  assert.equal(Bi,.0008);
  assert.equal(tau,250);
  assert.ok(Math.abs(T-49.4303553)<0.0001);
  assert.ok(Math.abs(heatReleased-25284.8223)<0.1);
  const alpha=ks/(rho*c),Fo=alpha*t/(Lc**2);
  assert.ok(Math.abs(Bi*Fo-t/tau)<1e-12);
});

test('semi-infinite constant-wall-temperature solution independently closes the heat equation and energy integral',async()=>{
 const close=(x,y,tol)=>assert.ok(Math.abs(x-y)<=tol*Math.max(1,Math.abs(y)),x+' vs '+y);
 const d=await read('data/original-deep-lessons.json');
 const lesson=deepLessonForSection(d,'5.6');
 assert.ok(lesson);
 const Ti=20,Ts=80,k=2,alpha=1e-6,t=100,x=.01;
 const eta=x/(2*Math.sqrt(alpha*t));
 close(eta,.5,1e-12);
 const erfHalf=.5204998778130465;
 const temperature=Ts+(Ti-Ts)*erfHalf;
 const flux=k*(Ts-Ti)/Math.sqrt(Math.PI*alpha*t);
 const cumulative=2*k*(Ts-Ti)*Math.sqrt(t/(Math.PI*alpha));
 close(temperature,48.7700073312,1e-10);
 close(flux,6770.27500257,1e-9);
 close(cumulative,1354055.0005,1e-9);
 close(cumulative/(flux*t),2,1e-12);
 // Analytically differentiate the complementary-error-function solution.
 const amplitude=Ti-Ts,exp=Math.exp(-eta*eta),den=Math.sqrt(Math.PI*alpha*t);
 const dTdt=-amplitude*x*exp/(2*t*den);
 const secondX=-amplitude*x*exp/(2*alpha*t*den);
 close(dTdt,alpha*secondX,1e-11);
 assert.ok(lesson.workedExample.answer.includes('48.77'));
 assert.ok(lesson.workedExample.answer.includes('1.354'));
 assert.ok(lesson.pitfalls.some(p=>p.includes('発散')));
 assert.ok(lesson.reviewStatus.includes('外部学術専門家校閲前'));
});
test('new heat-equation and binary-diffusion examples balance fluxes and use the correct frame',async()=>{
 const d=await read('data/original-deep-lessons.json');
 const slab=deepLessonForSection(d,'2.1');
 const diffusion=deepLessonForSection(d,'11.3');
 assert.ok(slab.blocks.some(b=>b.text.includes('∇·(k∇T)')));
 assert.ok(slab.blocks.some(b=>b.text.includes('Dirichlet')&&b.text.includes('Robin')));
 assert.ok(diffusion.blocks.some(b=>b.text.includes('N_A=J_A+y_A N_t')));
 assert.ok(diffusion.blocks.some(b=>b.text.includes('Stefan')));
 const L=.040,k=20,generation=8e4,Tsurface=30,center=L/2;
 const temperature=x=>Tsurface+generation*x*(L-x)/(2*k);
 const flux=x=>-generation*(L/2-x);
 assert.ok(Math.abs(temperature(center)-30.8)<1e-12);
 assert.ok(Math.abs(temperature(0)-Tsurface)<1e-12);
 assert.ok(Math.abs(temperature(L)-Tsurface)<1e-12);
 assert.equal(flux(0),-1600);
 assert.equal(flux(L),1600);
 assert.equal(flux(L)-flux(0),generation*L);
 const c=101325/(8.3144626*300),cDoverL=c*2e-5/.01;
 const equimolar=cDoverL*(.20-.05);
 const stagnantB=cDoverL*Math.log((1-.05)/(1-.20));
 assert.ok(Math.abs(c-40.62)<.005);
 assert.ok(Math.abs(equimolar-.01219)<.00001);
 assert.ok(Math.abs(stagnantB-.01396)<.00001);
 assert.ok(stagnantB>equimolar);
 assert.ok(diffusion.workedExample.answer.includes('0.01396'));
 assert.ok(slab.workedExample.answer.includes('3200 W/m²'));
});
test('the new finite black-surface explanation respects reciprocity and net-pair conservation',async()=>{
 const lesson=deepLessonForSection(await read('data/original-deep-lessons.json'),'10.1');
 assert.ok(lesson.blocks.some(block=>block.heading==='二つの黒体面を区別して数える'));
 assert.ok(lesson.equations.some(eq=>eq.expression.includes('A_1F_12=A_2F_21')));
 const sigma=5.670374419e-8,A1=1,A2=2,F12=.30,F21=A1*F12/A2,T1=400,T2=300;
 assert.equal(F21,.15);
 const q12=sigma*A1*F12*(T1**4-T2**4);
 const q21=sigma*A2*F21*(T2**4-T1**4);
 assert.ok(Math.abs(q12-297.6946569975)<1e-9);
 assert.ok(Math.abs(q12+q21)<1e-9);
 assert.ok(lesson.blocks.some(block=>block.text.includes('他の面との対交換も足す')));
});
test('public build checks advanced note structural integrity and mislabeling',async()=>{
 const [book,questions,glossary,originalNotes,deepLessons]=await Promise.all([
  'data/book.json','data/questions.json','data/glossary.json','data/original-notes.json','data/original-deep-lessons.json'
 ].map(read));
 for(const ch of book.chapters)for(const section of ch.sections){
  if(section.translationStatus==='translated')section.translationStatus='private_only';
  for(const key of ['blocks','blocksEn','figures','sourceReview'])delete section[key];
 }
 for(const q of questions)if(q.figure?.kind==='book')delete q.figure.src;
 const check=x=>checkPublicContent({book,questions,glossary,guides:GUIDE_SECTIONS,originalNotes,deepLessons:x});
 assert.deepEqual(check(deepLessons),[]);
 const broken=structuredClone(deepLessons);
 broken.lessons[0].sectionId='99.1';
 assert.ok(check(broken).some(x=>x.includes('対象範囲外')));
 const falseReview=structuredClone(deepLessons);
 falseReview.expertReviewed=true;
 assert.ok(check(falseReview).some(x=>x.includes('形式・権利表示')));
 const missing=structuredClone(deepLessons);
 missing.lessons.pop();
 assert.ok(check(missing).some(x=>x.includes('完全性')));
});

test('new fundamentals and exchanger worked examples conserve energy and distinguish units',async()=>{
 const d=await read('data/original-deep-lessons.json');
 const basics=deepLessonForSection(d,'1.1');
 const exchanger=deepLessonForSection(d,'3.1');
 const flux=x=>100+200*x;
 const width=.5;
 const integrated=width*(100*1+200*1**2/2);
 assert.equal(integrated,100);
 assert.equal(integrated/(width*1),200);
 assert.equal(integrated*20,2000);
 assert.ok(basics.workedExample.answer.includes('100 W'));
 const ch=.6*4000,cc=.8*4000,q=ch*(70-50);
 assert.equal(q,48000);
 assert.equal(20+q/cc,35);
 const qmax=Math.min(ch,cc)*(70-20);
 assert.equal(qmax,120000);
 assert.equal(q/qmax,.4);
 assert.ok(exchanger.workedExample.answer.includes('48.0 kW'));
});
