import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,questions]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('square-duct example distinguishes geometry-specific Nu and Darcy constant from the circular values',()=>{
 const a=.01,A=a*a,P=4*a,D=4*A/P,rho=1000,U=.1,mu=.001,k=.6,Re=rho*U*D/mu;
 const h=2.98*k/D,q=h*20,perLength=q*P,f=56.91/Re,dp=f*(5/D)*rho*U*U/2;
 close(D,.01);close(Re,1000);close(h,178.8);close(q,3576);close(perLength,143.04);close(dp,142.275);
 assert.notEqual(h,3.66*k/D);assert.match(deep.lessons.find(l=>l.sectionId==='7.5').workedExample.limitations,/局所/);
});
test('single-cylinder crossflow uses external diameter, full lateral heat area and the complete average correlation',()=>{
 const U=5,D=.02,L=.5,nu=1.5e-5,Pr=.7,k=.026,Re=U*D/nu;
 const base=.62*Math.sqrt(Re)*Math.cbrt(Pr)/(1+(.4/Pr)**(2/3))**.25;
 const correction=(1+(Re/282000)**(5/8))**(4/5),Nu=.3+base*correction,h=Nu*k/D,area=Math.PI*D*L;
 close(Re,6666.666666666667);close(Nu,42.739169553445365);close(h,55.560920419478975);close(area,.031415926535897934);close(h*area*40,69.81991176660891);
 assert.ok(Re*Pr>.2);assert.ok(area>D*L);
});
test('correlation comparison separates observational uncertainty from residuals and conditional sensitivities',()=>{
 const obs=100/(.20*25),rel=Math.hypot(.02,.01,.03),unc=obs*rel;
 close(obs,20);close(rel,.03741657386773941);close(unc,.7483314773547883);close((18-obs)/obs,-.10);close((24-obs)/obs,.20);close(.8*.05,.04);
 assert.match(deep.lessons.find(l=>l.sectionId==='7.7').workedExample.limitations,/95%区間/);
 assert.match(deep.lessons.find(l=>l.sectionId==='7.7').workedExample.steps.join(' '),/全流況範囲で優れること/);
});
test('three geometry and correlation drafts add twenty section-specific questions with pending scientific review',()=>{
 const expected={'7.5':6,'7.6':7,'7.7':7},added=questions.filter(q=>q.id.startsWith('supp-geometry-correlation-'));assert.equal(added.length,20);
 for(const [id,count] of Object.entries(expected)){
  const l=deep.lessons.find(l=>l.sectionId===id);assert.ok(l.blocks.length>=7);assert.ok(l.equations.length>=5);assert.match(l.reviewStatus,/外部学術専門家校閲前/);
  assert.equal(added.filter(q=>q.source.focusSectionId===id).length,count);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
 for(const q of added){assert.equal(q.expertReviewed,false);assert.match(q.reviewStatus,/包括的品質監査待ち/);assert.equal(q.distractors.filter(r=>r.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));}
});
