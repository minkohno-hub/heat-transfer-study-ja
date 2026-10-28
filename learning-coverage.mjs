// A descriptive coverage report, deliberately NOT a fabricated overall completion percentage.
// Never treat a draft record or an original English PDF as a published Japanese lesson.
export function learningCoverage({book,questions,glossary,guides,contentManifest,originalNotes=null,deepLessons=null}) {
  const sections=book.chapters.flatMap(ch=>ch.sections);
  const publishedFilePaths=contentManifest.files||[];
  const original=questions.filter(q=>q.source.type==='supplement');
  const bookBased=questions.filter(q=>q.source.type==='book');
  const chapters=book.chapters.map(ch=>{
    const chapterIds=new Set(ch.sections.map(s=>s.id));
    return {
      chapter:ch.id,sectionCount:ch.sections.length,
      citedPracticeQuestions:bookBased.filter(q=>chapterIds.has(q.source.section)).length,
      sectionsWithCitedPractice:new Set(bookBased.filter(q=>chapterIds.has(q.source.section)).map(q=>q.source.section)).size,
      originalPracticeQuestions:original.filter(q=>q.source.chapterId===ch.id).length,
      originalGuideEntries:guides.filter(g=>g.bookChapter===ch.id).length,
      independentSectionNotes:originalNotes?.notes?.filter(n=>n.chapterId===ch.id).length??null,
      originalDeepLessonCount:deepLessons?.lessons?.filter(l=>l.sectionId.startsWith(ch.id.slice(2)+'.')).length??null,
      independentSectionQuestions:original.filter(q=>q.source.sectionNoteId&&chapterIds.has(q.source.sectionNoteId)).length
    };
  });
  return {
    pdfPages:book.pdfPageCount,
    textbookSections:sections.length,
    chapterCount:chapters.length,
    oldPcDraftOrPrivateRecordSections:sections.filter(s=>['draft_complete','private_only'].includes(s.translationStatus)).length,
    oldPcDraftOnlyRecordSections:sections.filter(s=>s.translationStatus==='draft_complete').length,
    protectedPriorSections:sections.filter(s=>s.translationStatus==='private_only').length,
    publicChapterManifestFiles:publishedFilePaths.length,
    publicJapaneseSections:publishedFilePaths.length===0?0:null, // Must inspect manifested files before assigning a nonzero count.
    originalChapterGuides:guides.filter(g=>g.bookChapter&&book.chapters.some(ch=>ch.id===g.bookChapter)).length,
    chaptersWithOriginalPractice:new Set(original.map(q=>q.source.chapterId).filter(Boolean)).size,
    independentlyAuthoredJapaneseNotes:originalNotes?.notes?.length??null,
    originalDeepLessons:deepLessons?.lessons?.length??null,
    sectionsWithIndependentCheckQuestions:new Set(original.map(q=>q.source.sectionNoteId).filter(Boolean)).size,
    totalQuestions:questions.length,
    appCreatedQuestions:original.length,
    bookCitedQuestions:bookBased.length,
    sectionsWithBookCitedQuestions:new Set(bookBased.map(q=>q.source.section)).size,
    guideEntries:guides.length,
    glossaryTerms:glossary.length,
    practiceByField:Object.fromEntries([...new Set(questions.map(q=>q.field))].sort().map(field=>[field,questions.filter(q=>q.field===field).length])),
    chapters
  };
}
