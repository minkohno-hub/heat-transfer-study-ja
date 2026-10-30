import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async n=>JSON.parse(await readFile(new URL('../data/'+n,import.meta.url),'utf8'));
const [questions,deep,notes,glossary]=await Promise.all(['questions.json','original-deep-lessons.json','original-notes.json','glossary.json'].map(read));
const byid=new Map(questions.map(q=>[q.id,q]));
const note=id=>notes.notes.find(n=>n.sectionId===id);
const lesson=id=>deep.lessons.find(l=>l.sectionId===id);

test('A-05-001: LMTD zero-endpoint wording separates direct substitution from the limit',()=>{
 const q=byid.get('supp-section-3-2');assert.equal(q.revision,'v4');assert.equal(q.answer,0);
 assert.match(q.explanation,/正の側から0に近づく極限ではΔT_lm→0 K/);
 assert.match(q.explanation,/直接代入することはできない/);
 // (a-40)/ln(a/40) -> 0+ as a -> 0+
 const lm=a=>(a-40)/Math.log(a/40);assert.ok(lm(1e-4)>0&&lm(1e-4)<lm(0.01)&&lm(0.01)<lm(1));
});

test('A-07-001/A-07-003: Neumann premise and fin base-temperature condition are explicit',()=>{
 const neumann=byid.get('supp-batch3-pure-neumann-unique-v1');
 assert.equal(neumann.answer,3);assert.match(neumann.prompt,/熱伝導率kが一定の線形モデル/);
 assert.match(neumann.explanation,/kが温度に依存する非線形問題ではそのまま成立しない/);
 const fin=byid.get('supp-chapter-ch4-fin-concept');
 assert.equal(fin.answer,3);assert.match(fin.prompt,/周囲温度・基部温度で/);
});

test('A-11-001: Pr comparison is stated as relative to momentum diffusion',()=>{
 const q=byid.get('supp-section-6-4');assert.equal(q.answer,1);
 assert.match(q.explanation,/運動量の拡散に対する熱拡散の相対的な大きさ/);
 assert.match(q.explanation,/熱拡散率αの絶対値は決まらない/);
 assert.match(note('6.4').explanation,/相対的な大きさ/);
});

test('A-19-001: flow quality needs no equilibrium; x_eq agreement is equilibrium-only',()=>{
 const q=byid.get('supp-section-9-8');assert.equal(q.answer,0);
 assert.doesNotMatch(JSON.stringify(q),/平衡で気相と液相を区別できる場合/);
 assert.match(q.explanation,/熱力学的平衡は不要/);
 assert.match(q.explanation,/局所熱力学平衡の場合に限る/);
 assert.doesNotMatch(note('9.8').relation,/平衡で気相と液相を区別できる場合/);
});

test('A-23-001: J is radiosity, distinct from emissive power E, in questions and notes',()=>{
 const q=byid.get('supp-section-10-4');assert.equal(q.answer,1);
 assert.match(q.explanation,/射度Jは自己放出E（=εE_b）と反射の和/);
 assert.doesNotMatch(q.explanation,/放射発散度J/);
 assert.match(note('10.4').explanation,/射度Jは自己放出E/);
 const applied=byid.get('supp-applied-10-4-v1');assert.equal(applied.revision,'v2');assert.equal(applied.answer,2);
 assert.match(applied.distractors[0],/射度J/);
 const J=.70*1200+(1-.70)*400;assert.equal(J,960);assert.equal(J-400,560);
 const rad=glossary.find(t=>t.id==='radiosity');assert.match(rad.detail,/自己放出/);
});

test('A-25-001: constant molar flux requires a constant-area planar one-dimensional system',()=>{
 const q=byid.get('supp-section-11-4');assert.equal(q.answer,3);
 assert.match(q.prompt,/断面積が一定の平面一次元系/);
 assert.match(q.explanation,/全モル移動率であり、局所流束N_Aは半径とともに変化する/);
 assert.match(note('11.4').selfCheck,/断面積が一定の平面一次元系/);
});

test('A-26-001: low/high refer to interface mass-transfer rate, not stream velocity',()=>{
 const q=byid.get('supp-section-11-9');assert.equal(q.answer,2);
 assert.match(q.prompt,/単相の低移動率相関/);assert.doesNotMatch(q.prompt,/低速/);
 assert.match(q.explanation,/主流の流速や低Reとは別の条件/);
 assert.doesNotMatch(note('11.9').limits,/低速相関/);
 const lewis=byid.get('supp-section-11-7');assert.equal(lewis.answer,0);
 assert.match(lewis.explanation,/低移動率（界面を横切る物質移動率が小さい場合）の近似/);
});

test('A-04-001/A-04-002/A-10-002: lesson premises and coefficient units are explicit',()=>{
 const l21=lesson('2.1');assert.match(l21.blocks[1].text,/非圧縮性とみなし/);assert.match(l21.blocks[1].text,/c_p≈c_v≈c/);
 assert.match(l21.workedExample.steps[0],/係数2000の単位はK\/m²/);
 assert.equal(8.0e4/(2*20),2000);
 const l22=lesson('2.2');assert.match(l22.workedExample.steps[1],/係数200の単位はK\/m/);
 assert.equal((20-60)/0.20,-200);
 const l53=lesson('5.3');assert.match(l53.blocks[3].text,/V\/A_s≈Lとなり/);
});

test('glossary Dittus-Boelter entry notes the conventional form versus the book lineage (FC-23)',()=>{
 const t=glossary.find(x=>x.id==='dittus-boelter-correlation');
 assert.match(t.detail,/慣例形/);assert.match(t.detail,/Colburn式/);assert.match(t.detail,/0\.0243/);
});

test('A-27-002: the eight book-derived questions record the original-text collation',()=>{
 const books=questions.filter(q=>q.source?.type==='book');assert.equal(books.length,8);
 for(const q of books){
  assert.ok(q.reportHistory?.some(h=>/A-27-002/.test(h.issue)),q.id);
 }
});
