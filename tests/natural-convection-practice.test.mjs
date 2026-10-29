import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildAuthoringQueue} from '../authoring-queue.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url)));
test('natural convection exercises cover conditions and preserve independent physical checks',async()=>{
 const [book,originalNotes,deepLessons,questions,evidence]=await Promise.all(['data/book.json','data/original-notes.json','data/original-deep-lessons.json','data/questions.json','data/readiness-evidence.json'].map(read));
 const added=questions.filter(q=>q.id.startsWith('supp-natural-'));
 assert.equal(added.length,7);
 const row=buildAuthoringQueue({book,originalNotes,deepLessons,questions,evidence}).sections.find(s=>s.sectionId==='8.4');
 assert.equal(row.questionDraftCount,8);assert.ok(row.questionKinds>=3);
 assert.equal(row.authoringMinimumMet,true);assert.equal(row.finalAcceptance,false);
 for(const q of added){
  assert.equal(q.source.focusSectionId,'8.4');assert.equal(q.expertReviewed,false);
  assert.equal(q.choices.length,4);assert.equal(q.distractors.length,4);
  assert.ok(q.distractors[q.answer].startsWith('正解。'));
  assert.ok(q.solutionSteps.length>=3&&q.hints.length>=2);
 }
 const beta=1/(26.85+273.15);assert.ok(Math.abs(beta-1/300)<1e-14);
 // Compute Ra by separate Gr and Pr rather than the question's combined formula.
 const gr=10*.004*10*.1**3/(2e-5)**2,pr=2e-5/1e-5;
 assert.ok(Math.abs(gr*pr-2e6)<1e-8);
 const h=(L)=>.59*(10*.004*10*L**3/(2e-5*1e-5))**.25*.026/L;
 assert.ok(Math.abs(h(.2)/h(.1)-.8408964152537145)<1e-12);
 assert.equal(5*.4*(15-25),-20);
 assert.equal(added.find(q=>q.id==='supp-natural-signed-heat-v1').answer,3);
});
