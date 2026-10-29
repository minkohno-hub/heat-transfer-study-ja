// Targeted arithmetic/structure checks for an authoring batch, not a complete
// review of the book, diagrams, empirical correlations or external expertise.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url)));
const [deep,questions]=await Promise.all(['data/original-deep-lessons.json','data/questions.json'].map(read));
const get=id=>questions.find(q=>q.id===`supp-${id}-v1`);
const close=(x,y,tol=1e-9)=>assert.ok(Math.abs(x-y)<tol*Math.max(1,Math.abs(y)),`${x} != ${y}`);
test('gray parallel-surface example closes both radiosities and equal/opposite heat rates',()=>{
 const sigma=5.670374419e-8,E1=sigma*400**4,E2=sigma*300**4;
 const q=(E1-E2)/(1/.8+1/.6-1),J1=E1-(.2/.8)*q,J2=E2+(.4/.6)*q;
 close(q,517.7298382565216);close(q*.5,258.8649191282608);
 close(J1-J2,q);close(J2-J1,-q);
 close(J1,.8*E1+.2*J2);close(J2,.6*E2+.4*J1);
 const l=deep.lessons.find(l=>l.sectionId==='10.4');
 assert.match(l.workedExample.answer,/517.73 W\/m²/);assert.match(l.workedExample.answer,/258.86 W/);
 assert.match(l.blocks.map(b=>b.text).join(' '),/単位はm⁻²/);
});
test('participating-gas example includes the source term and satisfies transparent/equilibrium/opaque limits',()=>{
 const outgoing=(I,Ib,x)=>I*Math.exp(-x)+Ib*(-Math.expm1(-x));
 close(outgoing(100,20,.6),63.90493088752211);
 close(outgoing(100,20,0),100);close(outgoing(20,20,4),20);close(outgoing(100,20,1000),20);
 close(outgoing(10,50,Math.log(2)),30);
 const l=deep.lessons.find(l=>l.sectionId==='10.5');
 assert.match(l.workedExample.answer,/63.90 W\/\(m²·sr\)/);
 assert.match(l.workedExample.limitations,/全波長・全角度/);
});
test('solar worked example conserves projected input, absorption, outgoing losses and storage',()=>{
 const sigma=5.670374419e-8,G=800*.5+100+20,abs=.90*.50*G;
 const convection=10*.50*(60-20),radiation=.1*sigma*.5*(333.15**4-293.15**4);
 close(G,520);close(abs,234);close(convection,200);close(radiation,13.987073649221612);
 close(abs-convection-radiation,20.012926350778386);
 close((abs-convection-radiation)/1000,.020012926350778386);
 const l=deep.lessons.find(l=>l.sectionId==='10.6');
 assert.match(l.workedExample.answer,/20.01 W/);assert.match(l.workedExample.answer,/0.02001 K\/s/);
 assert.match(l.blocks.map(b=>b.text).join(' '),/換算するモデル|等方天空/);
});
test('three radiation lecture drafts and 20 questions retain conditions, keyed reasons and three skills per section',()=>{
 const prefixes=['supp-gray-','supp-gas-','supp-solar-'];
 const added=questions.filter(q=>prefixes.some(prefix=>q.id.startsWith(prefix)));
 assert.equal(added.length,20);
 for(const q of added){
  assert.equal(q.choices.length,4);assert.equal(q.distractors.length,4);
  assert.equal(new Set(q.choices).size,4);assert.equal(q.distractors.filter(r=>r.startsWith('正解。')).length,1);
  assert.ok(q.distractors[q.answer].startsWith('正解。'));
  assert.ok(q.hints.length>=2&&q.solutionSteps.length>=3);assert.equal(q.expertReviewed,false);
  assert.match(q.reviewStatus,/包括的品質監査待ち/);
 }
 for(const id of ['10.4','10.5','10.6']){
  const l=deep.lessons.find(l=>l.sectionId===id);assert.ok(l);
  assert.ok(l.blocks.length>=7&&l.equations.length>=4&&l.workedExample.steps.length>=6);
  assert.match(l.reviewStatus,/外部学術専門家校閲前/);
  const qs=questions.filter(q=>q.source?.focusSectionId===id||q.source?.sectionNoteId===id);
  assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.questionKind)).size,3);
 }
});
test('representative scalar practice answers agree with independent projected, exponential and resistance calculations',()=>{
 const pairs=[
  ['gray-parallel-flux','5.18×10² W/m²',5.67e-8*(400**4-300**4)/(1/.8+1/.6-1),517.695652173913],
  ['gray-two-surface-resistance','9.23×10¹ W',600/(2+4+.5),92.3076923076923],
  ['gas-optical-thickness','1.00',.4*2.5,1],
  ['gas-ray-transmittance','0.549',Math.exp(-.3*2),.5488116360940264],
  ['gas-emission-increases-ray','30 W/(m²·sr)',.5*10+.5*50,30],
  ['gas-absorption-inverse','0.693 m⁻¹',-Math.log(.250)/2,.6931471805599453],
  ['solar-plane-projection','520 W/m²',800*.5+100+20,520],
  ['solar-isotropic-sky','9.0×10¹ W/m²',120*(1+.5)/2,90],
  ['solar-absorbed-power','1.92×10² W',.8*.4*600,192],
  ['solar-time-integral','1.08×10⁶ J',.5*(400*1800+800*1800),1080000],
  ['solar-instant-storage','+0.050 K/s',(300-220-30)/1000,.05]
 ];
 for(const [id,text,actual,expected] of pairs){close(actual,expected);const q=get(id);assert.equal(q.choices[q.answer],text);}
 close(3/(3+3),.5);assert.equal(get('gray-one-shield').choices[get('gray-one-shield').answer],'1/2倍');
 const forward=.5*(.5*0+.5*100)+.5*20,reverse=.5*(.5*0+.5*20)+.5*100;
 close(forward,35);close(reverse,55);
 const q=get('gas-layer-order');assert.equal(q.choices[q.answer],'A→B: 35、B→A: 55 W/(m²·sr)');
});
test('nonlinear averaging and negative useful output are interpreted without discarding physics',()=>{
 assert.ok((300**4+500**4)/2>400**4);
 const average=get('gray-nonuniform-temperature');assert.match(average.choices[average.answer],/各領域のT⁴を面積平均/);
 close(100-150-20,-70);
 const solar=get('solar-negative-useful-balance');assert.match(solar.choices[solar.answer],/補助入力が必要/);
 assert.match(get('gas-scattering-model-limit').explanation,/他方向からの流入/);
});
