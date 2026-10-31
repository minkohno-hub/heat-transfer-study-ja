import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,questions,book]=await Promise.all(['original-deep-lessons','questions','book'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('buoyancy example uses absolute reference temperature and consistent Gr Ra Ri definitions',()=>{
 const beta=1/303.15,nu=1.6e-5,alpha=2.2e-5,g=9.81,L=.5,dT=20,U=2,Pr=nu/alpha,Gr=g*beta*dT*L**3/nu**2,Ra=Gr*Pr,Re=U*L/nu,Ri=Gr/Re**2;
 close(beta,.003298697014679202);close(Pr,.7272727272727273);close(Gr,316017751.1133103,1e-6);close(Ra,229831091.71877113,1e-6);close(beta*dT,.06597394029358404);close(Ri,.08090054428500743);close(Ri,g*beta*dT*L/U**2);
 assert.match(deep.lessons.find(l=>l.sectionId==='8.1').workedExample.limitations,/h/);
});
test('condensate-film velocity profile satisfies the shear-free interface and integrates to the liquid flow',()=>{
 const rho=1000,rhov=1,mu=.001,k=.60,hfg=2e6,g=9.81,dT=10,x=.20;
 const delta=(4*mu*k*dT*x/(rho*(rho-rhov)*g*hfg))**.25;
 const speed=y=>(rho-rhov)*g/mu*(delta*y-y*y/2),Gamma=rho*delta/6*(speed(0)+4*speed(delta/2)+speed(delta));
 close(delta,.00012509621988430298);close(speed(0),0);close((rho-rhov)*g/mu*(delta-delta),0);
 close(Gamma,.006395077331192675);close(Gamma,rho*(rho-rhov)*g*delta**3/(3*mu));close(4*Gamma/mu,25.5803093247707);
});
test('condensate mass addition closes both local latent balance and integrated wall conduction',()=>{
 const rho=1000,rhov=1,mu=.001,k=.60,hfg=2e6,g=9.81,dT=10,L=.20,W=.10;
 const delta=x=>(4*mu*k*dT*x/(rho*(rho-rhov)*g*hfg))**.25;
 const flow=x=>rho*(rho-rhov)*g*delta(x)**3/(3*mu),Gamma=flow(L),local=k/delta(L),average=4*local/3;
 close(local,4796.307998394504);close(average,6395.077331192671);close(average*W*L*dT,W*Gamma*hfg,1e-8);
 close(W*Gamma*hfg,1279.015466238535,1e-8);
 const eps=1e-6,dGamma=(flow(L+eps)-flow(L-eps))/(2*eps);
 close(dGamma*hfg,k*dT/delta(L),1e-5);
 // x=s^4 removes the leading-edge x^-1/4 heat-flux singularity; Simpson is exact for the resulting s^2.
 const C=delta(1),smax=L**.25,transformed=s=>4*k*dT/C*s*s;
 const integrated=smax/6*(transformed(0)+4*transformed(smax/2)+transformed(smax));
 close(integrated*W,W*Gamma*hfg,1e-8);
});
test('vertical free-convection calculation returns a mean coefficient and retains the final heat-flow sign',()=>{
 const g=9.81,beta=1/303.15,dT=20,L=.5,nu=1.6e-5,alpha=2.2e-5,k=.0267,Pr=nu/alpha,Ra=g*beta*dT*L**3/(nu*alpha);
 const Nu=.68+.670*Ra**.25/(1+(.492/Pr)**(9/16))**(4/9),h=Nu*k/L,Q=h*.10*dT;
 close(Nu,64.16757007082334);close(h,3.426548241781967);close(Q,6.8530964835639345);close(h*.10*(-dT),-Q);
 assert.match(deep.lessons.find(l=>l.sectionId==='8.3').workedExample.limitations,/放射/);
});
test('all 76 detailed drafts exist and the final twenty questions remain pending rather than falsely approved',()=>{
 const added=questions.filter(q=>q.id.startsWith('supp-buoyancy-film-'));assert.equal(added.length,20);
 assert.deepEqual(new Set(deep.lessons.map(l=>l.sectionId)),new Set(book.chapters.flatMap(c=>c.sections.map(s=>s.id))));
 for(const id of ['8.1','8.2','8.3']){
  const l=deep.lessons.find(l=>l.sectionId===id);assert.ok(l.blocks.length>=7);assert.ok(l.equations.length>=5);assert.match(l.reviewStatus,/外部学術専門家校閲前/);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
 for(const q of added){assert.equal(q.expertReviewed,false);assert.match(q.reviewStatus,/包括的品質監査待ち/);assert.equal(q.distractors.filter(r=>r.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));}
});
