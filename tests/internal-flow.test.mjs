import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,questions]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('duct introduction uses flow area, wetted perimeter and mean velocity without inventing fully developed heat transfer',()=>{
 const a=.020,b=.010,A=a*b,P=2*(a+b),Dh=4*A/P,rho=1.2,U=2,mu=1.8e-5;
 close(A,.0002);close(P,.060);close(Dh,.013333333333333334);close(rho*U*A,.00048);close(rho*U*Dh/mu,1777.7777777777778);close(.50/Dh,37.5);
 assert.match(deep.lessons.find(l=>l.sectionId==='7.1').workedExample.answer,/転用は未承認/);
 close(.05*1000,50);close(.05*1000*10,500);
});
test('smooth turbulent pipe example uses consistent Darcy friction in heat, pressure and fluid power',()=>{
 const rho=1000,mu=.001,cp=4200,k=.6,D=.020,L=1,U=5,Re=rho*U*D/mu,Pr=mu*cp/k;
 const f=(.79*Math.log(Re)-1.64)**-2;
 const Nu=(f/8)*(Re-1000)*Pr/(1+12.7*Math.sqrt(f/8)*(Pr**(2/3)-1)),h=Nu*k/D;
 const dp=f*L/D*rho*U*U/2,flow=U*Math.PI*D*D/4;
 close(Re,1e5);close(Pr,7);close(f,.017992027544212322);close(Nu,599.066226153163);close(h,17971.98678459489,1e-8);close(dp,11245.0172151327,1e-8);close(dp*flow,17.663631736275825);
 close(.023*Re**.8*Pr**(1/3),439.9741720376497);close(.0243*Re**.8*Pr**.4,529.2312611493159);close(.0225*Re**.8*Pr**.4,490.0289455086258);close(10000*.002/.5,40);
});
test('constant-wall-temperature surface model closes fluid and LMTD heat balances',()=>{
 const m=.10,cp=1000,C=m*cp,h=50,P=.20,L=10,As=P*L,Ts=80,Tin=20,NTU=h*As/C;
 const Tout=Ts-(Ts-Tin)*Math.exp(-NTU),Q=C*(Tout-Tin),delta1=Ts-Tin,delta2=Ts-Tout,lm=(delta1-delta2)/Math.log(delta1/delta2);
 close(NTU,1);close(Tout,57.92723352971346);close(Q,3792.723352971346,1e-8);close(lm,37.92723352971346);close(h*As*lm,Q,1e-8);
 assert.ok(Tin<Tout&&Tout<Ts);assert.ok(Q<h*As*(Ts-Tin));
});
test('variable-h and uniform-flux surface models obey distinct differential balances',()=>{
 const Ts=80,Tin=20,C=100,h0=50,P=.2,L=10,x=4;
 const integral=h0*(x+x*x/(2*L)),T=Ts-(Ts-Tin)*Math.exp(-P*integral/C),h=h0*(1+x/L),dT=(Ts-T)*P*h/C;
 close(C*dT,h*P*(Ts-T));
 const flux=1000,Tx=Tin+flux*P*x/C;
 close(Tx,28);close(C*(Tx-Tin),flux*P*x);
 assert.match(deep.lessons.find(l=>l.sectionId==='7.4').workedExample.limitations,/一定壁温/);
});
test('three internal-flow drafts and 21 questions maintain each section at eight questions and three skills',()=>{
 const added=questions.filter(q=>q.id.startsWith('supp-internal-flow-'));assert.equal(added.length,21);
 for(const id of ['7.1','7.3','7.4']){
  const l=deep.lessons.find(l=>l.sectionId===id);assert.ok(l.blocks.length>=7);assert.ok(l.equations.length>=5);assert.match(l.reviewStatus,/外部学術専門家校閲前/);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
 for(const q of added){assert.equal(q.expertReviewed,false);assert.match(q.reviewStatus,/包括的品質監査待ち/);assert.equal(q.distractors.filter(r=>r.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));}
});
