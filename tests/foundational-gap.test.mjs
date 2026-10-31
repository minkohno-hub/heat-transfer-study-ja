import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,questions]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('roadmap wall example closes both surface-temperature paths and the total heat balance',()=>{
 const Rc=.02/(.5*.5),Rh=1/(10*.5),Q=(100-20)/(Rc+Rh);
 close(Rc,.08);close(Rh,.20);close(Q,285.7142857142857);close(100-Q*Rc,20+Q*Rh);close(100-Q*Rc,77.14285714285714);
 close(500-350+50,200);close(.4*(200+150),140);close(60/(.01/(.2*.2)+1/(20*.2)),120);
});
test('independent measurement standard uncertainties and worst-case bounds remain separate',()=>{
 const k=20*.010/(.020*20),relative=Math.hypot(.05,.05,.05,.05);
 close(k,.5);close(relative,.10);close(k*relative,.05);close(4*.05,.20);
 close(Math.hypot(.050,.050),.07071067811865477);close(Math.hypot(.050,.050)/1,Math.SQRT2*.05);
 const l=deep.lessons.find(l=>l.sectionId==='1.5');assert.match(l.workedExample.limitations,/相関/);assert.match(l.workedExample.steps.join(' '),/95%区間とはしない/);
});
test('summary composite wall retains a temperature jump at contact and returns to the external fluid',()=>{
 const R=[.1,.1,.01,.02,.05],Q=40/R.reduce((a,b)=>a+b);let T=40;const path=R.map(r=>(T-=Q*r));
 close(Q,142.85714285714286);close(path[0],25.714285714285715);close(path[1],11.42857142857143);close(path[2],10);close(path[3],7.142857142857143);close(path[4],0);
 close(path[1]-path[2],Q*.01);close(60/2+60/3,50);close(50*.010/.20,2.5);close(.50/.35,1.4285714285714286);
});
test('shape-factor example preserves full geometric similarity and identifies extra groups',()=>{
 const L=.040,k=15,deltaT=80,piQ=2.5,S=piQ*L,Q=k*S*deltaT;
 close(S,.100);close(Q,120);close(k*(2*S)*deltaT,240);close((2*Q)/(4*1)/(Q/1),.5);
 const h=10;close((h/2)*(2*L)/k,h*L/k);
 const gen=1000;close((gen/4)*(2*L)**2/(k*deltaT),gen*L**2/(k*deltaT));
 assert.match(deep.lessons.find(l=>l.sectionId==='4.4').workedExample.limitations,/入力/);
});
test('four independent replacement drafts and 28 questions do not claim recovery or expert approval',()=>{
 const added=questions.filter(q=>q.id.startsWith('supp-roadmap-'));assert.equal(added.length,28);
 for(const id of ['1.4','1.5','2.5','4.4']){
  const l=deep.lessons.find(l=>l.sectionId===id);assert.ok(l.blocks.length>=7);assert.ok(l.equations.length>=5);assert.match(l.reviewStatus,/外部学術専門家校閲前/);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
 for(const q of added){assert.equal(q.expertReviewed,false);assert.match(q.reviewStatus,/包括的品質監査待ち/);assert.equal(q.distractors.filter(r=>r.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));}
});
