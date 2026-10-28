import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditFullCurriculumReadiness} from '../curriculum-readiness.mjs';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
test('short Japanese notes and 159 unreviewed problems cannot be reported as complete',async()=>{
  const [book,originalNotes,questions,evidence]=await Promise.all([
    'data/book.json','data/original-notes.json','data/questions.json','data/readiness-evidence.json'
  ].map(read));
  const report=auditFullCurriculumReadiness({book,originalNotes,questions,...evidence});
  assert.equal(report.sectionCount,76);
  assert.equal(report.questionCount,159);
  assert.equal(report.originalConceptNotes,76);
  assert.equal(report.independentlyReviewedSections,0);
  assert.equal(report.verifiedRightsSections,0);
  assert.equal(report.verifiedJapaneseFullTextSections,0);
  assert.equal(report.verifiedPublishedTranslations,0);
  assert.equal(report.verifiedComprehensiveIndependentLessons,0);
  assert.equal(report.questionBankReadySections,0);
  assert.equal(report.fullyReadySections,0);
  assert.equal(report.fullCompletion,false);
  assert.ok(report.sections.every(s=>!s.sectionReady));
});
test('no human review, actual publication or permission is inferred from word count or question count',async()=>{
 const [book,originalNotes,questions]=await Promise.all([
    'data/book.json','data/original-notes.json','data/questions.json'
  ].map(read));
 const report=auditFullCurriculumReadiness({book,originalNotes,questions,
  sectionReviewEvidence:[{sectionId:'1.1',status:'approved',reviewer:'reviewer',approvedAt:'2026-10-28'}],
  publicationPermissionEvidence:[{sectionId:'1.1',scope:'original_pdf',status:'verified',evidenceId:'pdf'}],
  publishedSections:[{sectionId:'1.1',language:'ja',hasFullText:true,verifiedAgainstOriginal:true,copyrightStatus:'cleared',sourcePageEvidence:'p.3'}]
 });
 assert.equal(report.independentlyReviewedSections,0,'missing scientific and copyright signoff');
 assert.equal(report.verifiedRightsSections,0,'permission for original PDF is not permission for Japanese translation');
 assert.equal(report.verifiedJapaneseFullTextSections,0);
 assert.equal(report.fullCompletion,false);
});
test('auditor can only reach complete when every section clears all independent gates',async()=>{
 const [book,originalNotes]=await Promise.all(['data/book.json','data/original-notes.json'].map(read));
 const ss=book.chapters.flatMap(ch=>ch.sections);
 const questions=ss.flatMap(s=>Array.from({length:8},(_,i)=>({
   id:s.id+'-case-'+i,source:{sectionNoteId:s.id},questionKind:['conceptual','numerical','applied'][i%3]
 })));
 const evidence={
   sectionReviewEvidence:ss.map(s=>({sectionId:s.id,status:'approved',reviewer:'subject-specialist',approvedAt:'2026-10-28',sourcePageEvidence:'book page independently checked',scientificReview:'approved',copyrightReview:'approved'})),
   publicationPermissionEvidence:ss.map(s=>({sectionId:s.id,scope:'original_independent_full_lesson',status:'verified',evidenceId:'independent-authorship-'+s.id})), 
   publishedSections:ss.map(s=>({sectionId:s.id,language:'ja',hasFullText:true,verifiedAgainstOriginal:true,copyrightStatus:'cleared',contentOrigin:'independent_original',sourcePageEvidence:'book page checked'})),
   questionReviewEvidence:questions.map(q=>({questionId:q.id,status:'approved',reviewer:'independent-specialist',approvedAt:'2026-10-28',calculationEvidence:'independently evaluated',sourceOrOriginalityEvidence:'origin checked'}))
 };
 const full=auditFullCurriculumReadiness({book,originalNotes,questions,...evidence});
 assert.equal(full.fullyReadySections,76);
 assert.equal(full.questionBankReadySections,76);
 assert.equal(full.fullCompletion,true);
 const incomplete=auditFullCurriculumReadiness({book,originalNotes,questions,
  ...evidence,questionReviewEvidence:evidence.questionReviewEvidence.filter(x=>!x.questionId.startsWith('11.11-'))});
 assert.equal(incomplete.fullyReadySections,75);
 assert.equal(incomplete.fullCompletion,false);
});
