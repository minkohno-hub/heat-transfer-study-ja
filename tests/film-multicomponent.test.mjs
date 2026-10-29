import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,questions]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('prescribed normal molar flow conserves each total species flux while diffusion shares vary',()=>{
 const c=40,D=2e-5,delta=.005,v=.002,y0=.20,y1=.05,Pe=v*delta/D;
 const N=c*v*(y0*Math.exp(Pe)-y1)/Math.expm1(Pe),Nt=c*v;
 close(N,.03449792899044159);close(Nt-N,.045502071009558415);close(N-y0*Nt,.018497928990441587);
 const particular=N/(c*v),C=y0-particular;
 for(const z of [0,delta/3,delta]){
  const y=particular+C*Math.exp(v*z/D),dy=C*v/D*Math.exp(v*z/D);
  close(-c*D*dy+c*v*y,N);
  if(z===delta)close(y,y1);
 }
 assert.ok(Math.abs(Nt-N)>0,'this prescribed-flow example cannot also claim stagnant B');
 const PeB=Math.log((1-y1)/(1-y0)),vB=PeB*D/delta;
 close(c*vB*(y0*Math.exp(PeB)-y1)/Math.expm1(PeB),c*vB);
 close(c*D*(y0-y1)/delta,.024);
});
test('thermal film example conserves total sensible flux and the interface latent balance',()=>{
 const h0=100,cp=1000,dT=100,hfg=2e5,B=cp*dT/hfg,Pe=Math.log1p(B),ratio=Pe/Math.expm1(Pe),q=h0*dT*ratio,m=q/hfg;
 close(B,.5);close(Pe,.4054651081081644);close(h0*ratio,81.09302162163287);close(q,8109.302162163288);close(m,.04054651081081644);close(m*cp/h0,Pe);
 // Normalize z by delta, using k/delta=h0. Convective minus conductive sensible flux is constant.
 for(const s of [0,.4,1]){
  const T=dT*Math.expm1(Pe*s)/Math.expm1(Pe),qConduct=h0*dT*Pe*Math.exp(Pe*s)/Math.expm1(Pe);
  close(m*cp*T-qConduct,-q,1e-8);
 }
 close(-.5/Math.expm1(-.5),1.2707470412683992);assert.ok(ratio<1);
 close(1e-7/Math.expm1(1e-7),1,1e-6);
});
test('Wilke example uses asymmetric pair coefficients and mass-weighted heat capacity',()=>{
 const y=[.3,.7],M=[.010,.040],mu=[1e-5,3e-5];
 const phi=(i,j)=>(1+Math.sqrt(mu[i]/mu[j])*(M[j]/M[i])**.25)**2/Math.sqrt(8*(1+M[i]/M[j]));
 close(phi(0,0),1);close(phi(1,1),1);close(phi(0,1),1.0434440561890523);close(phi(1,0),.7825830421417893);
 const meanM=y.reduce((s,x,i)=>s+x*M[i],0),w=y.map((x,i)=>x*M[i]/meanM);
 close(w[0]*1000+w[1]*2000,1903.225806451613);
 const mix=fractions=>fractions.reduce((s,x,i)=>s+x*mu[i]/fractions.reduce((s,x,j)=>s+x*phi(i,j),0),0);
 close(mix(y),2.537676129161804e-5);close(mix([1,0]),mu[0]);close(mix([0,1]),mu[1]);
 assert.match(deep.lessons.find(l=>l.sectionId==='11.10').workedExample.limitations,/熱伝導率やDは未入力/);
});
test('ternary Maxwell-Stefan fluxes satisfy all three original equations and the averaging constraint',()=>{
 const x=[.2,.3,.5],gradient=[-2,1,1],c=40,D=[[0,1e-5,2e-5],[1e-5,0,1.5e-5],[2e-5,1.5e-5,0]];
 // Independently construct the reduced matrix from component-pair terms, rather than copying the printed coefficients.
 const basis=[[1,0,-1],[0,1,-1]],rhs=gradient.map(g=>-g);
 const op=(J,i)=>x.reduce((sum,xj,j)=>i===j?sum:sum+(xj*J[i]-x[i]*J[j])/(c*D[i][j]),0);
 const a=op(basis[0],0),b=op(basis[1],0),c0=op(basis[0],1),d=op(basis[1],1),det=a*d-b*c0;
 close(a,1625);close(b,-250);close(c0,-250);close(d,1833.3333333333333);
 const JA=(rhs[0]*d-b*rhs[1])/det,JB=(a*rhs[1]-c0*rhs[0])/det,J=[JA,JB,-JA-JB];
 close(J[0],.0011714285714285715);close(J[1],-.0003857142857142857);close(J[2],-.0007857142857142859);close(J.reduce((a,b)=>a+b),0);
 for(let i=0;i<3;i++)close(op(J,i),rhs[i]);
});
test('ideal activity and equal-diffusivity limits recover the Fick driving force without changing reference',()=>{
 const x=[.2,.3,.5],gradient=[-2,1,1],RT=8.314462618*300,c=40,D=1e-5;
 const J=gradient.map(g=>-c*D*g);
 close(J[0],.0008);close(J[1],-.0004);close(J[2],-.0004);
 for(let i=0;i<3;i++){
  close(-x[i]*(RT*gradient[i]/x[i])/RT,-gradient[i]);
  const rhs=x.reduce((sum,xj,j)=>i===j?sum:sum+(xj*J[i]-x[i]*J[j])/(c*D),0);
  close(rhs,-gradient[i]);
 }
});
test('the final four chapter-eleven drafts add 28 questions across three skill types without approval claims',()=>{
 const added=questions.filter(q=>/^(supp-film-model-|supp-highrate-|supp-mixture-property-|supp-multicomponent-)/.test(q.id));assert.equal(added.length,28);
 for(const id of ['11.8','11.9','11.10','11.11']){
  const lesson=deep.lessons.find(l=>l.sectionId===id);assert.ok(lesson.blocks.length>=7);assert.ok(lesson.equations.length>=5);assert.match(lesson.reviewStatus,/外部学術専門家校閲前/);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);
  assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
 for(const q of added){assert.equal(q.expertReviewed,false);assert.match(q.reviewStatus,/包括的品質監査待ち/);assert.equal(q.distractors.filter(d=>d.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));}
});
