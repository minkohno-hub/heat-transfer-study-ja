import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)));
const [deep,questions,book,notes]=await Promise.all(['original-deep-lessons','questions','book','original-notes'].map(read));
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('Reynolds-Colburn naming correction agrees between original-title mapping and independent lesson',()=>{
 const s=book.chapters.flatMap(c=>c.sections).find(s=>s.id==='6.6');assert.match(s.sourceTitle,/Reynolds/);assert.equal(s.title,'レイノルズ・コルバーンの類推');
 assert.equal(notes.notes.find(s=>s.sectionId==='6.6').title,s.title);assert.ok(deep.lessons.find(l=>l.sectionId==='6.6').title.startsWith(s.title));
});
test('Colburn conversion and definition identities preserve Pr correction, factor two and dimensions',()=>{
 const rho=1.2,cp=1000,U=5,Cf=.004,Pr=.70,St=Cf/2*Pr**(-2/3),h=rho*cp*U*St;
 close(St,.0025368685764074305);close(h,15.221211458444584);close(h*50,761.0605729222292);close(h/(rho*cp*U)*Pr**(2/3),Cf/2);
 close(12/(rho*cp*U),.002);close(100/(10000*.5),.020);
 const Re=60000,Nu=.332*Math.sqrt(Re)*Pr**(1/3),cf=.664/Math.sqrt(Re);
 close(Nu/(Re*Pr)*Pr**(2/3),cf/2);
});
test('turbulent wall units use measured stress and separate viscous and assumed log regions',()=>{
 const tau=.12,rho=1.2,nu=1.5e-5,ut=Math.sqrt(tau/rho),yp=y=>y*ut/nu;
 close(ut,.31622776601683794);close(yp(.00010),2.1081851067789197);close(yp(.00010)*ut,.6666666666666667);
 close(yp(.005),105.40925533894598);close((Math.log(yp(.005))/.41+5)*ut,5.173679416154406);
 close(8.5e-4/1e-3,.85);
 assert.match(deep.lessons.find(l=>l.sectionId==='6.7').workedExample.limitations,/対数域の存在/);
});
test('fully turbulent plate power law has a five-fourths average rather than the laminar factor two',()=>{
 const L=1,U=10,nu=1.5e-5,Pr=.7,k=.026,W=.20,dt=40,Re=U*L/nu;
 const Nu=.037*Re**.8*Pr**(1/3),h=Nu*k/L,local=.0296*Re**.8*Pr**(1/3)*k/L;
 close(Nu,1498.6310627590174);close(h,38.96440763173445);close(h/local,1.25);close(h*W*L*dt,311.7152610538756);
 close((5/4)*local, h);close(1.25*32,40);
});
test('transition correction matches independent numerical integration of laminar and turbulent local heat laws',()=>{
 const U=15,L=1,nu=1.5e-5,Rec=5e5,Pr=.7,k=.026,Re=U*L/nu,xc=Rec*nu/U;
 const C=.037*Rec**.8-.664*Math.sqrt(Rec),Nu=(.037*Re**.8-C)*Pr**(1/3);
 close(xc,.50);close(C,871.3234750958699);close(Nu,1299.1977386936471);close(Nu*k*.20*40,270.2331296482786);
 const simpson=(f,a,b,n=1000)=>{const h=(b-a)/n;let s=f(a)+f(b);for(let i=1;i<n;i++)s+=(i%2?4:2)*f(a+i*h);return s*h/3;};
 // x=s^2 removes the laminar leading-edge singularity; the transformed integrand is constant.
 const lamIntegral=simpson(()=>2*.332*k*Math.sqrt(U/nu)*Pr**(1/3),0,Math.sqrt(xc));
 const turbIntegral=simpson(x=>.0296*k*(U/nu)**.8*x**(-.2)*Pr**(1/3),xc,L);
 close((lamIntegral+turbIntegral)/k,Nu,1e-7);
 const atTransition=(.037*Rec**.8-C)*Pr**(1/3);close(atTransition,.664*Math.sqrt(Rec)*Pr**(1/3));
 assert.ok(Nu<.037*Re**.8*Pr**(1/3));
});
test('four analogy and turbulence drafts add 28 pending questions with three skills in every section',()=>{
 const added=questions.filter(q=>q.id.startsWith('supp-turbulence-'));assert.equal(added.length,28);
 for(const id of ['6.6','6.7','6.8','6.9']){
  const l=deep.lessons.find(l=>l.sectionId===id);assert.ok(l.blocks.length>=7);assert.ok(l.equations.length>=5);assert.match(l.reviewStatus,/外部学術専門家校閲前/);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
 for(const q of added){assert.equal(q.expertReviewed,false);assert.match(q.reviewStatus,/包括的品質監査待ち/);assert.equal(q.distractors.filter(r=>r.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));}
});
