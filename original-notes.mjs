// Independent, section-themed Japanese learning notes. They are NOT source-book
// translations or verified replacements for the 810-page original PDF.
const isRecord=x=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x);
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const keys=['sectionId','chapterId','title','objective','explanation','relation','example','limits','selfCheck','answer'];
export function validateOriginalNotes(book,document) {
  const errors=[];
  if(!isRecord(book)||!Array.isArray(book.chapters))return ['書籍目次を確認できません。'];
  if(!isRecord(document)||document.kind!=='original_japanese_section_study_notes'
    ||document.schemaVersion!==1||document.expertReviewed!==false||document.sectionCount!==76||!Array.isArray(document.notes))
    return ['独立学習ノートの形式または校閲表示が正しくありません。'];
  const sourceSections=new Map(book.chapters.flatMap(c=>c.sections.map(s=>[s.id,{chapterId:c.id,title:s.title,bookStart:s.bookStart,pdfStart:s.pdfStart}])));
  const ids=new Set();
  for(const [i,n] of document.notes.entries()){
    const label='学習ノート '+String(n?.sectionId??i);
    if(!isRecord(n)){errors.push(label+': オブジェクトでありません。');continue;}
    if(keys.some(key=>!nonempty(n[key])))errors.push(label+': 必須説明・節情報が不足しています。');
    if(ids.has(n.sectionId))errors.push(label+': 節IDが重複しています。');
    ids.add(n.sectionId);
    const section=sourceSections.get(n.sectionId);
    if(!section||section.chapterId!==n.chapterId||section.title!==n.title||section.bookStart!==n.bookStart||section.pdfStart!==n.pdfStart)
      errors.push(label+': 目次の節・ページとの対応が一致しません。');
    if(n.sourceType!=='original_independent_japanese_notes'||n.expertReviewed!==false||
       n.reviewStatus!=='AI_drafted_pending_independent_expert_review')
       errors.push(label+': 独立執筆・校閲前の状態が不正です。');
    if(n.explanation?.length<90||n.relation?.length<35||n.example?.length<45||n.limits?.length<35)
      errors.push(label+': 説明・数式・例題・適用条件が短すぎます。');
    if(Object.hasOwn(n,'blocks')||Object.hasOwn(n,'figures')||Object.hasOwn(n,'translationStatus')||
       Object.hasOwn(n,'sourceReview')||Object.hasOwn(n,'bookText')||Object.hasOwn(n,'originalText'))
       errors.push(label+': 書籍由来本文または原図と誤認される非配布項目があります。');
    if(keys.some(k=>typeof n[k]==='string'&&/<\/?[A-Za-z][^>]*>/.test(n[k])))
       errors.push(label+': ノート本文にHTML風の制御文字があります。');
  }
  if(sourceSections.size!==76||document.notes.length!==76||ids.size!==76||[...sourceSections.keys()].some(id=>!ids.has(id)))
    errors.push('76節の独立ノート網羅に欠落・重複があります。');
  return errors;
}
export function independentNoteForSection(document,id) {
  return document?.notes?.find(n=>n.sectionId===id)||null;
}
