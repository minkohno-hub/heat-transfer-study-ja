// A descriptive coverage report, deliberately NOT a fabricated overall completion percentage.
// Never treat a draft record or an original English PDF as a published Japanese lesson.
export function learningCoverage({book,questions,glossary,guides,contentManifest}) {
  const sections=book.chapters.flatMap(ch=>ch.sections);
  const publishedFilePaths=contentManifest.files||[];
  const original=questions.filter(q=>q.source.type==='supplement');
  const bookBased=questions.filter(q=>q.source.type==='book');
  const chapters=book.chapters.map(ch=>{
    const chapterIds=new Set(ch.sections.map(s=>s.id));
    return {
      chapter:ch.id,sectionCount:ch.sections.length,
      citedPracticeQuestions:bookBased.filter(q=>chapterIds.has(q.source.section)).length,
      sectionsWithCitedPractice:new Set(bookBased.filter(q=>chapterIds.has(q.source.section)).map(q=>q.source.section)).size
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
    publicJapaneseSections:0, // Assigned by CLI only after inspecting each manifested content file.
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
