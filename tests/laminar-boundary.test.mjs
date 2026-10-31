import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,questions]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('independent shooting of Blasius ODE recovers the wall gradient underlying the printed friction approximation',()=>{
 const shoot=s=>{
  let y=[0,0,s],h=.005;
  const f=([a,b,c])=>[b,c,-.5*a*c],plus=(y,k,m)=>y.map((v,i)=>v+m*k[i]);
  for(let j=0;j<2000;j++){
   const k1=f(y),k2=f(plus(y,k1,h/2)),k3=f(plus(y,k2,h/2)),k4=f(plus(y,k3,h));
   y=y.map((v,i)=>v+h/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]));
  }
  return y[1];
 };
 let low=.30,high=.36;
 for(let i=0;i<36;i++){const middle=(low+high)/2;if(shoot(middle)>1)high=middle;else low=middle;}
 const wall=(low+high)/2;
 close(wall,.3320573362,1e-8);close(2*wall,.664,2e-4);close(shoot(wall),1,1e-10);
});
test('boundary-layer example keeps endpoint shear separate from area-average drag',()=>{
 const U=2,L=.5,nu=1.5e-5,rho=1.2,W=.2,Re=U*L/nu,Cf=.664/Math.sqrt(Re),dyn=rho*U*U/2;
 close(Re,66666.66666666667);close(5*L/Math.sqrt(Re),.00968245836551854);close(Cf,.0025716609418817244);close(dyn*Cf,.006171986260516138);close(dyn*2*Cf*W*L,.0012343972521032278);
 assert.ok(dyn*Cf*W*L<dyn*2*Cf*W*L);
});
test('energy example conserves the input enthalpy integral and resolves the wall-gradient sign',()=>{
 const perWidth=1.2*1000*.040,Q=perWidth*.20,A=.20*.50;
 close(perWidth,48);close(Q,9.6);close(Q/A,96);close(Q/(A*(80-20)),1.6);
 close(-.025*(-4000),100);close(100/50,2);close(100**2/(1000*10),1);
 assert.match(deep.lessons.find(l=>l.sectionId==='6.3').workedExample.answer,/局所係数はこの情報だけでは未定/);
});
test('Prandtl example distinguishes conditional plate scales and exact dimensionless property definitions',()=>{
 const nu=8e-6,alpha=1e-6,Pr=nu/alpha,Re=1*.4/nu,delta=5*.4/Math.sqrt(Re);
 close(Pr,8);close(Re,50000);close(delta,.00894427190999916);close(Pr**(-1/3),.5);close(delta*.5,.00447213595499958);
 assert.notEqual(Pr**(-1/3),Pr**(-1/2));
 assert.match(deep.lessons.find(l=>l.sectionId==='6.4').workedExample.limitations,/概略尺度/);
});
test('laminar isothermal plate correlation predicts average h and heat with a distinct local endpoint',()=>{
 const Re=3*.30/1.5e-5,Pr=.70,k=.026,L=.30,W=.20,dt=40;
 const Nu=.664*Math.sqrt(Re)*Math.cbrt(Pr),h=Nu*k/L,local=.332*Math.sqrt(Re)*Math.cbrt(Pr)*k/L,Q=h*W*L*dt;
 close(Re,60000);close(Nu,144.41413985768392);close(h,12.515892120999274);close(local,h/2);close(Q,30.03814109039826);
 const C=local*Math.sqrt(L);close(2*C*Math.sqrt(L)*W*dt,Q);
});
test('four new laminar lecture drafts and 26 questions cover each section with three kinds and pending review',()=>{
 const expected={'6.2':7,'6.3':7,'6.4':6,'6.5':6},added=questions.filter(q=>q.id.startsWith('supp-laminar-'));assert.equal(added.length,26);
 for(const [id,count] of Object.entries(expected)){
  const l=deep.lessons.find(l=>l.sectionId===id);assert.ok(l.blocks.length>=7);assert.ok(l.equations.length>=5);assert.match(l.reviewStatus,/外部学術専門家校閲前/);
  assert.equal(added.filter(q=>q.source.focusSectionId===id).length,count);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
 for(const q of added){assert.equal(q.expertReviewed,false);assert.match(q.reviewStatus,/包括的品質監査待ち/);assert.equal(q.distractors.filter(r=>r.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));}
});
