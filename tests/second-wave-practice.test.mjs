import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildAuthoringQueue} from '../authoring-queue.mjs';

const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const expected={
 'time-energy-out':1,'signed-net-flux':0,'open-enthalpy-jump':2,
 'combined-surface-loss':2,'slab-flux-unit':3,'radiation-zero-emissivity':2,
 'inverse-delta-temperature':1,'linear-temperature-location':1,'three-series':1,
 'parallel-extra-branch':2,'cold-outlet-with-loss':2,'massflow-from-heat':1,
 'exchanger-qmax-feasibility':3,'ntu-eps-ratio':2,'ntu-ua-inverse':2,
 'fourier-size-time':1,'fourier-time-scale':2,'dimensionless-centre-temperature':1,
 'nusselt-invert-h':1,'local-versus-average':3,'pr-layer-thickness':2,
 'steady-flux-concept':1,'parallel-temperature-condition':3
};
test('all 23 additional section-focused practice questions retain explicit keyed reasons and section links',async()=>{
 const bank=await read('data/questions.json');
 assert.ok(bank.length>=312);
 const additions=bank.filter(q=>q.id.startsWith('supp-next-'));
 assert.equal(additions.length,23);
 for(const q of additions){
  const key=q.id.replace(/^supp-next-/,'').replace(/-v1$/,'');
  assert.ok(Object.hasOwn(expected,key),q.id);
  assert.equal(q.answer,expected[key],q.id);
  assert.equal(q.choices.length,4);
  assert.equal(q.distractors.length,4);
  assert.ok(q.distractors.every(s=>typeof s==='string'&&s.trim().length>=4),q.id);
  assert.ok(q.hints.length>=2&&q.solutionSteps.length>=3,q.id);
  assert.ok(q.source.focusSectionId&&q.source.guideId&&q.source.chapterId,q.id);
  assert.equal(q.expertReviewed,false);
  assert.ok(q.reviewStatus.includes('外部専門家校閲前'));
  const correct=q.choices[q.answer].length;
  const others=q.choices.filter((_,i)=>i!==q.answer).map(s=>s.length);
  assert.ok(correct<=Math.max(...others)&&correct>=Math.min(...others),'answer-length cue '+q.id);
 }
});
test('independently recompute new numerical exercises and separate draft status from acceptance',async()=>{
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),String(a)+' vs '+b);
 close(90*45,4050);
 close(140-100,40);
 close(.25*50,12.5);
 const rad=.8*5.670374419e-8*.5*(320**4-300**4);
 close(10*.5*(320-300)+rad,154.112609895);
 close(2*20/.1,400);
 close(200*.05/(2*1),5);
 close(60-40*.15/.20,30);
 close(60/(.10+.20+.30),100);
 close(60/.1+60/.2+60/.3,1100);
 close(20+46000/2000,43);
 close(30000/(4000*15),.5);
 assert.ok(30000>400*(80-20));
 close(6000/(300*40),.5);
 close(600/400,1.5);
 close((4*100)/(2**2*100),1);
 close(.02**2/1e-6,400);
 close(20+.40*(100-20),52);
 close(200*.025/.50,10);
 const [book,notes,lessons,questions,evidence]=await Promise.all([
  'data/book.json','data/original-notes.json','data/original-deep-lessons.json',
  'data/questions.json','data/readiness-evidence.json'
 ].map(read));
 const report=buildAuthoringQueue({book,originalNotes:notes,deepLessons:lessons,questions,evidence});
 assert.ok(report.draftAuthoringMinimumMet>=17);
 assert.equal(report.externallyAcceptedSections,0);
 assert.ok(report.remainingQuestionDraftMinimum<=378);
});
