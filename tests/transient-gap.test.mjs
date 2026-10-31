import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,questions]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('transient introduction uses consistent diffusion and convection scales for a two-sided slab',()=>{
 const a=.010,k=1,capacity=1e6,h=5,alpha=k/capacity,t=200;
 const td=a*a/alpha,tau=capacity*a/h,Bi=h*a/k,Fo=alpha*t/(a*a);
 close(alpha,1e-6);close(td,100);close(tau,2000);close(Bi,.05);close(Fo,2);close(td/tau,Bi);close(Bi*Fo,t/tau);close(20+80*Math.exp(-t/tau),92.38699344287676);
 close(10*(.030/3)/5,.020);
});
test('slab eigenvalues and one-term center local and mean values satisfy the same convection boundary',()=>{
 const l=.86033358901938,l2=3.425618459481728,A=l=>4*Math.sin(l)/(2*l+Math.sin(2*l)),Fo=.5;
 close(l*Math.tan(l),1);close(l2*Math.tan(l2),1);close(A(l),1.1191320084054337);
 const center=A(l)*Math.exp(-l*l*Fo),local=center*Math.cos(l/2),mean=center*Math.sin(l)/l;
 close(center,.77295569333278);close(local,.7025364965121703);close(mean,.6810694470351022);
 close(20+80*center,81.8364554666224);close(20+80*local,76.20291972097362);close(20+80*mean,74.48555576280818);
 // -dTheta/dxi at xi=1 equals Bi*Theta_s for Bi=1.
 close(center*l*Math.sin(l),center*Math.cos(l));
 close(Math.abs(A(l2)/A(l))*Math.exp(-(l2*l2-l*l)*Fo),.0005554134078417514);
 assert.ok(A(l)>1,'the single term must not be misrepresented as the complete initial condition');
});
test('response-chart examples recover temperatures and energy from the stated normalization and axis',()=>{
 close(20+80*.773,81.84);close(.80*.90,.72);close(1-.68,.32);close(Math.sqrt(.10*1),.31622776601683794);
 const lesson=deep.lessons.find(l=>l.sectionId==='5.4');assert.match(lesson.workedExample.limitations,/一項近似/);assert.match(lesson.workedExample.steps.join(' '),/中心温度を平均へ流用しない/);
});
test('square steady conduction interior series converges to the symmetry result and unequal-grid weights differ',()=>{
 const theta=N=>{let sum=0;for(let n=1;n<=N;n+=2)sum+=4/(n*Math.PI)*Math.sin(n*Math.PI/2)/(2*Math.cosh(n*Math.PI/2));return sum;};
 close(theta(1),.25371641666082456);close(theta(3),.2499040971898446);close(theta(5),.25000295230907343);close(theta(19),.25,1e-12);
 close(20+80*.25,40);close(((100+20)/4+(20+20))/(2/4+2),28);
 assert.match(deep.lessons.find(l=>l.sectionId==='5.7').workedExample.limitations,/全熱流を実設計値として評価しない/);
});
test('two-direction one-term product separates center and volume-average energy',()=>{
 const l=.86033358901938,A=4*Math.sin(l)/(2*l+Math.sin(2*l)),center=A*Math.exp(-l*l*.5),mean=center*Math.sin(l)/l;
 close(center*center,.5974605038555587);close(20+80*center*center,67.7968403084447);close(mean*mean,.46385559168469986);close(1-mean*mean,.5361444083153002);
 assert.ok(1-mean*mean<2*(1-mean),'adding individual released fractions double-counts cooling');
 close(20+80*.80*.70,64.8);close(1-.8*.7,.44);close(1/(2**2),.25);
 const lesson=deep.lessons.find(l=>l.sectionId==='5.8');assert.match(lesson.workedExample.limitations,/共通一定周囲/);assert.match(lesson.workedExample.limitations,/一項/);
});
test('five transient lecture drafts and thirty-four questions retain references and unreviewed status',()=>{
 const expected={'5.1':6,'5.4':7,'5.5':7,'5.7':7,'5.8':7};const added=questions.filter(q=>q.id.startsWith('supp-transient-gap-'));assert.equal(added.length,34);
 for(const [id,count] of Object.entries(expected)){
  const l=deep.lessons.find(l=>l.sectionId===id);assert.ok(l.blocks.length>=7);assert.ok(l.equations.length>=5);assert.match(l.reviewStatus,/外部学術専門家校閲前/);
  assert.equal(added.filter(q=>q.source.focusSectionId===id).length,count);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
 for(const q of added){assert.equal(q.expertReviewed,false);assert.match(q.reviewStatus,/包括的品質監査待ち/);assert.equal(q.distractors.filter(r=>r.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));}
});
