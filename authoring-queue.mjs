// Authoring progress is distinct from publication approval and external review.
// A count of drafted material must never be presented as textbook completion.
import {auditFullCurriculumReadiness,DEFAULT_READINESS_TARGETS} from './curriculum-readiness.mjs';

export function buildAuthoringQueue({book,originalNotes,deepLessons,questions,evidence={},targets=DEFAULT_READINESS_TARGETS}){
  if(!Array.isArray(deepLessons?.lessons))throw new TypeError('独立詳細教材の配列が必要です。');
  const report=auditFullCurriculumReadiness({book,originalNotes,questions,...evidence,targets});
  const deepIds=new Set(deepLessons.lessons.map(lesson=>lesson.sectionId));
  const sections=report.sections.map((section,index)=>{
    const detailedLessonDraft=deepIds.has(section.id);
    const questionDraftCount=section.sectionQuestionCount;
    const kinds=section.distinctQuestionKinds;
    const missingQuestionDrafts=Math.max(0,targets.questionsPerSection-questionDraftCount);
    const missingKinds=Math.max(0,targets.distinctQuestionKindsPerSection-kinds);
    const authoringMinimumMet=Boolean(section.originalConceptNote&&detailedLessonDraft&&missingQuestionDrafts===0&&missingKinds===0);
    return {
      chapterId:section.chapterId,sectionId:section.id,title:section.title,order:index,
      shortConceptNoteDraft:section.originalConceptNote,detailedLessonDraft,
      questionDraftCount,questionKinds:kinds,
      missingQuestionDrafts,missingKinds,authoringMinimumMet,
      independentlyReviewed:section.independentlyReviewed,
      verifiedFullJapaneseText:section.fullJapaneseTextPublished,
      reviewedQuestionCount:section.expertReviewedQuestionCount,
      verifiedRights:section.fullTextPermissionVerified,
      finalAcceptance:section.sectionReady
    };
  });
  const count=key=>sections.filter(row=>row[key]).length;
  const backlog=sections.filter(row=>!row.authoringMinimumMet);
  // Book order takes priority over adding another feature to already-covered sections.
  // A missing detailed lesson gets attention before polishing surplus questions.
  const next=backlog.slice().sort((a,b)=>
    Number(a.shortConceptNoteDraft)-Number(b.shortConceptNoteDraft)||
    Number(a.detailedLessonDraft)-Number(b.detailedLessonDraft)||
    b.missingQuestionDrafts-a.missingQuestionDrafts||
    a.order-b.order
  );
  return {
    kind:'independent_authoring_queue_unreviewed',sectionCount:sections.length,
    questionsInBank:questions.length,minimumQuestionsPerSection:targets.questionsPerSection,
    minimumQuestionKindsPerSection:targets.distinctQuestionKindsPerSection,
    shortConceptNoteDrafts:count('shortConceptNoteDraft'),
    detailedLessonDrafts:count('detailedLessonDraft'),
    sectionsWithMinimumQuestionDrafts:sections.filter(x=>x.missingQuestionDrafts===0).length,
    sectionsWithMinimumQuestionKinds:sections.filter(x=>x.missingKinds===0).length,
    draftAuthoringMinimumMet:count('authoringMinimumMet'),
    remainingQuestionDraftMinimum:sections.reduce((a,x)=>a+x.missingQuestionDrafts,0),
    sectionsNeedingDetailedLesson:sections.filter(x=>!x.detailedLessonDraft).length,
    externallyAcceptedSections:count('finalAcceptance'),
    next:next.slice(0,12).map(({order,...row})=>row),
    sections:sections.map(({order,...row})=>row),
    warning:'執筆件数・出題件数は全訳・原本照合・著作権承認・専門家校閲・学習効果の完成を意味しません。'
  };
}
