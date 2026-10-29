import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildAuthoringQueue} from '../authoring-queue.mjs';
import {auditFullCurriculumReadiness} from '../curriculum-readiness.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));

test('the authoring queue counts actually authored lessons and focus-section practice without granting approval',async()=>{
 const [book,originalNotes,deepLessons,questions,evidence]=await Promise.all([
  'data/book.json','data/original-notes.json','data/original-deep-lessons.json','data/questions.json',
  'data/readiness-evidence.json'
 ].map(read));
 const r=buildAuthoringQueue({book,originalNotes,deepLessons,questions,evidence});
 assert.equal(r.sectionCount,76);
 assert.equal(r.shortConceptNoteDrafts,76);
 assert.equal(r.detailedLessonDrafts,30);
 assert.equal(r.questionsInBank,339);
 assert.equal(r.remainingQuestionDraftMinimum,351);
 assert.equal(r.draftAuthoringMinimumMet,22);
 assert.equal(r.sectionsNeedingDetailedLesson,46);
 assert.equal(r.legacyDraftRecordedSections,44);
 assert.equal(r.externallyAcceptedSections,0);
 assert.ok(r.next.length===12);
 assert.ok(r.next.every(x=>!x.authoringMinimumMet));
 assert.ok(r.next.every(x=>!x.legacyDraftRecorded),'unmigrated legacy drafts should be checked before recreating their range');
 assert.equal(r.next[0].sectionId,'9.4','finish section practice for an existing detailed lesson before opening another');
 assert.equal(r.next[0].missingQuestionDrafts,7);
 assert.ok(r.sections.some(x=>x.sectionId==='4.4'&&x.legacyDraftRecorded));
 assert.ok(r.sections.some(x=>x.sectionId==='9.3'&&!x.legacyDraftRecorded));
 const s=r.sections.find(x=>x.sectionId==='2.2');
 assert.ok(s.detailedLessonDraft);
 assert.ok(s.questionDraftCount>=5,'One note check and four new focused calculations must count');
 assert.equal(s.missingQuestionDrafts,Math.max(0,8-s.questionDraftCount));
 assert.ok(r.sections.some(x=>x.sectionId==='9.1'&&x.questionDraftCount>=10));
 assert.ok(r.sections.every(x=>x.finalAcceptance===false),'Third-party approval is not inferred');
});
test('focus-section questions are countable and approval cannot be faked through draft quantity',async()=>{
 const [book,originalNotes,questions]=await Promise.all(['data/book.json','data/original-notes.json','data/questions.json'].map(read));
 const r=auditFullCurriculumReadiness({book,originalNotes,questions});
 const section=r.sections.find(x=>x.id==='3.3');
 const explicit=questions.filter(q=>q.source?.focusSectionId==='3.3'||q.source?.sectionNoteId==='3.3'||(q.source?.type==='book'&&q.source?.section==='3.3'));
 assert.equal(section.sectionQuestionCount,explicit.length);
 assert.ok(section.sectionQuestionCount>=5);
 assert.equal(section.expertReviewedQuestionCount,0);
 assert.equal(section.questionBankReady,false);
 assert.equal(r.fullCompletion,false);
});
