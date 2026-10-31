import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,qs]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('constant-mass reactor example conserves total mass and its analytic transient satisfies species storage',()=>{
 const rho=1000,V=.020,q=1e-5,win=.20,r=.005,w=.10;
 const A=rho*q*win-rho*q*w+r*V,B=rho*q*(1-win)-rho*q*(1-w)-r*V;
 close(A,.00110);close(A+B,0);close(A/(rho*V),5.5e-5);
 const tau=V/q,wss=win+r*V/(rho*q),t=500,wt=wss+(w-wss)*Math.exp(-t/tau);
 close(tau,2000);close(wss,.21);
 const derivative=-(w-wss)/tau*Math.exp(-t/tau);
 close(rho*V*derivative,rho*q*(win-wt)+r*V);
 assert.match(deep.lessons.find(l=>l.sectionId==='11.4').workedExample.answer,/5.50×10⁻⁵/);
});
test('stationary diffusion separates instantaneous flux, integrated uptake and Stefan-flow conditions',()=>{
 const rho=1000,D=1e-9,t=1000,dw=.020;
 const surface=rho*dw*Math.sqrt(D/(Math.PI*t)),uptake=2*rho*dw*Math.sqrt(D*t/Math.PI);
 close(surface,1.1283791670955127e-5);close(uptake,.022567583341910252);close(uptake,2*t*surface);
 close(.001/(2*Math.sqrt(D*t)),.5);close(.020*.4795001,.009590002);
 const zeroB=.10*Math.log(.9/.7),equimolar=.10*(.3-.1);
 close(zeroB,.0251314428280906);close(equimolar,.020);assert.ok(zeroB>equimolar);
 assert.match(deep.lessons.find(l=>l.sectionId==='11.5').workedExample.limitations,/質量平均静止/);
});
test('low-rate flat-plate example uses momentum diffusivity, concentration basis and a length average',()=>{
 const U=2,L=.5,nu=1.5e-5,D=2e-5,Re=U*L/nu,Sc=nu/D;
 const Sh=.664*Math.sqrt(Re)*Math.cbrt(Sc),k=Sh*D/L;
 close(Re,66666.66666666667);close(Sc,.75);close(Sh,155.76726850917933);close(k,.0062306907403671735);
 close(k*1.5*.1,.000934603611055076);
 // Integrate the x^-1/2 profile after x=z^2, avoiding its integrable leading-edge singularity.
 const C=k*Math.sqrt(L)/2,integral=2*C*Math.sqrt(L);close(integral/L,k);
 close(.332*Math.sqrt(Re)*Math.cbrt(Sc)*D/L,k/2);
});
test('simultaneous candidate balances latent heat in a mass basis and the analogy preserves units',()=>{
 const mdot=.010*(.020-.010),latent=mdot*2.4e6,conv=20*(35-23);
 close(mdot,.0001);close(latent,240);close(conv-latent,0);
 close(2e-5/2.5e-5,.80);close(1.2*1000*.010,12);
 const lesson=deep.lessons.find(l=>l.sectionId==='11.7');
 assert.match(lesson.workedExample.limitations,/仮想/);assert.match(lesson.workedExample.limitations,/唯一解/);
});
test('four new transport lectures and 28 questions retain unreviewed status and three skills per section',()=>{
 const ids=['11.4','11.5','11.6','11.7'];
 const added=qs.filter(q=>/^(supp-species-|supp-stationary-|supp-lowrate-|supp-simultaneous-)/.test(q.id));
 assert.equal(added.length,28);
 for(const id of ids){
  const lesson=deep.lessons.find(l=>l.sectionId===id);assert.ok(lesson.blocks.length>=7);assert.ok(lesson.equations.length>=5);
  assert.match(lesson.reviewStatus,/外部学術専門家校閲前/);
  const items=qs.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);
  assert.ok(items.length>=8);assert.equal(new Set(items.map(q=>q.questionKind)).size,3);
 }
 for(const q of added){assert.equal(q.expertReviewed,false);assert.match(q.reviewStatus,/包括的品質監査待ち/);assert.equal(q.distractors.filter(d=>d.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));}
});
