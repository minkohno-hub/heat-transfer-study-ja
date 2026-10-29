import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)));
const [questions,deep,notes,source]=await Promise.all(['questions','original-deep-lessons','original-notes','original-section-questions'].map(read));
const q=id=>questions.find(q=>q.id===id);
test('audit follow-up limits the initial-condition question to a transient problem without changing its answer',()=>{
 const item=q('supp-section-1-4');assert.equal(item.revision,'v3');assert.equal(item.answer,0);assert.match(item.prompt,/非定常/);assert.match(item.explanation,/定常.*初期条件は必要としない/s);
 assert.match(notes.notes.find(n=>n.sectionId==='1.4').selfCheck,/非定常/);
 const {questionKind,...fields}=item;assert.deepEqual(fields,source.questions.find(q=>q.id===item.id));
});
test('spatial heat-flux gradient has W per cubic metre and the same 100 W integrated answer',()=>{
 const item=q('supp-deep-heat-rate-flux-integral-v1');assert.equal(item.revision,'v2');assert.equal(item.choices[item.answer],'100 W');assert.match(item.prompt,/200 W\/m³/);assert.match(item.explanation,/ξ=x\/\(1.00 m\)/);
 const example=deep.lessons.find(l=>l.sectionId==='1.1').workedExample;assert.match(example.problem,/200 W\/m³/);
 const width=.5,length=1,intercept=100,slope=200;
 assert.equal(width*(intercept*length+slope*length*length/2),100);
});
test('cylinder distractor now tests inner and outer flat-area approximations while retaining revision-aware history',()=>{
 const item=q('supp-roadmap-model-shape-selection-v1');assert.equal(item.revision,'v2');assert.equal(item.answer,1);assert.match(item.choices[3],/外側面積/);assert.doesNotMatch(item.choices.join(' '),/円筒は伝導しない/);
 const ri=.01,ro=.02,k=10,L=.5,dt=20;
 const exact=2*Math.PI*k*L*dt/Math.log(ro/ri),inner=k*2*Math.PI*ri*L*dt/(ro-ri),outer=k*2*Math.PI*ro*L*dt/(ro-ri);
 assert.ok(inner<exact&&exact<outer);assert.ok(item.reportHistory.some(r=>r.issue==='chat/audit A-01-003'));
 assert.equal(item.expertReviewed,false);
});
