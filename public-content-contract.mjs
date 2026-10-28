// Fail-closed referential-integrity checks for the public, allowlisted distribution.
// This does not prove source accuracy or grant redistribution permissions.
import {validateQuestion} from './study-core.mjs';
import {validateOriginalNotes} from './original-notes.mjs';
import {validateDeepLessons} from './original-deep-lessons.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const present = value => typeof value === 'string' && value.trim().length > 0;
const pageRange = value => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^([1-9]\d*)(?:\s*[–-]\s*([1-9]\d*))?$/);
  if (!match) return null;
  const start = Number(match[1]), end = Number(match[2] || match[1]);
  return end >= start ? [start, end] : null;
};

/**
 * Returns explicit errors. Never conflate passing structure checks with
 * original-source verification, expert review or full textbook coverage.
 */
export function checkPublicContent({book, questions, glossary, guides,originalNotes=null,deepLessons=null}) {
  const errors = [];
  const error = message => errors.push(message);
  if (!object(book) || !Number.isInteger(book.pdfPageCount) || book.pdfPageCount < 1 ||
    !Array.isArray(book.chapters) || book.chapters.length === 0) {
    return ['書籍の目次・PDFページ数を確認してください。'];
  }
  if (!Array.isArray(questions) || !Array.isArray(glossary) || !Array.isArray(guides)) {
    return ['公開する問題・用語・ガイドが配列ではありません。'];
  }
  const sections = new Map();
  const chapterSections = new Map();
  for (const chapter of book.chapters) {
    if (!object(chapter) || !Array.isArray(chapter.sections)) {
      error('章の構造が正しくありません。'); continue;
    }
    if (!present(chapter.id) || chapterSections.has(chapter.id)) {
      error('章IDが不正または重複しています。'); continue;
    }
    chapterSections.set(chapter.id,new Set(chapter.sections.map(s=>s?.id).filter(present)));
    for (const section of chapter.sections) {
      if (!object(section) || !present(section.id) || !Number.isInteger(section.pdfStart) ||
        section.pdfStart < 1 || section.pdfStart > book.pdfPageCount) {
        error('節ID・開始PDFページが正しくありません。'); continue;
      }
      if (sections.has(section.id)) error('節IDが重複しています: ' + section.id);
      sections.set(section.id, section);
      // The browser distribution must never include extracted paragraphs or standalone book figures.
      for (const key of ['blocks', 'blocksEn', 'figures', 'sourceReview']) {
        if (Object.hasOwn(section, key)) error('公開教材に非配布の節データがあります: ' + section.id + '/' + key);
      }
    }
  }
  const guideIds = new Set();
  const guideById = new Map();
  for (const guide of guides) {
    if (!object(guide) || !present(guide.id) || !present(guide.title) ||
      !present(guide.summary) || !present(guide.html)) {
      error('ガイドのID・見出し・本文が不足しています。'); continue;
    }
    if (guideIds.has(guide.id)) error('ガイドIDが重複しています: ' + guide.id);
    guideIds.add(guide.id);
    guideById.set(guide.id,guide);
    if (guide.bookChapter !== undefined) {
      const known=chapterSections.get(guide.bookChapter);
      if (!known || !Array.isArray(guide.relatedSectionIds) ||
        guide.relatedSectionIds.length===0 ||
        guide.relatedSectionIds.some(sectionId=>!known.has(sectionId)) ||
        new Set(guide.relatedSectionIds).size!==guide.relatedSectionIds.length) {
        error('章別独立講座の章ID・関連節が一致しません: '+guide.id);
      }
    }
  }
  const qIds = new Set();
  const checkBookSource = (source, label) => {
    const section = sections.get(source.section);
    if (!section) { error(label + ': 書籍の節IDが見つかりません。'); return; }
    const bookPages = pageRange(source.bookPages), pdfPages = pageRange(source.pdfPages);
    if (!bookPages || !pdfPages || bookPages[0] + 14 !== pdfPages[0] ||
      bookPages[1] + 14 !== pdfPages[1]) {
      error(label + ': 書籍とPDFのページ対応が一致しません。'); return;
    }
    if (pdfPages[0] < section.pdfStart || pdfPages[1] > book.pdfPageCount ||
      (Number.isInteger(section.pdfEnd) && pdfPages[1] > section.pdfEnd)) {
      error(label + ': 節のPDFページ範囲外です。');
    }
  };
  for (const q of questions) {
    const label = '問題 ' + String(q?.id ?? '(IDなし)');
    if (!object(q)) { error(label + ': 問題データが正しくありません。'); continue; }
    if (qIds.has(q.id)) error(label + ': 問題IDが重複しています。');
    qIds.add(q.id);
    const issue = validateQuestion(q);
    if (issue) error(label + ': ' + issue);
    if (!present(q.prompt) || !q.choices?.every(present) ||
      !present(q.explanation) || !present(q.field) ||
      !Array.isArray(q.hints) || q.hints.length < 2 || !q.hints.every(present) ||
      !Array.isArray(q.solutionSteps) || q.solutionSteps.length < 3 || !q.solutionSteps.every(present)) {
      error(label + ': 説明・分野・ヒント・解法の情報が不足しています。');
    }
    if (!object(q.source)) { error(label + ': 出典がありません。'); continue; }
    if (q.source.type === 'supplement') {
      if (!present(q.source.reference) || !guideIds.has(q.source.guideId)) {
        error(label + ': 独立補足問題が存在しないガイドを参照しています。');
      }
      if (q.source.chapterId !== undefined &&
        (!chapterSections.has(q.source.chapterId) ||
         guideById.get(q.source.guideId)?.bookChapter!==q.source.chapterId)) {
        error(label + ': 章別問題の章IDが対応する独立ガイドと一致しません。');
      }
    } else if (q.source.type === 'book') {
      checkBookSource(q.source, label);
      if (q.reviewStatus !== 'source_checked' || q.expertReviewed !== false) {
        error(label + ': 書籍出典の照合と専門家校閲の状態が不明瞭です。');
      }
    } else error(label + ': 未知の出典種別です。');
    if (q.figure?.kind === 'book' && Object.hasOwn(q.figure, 'src')) {
      error(label + ': 原図の単独ファイルを公開しようとしています。');
    }
  }
  const termIds = new Set();
  for (const term of glossary) {
    const label = '用語 ' + String(term?.id ?? '(IDなし)');
    if (!object(term) || !present(term.id) || !present(term.ja) ||
      !present(term.meaning) || !object(term.source)) {
      error(label + ': 用語データの必須項目がありません。'); continue;
    }
    if (termIds.has(term.id)) error(label + ': 用語IDが重複しています。');
    termIds.add(term.id);
    if (term.source.type === 'supplement') {
      if (!guideIds.has(term.source.guideId) || !present(term.source.reference)) {
        error(label + ': 補足の参照ガイドがありません。');
      }
    } else if (present(term.source.section)) {
      checkBookSource(term.source, label);
    } else error(label + ': 出典区分が正しくありません。');
    const links = term.relatedQuestions ?? [];
    if (!Array.isArray(links)) { error(label + ': 関連問題リンクが配列ではありません。'); continue; }
    const linkedIds = new Set();
    for (const link of links) {
      if (!object(link) || !present(link.id) || !present(link.label) || !qIds.has(link.id)) {
        error(label + ': 関連問題へのリンクが無効です。'); continue;
      }
      if (linkedIds.has(link.id)) error(label + ': 同じ問題へのリンクが重複しています。');
      linkedIds.add(link.id);
    }
  }
  if (originalNotes!==null) {
    errors.push(...validateOriginalNotes(book,originalNotes));
    const noteIds=new Set(originalNotes.notes?.map(n=>n.sectionId)||[]);
    const sectionQuestions=questions.filter(q=>q?.source?.sectionNoteId!==undefined);
    const seen=new Set();
    for(const q of sectionQuestions) {
      const sid=q.source.sectionNoteId;
      const section=sections.get(sid);
      if(!noteIds.has(sid)||!section||q.source.chapterId!=='ch'+sid.split('.')[0] ||
        q.source.type!=='supplement'||q.questionGroup!=='original_independent_section_review_v1'||
        q.reviewStatus!=='AI作問・論理構造照合済み／外部専門家校閲前'||q.expertReviewed!==false||
        !/^v[1-9]\d*$/.test(String(q.revision||''))) {
        error('節別独自問題の参照先・未校閲表示・改訂番号が不正: '+String(q?.id));
      }
      if(seen.has(sid))error('節別独自問題の節IDが重複: '+sid);
      seen.add(sid);
    }
    if(seen.size!==noteIds.size||sectionQuestions.length!==76)
      error('76節の独立学習ノートと節別演習の対応に欠落があります。');
    const applied=questions.filter(q=>q?.source?.focusSectionId!==undefined);
    for(const q of applied){
      const sid=q.source.focusSectionId;
      const section=sections.get(sid);
      if(!section||!noteIds.has(sid)||q.source.chapterId!=='ch'+sid.split('.')[0]||
        q.source.type!=='supplement'||q.questionGroup!=='original_independent_applied_v1'||
        q.questionKind!=='numerical'||q.expertReviewed!==false||
        !/^v[1-9]\d*$/.test(String(q.revision||''))||
        !q.reviewStatus?.includes('外部専門家校閲前')) {
        error('応用計算問題の関連節・原著・未校閲表示に不整合: '+String(q?.id));
      }
    }

  }
  if(deepLessons!==null)errors.push(...validateDeepLessons(book,deepLessons));
  return errors;
}
