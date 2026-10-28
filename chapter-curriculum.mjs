// This curriculum tracks *available, independently authored* study aids,
// not completion of the source book, translation, or professional competence.
const chapterId = value => /^ch(?:[1-9]|10|11)$/.test(String(value||'')) ? value : null;

export function questionChapter(question, guides=[]) {
  const source=question?.source;
  if(!source || typeof source!=='object')return null;
  if(source.type==='book'){
    const match=String(source.section||'').match(/^([1-9]|10|11)\./);
    return match?'ch'+match[1]:null;
  }
  if(source.type!=='supplement')return null;
  if(chapterId(source.chapterId))return source.chapterId;
  const guide=guides.find(g=>g.id===source.guideId);
  return chapterId(guide?.bookChapter);
}

export function questionsForChapter(questions,chapter,guides=[]) {
  if(!chapterId(chapter))return [];
  return questions.filter(q=>questionChapter(q,guides)===chapter);
}

export function chapterLearningOverview(book,questions,guides,attempts=[],readSections={}) {
  if(!Array.isArray(book?.chapters)||!Array.isArray(questions)||!Array.isArray(guides))return [];
  const last=new Map();
  for(const attempt of attempts){
    if(!attempt || typeof attempt.questionId!=='string')continue;
    const at=Date.parse(attempt.at||'');
    if(!Number.isFinite(at))continue;
    const existing=last.get(attempt.questionId);
    if(!existing||at>=existing.time)last.set(attempt.questionId,{time:at,correct:attempt.correct===true});
  }
  return book.chapters.map(chapter=>{
    const qs=questionsForChapter(questions,chapter.id,guides);
    const guide=guides.find(g=>g.bookChapter===chapter.id)||null;
    const answered=qs.filter(q=>last.has(q.id));
    const correct=answered.filter(q=>last.get(q.id).correct).length;
    return {
      chapter:chapter.id,
      title:chapter.title,
      guideId:guide?.id||null,
      sectionCount:chapter.sections.length,
      sectionsMarkedRead:chapter.sections.filter(s=>readSections?.[s.id]===true).length,
      practiceQuestionCount:qs.length,
      bookCitedQuestionCount:qs.filter(q=>q.source?.type==='book').length,
      attemptedQuestions:answered.length,
      latestCorrect:correct,
      practiceQuestionIds:qs.map(q=>q.id)
    };
  });
}
