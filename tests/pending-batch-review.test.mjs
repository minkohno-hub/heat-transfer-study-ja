// New-task verification of 609c0e5..204a2a1, including 7995a16.
// The oracles below are derived from conservation laws, integrals and definitions;
// they do not call a production solver or imply external expert approval.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url)));
const questions=await read('data/questions.json');
const deep=await read('data/original-deep-lessons.json');
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
// Numeric values of all four candidates, in the units printed in each item.
// The chosen text is also pinned: a changed choice cannot silently retain its oracle.
const numerical=[
 ['condensation-latent-rate','1.2×10⁻³ kg/s',()=>2.4*1000/2e6,[1.2e-6,1.2e-4,1.2e-3,1.2e-2]],
 ['condensation-film-reynolds','25',()=>4*(5e-4/.4)/2e-4,[6.3,13,25,50]],
 ['condensation-supercooling-scale','8倍',()=>16**(3/4),[.5,2,8,16]],
 ['condensation-local-average','1.2×10³ W/(m²·K)',()=>900/(1-1/4),[680,900,1200,1800]],
 ['film-fixed-flux','5.0×10³ W/m²',()=>100/(.50e-3/.025),[5000,5,50000,500]],
 ['film-area-resistance','R″=0.010 m²·K/W、R=0.050 K/W',()=>[.30e-3/.030,.30e-3/(.030*.20)],[[.05,.01],[.01,.05],[.01,.002],[10,50]]],
 ['film-radiation-kelvin','7.9×10² W/m²',()=>.80*5.67e-8*(400**4-300**4),[4.5,1200,990,790],.006],
 ['minimum-area-rate','6.0×10² W',()=>.040*1.5e4,[600,3.8e5,.06,1.5e4]],
 ['minimum-effective-h','1.0×10² W/(m²·K)',()=>2e4/200,[4e6,100,.01,2e4]],
 ['minimum-instant-storage','+0.20 K/s',()=>(600-.020*2e4)/1000,[-.2,.6,.2,-.4]],
 ['radiation-inverse-emissivity','0.60',()=>(760-400)/(1000-400),[.4,.6,.76,1.9]],
 ['radiation-net-incoming-sign','q″=−300 W/m²、Q̇=−60 W',()=>[500-800,(500-800)*.20],[[300,60],[-300,-1500],[-300,-60],[1300,260]]],
 ['transition-area-average','1.3×10² kW/m²',()=>.25*400+.75*40,[130,220,310,440]],
 ['transition-time-average','1.4×10² kW/m²',()=>(60*10+180*20)/(10+20),[120,140,180,240]],
 ['transition-wet-fraction-inverse','0.40',()=>(150-50)/(300-50),[.2,.5,.4,.6]],
 ['transition-average-slope','−0.88 kW/(m²·K)',()=>.4*2+.6*.20-.005*(400-40),[.92,-1.8,2.7,-.88]],
 ['system-local-pressure','96 kPa',()=>90+800*10*.75/1000,[96,84,690,6]],
 ['system-clapeyron-increment','0.40 K',()=>400*.50/2e6*(4*1000),[.00040,.40,4,40]],
 ['system-superheat-subcooling','ΔT_e=20 K、ΔT_sub=15 K',()=>[130-110,110-95],[[35,15],[20,-15],[20,15],[15,20]]],
 ['system-local-saturation-shift','11.2 K',()=>12-.80,[12.8,12,11.2,.80]]
];
const conceptual=[
 ['condensation-gas-mixture','蒸気が界面へ届く拡散抵抗を含め、条件を再評価する',/全圧と蒸気分圧/],
 ['condensation-model-limits','蒸気流で膜が受ける力を調べ、適合するモデルを選ぶ',/小さな液膜Reだけでは/],
 ['film-thickness-interpretation','モデル値は半分だが、実機の膜厚は流動等で決まる',/逆数に比例/],
 ['film-radiation-coupling','放射による膜厚・界面の変化と、連成モデルを確認する',/非放射条件で求めたh_fを固定してよいとは限らない/],
 ['film-versus-condensation','膜沸騰は高温壁上の蒸気膜、膜状凝縮は低温壁上の液膜',/蒸発・凝縮の向き/],
 ['film-geometry-limit','曲率・周方向の膜厚と流動を含む伝熱モデルを選ぶ',/直径は蒸気膜の厚さとは異なる/],
 ['minimum-branch-definition','膜沸騰側で蒸気膜を維持しにくくなる下限付近の値',/数学的な最小値ではなく/],
 ['minimum-temperature-insufficient','q″_minだけでは不足し、圧力や温度関係等を確認する',/単位換算で結び付かない/],
 ['minimum-negative-slope-feedback','除熱が減って、さらに温度を上げる向きに働く',/入力一定/],
 ['minimum-control-history','CHFと膜崩壊を区別し、制御方式と履歴を記録する',/別の状態/],
 ['radiation-spectral-kirchhoff','波長の重みが異なるため、差だけで矛盾とは言えない',/同じ波長・方向・偏光/],
 ['transition-fourier-consistency','局所伝導と濡れ面積の変化を分け、平均の変化を考える',/局所温度勾配/],
 ['transition-measurement-context','平均の定義を確認し、局所値や瞬間値は別に調べる',/一意には決まらない/],
 ['transition-fraction-model-limit','fと各領域の流束を決める追加モデルや測定が要る',/普遍的な定数や流体物性と扱わない/],
 ['system-surface-comparison','複数条件が変わったと記録し、粗さ単独の効果は分けて調べる',/因果効果を断定できない/],
 ['system-small-gravity-limit','泡や蒸気の排出機構と適用範囲を見直し、追加の根拠を調べる',/外挿を正当化しない/],
 ['system-mixture-equilibrium','液相・気相の組成や沸点・露点が異なりうるから',/組成や相平衡/],
 ['radiation-gray-versus-diffuse','放射率などの波長依存を無視し、一定値で扱う',/灰色という仮定だけで放射率1や方向非依存が決まるわけではない/]
];
function item(id,answer){
 const q=questions.find(q=>q.id===`supp-${id}-v1`);
 assert.ok(q,id); assert.equal(q.choices.length,4); assert.equal(new Set(q.choices).size,4);
 assert.equal(q.choices[q.answer],answer);
 assert.equal(q.distractors.filter(s=>s.startsWith('正解。')).length,1);
 assert.ok(q.distractors[q.answer].startsWith('正解。'));
 assert.equal(q.expertReviewed,false);
 assert.match(q.reviewStatus,/AI内部/);
 assert.ok(q.hints.length>=2&&q.solutionSteps.length>=3);
 return q;
}
for(const [id,answer,oracle,candidates,tolerance=1e-10] of numerical){
 test(`pending batch: ${id} independently has one numerical answer`,()=>{
  const q=item(id,answer),expected=[oracle()].flat();
  // Relative rounding tolerance is applied per component. Wrong signs and tuple
  // components cannot pass by cancellation or by comparing only one result.
  const valid=candidates.map((candidate,index)=>({index,values:[candidate].flat()})).filter(({values})=>
   values.length===expected.length&&values.every((value,i)=>Math.abs(value-expected[i])<=tolerance*Math.max(1e-12,Math.abs(expected[i]))));
  assert.deepEqual(valid.map(x=>x.index),[q.answer]);
 });
}
for(const [id,answer,condition] of conceptual){
 test(`pending batch: ${id} retains its reviewed definition and limits`,()=>{
  const q=item(id,answer);assert.match(q.explanation,condition);
 });
}
test('pending review covers exactly the 38 new items without asserting external approval',()=>{
 assert.equal(numerical.length+conceptual.length,38);
 const ids=new Set([...numerical,...conceptual].map(([id])=>`supp-${id}-v1`));
 assert.equal(ids.size,38);
 assert.equal(questions.filter(q=>q.reportHistory?.some(r=>r.type==='internal_independent_check')).length,38);
 // Zero-slope and negative-slope feedback are distinct. Linearization gives
 // C δTdot = -A qprime δT: the negative slope produces a growing perturbation.
 const C=1000,A=.02,qprime=-2000;
 assert.ok(-A*qprime/C>0);
});
test('§9.5 example closes instantaneous energy, effective h and temperature units',()=>{
 const l=deep.lessons.find(l=>l.sectionId==='9.5');
 near(.020*2e4,400);near(2e4/150,133.33333333333334);near(500-.020*2e4,100);
 assert.match(l.workedExample.answer,/400 W/);assert.match(l.workedExample.answer,/1.3×10²/);
 assert.match(l.workedExample.answer,/\+100 W/);
 assert.match(l.workedExample.limitations,/崩壊温度/);
});
test('§9.6 average and derivative follow area integrals rather than local Fourier slope',()=>{
 const l=deep.lessons.find(l=>l.sectionId==='9.6');
 const first=.6*300+.4*30,second=.2*300+.8*30;
 near(first,192);near(second,84);near((first-second)*1000*.010,1080);
 assert.match(l.workedExample.answer,/192→84/);assert.match(l.workedExample.answer,/1920→840/);
 // Finite difference of the full product independently checks the analytic derivative.
 const f=T=>.4-.005*T,wet=T=>400+2*T,dry=T=>40+.2*T;
 const mean=T=>f(T)*wet(T)+(1-f(T))*dry(T);
 near((mean(.001)-mean(-.001))/.002,-.88,1e-8);
});
test('§9.7 hydrostatic and Clapeyron units and small increment agree',()=>{
 const l=deep.lessons.find(l=>l.sectionId==='9.7');
 const dp=1000*10*.50,slope=350*.80/2e6;
 near(100+dp/1000,105);near(slope*dp,.70);
 assert.match(l.workedExample.answer,/105 kPa/);assert.match(l.workedExample.answer,/0.70 K/);
 assert.match(l.blocks.map(b=>b.text).join(' '),/単位質量当たり/);
});
test('§9.8 phase flow conservation and equal-speed void fraction are different fractions',()=>{
 const l=deep.lessons.find(l=>l.sectionId==='9.8');
 const m=.020,mV=m*.1+800/2e6,mL=m-mV,x=mV/m;
 near(m/.0001,200);near(x,.12);near(mV,.0024);near(mV+mL,m);
 const voidFraction=(mV/5)/(mV/5+mL/950);
 near(voidFraction,285/296);
 assert.match(l.workedExample.answer,/0.120/);assert.match(l.workedExample.answer,/0.963/);
 assert.match(l.workedExample.limitations,/両相等速/);
});
test('§9.9 latent removal equals cold-side gain and total mass is retained',()=>{
 const l=deep.lessons.find(l=>l.sectionId==='9.9');
 const condensed=9000/2e6,x=.70-condensed/.030,deltaCold=9000/(.10*4200);
 near(condensed,.0045);near(x,.55);near(20+deltaCold,41.42857142857143);
 near(.030*x+.030*(1-x),.030);near(.10*4200*deltaCold,condensed*2e6);
 assert.match(l.workedExample.answer,/0.55/);assert.match(l.workedExample.answer,/0.0045/);
 assert.match(l.workedExample.answer,/41.4/);
});
test('§9.10 changing only condensation resistance cannot quadruple total heat transfer',()=>{
 const l=deep.lessons.find(l=>l.sectionId==='9.10');
 const r1=1/(5000*.020)+.005+.050,r2=1/(20000*.020)+.005+.050;
 near(30/r1,461.53846153846155);near(30/r2,521.7391304347826);
 near(r1/r2,1.1304347826086956);assert.ok(r1/r2<4);
 assert.match(l.workedExample.answer,/462→522 W/);assert.match(l.workedExample.answer,/1.13倍/);
});
test('§9.11 capillary pressure and adverse elevation close the specified pressure budget',()=>{
 const l=deep.lessons.find(l=>l.sectionId==='9.11');
 const cap=2*.040/(20e-6),loss=1500+500,gravity=800*10*.10;
 near(200/1e6*1000,.20);near(cap,4000);near(cap-loss-gravity,1200);
 // Turning the pipe over assists return; it must not add the same adverse head.
 near(cap-loss+gravity,2800);
 assert.match(l.workedExample.answer,/0.20 g\/s/);assert.match(l.workedExample.answer,/1200 Pa/);
 assert.match(l.workedExample.limitations,/指定負荷/);
});
