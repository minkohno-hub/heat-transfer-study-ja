import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,bank]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const lesson=deep.lessons.find(l=>l.sectionId==='9.7'),get=key=>bank.find(q=>q.id==='supp-system-boiling-'+key+'-v1');
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
const number=s=>{
 const match=s.match(/\d+(?:\.\d+)?(?:×10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)?/u);assert.ok(match,s);
 const [base,power]=match[0].split('×10'),digits={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
 return Number(base)*(power?10**Number([...power].map(x=>digits[x]).join('')):1);
};
const unique=(key,expected)=>{const q=get(key);assert.deepEqual(q.choices.flatMap((s,i)=>Math.abs(number(s)-expected)<.005*expected?[i]:[]),[q.answer]);};

test('surface correlation uses normalized micrometres and a receding angle within the measured bounds',()=>{
 const roughMetres=8e-6,r=roughMetres/1e-6,beta=20,baseline=5e5;
 assert.ok(r>=2&&r<=12&&beta>=0&&beta<=40);
 const angle=(1-beta/180)**3,ratio=1.042*angle*Math.exp(.125*Math.log(r));
 close(ratio,.9490659667551882);unique('surface-factor',baseline*ratio);
 const wrongUnits=1.042*angle*roughMetres**.125;
 close(ratio/wrongUnits,10**.75);
 const cases=[baseline*ratio,baseline*wrongUnits,baseline*1.042*r**.125,baseline];
 get('surface-factor').choices.forEach((s,i)=>assert.ok(Math.abs(number(s)-cases[i])<.005*cases[i]));
});

test('roughness and contact-angle metrics cannot be substituted merely because their numbers agree',()=>{
 const item=get('surface-data');assert.equal(item.choices[item.answer],'二乗平均平方根粗さ8 µmと後退接触角20°を使う');
 const e=lesson.equations.find(e=>e.label==='大きな平板の限定的な表面条件の相関');
 assert.match(e.meaning,/rms粗さ/);assert.match(e.meaning,/後退接触角/);assert.match(e.meaning,/2≤r_μ≤12/);
 assert.ok(lesson.blocks.some(b=>b.text.includes('静的接触角・前進接触角')));
});

test('Bergles-Rohsenow combination agrees with its original ratio form and meets the single-phase value at inception',()=>{
 const fc=30,B=50,initial=10;
 const original=fc*Math.sqrt(1+(B/fc*(1-initial/B))**2),stable=Math.hypot(fc,B-initial);
 close(original,stable);close(stable,50);unique('combined-flux',stable);
 close(Math.hypot(fc,initial-initial),fc);
 const item=get('combined-flux'),values=[50,70,80,Math.hypot(30,50)],n=item.answer,rotated=values.slice(-n).concat(values.slice(0,-n));
 item.choices.forEach((s,i)=>assert.ok(Math.abs(number(s)-rotated[i])<.005*rotated[i]));
 const onset=get('incipience-reference');assert.equal(onset.choices[onset.answer],'開始時の過熱度で、プール沸騰曲線から読む値');
 assert.ok(lesson.blocks.some(b=>b.text.includes('q″_B<q″_i')));
});

test('the onset intersection uses absolute saturation temperature and closes both temperature and flux equations',()=>{
 const sigma=.04,T=350,rho=5,latent=1e6,k=.2,h=1000,sub=20;
 const A=8*sigma*T/(rho*latent*k),C=A*h;
 close(A,.000112);close(C,.112);
 const positive=(C+Math.hypot(C,2*Math.sqrt(C*sub)))/2;
 let lo=0,hi=100;
 for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(mid*mid-C*(mid+sub)>0)hi=mid;else lo=mid;}
 close(positive,(lo+hi)/2);close(positive,1.5537102523519029);
 const flux=h*(positive+sub);close(flux,21553.710252351902);close(Math.sqrt(A*flux),positive);
 assert.notEqual(8*sigma*(T-273.15)/(rho*latent*k),A);
 assert.ok(lesson.equations.some(e=>e.meaning.includes('T_sat,K:[K]は絶対温度')));
});

test('forced-film geometry coefficient and velocity criterion give distinct physically scoped alternatives',()=>{
 const k=.05,rho=2,latent=1.5e6,difference=100,speed=2,D=.05,g=10;
 const root=Math.sqrt(k*rho*latent*difference*speed/D),flux=2.70*root;
 close(flux,66136.2230551458);close(speed*speed/(g*D),8);unique('forced-film',flux/1000);
 const cases=[flux/1000,root/1000,2.98*root/1000,flux*Math.sqrt(speed)/1000];
 get('forced-film').choices.forEach((s,i)=>assert.ok(Math.abs(number(s)-cases[i])<.005*cases[i]));
 assert.equal(1/(g*D),2);const range=get('forced-film-range');assert.match(range.choices[range.answer],/^2、条件外/);
 // kg,m,s,K exponent vectors of k*rho*hfg*dT*u/D, then the square root.
 const units=[[1,1,-3,-1],[1,-3,0,0],[0,2,-2,0],[0,0,0,1],[0,1,-1,0],[0,-1,0,0]];
 assert.deepEqual(units.reduce((s,row)=>s.map((v,i)=>v+row[i]),[0,0,0,0]).map(v=>v/2),[1,0,-3,0]);
});

test('six additions retain review limits and source identity across distinct surface and flow models',()=>{
 const items=bank.filter(q=>q.id.startsWith('supp-system-boiling-'));
 assert.equal(items.length,6);assert.equal(new Set(items.map(q=>q.questionKind)).size,3);
 assert.deepEqual(items.map(q=>q.answer),[0,1,2,3,0,1]);
 for(const item of items){
  assert.equal(item.source.focusSectionId,'9.7');assert.equal(item.revision,'v1');assert.equal(item.expertReviewed,false);
  assert.equal(item.distractors.filter(s=>s.startsWith('正解。')).length,1);assert.ok(item.distractors[item.answer].startsWith('正解。'));
  assert.equal(item.solutionSteps.length,4);assert.match(item.reviewStatus,/外部専門家校閲前/);
 }
});
