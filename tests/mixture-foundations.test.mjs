import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url)));
const [deep,questions]=await Promise.all(['data/original-deep-lessons.json','data/questions.json'].map(read));
const close=(x,y)=>assert.ok(Math.abs(x-y)<1e-10,`${x} != ${y}`);
test('mass transfer introduction converts gradient, molar flux, area and species mass consistently',()=>{
 const c=50,D=2e-5,L=.010,gradient=(.10-.30)/L;
 const J=-c*D*gradient,rate=J*.020,mass=rate*.020;
 close(J,.020);close(rate,.00040);close(mass,8e-6);close(L*L/D,5);
 const lesson=deep.lessons.find(l=>l.sectionId==='11.1');
 assert.match(lesson.workedExample.answer,/8.0×10⁻⁶ kg\/s/);
 assert.match(lesson.workedExample.limitations,/等モル逆拡散/);
 close(.050*.20,.010);close(.010*.030,.00030);close(.002**2/1e-9,4000);
});
test('mixture example separates mole and mass averages, whole fluxes and relative fluxes',()=>{
 const y=[.4,.6],M=[.020,.040],c=50,vel=[2,1];
 const meanM=y.reduce((sum,v,i)=>sum+v*M[i],0),w=y.map((v,i)=>v*M[i]/meanM);
 const ci=y.map(v=>v*c),rhoi=ci.map((v,i)=>v*M[i]),rho=rhoi.reduce((a,b)=>a+b);
 const N=ci.map((v,i)=>v*vel[i]),Nt=N.reduce((a,b)=>a+b),vm=Nt/c;
 const mass=N.map((v,i)=>v*M[i]),mt=mass.reduce((a,b)=>a+b),v=mt/rho;
 const J=ci.map((ci,i)=>ci*(vel[i]-vm)),j=rhoi.map((ri,i)=>ri*(vel[i]-v));
 close(meanM,.032);close(w[0],.25);close(rho,1.6);close(vm,1.4);close(v,1.25);
 close(J[0],12);close(J[1],-12);close(j[0],.3);close(j[1],-.3);
 close(J[0]+J[1],0);close(j[0]+j[1],0);close(M[0]*J[0],.24);
 assert.notEqual(M[0]*J[0],j[0]);
 const lesson=deep.lessons.find(l=>l.sectionId==='11.2');
 assert.match(lesson.workedExample.answer,/v_m=1.40/);assert.match(lesson.workedExample.answer,/v=1.25/);
});
test('relative diffusion survives a constant observer shift while fixed-surface flux changes',()=>{
 const ci=[20,30],y=[.4,.6];
 const relative=shift=>{const N=[ci[0]*(2-shift),ci[1]*(1-shift)],Nt=N[0]+N[1];return {N,J:N.map((n,i)=>n-y[i]*Nt)};};
 const a=relative(0),b=relative(.5);
 close(a.N[0],40);close(b.N[0],30);close(a.J[0],b.J[0]);close(b.J[0],12);
 const q=questions.find(q=>q.id==='supp-mixture-moving-observer-v1');
 assert.equal(q.choices[q.answer],'N_A=30、J_A=12 mol/(m²·s)');
});
test('two new lecture drafts and fourteen questions preserve three skills and explicitly unreviewed status',()=>{
 const added=questions.filter(q=>q.id.startsWith('supp-mass-intro-')||q.id.startsWith('supp-mixture-'));
 assert.equal(added.length,14);
 for(const q of added){
  assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);
  assert.equal(q.distractors.length,4);assert.equal(q.distractors.filter(r=>r.startsWith('正解。')).length,1);
  assert.ok(q.distractors[q.answer].startsWith('正解。'));assert.equal(q.expertReviewed,false);
  assert.match(q.reviewStatus,/包括的品質監査待ち/);
 }
 for(const id of ['11.1','11.2']){
  const l=deep.lessons.find(l=>l.sectionId===id);assert.ok(l);
  assert.match(l.reviewStatus,/外部学術専門家校閲前/);assert.ok(l.equations.length>=5);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);
  assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
});
