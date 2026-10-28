import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateQuestion} from '../study-core.mjs';
import {validateOriginalNotes} from '../original-notes.mjs';
import {GUIDE_SECTIONS} from '../guide.mjs';

const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const optionFiles=['ch1-4','ch5','ch6','ch7','ch8','ch9','ch10','ch11'].map(c=>'data/original-question-options/'+c+'.json');

test('every original Japanese note has exactly one published question with a single unambiguous keyed answer',async()=>{
  const [book,notes,all,source,...optionSets]=await Promise.all([
    'data/book.json','data/original-notes.json','data/questions.json','data/original-section-questions.json',...optionFiles
  ].map(read));
  assert.deepEqual(validateOriginalNotes(book,notes),[]);
  const items=optionSets.flatMap(d=>d.items),generated=source.questions;
  assert.equal(items.length,76);
  assert.equal(new Set(items.map(x=>x.sectionId)).size,76);
  assert.equal(generated.length,76);
  assert.equal(all.length,148);
  assert.equal(all.filter(q=>q.source?.type==='supplement').length,141);
  assert.equal(all.filter(q=>q.source?.type==='book').length,7);
  assert.equal(all.filter(q=>q.questionGroup==='original_independent_section_review_v1').length,76);
  const ids=new Set(all.map(q=>q.id));
  assert.equal(ids.size,148);
  const expected=notes.notes.map(n=>n.sectionId);
  assert.deepEqual(generated.map(q=>q.source.sectionNoteId),expected);
  for(const [i,n] of notes.notes.entries()){
    const q=generated[i],pair=items.find(o=>o.sectionId===n.sectionId);
    assert.equal(validateQuestion(q),'',n.sectionId);
    assert.ok(pair,n.sectionId);
    assert.equal(pair.distractors.length,3,n.sectionId);
    assert.equal(new Set(pair.distractors.map(d=>d.text)).size,3,n.sectionId);
    assert.equal(q.choices.length,4);
    assert.equal(q.choices[q.answer],n.answer,n.sectionId);
    assert.ok(q.choices.filter(x=>x===n.answer).length===1,n.sectionId);
    assert.ok(q.prompt.includes(n.selfCheck),n.sectionId);
    assert.equal(q.source.chapterId,n.chapterId,n.sectionId);
    assert.ok(GUIDE_SECTIONS.some(g=>g.id===q.source.guideId&&g.bookChapter===n.chapterId),n.sectionId);
    assert.equal(q.source.type,'supplement');
    assert.equal(q.revision,'v1');
    assert.equal(q.expertReviewed,false);
    assert.equal(q.distractors.length,4);
    assert.equal(q.distractors.filter(t=>t.startsWith('正解。')).length,1);
    assert.ok(q.distractors[q.answer].startsWith('正解。'),n.sectionId);
    assert.equal(q.hints.length,2);
    assert.equal(q.solutionSteps.length,3);
    assert.ok(q.beginnerPitfall.includes(n.limits));
    assert.ok(q.explanation.includes(n.relation));
    assert.ok(q.explanation.includes(n.limits));
    assert.ok(pair.distractors.every(d=>d.text&&d.reason&&d.reason.length>=10));
    const actualWrong=q.choices.filter((choice,j)=>j!==q.answer);
    assert.deepEqual(actualWrong,pair.distractors.map(d=>d.text));
    for(const d of pair.distractors){
      const idx=q.choices.indexOf(d.text);
      assert.ok(idx>=0&&idx!==q.answer);
      assert.ok(q.distractors[idx].includes(d.reason),n.sectionId);
    }
    assert.deepEqual(all.find(x=>x.id===q.id),q);
  }
});
test('independent calculations verify representative objective answer keys across heat/mass transfer',async()=>{
  const qs=(await read('data/original-section-questions.json')).questions;
  const mapped=new Map(qs.map(q=>[q.source.sectionNoteId,q.choices[q.answer]]));
  const checks=[
    ['2.2',1/3,'1/3倍。'],
    ['2.3',.2+.3,'0.5 K/W。'],
    ['2.5',2,'2倍。'],
    ['3.3',9000/(300*50),'変わり得る。分母Q̇_maxが変わるため。'],
    ['4.3',1/(2**2),'1/4倍。'],
    ['5.2',Math.exp(-1),'周囲温度との差。'],
    ['5.6',Math.sqrt(9),'3倍。'],
    ['6.5',.664/.332,'約2倍。'],
    ['7.5',2*20*10/(20+10),'流体と壁が接している濡れ縁の長さ。'],
    ['8.3',2**3,'2³=8倍。'],
    ['9.8',.02/.1,'気液二相の全質量流量に対する蒸気質量流量の割合。'],
    ['10.1',2**4,'16倍。'],
    ['10.2',1-.7,'0.3。'],
    ['10.3',1*.8/4,'A₁F₁₂=A₂F₂₁。'],
    ['10.4',800-600,'200 W/m²。'],
    ['11.2',2/(2+3),'0.4。'],
    ['11.3',-2e-9*(-100),'正。'],
    ['11.6',1e-6/(2e-9),'運動量拡散率が分子拡散係数の500倍であること。'],
    ['11.8',1/2,'1/2倍。']
  ];
  const expectedValues={ '2.2':1/3,'2.3':.5,'2.5':2,'3.3':.6,'4.3':.25,'5.2':Math.exp(-1),'5.6':3,'6.5':2,'7.5':13.33333333,'8.3':8,'9.8':.2,'10.1':16,'10.2':.3,'10.3':.2,'10.4':200,'11.2':.4,'11.3':2e-7,'11.6':500,'11.8':.5 };
  for(const [id,value,answer] of checks){
    assert.equal(mapped.get(id),answer,id);
    assert.ok(Math.abs(value-expectedValues[id])<1e-7*Math.max(1,Math.abs(value)),id+': independent value '+value);
  }
});
