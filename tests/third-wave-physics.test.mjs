import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEEP_LESSON_IDS,validateDeepLessons,deepLessonForSection} from '../original-deep-lessons.mjs';
import {GUIDE_SECTIONS} from '../guide.mjs';
import {buildAuthoringQueue} from '../authoring-queue.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),String(a)+' vs '+b);
const ids=['2.4','3.4','4.3','7.2','10.3'];

test('five standalone independent lessons are registered, section-aligned and do not assert external academic review',async()=>{
 const [book,deep]=await Promise.all(['data/book.json','data/original-deep-lessons.json'].map(read));
 assert.deepEqual(validateDeepLessons(book,deep),[]);
 assert.ok(deep.lessons.length>=26);
 for(const id of ids){
  assert.ok(DEEP_LESSON_IDS.includes(id),id);
  const l=deepLessonForSection(deep,id);
  assert.ok(l,id);
  assert.ok(l.blocks.length>=6&&l.blocks.every(b=>b.text.length>=70),id);
  assert.ok(l.blocks.reduce((n,b)=>n+b.text.length,0)>=800,id);
  assert.ok(l.equations.length>=4&&l.workedExample.steps.length>=5,id);
  assert.ok(l.pitfalls.length>=4&&l.references.length>=1,id);
  assert.ok(l.reviewStatus.includes('外部専門家校閲'),id);
 }
 assert.equal(deep.translation,false);
 assert.equal(deep.expertReviewed,false);
});

test('33 new original quizzes contain 4 explained choices, unambiguous answer keys and 3 kinds per completed section draft',async()=>{
 const [book,notes,deep,all,evidence]=await Promise.all([
  'data/book.json','data/original-notes.json','data/original-deep-lessons.json',
  'data/questions.json','data/readiness-evidence.json'
 ].map(read));
 assert.ok(all.length>=312);
 const qs=all.filter(q=>q.id.startsWith('supp-batch2-'));
 assert.equal(qs.length,33);
 assert.equal(new Set(all.map(q=>q.id)).size,all.length);
 const validGuides=new Set(GUIDE_SECTIONS.map(g=>g.id));
 for(const q of qs){
  assert.ok(ids.includes(q.source?.focusSectionId),q.id);
  assert.equal(q.source?.chapterId,'ch'+q.source.focusSectionId.split('.')[0]);
  assert.ok(validGuides.has(q.source.guideId),q.id);
  assert.ok(['conceptual','numerical','applied'].includes(q.questionKind),q.id);
  assert.equal(q.choices.length,4);
  assert.equal(new Set(q.choices).size,4,q.id);
  assert.equal(q.distractors.length,4);
  assert.ok(q.choices.every(x=>typeof x==='string'&&x.trim().length>0),q.id);
  assert.ok(q.distractors.every(x=>typeof x==='string'&&x.trim().length>=10),q.id);
  assert.ok(q.distractors[q.answer].startsWith('正解。'),q.id);
  assert.ok(q.hints.length>=2&&q.solutionSteps.length>=3,q.id);
  assert.equal(q.expertReviewed,false,q.id);
  assert.ok(q.reviewStatus.includes('外部専門家校閲前'),q.id);
  const correct=q.choices[q.answer].length;
  const others=q.choices.filter((_,i)=>i!==q.answer).map(x=>x.length);
  assert.ok(correct<=Math.max(...others)&&correct>=Math.min(...others),'answer-length cue '+q.id);
 }
 const report=buildAuthoringQueue({book,originalNotes:notes,deepLessons:deep,questions:all,evidence});
 assert.equal(report.sectionCount,76);
 assert.ok(report.detailedLessonDrafts>=26);
 assert.ok(report.sectionsNeedingDetailedLesson<=50);
 assert.ok(report.draftAuthoringMinimumMet>=17);
 assert.ok(report.remainingQuestionDraftMinimum<=378);
 assert.equal(report.externallyAcceptedSections,0);
 for(const id of ids){
  const row=report.sections.find(x=>x.sectionId===id);
  assert.ok(row.detailedLessonDraft&&row.questionDraftCount>=8&&row.questionKinds>=3,id);
  assert.equal(row.finalAcceptance,false,id);
 }
});

test('independently recompute cylindrical resistance, exchanger sizing, Bi/Fo scaling, entry lengths and radiation reciprocity',()=>{
 const pi=Math.PI,Ai=2*pi*.01*2,Ao=2*pi*.012*2;
 const Ri=1/(1000*Ai),Ro=1/(100*Ao),Rw=Math.log(.012/.01)/(2*pi*15*2),R=Ri+Rw+Ro;
 near(R,.07523955267608341,1e-10);
 near(1/R,13.290881782685991,1e-10);
 near(1/(R*Ai),105.76547668822487,1e-10);
 near(1/(R*Ao),88.13789724018739,1e-10);
 near(40/R,531.6352713074397,1e-10);
 near(1/(1/100+.02/2+1/25),16.666666666666668);
 near(30/(.05+.01),500);
 near(12000/(300*.8*25),2);
 near(12000/(150*.8*25),4);
 near((40-20)/Math.log(40/20),28.85390081777927);
 assert.ok(22000>400*(80-30));
 near(50000*.001/.50,100);
 near(40*.020/8,.1);
 near(2e-6*100/.02**2,.5);
 near(.5/4,.125);
 near(40*.020/.040,20);
 near(100*4,400);
 near(3.66*.60/.020,109.8);
 near(109.8*10,1098);
 near(4.36*.60/.020,130.8);
 near(.05*200*.020,.2);
 near(.05*200*5*.020,1.0);
 near(1*.80/4,.2);
 near(6*.25/2,.75);
 near(1-0-.25,.75);
 near(5.67e-8*1*.8*(400**4-300**4),793.8);
});
