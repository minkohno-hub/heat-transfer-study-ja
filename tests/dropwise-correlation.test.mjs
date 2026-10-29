import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,bank]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const lesson=deep.lessons.find(l=>l.sectionId==='9.10'),get=key=>bank.find(q=>q.id==='supp-dropwise-correlation-'+key+'-v1');
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
const flux=(steamC,difference)=>1000*steamC**.8*(5*difference+.3*difference*difference);
const number=s=>{
 const match=s.match(/\d+(?:\.\d+)?(?:×10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)?/u);assert.ok(match,s);
 const [base,power]=match[0].split('×10'),digits={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
 return Number(base)*(power?10**Number([...power].map(x=>digits[x]).join('')):1);
};

test('the empirical steam correlation preserves the specified Celsius scale and kW to W conversion',()=>{
 const q=flux(60,4);close(q,656103.9934289602);assert.equal(flux(60,0),0);
 assert.ok(flux(60+273.15,4)>q,'absolute-temperature substitution changes the fitted correlation');
 const item=get('heat-flux');
 assert.deepEqual(item.choices.flatMap((s,i)=>Math.abs(number(s)-q)<.005*q?[i]:[]),[item.answer]);
 const errors=[q,q/1000,1000*60**.8*5*4,q/4];
 item.choices.forEach((s,i)=>assert.ok(Math.abs(number(s)-errors[i])<.005*errors[i]));
 const scale=get('temperature-scale');assert.equal(scale.choices[scale.answer],'t_C=60.00、θ=4.000');
});

test('effective ratio and differential slope differ and each numerical distractor corresponds to the claimed confusion',()=>{
 const q=flux(60,4),effective=q/4,step=1e-4;
 const derivative=(flux(60,4+step)-flux(60,4-step))/(2*step);
 close(effective,164025.99835724005);close(derivative,195772.965781222,1e-8);assert.ok(derivative>effective);
 const item=get('effective-coefficient');
 assert.deepEqual(item.choices.flatMap((s,i)=>Math.abs(number(s)-effective)<.005*effective?[i]:[]),[item.answer]);
 const values=[effective,derivative,q,1000*60**.8*5],n=item.answer,rotated=values.slice(-n).concat(values.slice(0,-n));
 item.choices.forEach((s,i)=>assert.ok(Math.abs(number(s)-rotated[i])<.005*rotated[i]));
});

test('coating and nonlinear condensation close the same flux with a surface warmer than its substrate',()=>{
 const total=4,R=2e-6;
 // Solve by bisection; the independently derived quadratic root must agree.
 let lo=0,hi=total;
 for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(mid+R*flux(60,mid)>total)hi=mid;else lo=mid;}
 const theta=(lo+hi)/2,q=flux(60,theta),a=R*1000*60**.8*.3,b=1+R*1000*60**.8*5;
 const stableRoot=2*total/(b+Math.hypot(b,Math.sqrt(4*a*total)));
 close(theta,stableRoot);close(theta,3.0466465437549504);close(q,476676.7281225249);
 close(theta+R*q,total);assert.ok(theta>0&&theta<total);assert.ok(60-theta>56);
 assert.ok(q<flux(60,total));assert.ok(theta<8);
 assert.notEqual(theta-R*q,total);assert.ok(Math.abs(theta+R*flux(60,total)-total)>.1);
 const item=get('coating-balance');assert.equal(item.choices[item.answer],'θ+(2.00×10⁻⁶)q″(θ)=4.00');
 assert.match(lesson.workedExample.answer,/56.953 ℃/);
});

test('pure steam empirical scope cannot certify mixed gas, arbitrary geometry or long-term wetting',()=>{
 const gas=get('noncondensable-gas');assert.match(gas.choices[gas.answer],/蒸気分圧と拡散抵抗/);
 const scope=get('range-selection');assert.equal(scope.choices[scope.answer],'短い鉛直面、純蒸気20 kPa、接触角約90°、ΔT=4 K');
 const body=lesson.blocks.map(b=>b.text).join(' ');
 assert.match(body,/基礎データの温度差は主に8 K未満/);
 assert.match(body,/8 Kを超えたら全ての現象が突然変わるという物理境界/);
 assert.match(body,/被覆が濡れや液滴分布を変えれば/);
 assert.match(body,/短時間の高い熱流束だけで、長期の維持が証明されたとはしない/);
});

test('six new questions cover the added objectives without changing existing revision or expert-review claims',()=>{
 const items=bank.filter(q=>q.id.startsWith('supp-dropwise-correlation-'));
 assert.equal(items.length,6);assert.equal(new Set(items.map(q=>q.questionKind)).size,3);
 assert.deepEqual(items.map(q=>q.answer),[0,1,2,3,0,1]);
 for(const item of items){
  assert.equal(item.source.focusSectionId,'9.10');assert.equal(item.revision,'v1');assert.equal(item.expertReviewed,false);
  assert.equal(item.distractors.filter(s=>s.startsWith('正解。')).length,1);assert.ok(item.distractors[item.answer].startsWith('正解。'));
  assert.equal(item.solutionSteps.length,4);assert.match(item.reviewStatus,/外部専門家校閲前/);
 }
});
