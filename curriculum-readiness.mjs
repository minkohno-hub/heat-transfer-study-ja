// This readiness report deliberately cannot be made "100%" by adding a single
// short concept note and multiple variants of the same quiz question.
// Acceptances below are operational minima, not a substitute for source review.
const id = s => typeof s==='string' && /^[1-9]\d*\.\d+$/.test(s);
const uniq = xs => [...new Set(xs)];
const iso = s => typeof s==='string' && /^\d{4}-\d\d-\d\d$/.test(s) && !Number.isNaN(Date.parse(s));
export const DEFAULT_READINESS_TARGETS=Object.freeze({
  questionsPerSection:8,
  distinctQuestionKindsPerSection:3
});

export function auditFullCurriculumReadiness({book,originalNotes,questions,publishedSections=[],
  sectionReviewEvidence=[],questionReviewEvidence=[],publicationPermissionEvidence=[],targets=DEFAULT_READINESS_TARGETS}){
  const errors=[];
  if(!Array.isArray(book?.chapters)||!Array.isArray(originalNotes?.notes)||!Array.isArray(questions)){
    throw new TypeError('目次、独立教材、問題集の配列が必要です。');
  }
  const sections=book.chapters.flatMap(ch=>ch.sections.map(s=>({...s,chapterId:ch.id})));
  const byId=new Map(sections.map(s=>[s.id,s]));
  if(sections.length!==76||byId.size!==76)errors.push('目次が期待した76節でありません。');
  const notes=new Map();
  for(const n of originalNotes.notes){
    if(!byId.has(n.sectionId)||notes.has(n.sectionId)) errors.push('独自ノートの未知または重複ID: '+n.sectionId);
    notes.set(n.sectionId,n);
  }
  const approvals=new Map();
  for(const r of sectionReviewEvidence){
    if(id(r?.sectionId)&&r?.status==='approved'&&typeof r?.reviewer==='string'&&r.reviewer.trim()
      &&iso(r.approvedAt)&&typeof r?.sourcePageEvidence==='string'&&r.sourcePageEvidence.trim()
      &&r?.scientificReview==='approved'&&r?.copyrightReview==='approved') approvals.set(r.sectionId,r);
  }
  const rights=new Set(publicationPermissionEvidence.filter(r=>id(r?.sectionId)&&r?.scope==='japanese_section_text'
    &&r?.status==='verified'&&typeof r?.evidenceId==='string'&&r.evidenceId.trim()).map(r=>r.sectionId));
  const publicText=new Set(publishedSections.filter(r=>id(r?.sectionId)&&r?.language==='ja'
    &&r?.hasFullText===true&&r?.verifiedAgainstOriginal===true&&r?.copyrightStatus==='cleared'
    &&typeof r?.sourcePageEvidence==='string'&&r.sourcePageEvidence.trim()).map(r=>r.sectionId));
  const questionApprovals=new Set(questionReviewEvidence.filter(r=>typeof r?.questionId==='string'
    &&r?.status==='approved'&&typeof r?.reviewer==='string'&&r.reviewer.trim()
    &&iso(r.approvedAt)&&typeof r?.calculationEvidence==='string'&&r.calculationEvidence.trim()
    &&typeof r?.sourceOrOriginalityEvidence==='string'&&r.sourceOrOriginalityEvidence.trim())
    .map(r=>r.questionId));
  const nPerSection=Number(targets?.questionsPerSection),nKinds=Number(targets?.distinctQuestionKindsPerSection);
  if(!Number.isSafeInteger(nPerSection)||nPerSection<1||!Number.isSafeInteger(nKinds)||nKinds<1)throw new TypeError('品質基準値が不正です。');
  const rows=sections.map(s=>{
    const note=notes.get(s.id);
    const qs=questions.filter(q=>q?.source?.sectionNoteId===s.id||q?.source?.type==='book'&&q?.source?.section===s.id);
    const available=qs.length,reviewed=qs.filter(q=>questionApprovals.has(q.id)).length;
    const kinds=uniq(qs.map(q=>q.questionKind).filter(k=>typeof k==='string'&&k.trim()));
    const independentlyWritten=Boolean(note&&note.sourceType==='original_independent_japanese_notes'&&note.expertReviewed===false);
    const scientificallyApproved=approvals.has(s.id);
    const cleared=rights.has(s.id),published=publicText.has(s.id)&&cleared;
    const questionReady=available>=nPerSection&&reviewed>=nPerSection&&kinds.length>=nKinds;
    return {id:s.id,chapterId:s.chapterId,title:s.title,originalConceptNote:independentlyWritten,
      independentlyReviewed:scientificallyApproved,fullJapaneseTextPublished:published,
      fullTextPermissionVerified:cleared,
      sectionQuestionCount:available,expertReviewedQuestionCount:reviewed,
      distinctQuestionKinds:kinds.length,questionBankReady:questionReady,
      sectionReady:independentlyWritten&&scientificallyApproved&&published&&questionReady};
  });
  const count=key=>rows.filter(r=>r[key]).length;
  return {assessment:'運用上の完成判定。原本各節の正確さは独立した照合と外部レビューを要する。',
    sectionCount:rows.length,questionCount:questions.length,targets:{questionsPerSection:nPerSection,distinctQuestionKindsPerSection:nKinds},
    originalConceptNotes:count('originalConceptNote'),
    independentlyReviewedSections:count('independentlyReviewed'),
    verifiedRightsSections:count('fullTextPermissionVerified'),
    verifiedJapaneseFullTextSections:count('fullJapaneseTextPublished'),
    questionBankReadySections:count('questionBankReady'),
    fullyReadySections:count('sectionReady'),
    fullCompletion:errors.length===0&&rows.length===76&&rows.every(r=>r.sectionReady),
    errors,sections:rows};
}
