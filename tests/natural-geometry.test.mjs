import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,bank]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const lesson=deep.lessons.find(l=>l.sectionId==='8.4'),get=key=>bank.find(q=>q.id==='supp-natural-geometry-'+key+'-v1');
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
const unique=(key,value)=>{const q=get(key);assert.deepEqual(q.choices.flatMap((s,i)=>Math.abs(parseFloat(s)-value)<.005*value?[i]:[]),[q.answer]);};

test('horizontal cylinder comparison uses a diameter-based Rayleigh number and side area with signed heat',()=>{
 const g=9.81,beta=1/305,difference=10,D=.04,nu=1.6e-5,alpha=2e-5,k=.028;
 const Gr=g*beta*difference*D**3/nu**2,Pr=nu/alpha,Ra=Gr*Pr;
 close(Ra,64327.86885245901);assert.ok(Ra>=1e-6&&Ra<=1e9);
 const Nu=.36+.518*Math.sqrt(Math.sqrt(Ra))/(1+(.559/Pr)**(9/16))**(4/9),h=Nu*k/D;
 close(Nu,6.685850562633232);close(h,4.680095393843263);unique('cylinder-coefficient',h);
 close(h*Math.PI*D*.2*difference,1.176236264591794);
 assert.ok(h*Math.PI*D*.2*(-difference)<0);
 const q=get('cylinder-coefficient'),errors=[h,Nu,2*h,(Nu-.36)*k/D];
 q.choices.forEach((s,i)=>assert.ok(Math.abs(parseFloat(s)-errors[i])<.005*errors[i]));
});

test('sphere conduction limit follows radial conservation, while the chosen gas correlation matches its own range',()=>{
 const k=.028,R=.02,difference=10;
 const temperature=r=>300+difference*R/r,flux=r=>k*difference*R/r**2;
 close(temperature(R),310);assert.ok(temperature(10*R)<310);
 const heat=r=>4*Math.PI*r*r*flux(r);
 for(const radius of [R,2*R,5*R])close(heat(radius),4*Math.PI*k*R*difference);
 const h=heat(R)/(4*Math.PI*R*R*difference);close(h*(2*R)/k,2);unique('sphere-conduction',2);
 const Ra=64327.86885245901;assert.ok(Ra<1e5);
 const Nu=2+.43*Ra**.25;close(Nu,8.848070875383208);
 close(Nu*k/(2*R)*Math.PI*(2*R)**2*difference,.31132678595811186);
 assert.ok(lesson.blocks.some(b=>b.text.includes('球と同じ定常伝導の極限を作れない')));
});

test('unstable square plate uses A over perimeter and the natural logarithm thick-layer correction',()=>{
 const side=.1,A=side*side,P=4*side,L=A/P;close(L,.025);unique('plate-length',L);
 const Ra=9.81/305*10*L**3/(1.6e-5*2e-5),Pr=.8;
 const raw=.56*Ra**.25/(1+(.492/Pr)**(9/16))**(4/9);
 assert.ok(Ra>1&&Ra<1e7&&raw<10);close(Ra,15705.046106557378);close(raw,4.875271412986546);
 const corrected=1.4/Math.log1p(1.4/raw),h=corrected*.028/L;
 close(corrected,5.545851200886516);close(h*A*10,.6211353344992898);
 const five=1.4/Math.log1p(1.4/5);close(five,5.671228866695622);unique('thick-layer',five);
 const q=get('thick-layer'),naturalLog=Math.log1p(1.4/5),errors=[five,5,1.4*naturalLog,1.4/Math.log10(1.28)],n=q.answer,rotated=errors.slice(-n).concat(errors.slice(0,-n));
 q.choices.forEach((s,i)=>assert.ok(Math.abs(parseFloat(s)-rotated[i])<.005*rotated[i]));
});

test('stable two-dimensional width and high-Rayleigh length scaling remain separate from other shape definitions',()=>{
 const Nu=.58*(1e7)**.2,h=Nu*.03/.1;close(Nu,14.568941302755567);unique('stable-plate',h);
 const pr=.8,C=.14*(1+.0107*pr)/(1+.01*pr),k=.028,Ra1=1e8;
 const h1=C*Math.cbrt(Ra1)*k/.1,h2=C*Math.cbrt(Ra1*8)*k/.2;
 close(h1,h2);unique('high-ra-length',h2/h1);
 const star=L=>9.81*(1/305)*100*L**4/(.028*1.6e-5*2e-5);
 unique('modified-ra-length',star(.2)/star(.1));
 const range=get('cylinder-range');assert.match(range.choices[range.answer],/範囲外/);
 assert.ok(lesson.equations.some(e=>e.meaning.includes('Raにgを使用')));
});

test('normalized wall-temperature distribution has an integral mean distinct from its midpoint and endpoint',()=>{
 const end=12;
 // s=u^5 converts the fractional-power profile to a polynomial, integrated by 3-point Gauss quadrature.
 const nodes=[-Math.sqrt(3/5),0,Math.sqrt(3/5)],weights=[5/9,8/9,5/9];
 const integral=nodes.reduce((sum,node,i)=>{const u=(node+1)/2;return sum+weights[i]*5*u**5/2;},0);
 close(integral,5/6);unique('temperature-average',end*integral);
 const midpoint=end*2**(-.2),average=end*integral;
 close(midpoint,10.44660675955349);assert.ok(midpoint>average);close((midpoint-average)/average,.044660675955349,1e-9);
 assert.ok(lesson.blocks.some(b=>b.text.includes('約4.5%高い')));
});

test('nine geometry questions retain correct fields, source links, three skills and internal-only review',()=>{
 const items=bank.filter(q=>q.id.startsWith('supp-natural-geometry-'));
 assert.equal(items.length,9);assert.equal(new Set(items.map(q=>q.questionKind)).size,3);
 assert.deepEqual(items.map(q=>q.answer),[0,1,2,3,0,1,2,3,0]);
 for(const q of items){
  assert.equal(q.field,'対流');assert.equal(q.source.chapterId,'ch8');assert.equal(q.source.focusSectionId,'8.4');
  assert.equal(q.source.guideId,'chapter8-buoyancy');assert.equal(q.revision,'v1');assert.equal(q.expertReviewed,false);
  assert.equal(q.distractors.filter(s=>s.startsWith('正解。')).length,1);assert.ok(q.distractors[q.answer].startsWith('正解。'));
  assert.equal(q.solutionSteps.length,4);assert.match(q.reviewStatus,/外部専門家校閲前/);
 }
});
